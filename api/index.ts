import express from "express";
import morgan from "morgan";
import dotenv from "dotenv";
import bodyParser from "body-parser";

import webhookRoutes from "./webhook";

// Load environment variables from .env file
dotenv.config();

const port = 5007;
const { NODE_ENV } = process.env;

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

if (NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("common"));
}

app.get("/", (_req, res) => res.send("Whatsapp Chatbot Connector by Hyperjump"));

app.use("/webhook", webhookRoutes);

app.listen(port, () => console.log(`Server ready on port ${port}.`));

module.exports = app;
