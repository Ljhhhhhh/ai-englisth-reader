import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).default('file:./dev.db'),
  LLM_API_KEY: z.string().optional(),
  LLM_BASE_URL: z.string().default('https://api.siliconflow.cn/v1'),
  LLM_MODEL: z.string().default('deepseek-ai/DeepSeek-V3'),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  LLM_API_KEY: process.env.LLM_API_KEY,
  LLM_BASE_URL: process.env.LLM_BASE_URL,
  LLM_MODEL: process.env.LLM_MODEL,
});
