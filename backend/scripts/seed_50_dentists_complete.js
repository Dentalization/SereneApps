import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 8 Spesialisasi Dokter Gigi Sesuai IDI
const specializations = [
  {
    code: 'Sp.BM',
    name: 'Bedah Mulut dan Maksilofasial',
    description: 'Operasi gigi bungsu sulit, bedah rahang, kista/tumor rahang, trauma wajah, implan yang butuh tindakan bedah',
    services: ['Operasi Gigi Bungsu', 'Bedah Rahang', 'Kista/Tumor Rahang', 'Trauma Wajah', 'Implan Bedah']
  },
  {
    code: 'Sp.KGA',
    name: 'Kedokteran Gigi Anak',
    description: 'Gigi & mulut anak (bayi–remaja), karies anak, gigi susu, anak berkebutuhan khusus, pencegahan sejak dini',
    services: ['Perawatan Gigi Anak', 'Karies Anak', 'Gigi Susu', 'Anak Berkebutuhan Khusus', 'Pencegahan Dini']
  },
  {
    code: 'Sp.KG',
    name: 'Konservasi Gigi',
    description: 'Menyelamatkan gigi supaya tidak dicabut → tambal gigi, perawatan saluran akar, bleaching, restorasi estetis',
    services: ['Tambal Gigi', 'Perawatan Saluran Akar', 'Bleaching', 'Restorasi Estetis', 'Veneer']
  },
  {
    code: 'Sp.PM',
    name: 'Penyakit Mulut',
    description: 'Kelainan jaringan lunak mulut (sariawan tidak sembuh, bercak putih/merah, gangguan kelenjar ludah, lesi pra-kanker/kanker mulut)',
    services: ['Diagnosa Sariawan', 'Bercak Mulut', 'Gangguan Kelenjar Ludah', 'Lesi Pra-Kanker', 'Diagnosa Kanker Mulut']
  },
  {
    code: 'Sp.Ort',
    name: 'Ortodonsia',
    description: 'Susunan gigi & gigitan → pasang behel, aligner, koreksi rahang/gigi yang tidak rapi',
    services: ['Pasang Behel', 'Clear Aligner', 'Koreksi Rahang', 'Gigi Tidak Rapi', 'Retainer']
  },
  {
    code: 'Sp.Perio',
    name: 'Periodonsia',
    description: 'Gusi dan tulang penyangga gigi → radang gusi, periodontitis, gigi goyang, bedah periodontal, implan terkait jaringan penyangga',
    services: ['Radang Gusi', 'Periodontitis', 'Gigi Goyang', 'Bedah Periodontal', 'Implan Periodontal']
  },
  {
    code: 'Sp.Pros',
    name: 'Prostodonsia',
    description: 'Gigi tiruan & rehabilitasi → denture lepasan, crown, bridge, veneer, prostesis kompleks, implan dari sisi gigi penggantinya',
    services: ['Gigi Palsu Lepasan', 'Crown', 'Bridge', 'Veneer', 'Prostesis Kompleks', 'Implan Gigi']
  },
  {
    code: 'Sp.RKG',
    name: 'Radiologi Kedokteran Gigi',
    description: 'Pencitraan → foto rontgen intraoral, panoramik, CBCT, interpretasi untuk diagnosis dan perencanaan perawatan',
    services: ['Rontgen Intraoral', 'Panoramik', 'CBCT', 'Interpretasi Radiograf', 'Perencanaan Digital']
  }
];

// Template nama depan (50 nama unik)
const firstNames = [
  'Ahmad', 'Budi', 'Citra', 'Dewi', 'Eko', 'Fajar', 'Gita', 'Hadi', 'Indah', 'Joko',
  'Kartika', 'Lestari', 'Made', 'Nurul', 'Omar', 'Putri', 'Qori', 'Rina', 'Siti', 'Taufik',
  'Umar', 'Vina', 'Wati', 'Yanto', 'Zahra', 'Arif', 'Bella', 'Dani', 'Elsa', 'Faisal',
  'Gina', 'Hendra', 'Irma', 'Jihan', 'Kevin', 'Lia', 'Maya', 'Nanda', 'Oki', 'Prita',
  'Ratna', 'Sari', 'Tina', 'Uli', 'Vera', 'Wulan', 'Yudi', 'Zaki', 'Ayu', 'Bambang',
];

// Template nama belakang (50 nama unik)
const lastNames = [
  'Pratama', 'Santoso', 'Wijaya', 'Kusuma', 'Permana', 'Saputra', 'Lestari', 'Wibowo', 'Haryanto', 'Setiawan',
  'Hidayat', 'Nugroho', 'Rahman', 'Kurniawan', 'Firmansyah', 'Utomo', 'Maulana', 'Hakim', 'Syahputra', 'Aditya',
  'Surya', 'Dharma', 'Putra', 'Mahendra', 'Gunawan', 'Hermawan', 'Purnomo', 'Santosa', 'Irawan', 'Saputri',
  'Anggraini', 'Fitriani', 'Rahmawati', 'Handayani', 'Safitri', 'Maharani', 'Puspita', 'Cahyani', 'Pratiwi', 'Susanti',
  'Abdullah', 'Fauzi', 'Halim', 'Rizki', 'Yusuf', 'Ramadhan', 'Sidiq', 'Habibi', 'Nasution', 'Siregar',
];

