import express from "express";
import morgan from "morgan";
import bodyParser from "body-parser";

import webhookRoutes from "./api/webhook";
import { config } from "./utils/config";

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

if (config.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("common"));
}

const today = new Date();
app.get("/", (_req, res) =>
  res.send(
    "Whatsapp Chatbot Connector by Hyperjump.\n Today is " +
      today.toDateString()
  )
);

app.use("/webhook", webhookRoutes);

export default app;
