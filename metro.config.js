// https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite's web build ships a .wasm file. The web bundle is needed because API routes
// (sign-in) are built as part of the web/server output.
config.resolver.assetExts.push('wasm');

module.exports = config;
