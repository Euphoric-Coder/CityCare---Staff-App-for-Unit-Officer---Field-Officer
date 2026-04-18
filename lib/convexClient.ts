import { ConvexHttpClient } from 'convex/browser';
import { User } from './auth';
import { api } from 'convex/_generated/api';

// IMPORTANT: Replace this with your actual Convex deployment URL
// Get this from: https://dashboard.convex.dev/
const CONVEX_URL = process.env.EXPO_PUBLIC_CONVEX_URL || 'https://your-deployment.convex.cloud';

// Initialize Convex HTTP client
const convex = new ConvexHttpClient(CONVEX_URL);

export interface LoginCredentials {
  email: string;
  password: string;
  role?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

/**
 * Verify user credentials via Convex backend
 * @param credentials - User email and password
 * @returns Authentication response with token and user data
 */
export async function verifyUser(credentials: LoginCredentials): Promise<any> {
  try {
    // @ts-ignore
    const result = await convex.action(api.auth.verifyUser, {
      email: credentials.email,
      password: credentials.password,
      role: credentials.role,
    });

    return result;
  } catch (error) {
    console.error('Convex error:', error);

    return {
      success: false,
      error: 'Something went wrong. Try again.',
    };
  }
}

// Fetch unit officer details by user ID
export async function getUnitOfficerByUserId(userId: string) {
  try {
    // @ts-ignore
    const officer = await convex.query(api.unitOfficers.getUnitOfficerByUserId, { userId });

    return officer;
  } catch (error) {
    console.error('Error fetching unit officer:', error);
    return null;
  }
}


/**
 * Mock authentication for testing purposes
 * Remove this and use verifyUser() once Convex backend is set up
 */
export async function mockVerifyUser(credentials: LoginCredentials): Promise<AuthResponse> {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  if (credentials.email === 'unit@citycare.com' && credentials.password === 'officer123') {
    return {
      token: 'mock-jwt-token-' + Date.now(),
      user: {
        id: 'U001',
        name: 'Officer Sarah Johnson',
        email: credentials.email,
        role: credentials.role || 'Unit Officer',
      },
    };
  }

  if (credentials.email === 'field@citycare.com' && credentials.password === 'officer123') {
    return {
      token: 'mock-jwt-token-' + Date.now(),
      user: {
        id: 'F001',
        name: 'Officer Michael Chen',
        email: credentials.email,
        role: credentials.role || 'Field Officer',
      },
    };
  }

  throw new Error('Invalid email or password');
}

export default convex;
