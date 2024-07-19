import express from "express";
import dotenv from "dotenv";
import {  sendChatbotReply } from "../services/whatsapp";
import { queryToDify } from "../services/dify";
import { queryToRasa } from "../services/rasa";
import { sendToQueue } from "../services/queue";
import {ParamsDictionary, Request} from "express-serve-static-core";
import { ParsedQs } from "qs";

dotenv.config();

const webhookRoutes = express.Router();

const { WEBHOOK_VERIFY_TOKEN, CONNECTION_PLATFORM } = process.env;
console.log("CONNECTION_PLATFORM: ", CONNECTION_PLATFORM);
const DIFY = "dify";
const RASA = "rasa";

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
    console.log("Webhook verified successfully!");
  } else {
    // respond with '403 Forbidden' if verify tokens do not match
    res.sendStatus(403);
  }
});

webhookRoutes.post("/", async (req, res) => {
  // log incoming messages
  console.log("Incoming webhook message:", JSON.stringify(req.body));

  // check if the webhook request contains a message
  // details on WhatsApp text message payload: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples#text-messages
  const message = req.body.entry?.[0]?.changes[0]?.value?.messages?.[0];

  // check if the incoming message contains text
  if (!message?.type) {
    res.sendStatus(200);
    return;
  }

  // aknowledge that the message has been read and be processed
  await sendToQueue('markChatAsRead', [message.id]);
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

  await sendToQueue('queryPlatform', [req, queryText, message.from]);


  res.sendStatus(200);
});

export const queryPlatform = async (req:Request<ParamsDictionary, unknown, unknown, ParsedQs, Record<string, unknown>>, queryText: string, from: string)=>{
  let chatbotReply = null;

  if (CONNECTION_PLATFORM === DIFY) {
    chatbotReply = await queryToDify({ req, query: queryText });
  } else if (CONNECTION_PLATFORM === RASA) {
    chatbotReply = await queryToRasa({ req, query: queryText });
  }
  console.log("Chatbot Reply:\n", chatbotReply);

  if (!chatbotReply || !chatbotReply.text) {    
    return;
  }
  await sendChatbotReply({ to: from, chatbotReply });

}

export default webhookRoutes;
