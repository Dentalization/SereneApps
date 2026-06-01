import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../src/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const PASSWORD_HASH = '$2b$10$K7XqN5JZE0rFfGk.vQ3YjOXGz5wT9LwKj5pQZ8mN3xY7fR2sV1wPi'; // password123

async function run() {
  console.log('Starting database backfill...');

  // 1. Create Patient Users
  const patients = [
    { name: 'Budi Santoso', email: 'patient.budi@example.com', phone: '+62 812-9001-0001' },
    { name: 'Siti Aminah', email: 'patient.siti@example.com', phone: '+62 812-9001-0002' },
    { name: 'Aditya Wijaya', email: 'patient.aditya@example.com', phone: '+62 812-9001-0003' },
    { name: 'Dewi Lestari', email: 'patient.dewi@example.com', phone: '+62 812-9001-0004' },
    { name: 'Rian Hidayat', email: 'patient.rian@example.com', phone: '+62 812-9001-0005' },
    { name: 'Indah Permata', email: 'patient.indah@example.com', phone: '+62 812-9001-0006' },
    { name: 'Bambang Utomo', email: 'patient.bambang@example.com', phone: '+62 812-9001-0007' },
    { name: 'Rina Kusuma', email: 'patient.rina@example.com', phone: '+62 812-9001-0008' },
    { name: 'Fajar Pratama', email: 'patient.fajar@example.com', phone: '+62 812-9001-0009' },
    { name: 'Mega Utami', email: 'patient.mega@example.com', phone: '+62 812-9001-0010' }
  ];

  console.log('Seeding patient users and profiles...');
  for (let i = 0; i < patients.length; i++) {
    const p = patients[i];
    
    // Check if user exists
    let userRes = await query('SELECT id FROM users WHERE email = $1', [p.email]);
    let userId;
    
    if (userRes.rows.length === 0) {
      const insertUser = await query(
        `INSERT INTO users (name, email, password_hash, roles, phone_number)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [p.name, p.email, PASSWORD_HASH, ['patient'], p.phone]
      );
      userId = insertUser.rows[0].id;
      console.log(`Created user: ${p.email}`);
    } else {
      userId = userRes.rows[0].id;
    }

    // Check if profile exists
    const profileRes = await query('SELECT id FROM patient_profiles WHERE user_id = $1', [userId]);
    if (profileRes.rows.length === 0) {
      const gender = i % 2 === 0 ? 'female' : 'male';
      const dob = i % 2 === 0 ? '1995-04-12' : '1990-08-25';
      await query(
        `INSERT INTO patient_profiles (
          user_id, date_of_birth, gender, insurance_provider, insurance_number, insurance_member_id, emergency_contact, address, medical_details, preferred_language
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          userId,
          dob,
          gender,
          'BPJS Kesehatan',
          `000123456789${i}`,
          `MEMBER-${i}`,
          JSON.stringify({ name: `Emergency Contact ${i}`, phone: '+62 811-9999-8888', relationship: 'Spouse' }),
          JSON.stringify({ street: `Jl. Mawar No. ${i}`, city: 'Jakarta Selatan', province: 'DKI Jakarta', postal_code: '12340' }),
          JSON.stringify({ allergies: 'None', medications: 'None', notes: 'Regular dental patient' }),
          'id'
        ]
      );
      console.log(`Created patient profile for user ID: ${userId}`);
    }
  }

  // 2. Available Balances
  console.log('Seeding available balances...');
  
  // Clinic Profiles
  const clinics = await query('SELECT id FROM clinic_profiles');
  for (const c of clinics.rows) {
    const balRes = await query('SELECT id FROM available_balances WHERE owner_clinic_id = $1', [c.id]);
    if (balRes.rows.length === 0) {
      await query(
        `INSERT INTO available_balances (owner_type, owner_clinic_id, owner_dentist_id, available_amount, pending_amount, currency)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['clinic', c.id, null, 5000000, 0, 'IDR']
      );
      console.log(`Initialized balance for Clinic ID: ${c.id}`);
    }
  }

  // Independent Dentists
  const independentDentists = await query("SELECT user_id FROM dentist_profiles WHERE dentist_type = 'independent'");
  for (const d of independentDentists.rows) {
    const balRes = await query('SELECT id FROM available_balances WHERE owner_dentist_id = $1', [d.user_id]);
    if (balRes.rows.length === 0) {
      await query(
        `INSERT INTO available_balances (owner_type, owner_clinic_id, owner_dentist_id, available_amount, pending_amount, currency)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['dentist', null, d.user_id, 3000000, 0, 'IDR']
      );
      console.log(`Initialized balance for Dentist User ID: ${d.user_id}`);
    }
  }

  // 3. Appointments
  console.log('Seeding sample appointments...');
  const apptCheck = await query('SELECT COUNT(*) as count FROM appointments');
  if (parseInt(apptCheck.rows[0].count) <= 1) {
    const dentists = await query(`
      SELECT dp.user_id, dp.clinic_id, dp.dentist_type, cb.id as branch_id
      FROM dentist_profiles dp
      LEFT JOIN clinic_branches cb ON cb.clinic_profile_id = dp.clinic_id AND cb.is_main_branch = true
      LIMIT 15
    `);
    const patients = await query("SELECT id FROM users WHERE email LIKE 'patient.%@example.com'");
    
    let i = 1;
    for (const d of dentists.rows) {
      if (patients.rows.length === 0) break;
      const patientId = patients.rows[i % patients.rows.length].id;
      
      let startsAt, statusVal;
      if (i <= 5) {
        startsAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + i * 2 * 60 * 60 * 1000);
        statusVal = 'completed';
      } else if (i <= 10) {
        startsAt = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000 + i * 2 * 60 * 60 * 1000);
        statusVal = 'cancelled';
      } else {
        startsAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + i * 2 * 60 * 60 * 1000);
        statusVal = 'scheduled';
      }
      
      const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
      const ownerType = d.dentist_type === 'independent' ? 'dentist' : 'clinic';
      const ownerClinicId = d.dentist_type === 'independent' ? null : d.clinic_id;
      const branchId = d.dentist_type === 'independent' ? null : d.branch_id;
      
      const apptRes = await query(
        `INSERT INTO appointments (
          dentist_id, patient_id, clinic_branch_id, owner_type, owner_clinic_id, starts_at, ends_at, status, reason, notes, consultation_type
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
        [
          d.user_id,
          patientId,
          branchId,
          ownerType,
          ownerClinicId,
          startsAt,
          endsAt,
          statusVal,
          `Routine dental checkup ${i}`,
          'Patient requested general cleaning.',
          i % 3 === 0 ? 'teleconsultation' : 'onsite'
        ]
      );
      const apptId = apptRes.rows[0].id;
      
      // Status History
      await query(
        `INSERT INTO appointment_status_history (appointment_id, previous_status, new_status, changed_by, changed_by_role, reason, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [apptId, null, 'scheduled', patientId, 'patient', 'Initial booking', 'System generated booking']
      );
      
      if (statusVal === 'completed') {
        await query(
          `INSERT INTO appointment_status_history (appointment_id, previous_status, new_status, changed_by, changed_by_role, reason, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [apptId, 'scheduled', 'completed', d.user_id, 'dentist', 'Treatment completed', 'Procedure went smoothly']
        );
      } else if (statusVal === 'cancelled') {
        await query(
          `INSERT INTO appointment_status_history (appointment_id, previous_status, new_status, changed_by, changed_by_role, reason, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [apptId, 'scheduled', 'cancelled', patientId, 'patient', 'Schedule conflict', 'Patient cancelled via app']
        );
      }
      
      console.log(`Created appt: ${statusVal} for patient ID: ${patientId}`);
      i++;
    }
  }

  console.log('Backfill completed successfully!');
}

run().catch(console.error);
