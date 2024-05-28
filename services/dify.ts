import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const { DIFY_API_KEY } = process.env;
const BASE_URL = `https://api.dify.ai/v1`;

const AxiosInstanceDify = axios.create({
  baseURL: BASE_URL,
  timeout: 20_000, // 20 seconds,
  timeoutErrorMessage: "Connection timed out",
});

export const sendQuery = async ({
  userId,
  conversationId,
  query,
}: {
  userId: string;
  conversationId: string;
  query: string;
}) => {
  return await AxiosInstanceDify({
    method: "POST",
    url: `${BASE_URL}/chat-messages`,
    headers: {
      Authorization: `Bearer ${DIFY_API_KEY}`,
    },
    data: {
      inputs: {},
      query,
      response_mode: "blocking",
      conversation_id: conversationId,
      user: userId,
    },
  });
};
