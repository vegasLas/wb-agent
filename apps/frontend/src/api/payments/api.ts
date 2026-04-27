import apiClient from '../client';
import type {
  Payment,
  PaymentTariff,
  CreatePaymentResponse,
  TrialResponse,
} from './types';
import { ALL_SUBSCRIPTION_TARIFFS } from '@/constants';

export const paymentsAPI = {
  /**
   * POST /api/v1/payments/create
   * Create a new payment
   */
  async createPayment(
    tariffId: string,
    email: string,
  ): Promise<CreatePaymentResponse> {
    const response = await apiClient.post<CreatePaymentResponse>(
      '/payments/create',
      {
        tariffId,
        email,
      },
    );
    return response.data;
  },

  /**
   * POST /api/v1/payments/trial
   * Activate 14-day free trial
   */
  async activateTrial(tier: 'LITE' | 'PRO' | 'MAX'): Promise<TrialResponse> {
    const response = await apiClient.post<TrialResponse>('/payments/trial', {
      tier,
    });
    return response.data;
  },

  /**
   * GET /api/v1/payments/history
   * Get user's payment history
   */
  async getPaymentHistory(): Promise<Payment[]> {
    const response = await apiClient.get<Payment[]>('/payments/history');
    return response.data;
  },

  /**
   * GET /api/v1/payments/check
   * Check payment status (returns HTML page)
   */
  async checkPaymentStatus(key: string): Promise<string> {
    const response = await apiClient.get('/payments/check', {
      params: { key },
      responseType: 'text',
    });
    return response.data;
  },

  /**
   * Get available tariffs
   */
  getTariffs(): PaymentTariff[] {
    return ALL_SUBSCRIPTION_TARIFFS as PaymentTariff[];
  },
};
