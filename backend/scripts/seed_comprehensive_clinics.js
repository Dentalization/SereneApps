import pg from 'pg';
import bcrypt from 'bcrypt';

const { Pool } = pg;

// ============================================
// Configuration
// ============================================

const pool = new Pool({
  user: process.env.DB_USER || 'serene',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'serene',
  password: process.env.DB_PASSWORD || 'serene',
  port: Number(process.env.DB_PORT || 5432),
});

const PASSWORD = 'password123';
const PASSWORD_HASH = '$2b$10$8Q6I72ZvvPX0xf0.koJglu/w6zsb7yyBQG4HmPgsavsO00a6lMPKu';

// ============================================
// Data Templates
// ============================================

const CLINIC_NAMES = [
  'Serene Dental Network',
  'Elite Smile Care',
  'Premium Dental Studio',
  'Bright Smile Clinic',
  'FamilyCare Dental',
  'Advanced Dental Care',
  'Modern Smile Center',
  'Comfort Dental Plaza',
  'Dental Excellence Hub',
  'SmileCraft Specialists'
];

const DENTIST_FIRST_NAMES = ['Alex', 'Maria', 'John', 'Emma', 'Ryan', 'Olivia', 'Lucas', 'Sophia', 'Noah', 'Isabella'];
const DENTIST_LAST_NAMES = ['Kumar', 'Santos', 'Nguyen', 'Patel', 'Cohen', 'Silva', 'Wang', 'Ali', 'Lopez', 'Kim'];

// Spesialisasi Dokter Gigi di Indonesia
const SPECIALTIES = [
  'Ortodonti (Sp.Ort)', // Kawat gigi, clear aligner
  'Konservasi Gigi (Sp.KG)', // Gigi berlubang, saluran akar, restorasi
  'Bedah Mulut (Sp.BM)', // Operasi gigi bungsu, bibir sumbing, operasi rahang
  'Periodonsia (Sp.Perio)', // Penyakit gusi dan tulang rahang
  'Prostodonsia (Sp.Pros)', // Gigi tiruan, mahkota, implan
  'Kedokteran Gigi Anak (Sp.KGA)', // Perawatan gigi anak
  'Penyakit Mulut (Sp.PM)', // Sariawan kronis, tumor, kanker mulut
  'Radiologi Kedokteran Gigi (Sp.RKG)', // Rontgen, CT scan, MRI gigi
  'Odontologi Forensik', // Identifikasi jenazah, analisis bekas gigitan
  'Dokter Gigi Umum' // General dentistry
];

const AREAS = [
  ['Menteng', 'Tanah Abang', 'Gambir', 'Senen', 'Cempaka Putih', 'Johar Baru', 'Kemayoran', 'Sawah Besar', 'Pasar Minggu', 'Tebet'],
  ['Kebayoran Baru', 'Kebayoran Lama', 'Pesanggrahan', 'Cilandak', 'Pasar Minggu', 'Jagakarsa', 'Mampang Prapatan', 'Pancoran', 'Tebet', 'Setiabudi'],
  ['Penjaringan', 'Pademangan', 'Tanjung Priok', 'Koja', 'Kelapa Gading', 'Cilincing', 'Pluit', 'Ancol', 'Sunter', 'Pulo Gadung'],
  ['Cakung', 'Cipayung', 'Ciracas', 'Duren Sawit', 'Jatinegara', 'Kramat Jati', 'Makasar', 'Matraman', 'Pasar Rebo', 'Pulogadung'],
  ['Cengkareng', 'Grogol Petamburan', 'Taman Sari', 'Tambora', 'Kebon Jeruk', 'Kalideres', 'Palmerah', 'Kembangan', 'Cikini', 'Karet']
];

