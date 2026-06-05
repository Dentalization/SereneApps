// Twilio Conversations Shim for React Native / Metro
// Loads the browser bundle directly to avoid ESM/CJS interop issues and prevent core-js global pollution.

const Conversations = require('@twilio/conversations/builds/browser.js');

module.exports = Conversations;