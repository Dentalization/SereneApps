import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../src/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

async function run() {
  const tables = [
    'users',
    'clinic_profiles',
    'clinic_branches',
    'clinic_staff',
    'dentist_profiles',
    'patient_profiles',
    'appointments',
    'available_balances',
    'clinic_services',
    'dentist_services',
    'service_dentist_assignments'
  ];

  console.log('Database table row counts:');
  for (const table of tables) {
    try {
      const res = await query(`SELECT COUNT(*) as count FROM "${table}"`);
      console.log(`- ${table}: ${res.rows[0].count}`);
    } catch (err) {
      console.log(`- ${table}: ERROR (${err.message})`);
    }
  }
}

run().catch(console.error);
