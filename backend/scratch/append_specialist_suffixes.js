import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../src/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const specializationMapping = {
  'Orthodontics': 'Sp.Ort',
  'Endodontics': 'Sp.KG',
  'Pediatric Dentistry': 'Sp.KGA',
  'Periodontics': 'Sp.Perio',
  'Prosthodontics': 'Sp.Pros',
  'Oral Surgery': 'Sp.BM',
  'Oral Medicine': 'Sp.PM'
};

async function run() {
  console.log('Starting migration to append specialist suffixes...');
  
  // Start Postgres Transaction
  await query('BEGIN');
  
  try {
    // Select all dentists with their specializations
    const { rows } = await query(`
      SELECT u.id, u.name, dp.primary_specialization 
      FROM users u
      JOIN dentist_profiles dp ON u.id = dp.user_id
    `);
    
    let updatedCount = 0;
    
    for (const row of rows) {
      const suffix = specializationMapping[row.primary_specialization];
      
      // If there is a matching suffix for the specialization
      if (suffix) {
        // Skip if the name already contains a comma or "Sp."
        if (row.name.includes(',') || row.name.includes('Sp.')) {
          console.log(`Skipping: ${row.name} (already has a suffix or formatting)`);
          continue;
        }
        
        const newName = `${row.name.trim()}, ${suffix}`;
        console.log(`Updating: "${row.name}" -> "${newName}" (Specialization: ${row.primary_specialization})`);
        
        await query(
          'UPDATE users SET name = $1 WHERE id = $2',
          [newName, row.id]
        );
        updatedCount++;
      }
    }
    
    await query('COMMIT');
    console.log(`\nSuccessfully appended specialist suffixes to ${updatedCount} dentists.`);
  } catch (error) {
    await query('ROLLBACK');
    console.error('Migration failed, rolled back changes:', error);
  }
}

run().catch(console.error);
