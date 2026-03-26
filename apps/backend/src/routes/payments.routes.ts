/**
 * Payment Routes - migrated from deprecated project
 * Source: /Users/muhammad/Documents/wb/server/api/v1/payments/*.ts
 */

import { Router, RequestHandler, Response, NextFunction } from 'express';
import { body, query, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware';
import { yookassaService } from '../services/yookassa.service';
import { prisma } from '../config/database';
import { TBOT } from '../utils/TBOT';
import { ApiError } from '../utils/errors';
import { logger } from '../utils/logger';
import { PAYMENT_TARIFFS } from '../constants/payments';

const router = Router();

// HTML template for payment status page
const getPaymentTemplate = (
  type: 'success' | 'pending' | 'canceled' | 'error' | 'waiting_for_capture',
  data?: {
    tariff?: { name?: string; days?: number; bookingCount?: number };
    amount?: number;
    errorMessage?: string;
  }
): string => {
  const templates: Record<string, string> = {
    success: `
      <div class="success-card">
        <div class="success-icon">✅</div>
        <h1 class="message">Оплата прошла успешно!</h1>
        <div class="tariff">Тариф: ${data?.tariff?.name}</div>
        <div class="amount">${data?.amount} ₽</div>
        <div class="details">
          ${
            data?.tariff
              ? 'days' in data.tariff
                ? `В течение нескольких минут ваша подписка будет продлена на <b>${data.tariff.days} дней</b>`
                : `В течение нескольких минут будет добавлено <b>${data.tariff.bookingCount}</b> автоброней`
              : ''
          }
        </div>
        <p class="sub-message">😊 Спасибо за оплату!</p>
        <a href="tg://resolve?domain=wb_book_bot" class="button">
          Вернуться в Telegram
        </a>
      </div>
    `,
    pending: `
      <div class="success-card warning">
        <div class="success-icon">⏳</div>
        <h1 class="message">Ожидание оплаты</h1>
        <div class="tariff">Тариф: ${data?.tariff?.name}</div>
        <div class="amount">${data?.amount} ₽</div>
        <div class="details">Пожалуйста, завершите оплату</div>
        <p class="sub-message">⚠️ Оплата находится в обработке</p>
      </div>
    `,
    waiting_for_capture: `
      <div class="success-card warning">
        <div class="success-icon">⏳</div>
        <h1 class="message">Ожидание оплаты</h1>
        <div class="tariff">Тариф: ${data?.tariff?.name}</div>
        <div class="amount">${data?.amount} ₽</div>
        <div class="details">Пожалуйста, завершите оплату</div>
        <p class="sub-message">⚠️ Оплата находится в обработке</p>
      </div>
    `,
    canceled: `
      <div class="success-card error">
        <div class="success-icon">❌</div>
        <h1 class="message">Оплата отменена</h1>
        <div class="details">Платеж был отменен</div>
        <p class="sub-message">Попробуйте повторить платеж позже</p>
      </div>
    `,
    error: `
      <div class="success-card error">
        <div class="success-icon">❌</div>
        <h1 class="message">Ошибка при оплате</h1>
        <div class="details">${data?.errorMessage || 'Произошла ошибка при обработке платежа'}</div>
        <p class="sub-message">Попробуйте повторить платеж позже</p>
      </div>
    `,
  };

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Статус оплаты</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8f9fa;
          }
          .success-card {
            text-align: center;
            padding: 2rem;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            max-width: 90%;
          }
          .success-card.warning {
            border: 2px solid #f59e0b;
          }
          .success-card.error {
            border: 2px solid #ef4444;
          }
          .success-icon {
            font-size: 48px;
            margin-bottom: 1rem;
          }
          .message {
            color: #0f172a;
            margin-bottom: 0.5rem;
          }
          .tariff {
            color: #0f172a;
            margin: 1rem 0;
            font-size: 1.1rem;
          }
          .amount {
            color: #0f172a;
            margin-bottom: 1rem;
            font-weight: 500;
          }
          .details {
            color: #0f172a;
            margin-bottom: 1rem;
          }
          .sub-message {
            color: #64748b;
            font-size: 0.875rem;
          }
          .button {
            display: inline-block;
            background-color: #0088cc;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 500;
            margin-top: 16px;
            transition: background-color 0.2s;
          }
          .button:hover {
            background-color: #006699;
          }
          @media (prefers-color-scheme: dark) {
            body {
              background: #1a1a1a;
            }
            .success-card {
              background: #2a2a2a;
            }
            .message, .tariff, .amount, .details {
              color: #ffffff;
            }
            .sub-message {
              color: #a0aec0;
            }
          }
        </style>
      </head>
      <body>
        ${templates[type]}
      </body>
    </html>
  `;
};

// POST /api/v1/payments/create - Create a new payment
router.post(
  '/create',
  authenticate,
  body('tariffId').notEmpty().withMessage('Tariff ID is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  (async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, errors.array()[0].msg);
      }

      const { tariffId, email } = req.body;

      // Find tariff
      const tariff = PAYMENT_TARIFFS.find((t) => t.id === tariffId);
      if (!tariff) {
        throw new ApiError(400, 'Invalid tariff ID');
      }

      const idempotencyKey = uuidv4();
      const origin = req.headers.origin || `${req.protocol}://${req.headers.host}`;
      const returnUrl = `${origin}/api/v1/payments/check?key=${idempotencyKey}`;

      const payment = await yookassaService.createPayment(
        {
          capture: true,
          test: false,
          amount: {
            value: tariff.price.toFixed(2),
            currency: 'RUB',
          },
          description: `Payment for ${tariff.name}`,
          confirmation: {
            type: 'redirect',
            locale: 'ru_RU',
            return_url: returnUrl,
          },
          metadata: {
            tariffId,
            userId: req.user!.id.toString(),
          },
          receipt: {
            customer: { email },
            items: [
              {
                description: tariff.name,
                amount: {
                  value: tariff.price.toFixed(2),
                  currency: 'RUB',
                },
                vat_code: 6,
                quantity: 1,
                payment_mode: 'full_prepayment',
                payment_subject: 'service',
              },
            ],
          },
        },
        idempotencyKey
      );

      // Save payment to database
      await prisma.payment.create({
        data: {
          paymentId: payment.id,
          amount: tariff.price,
          currency: 'RUB',
          status: payment.status,
          tariffId: tariff.id,
          userId: req.user!.id,
          idempotencyKey,
        },
      });

      // Send Telegram notification if chatId exists
      if (req.user!.chatId && payment.confirmation?.confirmation_url && TBOT) {
        await TBOT.sendMessage(
          req.user!.chatId,
          [
            '💳 *Оплата тарифа*',
            '',
            `Тариф: *${tariff.name}*`,
            `Сумма: *${tariff.price} ₽*`,
            '',
            'Нажмите на кнопку ниже для оплаты:',
          ].join('\n'),
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '💳 Оплатить',
                    url: payment.confirmation.confirmation_url,
                  },
                ],
                [
                  {
                    text: '🔍 Проверить оплату',
                    url: returnUrl,
                  },
                ],
                [
                  {
                    text: 'Закрыть ❌',
                    callback_data: 'close_menu',
                  },
                ],
              ],
            },
          }
        );
      }

      res.json(payment);
    } catch (error) {
      logger.error('Payment creation failed:', error);
      next(error instanceof ApiError ? error : new ApiError(500, 'Failed to create payment'));
    }
  }) as RequestHandler
);