const SERVICES = [
  // General Services
  { name: 'Konsultasi Gigi', description: 'Pemeriksaan menyeluruh kondisi gigi dan mulut', base_price: 150000, category: 'general', specialty: null, duration: 30 },
  { name: 'Scaling (Pembersihan Karang Gigi)', description: 'Pembersihan karang gigi profesional', base_price: 250000, category: 'general', specialty: null, duration: 45 },
  { name: 'Tambal Gigi Komposit', description: 'Penambalan gigi berlubang dengan bahan komposit', base_price: 300000, category: 'general', specialty: null, duration: 45 },
  { name: 'Cabut Gigi Sederhana', description: 'Pencabutan gigi sederhana', base_price: 350000, category: 'general', specialty: null, duration: 30 },
  { name: 'Foto Rontgen Gigi', description: 'Rontgen panoramik atau periapikal', base_price: 150000, category: 'general', specialty: null, duration: 15 },
  { name: 'Bleaching Gigi', description: 'Pemutihan gigi profesional', base_price: 1500000, category: 'general', specialty: null, duration: 60 },
  
  // Ortodonti (Sp.Ort)
  { name: 'Pemasangan Behel/Kawat Gigi', description: 'Pemasangan kawat gigi metal atau keramik', base_price: 8000000, category: 'specialist', specialty: 'Ortodonti (Sp.Ort)', duration: 120 },
  { name: 'Kontrol Behel Bulanan', description: 'Kontrol dan penyesuaian kawat gigi', base_price: 200000, category: 'specialist', specialty: 'Ortodonti (Sp.Ort)', duration: 30 },
  { name: 'Clear Aligner (Invisalign)', description: 'Pemasangan clear aligner transparan', base_price: 25000000, category: 'specialist', specialty: 'Ortodonti (Sp.Ort)', duration: 90 },
  { name: 'Retainer Ortodonti', description: 'Pembuatan retainer setelah perawatan ortodonti', base_price: 1200000, category: 'specialist', specialty: 'Ortodonti (Sp.Ort)', duration: 45 },
  
  // Konservasi Gigi (Sp.KG)
  { name: 'Perawatan Saluran Akar (PSA)', description: 'Perawatan endodontik untuk gigi terinfeksi', base_price: 1200000, category: 'specialist', specialty: 'Konservasi Gigi (Sp.KG)', duration: 90 },
  { name: 'Crown (Mahkota Gigi) Porselen', description: 'Pemasangan mahkota gigi porselen', base_price: 2500000, category: 'specialist', specialty: 'Konservasi Gigi (Sp.KG)', duration: 90 },
  { name: 'Inlay/Onlay', description: 'Restorasi gigi dengan inlay atau onlay', base_price: 1800000, category: 'specialist', specialty: 'Konservasi Gigi (Sp.KG)', duration: 60 },
  { name: 'Veneer Komposit', description: 'Pelapisan gigi dengan veneer komposit', base_price: 1500000, category: 'specialist', specialty: 'Konservasi Gigi (Sp.KG)', duration: 60 },
  
  // Bedah Mulut (Sp.BM)
  { name: 'Cabut Gigi Bungsu Impaksi', description: 'Pembedahan untuk gigi bungsu yang tertanam', base_price: 1500000, category: 'specialist', specialty: 'Bedah Mulut (Sp.BM)', duration: 60 },
  { name: 'Operasi Bibir Sumbing', description: 'Pembedahan koreksi bibir sumbing', base_price: 15000000, category: 'specialist', specialty: 'Bedah Mulut (Sp.BM)', duration: 180 },
  { name: 'Operasi Rahang (Orthognathic)', description: 'Pembedahan koreksi posisi rahang', base_price: 35000000, category: 'specialist', specialty: 'Bedah Mulut (Sp.BM)', duration: 240 },
  { name: 'Odontektomi', description: 'Pembedahan pengangkatan gigi yang tertanam', base_price: 2000000, category: 'specialist', specialty: 'Bedah Mulut (Sp.BM)', duration: 90 },
  
  // Periodonsia (Sp.Perio)
  { name: 'Kuretase Gusi', description: 'Pembersihan jaringan gusi yang terinfeksi', base_price: 800000, category: 'specialist', specialty: 'Periodonsia (Sp.Perio)', duration: 60 },
  { name: 'Flap Surgery', description: 'Operasi jaringan periodontal', base_price: 3500000, category: 'specialist', specialty: 'Periodonsia (Sp.Perio)', duration: 90 },
  { name: 'Gingivektomi', description: 'Pengangkatan jaringan gusi berlebih', base_price: 1500000, category: 'specialist', specialty: 'Periodonsia (Sp.Perio)', duration: 60 },
  { name: 'Bone Grafting', description: 'Penambahan tulang untuk periodontal', base_price: 5000000, category: 'specialist', specialty: 'Periodonsia (Sp.Perio)', duration: 120 },
  
  // Prostodonsia (Sp.Pros)
  { name: 'Gigi Tiruan Sebagian Lepasan', description: 'Pembuatan gigi tiruan sebagian yang dapat dilepas', base_price: 3000000, category: 'specialist', specialty: 'Prostodonsia (Sp.Pros)', duration: 90 },
  { name: 'Gigi Tiruan Lengkap', description: 'Pembuatan gigi tiruan lengkap atas/bawah', base_price: 5000000, category: 'specialist', specialty: 'Prostodonsia (Sp.Pros)', duration: 120 },
  { name: 'Implan Gigi', description: 'Pemasangan implan gigi titanium', base_price: 12000000, category: 'specialist', specialty: 'Prostodonsia (Sp.Pros)', duration: 120 },
  { name: 'Bridge (Jembatan Gigi)', description: 'Pembuatan jembatan gigi untuk menggantikan gigi hilang', base_price: 4000000, category: 'specialist', specialty: 'Prostodonsia (Sp.Pros)', duration: 90 },
  
  // Kedokteran Gigi Anak (Sp.KGA)
  { name: 'Perawatan Gigi Anak', description: 'Perawatan gigi khusus untuk anak-anak', base_price: 200000, category: 'specialist', specialty: 'Kedokteran Gigi Anak (Sp.KGA)', duration: 45 },
  { name: 'Tambal Gigi Susu', description: 'Penambalan gigi susu anak', base_price: 250000, category: 'specialist', specialty: 'Kedokteran Gigi Anak (Sp.KGA)', duration: 30 },
  { name: 'Aplikasi Fluoride', description: 'Aplikasi fluoride untuk mencegah karies pada anak', base_price: 150000, category: 'specialist', specialty: 'Kedokteran Gigi Anak (Sp.KGA)', duration: 20 },
  { name: 'Space Maintainer', description: 'Pembuatan alat untuk mempertahankan ruang gigi', base_price: 1500000, category: 'specialist', specialty: 'Kedokteran Gigi Anak (Sp.KGA)', duration: 60 },
  
  // Penyakit Mulut (Sp.PM)
  { name: 'Biopsi Jaringan Mulut', description: 'Pengambilan sampel jaringan untuk pemeriksaan', base_price: 1500000, category: 'specialist', specialty: 'Penyakit Mulut (Sp.PM)', duration: 45 },
  { name: 'Pengobatan Sariawan Kronis', description: 'Terapi untuk sariawan yang tidak kunjung sembuh', base_price: 500000, category: 'specialist', specialty: 'Penyakit Mulut (Sp.PM)', duration: 30 },
  { name: 'Terapi Lesi Mulut', description: 'Pengobatan lesi atau kelainan di mulut', base_price: 800000, category: 'specialist', specialty: 'Penyakit Mulut (Sp.PM)', duration: 45 },
  
  // Radiologi Kedokteran Gigi (Sp.RKG)
  { name: 'CT Scan Gigi dan Rahang', description: 'Pencitraan 3D untuk diagnosis detail', base_price: 1500000, category: 'specialist', specialty: 'Radiologi Kedokteran Gigi (Sp.RKG)', duration: 30 },
  { name: 'CBCT (Cone Beam CT)', description: 'CT scan khusus untuk gigi dan rahang', base_price: 2000000, category: 'specialist', specialty: 'Radiologi Kedokteran Gigi (Sp.RKG)', duration: 30 },
  { name: 'Panoramik Digital', description: 'Foto panoramik seluruh gigi dengan teknologi digital', base_price: 300000, category: 'specialist', specialty: 'Radiologi Kedokteran Gigi (Sp.RKG)', duration: 15 }
];

