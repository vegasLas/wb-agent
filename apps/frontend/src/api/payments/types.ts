// Payment tariffs — re-export from constants for single source of truth
import type { SubscriptionTariff, SubscriptionTier } from '@/constants';
import { ALL_SUBSCRIPTION_TARIFFS } from '@/constants';

export type PaymentTier = SubscriptionTier;
export type PaymentTariff = SubscriptionTariff;
export const PAYMENT_TARIFFS = ALL_SUBSCRIPTION_TARIFFS;

export interface Payment {
  id: string;
  paymentId?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'canceled' | 'waiting_for_capture';
  tariffId: string;
  createdAt: string;
  paidAt?: string | null;
  confirmation?: {
    confirmation_url?: string;
  };
}

export interface CreatePaymentRequest {
  tariffId: string;
  email: string;
}

export interface CreatePaymentResponse {
  id: string;
  status: string;
  confirmation?: {
    confirmation_url: string;
  };
}

export interface TrialResponse {
  success: boolean;
  message: string;
  expiresAt: string;
}
