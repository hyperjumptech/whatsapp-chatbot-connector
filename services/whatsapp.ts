import axios, { AxiosError } from "axios";
import dotenv from "dotenv";

dotenv.config();

const { GRAPH_API_TOKEN, BUSINESS_PHONE_NUMBER_ID } = process.env;
const BASE_URL = `https://graph.facebook.com/v19.0/${BUSINESS_PHONE_NUMBER_ID}`;

const AxiosInstanceWhatsapp = axios.create({
  baseURL: BASE_URL,
  timeout: 20_000, // 20 seconds,
  timeoutErrorMessage: "Connection timed out",
});

export const sendChatbotReply = async ({
  to,
  chatbotReply,
}: {
  to: string;
  chatbotReply: {
    text: string;
    type?: string;
    buttons?: { type: "reply"; reply: { id: string; title: string } }[];
    rows?: { id: string; title: string; description: string }[];
  };
}) => {
  switch (chatbotReply?.type) {
    case "interactive-button":
      await sendInteractiveReplyButton({
        to,
        text: chatbotReply.text,
        buttons: chatbotReply.buttons,
      });
      break;
    case "interactive-list":
      await sendInteractiveListMessage({
        to,
        text: chatbotReply.text,
        rows: chatbotReply.rows,
      });
      break;
    default:
      await sendTextMessage({ to, text: chatbotReply.text });
      break;
  }
};

export const sendTextMessage = async ({
  to,
  text,
}: {
  to: string;
  text: string;
}) => {
  try {
    return await AxiosInstanceWhatsapp({
      method: "POST",
      url: `${BASE_URL}/messages`,
      headers: {
        Authorization: `Bearer ${GRAPH_API_TOKEN}`,
      },
      data: {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { preview_url: true, body: text },
      },
    });
  } catch (error: unknown) {
    console.error(
      `Cannot send WhatsApp message, got: ${JSON.stringify(
        (error as AxiosError)?.response?.data || error
      )}`
    );
  }
};

export const sendInteractiveReplyButton = async ({
  to,
  text,
  buttons,
}: {
  to: string;
  text: string;
  buttons?: {
    type: "reply";
    reply: {
      id: string;
      title: string;
    };
  }[];
}) => {
  try {
    return await AxiosInstanceWhatsapp({
      method: "POST",
      url: `${BASE_URL}/messages`,
      headers: {
        Authorization: `Bearer ${GRAPH_API_TOKEN}`,
      },
      data: {
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
          type: "button",
          header: { type: "text", text: "" },
          body: { text },
          footer: { text: "" },
          action: { buttons },
        },
      },
    });
  } catch (error: unknown) {
    console.error(
      `Cannot send WhatsApp message, got: ${JSON.stringify(
        (error as AxiosError)?.response?.data || error
      )}`
    );
  }
};

export const sendInteractiveListMessage = async ({
  to,
  text,
  rows,
}: {
  to: string;
  text: string;
  rows?: {
    id: string;
    title: string;
    description: string;
  }[];
}) => {
  try {
    return await AxiosInstanceWhatsapp({
      method: "POST",
      url: `${BASE_URL}/messages`,
      headers: {
        Authorization: `Bearer ${GRAPH_API_TOKEN}`,
      },
      data: {
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
          type: "list",
          header: { type: "text", text: "" },
          body: { text },
          footer: { text: "" },
          action: { sections: [{ title: "", rows }], button: "Menu" },
        },
      },
    });
  } catch (error: unknown) {
    console.error(
      `Cannot send WhatsApp message, got: ${JSON.stringify(
        (error as AxiosError)?.response?.data || error
      )}`
    );
  }
};

export const markChatAsRead = async (messageId: string) => {
  return await AxiosInstanceWhatsapp({
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
