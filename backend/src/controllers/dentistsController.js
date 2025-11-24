import { query } from '../db.js';
import { APIError, ERROR_CODES } from '../utils/error-codes.js';

/**
 * Haversine formula to calculate distance between two GPS coordinates
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const toRad = (deg) => deg * (Math.PI / 180);
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100; // Round to 2 decimals
}

/**
 * Get bounding box for efficient database queries
 */
function getBoundingBox(lat, lon, radiusKm) {
  const latDelta = radiusKm / 111.32;
  const lonDelta = radiusKm / (111.32 * Math.cos(lat * Math.PI / 180));
  
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLon: lon - lonDelta,
    maxLon: lon + lonDelta
  };
}

/**
 * Get nearby dentists based on geolocation
 * Supports filtering by type (independent/clinic) and specialization
 */
export const getNearbyDentists = async (req, res, next) => {
  try {
    const { 
      latitude, 
      longitude, 
      radius = 10, // Default 10km
      type, // 'independent', 'clinic', or null (all)
      specialization,
      limit = 20,
      offset = 0
    } = req.query;

    // Validate coordinates
    if (!latitude || !longitude) {
      throw new APIError({
        ...ERROR_CODES.VALIDATION_ERROR,
        message: 'Latitude dan longitude harus diisi',
        messageEn: 'Latitude and longitude are required',
        fields: { 
          latitude: !latitude ? 'Required' : undefined,
          longitude: !longitude ? 'Required' : undefined
        }
      });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const radiusKm = parseFloat(radius);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      throw new APIError({
        ...ERROR_CODES.VALIDATION_ERROR,
        message: 'Koordinat tidak valid',
        messageEn: 'Invalid coordinates'
      });
    }

    // Get bounding box for efficient query
    const bbox = getBoundingBox(lat, lon, radiusKm);

    // Build query with filters
    let sqlQuery = `
      SELECT 
        dp.id,
        u.id as user_id,
        u.name,
        u.email,
        u.avatar_url,
        dp.title,
        dp.license_number,
        dp.primary_specialization as specialization,
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
        dp.is_clinic_owner
      FROM dentist_profiles dp
      JOIN users u ON dp.user_id = u.id
      WHERE 
        dp.latitude IS NOT NULL 
        AND dp.longitude IS NOT NULL
        AND dp.latitude BETWEEN $1 AND $2
        AND dp.longitude BETWEEN $3 AND $4
    `;

    const queryParams = [bbox.minLat, bbox.maxLat, bbox.minLon, bbox.maxLon];
    let paramIndex = 5;

    // Filter by dentist type
    if (type && (type === 'independent' || type === 'clinic')) {
      sqlQuery += ` AND dp.dentist_type = $${paramIndex}`;
      queryParams.push(type);
      paramIndex++;
    }

    // Filter by specialization
    if (specialization) {
      sqlQuery += ` AND dp.primary_specialization ILIKE $${paramIndex}`;
      queryParams.push(`%${specialization}%`);
      paramIndex++;
    }

    sqlQuery += ` ORDER BY dp.is_verified DESC, dp.years_of_experience DESC`;
    sqlQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(parseInt(limit), parseInt(offset));

    // Execute query
    const result = await query(sqlQuery, queryParams);

    // Calculate distances and filter by radius
    const dentists = result.rows
      .map(row => {
        const distance = calculateDistance(
          lat, lon, 
          parseFloat(row.latitude), 
          parseFloat(row.longitude)
        );

        return {
          id: row.id,
          userId: row.user_id,
          name: row.name,
          email: row.email,
          avatarUrl: row.avatar_url,
          title: row.title,
          licenseNumber: row.license_number,
          specialization: row.specialization,
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
          distance
        };
      })
      .filter(dentist => dentist.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);

    // Get total count (for pagination)
    let countQuery = `
      SELECT COUNT(*) as total
      FROM dentist_profiles dp
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

    const countResult = await query(countQuery, countParams);
    const totalDentists = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
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
    next(error);
  }
};

/**
 * Get dentist profile by ID
 */
export const getDentistById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const dentistQuery = `
      SELECT 
        dp.id,
        u.id as user_id,
        u.name,
        u.email,
        u.phone_number,
        u.avatar_url,
        dp.title,
        dp.license_number,
        dp.license_issuing_body,
        dp.license_expiry_date,
        dp.registration_number,
        dp.primary_specialization as specialization,
        dp.education_qualification as education,
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
        dp.verification_date,
        dp.created_at,
        dp.updated_at
      FROM dentist_profiles dp
      JOIN users u ON dp.user_id = u.id
      WHERE dp.id = $1
    `;

    const result = await query(dentistQuery, [id]);

    if (result.rows.length === 0) {
      throw new APIError(ERROR_CODES.DENTIST_NOT_FOUND);
    }

    const dentist = result.rows[0];

    // Get clinics where this dentist works
    const clinicsQuery = `
      SELECT 
        cp.id,
        cp.brand_name as name,
        cp.street_address as address,
        cp.city,
        cp.phone as phone_number,
        cs.role,
        cs.is_active,
        cs.assigned_branch_id,
        cb.id as branch_id,
        cb.branch_name,
        cb.street_address as branch_address,
        cb.city as branch_city,
        cb.phone as branch_phone
      FROM clinic_staff cs
      JOIN clinic_profiles cp ON cs.clinic_profile_id = cp.id
      LEFT JOIN clinic_branches cb ON cs.assigned_branch_id = cb.id
      WHERE cs.user_id = $1
      ORDER BY cs.is_active DESC, cp.brand_name ASC
    `;

    const clinicsResult = await query(clinicsQuery, [dentist.user_id]);

    res.json({
      success: true,
      data: {
        ...dentist,
        clinics: clinicsResult.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get dentist's schedule/availability
 */
export const getDentistSchedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date, clinicId } = req.query;

    // Verify dentist exists
    const dentistCheck = await query(
      'SELECT id, user_id FROM dentist_profiles WHERE id = $1',
      [id]
    );

    if (dentistCheck.rows.length === 0) {
      throw new APIError(ERROR_CODES.DENTIST_NOT_FOUND);
    }

    const dentist = dentistCheck.rows[0];

    // If specific clinic requested, verify dentist works there
    if (clinicId) {
      const staffCheck = await query(
        `SELECT id FROM clinic_staff 
         WHERE user_id = $1 AND clinic_profile_id = $2 AND role = 'dentist' AND is_active = true`,
        [dentist.user_id, clinicId]
      );

      if (staffCheck.rows.length === 0) {
        throw new APIError({
          ...ERROR_CODES.DENTIST_NOT_FOUND,
          message: 'Dokter gigi tidak bekerja di klinik ini',
          messageEn: 'Dentist does not work at this clinic'
        });
      }
    }

    // Get dentist's working hours from clinic(s)
    const clinicsQuery = `
      SELECT 
        cp.id as clinic_id,
        cp.brand_name as clinic_name,
        cp.operating_hours
      FROM clinic_staff cs
      JOIN clinic_profiles cp ON cs.clinic_profile_id = cp.id
      WHERE cs.user_id = $1 
        AND cs.role = 'dentist' 
        AND cs.is_active = true
        ${clinicId ? 'AND cp.id = $2' : ''}
    `;

    const clinicsParams = clinicId ? [dentist.user_id, clinicId] : [dentist.user_id];
    const clinicsResult = await query(clinicsQuery, clinicsParams);

    if (clinicsResult.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          dentist_id: id,
          date: date || 'all',
          clinics: [],
          message: 'Dokter gigi tidak memiliki jadwal aktif',
          messageEn: 'Dentist has no active schedule'
        }
      });
    }

    // For each clinic, get booked appointments on the requested date
    const schedules = await Promise.all(
      clinicsResult.rows.map(async (clinic) => {
        let bookedSlots = [];

        if (date) {
          const appointmentsQuery = `
            SELECT 
              appointment_date,
              appointment_time,
              duration_minutes
            FROM appointments
            WHERE dentist_id = $1 
              AND clinic_id = $2
              AND appointment_date = $3
              AND status NOT IN ('cancelled', 'rejected')
            ORDER BY appointment_time ASC
          `;

          const appointmentsResult = await query(appointmentsQuery, [
            id,
            clinic.clinic_id,
            date
          ]);

          bookedSlots = appointmentsResult.rows.map(apt => ({
            time: apt.appointment_time,
            duration: apt.duration_minutes
          }));
        }

        return {
          clinic_id: clinic.clinic_id,
          clinic_name: clinic.clinic_name,
          operating_hours: clinic.operating_hours,
          booked_slots: bookedSlots
        };
      })
    );

    res.json({
      success: true,
      data: {
        dentist_id: id,
        date: date || 'all',
        schedules
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get available time slots for a dentist on a specific date
 */
export const getDentistAvailableSlots = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date, clinicId, duration = 30 } = req.query;

    console.log('📅 [getDentistAvailableSlots] Request:', { id, date, clinicId, duration });

    if (!date) {
      throw new APIError({
        ...ERROR_CODES.VALIDATION_ERROR,
        message: 'Tanggal harus diisi',
        messageEn: 'Date is required',
        fields: { date: 'Date parameter is required' }
      });
    }

    if (!clinicId) {
      throw new APIError({
        ...ERROR_CODES.VALIDATION_ERROR,
        message: 'Clinic ID harus diisi',
        messageEn: 'Clinic ID is required',
        fields: { clinicId: 'Clinic ID parameter is required' }
      });
    }

    // Verify dentist exists and works at this clinic, get consultation types
    const dentistCheck = await query(
      `SELECT dp.id, dp.user_id, dp.consultation_types
       FROM dentist_profiles dp
       JOIN clinic_staff cs ON dp.user_id = cs.user_id
       WHERE dp.id = $1 
         AND cs.clinic_profile_id = $2 
         AND cs.role = 'dentist' 
         AND cs.is_active = true`,
      [id, clinicId]
    );

    console.log('👨‍⚕️ [getDentistAvailableSlots] Dentist check:', dentistCheck.rows);

    if (dentistCheck.rows.length === 0) {
      throw new APIError(ERROR_CODES.DENTIST_NOT_FOUND);
    }

    // Get consultation types (default to onsite if not set)
    const consultationTypes = dentistCheck.rows[0].consultation_types || ['onsite'];
    console.log('💡 [getDentistAvailableSlots] Consultation types:', consultationTypes);
    
    // Normalize consultation types to match frontend expectations
    // Database might have: 'in-person', 'teleconsultation'
    // Frontend expects: 'onsite', 'virtual'
    const normalizedTypes = consultationTypes.map(type => {
      if (type === 'in-person') return 'onsite';
      if (type === 'teleconsultation') return 'virtual';
      return type; // Keep 'onsite' and 'virtual' as is
    });
    console.log('✨ [getDentistAvailableSlots] Normalized types:', normalizedTypes);

    // Get clinic branch operating hours
    // Note: clinicId from frontend is clinic_profile_id, we need to get the branch
    const clinicQuery = `
      SELECT cb.id as branch_id, cb.operating_hours, cb.branch_name, cb.is_main_branch
      FROM clinic_branches cb
      WHERE cb.clinic_profile_id = $1 
        AND cb.is_active = true
      ORDER BY cb.is_main_branch DESC, cb.id ASC
      LIMIT 1
    `;
    const clinicResult = await query(clinicQuery, [clinicId]);
    
    console.log('🏥 [getDentistAvailableSlots] Clinic result:', clinicResult.rows);
    
    if (clinicResult.rows.length === 0) {
      throw new APIError({
        ...ERROR_CODES.VALIDATION_ERROR,
        message: 'Klinik tidak ditemukan',
        messageEn: 'Clinic not found'
      });
    }

    const operatingHours = clinicResult.rows[0]?.operating_hours || {};
    console.log('⏰ [getDentistAvailableSlots] Operating hours:', operatingHours);

    // Get day of week from date
    const requestedDate = new Date(date);
    const dayOfWeek = requestedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    console.log('📆 [getDentistAvailableSlots] Day of week:', dayOfWeek);

    // Get operating hours for that day (format: "08:00-20:00" or "Closed")
    const daySchedule = operatingHours[dayOfWeek];
    console.log('🕐 [getDentistAvailableSlots] Day schedule:', daySchedule);

    if (!daySchedule || daySchedule.toLowerCase() === 'closed') {
      return res.json({
        success: true,
        data: {
          dentist_id: id,
          clinic_id: clinicId,
          date,
          slots: [],
          message: `Klinik tutup pada hari ${dayOfWeek}`,
          messageEn: `Clinic is closed on ${dayOfWeek}`
        }
      });
    }

    // Parse opening and closing times from format "08:00-20:00"
    if (!daySchedule.includes('-')) {
      console.warn('⚠️ Invalid schedule format:', daySchedule);
      return res.json({
        success: true,
        data: {
          dentist_id: id,
          clinic_id: clinicId,
          date,
          slots: [],
          message: `Format jadwal tidak valid`,
          messageEn: `Invalid schedule format`
        }
      });
    }

    const [openTime, closeTime] = daySchedule.split('-').map(t => t.trim());
    const [openHour, openMinute] = openTime.split(':').map(Number);
    const [closeHour, closeMinute] = closeTime.split(':').map(Number);

    console.log('🕐 [getDentistAvailableSlots] Hours:', { openHour, openMinute, closeHour, closeMinute });

    // Get the branch_id from the clinic result
    const branchId = clinicResult.rows[0].branch_id;
    console.log('🏢 [getDentistAvailableSlots] Using branch_id:', branchId);

    // Get all booked appointments for this dentist on this date
    const bookedQuery = `
      SELECT starts_at, ends_at
      FROM appointments
      WHERE dentist_id = $1 
        AND clinic_branch_id = $2
        AND DATE(starts_at) = $3
        AND status NOT IN ('cancelled', 'rejected')
      ORDER BY starts_at ASC
    `;
    const bookedResult = await query(bookedQuery, [id, branchId, date]);

    // Generate all possible time slots
    const slots = [];
    let currentHour = openHour;
    let currentMinute = openMinute;
    const slotDuration = parseInt(duration);

    while (
      currentHour < closeHour ||
      (currentHour === closeHour && currentMinute < closeMinute)
    ) {
      const slotTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
      
      // Check if this slot overlaps with any booked appointment
      const isBooked = bookedResult.rows.some(booking => {
        const bookingStart = new Date(booking.starts_at);
        const bookingEnd = new Date(booking.ends_at);
        
        // Create slot start and end times for comparison
        const slotStart = new Date(requestedDate);
        slotStart.setHours(currentHour, currentMinute, 0, 0);
        
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);

        // Check if slot overlaps with booking
        return (slotStart < bookingEnd && slotEnd > bookingStart);
      });

      // Check if slot end time is within operating hours
      const slotEndHour = Math.floor((currentMinute + slotDuration) / 60) + currentHour;
      const slotEndMinute = (currentMinute + slotDuration) % 60;
      const withinHours = slotEndHour < closeHour || 
                         (slotEndHour === closeHour && slotEndMinute <= closeMinute);

      if (!isBooked && withinHours) {
        // Generate slots for each consultation type the dentist supports
        normalizedTypes.forEach(type => {
          slots.push({
            id: `${date}-${slotTime}-${type}`,
            time: slotTime,
            startsAt: `${date}T${slotTime}:00`,
            duration: slotDuration,
            durationMinutes: slotDuration,
            type: type, // 'onsite' or 'virtual'
            isAvailable: true,
          });
        });
      }

      // Move to next slot
      currentMinute += slotDuration;
      if (currentMinute >= 60) {
        currentHour += Math.floor(currentMinute / 60);
        currentMinute = currentMinute % 60;
      }
    }

    console.log('✅ [getDentistAvailableSlots] Generated slots:', slots.length);

    res.json({
      success: true,
      data: {
        dentistId: id,
        clinicId: clinicId,
        branchId: branchId, // The actual branch ID for appointments
        branchName: clinicResult.rows[0].branch_name,
        date,
        dayOfWeek: dayOfWeek,
        operatingHours: daySchedule,
        slotDuration: slotDuration,
        slots: slots,
        availableSlots: slots, // Alias for compatibility
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getDentistDirectory = async (req, res, next) => {
  try {
    const {
      specialization,
      dentistType,
      clinicId,
      verifiedOnly = 'false',
      limit = 50,
      offset = 0
    } = req.query;

    let sqlQuery = `
      SELECT 
        dp.id,
        u.id as user_id,
        u.name,
        u.email,
        u.avatar_url,
        dp.title,
        dp.license_number,
        dp.primary_specialization as specialization,
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
        dp.created_at
      FROM dentist_profiles dp
      JOIN users u ON dp.user_id = u.id
      WHERE 1=1
    `;

    const queryParams = [];
    let paramIndex = 1;

    if (specialization) {
      sqlQuery += ` AND dp.primary_specialization ILIKE $${paramIndex}`;
      queryParams.push(`%${specialization}%`);
      paramIndex++;
    }

    if (dentistType) {
      sqlQuery += ` AND dp.dentist_type = $${paramIndex}`;
      queryParams.push(dentistType);
      paramIndex++;
    }

    if (clinicId) {
      sqlQuery += ` AND dp.clinic_id = $${paramIndex}`;
      queryParams.push(BigInt(clinicId));
      paramIndex++;
    }

    if (String(verifiedOnly).toLowerCase() === 'true') {
      sqlQuery += ` AND dp.is_verified = true`;
    }

    sqlQuery += ` ORDER BY dp.is_verified DESC, dp.years_of_experience DESC, dp.created_at DESC`;
    sqlQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(parseInt(limit), parseInt(offset));

    const result = await query(sqlQuery, queryParams);

    let countQuery = `SELECT COUNT(*) AS total FROM dentist_profiles dp WHERE 1=1`;
    const countParams = [];
    let countIndex = 1;

    if (specialization) {
      countQuery += ` AND dp.primary_specialization ILIKE $${countIndex}`;
      countParams.push(`%${specialization}%`);
      countIndex++;
    }

    if (dentistType) {
      countQuery += ` AND dp.dentist_type = $${countIndex}`;
      countParams.push(dentistType);
      countIndex++;
    }

    if (clinicId) {
      countQuery += ` AND dp.clinic_id = $${countIndex}`;
      countParams.push(BigInt(clinicId));
      countIndex++;
    }

    if (String(verifiedOnly).toLowerCase() === 'true') {
      countQuery += ` AND dp.is_verified = true`;
    }

    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total, 10) || 0;

    const dentists = result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      email: row.email,
      avatarUrl: row.avatar_url,
      title: row.title,
      licenseNumber: row.license_number,
      specialization: row.specialization,
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
        postalCode: row.postal_code,
      },
      dentistType: row.dentist_type,
      clinicId: row.clinic_id,
      isClinicOwner: row.is_clinic_owner,
      createdAt: row.created_at,
    }));

    res.json({
      success: true,
      data: {
        dentists,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: offset + dentists.length < total,
        },
      },
    });
  } catch (error) {
    console.error('❌ Error fetching dentist directory:', error);
    next(error);
  }
};
