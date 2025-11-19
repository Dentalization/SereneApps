import { query } from '../db.js';
import { APIError, ERROR_CODES } from '../utils/error-codes.js';

/**
 * Get list of clinics with pagination, filtering, and search
 */
export const getClinics = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      city = '',
      services = '',
      rating = '',
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Build WHERE clause
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    // Search by clinic brand name, legal name, or address
    if (search) {
      conditions.push(`(cp.brand_name ILIKE $${paramIndex} OR cp.legal_name ILIKE $${paramIndex} OR cp.street_address ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Filter by city
    if (city) {
      conditions.push(`cp.city ILIKE $${paramIndex}`);
      params.push(`%${city}%`);
      paramIndex++;
    }

    // Note: services, facilities, rating not in current schema
    // These will be added in future migration

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Validate sort columns
    const validSortColumns = ['brand_name', 'legal_name', 'created_at'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'brand_name';
    const sortDir = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    // Count total matching clinics
    const countQuery = `
      SELECT COUNT(*) as total
      FROM clinic_profiles cp
      ${whereClause}
    `;
    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get clinics with pagination
    const clinicsQuery = `
      SELECT 
        cp.id,
        cp.brand_name as name,
        cp.legal_name,
        cp.facility_type,
        cp.street_address as address,
        cp.city,
        cp.province,
        cp.postal_code,
        cp.phone as phone_number,
        cp.email,
        cp.timezone,
        cp.operating_hours,
        cp.owner_name,
        cp.owner_position,
        cp.owner_email,
        cp.owner_whatsapp,
        cp.is_verified,
        cp.verification_date,
        cp.status,
        cp.created_at,
        (
          SELECT COUNT(*)
          FROM clinic_staff cs
          WHERE cs.clinic_profile_id = cp.id AND cs.role = 'dentist'
        ) as dentist_count
      FROM clinic_profiles cp
      ${whereClause}
      ORDER BY 
        CASE WHEN $${paramIndex} = 'brand_name' THEN cp.brand_name END ${sortDir},
        CASE WHEN $${paramIndex} = 'legal_name' THEN cp.legal_name END ${sortDir},
        CASE WHEN $${paramIndex} = 'created_at' THEN cp.created_at END ${sortDir}
      LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
    `;

    params.push(sortColumn, parseInt(limit), offset);
    const result = await query(clinicsQuery, params);
    res.json({
      success: true,
      data: {
        clinics: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('[getClinics] Error:', error);
    next(error);
  }
};

/**
 * Get clinic details by ID
 */
export const getClinicById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const clinicQuery = `
      SELECT 
        cp.id,
        cp.brand_name as name,
        cp.legal_name,
        cp.facility_type,
        cp.street_address as address,
        cp.city,
        cp.province,
        cp.postal_code,
        cp.phone as phone_number,
        cp.email,
        cp.timezone,
        cp.operating_hours,
        cp.owner_name,
        cp.owner_position,
        cp.owner_email,
        cp.owner_whatsapp,
        cp.is_verified,
        cp.verification_date,
        cp.verification_notes,
        cp.status,
        cp.created_at,
        cp.updated_at
      FROM clinic_profiles cp
      WHERE cp.id = $1
    `;

    const result = await query(clinicQuery, [id]);

    if (result.rows.length === 0) {
      throw new APIError(ERROR_CODES.CLINIC_NOT_FOUND);
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
 * Get dentists in a clinic
 */
export const getClinicDentists = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, specialization = '' } = req.query;

    // First verify clinic exists
    const clinicCheck = await query(
      'SELECT id FROM clinic_profiles WHERE id = $1',
      [id]
    );

    if (clinicCheck.rows.length === 0) {
      throw new APIError(ERROR_CODES.CLINIC_NOT_FOUND);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Build WHERE clause for specialization filter
    const conditions = ['cs.clinic_profile_id = $1', "cs.role = 'dentist'"];
    const params = [id];
    let paramIndex = 2;

    if (specialization) {
      conditions.push(`dp.specialization ILIKE $${paramIndex}`);
      params.push(`%${specialization}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Count total dentists
    const countQuery = `
      SELECT COUNT(*) as total
      FROM clinic_staff cs
      JOIN users u ON cs.user_id = u.id
      JOIN dentist_profiles dp ON u.id = dp.user_id
      WHERE ${whereClause}
    `;
    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get dentists
    const dentistsQuery = `
      SELECT 
        dp.id,
        u.id as user_id,
        u.name,
        u.email,
        u.phone_number,
        u.avatar_url,
        dp.title,
        dp.primary_specialization as specialization,
        dp.license_number,
        dp.years_of_experience,
        dp.education_qualification as education,
        dp.consultation_fee,
        dp.accepts_insurance,
        dp.accepts_bpjs,
        dp.emergency_availability,
        dp.is_verified,
        cs.role,
        cs.is_active
      FROM clinic_staff cs
      JOIN users u ON cs.user_id = u.id
      JOIN dentist_profiles dp ON u.id = dp.user_id
      WHERE ${whereClause}
      ORDER BY dp.is_verified DESC, u.name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(parseInt(limit), offset);
    const result = await query(dentistsQuery, params);

    res.json({
      success: true,
      data: {
        dentists: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get clinic services with pricing
 */
export const getClinicServices = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify clinic exists
    const servicesQuery = `
      SELECT 
        id,
        brand_name as name,
        legal_name
      FROM clinic_profiles
      WHERE id = $1
    `;

    const result = await query(servicesQuery, [id]);

    if (result.rows.length === 0) {
      throw new APIError(ERROR_CODES.CLINIC_NOT_FOUND);
    }

    const clinic = result.rows[0];

    // Services table will be added in future migration
    // For now, return empty array with message
    res.json({
      success: true,
      data: {
        clinic_id: clinic.id,
        clinic_name: clinic.name,
        legal_name: clinic.legal_name,
        services: [],
        message: 'Layanan klinik akan segera tersedia',
        messageEn: 'Clinic services will be available soon'
      }
    });
  } catch (error) {
    next(error);
  }
};
