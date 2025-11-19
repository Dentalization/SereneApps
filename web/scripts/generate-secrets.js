#!/usr/bin/env node

/**
 * Generate secure JWT secrets for staging/production deployment
 * 
 * Usage:
 *   node scripts/generate-secrets.js
 */

import crypto from 'crypto';

console.log('\n🔐 Generating JWT Secrets for Deployment\n');
console.log('=' .repeat(60));

const accessSecret = crypto.randomBytes(32).toString('hex');
const refreshSecret = crypto.randomBytes(32).toString('hex');

console.log('\n✅ JWT Access Secret:');
console.log(accessSecret);

console.log('\n✅ JWT Refresh Secret:');
console.log(refreshSecret);

console.log('\n' + '=' .repeat(60));
console.log('\n📋 Copy these to Railway environment variables:');
console.log('\nJWT_ACCESS_SECRET=' + accessSecret);
console.log('JWT_REFRESH_SECRET=' + refreshSecret);

console.log('\n⚠️  IMPORTANT:');
console.log('- Do NOT use these secrets for production');
console.log('- Generate different secrets for each environment');
console.log('- Never commit secrets to git');
console.log('- Store secrets securely in Railway dashboard\n');
