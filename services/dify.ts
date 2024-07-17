import axios from "axios";
import dotenv from "dotenv";
import { getSession, setSession } from "./session";

dotenv.config();

const { DIFY_API_KEY, DIFY_BASE_URL } = process.env;
const BASE_URL = DIFY_BASE_URL || `https://api.dify.ai/v1`;

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

export const queryToDify = async ({
  body,
  query,
}: {
  body: unknown;
  query: string;
}) => {
  const waId = (body as Record<string, Record<string, Record<string, Record<string, Record<string, Record<string, Record<string, Record<string, unknown>>>>>>>>).entry?.[0]?.changes[0]?.value?.contacts?.[0]?.wa_id as string;
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
