/**
 * YooKassa Payment Service
 * Handles YooKassa payment API operations
 * Domain: api.yookassa.ru/v3
 */

import axios, { AxiosInstance } from 'axios';
import { createLogger } from "@/utils/logger";

const logger = createLogger('YooKassa');

const YOOKASSA_API_URL = 'https://api.yookassa.ru/v3';

export interface PaymentRequest {
  amount: {
    value: string;
    currency: string;
  };
  description: string;
  receipt?: {
    customer: {
      email?: string;
      phone?: string;
    };
    items: Array<{
      description: string;
      quantity: string;
      amount: {
        value: string;
        currency: string;
      };
      vat_code: number;
    }>;
  };
  metadata?: Record<string, string>;
  capture?: boolean;
  confirmation?: {
    type: string;
    return_url?: string;
  };
}

export interface YooKassaPayment {
  id: string;
  status: string;
  amount: {
    value: string;
    currency: string;
  };
  description: string;
  created_at: string;
  confirmation?: {
    type: string;
    confirmation_url?: string;
  };
  metadata?: Record<string, string>;
  paid: boolean;
  refundable: boolean;
  test?: boolean;
}

export class YooKassaPaymentService {
  private api: AxiosInstance;

  constructor() {
    const shopId = process.env.YOOKASSA_SHOP_ID;
    const secretKey = process.env.YOOKASSA_SECRET_KEY;

    if (!shopId || !secretKey) {
      logger.error('YooKassa credentials not configured');
      throw new Error('YooKassa credentials not configured');
    }

    this.api = axios.create({
      baseURL: YOOKASSA_API_URL,
      auth: {
        username: shopId,
        password: secretKey,
      },
      headers: {
        'Content-Type': 'application/json',
        'Idempotence-Key': `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      },
    });

    // Add response interceptor for logging
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        logger.error('YooKassa API error:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
        return Promise.reject(error);
      },
    );
  }

  /**
   * Create a new payment
   */
  async createPayment(
    paymentData: PaymentRequest,
    idempotenceKey?: string,
  ): Promise<YooKassaPayment> {
    try {
      const headers: Record<string, string> = {};
      if (idempotenceKey) {
        headers['Idempotence-Key'] = idempotenceKey;
      }

      const response = await this.api.post<YooKassaPayment>(
        '/payments',
        paymentData,
        { headers },
      );

      logger.info('YooKassa payment created:', {
        paymentId: response.data.id,
        status: response.data.status,
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to create YooKassa payment:', error);
      throw new Error(
        `Failed to create payment: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Get payment by ID
   */
  async getPayment(paymentId: string): Promise<YooKassaPayment> {
    try {
      const response = await this.api.get<YooKassaPayment>(
        `/payments/${paymentId}`,
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to get YooKassa payment:', error);
      throw new Error(
        `Failed to get payment: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Cancel a payment
   */
  async cancelPayment(
    paymentId: string,
    idempotenceKey?: string,
  ): Promise<YooKassaPayment> {
    try {
      const headers: Record<string, string> = {};
      if (idempotenceKey) {
        headers['Idempotence-Key'] = idempotenceKey;
      }

      const response = await this.api.post<YooKassaPayment>(
        `/payments/${paymentId}/cancel`,
        {},
        { headers },
      );

      logger.info('YooKassa payment cancelled:', {
        paymentId: response.data.id,
        status: response.data.status,
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to cancel YooKassa payment:', error);
      throw new Error(
        `Failed to cancel payment: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Capture a payment
   */
  async capturePayment(
    paymentId: string,
    amount?: { value: string; currency: string },
    idempotenceKey?: string,
  ): Promise<YooKassaPayment> {
    try {
      const headers: Record<string, string> = {};
      if (idempotenceKey) {
        headers['Idempotence-Key'] = idempotenceKey;
      }

      const response = await this.api.post<YooKassaPayment>(
        `/payments/${paymentId}/capture`,
        amount ? { amount } : {},
        { headers },
      );

      logger.info('YooKassa payment captured:', {
        paymentId: response.data.id,
        status: response.data.status,
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to capture YooKassa payment:', error);
      throw new Error(
        `Failed to capture payment: ${(error as Error).message}`,
      );
    }
  }
}

export const yookassaPaymentService = new YooKassaPaymentService();
