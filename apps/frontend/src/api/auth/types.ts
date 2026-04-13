export interface VerifyPhoneRequest {
  phoneNumber: string;
}

export interface VerifyPhoneResponse {
  success: boolean;
  sessionId: string;
  message: string;
  requiresSMSCode: boolean;
}

export interface VerifySMSRequest {
  smsCode: string;
  sessionId: string;
}

export interface VerifySMSResponse {
  success: boolean;
  sessionId?: string;
  message: string;
  requiresTwoFactor?: boolean;
  supplierName?: string;
}

export interface VerifyTwoFactorRequest {
  twoFactorCode: string;
  sessionId: string;
}

export interface VerifyTwoFactorResponse {
  success: boolean;
  message: string;
  supplierName?: string;
}

export interface CancelAuthRequest {
  sessionId: string;
}

export interface CancelAuthResponse {
  success: boolean;
  message: string;
}
