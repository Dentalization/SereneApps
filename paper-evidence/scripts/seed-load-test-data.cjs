const fs = require('node:fs');
const path = require('node:path');

// Resolve path to backend/.env and load it
const root = path.resolve(__dirname, '..', '..');
const envPath = path.join(root, 'backend', '.env');

if (fs.existsSync(envPath)) {
  require('../../backend/node_modules/dotenv').config({ path: envPath });
} else {
  console.warn(`[seed-load-test-data] env file not found at ${envPath}`);
}

const { Pool } = require('../../backend/node_modules/pg');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not defined in environment.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
});

async function main() {
  console.log('Connecting to database...');
  const client = await pool.connect();
  try {
    console.log('Database connected.');

    // 1. Clean up existing load test data
    console.log('Cleaning up existing load test users...');
    const deleteRes = await client.query(
      "DELETE FROM users WHERE email LIKE 'patient.load%@example.com' RETURNING id"
    );
    console.log(`Removed ${deleteRes.rowCount} historical load test users (cascade-deleted profiles & appointments).`);

    // 2. Resolve dentist and branch details
    let dentistEmail = 'dentist1.clinic1@dentists.com';
    let dentistRes = await client.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [dentistEmail]);
    let dentistId = dentistRes.rows[0]?.id;

    if (!dentistId) {
      console.log(`Dentist ${dentistEmail} not found, finding fallback dentist profile...`);
      const fallbackRes = await client.query('SELECT user_id FROM dentist_profiles LIMIT 1');
      dentistId = fallbackRes.rows[0]?.user_id;
    }

    if (!dentistId) {
      throw new Error('No dentist profile found in the database. Run npm run seed in backend first.');
    }

    console.log(`Using dentist ID: ${dentistId}`);

    const branchRes = await client.query(
      'SELECT assigned_branch_id, clinic_profile_id FROM clinic_staff WHERE user_id = $1 LIMIT 1',
      [dentistId]
    );
    let branchId = branchRes.rows[0]?.assigned_branch_id;
    let clinicId = branchRes.rows[0]?.clinic_profile_id;

    if (!branchId) {
      console.log('No assigned branch found for dentist in clinic_staff, using fallback branch...');
      const fallbackBranch = await client.query('SELECT id, clinic_profile_id FROM clinic_branches LIMIT 1');
      branchId = fallbackBranch.rows[0]?.id;
      clinicId = fallbackBranch.rows[0]?.clinic_profile_id;
    }

    console.log(`Using branch ID: ${branchId}, clinic profile ID: ${clinicId}`);

    // Available balance update (ensure dentist / clinic has balances)
    await client.query(
      `INSERT INTO available_balances (owner_type, owner_clinic_id, owner_dentist_id, available_amount, pending_amount, currency)
       VALUES ('clinic', $1, NULL, 100000000, 0, 'IDR')
       ON CONFLICT (owner_clinic_id) DO NOTHING`,
      [clinicId]
    );

    // 3. Create 200 load test users and confirmed appointments
    const count = 200;
    const passwordHash = '$2b$10$.tRXkkcSZPlFV6Wn5mULH.ahJBxwlt5t2yx2wZAHOnclS46z9/Cg2'; // password123

    console.log(`Seeding ${count} unique patients and pre-provisioned confirmed appointments...`);
    
    await client.query('BEGIN');

    for (let i = 1; i <= count; i += 1) {
      const email = `patient.load${i}@example.com`;
      const name = `Load Patient ${i}`;
      const phone = `+62 812-9900-${String(i).padStart(4, '0')}`;

      // Insert User
      const userInsert = await client.query(
        `INSERT INTO users (name, email, password_hash, roles, phone_number)
         VALUES ($1, $2, $3, ARRAY['patient']::text[], $4)
         RETURNING id`,
        [name, email, passwordHash, phone]
      );
      const patientId = userInsert.rows[0].id;

      // Insert Patient Profile
      await client.query(
        `INSERT INTO patient_profiles (user_id, date_of_birth, gender, preferred_language)
         VALUES ($1, '1990-01-01'::DATE, 'male', 'id')`,
        [patientId]
      );

      // Appointment times
      const startsAt = new Date();
      startsAt.setDate(startsAt.getDate() + 1); // tomorrow
      startsAt.setHours(9, 0, 0, 0);

      const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000); // 1 hour duration

      const chatRoomRef = `room-load-patient-${i}`;
      const videoRoomRef = `video-load-patient-${i}`;

      // Insert Appointment
      const apptInsert = await client.query(
        `INSERT INTO appointments (
           dentist_id, patient_id, clinic_branch_id, owner_type, owner_clinic_id,
           starts_at, ends_at, status, reason, notes, consultation_type,
           chat_room_ref, video_room_ref, comm_status
         ) VALUES ($1, $2, $3, 'clinic', $4, $5, $6, 'confirmed', 'Paper load test', 'System seeded appointment', 'virtual', $7, $8, 'ready')
         RETURNING id`,
        [dentistId, patientId, branchId, clinicId, startsAt, endsAt, chatRoomRef, videoRoomRef]
      );
      const apptId = apptInsert.rows[0].id;

      // Insert status history
      await client.query(
        `INSERT INTO appointment_status_history (appointment_id, previous_status, new_status, changed_by, changed_by_role, reason, notes)
         VALUES ($1, NULL, 'scheduled', $2, 'patient', 'Initial booking', 'System seeded'),
                ($1, 'scheduled', 'confirmed', $2, 'patient', 'Auto-confirmed for load test', 'System seeded')`,
        [apptId, patientId]
      );

      // Insert ChatRoom (pre-provisioned)
      const roomInsert = await client.query(
        `INSERT INTO chat_rooms (appointment_id, channel_name, twilio_conversation_sid)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [apptId, chatRoomRef, `mock_conv_load_${i}`]
      );
      const roomId = roomInsert.rows[0].id;

      // Insert ChatRoomMembers
      await client.query(
        `INSERT INTO chat_room_members (chat_room_id, user_id, role, last_read_at)
         VALUES ($1, $2, 'patient', NOW()),
                ($1, $3, 'dentist', NOW())`,
        [roomId, patientId, dentistId]
      );
    }

    await client.query('COMMIT');
    console.log(`Successfully seeded ${count} load test patient users and pre-provisioned confirmed teledentistry appointments.`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during seeding:', error);
    process.exitCode = 1;
  } finally {
    client.release();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
}).then(() => {
  pool.end();
});
