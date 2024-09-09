import express from "express";
import dotenv from "dotenv";
import { Queue } from "bullmq";
import { config } from "../utils/config";
import { _markChatAsRead, _queryAndReply } from "../services/whatsapp";

dotenv.config();

const webhookRoutes = express.Router();

const { WEBHOOK_VERIFY_TOKEN, CONNECTION_PLATFORM, SESSION_DATABASE } =
  process.env;

console.log("CONNECTION_PLATFORM: ", CONNECTION_PLATFORM);
console.log("SESSION_DATABASE: ", SESSION_DATABASE);

const myQueue = new Queue("messages", {
  connection: {
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
  },
});

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
      console.log(JSON.stringify(status?.errors));
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
    `[Incoming webhook message] phone: ${message.from} - text-body: ${
      message.text?.body
    } - message-type: ${message.type} - interactive-type: ${
      message.interactive?.type || "-"
    }`
  );

  // aknowledge that the message has been read and be processed
  if (SESSION_DATABASE === "redis") {
    try {
      const job = await myQueue.add("markChatAsRead", message.id);
      console.log(`[markChatAsRead] Job added successfully with ID: ${job.id}`);
    } catch (error) {
      console.error("[markChatAsRead] Error adding job:", error);
    }
  } else {
    await _markChatAsRead(message.id);
  }

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
      queryText = message.text.body;
      break;
  }

  if (!queryText) {
    res.sendStatus(200);
    return;
  }

  // process the query and send reply
  const waId = req.body.entry?.[0]?.changes[0]?.value?.contacts?.[0]?.wa_id;
  const payload = JSON.stringify({
    waId,
    query: queryText,
    messageFrom: message.from,
  });

  if (SESSION_DATABASE === "redis") {
    try {
      const job = await myQueue.add("queryAndReply", payload);
      console.log(`[queryAndReply] Job added successfully with ID: ${job.id}`);
    } catch (error) {
      console.error("[queryAndReply] Error adding job:", error);
    }
  } else {
    await _queryAndReply(payload);
  }

  res.sendStatus(200);
});

export default webhookRoutes;
