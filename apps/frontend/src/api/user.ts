import apiClient from './client';
import type { User } from '../types';

export interface UserResponse extends User {}

export interface UpdateUserResponse {
  success: boolean;
}

export const userAPI = {
  /**
   * GET /api/v1/user
   * Get current user data
   */
  async fetchUser(): Promise<User> {
    const response = await apiClient.get<UserResponse>('/user');
    return response.data;
  },

  /**
   * POST /api/v1/user/update
   * Update user data (agreeTerms or selectedAccountId)
   */
  async agreeToTerms(): Promise<UpdateUserResponse> {
    const response = await apiClient.post<UpdateUserResponse>('/user/update', { agreeTerms: true });
    return response.data;
  },

  /**
   * POST /api/v1/user/update
   * Update selected account
   */
  async updateSelectedAccount(accountId: string): Promise<UpdateUserResponse> {
    const response = await apiClient.post<UpdateUserResponse>('/user/update', { selectedAccountId: accountId });
    return response.data;
  },

  /**
   * POST /api/v1/auth/logout
   * Logout user (all accounts or specific account)
   */
  async logout(accountId?: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>('/auth/logout', { accountId });
    return response.data;
  },
};
