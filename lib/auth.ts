import * as SecureStore from 'expo-secure-store';

const AUTH_TOKEN_KEY = 'citycare_auth_token';
const USER_DATA_KEY = 'citycare_user_data';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

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
 * Remove authentication token from secure storage
 */
export async function removeToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_DATA_KEY);
  } catch (error) {
    console.error('Error removing token:', error);
    throw new Error('Failed to remove authentication token');
  }
}

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
 * Retrieve user data from secure storage
 */
export async function getUserData(): Promise<User | null> {
  try {
    const userData = await SecureStore.getItemAsync(USER_DATA_KEY);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error getting user data:', error);
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
