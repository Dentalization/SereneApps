// Twilio Conversations Shim for React Native / Metro
// Loads the UMD bundle and exports the correct properties to avoid Hermes CJS/ESM interop issues.

console.log('🧪 [Shim] Loading twilio-conversations.js...');

global.Twilio = global.Twilio || {};
console.log('🧪 [Shim] global.Twilio before load:', Object.keys(global.Twilio));

// Load pre-bundled UMD library without global saving/restoring
// Restoring globals after UMD load creates two Promise contexts in Hermes,
// causing infinite resolution loops (Maximum call stack size exceeded).
const mod = require('../../node_modules/@twilio/conversations/builds/twilio-conversations.js');

console.log('🧪 [Shim] mod keys:', Object.keys(mod || {}));
console.log('🧪 [Shim] global.Twilio after load:', Object.keys(global.Twilio || {}));
if (mod.Twilio) console.log('🧪 [Shim] mod.Twilio keys:', Object.keys(mod.Twilio));

const Conversations = global.Twilio.Conversations || mod.Twilio?.Conversations || mod;
console.log('🧪 [Shim] Conversations keys:', Object.keys(Conversations || {}));

module.exports = Conversations;

