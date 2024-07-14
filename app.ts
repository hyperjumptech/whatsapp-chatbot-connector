import express from "express";
import morgan from "morgan";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import { getWebhookHandler } from "./services/webhook-handler-active-object";
import cors  from 'cors';

// Load environment variables from .env file
dotenv.config();

getWebhookHandler().init().catch(error => console.error(error));

const { NODE_ENV } = process.env;

export const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(cors());


if (NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("common"));
}




