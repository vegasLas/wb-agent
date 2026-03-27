import { Request } from 'express';
import { validate } from '@telegram-apps/init-data-node';
import { env } from '../config/env';
import { ApiError } from './errors';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  language_code: string;
  allows_write_to_pm: boolean;
}

export interface ParsedInitData {
  query_id: string;
  user: TelegramUser;
  auth_date: number;
  hash: string;
}

/**
 * Parses and validates Telegram Mini App initData from request headers
 * @param req - Express request object
 * @returns Parsed and validated initData
 * @throws ApiError if initData is missing or invalid
 */
export function parseInitData(req: Request): ParsedInitData {
  const initDataRaw = req.headers['x-init-data'] as string | undefined;

  if (!initDataRaw) {
    throw ApiError.unauthorized('Missing initData');
  }

  try {
    // Validate the initData with Telegram bot token
    validate(initDataRaw, env.TELEGRAM_BOT_TOKEN!, {
      expiresIn: 3600, // 1 hour expiration
    });

    // Parse the query string
    const params = new URLSearchParams(initDataRaw);
    const userParam = params.get('user');
    if (!userParam) {
      throw new Error('No user data in initData');
    }

    return {
      query_id: params.get('query_id') || '',
      user: JSON.parse(userParam) as TelegramUser,
      auth_date: parseInt(params.get('auth_date') || '0', 10),
      hash: params.get('hash') || '',
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('expired')) {
      throw ApiError.unauthorized('Init data is expired', 'INIT_DATA_EXPIRED');
    }
    throw ApiError.unauthorized('Invalid initData');
  }
}

/**
 * Extracts Telegram user ID from request headers without full validation
 * Use for optional auth scenarios
 * @param req - Express request object
 * @returns Telegram user ID or null
 */
export function extractTelegramUserId(req: Request): number | null {
  try {
    const initData = parseInitData(req);
    return initData.user.id;
  } catch {
    return null;
  }
}
