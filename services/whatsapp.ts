import dotenv from "dotenv";
import { httpClient } from "./http-client";
import { FetchError } from "node-fetch";

dotenv.config();

const { GRAPH_API_TOKEN, BUSINESS_PHONE_NUMBER_ID } = process.env;
const BASE_URL = `https://graph.facebook.com/v19.0/${BUSINESS_PHONE_NUMBER_ID}`;

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
    return httpClient(`${BASE_URL}/messages`, {
      signal: AbortSignal.timeout(20_000),
      method: "POST",
      headers: {
        Authorization: `Bearer ${GRAPH_API_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { preview_url: true, body: text },
      }),      
    })
  } catch (error: unknown) {
    let errorMessage = "";
    if((error as Record<string, string>) .name === "AbortError"){
      errorMessage = "Connection timed out";
    }else{
      const fetchError: FetchError = (error as FetchError);
      errorMessage = fetchError.message;
    }
    console.error(
      `Cannot send WhatsApp message, got: ${errorMessage}`
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
    return httpClient(`${BASE_URL}/messages`, {
      method: "POST",      
      headers: {
        Authorization: `Bearer ${GRAPH_API_TOKEN}`,
      },
      body: JSON.stringify({
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
      }),    
    })
  } catch (error: unknown) {
    let errorMessage = "";
    if((error as Record<string, string>) .name === "AbortError"){
      errorMessage = "Connection timed out";
    }else{
      const fetchError: FetchError = (error as FetchError);
      errorMessage = fetchError.message;
    }
    console.error(
      `Cannot send WhatsApp message, got: ${errorMessage}`
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
    return httpClient(`${BASE_URL}/messages`, {
      method: "POST",      
      headers: {
        Authorization: `Bearer ${GRAPH_API_TOKEN}`,
      },
      body: JSON.stringify({
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
      }),
    })
  } catch (error: unknown) {
    let errorMessage = "";
    if((error as Record<string, string>) .name === "AbortError"){
      errorMessage = "Connection timed out";
    }else{
      const fetchError: FetchError = (error as FetchError);
      errorMessage = fetchError.message;
    }
    console.error(
      `Cannot send WhatsApp message, got: ${errorMessage}`
    );
  }    

};

export const markChatAsRead = async (messageId: string) => {

    return httpClient(`${BASE_URL}/messages`, {
    method: "POST",    
    headers: {
      Authorization: `Bearer ${GRAPH_API_TOKEN}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
    }),
  })

};
