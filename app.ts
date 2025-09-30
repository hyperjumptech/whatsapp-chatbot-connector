import express from "express";
import morgan from "morgan";
import bodyParser from "body-parser";

import webhookRoutes from "./api/webhook";
import { config } from "./utils/config";

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// For webhook routes, we need raw body for signature verification
app.use(
  "/webhook",
  bodyParser.raw({ type: "application/json" }),
  (req, res, next) => {
    // Store raw body for signature verification
    (req as express.Request & { rawBody: string }).rawBody =
      req.body.toString("utf8");
    // Parse JSON manually for the webhook route
    try {
      req.body = JSON.parse(
        (req as express.Request & { rawBody: string }).rawBody
      );
    } catch (error) {
      req.body = {};
    }
    next();
  }
);

// For other routes, use regular JSON parsing
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
