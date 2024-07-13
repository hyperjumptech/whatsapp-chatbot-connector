import dotenv from "dotenv";
import { Request } from "express";
import { getUserSession, setUserSession } from "./session";
import { httpClient } from "./http-client";

dotenv.config();

const { DIFY_API_KEY, DIFY_BASE_URL } = process.env;
const BASE_URL = DIFY_BASE_URL || `https://api.dify.ai/v1`;



export const sendQuery = async ({
  userId,
  conversationId,
  query,
}: {
  userId: string;
  conversationId: string;
  query: string;
}) => {
  return httpClient(`${BASE_URL}/chat-messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${DIFY_API_KEY}`,
      },
      signal: AbortSignal.timeout(20_000),      
      body: JSON.stringify({
        inputs: {},
        query,
        response_mode: "blocking",
        conversation_id: conversationId,
        user: userId,
      })
    }
  )

};

export const queryToDify = async ({
  req,
  query,
}: {
  req: Request;
  query: string;
}) => {
  const waId = req.body.entry?.[0]?.changes[0]?.value?.contacts?.[0]?.wa_id;
  const user = getUserSession(waId);

  const res = await sendQuery({
    userId: waId,
    conversationId: user?.conversationId || "",
    query,
  });

  if (!user) {
    setUserSession({
      id: waId,
      conversationId: (res.data as  Record<string, string>).conversation_id,
    });
  }

  return {text: (res.data as  Record<string, string>).answer};
};
