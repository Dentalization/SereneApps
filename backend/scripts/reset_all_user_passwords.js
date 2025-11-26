#!/usr/bin/env node
import 'dotenv/config';
import bcrypt from 'bcrypt';
import pkg from 'pg';

const { Pool } = pkg;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Please set DATABASE_URL before running this script.');
    process.exit(1);
  }

  const plainPassword = process.argv[2] || 'password123';
  const pool = new Pool({ connectionString });

  try {
    const { rows } = await pool.query('SELECT id, email FROM users');
    if (!rows.length) {
      console.log('No users found. Nothing to update.');
      await pool.end();
      return;
    }

    const hash = await bcrypt.hash(plainPassword, 10);

    const { rowCount } = await pool.query('UPDATE users SET password_hash = $1', [hash]);
    console.log(`Updated password for ${rowCount} user(s).`);

    console.log('\nSample accounts:');
    console.table(
      rows.slice(0, 10).map((u) => ({
        id: u.id,
        email: u.email,
        password: plainPassword,
      }))
    );
  } catch (err) {
    console.error('Failed to reset passwords:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