const HIGHLIGHTS = [
  { text: '3D Digital Scanning', icon: 'tooth-3d' },
  { text: 'Painless Laser Treatment', icon: 'laser' },
  { text: 'Emergency Dental Care', icon: 'emergency' },
  { text: 'Child-Friendly Environment', icon: 'child' },
  { text: 'Insurance Accepted', icon: 'insurance' },
  { text: 'Flexible Payment Plans', icon: 'payment' },
  { text: 'Experienced Specialists', icon: 'doctor' },
  { text: 'Modern Equipment', icon: 'technology' }
];

const FACILITIES = [
  { name: 'Smart Treatment Rooms', description: 'Fully equipped treatment rooms with digital displays and entertainment systems', icon: 'room' },
  { name: 'Sterilization Center', description: 'Hospital-grade sterilization equipment ensuring highest hygiene standards', icon: 'sterilize' },
  { name: 'VIP Lounge', description: 'Comfortable waiting area with complimentary refreshments and WiFi', icon: 'lounge' },
  { name: 'Digital X-Ray', description: 'Low-radiation digital X-ray technology for accurate diagnosis', icon: 'xray' },
  { name: 'Intraoral Camera', description: 'See what the dentist sees on screen during examination', icon: 'camera' },
  { name: 'Free Parking', description: 'Ample parking space for patients and visitors', icon: 'parking' },
  { name: 'Wheelchair Access', description: 'Fully accessible facilities for patients with mobility needs', icon: 'accessible' },
  { name: 'Kids Play Area', description: 'Dedicated play area to keep children entertained', icon: 'playground' }
];

