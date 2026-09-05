import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';

import { authClient } from './auth-client';

export type SignInResult = { ok: true } | { ok: false; cancelled?: boolean; message: string };

const failed = (message: string): SignInResult => ({ ok: false, message });

/**
 * Sign in with Apple. On iPhone this is the native Apple sheet; the identity token it returns is
 * verified by our server. Elsewhere it falls back to Apple's web sign-in.
 */
export async function signInWithApple(): Promise<SignInResult> {
  try {
    if (Platform.OS === 'ios' && (await AppleAuthentication.isAvailableAsync())) {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      });
      if (!credential.identityToken) return failed("Apple didn't confirm the sign-in. Please try again.");
      const { error } = await authClient.signIn.social({
        provider: 'apple',
        idToken: { token: credential.identityToken },
      });
      return error ? failed(error.message ?? 'Sign in with Apple failed.') : { ok: true };
    }
    const { error } = await authClient.signIn.social({ provider: 'apple', callbackURL: '/import' });
    return error ? failed(error.message ?? 'Sign in with Apple failed.') : { ok: true };
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') {
      return { ok: false, cancelled: true, message: '' };
    }
    return failed('Sign in with Apple failed. Please try again.');
  }
}

/** Sign in with Google through Google's own sign-in page, opened in a secure in-app browser. */
export async function signInWithGoogle(): Promise<SignInResult> {
  try {
    const { error } = await authClient.signIn.social({ provider: 'google', callbackURL: '/import' });
    return error ? failed(error.message ?? 'Sign in with Google failed.') : { ok: true };
  } catch {
    return failed('Sign in with Google failed. Please try again.');
  }
}
