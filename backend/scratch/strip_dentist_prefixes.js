import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../src/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

async function run() {
  console.log('Cleaning up dentist and clinic owner names in the database...');
  
  const res = await query(`
    UPDATE users 
    SET name = REGEXP_REPLACE(name, '^(drg\\.\\s*|dr\\.\\s*|drg\\s+|dr\\s+)+', '', 'i')
    WHERE (
      roles @> ARRAY['dentist'] 
      OR roles @> ARRAY['clinic_owner'] 
      OR id IN (SELECT user_id FROM dentist_profiles)
    )
    RETURNING id, name, email
  `);

  console.log(`Successfully cleaned up ${res.rowCount} users.`);
  if (res.rows.length > 0) {
    console.log('\nSample updated users:');
    console.table(res.rows.slice(0, 10));
  }
}

run().catch(console.error);
