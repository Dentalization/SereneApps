import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Daftar spesialisasi dokter gigi
const specializations = [
  'Orthodontics', // Orthodonti - Kawat Gigi
  'Periodontics', // Periodontologi - Penyakit Gusi
  'Endodontics', // Endodontik - Perawatan Saluran Akar
  'Prosthodontics', // Prostodontik - Gigi Palsu
  'Oral Surgery', // Bedah Mulut
  'Pediatric Dentistry', // Kedokteran Gigi Anak
  'Oral Pathology', // Patologi Mulut
  'Cosmetic Dentistry', // Estetika Gigi
  'Implantology', // Implan Gigi
  'General Dentistry', // Dokter Gigi Umum
];

// Template nama depan
const firstNames = [
  'Ahmad', 'Budi', 'Citra', 'Dewi', 'Eko', 'Fajar', 'Gita', 'Hadi', 'Indah', 'Joko',
  'Kartika', 'Lestari', 'Made', 'Nurul', 'Omar', 'Putri', 'Qori', 'Rina', 'Siti', 'Taufik',
  'Umar', 'Vina', 'Wati', 'Yanto', 'Zahra', 'Arif', 'Bella', 'Dani', 'Elsa', 'Faisal',
  'Gina', 'Hendra', 'Irma', 'Jihan', 'Kevin', 'Lia', 'Maya', 'Nanda', 'Oki', 'Prita',
  'Ratna', 'Sari', 'Tina', 'Uli', 'Vera', 'Wulan', 'Yudi', 'Zaki', 'Ayu', 'Bambang',
];

// Template nama belakang
const lastNames = [
  'Pratama', 'Santoso', 'Wijaya', 'Kusuma', 'Permana', 'Saputra', 'Lestari', 'Wibowo', 'Haryanto', 'Setiawan',
  'Hidayat', 'Nugroho', 'Rahman', 'Kurniawan', 'Firmansyah', 'Utomo', 'Maulana', 'Hakim', 'Syahputra', 'Aditya',
  'Surya', 'Dharma', 'Putra', 'Mahendra', 'Gunawan', 'Hermawan', 'Purnomo', 'Santosa', 'Irawan', 'Saputri',
  'Anggraini', 'Fitriani', 'Rahmawati', 'Handayani', 'Safitri', 'Maharani', 'Puspita', 'Cahyani', 'Pratiwi', 'Susanti',
  'Abdullah', 'Fauzi', 'Halim', 'Rizki', 'Yusuf', 'Ramadhan', 'Sidiq', 'Habibi', 'Nasution', 'Siregar',
];

// Kota-kota di Indonesia
const cities = [
  'Jakarta', 'Surabaya', 'Bandung', 'Medan', 'Semarang',
  'Makassar', 'Palembang', 'Tangerang', 'Depok', 'Bekasi',
  'Yogyakarta', 'Bogor', 'Malang', 'Batam', 'Pekanbaru',
  'Bandar Lampung', 'Padang', 'Denpasar', 'Balikpapan', 'Samarinda',
];

// Alamat klinik template
const clinicNamePrefixes = [
  'Klinik Gigi', 'Dental Care', 'Smile Dental', 'Dentist Pro', 'Dental Clinic',
  'Klinik Gigi Keluarga', 'Modern Dental', 'Elite Dental', 'Prima Dental', 'Harmoni Dental',
];

const streetNames = [
  'Jl. Sudirman', 'Jl. Gatot Subroto', 'Jl. Thamrin', 'Jl. Kuningan', 'Jl. Veteran',
  'Jl. Ahmad Yani', 'Jl. Diponegoro', 'Jl. Imam Bonjol', 'Jl. Merdeka', 'Jl. Pemuda',
];

function generateRandomPhone() {
  const prefix = '+628';
  const number = Math.floor(10000000 + Math.random() * 90000000);
  return `${prefix}${number}`;
}

