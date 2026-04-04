/**
 * Webhook Routes - migrated from deprecated project
 * Source: /Users/muhammad/Documents/wb/server/api/v1/webhooks/yookassa.post.ts
 */

import { Router } from 'express';
import { yookassaService } from '../services/yookassa.service';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { PAYMENT_TARIFFS } from '../constants/payments';
import { YooKassaWebhookPayload } from '../types/payments';
import { isIPv4, isIPv6 } from 'net';

const router = Router();

// YooKassa allowed IP ranges
const ALLOWED_IPV4_RANGES = [
  '185.71.76.0/27',
  '185.71.77.0/27',
  '77.75.153.0/25',
  '77.75.156.11',
  '77.75.156.35',
  '77.75.154.128/25',
];

const ALLOWED_IPV6_RANGES = ['2a02:5180::/32'];

/**
 * Convert IP address to numeric representation
 */
function ipToLong(ip: string): number {
  return (
    ip
      .split('.')
      .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0
  );
}

/**
 * Check if IPv4 address is in CIDR range
 */
function isIPInRange(ip: string, cidr: string): boolean {
  if (!cidr.includes('/')) return ip === cidr;

  const [range, bits] = cidr.split('/');
  const ipLong = ipToLong(ip);
  const rangeLong = ipToLong(range);
  const mask = ~((1 << (32 - parseInt(bits))) - 1) >>> 0;

  return (ipLong & mask) === (rangeLong & mask);
}

/**
 * Check if IPv6 address is in CIDR range
 */
function isIPv6InRange(ip: string, cidr: string): boolean {
  // Simple prefix check for IPv6 (can be enhanced for more precise validation)
  return ip.startsWith(cidr.split('/')[0].split(':')[0]);
}

// POST /api/v1/webhooks/yookassa - YooKassa webhook handler
router.post('/yookassa', async (req, res) => {
  try {
    // Get client IP
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp = forwarded
      ? (forwarded as string).split(',')[0].trim()
      : req.socket.remoteAddress || '';

    // Validate IP address
    let isAllowedIP = false;

    if (isIPv4(clientIp)) {
      isAllowedIP = ALLOWED_IPV4_RANGES.some((range) =>
        isIPInRange(clientIp, range),
      );
    } else if (isIPv6(clientIp)) {
      isAllowedIP = ALLOWED_IPV6_RANGES.some((range) =>
        isIPv6InRange(clientIp, range),
      );
    }

    if (!isAllowedIP) {
      logger.error(`Unauthorized webhook IP: ${clientIp}`);
      return res.json({ success: true }); // Return 200 but don't process
    }

    // Get the raw body
    const body = req.body as YooKassaWebhookPayload;

    // Validate webhook payload
    if (!body || body.type !== 'notification' || !body.event || !body.object) {
      logger.error('Invalid webhook payload:', body);
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    // Find payment in database
    const dbPayment = await prisma.payment.findUnique({
      where: { paymentId: body.object.id },
      include: { user: true },
    });

    if (!dbPayment) {
      logger.error('Payment not found:', body.object.id);
      return res.json({ success: true }); // Return 200 even if not found
    }

    // Prevent duplicate processing for succeeded payments
    if (
      body.event === 'payment.succeeded' &&
      dbPayment.status === 'succeeded' &&
      dbPayment.paidAt
    ) {
      return res.json({ success: true });
    }

    // Find the tariff
    const tariff = PAYMENT_TARIFFS.find((t) => t.id === dbPayment.tariffId);
    if (!tariff) {
      logger.error('Tariff not found for payment:', body.object.id);
      return res.json({ success: true });
    }

    // Handle different webhook events
    switch (body.event) {
      case 'payment.waiting_for_capture':
        try {
          const capture = await yookassaService.capturePayment(
            dbPayment.paymentId,
            {
              value: dbPayment.amount,
              currency: 'RUB',
            },
            dbPayment.idempotencyKey,
          );

          if (capture.status === 'succeeded') {
            await yookassaService.processSuccessfulPayment(
              dbPayment.paymentId,
              dbPayment.userId,
              dbPayment.tariffId,
            );
          }
        } catch (error) {
          logger.error('Capture failed:', error);
        }
        break;

      case 'payment.succeeded':
        await yookassaService.processSuccessfulPayment(
          dbPayment.paymentId,
          dbPayment.userId,
          dbPayment.tariffId,
        );
        break;

      case 'payment.canceled':
        if (dbPayment.status !== 'canceled') {
          await prisma.payment.update({
            where: { id: dbPayment.id },
            data: { status: 'canceled' },
          });
        }
        break;

      case 'refund.succeeded':
        logger.log('Refund succeeded:', body.object.id);
        break;

      default:
        logger.log('Unhandled event type:', body.event);
    }

    // Return 200 OK to acknowledge receipt
    return res.json({ success: true });
  } catch (error) {
    logger.error('Webhook error:', error);
    // Always return 200 to acknowledge receipt
    return res.json({ success: true });
  }
});

export default router;
