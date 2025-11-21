/**
 * Seed Script: 50 Indonesian Dentists with Geolocation & Types
 * - 8 Indonesian Dental Specializations (IDI Standards)
 * - Geolocation (GPS coordinates)
 * - 2 Types: Independent (25) & Clinic (25)
 * - Real Indonesian cities with coordinates
 */

import pg from 'pg';
import bcrypt from 'bcrypt';

const { Pool } = pg;

const pool = new Pool({
  user: process.env.DB_USER || 'serene',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'serene',
  password: process.env.DB_PASSWORD || 'serene',
  port: process.env.DB_PORT || 5432,
});

// 8 Indonesian Dental Specializations
const SPECIALIZATIONS = [
  { code: 'Sp.BM', name: 'Bedah Mulut dan Maksilofasial', services: ['Pencabutan Gigi Bungsu', 'Operasi Rahang', 'Perawatan Kista', 'Trauma Wajah'] },
  { code: 'Sp.KGA', name: 'Kedokteran Gigi Anak', services: ['Perawatan Gigi Anak', 'Fluoride Treatment', 'Dental Sealant', 'Edukasi Kesehatan Gigi'] },
  { code: 'Sp.KG', name: 'Konservasi Gigi', services: ['Tambal Gigi', 'Perawatan Saluran Akar', 'Veneer', 'Restorasi Estetik'] },
  { code: 'Sp.PM', name: 'Penyakit Mulut', services: ['Diagnosis Kelainan Mulut', 'Biopsi Mulut', 'Perawatan Sariawan Kronis', 'Deteksi Kanker Mulut'] },
  { code: 'Sp.Ort', name: 'Ortodonsia', services: ['Pemasangan Behel', 'Retainer', 'Invisalign', 'Koreksi Maloklusi'] },
  { code: 'Sp.Perio', name: 'Periodonsia', services: ['Scaling', 'Root Planning', 'Perawatan Gusi', 'Operasi Gusi'] },
  { code: 'Sp.Pros', name: 'Prostodonsia', services: ['Gigi Palsu', 'Crown & Bridge', 'Implant', 'Denture'] },
  { code: 'Sp.RKG', name: 'Radiologi Kedokteran Gigi', services: ['Rontgen Panoramik', 'CBCT Scan', 'Radiografi Dental', 'Interpretasi Radiologi'] },
];

// Real Indonesian Cities with GPS Coordinates
const CITIES = [
  // Jakarta
  { name: 'Jakarta Pusat', district: 'Menteng', province: 'DKI Jakarta', postalCode: '10310', lat: -6.1944, lng: 106.8229 },
  { name: 'Jakarta Selatan', district: 'Kebayoran Baru', province: 'DKI Jakarta', postalCode: '12110', lat: -6.2424, lng: 106.7991 },
  { name: 'Jakarta Utara', district: 'Kelapa Gading', province: 'DKI Jakarta', postalCode: '14240', lat: -6.1555, lng: 106.8994 },
  { name: 'Jakarta Barat', district: 'Kebon Jeruk', province: 'DKI Jakarta', postalCode: '11530', lat: -6.1867, lng: 106.7674 },
  { name: 'Jakarta Timur', district: 'Cakung', province: 'DKI Jakarta', postalCode: '13910', lat: -6.1783, lng: 106.9364 },
  
  // Major Cities
  { name: 'Surabaya', district: 'Gubeng', province: 'Jawa Timur', postalCode: '60281', lat: -7.2754, lng: 112.7378 },
  { name: 'Bandung', district: 'Dago', province: 'Jawa Barat', postalCode: '40135', lat: -6.8706, lng: 107.6135 },
  { name: 'Medan', district: 'Medan Baru', province: 'Sumatera Utara', postalCode: '20151', lat: 3.5952, lng: 98.6722 },
  { name: 'Semarang', district: 'Candisari', province: 'Jawa Tengah', postalCode: '50254', lat: -6.9667, lng: 110.4167 },
  { name: 'Makassar', district: 'Panakkukang', province: 'Sulawesi Selatan', postalCode: '90231', lat: -5.1477, lng: 119.4327 },
  
  // Secondary Cities
  { name: 'Tangerang', district: 'BSD', province: 'Banten', postalCode: '15310', lat: -6.3021, lng: 106.6519 },
  { name: 'Depok', district: 'Margonda', province: 'Jawa Barat', postalCode: '16424', lat: -6.4025, lng: 106.7942 },
  { name: 'Bekasi', district: 'Summarecon', province: 'Jawa Barat', postalCode: '17142', lat: -6.2383, lng: 106.9756 },
  { name: 'Yogyakarta', district: 'Sleman', province: 'DI Yogyakarta', postalCode: '55281', lat: -7.7956, lng: 110.3695 },
  { name: 'Malang', district: 'Lowokwaru', province: 'Jawa Timur', postalCode: '65141', lat: -7.9666, lng: 112.6326 },
  { name: 'Denpasar', district: 'Renon', province: 'Bali', postalCode: '80226', lat: -8.6705, lng: 115.2126 },
  { name: 'Palembang', district: 'Ilir Timur', province: 'Sumatera Selatan', postalCode: '30114', lat: -2.9761, lng: 104.7754 },
  { name: 'Balikpapan', district: 'Sepinggan', province: 'Kalimantan Timur', postalCode: '76115', lat: -1.2379, lng: 116.8529 },
  { name: 'Batam', district: 'Nagoya', province: 'Kepulauan Riau', postalCode: '29432', lat: 1.1304, lng: 104.0530 },
  { name: 'Bandar Lampung', district: 'Teluk Betung', province: 'Lampung', postalCode: '35213', lat: -5.4292, lng: 105.2619 },
];