// ============================================
// Helper Functions
// ============================================

function log(step, message) {
  console.log(`[${step}] ${message}`);
}

function getCity(clinicNum) {
  if (clinicNum <= 2) return 'Jakarta Selatan';
  if (clinicNum <= 4) return 'Jakarta Pusat';
  if (clinicNum <= 6) return 'Jakarta Utara';
  if (clinicNum <= 8) return 'Jakarta Timur';
  return 'Jakarta Barat';
}

function getDistrict(clinicNum) {
  const districts = ['Kebayoran Baru', 'Menteng', 'Setiabudi', 'Kuningan', 'Penjaringan', 'Cilandak', 'Kelapa Gading', 'Pondok Indah', 'Pluit', 'Kebayoran Baru'];
  return districts[clinicNum - 1];
}

// ============================================
// Seed Functions
// ============================================

async function createUsers(client) {
  log('STEP 1', 'Creating users...');
  const users = [];

  // Create clinic owners and staff
  for (let i = 1; i <= 10; i++) {
    const clinicName = CLINIC_NAMES[i - 1];
    const domain = clinicName.toLowerCase().replace(/\s+/g, '');
    
    // Owner
    const ownerResult = await client.query(
      `INSERT INTO users (name, email, password_hash, roles, phone_number)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [`dr. ${clinicName} Owner`, `owner@${domain}.com`, PASSWORD_HASH, ['clinic_owner'], `+62 821-${String(i).padStart(4, '0')}-0001`]
    );
    users.push({ type: 'owner', clinicNum: i, id: ownerResult.rows[0].id });

    // Manager
    const managerResult = await client.query(
      `INSERT INTO users (name, email, password_hash, roles, phone_number)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [`Manager ${i}`, `manager@${domain}.com`, PASSWORD_HASH, ['clinic_staff'], `+62 821-${String(i).padStart(4, '0')}-0002`]
    );
    users.push({ type: 'manager', clinicNum: i, id: managerResult.rows[0].id });

    // Admin
    const adminResult = await client.query(
      `INSERT INTO users (name, email, password_hash, roles, phone_number)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [`Admin ${i}`, `admin@${domain}.com`, PASSWORD_HASH, ['clinic_staff'], `+62 821-${String(i).padStart(4, '0')}-0003`]
    );
    users.push({ type: 'admin', clinicNum: i, id: adminResult.rows[0].id });
  }

  // Create dentist users
  for (let clinic = 1; clinic <= 10; clinic++) {
    for (let dentist = 1; dentist <= 10; dentist++) {
      const firstName = DENTIST_FIRST_NAMES[dentist - 1];
      const lastName = DENTIST_LAST_NAMES[dentist - 1];
      const result = await client.query(
        `INSERT INTO users (name, email, password_hash, roles, phone_number)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [
          `dr. ${firstName} ${lastName}`,
          `dentist${dentist}.clinic${clinic}@dentists.com`,
          PASSWORD_HASH,
          ['dentist'],
          `+62 821-${String(clinic * 100 + dentist).padStart(4, '0')}-${String(dentist).padStart(4, '0')}`
        ]
      );
      users.push({ type: 'dentist', clinicNum: clinic, dentistNum: dentist, id: result.rows[0].id });
    }
  }

  log('STEP 1', `✅ Created ${users.length} users`);
  return users;
}

