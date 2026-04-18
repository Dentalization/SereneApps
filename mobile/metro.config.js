const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// 1. ENABLE package exports (standard in modern Expo). 
// This automatically fixes the Axios "crypto" crash by allowing it to find its RN bundle.
config.resolver.unstable_enablePackageExports = true;

// 2. Force @twilio/conversations to React Native entry.
// The package "main" points to builds/lib.js (Node-oriented), which imports
// xmlhttprequest -> url/fs/child_process and breaks Metro on iOS/Android.
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === '@twilio/conversations' ||
    moduleName === '@twilio/conversations/builds/lib.js' ||
    moduleName === '@twilio/conversations/dist/index.js'
  ) {
    const twilioEntry =
      platform === 'web'
        ? 'node_modules/@twilio/conversations/builds/browser.js'
        : 'node_modules/@twilio/conversations/builds/browser.esm.js';

    return {
      filePath: path.resolve(__dirname, twilioEntry),
      type: 'sourceFile',
    };
  }

  // Fallback: if any Twilio sub-dependency tries to load the Node xmlhttprequest
  // package, force it to use RN's global XMLHttpRequest implementation.
  if (
    moduleName === 'xmlhttprequest' ||
    moduleName === 'xmlhttprequest/lib/XMLHttpRequest.js'
  ) {
    return {
      filePath: path.resolve(__dirname, 'src/shims/xmlhttprequest.js'),
      type: 'sourceFile',
    };
  }
  
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
