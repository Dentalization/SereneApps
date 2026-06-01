import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Always resolve env from backend/.env even when command is started from another cwd.
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

async function run() {
  const seedFile = path.join(__dirname, '..', 'seeds', 'comprehensive_clinic_seed.sql');
  if (!fs.existsSync(seedFile)) {
    throw new Error(`Seed file not found at ${seedFile}`);
  }
  const sql = fs.readFileSync(seedFile, 'utf8');
  console.log('Running comprehensive clinic seed...');
  await query(sql);
  console.log('Seed completed successfully.');
}

run().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
