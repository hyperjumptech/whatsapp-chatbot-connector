import axios from "axios";
import dotenv from 'dotenv';

dotenv.config();

const { GRAPH_API_TOKEN, BUSINESS_PHONE_NUMBER_ID } = process.env;
const BASE_URL = `https://graph.facebook.com/v19.0/${BUSINESS_PHONE_NUMBER_ID}`;

const AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 20_000, // 20 seconds,
  timeoutErrorMessage: "Connection timed out",
});

export const sendChat = async ({ to, text }: { to: string; text: string }) => {
  return await AxiosInstance({
    method: "POST",
    url: `${BASE_URL}/messages`,
    headers: {
      Authorization: `Bearer ${GRAPH_API_TOKEN}`,
    },
    data: {
      messaging_product: "whatsapp",
      to,
      text: { body: "Echo: " + text },
    },
  });
};

export const markChatAsRead = async (messageId: string) => {
  return await AxiosInstance({
    method: "POST",
    url: `${BASE_URL}/messages`,
    headers: {
      Authorization: `Bearer ${GRAPH_API_TOKEN}`,
    },
    data: {
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
    },
  });
};