// Sample Clinics (will be created first)
const CLINICS = [
  { name: 'Klinik Gigi Sehat Sentosa', city: 'Jakarta Pusat', district: 'Menteng', facilities: ['Parkir Luas', 'WiFi Gratis', 'AC', 'Ruang Tunggu Nyaman'] },
  { name: 'Dental Care Indonesia', city: 'Surabaya', district: 'Gubeng', facilities: ['CBCT Scanner', 'Digital X-Ray', 'Sterilisasi Modern', 'Parkir'] },
  { name: 'Smile Dental Clinic', city: 'Bandung', district: 'Dago', facilities: ['Alat Kedokteran Modern', 'WiFi', 'TV Hiburan', 'AC'] },
  { name: 'Prima Dental Center', city: 'Medan', district: 'Medan Baru', facilities: ['Kursi Roda', 'Lift', 'Parkir', 'Musholla'] },
  { name: 'Dental Aesthetic Clinic', city: 'Jakarta Selatan', district: 'Kebayoran Baru', facilities: ['Teknologi CAD/CAM', 'Digital Smile Design', 'WiFi', 'Coffee Corner'] },
  { name: 'Family Dental Clinic', city: 'Semarang', district: 'Candisari', facilities: ['Ruang Bermain Anak', 'Parkir', 'WiFi', 'AC'] },
  { name: 'Modern Dental Clinic', city: 'Makassar', district: 'Panakkukang', facilities: ['Digital X-Ray', 'Sterilisasi', 'AC', 'Parkir'] },
  { name: 'Elite Dental Care', city: 'Tangerang', district: 'BSD', facilities: ['VIP Room', 'WiFi Premium', 'Coffee Bar', 'Parkir Basement'] },
];

// Indonesian Names
const NAMES = [
  // Male names
  'Ahmad Fauzi', 'Budi Santoso', 'Dedi Kurniawan', 'Eko Prasetyo', 'Fahmi Hidayat',
  'Gilang Ramadhan', 'Hendra Wijaya', 'Irfan Hakim', 'Joko Widodo', 'Kusuma Wardana',
  'Luthfi Rahman', 'Made Widiarta', 'Nanda Pratama', 'Oscar Lawalata', 'Pandu Winata',
  'Rizki Firmansyah', 'Sandi Nugraha', 'Teguh Sucipto', 'Umar Bakri', 'Wahyu Adiputra',
  'Yudi Setiawan', 'Zaenal Arifin', 'Andi Maulana', 'Bayu Aji', 'Cahyo Utomo',
  // Female names
  'Ayu Lestari', 'Bunga Citra', 'Citra Dewi', 'Dian Sastro', 'Eka Putri',
  'Fitri Handayani', 'Gita Savitri', 'Hani Puspita', 'Indah Permata', 'Jasmine Surya',
  'Kartika Sari', 'Laila Sari', 'Maya Angelina', 'Nurul Aini', 'Olivia Zalianty',
  'Putri Tanjung', 'Ratna Sari', 'Sinta Dewi', 'Tika Panggabean', 'Umi Kalsum',
  'Vina Candrawati', 'Wulan Guritno', 'Yessi Gusman', 'Zahra Amalia', 'Anggun Cipta',
];

async function createClinics() {
  const client = await pool.connect();
  const createdClinics = [];

  try {
    for (const clinic of CLINICS) {
      const cityData = CITIES.find(c => c.name === clinic.city);
      
      const result = await client.query(`
        INSERT INTO clinics (
          name, address, city, district, province, postal_code,
          latitude, longitude, phone_number, operating_hours, facilities,
          is_verified, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now(), now())
        RETURNING id, name, city
      `, [
        clinic.name,
        `Jl. ${clinic.district} No. ${Math.floor(Math.random() * 100) + 1}`,
        clinic.city,
        clinic.district,
        cityData.province,
        cityData.postalCode,
        cityData.lat,
        cityData.lng,
        `+62${Math.floor(Math.random() * 900000000) + 100000000}`,
        JSON.stringify({
          monday: '09:00-17:00',
          tuesday: '09:00-17:00',
          wednesday: '09:00-17:00',
          thursday: '09:00-17:00',
          friday: '09:00-17:00',
          saturday: '09:00-14:00',
          sunday: 'Tutup'
        }),
        clinic.facilities,
        true
      ]);

      createdClinics.push(result.rows[0]);
    }

    console.log(`✅ Created ${createdClinics.length} clinics`);
    return createdClinics;
  } finally {
    client.release();
  }
}

