import axios from "axios";
import dotenv from "dotenv";
import { getSession, setSession } from "./session";
import { config } from "../utils/config";

dotenv.config();

const { DIFY_API_KEY, DIFY_BASE_URL, DIFY_TIMEOUT } = config;

const AxiosInstanceDify = axios.create({
  baseURL: DIFY_BASE_URL,
  timeout: DIFY_TIMEOUT,
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
    url: `${DIFY_BASE_URL}/chat-messages`,
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

export const queryToDify = async ({
  waId,
  query,
}: {
  waId: string;
  query: string;
}) => {
  const user = await getSession(waId);

  const res = await sendQuery({
    userId: waId,
    conversationId: user?.conversationId || "",
    query,
  });

  if (!user) {
    await setSession({ waId: waId, conversationId: res.data.conversation_id });
  }

  return { text: res.data.answer };
};
