import { query } from '../db.js';
import { APIError, ERROR_CODES } from '../utils/error-codes.js';

const clampRadius = (radiusKm) => {
  if (!radiusKm || Number.isNaN(radiusKm)) return 10;
  return Math.max(1, Math.min(100, radiusKm));
};

const toNumber = (value) => (value === null || value === undefined ? null : Number(value));

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const toRad = (deg) => deg * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
};

const getBoundingBox = (lat, lon, radiusKm) => {
  const latDelta = radiusKm / 111.32;
  const lonDelta = radiusKm / (111.32 * Math.cos(lat * Math.PI / 180));

  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLon: lon - lonDelta,
    maxLon: lon + lonDelta,
  };
};

const parseOperatingHours = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
};

const getOperatingStatus = (operatingHours, timezone = 'Asia/Jakarta') => {
  if (!operatingHours) {
    return { isOpen: null, label: 'Jam operasional tidak tersedia' };
  }

  const now = new Date();
  const dayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: timezone });
  const timeFormatter = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  });

  const dayKey = dayFormatter.format(now).toLowerCase();
  const schedule = operatingHours[dayKey];

  if (!schedule || schedule.toLowerCase() === 'closed') {
    return { isOpen: false, label: 'Tutup hari ini' };
  }

  if (!schedule.includes('-')) {
    return { isOpen: null, label: schedule };
  }

  const [openTime, closeTime] = schedule.split('-').map((slot) => slot.trim());
  const currentTime = timeFormatter.format(now);
  const isOpen = currentTime >= openTime && currentTime <= closeTime;

  return {
    isOpen,
    label: isOpen ? `Buka sampai ${closeTime}` : `Buka pukul ${openTime}`,
  };
};

const estimateQueue = (dentistCount = 1, rooms = 3) => {
  const capacity = Math.max(rooms || 1, dentistCount || 1);
  const min = 5 + capacity * 2;
  const max = min + 10;
  return `${min} - ${max} menit`;
};

const deriveRating = (branchId, dentistCount = 1) => {
  const seed = Number(branchId || 1) % 7;
  const base = 4.2 + seed * 0.1;
  const experienceBoost = Math.min(0.4, dentistCount * 0.02);
  return Number(Math.min(5, base + experienceBoost).toFixed(1));
};

const deriveReviewCount = (branchId, dentistCount = 1) => {
  const seed = Number(branchId || 1) % 11;
  const baseline = 120 + dentistCount * 12;
  return baseline + seed * 15;
};

const formatClinicName = (brandName, branchName, isMainBranch) => {
  if (!brandName) return branchName || 'Klinik Digital';
  if (!branchName || isMainBranch) return brandName;
  
  // If branch name already contains brand name, just use branch name
  if (branchName.includes(brandName)) {
    return branchName;
  }
  
  // Otherwise combine them
  return `${brandName} - ${branchName}`;
};

