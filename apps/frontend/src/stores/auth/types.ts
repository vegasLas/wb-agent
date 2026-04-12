export type AuthStep =
  | 'idle'
  | 'phone'
  | 'sms'
  | 'two_factor'
  | 'completed'
  | 'error';

export interface AuthState {
  sessionId: string | null;
  step: AuthStep;
  loading: boolean;
  error: string | null;
  phoneNumber: string;
  smsCode: string;
  twoFactorCode: string;
  supplierName: string | undefined;
}
