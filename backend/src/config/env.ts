import dotenv from 'dotenv';
import { z } from 'zod';

// Muat variabel lingkungan dari file .env
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  APP_BASE_URL: z.string().url().default('http://localhost:5173'),
  API_BASE_URL: z.string().url().default('http://localhost:3000'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL wajib diisi untuk koneksi PostgreSQL'),
  REDIS_URL: z.string().min(1, 'REDIS_URL wajib diisi untuk in-memory cache & rate limiter'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET wajib minimal 32 karakter demi keamanan kriptografi'),

  AI_PRIMARY_PROVIDER: z.enum(['gemini', 'openai']).default('gemini'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_DEFAULT_MODEL: z.string().default('gemini-1.5-flash'),

  AI_FALLBACK_PROVIDER: z.enum(['openai', 'gemini']).default('openai'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_DEFAULT_MODEL: z.string().default('gpt-4o-mini'),

  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('YolaBot <no-reply@yolabot.local>'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Gagal memvalidasi Environment Variables:');
  for (const issue of parsedEnv.error.issues) {
    // eslint-disable-next-line no-console
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsedEnv.data;
export type Env = z.infer<typeof envSchema>;

