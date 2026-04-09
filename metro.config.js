const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Expo SDK 53 + Metro can resolve some libraries to ESM builds that still contain
// import.meta on web (for example Zustand). Disabling package exports forces Metro
// to use the CommonJS entrypoints, which avoids the crash.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
