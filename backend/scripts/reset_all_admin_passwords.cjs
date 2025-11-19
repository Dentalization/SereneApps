#!/usr/bin/env node
// Reset password to 'admin123' for all users who have 'admin' in their roles array
// Usage: DATABASE_URL=postgres://user:pass@host:port/db node scripts/reset_all_admin_passwords.cjs

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
    // Find users with 'admin' in roles
    const { rows: adminUsers } = await pool.query("SELECT id, email, roles FROM users WHERE roles @> ARRAY['admin']::text[]");
    if (adminUsers.length === 0) {
      console.log('No admin users found');
      await pool.end();
      return;
    }

    const plain = 'admin123';
    const hash = await bcrypt.hash(plain, 10);

    const results = [];
    for (const u of adminUsers) {
      try {
        await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, u.id]);
        const { rows } = await pool.query('SELECT password_hash FROM users WHERE id=$1', [u.id]);
        const ok = await bcrypt.compare(plain, rows[0].password_hash);
        results.push({ email: u.email, updated: ok });
      } catch (e) {
        results.push({ email: u.email, updated: false, error: e.message });
      }
    }

    console.table(results);
    await pool.end();
  } catch (e) {
    console.error('Error:', e);
    await pool.end();
    process.exit(1);
  }
})();
