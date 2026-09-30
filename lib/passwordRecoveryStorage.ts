import * as SecureStore from 'expo-secure-store';

const PASSWORD_RECOVERY_KEY = 'citycare_password_recovery';

export type PasswordRecoveryState =
  | {
      stage: 'otp_pending';
      requestId: string;
      maskedDeliveryEmail: string;
      officerRole: 'unit_officer' | 'field_officer';
      expiresAt: number;
      resendAllowedAt: number;
    }
  | {
      stage: 'otp_verified';
      resetSessionToken: string;
      resetSessionExpiresAt: number;
    };

/**
 * Validates a persisted password recovery object.
 */
function isValidPasswordRecoveryState(value: unknown): value is PasswordRecoveryState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const parsed = value as Record<string, unknown>;

  if (parsed.stage === 'otp_pending') {
    return (
      typeof parsed.requestId === 'string' &&
      typeof parsed.maskedDeliveryEmail === 'string' &&
      (parsed.officerRole === 'unit_officer' || parsed.officerRole === 'field_officer') &&
      typeof parsed.expiresAt === 'number' &&
      Number.isFinite(parsed.expiresAt) &&
      typeof parsed.resendAllowedAt === 'number' &&
      Number.isFinite(parsed.resendAllowedAt)
    );
  }

  if (parsed.stage === 'otp_verified') {
    return (
      typeof parsed.resetSessionToken === 'string' &&
      typeof parsed.resetSessionExpiresAt === 'number' &&
      Number.isFinite(parsed.resetSessionExpiresAt)
    );
  }

  return false;
}

/**
 * Persists the current password recovery state securely
 * on the mobile device.
 */
export async function savePasswordRecoveryState(state: PasswordRecoveryState): Promise<void> {
  try {
    const serialized = JSON.stringify(state);

    await SecureStore.setItemAsync(PASSWORD_RECOVERY_KEY, serialized);
  } catch (error) {
    console.error('Failed to save password recovery state:', error);
  }
}

/**
 * Retrieves and validates the persisted password recovery state.
 */
export async function getPasswordRecoveryState(): Promise<PasswordRecoveryState | null> {
  try {
    const serialized = await SecureStore.getItemAsync(PASSWORD_RECOVERY_KEY);

    if (!serialized) {
      return null;
    }

    const parsed: unknown = JSON.parse(serialized);

    if (!isValidPasswordRecoveryState(parsed)) {
      await clearPasswordRecoveryState();
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('Failed to read or parse password recovery state:', error);

    await clearPasswordRecoveryState();

    return null;
  }
}

/**
 * Clears the currently persisted password recovery state.
 */
export async function clearPasswordRecoveryState(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(PASSWORD_RECOVERY_KEY);
  } catch (error) {
    console.error('Failed to clear password recovery state:', error);
  }
}
