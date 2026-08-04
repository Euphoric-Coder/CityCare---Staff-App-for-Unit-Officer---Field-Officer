export type PasswordResetErrorCode =
  | 'OTP_REQUEST_NOT_FOUND'
  | 'OTP_RATE_LIMITED'
  | 'OTP_RESEND_TOO_SOON'
  | 'OTP_DELIVERY_FAILED'
  | 'OTP_EXPIRED'
  | 'OTP_INCORRECT'
  | 'OTP_LOCKED'
  | 'RESET_SESSION_EXPIRED'
  | 'RESET_SESSION_INVALID'
  | 'UNKNOWN_PASSWORD_RESET_ERROR';

export type ParsedPasswordResetError = {
  code: PasswordResetErrorCode;
  message: string;
  expected: boolean;
};

export const extractConvexErrorCode = (error: unknown): string | null => {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: unknown }).data;

    if (
      data &&
      typeof data === 'object' &&
      'code' in data
    ) {
      const code = (data as { code?: unknown }).code;

      if (typeof code === 'string') {
        return code;
      }
    }
  }

  if (error instanceof Error) {
    const match = error.message.match(/"code"\s*:\s*"([^"]+)"/);

    return match?.[1] ?? null;
  }

  return null;
};

export const parsePasswordResetError = (error: unknown): ParsedPasswordResetError => {
  const code = extractConvexErrorCode(error);

  switch (code) {
    case 'OTP_REQUEST_NOT_FOUND':
      return {
        code: 'OTP_REQUEST_NOT_FOUND',
        message: 'No matching officer account was found. Check the email and role.',
        expected: true,
      };

    case 'OTP_RATE_LIMITED':
      return {
        code: 'OTP_RATE_LIMITED',
        message: 'Too many requests. Please try again later.',
        expected: true,
      };

    case 'OTP_RESEND_TOO_SOON':
      return {
        code: 'OTP_RESEND_TOO_SOON',
        message: 'Please wait before requesting another code.',
        expected: true,
      };

    case 'OTP_DELIVERY_FAILED':
      return {
        code: 'OTP_DELIVERY_FAILED',
        message: 'The verification code could not be sent. Please try again.',
        expected: false,
      };

    case 'OTP_EXPIRED':
      return {
        code: 'OTP_EXPIRED',
        message: 'The verification code has expired. Request a new code.',
        expected: true,
      };

    case 'OTP_INCORRECT':
      return {
        code: 'OTP_INCORRECT',
        message: 'The verification code is incorrect.',
        expected: true,
      };

    case 'OTP_LOCKED':
      return {
        code: 'OTP_LOCKED',
        message: 'Too many incorrect attempts. Request a new code.',
        expected: true,
      };

    case 'RESET_SESSION_EXPIRED':
      return {
        code: 'RESET_SESSION_EXPIRED',
        message: 'Your reset session has expired. Please start again.',
        expected: true,
      };

    case 'RESET_SESSION_INVALID':
      return {
        code: 'RESET_SESSION_INVALID',
        message: 'This reset session is no longer valid.',
        expected: true,
      };

    default:
      return {
        code: 'UNKNOWN_PASSWORD_RESET_ERROR',
        message: 'Unable to process the request. Please try again.',
        expected: false,
      };
  }
};
