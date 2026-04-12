import apiClient from '../client';
import type {
  VerifyPhoneResponse,
  VerifySMSResponse,
  VerifyTwoFactorResponse,
  CancelAuthResponse,
} from './types';

export const authAPI = {
  /**
   * POST /api/v1/auth/verify-phone
   * Start phone verification process
   */
  async verifyPhone(phoneNumber: string): Promise<VerifyPhoneResponse> {
    const response = await apiClient.post<VerifyPhoneResponse>(
      '/auth/verify-phone',
      { phoneNumber },
    );
    return response.data;
  },

  /**
   * POST /api/v1/auth/verify-sms
   * Verify SMS code
   */
  async verifySMS(
    smsCode: string,
    sessionId: string,
  ): Promise<VerifySMSResponse> {
    const response = await apiClient.post<VerifySMSResponse>(
      '/auth/verify-sms',
      { smsCode, sessionId },
    );
    return response.data;
  },

  /**
   * POST /api/v1/auth/verify-two-factor
   * Verify two-factor authentication code
   */
  async verifyTwoFactor(
    twoFactorCode: string,
    sessionId: string,
  ): Promise<VerifyTwoFactorResponse> {
    const response = await apiClient.post<VerifyTwoFactorResponse>(
      '/auth/verify-two-factor',
      { twoFactorCode, sessionId },
    );
    return response.data;
  },

  /**
   * POST /api/v1/auth/cancel
   * Cancel authentication session
   */
  async cancelAuth(sessionId: string): Promise<CancelAuthResponse> {
    const response = await apiClient.post<CancelAuthResponse>('/auth/cancel', {
      sessionId,
    });
    return response.data;
  },
};
