import express from 'express';
import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { query } from '../db.js';
import { signAccess, signRefresh, verify, authenticateToken } from '../utils/tokens.js';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import { OtpServiceError, sendPhoneOTP, sendEmailOTP, verifyOTP } from '../services/otp.service.js';
import { authLimiter, otpLimiter } from '../middleware/rate-limiter.js';
import { validate } from '../middleware/validate.js';
import {
  patientRegisterSchema,
  loginSchema,
  phoneOTPSchema,
  emailOTPSchema,
  verifyOTPSchema,
} from '../schemas/auth.schema.js';
import { APIError } from '../utils/error-codes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const prisma = new PrismaClient();

function ensureCorrelationId(req, res) {
  const correlationId = req.get('X-Correlation-Id') || req.get('X-Request-Id') || randomUUID();
  res.setHeader('X-Correlation-Id', correlationId);
  return correlationId;
}

function otpErrorResponse(error, correlationId, fallbackCode = 'OTP_INTERNAL_ERROR', fallbackMessage = 'Failed to process OTP request') {
  if (error instanceof OtpServiceError) {
    return {
      status: error.status,
      body: {
        error: {
          code: error.code,
          message: error.message,
          retryable: error.retryable,
          correlationId,
          details: error.details || {}
        }
      }
    };
  }

  return {
    status: 500,
    body: {
      error: {
        code: fallbackCode,
        message: fallbackMessage,
        retryable: false,
        correlationId,
        details: {}
      }
    }
  };
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let subFolder = '';
    
    // Determine subfolder based on field name
    switch (file.fieldname) {
      case 'sipFile':
        subFolder = 'sip';
        break;
      case 'strFile':
        subFolder = 'str';
        break;
      case 'ijazahFiles':
        subFolder = 'ijazah';
        break;
      case 'certificationFiles':
        subFolder = 'certification';
        break;
      case 'avatar':
        subFolder = '../avatars';
        break;
      default:
        subFolder = 'other';
    }
    
    const uploadPath = file.fieldname === 'avatar' 
      ? path.join(process.cwd(), 'uploads', 'avatars')
      : path.join(process.cwd(), 'uploads', 'documents', subFolder);
    
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp_originalname
    const uniqueName = `${Date.now()}_${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only PDF and image files
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed. Only PDF and images are accepted.'));
    }
  }
});

// Helper: find user by email
async function findUserByEmail(email) {
  const { rows } = await query(
    `select id, email, password_hash, roles, name, phone_number, about, avatar_url, last_login_at, clinic_id
     from users where email = $1`,
    [email]
  );
  return rows[0] || null;
}

// Helper: get public view
function publicUser(u) {
  if (!u) return null;
  return { 
    id: u.id, 
    email: u.email, 
    name: u.name, 
    phoneNumber: u.phone_number, 
    about: u.about, 
    roles: u.roles || [],
    avatar_url: u.avatar_url,
    lastLoginAt: u.last_login_at
  };
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeOptionalString(value) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  if (value === null || value === undefined) {
    return null;
  }
  return value;
}

function normalizeDate(value) {
  if (!value) return null;
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }
  return null;
}

function normalizeStringArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map(item => typeof item === 'string' ? item.trim() : item)
      .filter(item => {
        if (typeof item === 'string') {
          return item.length > 0;
        }
        return Boolean(item);
      });
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map(item => typeof item === 'string' ? item.trim() : item)
          .filter(item => {
            if (typeof item === 'string') {
              return item.length > 0;
            }
            return Boolean(item);
          });
      }
    } catch (_) {
      // Fallback to comma separated list
    }
    return trimmed.split(',').map(item => item.trim()).filter(Boolean);
  }
  return [];
}

router.post('/patient/register', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phoneNumber,
      dateOfBirth,
      gender,
      insuranceProvider,
      insuranceNumber,
      insuranceMemberId,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelationship,
      addressLine1,
      addressLine2,
      city,
      province,
      postalCode,
      medicalNotes,
      allergies,
      chronicConditions,
      medications,
      preferredLanguage
    } = req.body || {};

    const errors = [];

    const normalizedName = normalizeOptionalString(name);
    if (!normalizedName) errors.push('Name is required');

    const normalizedEmail = normalizeOptionalString(email)?.toLowerCase();
    if (!normalizedEmail) {
      errors.push('Email is required');
    } else if (!emailRegex.test(normalizedEmail)) {
      errors.push('Email is invalid');
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }

    const normalizedPhoneNumber = normalizeOptionalString(phoneNumber);
    if (!normalizedPhoneNumber) {
      errors.push('Phone number is required');
    }

    const normalizedDob = normalizeDate(dateOfBirth);
    if (dateOfBirth && !normalizedDob) {
      errors.push('Date of birth must be a valid date (YYYY-MM-DD)');
    }

    if (errors.length) {
      return res.status(400).json({ message: 'Validation error', errors });
    }

    // Check if email already exists - CRITICAL SECURITY CHECK
    console.log('🔍 [PATIENT REGISTRATION] Checking if email already exists:', normalizedEmail);
    const existing = await findUserByEmail(normalizedEmail);
    if (existing) {
      console.error('❌ [PATIENT REGISTRATION] BLOCKED - Email already registered!');
      console.error('❌ Attempted email:', normalizedEmail);
      console.error('❌ Existing user ID:', existing.id);
      console.error('❌ Existing user roles:', existing.roles);
      console.error('❌ Registration attempt from IP:', req.ip || req.connection.remoteAddress);
      return res.status(409).json({ 
        message: 'Email already registered',
        error: 'DUPLICATE_EMAIL',
        details: 'Email ini sudah terdaftar. Silakan gunakan email lain atau login dengan akun yang sudah ada.'
      });
    }
    console.log('✅ [PATIENT REGISTRATION] Email is available:', normalizedEmail);

    await query('BEGIN');

    try {
      const passwordHash = await bcrypt.hash(password, 10);
      const roles = ['patient'];

      const userResult = await query(
        `INSERT INTO users(name, email, password_hash, roles, phone_number)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, email, roles, phone_number, about, avatar_url, last_login_at`,
        [normalizedName, normalizedEmail, passwordHash, roles, normalizedPhoneNumber]
      );
      const user = userResult.rows[0];

      let normalizedGender = normalizeOptionalString(gender);
      if (normalizedGender) {
        normalizedGender = normalizedGender.toLowerCase();
      }

      const normalizedInsuranceProvider = normalizeOptionalString(insuranceProvider);
      const normalizedInsuranceNumber = normalizeOptionalString(insuranceNumber);
      const normalizedInsuranceMemberId = normalizeOptionalString(insuranceMemberId);

      const emergencyContact = {};
      const ecName = normalizeOptionalString(emergencyContactName);
      const ecPhone = normalizeOptionalString(emergencyContactPhone);
      const ecRelationship = normalizeOptionalString(emergencyContactRelationship);
      if (ecName) emergencyContact.name = ecName;
      if (ecPhone) emergencyContact.phone = ecPhone;
      if (ecRelationship) emergencyContact.relationship = ecRelationship;
      const emergencyContactJson = Object.keys(emergencyContact).length ? emergencyContact : null;

      const address = {};
      const addrLine1 = normalizeOptionalString(addressLine1);
      const addrLine2 = normalizeOptionalString(addressLine2);
      const addrCity = normalizeOptionalString(city);
      const addrProvince = normalizeOptionalString(province);
      const addrPostalCode = normalizeOptionalString(postalCode);
      if (addrLine1) address.line1 = addrLine1;
      if (addrLine2) address.line2 = addrLine2;
      if (addrCity) address.city = addrCity;
      if (addrProvince) address.province = addrProvince;
      if (addrPostalCode) address.postalCode = addrPostalCode;
      const addressJson = Object.keys(address).length ? address : null;

      const medicalDetails = {};
      const notes = normalizeOptionalString(medicalNotes);
      const allergiesList = normalizeStringArray(allergies);
      const chronicConditionsList = normalizeStringArray(chronicConditions);
      const medicationsList = normalizeStringArray(medications);
      if (notes) medicalDetails.notes = notes;
      if (allergiesList.length) medicalDetails.allergies = allergiesList;
      if (chronicConditionsList.length) medicalDetails.chronicConditions = chronicConditionsList;
      if (medicationsList.length) medicalDetails.medications = medicationsList;
      const medicalDetailsJson = Object.keys(medicalDetails).length ? medicalDetails : null;

      let normalizedPreferredLanguage = normalizeOptionalString(preferredLanguage) || 'id';
      normalizedPreferredLanguage = normalizedPreferredLanguage.toLowerCase();
      if (normalizedPreferredLanguage.length > 8) {
        normalizedPreferredLanguage = normalizedPreferredLanguage.slice(0, 8);
      }

      await query(
        `INSERT INTO patient_profiles(
          user_id,
          date_of_birth,
          gender,
          insurance_provider,
          insurance_number,
          insurance_member_id,
          emergency_contact,
          address,
          medical_details,
          preferred_language
        ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10)`,
        [
          user.id,
          normalizedDob,
          normalizedGender,
          normalizedInsuranceProvider,
          normalizedInsuranceNumber,
          normalizedInsuranceMemberId,
          emergencyContactJson ? JSON.stringify(emergencyContactJson) : null,
          addressJson ? JSON.stringify(addressJson) : null,
          medicalDetailsJson ? JSON.stringify(medicalDetailsJson) : null,
          normalizedPreferredLanguage
        ]
      );

      const accessToken = signAccess(user);
      const refreshToken = signRefresh(user);

      await query(
        'INSERT INTO refresh_tokens(user_id, token) VALUES ($1, $2)',
        [user.id, refreshToken]
      );

      await query('COMMIT');

      return res.status(201).json({
        accessToken,
        refreshToken,
        user: publicUser(user),
        patientProfile: {
          dateOfBirth: normalizedDob,
          gender: normalizedGender,
          insuranceProvider: normalizedInsuranceProvider,
          insuranceNumber: normalizedInsuranceNumber,
          insuranceMemberId: normalizedInsuranceMemberId,
          emergencyContact: emergencyContactJson,
          address: addressJson,
          medicalDetails: medicalDetailsJson,
          preferredLanguage: normalizedPreferredLanguage
        }
      });
    } catch (error) {
      await query('ROLLBACK');
      console.error('Patient registration failed:', error);
      return res.status(500).json({ message: 'Server error during patient registration' });
    }
  } catch (error) {
    console.error('Unexpected error in patient registration:', error);
    return res.status(500).json({ message: 'Server error during patient registration' });
  }
});

router.post('/register', upload.fields([
  { name: 'sipFile', maxCount: 1 },
  { name: 'strFile', maxCount: 1 },
  { name: 'ijazahFiles', maxCount: 5 },
  { name: 'certificationFiles', maxCount: 10 }
]), async (req, res) => {
  console.log('\n=== REGISTRATION REQUEST RECEIVED ===');
  console.log('Request body keys:', Object.keys(req.body));
  console.log('Request files:', Object.keys(req.files || {}));
  console.log('Full request body:', req.body);
  console.log('=====================================\n');
  
  try {
    console.log('Starting registration process...');
    
    const { 
      // Personal Information
      name, email, password, phoneNumber, about,
      
      // Professional Information
      title, licenseNumber, licenseIssuingBody, licenseExpiryDate, 
      registrationNumber, primarySpecialization, educationQualification, 
      yearsOfExperience: yearsOfExperienceRaw,
      
      // Clinic Information
      clinicName, clinicAddress, clinicWorkingHours, 
      
      // Geolocation Information
      city, district, province, postalCode, latitude, longitude,
      
      // Optional Information
      consultationFee, acceptsInsurance, acceptsBPJS, emergencyAvailability,
      
      // Registration Type (for clinic staff assignment)
      registrationType, clinicId, branchId
    } = req.body || {};
    
    console.log('\n=== EXTRACTED FIELDS ===');
    console.log('Personal:', { name, email, phoneNumber, about });
    console.log('Professional:', { title, licenseNumber, licenseIssuingBody, licenseExpiryDate, registrationNumber, primarySpecialization, educationQualification, yearsOfExperienceRaw });
    console.log('Clinic:', { clinicName, clinicAddress, clinicWorkingHours });
    console.log('Optional:', { consultationFee, acceptsInsurance, acceptsBPJS, emergencyAvailability });
    console.log('Registration:', { registrationType, clinicId, branchId });
    console.log('========================\n');

    // Convert yearsOfExperience to number
    const yearsOfExperience = parseInt(yearsOfExperienceRaw) || 0;

    // Parse JSON fields
    let parsedWorkingHours;
    try {
      parsedWorkingHours = clinicWorkingHours ? JSON.parse(clinicWorkingHours) : null;
    } catch (e) {
      parsedWorkingHours = clinicWorkingHours; // fallback to original value
    }

    // Extract array fields from FormData - handle JSON strings from frontend
    let consultationTypes = [];
    let servicesOffered = [];
    
    console.log('Raw consultationTypes from FormData:', req.body.consultationTypes);
    console.log('Raw servicesOffered from FormData:', req.body.servicesOffered);
    
    // Try to parse JSON strings first (new format from frontend)
    try {
      if (req.body.consultationTypes) {
        consultationTypes = JSON.parse(req.body.consultationTypes);
        console.log('Parsed consultationTypes (JSON):', consultationTypes);
      }
    } catch (e) {
      console.log('Failed to parse consultationTypes as JSON, trying manual parsing');
      // Fallback to manual parsing for backward compatibility
      for (const key in req.body) {
        if (key.startsWith('consultationTypes[')) {
          consultationTypes.push(req.body[key]);
        }
      }
      console.log('Parsed consultationTypes (manual):', consultationTypes);
    }
    
    try {
      if (req.body.servicesOffered) {
        servicesOffered = JSON.parse(req.body.servicesOffered);
        console.log('Parsed servicesOffered (JSON):', servicesOffered);
      }
    } catch (e) {
      console.log('Failed to parse servicesOffered as JSON, trying manual parsing');
      // Fallback to manual parsing for backward compatibility
      for (const key in req.body) {
        if (key.startsWith('servicesOffered[')) {
          servicesOffered.push(req.body[key]);
        }
      }
      console.log('Parsed servicesOffered (manual):', servicesOffered);
    }
    
    console.log('Final parsed arrays:', { consultationTypes, servicesOffered });

    // Get uploaded files
    console.log('\n=== FILES EXTRACTION DEBUG ===');
    console.log('req.files exists:', !!req.files);
    console.log('req.files keys:', Object.keys(req.files || {}));
    console.log('req.files full object:', req.files);
    
    const files = req.files || {};
    console.log('files object after assignment:', files);
    
    const sipFile = files.sipFile?.[0];
    console.log('sipFile extraction result:', sipFile);
    
    const strFile = files.strFile?.[0];
    console.log('strFile extraction result:', strFile);
    
    const ijazahFiles = files.ijazahFiles || [];
    console.log('ijazahFiles extraction result:', ijazahFiles);
    
    const certificationFiles = files.certificationFiles || [];
    console.log('certificationFiles extraction result:', certificationFiles);
    console.log('===============================\n');

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Missing basic user fields' });
    }

    // Validate professional fields (required for dentists)
    const requiredProfessionalFields = {
      title, licenseNumber, licenseIssuingBody, licenseExpiryDate,
      registrationNumber, primarySpecialization, educationQualification,
      yearsOfExperience, clinicName, clinicAddress, clinicWorkingHours,
      consultationTypes, servicesOffered
    };
    
    console.log('Validating professional fields for dentist...');
    console.log('Required professional fields:', Object.keys(requiredProfessionalFields));
    console.log('Available fields in req.body:', Object.keys(req.body));
    
    const missingProfessionalFields = [];
    
    if (!title) {
      console.log('Field "title": MISSING (value:', title, ')');
      missingProfessionalFields.push('title');
    } else {
      console.log('Field "title": PRESENT (value:', title, ')');
    }
    
    if (!licenseNumber) {
      console.log('Field "licenseNumber": MISSING (value:', licenseNumber, ')');
      missingProfessionalFields.push('licenseNumber');
    } else {
      console.log('Field "licenseNumber": PRESENT (value:', licenseNumber, ')');
    }
    
    if (!licenseIssuingBody) {
      console.log('Field "licenseIssuingBody": MISSING (value:', licenseIssuingBody, ')');
      missingProfessionalFields.push('licenseIssuingBody');
    } else {
      console.log('Field "licenseIssuingBody": PRESENT (value:', licenseIssuingBody, ')');
    }
    
    if (!licenseExpiryDate) {
      console.log('Field "licenseExpiryDate": MISSING (value:', licenseExpiryDate, ')');
      missingProfessionalFields.push('licenseExpiryDate');
    } else {
      console.log('Field "licenseExpiryDate": PRESENT (value:', licenseExpiryDate, ')');
    }
    
    if (!registrationNumber) {
      console.log('Field "registrationNumber": MISSING (value:', registrationNumber, ')');
      missingProfessionalFields.push('registrationNumber');
    } else {
      console.log('Field "registrationNumber": PRESENT (value:', registrationNumber, ')');
    }
    
    if (!primarySpecialization) {
      console.log('Field "primarySpecialization": MISSING (value:', primarySpecialization, ')');
      missingProfessionalFields.push('primarySpecialization');
    } else {
      console.log('Field "primarySpecialization": PRESENT (value:', primarySpecialization, ')');
    }
    
    if (!educationQualification) {
      console.log('Field "educationQualification": MISSING (value:', educationQualification, ')');
      missingProfessionalFields.push('educationQualification');
    } else {
      console.log('Field "educationQualification": PRESENT (value:', educationQualification, ')');
    }
    
    if (yearsOfExperience === undefined || yearsOfExperience === null) {
      console.log('Field "yearsOfExperience": MISSING (value:', yearsOfExperience, ')');
      missingProfessionalFields.push('yearsOfExperience');
    } else {
      console.log('Field "yearsOfExperience": PRESENT (value:', yearsOfExperience, ')');
    }
    
    if (!clinicName) {
      console.log('Field "clinicName": MISSING (value:', clinicName, ')');
      missingProfessionalFields.push('clinicName');
    } else {
      console.log('Field "clinicName": PRESENT (value:', clinicName, ')');
    }
    
    if (!clinicAddress) {
      console.log('Field "clinicAddress": MISSING (value:', clinicAddress, ')');
      missingProfessionalFields.push('clinicAddress');
    } else {
      console.log('Field "clinicAddress": PRESENT (value:', clinicAddress, ')');
    }
    
    if (!clinicWorkingHours) {
      console.log('Field "clinicWorkingHours": MISSING (value:', clinicWorkingHours, ')');
      missingProfessionalFields.push('clinicWorkingHours');
    } else {
      console.log('Field "clinicWorkingHours": PRESENT (value:', clinicWorkingHours, ')');
    }
    
    if (!consultationTypes?.length) {
      console.log('Field "consultationTypes": MISSING or EMPTY (value:', consultationTypes, ')');
      missingProfessionalFields.push('consultationTypes');
    } else {
      console.log('Field "consultationTypes": PRESENT (value:', consultationTypes, ')');
    }
    
    if (!servicesOffered?.length) {
      console.log('Field "servicesOffered": MISSING or EMPTY (value:', servicesOffered, ')');
      missingProfessionalFields.push('servicesOffered');
    } else {
      console.log('Field "servicesOffered": PRESENT (value:', servicesOffered, ')');
    }
    
    if (missingProfessionalFields.length > 0) {
      console.log('Missing professional fields:', missingProfessionalFields);
      return res.status(400).json({ message: `Missing required professional fields: ${missingProfessionalFields.join(', ')}` });
    }
    
    console.log('All professional fields validation passed!');

    // Validate required documents
    if (!sipFile) {
      return res.status(400).json({ message: 'SIP document is required' });
    }
    if (!strFile) {
      return res.status(400).json({ message: 'STR document is required' });
    }
    if (!ijazahFiles || ijazahFiles.length === 0) {
      return res.status(400).json({ message: 'At least one diploma document is required' });
    }

    // Validate data types and ranges
    if (yearsOfExperience < 0 || yearsOfExperience > 60) {
      return res.status(400).json({ message: 'Years of experience must be between 0-60' });
    }

    // Check if user already exists - CRITICAL SECURITY CHECK
    console.log('🔍 Checking if email already exists:', email);
    const existing = await findUserByEmail(email);
    if (existing) {
      console.error('❌ REGISTRATION BLOCKED - Email already registered!');
      console.error('❌ Attempted email:', email);
      console.error('❌ Existing user ID:', existing.id);
      console.error('❌ Existing user roles:', existing.roles);
      console.error('❌ Registration attempt from IP:', req.ip || req.connection.remoteAddress);
      return res.status(409).json({ 
        message: 'Email already registered',
        error: 'DUPLICATE_EMAIL',
        details: 'This email is already associated with an account. Please use a different email or login with existing credentials.'
      });
    }
    console.log('✅ Email is available:', email);

    // Check if license number or registration number already exists
    console.log('🔍 Checking if license/registration number already exists...');
    const existingLicense = await query(
      'SELECT id FROM dentist_profiles WHERE license_number = $1 OR registration_number = $2',
      [licenseNumber, registrationNumber]
    );
    if (existingLicense.rows.length > 0) {
      console.error('❌ REGISTRATION BLOCKED - License/Registration number already exists!');
      console.error('❌ Attempted license number:', licenseNumber);
      console.error('❌ Attempted registration number:', registrationNumber);
      console.error('❌ Registration attempt from IP:', req.ip || req.connection.remoteAddress);
      return res.status(409).json({ 
        message: 'License number or registration number already exists',
        error: 'DUPLICATE_LICENSE',
        details: 'A dentist profile with this license or registration number already exists in our system.'
      });
    }
    console.log('✅ License and registration numbers are available');

    // Start transaction
    console.log('Starting database transaction...');
    await query('BEGIN');
    console.log('Database transaction started successfully');

    let transactionCommitted = false; // Track if we've committed the transaction
    try {
      // Create user
      console.log('Creating user in database...');
      console.log('User data:', { name, email, phoneNumber, about });
      
      const hash = await bcrypt.hash(password, 10);
      const roles = ['dentist'];
      const userResult = await query(
        'INSERT INTO users(name, email, password_hash, roles, phone_number, about) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, roles',
        [name, email, hash, roles, phoneNumber, about]
      );
      const user = userResult.rows[0];
      
      console.log('User created successfully:', { id: user.id, email: user.email, roles: user.roles });

      // Create dentist profile with document paths
      console.log('Creating dentist profile...');
      console.log('Profile data:', {
        user_id: user.id,
        title, licenseNumber, licenseIssuingBody, licenseExpiryDate,
        registrationNumber, primarySpecialization, educationQualification,
        yearsOfExperience: parseInt(yearsOfExperience),
        clinicName, clinicAddress,
        parsedWorkingHours, consultationTypes, servicesOffered,
        consultationFee: consultationFee ? parseInt(consultationFee) : null,
        acceptsInsurance: acceptsInsurance === 'true',
        acceptsBPJS: acceptsBPJS === 'true',
        emergencyAvailability: emergencyAvailability === 'true'
      });
      
      // Debug file objects before creating paths
      console.log('\n=== FILE OBJECTS DEBUG ===');
      console.log('sipFile object:', sipFile);
      console.log('sipFile filename:', sipFile?.filename);
      console.log('strFile object:', strFile);
      console.log('strFile filename:', strFile?.filename);
      console.log('ijazahFiles array:', ijazahFiles);
      console.log('ijazahFiles filenames:', ijazahFiles.map(f => f?.filename));
      console.log('certificationFiles array:', certificationFiles);
      console.log('certificationFiles filenames:', certificationFiles.map(f => f?.filename));
      console.log('========================\n');
      
      await query(
        `INSERT INTO dentist_profiles(
          user_id, title, license_number, license_issuing_body, license_expiry_date,
          registration_number, primary_specialization, education_qualification, years_of_experience,
          clinic_name, clinic_address, clinic_working_hours, consultation_types, services_offered,
          consultation_fee, accepts_insurance, accepts_bpjs, emergency_availability,
          city, district, province, postal_code, latitude, longitude, dentist_type,
          sip_file_path, str_file_path, ijazah_file_paths, certification_file_paths
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)`,
        [user.id, title, licenseNumber, licenseIssuingBody, licenseExpiryDate,
          registrationNumber, primarySpecialization, educationQualification, parseInt(yearsOfExperience),
          clinicName, clinicAddress, parsedWorkingHours, consultationTypes, servicesOffered,
          consultationFee ? parseInt(consultationFee) : null, 
          acceptsInsurance === 'true', acceptsBPJS === 'true', emergencyAvailability === 'true',
          city || null,
          district || null,
          province || null,
          postalCode || null,
          latitude ? parseFloat(latitude) : null,
          longitude ? parseFloat(longitude) : null,
          'independent', // Default to independent for web registration
          sipFile ? `uploads/documents/sip/${sipFile.filename}` : null,
          strFile ? `uploads/documents/str/${strFile.filename}` : null,
          ijazahFiles.map(f => `uploads/documents/ijazah/${f.filename}`),
          certificationFiles.map(f => `uploads/documents/certification/${f.filename}`)
        ]
      );
      
      console.log('Dentist profile created successfully!');

      // Commit transaction FIRST - before clinic staff assignment
      // This is critical because Prisma uses a different connection and needs the user to exist
      console.log('💾 Committing transaction to save user and dentist profile...');
      await query('COMMIT');
      transactionCommitted = true; // Mark as committed
      console.log('✅ Transaction committed - user and dentist profile saved to database');

      // Handle clinic staff assignment for clinic-staff registration type
      // This happens AFTER commit so the user.id foreign key exists
      console.log('🔍 Checking clinic staff assignment conditions...', {
        registrationType,
        hasClinicId: !!clinicId,
        clinicId,
        branchId,
        conditionResult: (registrationType === 'clinic-staff' && clinicId)
      });
      
      if (registrationType === 'clinic-staff' && clinicId) {
        console.log('🏥 Adding dentist to clinic staff...', { registrationType, clinicId, branchId });
        
        try {
          // Convert clinicId and branchId to BigInt if provided
          const clinicIdBigInt = BigInt(clinicId);
          const branchIdBigInt = branchId ? BigInt(branchId) : null;
          
          // Insert into clinic_staff table using Prisma
          // User is already committed to database, so foreign key will work
          const clinicStaffRecord = await prisma.clinicStaff.create({
            data: {
              clinicProfileId: clinicIdBigInt,
              userId: BigInt(user.id),
              role: 'dentist',
              isActive: true,
              hireDate: new Date(),
              positionTitle: title || 'Dentist',
              department: 'Medical',
              assignedBranchId: branchIdBigInt,
              permissions: {}
            }
          });
          
          console.log('✅ Dentist successfully added to clinic staff!', { 
            id: clinicStaffRecord.id.toString(),
            clinicProfileId: clinicStaffRecord.clinicProfileId.toString(),
            userId: clinicStaffRecord.userId.toString(),
            role: clinicStaffRecord.role
          });
        } catch (clinicStaffError) {
          console.error('❌ Error adding dentist to clinic staff:');
          console.error('Error name:', clinicStaffError.name);
          console.error('Error message:', clinicStaffError.message);
          console.error('Error code:', clinicStaffError.code);
          console.error('Full error:', clinicStaffError);
          
          // If clinic staff assignment fails, we should still return success
          // because the dentist profile was created successfully
          console.warn('⚠️ Dentist profile created but clinic staff assignment failed');
          console.warn('⚠️ User will need to be manually assigned to clinic staff');
        }
      } else {
        console.log('ℹ️ Skipping clinic staff assignment - conditions not met:', {
          registrationType,
          hasClinicId: !!clinicId,
          reason: !registrationType ? 'no registrationType' :
                  registrationType !== 'clinic-staff' ? 'registrationType not clinic-staff' :
                  !clinicId ? 'no clinicId' : 'unknown'
        });
      }

      // Return success response with file information
      const uploadedFiles = {
        sipFile: sipFile ? {
          filename: sipFile.filename,
          originalName: sipFile.originalname,
          size: sipFile.size,
          path: `uploads/documents/sip/${sipFile.filename}`
        } : null,
        strFile: strFile ? {
          filename: strFile.filename,
          originalName: strFile.originalname,
          size: strFile.size,
          path: `uploads/documents/str/${strFile.filename}`
        } : null,
        ijazahFiles: ijazahFiles.map(f => ({
          filename: f.filename,
          originalName: f.originalname,
          size: f.size,
          path: `uploads/documents/ijazah/${f.filename}`
        })),
        certificationFiles: certificationFiles.map(f => ({
          filename: f.filename,
          originalName: f.originalname,
          size: f.size,
          path: `uploads/documents/certification/${f.filename}`
        }))
      };

      return res.json({ 
        ok: true, 
        user: publicUser(user),
        uploadedFiles 
      });
    } catch (error) {
      // Only rollback if transaction hasn't been committed yet
      if (!transactionCommitted) {
        console.error('❌ Error occurred before commit, rolling back transaction...');
        await query('ROLLBACK');
        console.error('✅ Transaction rolled back');
      } else {
        console.error('❌ Error occurred after commit, transaction already saved');
        console.error('❌ User and dentist profile are saved but clinic staff assignment failed');
      }
      
      // Clean up uploaded files if transaction fails
      const files = req.files || {};
      const allFiles = [
        ...(files.sipFile || []),
        ...(files.strFile || []),
        ...(files.ijazahFiles || []),
        ...(files.certificationFiles || [])
      ];
      
      allFiles.forEach(file => {
        try {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (cleanupError) {
          console.error('Error cleaning up file:', cleanupError);
        }
      });
      
      throw error;
    }
  } catch (e) {
    console.error('Registration error:', e);
    return res.status(500).json({ message: 'Server error during registration' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'Email dan password harus diisi' });

    const user = await findUserByEmail(email);
    if (!user) return res.status(401).json({ message: 'Email tidak ditemukan. Silakan periksa kembali email Anda atau daftar akun baru.' });
    
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ message: 'Password salah. Silakan periksa kembali password Anda.' });

    // Check if user is a dentist and if so, verify they are verified
    console.log('🔍 User roles:', user.roles, 'User ID:', user.id);
    if (user.roles && user.roles.includes('dentist')) {
      console.log('🦷 User is a dentist, checking verification...');
      const prisma = new PrismaClient();
      try {
        const profile = await prisma.dentistProfile.findFirst({
          where: { userId: BigInt(user.id) },
          select: { isVerified: true }
        });
        
        console.log('🔍 Dentist profile:', profile);
        
        if (!profile || !profile.isVerified) {
          console.log('❌ Dentist not verified, blocking login');
          return res.status(403).json({ 
            message: 'Akun Anda belum diverifikasi. Silakan tunggu proses verifikasi dari admin atau hubungi customer service untuk informasi lebih lanjut.',
            code: 'DENTIST_NOT_VERIFIED'
          });
        }
        
        console.log('✅ Dentist is verified, allowing login');
      } finally {
        await prisma.$disconnect();
      }
    }

    const { rows: loginRows } = await query(
      'update users set last_login_at = now() where id = $1 returning last_login_at',
      [user.id]
    );

    const updatedUser = { ...user, last_login_at: loginRows[0]?.last_login_at };

    const accessToken = signAccess(updatedUser);
    const refreshToken = signRefresh(updatedUser);
    await query('insert into refresh_tokens(user_id, token) values ($1, $2)', [user.id, refreshToken]);

    return res.json({ accessToken, refreshToken, user: publicUser(updatedUser) });
  } catch (e) {
    console.error('Login error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const payload = verify(token);
    const { rows } = await query(
      'select id, email, name, phone_number, about, roles, avatar_url, last_login_at from users where id=$1',
      [payload.sub]
    );
    const user = rows[0];
    if (!user) return res.status(401).end();

    const responsePayload = { ...publicUser(user) };

    const { rows: clinicStaffRows } = await query(
      `SELECT
         cs.id,
         cs.role,
         cs.is_active,
         cs.clinic_profile_id,
         cs.assigned_branch_id,
         cp.legal_name,
         cp.brand_name,
         cp.status AS clinic_status
       FROM clinic_staff cs
       LEFT JOIN clinic_profiles cp ON cp.id = cs.clinic_profile_id
       WHERE cs.user_id = $1
       LIMIT 1`,
      [user.id]
    );
    const clinicStaff = clinicStaffRows[0] || null;
    if (clinicStaff) {
      responsePayload.clinicStaff = {
        id: clinicStaff.id?.toString?.() || clinicStaff.id,
        role: clinicStaff.role,
        isActive: clinicStaff.is_active,
        clinicProfileId: clinicStaff.clinic_profile_id?.toString?.() || clinicStaff.clinic_profile_id,
        assignedBranchId: clinicStaff.assigned_branch_id?.toString?.() || clinicStaff.assigned_branch_id || null,
        clinicProfile: clinicStaff.clinic_profile_id ? {
          id: clinicStaff.clinic_profile_id?.toString?.() || clinicStaff.clinic_profile_id,
          legalName: clinicStaff.legal_name,
          brandName: clinicStaff.brand_name,
          status: clinicStaff.clinic_status,
        } : null,
      };
      if (clinicStaff.is_active && clinicStaff.role) {
        responsePayload.effectiveRoles = [...new Set([...(responsePayload.roles || []), clinicStaff.role])];
      }
    }

    if (!responsePayload.effectiveRoles) {
      responsePayload.effectiveRoles = responsePayload.roles || [];
    }

    if (user.roles && user.roles.includes('dentist')) {
      const profileQuery = `
        SELECT 
          title, license_number, license_issuing_body, license_expiry_date,
          registration_number, primary_specialization, education_qualification, years_of_experience,
          clinic_name, clinic_address, clinic_working_hours, consultation_types, services_offered,
          consultation_fee, accepts_insurance, accepts_bpjs, emergency_availability,
          sip_file_path, str_file_path, ijazah_file_paths, certification_file_paths,
          is_verified, verification_date
        FROM dentist_profiles 
        WHERE user_id = $1
      `;
      const { rows: profileRows } = await query(profileQuery, [user.id]);
      const profile = profileRows[0];

      if (profile) {
        responsePayload.profile = {
          ...profile,
          uploadedFiles: {
            sipFile: profile.sip_file_path ? {
              path: profile.sip_file_path,
              exists: true
            } : null,
            strFile: profile.str_file_path ? {
              path: profile.str_file_path,
              exists: true
            } : null,
            ijazahFiles: profile.ijazah_file_paths ? profile.ijazah_file_paths.map(path => ({
              path,
              exists: true
            })) : [],
            certificationFiles: profile.certification_file_paths ? profile.certification_file_paths.map(path => ({
              path,
              exists: true
            })) : []
          }
        };
      }
    }

    if (user.roles && user.roles.includes('patient')) {
      const patientProfileQuery = `
        SELECT
          date_of_birth,
          gender,
          insurance_provider,
          insurance_number,
          insurance_member_id,
          emergency_contact,
          address,
          medical_details,
          preferred_language
        FROM patient_profiles
        WHERE user_id = $1
      `;
      const { rows: patientRows } = await query(patientProfileQuery, [user.id]);
      const patientProfile = patientRows[0];

      if (patientProfile) {
        responsePayload.patientProfile = {
          dateOfBirth: patientProfile.date_of_birth,
          gender: patientProfile.gender,
          insuranceProvider: patientProfile.insurance_provider,
          insuranceNumber: patientProfile.insurance_number,
          insuranceMemberId: patientProfile.insurance_member_id,
          emergencyContact: patientProfile.emergency_contact,
          address: patientProfile.address,
          medicalDetails: patientProfile.medical_details,
          preferredLanguage: patientProfile.preferred_language
        };
      }
    }

    return res.json(responsePayload);
  } catch (e) {
    console.error('Error in /me endpoint:', e);
    return res.status(401).end();
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.status(400).json({ message: 'Missing refreshToken' });
    const payload = verify(refreshToken);
    if (payload?.type !== 'refresh') return res.status(401).end();
    const { rowCount, rows } = await query('select users.id, users.email, users.roles from refresh_tokens rt join users on users.id=rt.user_id where rt.token=$1', [refreshToken]);
    if (!rowCount) return res.status(401).end();
    const user = rows[0];
    const accessToken = signAccess(user);
    return res.json({ accessToken });
  } catch (e) {
    return res.status(401).end();
  }
});

router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (refreshToken) {
      await query('delete from refresh_tokens where token=$1', [refreshToken]);
    }
    return res.json({ ok: true });
  } catch (e) {
    return res.status(200).json({ ok: true });
  }
});

// Serve uploaded files with authentication
router.get('/files/:category/:filename', async (req, res) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const payload = verify(token);
    
    const { category, filename } = req.params;
    const allowedCategories = ['sip', 'str', 'ijazah', 'certification'];
    
    if (!allowedCategories.includes(category)) {
      return res.status(400).json({ message: 'Invalid file category' });
    }
    
    // Check if user has access to this file
    const { rows } = await query(
      'SELECT user_id FROM dentist_profiles WHERE user_id = $1',
      [payload.sub]
    );
    
    if (rows.length === 0) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const filePath = path.join(__dirname, '../../uploads/documents', category, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    res.sendFile(filePath);
  } catch (e) {
    console.error('Error serving file:', e);
    return res.status(401).json({ message: 'Unauthorized' });
  }
});

// Get dentist profile with working hours
router.get('/dentist-profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get dentist profile with working hours
    const result = await query(
      `SELECT dp.*, u.name, u.email 
       FROM dentist_profiles dp 
       JOIN users u ON dp.user_id = u.id 
       WHERE dp.user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Dentist profile not found' });
    }

    const profile = result.rows[0];
    
    // Parse clinic working hours if it's stored as JSON string
    let clinicWorkingHours = {};
    try {
      if (profile.clinic_working_hours) {
        clinicWorkingHours = JSON.parse(profile.clinic_working_hours);
      }
    } catch (e) {
      console.error('Error parsing clinic working hours:', e);
      // Fallback to default working hours
      clinicWorkingHours = {
        monday: { start: '09:00', end: '17:00' },
        tuesday: { start: '09:00', end: '17:00' },
        wednesday: { start: '09:00', end: '17:00' },
        thursday: { start: '09:00', end: '17:00' },
        friday: { start: '09:00', end: '17:00' },
        saturday: null,
        sunday: null
      };
    }

    const responseData = {
      id: profile.id,
      userId: profile.user_id,
      name: profile.name,
      email: profile.email,
      title: profile.title,
      licenseNumber: profile.license_number,
      clinicName: profile.clinic_name,
      clinicAddress: profile.clinic_address,
      clinicWorkingHours: clinicWorkingHours,
      primarySpecialization: profile.primary_specialization,
      consultationTypes: profile.consultation_types,
      servicesOffered: profile.services_offered,
      consultationFee: profile.consultation_fee,
      isVerified: profile.is_verified
    };

    res.json(responseData);
  } catch (e) {
    console.error('Error fetching dentist profile:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Update user profile
router.put('/user/profile', async (req, res) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const payload = verify(token);
    const userId = payload.sub;

    const { name, email, phoneNumber, about, profile } = req.body;
    
    console.log('PUT /user/profile received:', { name, email, phoneNumber, about, profile });

    // Start transaction
    await query('BEGIN');

    try {
      // Update user basic info - handle both phoneNumber and phone_number
      const phone = phoneNumber || profile?.phone_number;
      const userAbout = about || profile?.about || null;
      await query(
        'UPDATE users SET name = $1, email = $2, phone_number = $3, about = $4 WHERE id = $5',
        [name, email, phone, userAbout, userId]
      );

      // Update or insert dentist profile only if we have meaningful data
      if (profile) {
        // Convert empty strings to appropriate values for integer fields
        const processedProfile = {
          ...profile,
          years_of_experience: profile.years_of_experience === '' || profile.years_of_experience === null ? 0 : parseInt(profile.years_of_experience) || 0,
          consultation_fee: profile.consultation_fee === '' || profile.consultation_fee === null ? null : parseInt(profile.consultation_fee) || null
        };

        const existingProfile = await query(
          'SELECT id FROM dentist_profiles WHERE user_id = $1',
          [userId]
        );

        // Check if we have enough required data to create/update profile
        const hasRequiredFields = processedProfile.title && 
                                  processedProfile.license_number && 
                                  processedProfile.registration_number && 
                                  processedProfile.primary_specialization && 
                                  processedProfile.education_qualification && 
                                  processedProfile.clinic_name && 
                                  processedProfile.clinic_address;

        if (existingProfile.rows.length > 0) {
          // Update existing profile - only update non-empty fields
          const updateFields = [];
          const updateValues = [];
          let paramCount = 1;

          if (processedProfile.title !== '') {
            updateFields.push(`title = $${paramCount++}`);
            updateValues.push(processedProfile.title);
          }
          if (processedProfile.license_number !== '') {
            updateFields.push(`license_number = $${paramCount++}`);
            updateValues.push(processedProfile.license_number);
          }
          if (processedProfile.registration_number !== '') {
            updateFields.push(`registration_number = $${paramCount++}`);
            updateValues.push(processedProfile.registration_number);
          }
          if (processedProfile.primary_specialization !== '') {
            updateFields.push(`primary_specialization = $${paramCount++}`);
            updateValues.push(processedProfile.primary_specialization);
          }
          if (processedProfile.years_of_experience !== null) {
            updateFields.push(`years_of_experience = $${paramCount++}`);
            updateValues.push(processedProfile.years_of_experience);
          }
          if (processedProfile.education_qualification !== '') {
            updateFields.push(`education_qualification = $${paramCount++}`);
            updateValues.push(processedProfile.education_qualification);
          }
          if (processedProfile.clinic_name !== '') {
            updateFields.push(`clinic_name = $${paramCount++}`);
            updateValues.push(processedProfile.clinic_name);
          }
          if (processedProfile.clinic_address !== '') {
            updateFields.push(`clinic_address = $${paramCount++}`);
            updateValues.push(processedProfile.clinic_address);
          }
          if (processedProfile.consultation_fee !== null) {
            updateFields.push(`consultation_fee = $${paramCount++}`);
            updateValues.push(processedProfile.consultation_fee);
          }

          if (updateFields.length > 0) {
            updateValues.push(userId);
            await query(
              `UPDATE dentist_profiles SET ${updateFields.join(', ')} WHERE user_id = $${paramCount}`,
              updateValues
            );
          }
        } else if (hasRequiredFields) {
          // Insert new profile only if we have all required fields
          await query(
            `INSERT INTO dentist_profiles (
              user_id, title, license_number, license_issuing_body, license_expiry_date,
              registration_number, primary_specialization, years_of_experience, 
              education_qualification, clinic_name, clinic_address, clinic_working_hours,
              consultation_fee
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [
              userId, 
              processedProfile.title, 
              processedProfile.license_number, 
              'Unknown', // default license_issuing_body
              '2099-12-31', // default license_expiry_date
              processedProfile.registration_number,
              processedProfile.primary_specialization, 
              processedProfile.years_of_experience, 
              processedProfile.education_qualification,
              processedProfile.clinic_name, 
              processedProfile.clinic_address, 
              '08:00-17:00', // default clinic_working_hours
              processedProfile.consultation_fee
            ]
          );
        }
      }

      // Commit transaction
      await query('COMMIT');

      // Fetch updated user data
      const { rows } = await query(
        `SELECT u.id, u.email, u.name, u.phone_number, u.about, u.roles, u.avatar_url,
                dp.title, dp.license_number, dp.registration_number, dp.primary_specialization,
                dp.years_of_experience, dp.education_qualification, dp.clinic_name, dp.clinic_address,
                dp.consultation_fee, dp.sip_file_path, dp.str_file_path, dp.ijazah_file_paths, dp.certification_file_paths,
                dp.avatar_url as profile_avatar_url
         FROM users u 
         LEFT JOIN dentist_profiles dp ON u.id = dp.user_id 
         WHERE u.id = $1`,
        [userId]
      );

      const updatedUser = rows[0];
      const responseData = {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        phoneNumber: updatedUser.phone_number,
        about: updatedUser.about,
        roles: updatedUser.roles,
        avatar_url: updatedUser.avatar_url || updatedUser.profile_avatar_url,
        profile: updatedUser.title ? {
          phone_number: updatedUser.phone_number,
          title: updatedUser.title,
          license_number: updatedUser.license_number,
          registration_number: updatedUser.registration_number,
          primary_specialization: updatedUser.primary_specialization,
          years_of_experience: updatedUser.years_of_experience,
          education_qualification: updatedUser.education_qualification,
          clinic_name: updatedUser.clinic_name,
          clinic_address: updatedUser.clinic_address,
          consultation_fee: updatedUser.consultation_fee,
          about: updatedUser.about,
          avatar_url: updatedUser.avatar_url || updatedUser.profile_avatar_url,
          uploadedFiles: {
            sipFile: updatedUser.sip_file_path ? { path: updatedUser.sip_file_path, exists: true } : null,
            strFile: updatedUser.str_file_path ? { path: updatedUser.str_file_path, exists: true } : null,
            ijazahFiles: updatedUser.ijazah_file_paths ? updatedUser.ijazah_file_paths.map(path => ({ path, exists: true })) : [],
            certificationFiles: updatedUser.certification_file_paths ? updatedUser.certification_file_paths.map(path => ({ path, exists: true })) : []
          }
        } : null
      };

      res.json(responseData);
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (e) {
    console.error('Error updating profile:', e);
    return res.status(500).json({ message: 'Server error updating profile' });
  }
});

// Get user profile (for frontend fetching)
router.get('/user/profile', async (req, res) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const payload = verify(token);
    const userId = payload.sub;

    const { rows } = await query(
      `SELECT u.id, u.email, u.name, u.phone_number, u.about, u.roles, u.avatar_url,
              dp.title, dp.license_number, dp.registration_number, dp.primary_specialization,
              dp.years_of_experience, dp.education_qualification, dp.clinic_name, dp.clinic_address,
              dp.consultation_fee, dp.sip_file_path, dp.str_file_path, dp.ijazah_file_paths, dp.certification_file_paths,
              dp.avatar_url as profile_avatar_url
       FROM users u 
       LEFT JOIN dentist_profiles dp ON u.id = dp.user_id 
       WHERE u.id = $1`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = rows[0];
    const responseData = {
      id: user.id,
      email: user.email,
      name: user.name,
      phoneNumber: user.phone_number,
      about: user.about,
      roles: user.roles,
      avatar_url: user.avatar_url || user.profile_avatar_url,
      profile: user.title ? {
        phone_number: user.phone_number,
        title: user.title,
        license_number: user.license_number,
        registration_number: user.registration_number,
        primary_specialization: user.primary_specialization,
        years_of_experience: user.years_of_experience,
        education_qualification: user.education_qualification,
        clinic_name: user.clinic_name,
        clinic_address: user.clinic_address,
        consultation_fee: user.consultation_fee,
        about: user.about,
        avatar_url: user.avatar_url || user.profile_avatar_url,
        uploadedFiles: {
          sipFile: user.sip_file_path ? { path: user.sip_file_path, exists: true } : null,
          strFile: user.str_file_path ? { path: user.str_file_path, exists: true } : null,
          ijazahFiles: user.ijazah_file_paths ? user.ijazah_file_paths.map(path => ({ path, exists: true })) : [],
          certificationFiles: user.certification_file_paths ? user.certification_file_paths.map(path => ({ path, exists: true })) : []
        }
      } : null
    };

    res.json(responseData);
  } catch (e) {
    console.error('Error fetching profile:', e);
    return res.status(401).json({ message: 'Unauthorized' });
  }
});

// Upload avatar
router.post('/user/avatar', upload.single('avatar'), async (req, res) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const payload = verify(token);
    const userId = payload.sub;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const avatarUrl = `uploads/avatars/${req.file.filename}`;

    // Update user's avatar in database
    await query(
      'UPDATE users SET avatar_url = $1 WHERE id = $2',
      [avatarUrl, userId]
    );

    // Also update dentist profile if exists
    await query(
      'UPDATE dentist_profiles SET avatar_url = $1 WHERE user_id = $2',
      [avatarUrl, userId]
    );

    res.json({ 
      message: 'Avatar uploaded successfully',
      avatar_url: avatarUrl
    });
  } catch (e) {
    console.error('Error uploading avatar:', e);
    return res.status(500).json({ message: 'Server error uploading avatar' });
  }
});

// Change user password
router.put('/user/password', async (req, res) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const payload = verify(token);
    const userId = payload.sub;

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    // Get current user data
    const { rows } = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = rows[0];

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, userId]
    );

    res.json({ 
      message: 'Password changed successfully'
    });
  } catch (e) {
    console.error('Error changing password:', e);
    return res.status(500).json({ message: 'Server error changing password' });
  }
});

// Upload documents
router.post('/user/documents', upload.fields([
  { name: 'sipFile', maxCount: 1 },
  { name: 'strFile', maxCount: 1 },
  { name: 'ijazahFiles', maxCount: 5 },
  { name: 'certificationFiles', maxCount: 10 }
]), async (req, res) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const payload = verify(token);
    const userId = payload.sub;

    const files = req.files || {};
    const uploadedFiles = {};

    // Start transaction
    await query('BEGIN');

    try {
      const { rows } = await query(
        'SELECT sip_file_path, str_file_path, ijazah_file_paths, certification_file_paths FROM dentist_profiles WHERE user_id = $1',
        [userId]
      );

      if (rows.length === 0) {
        await query('ROLLBACK');
        return res.status(404).json({ message: 'Dentist profile not found' });
      }

      const currentProfile = rows[0];
      const updates = {};

      // Handle SIP file
      if (files.sipFile && files.sipFile[0]) {
        const sipFile = files.sipFile[0];
        updates.sip_file_path = `uploads/documents/sip/${sipFile.filename}`;
        uploadedFiles.sipFile = {
          filename: sipFile.filename,
          originalName: sipFile.originalname,
          size: sipFile.size,
          path: updates.sip_file_path
        };
      }

      // Handle STR file
      if (files.strFile && files.strFile[0]) {
        const strFile = files.strFile[0];
        updates.str_file_path = `uploads/documents/str/${strFile.filename}`;
        uploadedFiles.strFile = {
          filename: strFile.filename,
          originalName: strFile.originalname,
          size: strFile.size,
          path: updates.str_file_path
        };
      }

      // Handle Ijazah files
      if (files.ijazahFiles && files.ijazahFiles.length > 0) {
        const currentIjazahFiles = currentProfile.ijazah_file_paths || [];
        const newIjazahFiles = files.ijazahFiles.map(file => `uploads/documents/ijazah/${file.filename}`);
        updates.ijazah_file_paths = [...currentIjazahFiles, ...newIjazahFiles];
        uploadedFiles.ijazahFiles = files.ijazahFiles.map(file => ({
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          path: `uploads/documents/ijazah/${file.filename}`
        }));
      }

      // Handle Certification files
      if (files.certificationFiles && files.certificationFiles.length > 0) {
        const currentCertFiles = currentProfile.certification_file_paths || [];
        const newCertFiles = files.certificationFiles.map(file => `uploads/documents/certification/${file.filename}`);
        updates.certification_file_paths = [...currentCertFiles, ...newCertFiles];
        uploadedFiles.certificationFiles = files.certificationFiles.map(file => ({
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          path: `uploads/documents/certification/${file.filename}`
        }));
      }

      // Update database
      const updateParts = [];
      const updateValues = [];
      let paramCount = 1;

      for (const [key, value] of Object.entries(updates)) {
        updateParts.push(`${key} = $${paramCount}`);
        updateValues.push(value);
        paramCount++;
      }

      if (updateParts.length > 0) {
        updateValues.push(userId);
        await query(
          `UPDATE dentist_profiles SET ${updateParts.join(', ')} WHERE user_id = $${paramCount}`,
          updateValues
        );
      }

      await query('COMMIT');

      res.json({
        message: 'Documents uploaded successfully',
        uploadedFiles
      });
    } catch (error) {
      await query('ROLLBACK');
      
      // Clean up uploaded files on error
      const allFiles = [
        ...(files.sipFile || []),
        ...(files.strFile || []),
        ...(files.ijazahFiles || []),
        ...(files.certificationFiles || [])
      ];
      
      allFiles.forEach(file => {
        try {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (cleanupError) {
          console.error('Error cleaning up file:', cleanupError);
        }
      });
      
      throw error;
    }
  } catch (e) {
    console.error('Error uploading documents:', e);
    return res.status(500).json({ message: 'Server error uploading documents' });
  }
});

// Delete documents
router.delete('/user/documents/:documentType/:index?', async (req, res) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const payload = verify(token);
    const userId = payload.sub;

    const { documentType, index } = req.params;
    const allowedTypes = ['sipFile', 'strFile', 'ijazahFiles', 'certificationFiles'];

    if (!allowedTypes.includes(documentType)) {
      return res.status(400).json({ message: 'Invalid document type' });
    }

    // Start transaction
    await query('BEGIN');

    try {
      const { rows } = await query(
        'SELECT sip_file_path, str_file_path, ijazah_file_paths, certification_file_paths FROM dentist_profiles WHERE user_id = $1',
        [userId]
      );

      if (rows.length === 0) {
        await query('ROLLBACK');
        return res.status(404).json({ message: 'Dentist profile not found' });
      }

      const currentProfile = rows[0];
      const updates = {};

      // Handle different document types
      if (documentType === 'sipFile') {
        updates.sip_file_path = null;
      } else if (documentType === 'strFile') {
        updates.str_file_path = null;
      } else if (documentType === 'ijazahFiles') {
        const currentFiles = currentProfile.ijazah_file_paths || [];
        if (index !== undefined && index < currentFiles.length) {
          currentFiles.splice(parseInt(index), 1);
          updates.ijazah_file_paths = currentFiles;
        }
      } else if (documentType === 'certificationFiles') {
        const currentFiles = currentProfile.certification_file_paths || [];
        if (index !== undefined && index < currentFiles.length) {
          currentFiles.splice(parseInt(index), 1);
          updates.certification_file_paths = currentFiles;
        }
      }

      // Update database
      const updateParts = [];
      const updateValues = [];
      let paramCount = 1;

      for (const [key, value] of Object.entries(updates)) {
        updateParts.push(`${key} = $${paramCount}`);
        updateValues.push(value);
        paramCount++;
      }

      if (updateParts.length > 0) {
        updateValues.push(userId);
        await query(
          `UPDATE dentist_profiles SET ${updateParts.join(', ')} WHERE user_id = $${paramCount}`,
          updateValues
        );
      }

      await query('COMMIT');

      res.json({ message: 'Document deleted successfully' });
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (e) {
    console.error('Error deleting document:', e);
    return res.status(500).json({ message: 'Server error deleting document' });
  }
});

// ============================================================================
// OTP VERIFICATION ENDPOINTS
// ============================================================================

// Send Phone OTP
router.post('/send-phone-otp', otpLimiter, validate(phoneOTPSchema), async (req, res) => {
  const correlationId = ensureCorrelationId(req, res);
  try {
    const { phone_number } = req.body;

    const result = await sendPhoneOTP(phone_number, {
      requestIp: req.ip,
      purpose: req.body?.purpose || 'login',
      correlationId,
      idempotencyKey: req.get('Idempotency-Key') || null,
      userId: req.user?.id || null
    });

    res.json({
      success: true,
      message: result.message,
      challengeId: result.challengeId,
      expiresAt: result.expiresAt,
      cooldownUntil: result.cooldownUntil,
      remainingAttempts: result.remainingAttempts,
      ...(result.otp && { otp: result.otp }), // Only in dev mode
    });
  } catch (error) {
    if (!(error instanceof OtpServiceError)) {
      console.error('Send phone OTP error:', error);
    }
    const response = otpErrorResponse(error, correlationId, 'OTP_SEND_FAILED', 'Failed to send OTP');
    res.status(response.status).json(response.body);
  }
});

// DEPRECATED: Replaced by Twilio SMS OTP (Sprint 1.5). Remove in next major version.
router.post('/send-email-otp', async (req, res) => {
  return res.status(410).json({
    error: {
      code: 'OTP_CHANNEL_DEPRECATED',
      message: 'Email OTP has been replaced by SMS OTP. Use POST /v1/otp/requests instead.',
      replacement: '/v1/otp/requests'
    }
  });
});

// Verify OTP
router.post('/verify-otp', otpLimiter, validate(verifyOTPSchema), async (req, res) => {
  const correlationId = ensureCorrelationId(req, res);
  try {
    const { phone_number, email, otp } = req.body;
    const identifier = phone_number || email;

    if (!identifier) {
      return res.status(400).json({
        error: {
          code: 'OTP_IDENTIFIER_REQUIRED',
          message: 'Phone number is required for SMS OTP.',
          retryable: false,
          correlationId,
          details: {}
        }
      });
    }

    const result = await verifyOTP(identifier, otp, {
      channel: email ? 'email' : 'sms',
      requestIp: req.ip,
      correlationId,
      userId: req.user?.id || null
    });

    res.json({
      success: true,
      message: 'OTP verified successfully',
      verified: result.verified,
      verifiedAt: result.verifiedAt,
      challengeId: result.challengeId
    });
  } catch (error) {
    if (!(error instanceof OtpServiceError)) {
      console.error('Verify OTP error:', error);
    }
    const response = otpErrorResponse(error, correlationId, 'OTP_VERIFY_ERROR', 'Failed to verify OTP');
    res.status(response.status).json(response.body);
  }
});

export default router;
