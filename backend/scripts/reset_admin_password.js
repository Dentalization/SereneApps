#!/usr/bin/env node
// Reset admin password to 'admin123' using Node, bcrypt, and pg (parameterized queries)
// Run with: DATABASE_URL=postgres://user:pass@host:port/db node scripts/reset_admin_password.js

const { Pool } = require('pg');
const bcrypt = require('bcrypt');

(async () => {
  try {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.error('Please set DATABASE_URL environment variable. Example:\nDATABASE_URL=postgres://serene:serene@localhost:5432/serene');
      process.exit(1);
    }

    const pool = new Pool({ connectionString });
    const email = 'admin@sereneai.com';
    const plain = 'admin123';

    console.log('Hashing password...');
    const hash = await bcrypt.hash(plain, 10);

    console.log('Updating user password for', email);
    const updateRes = await pool.query('UPDATE users SET password_hash=$1 WHERE email=$2 RETURNING id, email', [hash, email]);
    if (updateRes.rowCount === 0) {
      console.error('No user updated - user may not exist');
      await pool.end();
      process.exit(2);
    }

    const { rows } = await pool.query('SELECT password_hash FROM users WHERE email=$1', [email]);
    const stored = rows[0].password_hash;

    const ok = await bcrypt.compare(plain, stored);
    console.log('Password compare result:', ok);

    await pool.end();
    process.exit(ok ? 0 : 3);
  } catch (e) {
    console.error('Error:', e);
    process.exit(4);
  }
})();
