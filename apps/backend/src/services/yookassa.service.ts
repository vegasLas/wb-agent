/**
 * YooKassa Service - migrated from deprecated project
 * Source: /Users/muhammad/Documents/wb/server/services/yookassa.service.ts
 * Adapted from SDK-based to direct axios implementation
 */

import axios from 'axios';
import { prisma } from '../config/database';
import { ICreatePayment, ICreatePaymentResponse } from '../types/payments';
import { TBOT } from '../utils/TBOT';
import { PAYMENT_TARIFFS, SubscriptionTariff, BookingTariff } from '../constants/payments';

type Tariff = SubscriptionTariff | BookingTariff;
import { logger } from '../utils/logger';

const YOOKASSA_API_URL = 'https://api.yookassa.ru/v3';

export class YookassaService {
  private shopId: string;
  private secretKey: string;

  constructor() {
    this.shopId = process.env.YOOKASSA_SHOP_ID!;
    this.secretKey = process.env.YOOKASSA_SECRET_KEY!;
  }

  async createPayment(data: ICreatePayment, idempotencyKey: string): Promise<ICreatePaymentResponse> {
    const auth = Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64');

    const response = await axios.post<ICreatePaymentResponse>(
      `${YOOKASSA_API_URL}/payments`,
      data,
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Idempotence-Key': idempotencyKey,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  }

  async getPayment(paymentId: string): Promise<ICreatePaymentResponse> {
    const auth = Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64');

    const response = await axios.get<ICreatePaymentResponse>(
      `${YOOKASSA_API_URL}/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  }

  async capturePayment(
    paymentId: string,
    amount: { value: number; currency: string },
    idempotencyKey: string
  ): Promise<ICreatePaymentResponse> {
    const auth = Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64');

    const response = await axios.post<ICreatePaymentResponse>(
      `${YOOKASSA_API_URL}/payments/${paymentId}/capture`,
      { amount },
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Idempotence-Key': idempotencyKey,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  }

  async processSuccessfulPayment(paymentId: string, userId: number, tariffId: string): Promise<void> {
    // Update payment status
    await prisma.payment.update({
      where: { paymentId },
      data: {
        status: 'succeeded',
        paidAt: new Date(),
      },
    });

    // Find tariff
    const tariff = PAYMENT_TARIFFS.find((t) => t.id === tariffId);
    if (!tariff) {
      logger.error(`Tariff not found: ${tariffId}`);
      return;
    }

    // Get user for notification
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    // Handle subscription tariff (has 'days' property)
    if ('days' in tariff) {
      const currentExpiry = user?.subscriptionExpiresAt;
      const baseDate = currentExpiry && new Date(currentExpiry) > new Date()
        ? new Date(currentExpiry)
        : new Date();

      const newExpiry = new Date(baseDate);
      newExpiry.setDate(newExpiry.getDate() + tariff.days);

      await prisma.user.update({
        where: { id: userId },
        data: { subscriptionExpiresAt: newExpiry },
      });

      // Send Telegram notification
      if (user?.chatId) {
        await this.sendSuccessNotification(user.chatId, tariff, 'subscription');
      }
    }
    // Handle booking tariff (has 'bookingCount' property)
    else if ('bookingCount' in tariff) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          autobookingCount: {
            increment: tariff.bookingCount,
          },
        },
      });

      // Send Telegram notification
      if (user?.chatId) {
        await this.sendSuccessNotification(user.chatId, tariff, 'booking');
      }
    }
  }

  private async sendSuccessNotification(
    chatId: string,
    tariff: Tariff,
    type: 'subscription' | 'booking'
  ): Promise<void> {
    const URL = process.env.FRONTEND_URL || process.env.URL || '';

    let message: string;
    if (type === 'subscription') {
      message = [
        '✅ *Оплата прошла успешно!*',
        '',
        `Тариф: *${tariff.name}*`,
        `Сумма: *${tariff.price} ₽*`,
        '',
        `🎉 В течение нескольких минут ваша подписка будет продлена на *${tariff.days} дней*, если возникнут проблемы, напишите в поддержку`,
        '',
        'Спасибо за доверие! Приятного использования бота!',
      ].join('\n');
    } else {
      message = [
        '✅ *Оплата прошла успешно!*',
        '',
        `Тариф: *${tariff.name}*`,
        `Сумма: *${tariff.price} ₽*`,
        '',
        `🎉 В течение 5 минут будет добавлено *${tariff.bookingCount}* автоброней, если возникнут проблемы, напишите в поддержку`,
        '',
        'Спасибо за доверие! Приятного использования бота!',
      ].join('\n');
    }

    try {
      if (!TBOT) return;
      await TBOT.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏠 Кабинет', web_app: { url: `${URL}?view=account` } }],
            [
              {
                text: 'ℹ️ Поддержка',
                url: 'https://t.me/wb_booking_support',
              },
            ],
            [{ text: '❌ Закрыть', callback_data: 'close_menu' }],
          ],
        },
      });
    } catch (error) {
      logger.error('Failed to send payment success notification:', error);
    }
  }
}

export const yookassaService = new YookassaService();
