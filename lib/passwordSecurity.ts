export const PASSWORD_RESET_POLICY = {
  otpLifetimeMs: 10 * 60 * 1000,
  resendCooldownMs: 60 * 1000,
  maximumOtpAttempts: 5,
  resetSessionLifetimeMs: 10 * 60 * 1000,
  requestWindowMs: 15 * 60 * 1000,
  maximumRequestsPerWindow: 3,
  passwordChangeCooldownDays: 7,
} as const;

/**
 * Normalizes email address to lowercase and trimmed string.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Masks email address for privacy (e.g. o***r@citycare.dev).
 */
export function maskEmail(email: string): string {
  const normalized = normalizeEmail(email);
  const parts = normalized.split('@');
  if (parts.length !== 2) return email;

  const [name, domain] = parts;
  if (name.length <= 2) {
    return `${name[0]}*@${domain}`;
  }

  const firstChar = name[0];
  const lastChar = name[name.length - 1];
  const maskedMiddle = '*'.repeat(Math.min(name.length - 2, 4));

  return `${firstChar}${maskedMiddle}${lastChar}@${domain}`;
}

/**
 * Validates password strength requirements.
 */
export function validatePasswordStrength(password: string) {
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  return {
    hasMinLength,
    hasUpperCase,
    hasLowerCase,
    hasNumber,
    hasSpecialChar,
    isValid: hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar,
  };
}
