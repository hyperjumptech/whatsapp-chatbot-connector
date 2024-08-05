import express from "express";
import dotenv from "dotenv";
import { markChatAsRead, sendChatbotReply } from "../services/whatsapp";
import { queryToDify } from "../services/dify";
import { queryToRasa } from "../services/rasa";

dotenv.config();

const webhookRoutes = express.Router();

const { WEBHOOK_VERIFY_TOKEN, CONNECTION_PLATFORM, SESSION_DATABASE } =
  process.env;
const DIFY = "dify";
const RASA = "rasa";

console.log("CONNECTION_PLATFORM: ", CONNECTION_PLATFORM);
console.log("SESSION_DATABASE: ", SESSION_DATABASE);

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
      `[Incoming webhook status] phone:${status?.recipient_id} - entry.id:${req.body.entry?.[0]?.id} - status: ${status?.status}`
    );
    if (!status?.recipient_id) {
      console.log("Incoming webhook message:", JSON.stringify(req.body));
    }
    res.sendStatus(200);
    return;
  }

  // log incoming messages
  console.log(
    `[Incoming webhook message] phone:${message.from} - entry.id:${req.body.entry?.[0]?.id} - text-body: ${message.text?.body} - message-type: ${message.type} - interactive-type: ${message.interactive?.type}`
  );

  // aknowledge that the message has been read and be processed
  try {
    await markChatAsRead(message.id);
  } catch (error) {
    console.error("Error markChatAsRead: " + error);
  }

  let chatbotReply = null;
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

  if (CONNECTION_PLATFORM === DIFY) {
    chatbotReply = await queryToDify({ req, query: queryText });
  } else if (CONNECTION_PLATFORM === RASA) {
    chatbotReply = await queryToRasa({ req, query: queryText });
  }
  console.log("[Chatbot reply]: ", chatbotReply);

  if (!chatbotReply || !chatbotReply.text) {
    res.sendStatus(200);
    return;
  }

  try {
    await sendChatbotReply({ to: message.from, chatbotReply });
  } catch (error) {
    console.error("Error sendChatbotReply: " + error);
  }

  res.sendStatus(200);
});

export default webhookRoutes;
