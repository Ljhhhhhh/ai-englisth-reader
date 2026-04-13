import { z } from 'zod';

const booleanFromEnv = (defaultValue: boolean) =>
  z.preprocess((value) => {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();

      if (normalized === '') {
        return undefined;
      }

      if (['1', 'true', 'yes', 'on'].includes(normalized)) {
        return true;
      }

      if (['0', 'false', 'no', 'off'].includes(normalized)) {
        return false;
      }
    }

    return value;
  }, z.boolean())
    .optional()
    .default(defaultValue);

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1)
    .default('mysql://lexora:Guanmo!01@127.0.0.1:3306/lexora'),
  APP_BASE_URL: z.string().url().default('http://127.0.0.1:3000'),
  AUTH_CODE_SECRET: z.string().min(1).default('dev-code-secret-change-me'),
  AUTH_CODE_TTL_MINUTES: z.coerce.number().int().positive().default(10),
  AUTH_COOKIE_SECURE: booleanFromEnv(false),
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
  MAIL_FROM: z.string().min(1).default('noreply@example.com'),
  MAIL_PROVIDER: z.enum(['gmail', 'log']).default('log'),
  MAIL_SMTP_HOST: z.string().default('smtp.gmail.com'),
  MAIL_SMTP_PASS: z.string().optional(),
  MAIL_SMTP_PORT: z.coerce.number().int().positive().default(465),
  MAIL_SMTP_SECURE: booleanFromEnv(true),
  MAIL_SMTP_USER: z.string().email().optional(),
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
  MAIL_SMTP_HOST: process.env.MAIL_SMTP_HOST,
  MAIL_SMTP_PASS: process.env.MAIL_SMTP_PASS,
  MAIL_SMTP_PORT: process.env.MAIL_SMTP_PORT,
  MAIL_SMTP_SECURE: process.env.MAIL_SMTP_SECURE,
  MAIL_SMTP_USER: process.env.MAIL_SMTP_USER,
});
