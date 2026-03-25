import apiClient from './client';
import type { Tariff, Payment } from '../types';

export interface CreatePaymentRequest {
  tariffId: string;
  email: string;
}

export const paymentsAPI = {
  async fetchTariffs(): Promise<Tariff[]> {
    const response = await apiClient.get('/payments/tariffs');
    return response.data.data;
  },

  async createPayment(tariffId: string): Promise<Payment> {
    const response = await apiClient.post('/payments', { tariffId });
    return response.data.data;
  },

  async createPaymentWithEmail(data: CreatePaymentRequest): Promise<Payment> {
    const response = await apiClient.post('/payments/create', data);
    return response.data.data;
  },

  async getPaymentHistory(): Promise<Payment[]> {
    const response = await apiClient.get('/payments/history');
    return response.data.data;
  },
};