// Kota-kota di Indonesia
const cities = [
  'Jakarta Selatan', 'Jakarta Pusat', 'Jakarta Utara', 'Surabaya', 'Bandung', 
  'Medan', 'Semarang', 'Makassar', 'Palembang', 'Tangerang',
  'Depok', 'Bekasi', 'Yogyakarta', 'Bogor', 'Malang', 
  'Batam', 'Pekanbaru', 'Bandar Lampung', 'Padang', 'Denpasar',
];

// Alamat klinik template
const clinicNamePrefixes = [
  'Klinik Gigi', 'Dental Care', 'Smile Dental', 'Dentist Pro', 'Dental Clinic',
  'Klinik Gigi Keluarga', 'Modern Dental', 'Elite Dental', 'Prima Dental', 'Harmoni Dental',
  'Serene Dental', 'Bright Smile', 'Perfect Teeth', 'Happy Dental', 'Golden Smile',
];

const streetNames = [
  'Jl. Sudirman', 'Jl. Gatot Subroto', 'Jl. Thamrin', 'Jl. Kuningan', 'Jl. Veteran',
  'Jl. Ahmad Yani', 'Jl. Diponegoro', 'Jl. Imam Bonjol', 'Jl. Merdeka', 'Jl. Pemuda',
  'Jl. Pahlawan', 'Jl. Asia Afrika', 'Jl. Raya Bogor', 'Jl. TB Simatupang', 'Jl. Rasuna Said',
];

// Universitas Kedokteran Gigi
const universities = [
  'Universitas Indonesia',
  'Universitas Gadjah Mada',
  'Universitas Airlangga',
  'Universitas Padjadjaran',
  'Universitas Trisakti',
  'Universitas Hasanuddin',
  'Universitas Sumatera Utara',
  'Universitas Jember',
  'Universitas Brawijaya',
  'Universitas Andalas',
];

function generateRandomPhone() {
  const prefix = '+628';
  const number = Math.floor(10000000 + Math.random() * 90000000);
  return `${prefix}${number}`;
}

function generateRandomEmail(firstName, lastName) {
  const cleanFirst = firstName.toLowerCase();
  const cleanLast = lastName.toLowerCase();
  const domains = ['dentist.id', 'dokter.id', 'clinic.id', 'dental.id', 'drg.id'];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  return `${cleanFirst}.${cleanLast}@${domain}`;
}

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateDentistData(index) {
  const firstName = firstNames[index % firstNames.length];
  const lastName = lastNames[index % lastNames.length];
  const fullName = `${firstName} ${lastName}`;
  
  // Distribusi merata 8 spesialisasi (50/8 = ~6 dokter per spesialisasi)
  const specialization = specializations[index % specializations.length];
  const city = cities[index % cities.length];
  
  const yearsOfExperience = Math.floor(5 + Math.random() * 25); // 5-30 tahun
  const consultationFee = (Math.floor(Math.random() * 15) + 10) * 50000; // 500k - 1.25jt
  const rating = (4.2 + Math.random() * 0.8).toFixed(1); // 4.2 - 5.0
  
  const streetName = getRandomElement(streetNames);
  const streetNumber = Math.floor(1 + Math.random() * 200);
  const clinicPrefix = getRandomElement(clinicNamePrefixes);
  const clinicName = `${clinicPrefix} ${firstName}`;
  const clinicAddress = `${streetName} No. ${streetNumber}, ${city}`;
  
  const university = getRandomElement(universities);
  const graduationYear = new Date().getFullYear() - yearsOfExperience - 4; // Asumsi lulus 4 tahun sebelum praktek
  
  // Bio yang lebih lengkap
  const bio = `Dokter gigi spesialis ${specialization.name} dengan pengalaman ${yearsOfExperience} tahun. Alumni ${university}. Fokus pada ${specialization.description}. Melayani dengan profesional dan ramah.`;
  
  return {
    email: generateRandomEmail(firstName, lastName),
    name: fullName,
    phoneNumber: generateRandomPhone(),
    password: 'password123', // Default password
    about: bio,
    profile: {
      title: 'drg.',
      licenseNumber: `SIP.${specialization.code}/${city.substring(0, 3).toUpperCase()}/${1000 + index}/${new Date().getFullYear()}`,
      registrationNumber: `STR.${specialization.code}/${10000 + index}/${new Date().getFullYear()}`,
      primarySpecialization: `${specialization.name} (${specialization.code})`,
      secondarySpecializations: specialization.services.slice(0, 3), // 3 layanan utama
      yearsOfExperience,
      educationQualification: `Dokter Gigi (${university}, ${graduationYear}), Spesialis ${specialization.name} (${graduationYear + 3})`,
      clinicName,
      clinicAddress,
      consultationFee,
      phoneNumber: generateRandomPhone(), // Nomor klinik berbeda
      rating: parseFloat(rating),
      city,
      specialization: specialization,
    },
  };
}

