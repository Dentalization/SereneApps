import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../src/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

async function run() {
  console.log('Fetching unique specializations...');
  const res = await query(`
    SELECT DISTINCT primary_specialization 
    FROM dentist_profiles
  `);
  console.table(res.rows);
}

run().catch(console.error);
