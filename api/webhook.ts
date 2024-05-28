import express from "express";
import dotenv from "dotenv";
import { markChatAsRead, sendChat } from "../services/whatsapp";
import { sendQuery } from "../services/dify";
import { getUserSession, setUserSession } from "../services/session";

dotenv.config();

const webhookRoutes = express.Router();

const { WEBHOOK_VERIFY_TOKEN } = process.env;

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
  const waId = req.body.entry?.[0]?.changes[0]?.value?.contacts?.[0]?.wa_id;

  // check if the incoming message contains text
  if (message?.type === "text") {
    const user = getUserSession(waId);

    const difyRes = await sendQuery({
      userId: waId,
      conversationId: user?.conversationId || "",
      query: message.text.body,
    });

    if (!user) {
      setUserSession({
        id: waId,
        conversationId: difyRes.data.conversation_id,
      });
    }

    await sendChat({ to: message.from, text: difyRes.data.answer });
    await markChatAsRead(message.id);
  }

  res.sendStatus(200);
});

export default webhookRoutes;
