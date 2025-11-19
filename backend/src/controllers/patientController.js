import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getClient } from '../db.js';

// Simple error class for this controller
class ValidationError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = statusCode;
  }
}

// Multer configuration for avatar upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/avatars';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Note: req.user might not be available yet in multer, so use generic naming
    cb(null, `patient-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new ValidationError('Only image files (JPEG, PNG) are allowed', 400));
    }
  }
});

/**
 * GET /v1/patient/profile
 * Get patient profile data
 * Auto-creates profile if it doesn't exist
 */
export const getPatientProfile = async (req, res, next) => {
  const client = await getClient();

  try {
    const userId = req.user.id;

    // Validate userId is for a patient
    const userCheck = await client.query(
      'SELECT id, name, email, phone_number, avatar_url, roles FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      throw new ValidationError('User not found', 404);
    }

    if (!userCheck.rows[0].roles || !userCheck.rows[0].roles.includes('patient')) {
      throw new ValidationError('Access denied. Patient role required', 403);
    }

    // Check if profile exists
    let profileResult = await client.query(
      'SELECT * FROM patient_profiles WHERE user_id = $1',
      [userId]
    );

    // If profile doesn't exist, create it
    if (profileResult.rows.length === 0) {
      console.log(`📝 Creating new patient profile for user ${userId}`);
      
      profileResult = await client.query(
        `INSERT INTO patient_profiles (user_id, preferred_language)
         VALUES ($1, 'id')
         RETURNING *`,
        [userId]
      );
    }

    const userData = userCheck.rows[0];
    const profileData = profileResult.rows[0];

    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          phoneNumber: userData.phone_number,
          avatarUrl: userData.avatar_url,
          roles: userData.roles
        },
        profile: {
          userId: profileData.user_id,
          dateOfBirth: profileData.date_of_birth,
          gender: profileData.gender,
          insuranceProvider: profileData.insurance_provider,
          insuranceNumber: profileData.insurance_number,
          insuranceMemberId: profileData.insurance_member_id,
          preferredLanguage: profileData.preferred_language || 'id',
          address: profileData.address,
          emergencyContact: profileData.emergency_contact,
          medicalDetails: profileData.medical_details,
          createdAt: profileData.created_at,
          updatedAt: profileData.updated_at
        }
      }
    });

  } catch (error) {
    console.error('❌ Get patient profile error:', error);
    next(error);
  } finally {
    client.release();
  }
};

/**
 * PUT /v1/patient/profile
 * Update patient profile with JSONB fields
 * 
 * Expected body:
 * {
 *   "full_name": "string (optional)",
 *   "phone": "string (optional)",
 *   "date_of_birth": "YYYY-MM-DD (optional)",
 *   "gender": "male|female|other (optional)",
 *   "address": {
 *     "line1": "string",
 *     "line2": "string (optional)",
 *     "city": "string",
 *     "province": "string",
 *     "postal_code": "string"
 *   },
 *   "emergency_contact": {
 *     "name": "string",
 *     "phone": "string",
 *     "relationship": "string"
 *   },
 *   "medical_details": {
 *     "allergies": ["string"],
 *     "current_medications": ["string"],
 *     "medical_conditions": ["string"],
 *     "blood_type": "string (optional)",
 *     "notes": "string (optional)"
 *   }
 * }
 */
export const updatePatientProfile = async (req, res, next) => {
  const client = await getClient();

  try {
    const userId = req.user.id;
    const {
      full_name,
      phone,
      date_of_birth,
      gender,
      address,
      emergency_contact,
      medical_details
    } = req.body;

    // Validate userId is for a patient
    const userCheck = await client.query(
      'SELECT roles FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      throw new ValidationError('User not found', 404);
    }

    if (!userCheck.rows[0].roles || !userCheck.rows[0].roles.includes('patient')) {
      throw new ValidationError('Access denied. Patient role required', 403);
    }

    await client.query('BEGIN');

    // Update users table (full_name, phone)
    const userUpdateFields = [];
    const userUpdateValues = [];
    let userParamCount = 1;

    if (full_name !== undefined) {
      userUpdateFields.push(`full_name = $${userParamCount++}`);
      userUpdateValues.push(full_name);
    }

    if (phone !== undefined) {
      userUpdateFields.push(`phone = $${userParamCount++}`);
      userUpdateValues.push(phone);
    }

    if (userUpdateFields.length > 0) {
      userUpdateValues.push(userId);
      const userUpdateQuery = `
        UPDATE users 
        SET ${userUpdateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${userParamCount}
        RETURNING id, full_name, email, phone, roles
      `;
      await client.query(userUpdateQuery, userUpdateValues);
    }

    // Update or create patient_profiles table
    const profileUpdateFields = [];
    const profileUpdateValues = [];
    let profileParamCount = 1;

    if (date_of_birth !== undefined) {
      profileUpdateFields.push(`date_of_birth = $${profileParamCount++}`);
      profileUpdateValues.push(date_of_birth);
    }

    if (gender !== undefined) {
      // Validate gender
      if (!['male', 'female', 'other'].includes(gender)) {
        throw new ValidationError('Invalid gender value. Must be male, female, or other', 400);
      }
      profileUpdateFields.push(`gender = $${profileParamCount++}`);
      profileUpdateValues.push(gender);
    }

    if (address !== undefined) {
      // Validate required address fields
      if (!address.line1 || !address.city || !address.province || !address.postal_code) {
        throw new ValidationError('Address must include line1, city, province, and postal_code', 400);
      }
      profileUpdateFields.push(`address = $${profileParamCount++}`);
      profileUpdateValues.push(JSON.stringify(address));
    }

    if (emergency_contact !== undefined) {
      // Validate required emergency contact fields
      if (!emergency_contact.name || !emergency_contact.phone || !emergency_contact.relationship) {
        throw new ValidationError('Emergency contact must include name, phone, and relationship', 400);
      }
      profileUpdateFields.push(`emergency_contact = $${profileParamCount++}`);
      profileUpdateValues.push(JSON.stringify(emergency_contact));
    }

    if (medical_details !== undefined) {
      // Validate medical details structure
      if (!Array.isArray(medical_details.allergies) || 
          !Array.isArray(medical_details.current_medications) || 
          !Array.isArray(medical_details.medical_conditions)) {
        throw new ValidationError('Medical details must include arrays for allergies, current_medications, and medical_conditions', 400);
      }
      profileUpdateFields.push(`medical_details = $${profileParamCount++}`);
      profileUpdateValues.push(JSON.stringify(medical_details));
    }

    let profileResult;
    if (profileUpdateFields.length > 0) {
      // Check if profile exists
      const profileExists = await client.query(
        'SELECT user_id FROM patient_profiles WHERE user_id = $1',
        [userId]
      );

      if (profileExists.rows.length > 0) {
        // Update existing profile
        profileUpdateValues.push(userId);
        const profileUpdateQuery = `
          UPDATE patient_profiles 
          SET ${profileUpdateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $${profileParamCount}
          RETURNING user_id, date_of_birth, gender, address, emergency_contact, medical_details, avatar_url
        `;
        profileResult = await client.query(profileUpdateQuery, profileUpdateValues);
      } else {
        // Create new profile
        const insertFields = ['user_id', ...profileUpdateFields.map(f => f.split(' = ')[0])];
        const insertValues = [userId, ...profileUpdateValues];
        const insertParams = insertValues.map((_, i) => `$${i + 1}`);
        
        const profileInsertQuery = `
          INSERT INTO patient_profiles (${insertFields.join(', ')})
          VALUES (${insertParams.join(', ')})
          RETURNING user_id, date_of_birth, gender, address, emergency_contact, medical_details, avatar_url
        `;
        profileResult = await client.query(profileInsertQuery, insertValues);
      }
    } else {
      // No profile updates, just fetch existing
      profileResult = await client.query(
        'SELECT user_id, date_of_birth, gender, address, emergency_contact, medical_details, avatar_url FROM patient_profiles WHERE user_id = $1',
        [userId]
      );
    }

    await client.query('COMMIT');

    // Fetch complete user data
    const userData = await client.query(
      'SELECT id, full_name, email, phone, roles FROM users WHERE id = $1',
      [userId]
    );

    const response = {
      user: userData.rows[0],
      profile: profileResult.rows[0] || null
    };

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: response
    });

  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

/**
 * POST /v1/patient/avatar
 * Upload patient avatar image
 * 
 * Expects multipart/form-data with:
 * - avatar: image file (JPEG/PNG, max 5MB)
 */
export const uploadPatientAvatar = [
  upload.single('avatar'),
  async (req, res, next) => {
    console.log('📤 Avatar upload started, file:', req.file);
    console.log('👤 User:', req.user);
    
    const client = await getClient();

    try {
      if (!req.file) {
        throw new ValidationError('No file uploaded', 400);
      }

      const userId = req.user.id;
      const avatarPath = `/uploads/avatars/${req.file.filename}`;

      // Validate userId is for a patient
      const userCheck = await client.query(
        'SELECT roles FROM users WHERE id = $1',
        [userId]
      );

      if (userCheck.rows.length === 0) {
        throw new ValidationError('User not found', 404);
      }

      if (!userCheck.rows[0].roles || !userCheck.rows[0].roles.includes('patient')) {
        throw new ValidationError('Access denied. Patient role required', 403);
      }

      await client.query('BEGIN');

      // Get old avatar from users table
      const oldAvatarResult = await client.query(
        'SELECT avatar_url FROM users WHERE id = $1',
        [userId]
      );

      const oldAvatarUrl = oldAvatarResult.rows[0]?.avatar_url;

      // Delete old avatar file if exists
      if (oldAvatarUrl) {
        const oldAvatarPath = path.join(process.cwd(), oldAvatarUrl);
        if (fs.existsSync(oldAvatarPath)) {
          fs.unlinkSync(oldAvatarPath);
        }
      }

      // Update avatar_url in users table (NOT patient_profiles)
      const result = await client.query(
        `UPDATE users 
         SET avatar_url = $1 
         WHERE id = $2 
         RETURNING id, avatar_url`,
        [avatarPath, userId]
      );

      await client.query('COMMIT');

      res.status(200).json({
        status: 'success',
        message: 'Avatar uploaded successfully',
        data: {
          avatar_url: result.rows[0].avatar_url
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      
      // Log the actual error
      console.error('❌ Avatar upload error:', error);
      
      // Delete uploaded file if database update fails
      if (req.file) {
        const filePath = req.file.path;
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      
      next(error);
    } finally {
      client.release();
    }
  }
];