async function seedDentists() {
  const client = await pool.connect();
  
  try {
    console.log('🦷 Starting to seed 50 dentists with 8 specializations...\n');
    
    await client.query('BEGIN');
    
    let successCount = 0;
    let errorCount = 0;
    const specializationStats = {};
    
    for (let i = 0; i < 50; i++) {
      try {
        const dentist = generateDentistData(i);
        const hashedPassword = await bcrypt.hash(dentist.password, 10);
        
        // Insert user
        const userResult = await client.query(
          `INSERT INTO users (name, email, phone_number, password_hash, roles, about, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())
           RETURNING id`,
          [dentist.name, dentist.email, dentist.phoneNumber, hashedPassword, ['dentist'], dentist.about]
        );
        
        const userId = userResult.rows[0].id;
        
        // Insert dentist profile
        await client.query(
          `INSERT INTO dentist_profiles (
            user_id, 
            title,
            license_number,
            license_issuing_body,
            license_expiry_date,
            registration_number,
            primary_specialization,
            years_of_experience,
            education_qualification,
            clinic_name,
            clinic_address,
            clinic_working_hours,
            consultation_types,
            services_offered,
            consultation_fee,
            accepts_insurance,
            accepts_bpjs,
            is_verified,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW())`,
          [
            userId,
            dentist.profile.title,
            dentist.profile.licenseNumber,
            'Dinas Kesehatan', // license_issuing_body
            new Date(new Date().setFullYear(new Date().getFullYear() + 5)), // license_expiry_date (5 tahun ke depan)
            dentist.profile.registrationNumber,
            dentist.profile.primarySpecialization,
            dentist.profile.yearsOfExperience,
            dentist.profile.educationQualification,
            dentist.profile.clinicName,
            dentist.profile.clinicAddress,
            'Senin-Jumat: 09:00-17:00, Sabtu: 09:00-14:00', // clinic_working_hours
            ['Konsultasi Langsung', 'Konsultasi Online'], // consultation_types
            dentist.profile.specialization.services, // services_offered
            dentist.profile.consultationFee,
            true, // accepts_insurance
            true, // accepts_bpjs
            true, // is_verified
          ]
        );
        
        // Track specialization stats
        const specCode = dentist.profile.specialization.code;
        specializationStats[specCode] = (specializationStats[specCode] || 0) + 1;
        
        successCount++;
        console.log(`✅ [${i + 1}/50] ${dentist.name} - ${dentist.profile.specialization.code} (${dentist.profile.city})`);
      } catch (error) {
        errorCount++;
        console.error(`❌ [${i + 1}/50] Error:`, error.message);
      }
    }
    
    await client.query('COMMIT');
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 SEEDING SUMMARY');
    console.log('='.repeat(80));
    console.log(`✅ Success: ${successCount} dentists`);
    console.log(`❌ Failed: ${errorCount} dentists`);
    console.log(`🔑 Default password: password123`);
    
    // Show specialization distribution
    console.log('\n🏥 SPECIALIZATION DISTRIBUTION:');
    console.log('-'.repeat(80));
    
    specializations.forEach(spec => {
      const count = specializationStats[spec.code] || 0;
      const bar = '█'.repeat(count);
      console.log(`${spec.code.padEnd(10)} ${spec.name.padEnd(35)} ${bar} (${count})`);
    });
    
    // Database verification
    console.log('\n📈 DATABASE VERIFICATION:');
    console.log('-'.repeat(80));
    
    const totalDentists = await client.query(
      `SELECT COUNT(*) as total FROM users WHERE 'dentist' = ANY(roles)`
    );
    console.log(`Total dentists in database: ${totalDentists.rows[0].total}`);
    
    const specializationCount = await client.query(
      `SELECT primary_specialization, COUNT(*) as count
       FROM dentist_profiles
       GROUP BY primary_specialization
       ORDER BY primary_specialization`
    );
    
    console.log('\nSpecializations in database:');
    specializationCount.rows.forEach(row => {
      console.log(`  ${row.primary_specialization}: ${row.count}`);
    });
    
    // Show city distribution
    console.log('\n🌆 CITY DISTRIBUTION (Top 15):');
    console.log('-'.repeat(80));
    const cityCount = await client.query(
      `SELECT 
         SPLIT_PART(clinic_address, ',', 2) as city,
         COUNT(*) as count
       FROM dentist_profiles
       WHERE clinic_address IS NOT NULL
       GROUP BY city
       ORDER BY count DESC
       LIMIT 15`
    );
    
    cityCount.rows.forEach((row, idx) => {
      const city = row.city?.trim() || 'Unknown';
      const count = row.count;
      const bar = '▓'.repeat(count);
      console.log(`${String(idx + 1).padStart(2)}. ${city.padEnd(20)} ${bar} (${count})`);
    });
    
    console.log('\n' + '='.repeat(80));
    
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
    console.log('💡 You can now login with any dentist email and password: password123\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  });
