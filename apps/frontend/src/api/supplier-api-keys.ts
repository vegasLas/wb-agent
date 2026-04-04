import apiClient from './client';

export interface ApiKeyStatus {
  success: boolean;
  hasApiKey: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateApiKeyResponse {
  success: boolean;
  message: string;
  data: {
    isExistAPIKey: boolean;
    isActive?: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

export interface UpdateApiKeyResponse {
  success: boolean;
  message: string;
  isActive: boolean;
}

export const supplierApiKeysAPI = {
  /**
   * GET /api/v1/supplier-api-keys
   * Get user's API key info
   */
  async getApiKeyStatus(): Promise<ApiKeyStatus> {
    const response = await apiClient.get<ApiKeyStatus>('/supplier-api-keys');
    return response.data;
  },

  /**
   * POST /api/v1/supplier-api-keys
   * Create or update API key
   */
  async createOrUpdateApiKey(apiKey: string): Promise<CreateApiKeyResponse> {
    const response = await apiClient.post<CreateApiKeyResponse>(
      '/supplier-api-keys',
      { apiKey },
    );
    return response.data;
  },

  /**
   * DELETE /api/v1/supplier-api-keys
   * Delete API key
   */
  async deleteApiKey(): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<{
      success: boolean;
      message: string;
    }>('/supplier-api-keys');
    return response.data;
  },
};
