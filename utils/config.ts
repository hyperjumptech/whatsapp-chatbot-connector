import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const schema = z
  .object({
    NODE_ENV: z
      .enum(["test", "development", "production"])
      .default("development"),
    SESSION_DATABASE: z.enum(["in-memory", "redis"]).default("in-memory"),
    REDIS_URL: z.string().default("redis://localhost:6379"),
    GRAPH_API_TOKEN: z.string().default(""),
    BUSINESS_PHONE_NUMBER_ID: z.string().default(""),
    CONNECTION_PLATFORM: z.enum(["dify", "rasa"]).default("dify"),
    DIFY_BASE_URL: z.string().default("https://api.dify.ai/v1"),
    DIFY_API_KEY: z.string().default(""),
    DIFY_TIMEOUT: z.number().default(30_000),
    RASA_BASE_URL: z
      .string()
      .default("http://localhost:5005/webhooks/rest/webhook"),
    RASA_TIMEOUT: z.number().default(30_000),
    WA_TIMEOUT: z.number().default(30_000),
  })
  .transform((env) => {
    const redisUrl = new URL(env.REDIS_URL);
    return {
      ...env,
      REDIS_HOST: redisUrl.hostname || "localhost",
      REDIS_PORT: z.coerce.number().parse(redisUrl.port || 6379),
    };
  });

export const config = schema.parse(process.env);
