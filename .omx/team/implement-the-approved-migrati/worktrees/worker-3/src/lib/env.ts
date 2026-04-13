import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1)
    .default('mysql://root:password@127.0.0.1:3306/ai_english_read'),
  APP_BASE_URL: z.string().url().default('http://127.0.0.1:3000'),
  AUTH_CODE_SECRET: z.string().min(1).default('dev-code-secret-change-me'),
  AUTH_CODE_TTL_MINUTES: z.coerce.number().int().positive().default(10),
  AUTH_COOKIE_SECURE: z.coerce.boolean().default(false),
  AUTH_DEV_LOGIN_CODE: z.string().trim().length(6).optional(),
  AUTH_JWT_SECRET: z.string().min(1).default('dev-jwt-secret-change-me'),
  AUTH_SESSION_COOKIE_NAME: z
    .string()
    .min(1)
    .default('ai-english-read-session'),
  AUTH_SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  LLM_API_KEY: z.string().optional(),
  LLM_BASE_URL: z.string().default('https://api.siliconflow.cn/v1'),
  LLM_MODEL: z.string().default('deepseek-ai/DeepSeek-V3'),
  MAIL_FROM: z.string().email().default('noreply@example.com'),
  MAIL_PROVIDER: z.string().default('log'),
});

export const env = envSchema.parse({
  APP_BASE_URL: process.env.APP_BASE_URL,
  AUTH_CODE_SECRET: process.env.AUTH_CODE_SECRET,
  AUTH_CODE_TTL_MINUTES: process.env.AUTH_CODE_TTL_MINUTES,
  AUTH_COOKIE_SECURE: process.env.AUTH_COOKIE_SECURE,
  AUTH_DEV_LOGIN_CODE: process.env.AUTH_DEV_LOGIN_CODE,
  AUTH_JWT_SECRET: process.env.AUTH_JWT_SECRET,
  AUTH_SESSION_COOKIE_NAME: process.env.AUTH_SESSION_COOKIE_NAME,
  AUTH_SESSION_TTL_DAYS: process.env.AUTH_SESSION_TTL_DAYS,
  DATABASE_URL: process.env.DATABASE_URL,
  LLM_API_KEY: process.env.LLM_API_KEY,
  LLM_BASE_URL: process.env.LLM_BASE_URL,
  LLM_MODEL: process.env.LLM_MODEL,
  MAIL_FROM: process.env.MAIL_FROM,
  MAIL_PROVIDER: process.env.MAIL_PROVIDER,
});
