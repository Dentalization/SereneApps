import { query } from '../db.js';
import { APIError, ERROR_CODES } from '../utils/error-codes.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * GET /v1/profile
 * Get current user's profile
 */
export const getProfile = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const user_role = req.user.role;

    let profileQuery;
    let profileResult;

    if (user_role === 'patient') {
      // Get patient profile
      profileQuery = `
        SELECT 
          u.id,
          u.email,
          u.name,
          u.phone_number,
          u.role,
          u.is_phone_verified,
          u.is_email_verified,
          u.avatar_url,
          u.created_at,
          u.last_login_at,
          pp.date_of_birth,
          pp.gender,
          pp.blood_type,
          pp.address_line1,
          pp.address_line2,
          pp.city,
          pp.province,
          pp.postal_code,
          pp.emergency_contact_name,
          pp.emergency_contact_phone,
          pp.emergency_contact_relationship,
          pp.insurance_provider,
          pp.insurance_number,
          pp.allergies,
          pp.chronic_conditions,
          pp.current_medications,
          pp.past_surgeries,
          pp.family_medical_history
        FROM users u
        LEFT JOIN patient_profiles pp ON pp.user_id = u.id
        WHERE u.id = $1
      `;
      profileResult = await query(profileQuery, [user_id]);
    } else if (user_role === 'dentist') {
      // Get dentist profile
      profileQuery = `
        SELECT 
          u.id,
          u.email,
          u.name,
          u.phone_number,
          u.role,
          u.is_phone_verified,
          u.is_email_verified,
          u.avatar_url,
          u.created_at,
          u.last_login_at,
          dp.title,
          dp.license_number,
          dp.license_issuing_body,
          dp.license_expiry_date,
          dp.primary_specialization,
          dp.education_qualification,
          dp.years_of_experience,
          dp.consultation_fee,
          dp.consultation_types,
          dp.services_offered,
          dp.accepts_insurance,
          dp.accepts_bpjs,
          dp.emergency_availability,
          dp.bio,
          dp.is_verified
        FROM users u
        LEFT JOIN dentist_profiles dp ON dp.user_id = u.id
        WHERE u.id = $1
      `;
      profileResult = await query(profileQuery, [user_id]);
    } else {
      // Basic user profile
      profileQuery = `
        SELECT 
          id,
          email,
          name,
          phone_number,
          role,
          is_phone_verified,
          is_email_verified,
          avatar_url,
          created_at,
          last_login_at
        FROM users
        WHERE id = $1
      `;
      profileResult = await query(profileQuery, [user_id]);
    }

    if (profileResult.rows.length === 0) {
      throw new APIError(
        ERROR_CODES.USER_NOT_FOUND.code,
        'USER_NOT_FOUND',
        'User tidak ditemukan'
      );
    }

    res.json({
      success: true,
      data: profileResult.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /v1/profile
 * Update current user's profile
 */
export const updateProfile = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const user_role = req.user.role;
    const updates = req.body;

    // Basic user fields that can be updated
    const userUpdates = [];
    const userParams = [];
    let userParamIndex = 1;

    if (updates.name) {
      userUpdates.push(`name = $${userParamIndex}`);
      userParams.push(updates.name);
      userParamIndex++;
    }

    if (updates.phone_number) {
      userUpdates.push(`phone_number = $${userParamIndex}`);
      userParams.push(updates.phone_number);
      userParamIndex++;
    }

    // Update users table if there are basic updates
    if (userUpdates.length > 0) {
      userUpdates.push(`updated_at = NOW()`);
      const userUpdateQuery = `
        UPDATE users
        SET ${userUpdates.join(', ')}
        WHERE id = $${userParamIndex}
        RETURNING *
      `;
      userParams.push(user_id);
      await query(userUpdateQuery, userParams);
    }

    // Role-specific updates
    if (user_role === 'patient') {
      const profileUpdates = [];
      const profileParams = [];
      let profileParamIndex = 1;

      const patientFields = [
        'date_of_birth', 'gender', 'blood_type',
        'address_line1', 'address_line2', 'city', 'province', 'postal_code',
        'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
        'insurance_provider', 'insurance_number'
      ];

      patientFields.forEach(field => {
        if (updates[field] !== undefined) {
          profileUpdates.push(`${field} = $${profileParamIndex}`);
          profileParams.push(updates[field]);
          profileParamIndex++;
        }
      });

      if (profileUpdates.length > 0) {
        profileUpdates.push(`updated_at = NOW()`);
        const profileUpdateQuery = `
          UPDATE patient_profiles
          SET ${profileUpdates.join(', ')}
          WHERE user_id = $${profileParamIndex}
        `;
        profileParams.push(user_id);
        await query(profileUpdateQuery, profileParams);
      }
    } else if (user_role === 'dentist') {
      const profileUpdates = [];
      const profileParams = [];
      let profileParamIndex = 1;

      const dentistFields = [
        'title', 'primary_specialization', 'education_qualification',
        'years_of_experience', 'consultation_fee', 'consultation_types',
        'services_offered', 'accepts_insurance', 'accepts_bpjs',
        'emergency_availability', 'bio'
      ];

      dentistFields.forEach(field => {
        if (updates[field] !== undefined) {
          profileUpdates.push(`${field} = $${profileParamIndex}`);
          profileParams.push(updates[field]);
          profileParamIndex++;
        }
      });

      if (profileUpdates.length > 0) {
        profileUpdates.push(`updated_at = NOW()`);
        const profileUpdateQuery = `
          UPDATE dentist_profiles
          SET ${profileUpdates.join(', ')}
          WHERE user_id = $${profileParamIndex}
        `;
        profileParams.push(user_id);
        await query(profileUpdateQuery, profileParams);
      }
    }

    // Return updated profile
    const getProfileQuery = user_role === 'patient'
      ? `
        SELECT 
          u.*,
          pp.date_of_birth,
          pp.gender,
          pp.blood_type,
          pp.address_line1,
          pp.city,
          pp.province
        FROM users u
        LEFT JOIN patient_profiles pp ON pp.user_id = u.id
        WHERE u.id = $1
      `
      : user_role === 'dentist'
      ? `
        SELECT 
          u.*,
          dp.title,
          dp.primary_specialization,
          dp.years_of_experience
        FROM users u
        LEFT JOIN dentist_profiles dp ON dp.user_id = u.id
        WHERE u.id = $1
      `
      : `SELECT * FROM users WHERE id = $1`;

    const result = await query(getProfileQuery, [user_id]);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      messageEn: 'Profile updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /v1/profile/avatar
 * Upload user avatar
 */
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/avatars');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `avatar-${req.user.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
  }
}).single('avatar');