async function createClinicProfiles(client, users) {
  log('STEP 2', 'Creating clinic profiles...');
  const clinics = [];

  for (let i = 1; i <= 10; i++) {
    const owner = users.find(u => u.type === 'owner' && u.clinicNum === i);
    const clinicName = CLINIC_NAMES[i - 1];
    
    const result = await client.query(
      `INSERT INTO clinic_profiles (
        user_id, legal_name, brand_name, facility_type,
        street_address, city, province, postal_code, district,
        latitude, longitude,
        phone, email, timezone, operating_hours,
        owner_name, owner_position, owner_email, owner_whatsapp, owner_nik,
        ktp_file_path, ktp_selfie_file_path, nib_number, nib_file_path,
        npwp_number, npwp_file_path, operational_license_file_path,
        terms_accepted, privacy_accepted, is_verified, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31
      ) RETURNING id`,
      [
        owner.id,
        `${clinicName} - PT Dental Care Indonesia ${i}`,
        clinicName,
        i % 2 === 0 ? 'klinik_gigi' : 'rsgm',
        `Jl. Jendral Sudirman No. ${100 + i * 10}`,
        getCity(i),
        'DKI Jakarta',
        `1${String(2000 + i * 10).padStart(4, '0')}`,
        getDistrict(i),
        -6.2088 + (i * 0.01),
        106.8456 + (i * 0.01),
        `+62 21 555${String(i).padStart(4, '0')}`,
        `contact@${clinicName.toLowerCase().replace(/\s+/g, '')}.com`,
        'Asia/Jakarta',
        JSON.stringify({
          monday: '08:00-20:00',
          tuesday: '08:00-20:00',
          wednesday: '08:00-20:00',
          thursday: '08:00-20:00',
          friday: '08:00-20:00',
          saturday: '09:00-17:00',
          sunday: 'Closed'
        }),
        `dr. ${clinicName} Owner`,
        'owner',
        `owner@${clinicName.toLowerCase().replace(/\s+/g, '')}.com`,
        `+62 821-${String(i).padStart(4, '0')}-0001`,
        `3175${String(10000000 + i).padStart(12, '0')}`,
        `/uploads/clinics/ktp_${i}.jpg`,
        `/uploads/clinics/ktp_selfie_${i}.jpg`,
        `9120${String(200000 + i).padStart(9, '0')}`,
        `/uploads/clinics/nib_${i}.pdf`,
        `01.234.${String(i).padStart(3, '0')}.5-678.000`,
        `/uploads/clinics/npwp_${i}.pdf`,
        `/uploads/clinics/license_${i}.pdf`,
        true,
        true,
        true,
        'verified'
      ]
    );

    clinics.push({ clinicNum: i, id: result.rows[0].id, name: clinicName, lat: -6.2088 + (i * 0.01), lon: 106.8456 + (i * 0.01) });
  }

  log('STEP 2', `✅ Created ${clinics.length} clinic profiles`);
  return clinics;
}

async function createBranches(client, clinics) {
  log('STEP 3', 'Creating clinic branches...');
  const branches = [];
  const latOffsets = [-0.01, 0.01, -0.015, 0.015, -0.02, 0.02, -0.025, 0.025, -0.03, 0.03];
  const lonOffsets = [0.01, -0.01, 0.015, -0.015, 0.02, -0.02, 0.025, -0.025, 0.03, -0.03];

  for (const clinic of clinics) {
    for (let b = 1; b <= 10; b++) {
      const areaIndex = (b - 1) % 5;
      const area = AREAS[areaIndex][b - 1];
      const city = ['Jakarta Pusat', 'Jakarta Selatan', 'Jakarta Utara', 'Jakarta Timur', 'Jakarta Barat'][areaIndex];

      const result = await client.query(
        `INSERT INTO clinic_branches (
          clinic_profile_id, branch_name, branch_code, is_main_branch,
          street_address, city, province, postal_code, district,
          latitude, longitude, phone,
          treatment_rooms_count, has_sterilization, has_radiography,
          operating_hours, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING id`,
        [
          clinic.id,
          `${clinic.name} - ${area}`,
          `BR${String(clinic.id).padStart(3, '0')}-${String(b).padStart(2, '0')}`,
          b === 1,
          `Jl. ${area} No. ${100 + b * 10}`,
          city,
          'DKI Jakarta',
          `1${String(1000 + b * 10).padStart(4, '0')}`,
          area,
          clinic.lat + latOffsets[b - 1],
          clinic.lon + lonOffsets[b - 1],
          `+62 21 ${String(5000 + clinic.id * 100 + b).padStart(8, '0')}`,
          3 + (b % 5),
          true,
          true,
          JSON.stringify({
            monday: '08:00-20:00',
            tuesday: '08:00-20:00',
            wednesday: '08:00-20:00',
            thursday: '08:00-20:00',
            friday: '08:00-20:00',
            saturday: '09:00-17:00',
            sunday: 'Closed'
          }),
          true
        ]
      );

      branches.push({
        clinicId: clinic.id,
        branchNum: b,
        id: result.rows[0].id,
        isMain: b === 1
      });
    }
  }

  log('STEP 3', `✅ Created ${branches.length} branches`);
  return branches;
}

