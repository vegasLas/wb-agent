import apiClient from './client';

export interface VerifyPhoneResponse {
  success: boolean;
  sessionId: string;
  message: string;
  requiresSMSCode: boolean;
}

export interface VerifySMSResponse {
  success: boolean;
  sessionId?: string;
  message: string;
  requiresTwoFactor?: boolean;
  supplierName?: string;
}

export interface VerifyTwoFactorResponse {
  success: boolean;
  message: string;
  supplierName?: string;
}

export interface CancelAuthResponse {
  success: boolean;
  message: string;
}

export const authAPI = {
  async verifyPhone(phoneNumber: string): Promise<VerifyPhoneResponse> {
    const response = await apiClient.post<VerifyPhoneResponse>(
      '/auth/verify-phone',
      {
        phoneNumber,
      },
    );
    return response.data;
  },

  async verifySMS(
    smsCode: string,
    sessionId: string,
  ): Promise<VerifySMSResponse> {
    const response = await apiClient.post<VerifySMSResponse>(
      '/auth/verify-sms',
      {
        smsCode,
        sessionId,
      },
    );
    return response.data;
  },

  async verifyTwoFactor(
    twoFactorCode: string,
    sessionId: string,
  ): Promise<VerifyTwoFactorResponse> {
    const response = await apiClient.post<VerifyTwoFactorResponse>(
      '/auth/verify-two-factor',
      {
        twoFactorCode,
        sessionId,
      },
    );
    return response.data;
  },

  async cancelAuth(sessionId: string): Promise<CancelAuthResponse> {
    const response = await apiClient.post<CancelAuthResponse>('/auth/cancel', {
      sessionId,
    });
    return response.data;
  },
};
