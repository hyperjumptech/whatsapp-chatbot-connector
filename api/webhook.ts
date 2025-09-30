import express from "express";
import dotenv from "dotenv";
import crypto from "crypto";
import { Queue } from "bullmq";
import { config } from "../utils/config";
import { _markChatAsRead, _queryAndReply } from "../services/whatsapp";

dotenv.config();

const webhookRoutes = express.Router();

const { WEBHOOK_VERIFY_TOKEN, CONNECTION_PLATFORM, SESSION_DATABASE } =
  process.env;

console.log("CONNECTION_PLATFORM: ", CONNECTION_PLATFORM);
console.log("SESSION_DATABASE: ", SESSION_DATABASE);

let myQueue = null;
if (SESSION_DATABASE === "redis") {
  myQueue = new Queue("messages", {
    connection: {
      host: config.REDIS_HOST,
      port: config.REDIS_PORT,
    },
  });
}

/**
 * Verify the webhook signature using WhatsApp's app secret
 * @param payload - Raw request body as string
 * @param signature - X-Hub-Signature-256 header value
 * @returns boolean indicating if signature is valid
 */
function verifyWebhookSignature(payload: string, signature: string): boolean {
  // Check for app secret in environment or config
  const appSecret = process.env.WEBHOOK_APP_SECRET || config.WEBHOOK_APP_SECRET;

  if (!appSecret) {
    console.warn(
      "WEBHOOK_APP_SECRET not configured, skipping signature verification"
    );
    return true; // Allow requests when app secret is not configured
  }

  if (!signature) {
    return false;
  }

  // Remove 'sha256=' prefix if present
  const cleanSignature = signature.replace(/^sha256=/, "");

  // Create expected signature
  const expectedSignature = crypto
    .createHmac("sha256", appSecret)
    .update(payload, "utf8")
    .digest("hex");

  // Use string comparison for signature validation
  return cleanSignature === expectedSignature;
}

/**
 * Validate request headers for WhatsApp webhook
 * @param req - Express request object
 * @returns object with validation result and error message if invalid
 */
function validateWebhookHeaders(req: express.Request & { rawBody?: string }): {
  isValid: boolean;
  error?: string;
} {
  // Check Content-Type
  const contentType = req.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    return {
      isValid: false,
      error: "Invalid Content-Type. Expected application/json",
    };
  }

  // Check User-Agent for WhatsApp requests (optional but recommended)
  const userAgent = req.get("user-agent");
  if (userAgent && !userAgent.includes("WhatsApp")) {
    console.warn(`Unexpected User-Agent: ${userAgent}`);
  }

  // Verify webhook signature if app secret is configured
  const signature = req.get("x-hub-signature-256");
  const rawBody = req.rawBody || JSON.stringify(req.body);

  if (!verifyWebhookSignature(rawBody, signature || "")) {
    return {
      isValid: false,
      error: "Invalid webhook signature",
    };
  }

  return { isValid: true };
}

// accepts GET requests at the /webhook endpoint. You need this URL to setup webhook initially.
// info on verification request payload: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
webhookRoutes.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  // check the mode and token sent are correct
  if (mode === "subscribe" && token === WEBHOOK_VERIFY_TOKEN) {
    // respond with 200 OK and challenge token from the request
    res.status(200).send(challenge);
  } else {
    // respond with '403 Forbidden' if verify tokens do not match
    res.sendStatus(403);
  }
});

webhookRoutes.post("/", async (req, res) => {
  // Validate webhook headers and signature
  const headerValidation = validateWebhookHeaders(req);
  if (!headerValidation.isValid) {
    console.error(
      `[Webhook] Header validation failed: ${headerValidation.error}`
    );
    return res.status(403).json({
      error: "Forbidden",
      message: headerValidation.error,
    });
  }

  // check if the webhook request contains a message
  // details on WhatsApp text message payload: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples#text-messages
  const message = req.body.entry?.[0]?.changes[0]?.value?.messages?.[0];

  // check if the incoming message contains text. if not, it is a status webhook
  if (!message?.type) {
    // log incoming status
    const status = req.body.entry?.[0]?.changes[0]?.value?.statuses?.[0];
    console.log(
      `[Incoming webhook status] phone: ${status?.recipient_id} - status: ${status?.status}`
    );
    if (status?.status === "failed") {
      console.log(JSON.stringify(status));
    }

    if (!status?.recipient_id) {
      console.log(
        "Incoming webhook without recipient:",
        JSON.stringify(req.body)
      );
    }
    res.sendStatus(200);
    return;
  }

  // log incoming messages
  console.log(
    `[Incoming webhook message] phone: ${message.from} - text-body: ${message.text?.body} - message-type: ${message.type}`
  );

  // get the query text by message.type
  let queryText = "";
  switch (message.type) {
    case "interactive":
      if (message.interactive.type === "button_reply") {
        queryText = message.interactive.button_reply.id;
      } else if (message.interactive.type === "list_reply") {
        queryText = message.interactive.list_reply.id;
      } else if (message.interactive.type === "nfm_reply") {
        queryText = "";
      }
      break;
    default:
      queryText = message?.text?.body;
      break;
  }

  if (!queryText) {
    res.sendStatus(200);
    return;
  }

  // aknowledge that the message has been read and be processed
  if (SESSION_DATABASE === "redis") {
    try {
      const job = await myQueue?.add("markChatAsRead", message.id);
      console.log(
        `[markChatAsRead] Job added successfully with ID: ${job?.id}`
      );
    } catch (error) {
      console.error("[markChatAsRead] Error adding job:", error);
    }
  } else {
    await _markChatAsRead(message.id);
  }

  // process the query and send reply
  const payload = JSON.stringify({
    query: queryText,
    messageFrom: message.from,
  });

  if (SESSION_DATABASE === "redis") {
    try {
      const job = await myQueue?.add("queryAndReply", payload);
      console.log(`[queryAndReply] Job added successfully with ID: ${job?.id}`);
    } catch (error) {
      console.error("[queryAndReply] Error adding job:", error);
    }
  } else {
    await _queryAndReply(payload);
  }

  res.sendStatus(200);
});

export default webhookRoutes;
