import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getClient } from '../src/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

async function run() {
  const seedFile = path.join(__dirname, '..', 'seeds', 'comprehensive_clinic_seed.sql');
  const sql = fs.readFileSync(seedFile, 'utf8');

  const client = await getClient();
  try {
    console.log('Starting transaction for dry run...');
    await client.query('BEGIN');

    console.log('Truncating tables to simulate fresh database...');
    await client.query('TRUNCATE TABLE users, clinic_profiles, clinic_branches, clinic_staff, dentist_profiles, patient_profiles, appointments, available_balances, clinic_services, dentist_services, service_dentist_assignments, appointment_status_history CASCADE');

    console.log('Executing seed SQL...');
    await client.query(sql);

    console.log('Seed executed successfully without any errors! Rolling back transaction...');
  } catch (err) {
    console.error('Seed failed during dry run!');
    console.error('Error Message:', err.message);
    console.error('Error Details:', err);
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
}

run().catch(console.error);
