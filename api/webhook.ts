import {app} from '../app';

import { getWebhookHandler} from "../services/webhook-handler-active-object";


const { WEBHOOK_VERIFY_TOKEN, CONNECTION_PLATFORM } = process.env;
console.log("CONNECTION_PLATFORM: ", CONNECTION_PLATFORM);

// accepts GET requests at the /webhook endpoint. You need this URL to setup webhook initially.
// info on verification request payload: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
app.get("/", (req, res) => {
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

app.post("/webhook", async (req, res) => {
  
  await getWebhookHandler().handleWebhookCall(req);

  res.sendStatus(200);
});

