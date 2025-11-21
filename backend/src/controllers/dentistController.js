/**
 * Dentist Controller
 * Handle dentist-related operations
 */

const pool = require('../config/database');
const { calculateDistance, getBoundingBox, isValidCoordinates } = require('../utils/geoUtils');

/**
 * Get nearby dentists based on user location
 * GET /v1/dentists/nearby
 * Query params: latitude, longitude, radius (default 10km), type (independent/clinic)
 */
async function getNearbyDentists(req, res) {
  const client = await pool.connect();

  try {
    const { 
      latitude, 
      longitude, 
      radius = 10, // Default 10km radius
      type, // 'independent', 'clinic', or null (all)
      specialization,
      limit = 20,
      offset = 0
    } = req.query;

    // Validate required parameters
    if (!latitude || !longitude) {
      return res.status(400).json({
        status: 'error',
        message: 'Latitude and longitude are required'
      });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const radiusKm = parseFloat(radius);

    // Validate coordinates
    if (!isValidCoordinates(lat, lon)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180'
      });
    }

    // Get bounding box for efficient query
    const bbox = getBoundingBox(lat, lon, radiusKm);

    // Build dynamic query
    let query = `
      SELECT 
        u.id as user_id,
        u.name,
        u.email,
        u.avatar_url,
        dp.title,
        dp.license_number,
        dp.primary_specialization,
        dp.years_of_experience,
        dp.clinic_name,
        dp.clinic_address,
        dp.clinic_working_hours,
        dp.consultation_types,
        dp.services_offered,
        dp.consultation_fee,
        dp.accepts_insurance,
        dp.accepts_bpjs,
        dp.emergency_availability,
        dp.is_verified,
        dp.latitude,
        dp.longitude,
        dp.district,
        dp.province,
        dp.postal_code,
        dp.dentist_type,
        dp.clinic_id,
        dp.is_clinic_owner,
        -- Calculate distance
        (
          6371 * acos(
            cos(radians($1)) * cos(radians(dp.latitude)) *
            cos(radians(dp.longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(dp.latitude))
          )
        ) AS distance_km
      FROM users u
      INNER JOIN dentist_profiles dp ON u.id = dp.user_id
      WHERE 
        dp.latitude IS NOT NULL 
        AND dp.longitude IS NOT NULL
        AND dp.latitude BETWEEN $3 AND $4
        AND dp.longitude BETWEEN $5 AND $6
    `;

    const queryParams = [
      lat, lon, 
      bbox.minLat, bbox.maxLat, 
      bbox.minLon, bbox.maxLon
    ];
    let paramIndex = 7;

    // Filter by dentist type
    if (type && (type === 'independent' || type === 'clinic')) {
      query += ` AND dp.dentist_type = $${paramIndex}`;
      queryParams.push(type);
      paramIndex++;
    }

    // Filter by specialization
    if (specialization) {
      query += ` AND dp.primary_specialization ILIKE $${paramIndex}`;
      queryParams.push(`%${specialization}%`);
      paramIndex++;
    }

    // Add HAVING clause for radius filter
    query += ` 
      HAVING (
        6371 * acos(
          cos(radians($1)) * cos(radians(dp.latitude)) *
          cos(radians(dp.longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(dp.latitude))
        )
      ) <= $${paramIndex}
    `;
    queryParams.push(radiusKm);
    paramIndex++;

    // Order by distance
    query += ` ORDER BY distance_km ASC`;

    // Pagination
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(parseInt(limit), parseInt(offset));

    // Execute query
    const result = await client.query(query, queryParams);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM users u
      INNER JOIN dentist_profiles dp ON u.id = dp.user_id
      WHERE 
        dp.latitude IS NOT NULL 
        AND dp.longitude IS NOT NULL
        AND dp.latitude BETWEEN $1 AND $2
        AND dp.longitude BETWEEN $3 AND $4
    `;
    const countParams = [bbox.minLat, bbox.maxLat, bbox.minLon, bbox.maxLon];
    let countParamIndex = 5;

    if (type && (type === 'independent' || type === 'clinic')) {
      countQuery += ` AND dp.dentist_type = $${countParamIndex}`;
      countParams.push(type);
      countParamIndex++;
    }

    if (specialization) {
      countQuery += ` AND dp.primary_specialization ILIKE $${countParamIndex}`;
      countParams.push(`%${specialization}%`);
    }

    const countResult = await client.query(countQuery, countParams);
    const totalDentists = parseInt(countResult.rows[0].total);

    // Format response
    const dentists = result.rows.map(row => ({
      id: row.user_id,
      name: row.name,
      email: row.email,
      avatarUrl: row.avatar_url,
      title: row.title,
      licenseNumber: row.license_number,
      specialization: row.primary_specialization,
      yearsOfExperience: row.years_of_experience,
      clinicName: row.clinic_name,
      clinicAddress: row.clinic_address,
      workingHours: row.clinic_working_hours,
      consultationTypes: row.consultation_types,
      servicesOffered: row.services_offered,
      consultationFee: row.consultation_fee,
      acceptsInsurance: row.accepts_insurance,
      acceptsBpjs: row.accepts_bpjs,
      emergencyAvailable: row.emergency_availability,
      isVerified: row.is_verified,
      location: {
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        district: row.district,
        province: row.province,
        postalCode: row.postal_code
      },
      dentistType: row.dentist_type,
      clinicId: row.clinic_id,
      isClinicOwner: row.is_clinic_owner,
      distance: parseFloat(row.distance_km)
    }));

    res.json({
      status: 'success',
      data: {
        dentists,
        pagination: {
          total: totalDentists,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: (parseInt(offset) + dentists.length) < totalDentists
        },
        search: {
          latitude: lat,
          longitude: lon,
          radius: radiusKm,
          type: type || 'all',
          specialization: specialization || 'all'
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching nearby dentists:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch nearby dentists',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
}

/**
 * Get dentist details by ID
 * GET /v1/dentists/:id
 */
async function getDentistById(req, res) {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    const result = await client.query(`
      SELECT 
        u.id as user_id,
        u.name,
        u.email,
        u.avatar_url,
        u.about,
        dp.*
      FROM users u
      INNER JOIN dentist_profiles dp ON u.id = dp.user_id
      WHERE u.id = $1 AND 'dentist' = ANY(u.roles)
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Dentist not found'
      });
    }

    const row = result.rows[0];
    const dentist = {
      id: row.user_id,
      name: row.name,
      email: row.email,
      avatarUrl: row.avatar_url,
      about: row.about,
      title: row.title,
      licenseNumber: row.license_number,
      licenseIssuingBody: row.license_issuing_body,
      licenseExpiryDate: row.license_expiry_date,
      registrationNumber: row.registration_number,
      specialization: row.primary_specialization,
      education: row.education_qualification,
      yearsOfExperience: row.years_of_experience,
      clinicName: row.clinic_name,
      clinicAddress: row.clinic_address,
      workingHours: row.clinic_working_hours,
      consultationTypes: row.consultation_types,
      servicesOffered: row.services_offered,
      consultationFee: row.consultation_fee,
      acceptsInsurance: row.accepts_insurance,
      acceptsBpjs: row.accepts_bpjs,
      emergencyAvailable: row.emergency_availability,
      isVerified: row.is_verified,
      location: {
        latitude: row.latitude ? parseFloat(row.latitude) : null,
        longitude: row.longitude ? parseFloat(row.longitude) : null,
        district: row.district,
        province: row.province,
        postalCode: row.postal_code
      },
      dentistType: row.dentist_type,
      clinicId: row.clinic_id,
      isClinicOwner: row.is_clinic_owner
    };

    res.json({
      status: 'success',
      data: { dentist }
    });

  } catch (error) {
    console.error('❌ Error fetching dentist:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch dentist details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
}

module.exports = {
  getNearbyDentists,
  getDentistById
};
