import { expo } from '@better-auth/expo';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';

import { prisma } from './db';

// Server only. Each sign-in method switches on once its keys are in .env (see .env.example).
const env = process.env;

const google =
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }
    : null;

const apple =
  env.APPLE_CLIENT_ID && env.APPLE_CLIENT_SECRET
    ? {
        clientId: env.APPLE_CLIENT_ID,
        clientSecret: env.APPLE_CLIENT_SECRET,
        // Native iOS sign-in sends tokens issued to the app itself, not the web Service ID.
        appBundleIdentifier: env.APPLE_APP_BUNDLE_IDENTIFIER,
      }
    : null;

export const providers = { google: Boolean(google), apple: Boolean(apple) };

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  plugins: [expo()],
  socialProviders: {
    ...(google ? { google } : {}),
    ...(apple ? { apple } : {}),
  },
  trustedOrigins: [
    'cielo://',
    'https://appleid.apple.com',
    // Expo Go and the dev server during development.
    ...(env.NODE_ENV === 'development' ? ['exp://', 'exp://**', 'exp://192.168.*.*:*/**'] : []),
  ],
});
