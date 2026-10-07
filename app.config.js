const { withEntitlementsPlist } = require('expo/config-plugins');

// Expo reads app.json first and passes it here as `config`.
//
// CIELO_PERSONAL_BUILD=1 makes an iPhone build that a free Apple ID (an Xcode "personal team") can
// sign: free accounts can't use the Sign in with Apple capability, so it's left out. Sign-in is
// switched off in the app for now anyway (SIGN_IN_ENABLED in src/app/(onboarding)/sign-in.tsx).
module.exports = ({ config }) => {
  if (process.env.CIELO_PERSONAL_BUILD !== '1') return config;

  const personal = {
    ...config,
    ios: { ...config.ios, usesAppleSignIn: false },
    plugins: config.plugins.filter((plugin) => plugin !== 'expo-apple-authentication'),
  };
  // Expo also applies expo-apple-authentication's plugin automatically because the package is
  // installed, and that plugin adds the entitlement. Remove it from the final entitlements.
  return withEntitlementsPlist(personal, (mod) => {
    delete mod.modResults['com.apple.developer.applesignin'];
    return mod;
  });
};
