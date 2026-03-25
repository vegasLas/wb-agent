import apiClient from './client';
import type { User } from '../types';

export const userAPI = {
  async fetchUser(): Promise<User> {
    const response = await apiClient.get('/user');
    return response.data.data;
  },

  async logout(): Promise<{ success: boolean }> {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },

  async agreeToTerms(): Promise<{ success: boolean }> {
    const response = await apiClient.post('/user/agree-terms');
    return response.data;
  },
};
