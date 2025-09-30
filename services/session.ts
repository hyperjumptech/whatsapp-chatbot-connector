import { z } from "zod";

import { config } from "../utils/config";
import InMemoryDatabase from "../utils/session/in-memory";
import redis from "../utils/session/redis";

// Accept only digits for waId for extra safety, assume WhatsApp phone format (4-20 digits)
const schema = z.object({
  waId: z.string().regex(/^\d{4,20}$/),
  conversationId: z.string(),
});

// Helper to build a safe Redis session key with namespacing
function getSessionKey(waId: string): string {
  // At this point, waId should have been validated by zod (schema)
  // Defensive: limit length as well as type (already regex checked above)
  return `session:${waId}`;
}

type Session = z.input<typeof schema>;

const inMemory = new InMemoryDatabase<Session>();

export async function setSession(session: Session) {
  // Validate waId using Zod; this throws if invalid
  await schema.pick({ waId: true }).parseAsync({ waId: session.waId });
  if (config.SESSION_DATABASE === "in-memory") {
    inMemory.set(session.waId, session);
  } else if (config.SESSION_DATABASE === "redis") {
    const key = getSessionKey(session.waId);
    await redis.set(key, JSON.stringify(session));
  }
}

export async function getSession(waId: Session["waId"]) {
  // Validate waId before use
  await schema.pick({ waId: true }).parseAsync({ waId });
  if (config.SESSION_DATABASE === "in-memory") {
    const item = inMemory.get(waId);
    if (item === null) return null;

    const result = await schema.parseAsync(item);

    return result;
  } else if (config.SESSION_DATABASE === "redis") {
    const key = getSessionKey(waId);
    const item = await redis.get(key);
    if (item === null) return null;

    const result = await schema.parseAsync(JSON.parse(item));

    return result;
  }
}