export const uploadAvatar = (req, res, next) => {
  avatarUpload(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new APIError(
            ERROR_CODES.FILE_TOO_LARGE.code,
            'FILE_TOO_LARGE',
            'Ukuran file terlalu besar (maksimal 5MB)'
          ));
        }
      }
      return next(err);
    }

    if (!req.file) {
      return next(new APIError(
        ERROR_CODES.FILE_REQUIRED.code,
        'FILE_REQUIRED',
        'File avatar diperlukan'
      ));
    }

    try {
      const user_id = req.user.id;
      const avatarUrl = `/uploads/avatars/${req.file.filename}`;

      // Update user avatar
      const updateQuery = `
        UPDATE users
        SET avatar_url = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, name, email, avatar_url
      `;
      const result = await query(updateQuery, [avatarUrl, user_id]);

      res.json({
        success: true,
        message: 'Avatar uploaded successfully',
        messageEn: 'Avatar uploaded successfully',
        data: result.rows[0]
      });
    } catch (error) {
      // Delete uploaded file if database update fails
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      next(error);
    }
  });
};

/**
 * GET /v1/profile/appointments
 * Get user's appointment history
 */
export const getProfileAppointments = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const user_role = req.user.role;
    const {
      page = 1,
      limit = 10,
      status = '',
      startDate = '',
      endDate = ''
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    // Filter by role
    if (user_role === 'patient') {
      conditions.push(`a.patient_id = $${paramIndex}`);
    } else if (user_role === 'dentist') {
      conditions.push(`a.dentist_id = $${paramIndex}`);
    } else {
      throw new APIError(
        ERROR_CODES.AUTH_FORBIDDEN.code,
        'AUTH_FORBIDDEN',
        'Role tidak memiliki akses ke appointments'
      );
    }
    params.push(user_id);
    paramIndex++;

    // Filter by status
    if (status) {
      conditions.push(`a.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    // Filter by date range
    if (startDate) {
      conditions.push(`a.starts_at >= $${paramIndex}`);
      params.push(new Date(startDate));
      paramIndex++;
    }

    if (endDate) {
      conditions.push(`a.starts_at <= $${paramIndex}`);
      params.push(new Date(endDate));
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM appointments a
      WHERE ${whereClause}
    `;
    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get appointments
    const appointmentsQuery = `
      SELECT 
        a.*,
        u_dentist.name as dentist_name,
        u_patient.name as patient_name,
        cp.brand_name as clinic_name
      FROM appointments a
      JOIN users u_dentist ON u_dentist.id = a.dentist_id
      JOIN users u_patient ON u_patient.id = a.patient_id
      JOIN clinic_profiles cp ON cp.id = a.clinic_branch_id
      WHERE ${whereClause}
      ORDER BY a.starts_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(parseInt(limit), offset);

    const result = await query(appointmentsQuery, params);

    res.json({
      success: true,
      data: {
        appointments: result.rows,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /v1/profile/medical-history
 * Get patient's medical history
 */
export const getMedicalHistory = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const user_role = req.user.role;

    if (user_role !== 'patient') {
      throw new APIError(
        ERROR_CODES.AUTH_FORBIDDEN.code,
        'AUTH_FORBIDDEN',
        'Only patients can access medical history'
      );
    }

    const medicalHistoryQuery = `
      SELECT 
        allergies,
        chronic_conditions,
        current_medications,
        past_surgeries,
        family_medical_history,
        blood_type,
        emergency_contact_name,
        emergency_contact_phone,
        emergency_contact_relationship,
        insurance_provider,
        insurance_number
      FROM patient_profiles
      WHERE user_id = $1
    `;

    const result = await query(medicalHistoryQuery, [user_id]);

    if (result.rows.length === 0) {
      throw new APIError(
        ERROR_CODES.USER_NOT_FOUND.code,
        'USER_NOT_FOUND',
        'Patient profile not found'
      );
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /v1/profile/medical-history
 * Update patient's medical history
 */
export const updateMedicalHistory = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const user_role = req.user.role;

    if (user_role !== 'patient') {
      throw new APIError(
        ERROR_CODES.AUTH_FORBIDDEN.code,
        'AUTH_FORBIDDEN',
        'Only patients can update medical history'
      );
    }

    const updates = req.body;
    const profileUpdates = [];
    const profileParams = [];
    let profileParamIndex = 1;

    const medicalFields = [
      'allergies',
      'chronic_conditions',
      'current_medications',
      'past_surgeries',
      'family_medical_history'
    ];

    medicalFields.forEach(field => {
      if (updates[field] !== undefined) {
        profileUpdates.push(`${field} = $${profileParamIndex}`);
        profileParams.push(updates[field]);
        profileParamIndex++;
      }
    });

    if (profileUpdates.length === 0) {
      throw new APIError(
        ERROR_CODES.VALIDATION_ERROR.code,
        'VALIDATION_ERROR',
        'No fields to update'
      );
    }

    profileUpdates.push(`updated_at = NOW()`);
    const profileUpdateQuery = `
      UPDATE patient_profiles
      SET ${profileUpdates.join(', ')}
      WHERE user_id = $${profileParamIndex}
      RETURNING *
    `;
    profileParams.push(user_id);

    const result = await query(profileUpdateQuery, profileParams);

    res.json({
      success: true,
      message: 'Medical history updated successfully',
      messageEn: 'Medical history updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /v1/profile
 * Delete user account
 */
export const deleteAccount = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const { password } = req.body;

    if (!password) {
      throw new APIError(
        ERROR_CODES.VALIDATION_ERROR.code,
        'VALIDATION_ERROR',
        'Password is required to delete account'
      );
    }

    // Verify password
    const userQuery = `SELECT password_hash FROM users WHERE id = $1`;
    const userResult = await query(userQuery, [user_id]);

    if (userResult.rows.length === 0) {
      throw new APIError(
        ERROR_CODES.USER_NOT_FOUND.code,
        'USER_NOT_FOUND',
        'User not found'
      );
    }

    const bcrypt = await import('bcrypt');
    const isPasswordValid = await bcrypt.compare(password, userResult.rows[0].password_hash);

    if (!isPasswordValid) {
      throw new APIError(
        ERROR_CODES.AUTH_INVALID_CREDENTIALS.code,
        'AUTH_INVALID_CREDENTIALS',
        'Password salah'
      );
    }

    // Soft delete: mark as inactive instead of hard delete
    const deleteQuery = `
      UPDATE users
      SET 
        is_active = false,
        email = CONCAT('deleted_', id, '_', email),
        updated_at = NOW()
      WHERE id = $1
    `;
    await query(deleteQuery, [user_id]);

    res.json({
      success: true,
      message: 'Account deleted successfully',
      messageEn: 'Account deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /v1/profile/treatment-plans
 * Get patient's treatment plans and items
 */
export const getTreatmentPlans = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const user_role = req.user.role;

    if (user_role !== 'patient') {
      throw new APIError(
        ERROR_CODES.AUTH_FORBIDDEN.code,
        'AUTH_FORBIDDEN',
        'Hanya pasien yang dapat mengakses rencana perawatan'
      );
    }

    // Fetch plans
    const plansQuery = `
      SELECT 
        tp.id, tp.title, tp.description, tp.priority, tp.status, 
        tp.progress, tp.estimated_cost, tp.actual_cost, 
        tp.target_completion, tp.completed_at, tp.notes, tp.created_at,
        u.name as dentist_name,
        u.avatar_url as dentist_avatar
      FROM treatment_plans tp
      JOIN users u ON u.id = tp.dentist_id
      WHERE tp.patient_id = $1
      ORDER BY tp.created_at DESC
    `;
    const plansResult = await query(plansQuery, [user_id]);

    if (plansResult.rows.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const planIds = plansResult.rows.map(p => p.id);
    
    // Fetch items for these plans
    const itemsQuery = `
      SELECT * FROM treatment_items
      WHERE treatment_plan_id = ANY($1)
      ORDER BY sort_order ASC
    `;
    const itemsResult = await query(itemsQuery, [planIds]);

    // Group items by plan
    const itemsByPlan = itemsResult.rows.reduce((acc, item) => {
      const planId = item.treatment_plan_id.toString();
      if (!acc[planId]) acc[planId] = [];
      acc[planId].push({
        ...item,
        id: item.id.toString(),
        treatment_plan_id: item.treatment_plan_id.toString()
      });
      return acc;
    }, {});

    const plans = plansResult.rows.map(plan => ({
      ...plan,
      id: plan.id.toString(),
      items: itemsByPlan[plan.id.toString()] || []
    }));

    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /v1/profile/health-history
 * Get aggregated health journey (Timeline)
 */
export const getHealthHistory = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const user_role = req.user.role;

    if (user_role !== 'patient') {
      throw new APIError(
        ERROR_CODES.AUTH_FORBIDDEN.code,
        'AUTH_FORBIDDEN',
        'Hanya pasien yang dapat mengakses riwayat kesehatan'
      );
    }

    // 1. Fetch Appointments (completed/overdue/canceled)
    const appointmentsQuery = `
      SELECT 
        id::text, 'appointment' as type, starts_at as date,
        status, reason, notes,
        (SELECT name FROM users WHERE id = dentist_id) as dentist_name
      FROM appointments
      WHERE patient_id = $1
      ORDER BY starts_at DESC
    `;
    const appts = await query(appointmentsQuery, [user_id]);

    // 2. Fetch AI Analysis Results
    const aiResultsQuery = `
      SELECT 
        id::text, 'ai_analysis' as type, created_at as date,
        overall_assessment as title, risk_level, confidence_score, findings
      FROM ai_analysis_results
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;
    const aiResults = await query(aiResultsQuery, [user_id]);

    // 3. Fetch Imaging Studies
    const studiesQuery = `
      SELECT 
        id::text, 'imaging' as type, study_date as date,
        description as title, modality, status
      FROM imaging_studies
      WHERE patient_id = $1
      ORDER BY study_date DESC
    `;
    const studies = await query(studiesQuery, [user_id]);

    // Aggregate and sort
    const timeline = [
      ...appts.rows,
      ...aiResults.rows,
      ...studies.rows
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      data: timeline
    });
  } catch (error) {
    next(error);
  }
};
