import apiClient from './client';
import { useWebApp } from 'vue-tg';

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

function getInitData(): string {
  const webApp = useWebApp();
  return webApp.initData.value || '';
}

export const authAPI = {
  async verifyPhone(phoneNumber: string): Promise<VerifyPhoneResponse> {
    const initData = getInitData();
    const response = await apiClient.post<VerifyPhoneResponse>('/auth/verify-phone', {
      phoneNumber,
    }, {
      headers: {
        'x-init-data': initData,
      },
    });
    return response.data;
  },

  async verifySMS(
    smsCode: string,
    sessionId: string,
  ): Promise<VerifySMSResponse> {
    const initData = getInitData();
    const response = await apiClient.post<VerifySMSResponse>('/auth/verify-sms', {
      smsCode,
      sessionId,
    }, {
      headers: {
        'x-init-data': initData,
      },
    });
    return response.data;
  },

  async verifyTwoFactor(
    twoFactorCode: string,
    sessionId: string,
  ): Promise<VerifyTwoFactorResponse> {
    const initData = getInitData();
    const response = await apiClient.post<VerifyTwoFactorResponse>(
      '/auth/verify-two-factor',
      {
        twoFactorCode,
        sessionId,
      },
      {
        headers: {
          'x-init-data': initData,
        },
      },
    );
    return response.data;
  },

  async cancelAuth(sessionId: string): Promise<CancelAuthResponse> {
    const initData = getInitData();
    const response = await apiClient.post<CancelAuthResponse>('/auth/cancel', {
      sessionId,
    }, {
      headers: {
        'x-init-data': initData,
      },
    });
    return response.data;
  },
};
