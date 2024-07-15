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

export const config = schema.parse(process.env);