async function createStaff(client, clinics, branches, users) {
  log('STEP 4', 'Creating clinic staff for all branches...');
  let count = 0;

  for (const clinic of clinics) {
    const clinicBranches = branches.filter(b => b.clinicId === clinic.id);
    
    // Owner - assigned to main branch only (can access all branches)
    const owner = users.find(u => u.type === 'owner' && u.clinicNum === clinic.clinicNum);
    const mainBranch = clinicBranches.find(b => b.isMain);
    await client.query(
      `INSERT INTO clinic_staff (user_id, clinic_profile_id, assigned_branch_id, role, is_active)
       VALUES ($1, $2, $3, $4, $5)`,
      [owner.id, clinic.id, mainBranch.id, 'owner', true]
    );
    count++;

    // Manager - assigned to main branch (can access all branches)
    const manager = users.find(u => u.type === 'manager' && u.clinicNum === clinic.clinicNum);
    await client.query(
      `INSERT INTO clinic_staff (user_id, clinic_profile_id, assigned_branch_id, role, is_active)
       VALUES ($1, $2, $3, $4, $5)`,
      [manager.id, clinic.id, mainBranch.id, 'manager', true]
    );
    count++;

    // Admin - assigned to main branch (can access all branches)
    const admin = users.find(u => u.type === 'admin' && u.clinicNum === clinic.clinicNum);
    await client.query(
      `INSERT INTO clinic_staff (user_id, clinic_profile_id, assigned_branch_id, role, is_active)
       VALUES ($1, $2, $3, $4, $5)`,
      [admin.id, clinic.id, mainBranch.id, 'admin', true]
    );
    count++;

    // Create additional staff for each non-main branch
    const nonMainBranches = clinicBranches.filter(b => !b.isMain);
    for (let i = 0; i < nonMainBranches.length; i++) {
      const branch = nonMainBranches[i];
      const branchNum = branch.branchNum;
      
      // Create branch manager
      const branchManagerResult = await client.query(
        `INSERT INTO users (name, email, password_hash, roles, phone_number)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [
          `Branch Manager ${branchNum}`,
          `manager.branch${branchNum}@${CLINIC_NAMES[clinic.clinicNum - 1].toLowerCase().replace(/\s+/g, '')}.com`,
          PASSWORD_HASH,
          ['clinic_staff'],
          `+62 822-${String(clinic.clinicNum).padStart(2, '0')}${String(branchNum).padStart(2, '0')}-0001`
        ]
      );
      
      await client.query(
        `INSERT INTO clinic_staff (user_id, clinic_profile_id, assigned_branch_id, role, is_active)
         VALUES ($1, $2, $3, $4, $5)`,
        [branchManagerResult.rows[0].id, clinic.id, branch.id, 'manager', true]
      );
      count++;

      // Create branch admin
      const branchAdminResult = await client.query(
        `INSERT INTO users (name, email, password_hash, roles, phone_number)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [
          `Branch Admin ${branchNum}`,
          `admin.branch${branchNum}@${CLINIC_NAMES[clinic.clinicNum - 1].toLowerCase().replace(/\s+/g, '')}.com`,
          PASSWORD_HASH,
          ['clinic_staff'],
          `+62 822-${String(clinic.clinicNum).padStart(2, '0')}${String(branchNum).padStart(2, '0')}-0002`
        ]
      );
      
      await client.query(
        `INSERT INTO clinic_staff (user_id, clinic_profile_id, assigned_branch_id, role, is_active)
         VALUES ($1, $2, $3, $4, $5)`,
        [branchAdminResult.rows[0].id, clinic.id, branch.id, 'admin', true]
      );
      count++;
    }
  }

  log('STEP 4', `✅ Created ${count} staff members across all branches`);
}

async function createDentistProfiles(client, clinics, branches, users) {
  log('STEP 5', 'Creating dentist profiles...');
  const dentists = [];

  for (const clinic of clinics) {
    const clinicBranches = branches.filter(b => b.clinicId === clinic.id);
    
    for (let d = 1; d <= 10; d++) {
      const dentistUser = users.find(u => u.type === 'dentist' && u.clinicNum === clinic.clinicNum && u.dentistNum === d);
      const branch = clinicBranches[(d - 1) % 10];
      const specialty = SPECIALTIES[d - 1];

      const branchData = await client.query('SELECT * FROM clinic_branches WHERE id = $1', [branch.id]);
      const branchRow = branchData.rows[0];

      const result = await client.query(
        `INSERT INTO dentist_profiles (
          user_id, clinic_id, dentist_type, is_clinic_owner,
          title, license_number, license_issuing_body, license_expiry_date,
          registration_number, primary_specialization, education_qualification,
          years_of_experience, clinic_name, clinic_address, clinic_working_hours,
          consultation_types, services_offered, consultation_fee,
          accepts_insurance, accepts_bpjs, emergency_availability,
          is_verified,
          latitude, longitude, district, province, postal_code, city
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28
        ) RETURNING id`,
        [
          dentistUser.id,
          clinic.id,
          'clinic',
          false,
          'dr.',
          `LIC-${String(clinic.clinicNum * 10000 + d).padStart(8, '0')}`,
          'Indonesian Dental Association',
          new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000), // 2 years from now
          `REG-${String(clinic.clinicNum * 10000 + d).padStart(10, '0')}`,
          specialty,
          `DDS from University of Indonesia${d > 5 ? ', Specialist in ' + specialty : ''}`,
          5 + (d % 15),
          clinic.name,
          branchRow.street_address,
          '{"monday": "08:00-17:00", "tuesday": "08:00-17:00", "wednesday": "08:00-17:00", "thursday": "08:00-17:00", "friday": "08:00-17:00"}',
          ['in-person', 'teleconsultation'],
          ['Consultation', 'Cleaning', 'Filling', 'Root Canal', 'Extraction'],
          150000 + (d * 50000),
          true,
          true,
          d <= 3,
          true,
          branchRow.latitude,
          branchRow.longitude,
          branchRow.district,
          branchRow.province,
          branchRow.postal_code,
          branchRow.city
        ]
      );

      dentists.push({
        id: result.rows[0].id,
        userId: dentistUser.id,
        clinicId: clinic.id,
        branchId: branch.id,
        specialty
      });
    }
  }

  log('STEP 5', `✅ Created ${dentists.length} dentist profiles`);
  return dentists;
}

