// https://docs.expo.dev/guides/customizing-metro/
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite's web build ships a .wasm file. The web bundle is needed because API routes
// (sign-in) are built as part of the web/server output.
config.resolver.assetExts.push('wasm');

// The marketing site in website/ is a separate Next.js project; keep it out of the app bundle.
const website = path.join(__dirname, 'website').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
config.resolver.blockList = [...[config.resolver.blockList ?? []].flat(), new RegExp(`^${website}[/\\\\].*`)];

module.exports = config;
