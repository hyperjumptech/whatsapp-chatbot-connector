import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const schema = z.object({
  NODE_ENV: z
    .enum(["test", "development", "production"])
    .default("development"),
  SESSION_DATABASE: z.enum(["in-memory", "redis"]).default("in-memory"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
});

const originalEnvConfig = schema.parse(process.env);

const redisUrl = new URL(originalEnvConfig.REDIS_URL);
const REDIS_HOST = redisUrl.hostname || "localhost";
const REDIS_PORT = Number(redisUrl.port) || 6379;

export const config = {
  ...originalEnvConfig,
  REDIS_HOST,
  REDIS_PORT,
};
