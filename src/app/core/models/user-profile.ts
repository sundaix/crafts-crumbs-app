export type UserRole = 'customer' | 'admin' | 'rider';

/* users/{uid}. Register always writes role:'customer'. */
export interface UserProfile {
  email: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  createdAt?: string;
  otpVerified: boolean;
  disabled?: boolean;
}

/* What AuthService resolves from the users/{uid} doc.
   unknown:true = could not be confirmed (no cache + all retries failed). */
export interface UserRecord {
  role: UserRole;
  otpVerified: boolean;
  disabled: boolean;
  unknown?: boolean;
}

export type OtpFailReason =
  | 'not-signed-in' | 'no-record' | 'no-code' | 'expired' | 'too-many-attempts' | 'incorrect';

export interface OtpResult {
  ok: boolean;
  reason?: OtpFailReason;
  attemptsLeft?: number;
}
