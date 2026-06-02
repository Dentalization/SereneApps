// Twilio Conversations Shim for React Native / Metro
// Loads the UMD bundle and exports the correct properties to avoid Hermes CJS/ESM interop issues.
// Isolates native globals to prevent core-js polyfill conflicts.

console.log('🧪 [Shim] Loading twilio-conversations.js...');

// 1. Preserve original React Native/Hermes globals
const originalGlobals = {
  Promise: global.Promise,
  Map: global.Map,
  Set: global.Set,
  WeakMap: global.WeakMap,
  WeakSet: global.WeakSet,
  Symbol: global.Symbol,
  Reflect: global.Reflect,
};

global.Twilio = global.Twilio || {};
console.log('🧪 [Shim] global.Twilio before load:', Object.keys(global.Twilio));

// 2. Load pre-bundled UMD library
const mod = require('../../node_modules/@twilio/conversations/builds/twilio-conversations.js');

console.log('🧪 [Shim] mod keys:', Object.keys(mod || {}));
console.log('🧪 [Shim] global.Twilio after load:', Object.keys(global.Twilio || {}));
if (mod.Twilio) console.log('🧪 [Shim] mod.Twilio keys:', Object.keys(mod.Twilio));

// 3. Restore original React Native/Hermes globals to prevent pollution
Object.keys(originalGlobals).forEach((key) => {
  if (originalGlobals[key] !== undefined) {
    global[key] = originalGlobals[key];
  }
});

const Conversations = global.Twilio.Conversations || mod.Twilio?.Conversations || mod;
console.log('🧪 [Shim] Conversations keys:', Object.keys(Conversations || {}));

module.exports = Conversations;
module.exports.default = Conversations;
