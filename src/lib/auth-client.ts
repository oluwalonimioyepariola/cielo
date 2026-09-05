import { expoClient } from '@better-auth/expo/client';
import { createAuthClient } from 'better-auth/react';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

/**
 * Where Cielo's API runs. Set EXPO_PUBLIC_API_URL for a deployed server; during development it's
 * the Expo dev server the app was loaded from (the same machine, reachable from the phone).
 */
export function apiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  const host = Constants.expoConfig?.hostUri;
  return host ? `http://${host}` : 'http://localhost:8081';
}

export const authClient = createAuthClient({
  baseURL: apiBaseUrl(),
  plugins: [
    expoClient({
      scheme: 'cielo',
      storagePrefix: 'cielo',
      // The session is kept in the phone's secure keychain, not in plain storage.
      storage: SecureStore,
    }),
  ],
});

export type AuthStatus = { database: boolean; google: boolean; apple: boolean };

/** Which sign-in methods the server has set up, or null if it can't be reached. */
export async function fetchAuthStatus(): Promise<AuthStatus | null> {
  try {
    const response = await fetch(`${apiBaseUrl()}/api/status`);
    return response.ok ? ((await response.json()) as AuthStatus) : null;
  } catch {
    return null;
  }
}
