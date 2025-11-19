#!/usr/bin/env node
// Check admin users' password_hash against candidate passwords
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

(async () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Please set DATABASE_URL environment variable');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  try {
    const res = await pool.query("SELECT email, password_hash FROM users WHERE roles @> ARRAY['admin']::text[] ORDER BY email");
    if (res.rows.length === 0) {
      console.log('No admin users found');
      await pool.end();
      return;
    }

    for (const r of res.rows) {
      console.log('---', r.email);
      if (!r.password_hash) {
        console.log(' password_hash: NULL');
        continue;
      }
      const okAdmin = await bcrypt.compare('admin123', r.password_hash);
      const okPassword = await bcrypt.compare('password123', r.password_hash);
      console.log(' matches admin123:', okAdmin, ' matches password123:', okPassword);
    }
  } catch (e) {
    console.error('DB error', e);
  } finally {
    await pool.end();
  }
})();