async function assignDentistsToStaff(client, dentists) {
  log('STEP 5b', 'Adding dentists to clinic_staff...');
  let count = 0;

  for (const dentist of dentists) {
    await client.query(
      `INSERT INTO clinic_staff (user_id, clinic_profile_id, assigned_branch_id, role, is_active)
       VALUES ($1, $2, $3, $4, $5)`,
      [dentist.userId, dentist.clinicId, dentist.branchId, 'dentist', true]
    );
    count++;
  }

  log('STEP 5b', `✅ Added ${count} dentists to clinic_staff`);
}

async function createServices(client, branches) {
  log('STEP 6', 'Creating clinic services...');
  const services = [];

  for (const branch of branches) {
    for (const service of SERVICES) {
      const result = await client.query(
        `INSERT INTO clinic_services (
          clinic_branch_id, name, description, base_price, category,
          specialty, duration_minutes, is_active, is_available_for_all_dentists
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [
          branch.id,
          service.name,
          service.description,
          service.base_price,
          service.category,
          service.specialty,
          service.duration,
          true,
          service.category === 'general'
        ]
      );

      services.push({
        id: result.rows[0].id,
        branchId: branch.id,
        category: service.category,
        specialty: service.specialty,
        basePrice: service.base_price
      });
    }
  }

  log('STEP 6', `✅ Created ${services.length} services`);
  return services;
}

async function assignServices(client, dentists, services) {
  log('STEP 7', 'Assigning services to dentists...');
  let count = 0;

  for (const dentist of dentists) {
    const branchServices = services.filter(s => s.branchId === dentist.branchId);
    
    // Assign general services
    const generalServices = branchServices.filter(s => s.category === 'general').slice(0, 6);
    for (const service of generalServices) {
      try {
        await client.query(
          `INSERT INTO service_dentist_assignments (
            clinic_service_id, dentist_profile_id, custom_price, is_available
          ) VALUES ($1, $2, $3, $4)`,
          [service.id, dentist.id, null, true]
        );
        count++;
      } catch (e) {
        // Skip duplicates
      }
    }

    // Assign specialty services
    const specialtyServices = branchServices.filter(s => s.category === 'specialist' && s.specialty === dentist.specialty).slice(0, 3);
    for (const service of specialtyServices) {
      try {
        await client.query(
          `INSERT INTO service_dentist_assignments (
            clinic_service_id, dentist_profile_id, custom_price, is_available
          ) VALUES ($1, $2, $3, $4)`,
          [service.id, dentist.id, Math.floor(service.basePrice * 1.2), true]
        );
        count++;
      } catch (e) {
        // Skip duplicates
      }
    }
  }

  log('STEP 7', `✅ Created ${count} service assignments`);
}

async function createGallery(client, branches) {
  log('STEP 8', 'Creating gallery images...');
  const imageTypes = ['hero', 'cover', 'facility', 'facility', 'general', 'general', 'general', 'general'];
  const captions = [
    'Welcome to our modern dental clinic',
    'State-of-the-art treatment rooms',
    'Comfortable waiting area',
    'Advanced dental equipment',
    'Our experienced dental team',
    'Patient care in action',
    'Sterilization room',
    'Reception area'
  ];
  let count = 0;

  for (const branch of branches) {
    for (let i = 0; i < 8; i++) {
      await client.query(
        `INSERT INTO clinic_gallery (
          clinic_branch_id, image_url, image_type, caption, display_order, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          branch.id,
          `https://images.unsplash.com/photo-${1600000000 + branch.id * 10 + i + 1}?w=800`,
          imageTypes[i],
          captions[i],
          i + 1,
          true
        ]
      );
      count++;
    }
  }

  log('STEP 8', `✅ Created ${count} gallery images`);
}

