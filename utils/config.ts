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
    GRAPH_API_TOKEN: z.string(),
    BUSINESS_PHONE_NUMBER_ID: z.string(),
    CONNECTION_PLATFORM: z.enum(["dify", "rasa"]).default("dify"),
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
