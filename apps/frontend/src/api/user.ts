import apiClient from './client';
import type { User } from '../types';

export const userAPI = {
  async fetchUser(): Promise<User> {
    const response = await apiClient.get('/user');
    // Backend returns user data directly, not wrapped in data property
    return response.data;
  },

  async logout(): Promise<{ success: boolean }> {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },

  async agreeToTerms(): Promise<{ success: boolean }> {
    const response = await apiClient.post('/user/update', { agreeTerms: true });
    return response.data;
  },

  async updateSelectedAccount(accountId: string): Promise<{ success: boolean }> {
    const response = await apiClient.post('/user/update', { selectedAccountId: accountId });
    return response.data;
  },
};