async function seedDentists() {
  const client = await pool.connect();
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  let successCount = 0;
  let errorCount = 0;
  const specDistribution = {};

  try {
    // Create clinics first
    const clinics = await createClinics();

    // Distribute 50 dentists across specializations
    const dentistsPerSpec = Math.floor(50 / SPECIALIZATIONS.length);
    const remainder = 50 % SPECIALIZATIONS.length;

    let dentistIndex = 0;
    let independentCount = 0;
    let clinicCount = 0;

    for (let specIndex = 0; specIndex < SPECIALIZATIONS.length; specIndex++) {
      const spec = SPECIALIZATIONS[specIndex];
      const count = dentistsPerSpec + (specIndex < remainder ? 1 : 0);
      specDistribution[spec.code] = count;

      for (let i = 0; i < count; i++) {
        const name = NAMES[dentistIndex];
        const email = `${name.toLowerCase().replace(' ', '.')}@sereneapps.com`;
        const cityData = CITIES[dentistIndex % CITIES.length];
        
        // Alternate between independent and clinic
        const isIndependent = dentistIndex % 2 === 0;
        const dentistType = isIndependent ? 'independent' : 'clinic';
        
        // Select clinic for clinic-type dentists
        const clinic = isIndependent ? null : clinics[Math.floor(Math.random() * clinics.length)];
        const isOwner = !isIndependent && Math.random() > 0.7; // 30% chance of being owner

        try {
          // 1. Create user
          const userResult = await client.query(`
            INSERT INTO users (name, email, phone_number, password_hash, roles, created_at)
            VALUES ($1, $2, $3, $4, $5, now())
            RETURNING id
          `, [
            `drg. ${name}, ${spec.code}`,
            email,
            `+628${Math.floor(Math.random() * 900000000) + 100000000}`,
            hashedPassword,
            ['dentist']
          ]);

          const userId = userResult.rows[0].id;

          // 2. Create dentist profile with geolocation
          const clinicName = isIndependent 
            ? `Praktek drg. ${name}`
            : clinic.name;
          
          const clinicAddress = isIndependent
            ? `Jl. ${cityData.district} No. ${Math.floor(Math.random() * 100) + 1}, ${cityData.name}`
            : `${clinic.name}, ${cityData.district}`;

          await client.query(`
            INSERT INTO dentist_profiles (
              user_id, title, license_number, license_issuing_body, license_expiry_date,
              registration_number, primary_specialization, education_qualification,
              years_of_experience, clinic_name, clinic_address, clinic_working_hours,
              consultation_types, services_offered, consultation_fee, accepts_insurance,
              accepts_bpjs, emergency_availability, is_verified,
              latitude, longitude, district, province, postal_code, dentist_type,
              clinic_id, is_clinic_owner
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19,
              $20, $21, $22, $23, $24, $25, $26, $27
            )
          `, [
            userId,
            'drg.',
            `SIP-${Math.floor(Math.random() * 90000) + 10000}`,
            'IDI - Ikatan Dokter Indonesia',
            new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
            `STR-${Math.floor(Math.random() * 900000) + 100000}`,
            spec.name,
            `S.Kg., ${spec.code}`,
            Math.floor(Math.random() * 20) + 3,
            clinicName,
            clinicAddress,
            JSON.stringify({
              monday: '09:00-17:00',
              tuesday: '09:00-17:00',
              wednesday: '09:00-17:00',
              thursday: '09:00-17:00',
              friday: '09:00-17:00',
              saturday: '09:00-14:00',
              sunday: 'Tutup'
            }),
            ['online', 'offline'],
            spec.services,
            Math.floor(Math.random() * 750000) + 500000, // 500k - 1.25M
            true,
            true,
            true,
            true,
            cityData.lat,
            cityData.lng,
            cityData.district,
            cityData.province,
            cityData.postalCode,
            dentistType,
            isIndependent ? null : clinic.id,
            isOwner
          ]);

          successCount++;
          if (isIndependent) independentCount++;
          else clinicCount++;
          
        } catch (error) {
          console.error(`❌ Error creating dentist ${name}:`, error.message);
          errorCount++;
        }

        dentistIndex++;
      }
    }

    console.log('\n📊 SEEDING SUMMARY:');
    console.log(`✅ Success: ${successCount} dentists`);
    console.log(`❌ Failed: ${errorCount} dentists`);
    console.log(`🔑 Default password: password123\n`);
    
    console.log('📋 Specialization Distribution:');
    Object.entries(specDistribution).forEach(([spec, count]) => {
      console.log(`  ${spec}: ${count} dentists`);
    });

    console.log('\n🏥 Dentist Type Distribution:');
    console.log(`  Independent Dentists: ${independentCount}`);
    console.log(`  Clinic Dentists: ${clinicCount}`);

    // Get total count
    const totalResult = await client.query('SELECT COUNT(*) as total FROM dentist_profiles');
    console.log(`\n🎯 Total dentists in database: ${totalResult.rows[0].total}`);

  } catch (error) {
    console.error('💥 Fatal error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

seedDentists();
