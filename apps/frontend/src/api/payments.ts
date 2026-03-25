import apiClient from './client';
import type { Tariff, Payment } from '../types';

export const paymentsAPI = {
  async fetchTariffs(): Promise<Tariff[]> {
    const response = await apiClient.get('/payments/tariffs');
    return response.data.data;
  },

  async createPayment(tariffId: string): Promise<Payment> {
    const response = await apiClient.post('/payments', { tariffId });
    return response.data.data;
  },
};