async function createHighlights(client, branches) {
  log('STEP 9', 'Creating highlights...');
  let count = 0;

  for (const branch of branches) {
    for (let i = 0; i < HIGHLIGHTS.length; i++) {
      await client.query(
        `INSERT INTO clinic_highlights (
          clinic_branch_id, highlight_text, icon, display_order, is_active
        ) VALUES ($1, $2, $3, $4, $5)`,
        [branch.id, HIGHLIGHTS[i].text, HIGHLIGHTS[i].icon, i + 1, true]
      );
      count++;
    }
  }

  log('STEP 9', `✅ Created ${count} highlights`);
}

async function createFacilities(client, branches) {
  log('STEP 10', 'Creating facilities...');
  let count = 0;

  for (const branch of branches) {
    for (let i = 0; i < FACILITIES.length; i++) {
      await client.query(
        `INSERT INTO clinic_facilities (
          clinic_branch_id, facility_name, description, icon, display_order, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [branch.id, FACILITIES[i].name, FACILITIES[i].description, FACILITIES[i].icon, i + 1, true]
      );
      count++;
    }
  }

  log('STEP 10', `✅ Created ${count} facilities`);
}

async function updateClinicIds(client) {
  log('STEP 11', 'Updating clinic_id in users table...');
  
  await client.query(`
    UPDATE users u
    SET clinic_id = cp.id
    FROM clinic_profiles cp
    WHERE u.id = cp.user_id
  `);

  await client.query(`
    UPDATE users u
    SET clinic_id = cs.clinic_profile_id
    FROM clinic_staff cs
    WHERE u.id = cs.user_id
  `);

  log('STEP 11', '✅ Updated clinic_id references');
}

// ============================================
// Main Function
// ============================================

async function main() {
  const client = await pool.connect();

  try {
    console.log('========================================');
    console.log('  COMPREHENSIVE CLINIC SEED');
    console.log('  Database:', process.env.DB_NAME || 'serene');
    console.log('  Date:', new Date().toISOString());
    console.log('========================================\n');

    // Start transaction
    await client.query('BEGIN');

    // Execute seeding steps
    const users = await createUsers(client);
    const clinics = await createClinicProfiles(client, users);
    const branches = await createBranches(client, clinics);
    await createStaff(client, clinics, branches, users);
    const dentists = await createDentistProfiles(client, clinics, branches, users);
    await assignDentistsToStaff(client, dentists);
    const services = await createServices(client, branches);
    await assignServices(client, dentists, services);
    await createGallery(client, branches);
    await createHighlights(client, branches);
    await createFacilities(client, branches);
    await updateClinicIds(client);

    // Commit transaction
    await client.query('COMMIT');

    // Print summary
    console.log('\n========================================');
    console.log('  SEED SUMMARY');
    console.log('========================================');
    const summary = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM clinic_profiles) as clinics,
        (SELECT COUNT(*) FROM clinic_branches) as branches,
        (SELECT COUNT(*) FROM clinic_staff) as staff,
        (SELECT COUNT(*) FROM dentist_profiles) as dentists,
        (SELECT COUNT(*) FROM clinic_services) as services,
        (SELECT COUNT(*) FROM service_dentist_assignments) as assignments,
        (SELECT COUNT(*) FROM clinic_gallery) as gallery,
        (SELECT COUNT(*) FROM clinic_highlights) as highlights,
        (SELECT COUNT(*) FROM clinic_facilities) as facilities
    `);

    const stats = summary.rows[0];
    console.log(`  Clinic Profiles: ${stats.clinics}`);
    console.log(`  Clinic Branches: ${stats.branches}`);
    console.log(`  Clinic Staff: ${stats.staff}`);
    console.log(`  Dentist Profiles: ${stats.dentists}`);
    console.log(`  Clinic Services: ${stats.services}`);
    console.log(`  Service Assignments: ${stats.assignments}`);
    console.log(`  Gallery Images: ${stats.gallery}`);
    console.log(`  Highlights: ${stats.highlights}`);
    console.log(`  Facilities: ${stats.facilities}`);
    console.log('========================================');
    console.log(`  Default password: ${PASSWORD}`);
    console.log('========================================\n');
    console.log('✅ Seed completed successfully!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Seed failed:', error.message);
    console.error('\nFull error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
