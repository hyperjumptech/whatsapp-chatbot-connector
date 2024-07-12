import { z } from "zod";

import { config } from "../utils/config";
import InMemoryDatabase from "../utils/session/in-memory";
import redis from "../utils/session/redis";

const schema = z.object({
  waId: z.string(),
  conversationId: z.string(),
});

type Session = z.input<typeof schema>;

const inMemory = new InMemoryDatabase<Session>();

export async function setSession(session: Session) {
  if (config.SESSION_DATABASE === "in-memory") {
    inMemory.set(session.waId, session);
  } else if (config.SESSION_DATABASE === "redis") {
    await redis.set(session.waId, JSON.stringify(session));
  }
}

export async function getSession(waId: Session["waId"]) {
  if (config.SESSION_DATABASE === "in-memory") {
    const item = inMemory.get(waId);
    if (item === null) return null;

    const result = await schema.parseAsync(item);

    return result;
  } else if (config.SESSION_DATABASE === "redis") {
    const item = await redis.get(waId);
    if (item === null) return null;

    const result = await schema.parseAsync(JSON.parse(item));

    return result;
  }
}
