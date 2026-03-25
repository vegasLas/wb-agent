import apiClient from './client';
import type { Coefficient } from '../types';

export const coefficientsAPI = {
  async fetchCoefficients(): Promise<Coefficient[]> {
    const response = await apiClient.get('/coefficients');
    return response.data.data;
  },
};
