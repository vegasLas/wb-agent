import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.string().default('3001'),
  DATABASE_URL: z.string(),

  // JWT Configuration (required for browser auth)
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Encryption
  COOKIE_ENCRYPTION_KEY: z
    .string()
    .min(
      64,
      'COOKIE_ENCRYPTION_KEY must be at least 64 characters (hex encoded 32 bytes)',
    ),

  // Telegram
  TELEGRAM_BOT_TOKEN: z.string().optional(),

  // YooKassa (Payment)
  YOOKASSA_SHOP_ID: z.string().optional(),
  YOOKASSA_SECRET_KEY: z.string().optional(),

  // Technical Mode (comma-separated user IDs allowed during maintenance)
  TECHNICAL_MODE_USER_IDS: z.string().optional(),

  // Frontend URL (for CORS)
  FRONTEND_URL: z.string().default('http://localhost:3000'),

  // WB API Base URL
  WB_API_BASE_URL: z.string().default('https://seller-supply.wildberries.ru'),

  // Redis (optional)
  REDIS_URL: z.string().optional(),

  // Proxy list (optional, comma-separated: ip:port:user:pass:timezone)
  PROXY_LIST: z.string().optional(),

  // Monitoring cleanup (set to 'false' to disable scheduled cleanup jobs)
  RUN_MONITORING_CLEANUP: z.string().default('true'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:');
  parsedEnv.error.issues.forEach((issue) => {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

export const env = parsedEnv.data;
