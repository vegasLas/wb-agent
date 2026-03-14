import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001'),
  DATABASE_URL: z.string(),
  
  // JWT Configuration
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  
  // Telegram
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  
  // YooKassa (Payment)
  YOOKASSA_SHOP_ID: z.string().optional(),
  YOOKASSA_SECRET_KEY: z.string().optional(),
  
  // Technical Mode
  TECHNICAL_MODE_USER_ID: z.string().optional(),
  
  // Frontend URL (for CORS)
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  
  // WB API Base URL
  WB_API_BASE_URL: z.string().default('https://seller-supply.wildberries.ru'),
  
  // Redis (optional)
  REDIS_URL: z.string().optional(),
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