function generateRandomEmail(name) {
  const cleanName = name.toLowerCase().replace(/\s+/g, '.');
  const domains = ['dentist.id', 'dokter.id', 'clinic.id', 'dental.id', 'drg.id'];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  return `${cleanName}@${domain}`;
}

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateDentistData(index) {
  const firstName = getRandomElement(firstNames);
  const lastName = getRandomElement(lastNames);
  const fullName = `drg. ${firstName} ${lastName}`;
  const specialization = specializations[index % specializations.length];
  const city = getRandomElement(cities);
  
  const yearsOfExperience = Math.floor(3 + Math.random() * 27); // 3-30 tahun
  const consultationFee = (Math.floor(Math.random() * 20) + 10) * 50000; // 500k - 1.5jt
  const rating = (4.0 + Math.random() * 1.0).toFixed(1); // 4.0 - 5.0
  
  const streetName = getRandomElement(streetNames);
  const streetNumber = Math.floor(1 + Math.random() * 200);
  const clinicName = `${getRandomElement(clinicNamePrefixes)} ${firstName}`;
  const clinicAddress = `${streetName} No. ${streetNumber}, ${city}`;
  
  return {
    email: generateRandomEmail(fullName),
    name: fullName,
    phoneNumber: generateRandomPhone(),
    password: 'password123', // Default password
    profile: {
      title: 'drg.',
      licenseNumber: `SIP-${city.substring(0, 3).toUpperCase()}-${1000 + index}/${new Date().getFullYear()}`,
      registrationNumber: `STR-${10000 + index}/${new Date().getFullYear()}`,
      primarySpecialization: specialization,
      yearsOfExperience,
      educationQualification: `Dokter Gigi, Spesialis ${specialization}`,
      clinicName,
      clinicAddress,
      consultationFee,
      rating: parseFloat(rating),
      city,
    },
  };
}

async function seedDentists() {
  const client = await pool.connect();
  
  try {
    console.log('🦷 Starting to seed 50 dentists...\n');
    
    await client.query('BEGIN');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < 50; i++) {
      try {
        const dentist = generateDentistData(i);
        const hashedPassword = await bcrypt.hash(dentist.password, 10);
        
        // Insert user
        const userResult = await client.query(
          `INSERT INTO users (name, email, phone_number, password_hash, roles, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
           RETURNING id`,
          [dentist.name, dentist.email, dentist.phoneNumber, hashedPassword, ['dentist']]
        );
        
        const userId = userResult.rows[0].id;
        
        // Insert dentist profile
        await client.query(
          `INSERT INTO dentist_profiles (
            user_id, 
            title,
            license_number,
            registration_number,
            primary_specialization,
            years_of_experience,
            education_qualification,
            clinic_name,
            clinic_address,
            consultation_fee,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
          [
            userId,
            dentist.profile.title,
            dentist.profile.licenseNumber,
            dentist.profile.registrationNumber,
            dentist.profile.primarySpecialization,
            dentist.profile.yearsOfExperience,
            dentist.profile.educationQualification,
            dentist.profile.clinicName,
            dentist.profile.clinicAddress,
            dentist.profile.consultationFee,
          ]
        );
        
        successCount++;
        console.log(`✅ [${i + 1}/50] Created: ${dentist.name} - ${dentist.profile.primarySpecialization} (${dentist.profile.city})`);
      } catch (error) {
        errorCount++;
        console.error(`❌ [${i + 1}/50] Error:`, error.message);
      }
    }
    
    await client.query('COMMIT');
    
    console.log('\n📊 Summary:');
    console.log(`   ✅ Success: ${successCount} dentists`);
    console.log(`   ❌ Failed: ${errorCount} dentists`);
    console.log(`   📧 Default password: password123`);
    
    // Show specialization distribution
    console.log('\n🏥 Specialization Distribution:');
    const specializationCount = await client.query(
      `SELECT primary_specialization, COUNT(*) as count
       FROM dentist_profiles
       GROUP BY primary_specialization
       ORDER BY count DESC`
    );
    
    specializationCount.rows.forEach(row => {
      console.log(`   ${row.primary_specialization}: ${row.count} dentists`);
    });
    
    // Show city distribution
    console.log('\n🌆 City Distribution (Top 10):');
    const cityCount = await client.query(
      `SELECT 
         SPLIT_PART(clinic_address, ',', 2) as city,
         COUNT(*) as count
       FROM dentist_profiles
       WHERE clinic_address IS NOT NULL
       GROUP BY city
       ORDER BY count DESC
       LIMIT 10`
    );
    
    cityCount.rows.forEach(row => {
      console.log(`   ${row.city?.trim() || 'Unknown'}: ${row.count} dentists`);
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Transaction error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the seeder
seedDentists()
  .then(() => {
    console.log('\n✅ Seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  });
