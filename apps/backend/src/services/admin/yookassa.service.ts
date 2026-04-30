/**
 * YooKassa Service - migrated from deprecated project
 * Source: /Users/muhammad/Documents/wb/server/services/yookassa.service.ts
 * Adapted from SDK-based to direct axios implementation
 */

import axios from 'axios';
import { prisma } from '@/config/database';
import { ICreatePayment, ICreatePaymentResponse } from '@/types/payments';
import { TBOT } from '@/utils/TBOT';
import {
  ALL_SUBSCRIPTION_TARIFFS,
  MAX_ACCOUNTS,
  SubscriptionTariff,
} from '@/constants/payments';
import { createSubscription } from '@/utils/subscription';

type Tariff = SubscriptionTariff;
import { logger } from '@/utils/logger';

const YOOKASSA_API_URL = 'https://api.yookassa.ru/v3';

export class YookassaService {
  private shopId: string;
  private secretKey: string;

  constructor() {
    this.shopId = process.env.YOOKASSA_SHOP_ID!;
    this.secretKey = process.env.YOOKASSA_SECRET_KEY!;
  }

  async createPayment(
    data: ICreatePayment,
    idempotencyKey: string,
  ): Promise<ICreatePaymentResponse> {
    const auth = Buffer.from(`${this.shopId}:${this.secretKey}`).toString(
      'base64',
    );

    const response = await axios.post<ICreatePaymentResponse>(
      `${YOOKASSA_API_URL}/payments`,
      data,
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Idempotence-Key': idempotencyKey,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data;
  }

  async getPayment(paymentId: string): Promise<ICreatePaymentResponse> {
    const auth = Buffer.from(`${this.shopId}:${this.secretKey}`).toString(
      'base64',
    );

    const response = await axios.get<ICreatePaymentResponse>(
      `${YOOKASSA_API_URL}/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data;
  }

  async capturePayment(
    paymentId: string,
    amount: { value: number; currency: string },
    idempotencyKey: string,
  ): Promise<ICreatePaymentResponse> {
    const auth = Buffer.from(`${this.shopId}:${this.secretKey}`).toString(
      'base64',
    );

    const response = await axios.post<ICreatePaymentResponse>(
      `${YOOKASSA_API_URL}/payments/${paymentId}/capture`,
      { amount },
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Idempotence-Key': idempotencyKey,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data;
  }

  async processSuccessfulPayment(
    paymentId: string,
    userId: number,
    tariffId: string,
  ): Promise<void> {
    // Update payment status
    await prisma.payment.update({
      where: { paymentId },
      data: {
        status: 'succeeded',
        paidAt: new Date(),
      },
    });

    // Find tariff
    const tariff = ALL_SUBSCRIPTION_TARIFFS.find((t) => t.id === tariffId);
    if (!tariff) {
      logger.error(`Tariff not found: ${tariffId}`);
      return;
    }

    // Get user for notification
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { telegram: true },
    });

    // Handle subscription tariff
    // Find active subscription to determine extension base date
    const activeSub = await prisma.userSubscription.findFirst({
      where: { userId },
      orderBy: { startedAt: 'desc' },
    });

    const baseDate =
      activeSub?.endedAt && activeSub.endedAt > new Date()
        ? new Date(activeSub.endedAt)
        : new Date();

    const newExpiry = new Date(baseDate);
    newExpiry.setDate(newExpiry.getDate() + tariff.days);

    const tier = tariff.tier;
    const maxAccounts = MAX_ACCOUNTS[tier];

    // Create new subscription record and update user limits
    await createSubscription(userId, tier, newExpiry);
    await prisma.user.update({
      where: { id: userId },
      data: { maxAccounts },
    });

    // Send Telegram notification
    const chatId = user?.telegram?.chatId;
    if (chatId) {
      await this.sendSuccessNotification(chatId, tariff, 'subscription');
    }
  }

  private async sendSuccessNotification(
    chatId: string,
    tariff: Tariff,
    type: 'subscription',
  ): Promise<void> {
    const URL = process.env.FRONTEND_URL || process.env.URL || '';

    const message = [
      '✅ *Оплата прошла успешно!*',
      '',
      `Тариф: *${tariff.name}*`,
      `План: *${tariff.tier}*`,
      `Сумма: *${tariff.price} ₽*`,
      '',
      `🎉 В течение нескольких минут ваша подписка будет продлена на *${tariff.days} дней*, если возникнут проблемы, напишите в поддержку`,
      '',
      'Спасибо за доверие! Приятного использования бота!',
    ].join('\n');

    try {
      if (!TBOT) return;
      await TBOT.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
      });
    } catch (error) {
      logger.error('Failed to send payment success notification:', error);
    }
  }
}

export const yookassaService = new YookassaService();
