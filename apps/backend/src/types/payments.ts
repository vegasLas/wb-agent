/**
 * Payment types - migrated from deprecated project
 * Source: /Users/muhammad/Documents/wb/types/payments.ts
 */

export interface ICreatePayment {
  capture: boolean;
  test: boolean;
  amount: {
    value: string;
    currency: 'RUB';
  };
  description: string;
  confirmation: {
    type: 'redirect';
    locale: 'ru_RU';
    return_url: string;
  };
  metadata: {
    tariffId: string;
    userId: string;
  };
  receipt: {
    customer: {
      email: string;
    };
    items: Array<{
      description: string;
      amount: {
        value: string;
        currency: 'RUB';
      };
      vat_code: number;
      quantity: number;
      payment_mode: string;
      payment_subject: string;
    }>;
  };
}

export interface ICreatePaymentResponse {
  id: string;
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled';
  amount: {
    value: string;
    currency: 'RUB';
  };
  description: string;
  recipient: {
    account_id: string;
    gateway_id: string;
  };
  created_at: string;
  confirmation: {
    type: 'redirect';
    confirmation_url: string;
    return_url: string;
  };
  test: boolean;
  paid: boolean;
  refundable: boolean;
  metadata: {
    userId: string;
    tariffId: string;
  };
}

export interface YooKassaWebhookPayload {
  type: 'notification';
  event: 'payment.succeeded' | 'payment.canceled' | 'payment.waiting_for_capture' | 'refund.succeeded';
  object: {
    id: string;
    status: string;
    paid: boolean;
    amount: {
      value: string;
      currency: string;
    };
    metadata?: Record<string, unknown>;
  };
}

export interface PaymentTariff {
  id: string;
  name: string;
  price: number;
  bookingCount: number;
  description: string;
  discount?: number;
}

export interface SubscriptionTariff {
  id: string;
  name: string;
  price: number;
  days: number;
  description: string;
  discount?: number;
}

export interface BookingTariff {
  id: string;
  name: string;
  price: number;
  bookingCount: number;
  description: string;
  discount?: number;
}