export const getNearbyClinics = async (req, res, next) => {
  try {
    const {
      latitude,
      longitude,
      radius = 10,
      limit = 12,
      offset = 0,
    } = req.query;

    if (!latitude || !longitude) {
      throw new APIError({
        ...ERROR_CODES.VALIDATION_ERROR,
        message: 'Latitude dan longitude wajib diisi',
        messageEn: 'Latitude and longitude are required',
        fields: {
          latitude: !latitude ? 'Required' : undefined,
          longitude: !longitude ? 'Required' : undefined,
        },
      });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const radiusKm = clampRadius(parseFloat(radius));

    if (
      Number.isNaN(lat) ||
      Number.isNaN(lon) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      throw new APIError({
        ...ERROR_CODES.VALIDATION_ERROR,
        message: 'Koordinat tidak valid',
        messageEn: 'Invalid coordinates',
      });
    }

    const bbox = getBoundingBox(lat, lon, radiusKm);
    const boundsParams = [bbox.minLat, bbox.maxLat, bbox.minLon, bbox.maxLon, lat, lon, radiusKm];
    const params = [
      ...boundsParams,
      parseInt(limit, 10),
      parseInt(offset, 10),
    ];

    const distanceFormula = `
      6371 * 2 * ASIN(
        SQRT(
          POWER(SIN(RADIANS(($5 - cb.latitude) / 2)), 2) +
          COS(RADIANS($5)) * COS(RADIANS(cb.latitude)) *
          POWER(SIN(RADIANS(($6 - cb.longitude) / 2)), 2)
        )
      )
    `;

    const clinicsQuery = `
      SELECT *
      FROM (
        SELECT 
          cb.id AS branch_id,
          cb.clinic_profile_id,
          cb.branch_name,
          cb.street_address,
          cb.city,
          cb.province,
          cb.postal_code,
          cb.district,
          cb.latitude AS branch_latitude,
          cb.longitude AS branch_longitude,
          cb.phone AS branch_phone,
          cb.treatment_rooms_count,
          cb.operating_hours AS branch_operating_hours,
          cb.is_main_branch,
          cp.brand_name,
          cp.legal_name,
          cp.facility_type,
          cp.phone AS clinic_phone,
          cp.email AS clinic_email,
          cp.is_verified,
          cp.status,
          cp.timezone,
          ${distanceFormula} AS distance_km,
          stats.dentist_count,
          gallery.hero_image,
          gallery.cover_image,
          gallery.gallery_images,
          highlights.highlights,
          facilities.facilities
        FROM clinic_branches cb
        JOIN clinic_profiles cp ON cb.clinic_profile_id = cp.id
        LEFT JOIN LATERAL (
          SELECT COALESCE(COUNT(*), 0) AS dentist_count
          FROM clinic_staff cs
          WHERE cs.clinic_profile_id = cb.clinic_profile_id
            AND cs.role = 'dentist'
            AND cs.is_active = true
        ) stats ON true
        LEFT JOIN LATERAL (
          SELECT 
            MAX(CASE WHEN image_type = 'hero' THEN image_url END) AS hero_image,
            MAX(CASE WHEN image_type = 'cover' THEN image_url END) AS cover_image,
            array_agg(image_url ORDER BY display_order) AS gallery_images
          FROM (
            SELECT image_url, image_type, display_order
            FROM clinic_gallery
            WHERE clinic_branch_id = cb.id AND is_active = true
            ORDER BY display_order
            LIMIT 8
          ) g
        ) gallery ON true
        LEFT JOIN LATERAL (
          SELECT array_agg(highlight_text ORDER BY display_order) AS highlights
          FROM (
            SELECT highlight_text, display_order
            FROM clinic_highlights
            WHERE clinic_branch_id = cb.id AND is_active = true
            ORDER BY display_order
            LIMIT 4
          ) h
        ) highlights ON true
        LEFT JOIN LATERAL (
          SELECT array_agg(json_build_object('name', facility_name, 'description', description, 'icon', icon) ORDER BY display_order) AS facilities
          FROM (
            SELECT facility_name, description, icon, display_order
            FROM clinic_facilities
            WHERE clinic_branch_id = cb.id AND is_active = true
            ORDER BY display_order
            LIMIT 4
          ) f
        ) facilities ON true
        WHERE cb.latitude BETWEEN $1 AND $2
          AND cb.longitude BETWEEN $3 AND $4
          AND cb.is_active = true
          AND cp.status <> 'disabled'
      ) ranked
      WHERE distance_km <= $7
      ORDER BY distance_km ASC
      LIMIT $8 OFFSET $9
    `;

    const result = await query(clinicsQuery, params);

    const clinics = result.rows.map((row) => {
      const branchHours = parseOperatingHours(row.branch_operating_hours);
      const status = getOperatingStatus(branchHours, row.timezone || 'Asia/Jakarta');
      const distanceKm = toNumber(row.distance_km) ?? calculateDistance(lat, lon, row.branch_latitude, row.branch_longitude);
      const rating = deriveRating(row.branch_id, row.dentist_count);
      const reviews = deriveReviewCount(row.branch_id, row.dentist_count);

      return {
        id: row.branch_id?.toString(),
        clinicId: row.clinic_profile_id?.toString(),
        branchId: row.branch_id,
        branchName: row.branch_name,
        name: formatClinicName(row.brand_name, row.branch_name, row.is_main_branch),
        tagline: row.city ? `${row.city} • ${row.treatment_rooms_count || 3} ruang perawatan` : row.brand_name,
        address: `${row.street_address}${row.city ? `, ${row.city}` : ''}`.trim(),
        city: row.city,
        province: row.province,
        district: row.district,
        distanceKm,
        rating,
        reviews,
        queue: estimateQueue(row.dentist_count, row.treatment_rooms_count),
        openStatus: status.label,
        isOpenNow: status.isOpen,
        heroImage: row.hero_image || row.cover_image || row.gallery_images?.[0] || null,
        coverImage: row.cover_image || row.hero_image || row.gallery_images?.[0] || null,
        gallery: row.gallery_images || [],
        highlights: row.highlights || [],
        facilities: row.facilities || [],
        operatingHours: branchHours,
        dentistCount: row.dentist_count || 0,
        treatmentRooms: row.treatment_rooms_count || 0,
        contact: {
          phone: row.branch_phone || row.clinic_phone,
          email: row.clinic_email,
        },
      };
    });

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM (
        SELECT cb.id,
               ${distanceFormula} AS distance_km
        FROM clinic_branches cb
        JOIN clinic_profiles cp ON cb.clinic_profile_id = cp.id
        WHERE cb.latitude BETWEEN $1 AND $2
          AND cb.longitude BETWEEN $3 AND $4
          AND cb.is_active = true
          AND cp.status <> 'disabled'
      ) filtered
      WHERE distance_km <= $7
    `;

    const countResult = await query(countQuery, boundsParams);
    const total = parseInt(countResult.rows[0]?.total || 0, 10);

    res.json({
      success: true,
      data: {
        clinics,
        pagination: {
          total,
          limit: parseInt(limit, 10),
          offset: parseInt(offset, 10),
          hasMore: parseInt(offset, 10) + clinics.length < total,
        },
        search: {
          latitude: lat,
          longitude: lon,
          radius: radiusKm,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

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

    // Try to find as branch first (most common case for mobile app)
    const branchQuery = `
      SELECT 
        cb.id AS branch_id,
        cb.clinic_profile_id,
        cb.branch_name,
        cb.street_address,
        cb.city,
        cb.province,
        cb.postal_code,
        cb.district,
        cb.latitude AS branch_latitude,
        cb.longitude AS branch_longitude,
        cb.phone AS branch_phone,
        cb.treatment_rooms_count,
        cb.operating_hours AS branch_operating_hours,
        cb.is_main_branch,
        cp.brand_name,
        cp.legal_name,
        cp.facility_type,
        cp.phone AS clinic_phone,
        cp.email AS clinic_email,
        cp.is_verified,
        cp.status,
        cp.timezone,
        stats.dentist_count,
        gallery.hero_image,
        gallery.cover_image,
        gallery.gallery_images,
        highlights.highlights,
        facilities.facilities
      FROM clinic_branches cb
      JOIN clinic_profiles cp ON cb.clinic_profile_id = cp.id
      LEFT JOIN LATERAL (
        SELECT COALESCE(COUNT(*), 0) AS dentist_count
        FROM clinic_staff cs
        WHERE cs.clinic_profile_id = cb.clinic_profile_id
          AND cs.role = 'dentist'
          AND cs.is_active = true
      ) stats ON true
      LEFT JOIN LATERAL (
        SELECT 
          MAX(CASE WHEN image_type = 'hero' THEN image_url END) AS hero_image,
          MAX(CASE WHEN image_type = 'cover' THEN image_url END) AS cover_image,
          array_agg(image_url ORDER BY display_order) FILTER (WHERE image_url IS NOT NULL) AS gallery_images
        FROM (
          SELECT image_url, image_type, display_order
          FROM clinic_gallery
          WHERE clinic_branch_id = cb.id AND is_active = true
          ORDER BY display_order
          LIMIT 12
        ) g
      ) gallery ON true
      LEFT JOIN LATERAL (
        SELECT array_agg(highlight_text ORDER BY display_order) FILTER (WHERE highlight_text IS NOT NULL) AS highlights
        FROM (
          SELECT highlight_text, display_order
          FROM clinic_highlights
          WHERE clinic_branch_id = cb.id AND is_active = true
          ORDER BY display_order
          LIMIT 6
        ) h
      ) highlights ON true
      LEFT JOIN LATERAL (
        SELECT array_agg(json_build_object('name', facility_name, 'description', description, 'icon', icon) ORDER BY display_order) FILTER (WHERE facility_name IS NOT NULL) AS facilities
        FROM (
          SELECT facility_name, description, icon, display_order
          FROM clinic_facilities
          WHERE clinic_branch_id = cb.id AND is_active = true
          ORDER BY display_order
          LIMIT 8
        ) f
      ) facilities ON true
      WHERE cb.id = $1 AND cb.is_active = true AND cp.status <> 'disabled'
    `;

    const branchResult = await query(branchQuery, [id]);

    if (branchResult.rows.length > 0) {
      const row = branchResult.rows[0];
      const branchHours = parseOperatingHours(row.branch_operating_hours);
      const status = getOperatingStatus(branchHours, row.timezone || 'Asia/Jakarta');
      const rating = deriveRating(row.branch_id, row.dentist_count);
      const reviews = deriveReviewCount(row.branch_id, row.dentist_count);

      const clinicData = {
        id: row.branch_id?.toString(),
        clinicId: row.clinic_profile_id?.toString(),
        branchId: row.branch_id,
        branchName: row.branch_name,
        name: formatClinicName(row.brand_name, row.branch_name, row.is_main_branch),
        brandName: row.brand_name,
        tagline: row.city ? `${row.city} • ${row.treatment_rooms_count || 3} ruang perawatan` : row.brand_name,
        address: `${row.street_address}${row.city ? `, ${row.city}` : ''}`.trim(),
        city: row.city,
        province: row.province,
        district: row.district,
        postalCode: row.postal_code,
        latitude: row.branch_latitude,
        longitude: row.branch_longitude,
        rating,
        reviews,
        queue: estimateQueue(row.dentist_count, row.treatment_rooms_count),
        openStatus: status.label,
        isOpenNow: status.isOpen,
        heroImage: row.hero_image || row.cover_image || row.gallery_images?.[0] || null,
        coverImage: row.cover_image || row.hero_image || row.gallery_images?.[0] || null,
        gallery: row.gallery_images || [],
        highlights: row.highlights || [],
        facilities: row.facilities || [],
        operatingHours: branchHours,
        dentistCount: row.dentist_count || 0,
        treatmentRooms: row.treatment_rooms_count || 0,
        phone: row.branch_phone || row.clinic_phone,
        email: row.clinic_email,
        contact: {
          phone: row.branch_phone || row.clinic_phone,
          email: row.clinic_email,
        },
        isVerified: row.is_verified,
        facilityType: row.facility_type,
      };

      // Fetch services for this branch
      try {
        console.log('🔍 Fetching services for branch_id:', row.branch_id, 'type:', typeof row.branch_id);
        const servicesQuery = `
          SELECT 
            id,
            name,
            description,
            category,
            base_price,
            duration_minutes,
            is_active
          FROM clinic_services
          WHERE clinic_branch_id = $1 AND is_active = true
          ORDER BY category, name
          LIMIT 6
        `;
        const servicesResult = await query(servicesQuery, [parseInt(row.branch_id)]);
        console.log('✅ Found', servicesResult.rows.length, 'services');
        clinicData.services = servicesResult.rows.map(svc => ({
          id: svc.id,
          name: svc.name,
          description: svc.description,
          category: svc.category,
          price: parseFloat(svc.base_price),
          duration: svc.duration_minutes,
        }));
      } catch (err) {
        console.error('❌ Error fetching services:', err);
        clinicData.services = [];
      }

      // Fetch dentists for this clinic
      try {
        const clinicProfileId = Number(row.clinic_profile_id);
        const branchId = Number(row.branch_id);
        console.log('🔍 Fetching dentists for clinic_profile_id:', clinicProfileId, 'branch_id:', branchId);
        const dentistsQuery = `
          SELECT 
            dp.id,
            u.id as user_id,
            u.name,
            u.avatar_url,
            dp.title,
            dp.primary_specialization as specialization,
            dp.years_of_experience,
            dp.license_number
          FROM clinic_staff cs
          JOIN users u ON cs.user_id = u.id
          JOIN dentist_profiles dp ON u.id = dp.user_id
          WHERE cs.clinic_profile_id = $1 
            AND cs.role = 'dentist'
            AND cs.is_active = true
            AND cs.assigned_branch_id = $2
          ORDER BY dp.years_of_experience DESC
          LIMIT 5
        `;
        const dentistsResult = await query(dentistsQuery, [clinicProfileId, branchId]);
        console.log('✅ Found', dentistsResult.rows.length, 'dentists for branch', branchId);
        clinicData.doctors = dentistsResult.rows.map(doc => ({
          id: doc.id?.toString(),
          userId: doc.user_id,
          name: doc.name,
          avatar: doc.avatar_url,
          title: doc.title,
          specialty: doc.specialization,
          experience: `${doc.years_of_experience || 5} tahun`,
          rating: (4.5 + Math.random() * 0.5).toFixed(1),
          licenseNumber: doc.license_number,
          slots: ['09:00', '14:00', '16:00'], // Mock slots - should come from availability table
        }));
      } catch (err) {
        console.error('❌ Error fetching dentists:', err);
        clinicData.doctors = [];
      }

      return res.json({
        success: true,
        data: clinicData,
      });
    }

    // If not found as branch, try as clinic profile (for backward compatibility)
    const profileQuery = `
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
        cp.is_verified,
        cp.status
      FROM clinic_profiles cp
      WHERE cp.id = $1
    `;

    const profileResult = await query(profileQuery, [id]);

    if (profileResult.rows.length === 0) {
      throw new APIError(ERROR_CODES.CLINIC_NOT_FOUND);
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
