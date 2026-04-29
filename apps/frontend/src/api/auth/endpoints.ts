import apiClient from '../client';
import { AuthAPIError, normalizeAuthError } from './errors';

// ------------------------------------------------------------------
// Success payload types
// ------------------------------------------------------------------

export interface LoginSuccess {
  success: true;
  user: {
    id: number;
    name: string;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RegisterSuccess {
  success: true;
  message: string;
  userId: number;
}

export interface VerifyEmailSuccess {
  success: true;
  message: string;
}

export interface ResendVerificationSuccess {
  success: true;
  message: string;
}

export interface ForgotPasswordSuccess {
  success: true;
  message: string;
}

export interface ResetPasswordSuccess {
  success: true;
  message: string;
}

export interface RefreshSuccess {
  success: true;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: number;
    name?: string;
  };
}

export interface LogoutSuccess {
  success: true;
  message: string;
}

// ------------------------------------------------------------------
// Helper
// ------------------------------------------------------------------

function wrap<T>(promise: Promise<{ data: T }>): Promise<T> {
  return promise
    .then((res) => res.data)
    .catch((err: unknown) => {
      const normalized = normalizeAuthError(err);
      if (normalized) throw normalized;
      throw new AuthAPIError(
        500,
        'Неизвестная ошибка',
        'INTERNAL_ERROR',
      );
    });
}

// ------------------------------------------------------------------
// Endpoints
// ------------------------------------------------------------------

export async function login(email: string, password: string): Promise<LoginSuccess> {
  return wrap(apiClient.post<LoginSuccess>('/auth/email-login', { email, password }));
}

export async function register(payload: {
  name: string;
  email: string;
  password: string;
  telegramCode?: string;
}): Promise<RegisterSuccess> {
  return wrap(apiClient.post<RegisterSuccess>('/auth/register', payload));
}

export async function verifyEmail(token: string): Promise<VerifyEmailSuccess> {
  return wrap(apiClient.post<VerifyEmailSuccess>('/auth/verify-email', { token }));
}

export async function resendVerification(email: string): Promise<ResendVerificationSuccess> {
  return wrap(apiClient.post<ResendVerificationSuccess>('/auth/resend-verification', { email }));
}

export async function forgotPassword(email: string): Promise<ForgotPasswordSuccess> {
  return wrap(apiClient.post<ForgotPasswordSuccess>('/auth/forgot-password', { email }));
}

export async function resetPassword(token: string, password: string): Promise<ResetPasswordSuccess> {
  return wrap(apiClient.post<ResetPasswordSuccess>('/auth/reset-password', { token, password }));
}

export async function refresh(refreshToken: string): Promise<RefreshSuccess> {
  return wrap(apiClient.post<RefreshSuccess>('/auth/refresh', { refreshToken }));
}

export async function logout(refreshToken?: string, allDevices = false): Promise<LogoutSuccess> {
  return wrap(apiClient.post<LogoutSuccess>('/auth/logout', { refreshToken, allDevices }));
}
