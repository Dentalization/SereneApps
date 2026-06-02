const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// 1. DISABLE package exports (to prevent CJS/ESM interop crashes on Hermers)
config.resolver.unstable_enablePackageExports = false;

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Force @twilio/conversations to dist/index.js which is free of core-js polyfills
  if (
    moduleName === '@twilio/conversations' ||
    moduleName === '@twilio/conversations/builds/lib.js' ||
    moduleName === '@twilio/conversations/builds/browser.js'
  ) {
    return {
      filePath: path.resolve(__dirname, 'src/shims/twilio-conversations-shim.js'),
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

  // Fix axios "crypto" crash without needing unstable_enablePackageExports.
  if (moduleName === 'axios') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/axios/dist/browser/axios.cjs'),
      type: 'sourceFile',
    };
  }
  
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
