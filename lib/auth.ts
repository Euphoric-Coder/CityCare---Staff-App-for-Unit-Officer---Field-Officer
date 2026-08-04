import * as SecureStore from 'expo-secure-store';

export const AUTH_TOKEN_KEY = 'citycare_auth_token';
export const USER_DATA_KEY = 'citycare_user_data';

export type OfficerRole = 'unit_officer' | 'field_officer';

export type User = {
  id: string;
  name: string;
  email: string;
  role: OfficerRole;
  mustChangePassword: boolean;
  officerProfileId?: string;
};

/**
 * Normalizes any server or legacy user object into the canonical client User schema
 */
export const normalizeAuthenticatedUser = (result: any): User => {
  const source = result?.user ?? result;

  const rawId = source?.id ?? source?._id ?? result?.userId;
  const rawName = source?.name ?? source?.fullName ?? source?.email?.split('@')[0] ?? 'Officer';
  const rawRole = source?.role;
  const email = source?.email ?? '';

  let normalizedRole: OfficerRole = 'unit_officer';
  if (typeof rawRole === 'string') {
    const lower = rawRole.toLowerCase().trim().replace(/\s+/g, '_');
    if (lower === 'field_officer') {
      normalizedRole = 'field_officer';
    } else {
      normalizedRole = 'unit_officer';
    }
  }

  const id = typeof rawId === 'string' ? rawId : String(rawId || '');

  if (!id || !email) {
    throw new Error('The sign-in response did not contain a valid officer account.');
  }

  return {
    id,
    name: typeof rawName === 'string' ? rawName : 'Officer',
    email,
    role: normalizedRole,
    mustChangePassword: source?.mustChangePassword === true,
    officerProfileId: source?.officerProfileId ?? result?.officerProfileId,
  };
};

/**
 * Save authentication token securely
 */
export async function saveToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
  } catch (error) {
    console.error('Error saving token:', error);
    throw new Error('Failed to save authentication token');
  }
}

/**
 * Retrieve authentication token from secure storage
 */
export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
}

/**
 * Remove authentication token and user data from secure storage
 */
export async function removeToken(): Promise<void> {
  await clearAuthData();
}

/**
 * Clears stored authentication credentials with error reporting
 */
export const clearAuthData = async (): Promise<void> => {
  const keys = [AUTH_TOKEN_KEY, USER_DATA_KEY];

  const results = await Promise.allSettled(
    keys.map((key) => SecureStore.deleteItemAsync(key))
  );

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.warn(
        `Unable to delete authentication key: ${keys[index]}`,
        result.reason
      );
    }
  });
};

/**
 * Save user data securely
 */
export async function saveUserData(user: User): Promise<void> {
  try {
    await SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Error saving user data:', error);
    throw new Error('Failed to save user data');
  }
}

/**
 * Retrieve user data from secure storage with safe schema validation and migration
 */
export async function getUserData(): Promise<User | null> {
  const raw = await SecureStore.getItemAsync(USER_DATA_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);

    const id = parsed.id ?? parsed._id ?? parsed.userId;
    const name = parsed.name ?? parsed.fullName;
    const rawRole = parsed.role;

    let role: OfficerRole = 'unit_officer';
    if (typeof rawRole === 'string') {
      const lower = rawRole.toLowerCase().trim().replace(/\s+/g, '_');
      if (lower === 'field_officer') {
        role = 'field_officer';
      }
    }

    if (
      typeof id !== 'string' ||
      !id ||
      typeof name !== 'string' ||
      typeof parsed.email !== 'string'
    ) {
      throw new Error('Invalid saved officer data');
    }

    const normalized: User = {
      id,
      name,
      email: parsed.email,
      role,
      mustChangePassword: parsed.mustChangePassword === true,
      officerProfileId: parsed.officerProfileId,
    };

    return normalized;
  } catch (error) {
    console.error('Unable to restore saved officer:', error);
    await SecureStore.deleteItemAsync(USER_DATA_KEY);
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken();
  return token !== null;
}
