console.log('🧪 [Shim] Loading browser.js...');

const mod = require('@twilio/conversations/builds/browser.js');

console.log('🧪 typeof mod =', typeof mod);
console.log('🧪 mod keys =', Object.keys(mod || {}));

let Client = null;

if (typeof mod === 'function') {
  Client = mod;
}
else if (typeof mod?.Client === 'function') {
  Client = mod.Client;
}
else if (typeof mod?.default === 'function') {
  Client = mod.default;
}
else if (typeof mod?.default?.Client === 'function') {
  Client = mod.default.Client;
}

console.log('🧪 Client type =', typeof Client);

module.exports = Client;