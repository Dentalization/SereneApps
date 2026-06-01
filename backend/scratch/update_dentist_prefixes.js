import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../src/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

async function run() {
  console.log('Updating dentist name prefixes in the database...');
  
  // Update names in users table for dentists and clinic owners
  const res = await query(`
    UPDATE users 
    SET name = REGEXP_REPLACE(name, '^[dD][rR]\\.\\s*', 'drg. ')
    WHERE (name ILIKE 'dr.%' OR name ILIKE 'dr %')
      AND (
        roles @> ARRAY['dentist'] 
        OR roles @> ARRAY['clinic_owner'] 
        OR id IN (SELECT user_id FROM dentist_profiles)
      )
    RETURNING id, name, email
  `);

  console.log(`Successfully updated ${res.rowCount} users.`);
  if (res.rows.length > 0) {
    console.log('\nSample updated users:');
    console.table(res.rows.slice(0, 10));
  }
}

run().catch(console.error);
