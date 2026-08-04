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
 * Persists the current password recovery state to SecureStore.
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
 * Retrieves and validates the persisted password recovery state from SecureStore.
 */
export async function getPasswordRecoveryState(): Promise<PasswordRecoveryState | null> {
  try {
    const serialized = await SecureStore.getItemAsync(PASSWORD_RECOVERY_KEY);
    if (!serialized) return null;

    const parsed = JSON.parse(serialized);

    if (!parsed || typeof parsed !== 'object') {
      await clearPasswordRecoveryState();
      return null;
    }

    if (parsed.stage === 'otp_pending') {
      if (
        typeof parsed.requestId === 'string' &&
        typeof parsed.maskedDeliveryEmail === 'string' &&
        (parsed.officerRole === 'unit_officer' || parsed.officerRole === 'field_officer') &&
        typeof parsed.expiresAt === 'number' &&
        typeof parsed.resendAllowedAt === 'number'
      ) {
        return parsed as PasswordRecoveryState;
      }
    } else if (parsed.stage === 'otp_verified') {
      if (
        typeof parsed.resetSessionToken === 'string' &&
        typeof parsed.resetSessionExpiresAt === 'number'
      ) {
        return parsed as PasswordRecoveryState;
      }
    }

    await clearPasswordRecoveryState();
    return null;
  } catch (error) {
    console.error('Failed to read or parse password recovery state:', error);
    await clearPasswordRecoveryState();
    return null;
  }
}

/**
 * Clears the password recovery state from SecureStore.
 */
export async function clearPasswordRecoveryState(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(PASSWORD_RECOVERY_KEY);
  } catch (error) {
    console.error('Failed to clear password recovery state:', error);
  }
}