// GET /api/v1/payments/check - Check payment status (returns HTML page)
router.get(
  '/check',
  query('key').notEmpty(),
  async (req, res) => {
    try {
      const key = req.query?.key as string;

      if (!key) {
        return res.status(400).send(getPaymentTemplate('error', { errorMessage: 'Ключ платежа не найден' }));
      }

      // Find payment by idempotencyKey
      const dbPayment = await prisma.payment.findUnique({
        where: { idempotencyKey: key },
        include: { user: true },
      });

      if (!dbPayment) {
        return res.status(404).send(getPaymentTemplate('error', { errorMessage: 'Платеж не найден в базе данных' }));
      }

      // Check if payment is already processed successfully
      if (dbPayment.status === 'succeeded' && dbPayment.paidAt) {
        const tariff = PAYMENT_TARIFFS.find((t) => t.id === dbPayment.tariffId);
        return res.send(getPaymentTemplate('success', { tariff, amount: dbPayment.amount }));
      }

      // Find the tariff
      const tariff = PAYMENT_TARIFFS.find((t) => t.id === dbPayment.tariffId);
      if (!tariff) {
        return res.status(404).send(getPaymentTemplate('error', { errorMessage: 'Тариф не найден' }));
      }

      // Get payment status from YooKassa
      const payment = await yookassaService.getPayment(dbPayment.paymentId);

      // Update payment status in database
      await prisma.payment.update({
        where: { id: dbPayment.id },
        data: {
          status: payment.status,
          paidAt: payment.status === 'succeeded' ? new Date() : null,
        },
      });

      // Process different statuses
      if (payment.status === 'pending') {
        return res.send(getPaymentTemplate('pending', { tariff, amount: dbPayment.amount }));
      }

      if (payment.status === 'waiting_for_capture') {
        return res.send(getPaymentTemplate('waiting_for_capture', { tariff, amount: dbPayment.amount }));
      }

      if (payment.status === 'canceled') {
        return res.send(getPaymentTemplate('canceled'));
      }

      // Process successful payment
      if (payment.status === 'succeeded') {
        await yookassaService.processSuccessfulPayment(
          dbPayment.paymentId,
          dbPayment.userId,
          dbPayment.tariffId
        );
      }

      return res.send(getPaymentTemplate('success', { tariff, amount: dbPayment.amount }));
    } catch (error: unknown) {
      const err = error as { message?: string };
      logger.error('Payment creation failed:', err);
      logger.error('Payment verification failed:', err);
      return res.status((err as { statusCode?: number }).statusCode || 400).send(
        getPaymentTemplate('error', { errorMessage: err.message || '❌ Ошибка при проверке платежа' })
      );
    }
  }
);

// GET /api/v1/payments/history - Get user's payment history
router.get('/history', authenticate, (async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(payments);
  } catch (error) {
    next(error);
  }
}) as RequestHandler);

export default router;
