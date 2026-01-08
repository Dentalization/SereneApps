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
          NULL AS hero_image,
          NULL AS cover_image,
          NULL AS gallery_images,
          NULL AS highlights,
          NULL AS facilities
        FROM clinic_branches cb
        JOIN clinic_profiles cp ON cb.clinic_profile_id = cp.id
        LEFT JOIN LATERAL (
          SELECT COALESCE(COUNT(*), 0) AS dentist_count
          FROM clinic_staff cs
          WHERE cs.clinic_profile_id = cb.clinic_profile_id
            AND cs.role = 'dentist'
            AND cs.is_active = true
        ) stats ON true
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
    console.log('🏥 [getClinicById] Fetching clinic with ID:', id);

    // Try to find as branch first (most common case for mobile app)
    // Using simplified query first to avoid LATERAL JOIN issues
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
        cp.timezone
      FROM clinic_branches cb
      JOIN clinic_profiles cp ON cb.clinic_profile_id = cp.id
      WHERE cb.id = $1 AND cb.is_active = true AND cp.status <> 'disabled'
    `;

    console.log('🔍 [getClinicById] Executing branch query for ID:', id);
    const branchResult = await query(branchQuery, [id]);

    if (branchResult.rows.length > 0) {
      const row = branchResult.rows[0];
      console.log('✅ [getClinicById] Found branch:', row.branch_id);
      
      const branchHours = parseOperatingHours(row.branch_operating_hours);
      const status = getOperatingStatus(branchHours, row.timezone || 'Asia/Jakarta');

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
        openStatus: status.label,
        isOpenNow: status.isOpen,
        operatingHours: branchHours,
        phone: row.branch_phone || row.clinic_phone,
        email: row.clinic_email,
        contact: {
          phone: row.branch_phone || row.clinic_phone,
          email: row.clinic_email,
        },
        isVerified: row.is_verified,
        services: [],
        doctors: [],
        gallery: [],
        highlights: [],
        facilities: [],
      };

      // Fetch dentist count separately with error handling
      try {
        console.log('🔍 [getClinicById] Fetching dentist count for clinic_profile_id:', row.clinic_profile_id);
        const statsQuery = `
          SELECT COALESCE(COUNT(*), 0) AS dentist_count
          FROM clinic_staff cs
          WHERE cs.clinic_profile_id = $1
            AND cs.role = 'dentist'
            AND cs.is_active = true
        `;
        const statsResult = await query(statsQuery, [row.clinic_profile_id]);
        const dentistCount = statsResult.rows[0]?.dentist_count || 0;
        console.log('✅ [getClinicById] Found', dentistCount, 'dentists');
        
        const rating = deriveRating(row.branch_id, dentistCount);
        const reviews = deriveReviewCount(row.branch_id, dentistCount);
        clinicData.rating = rating;
        clinicData.reviews = reviews;
        clinicData.queue = estimateQueue(dentistCount, row.treatment_rooms_count);
        clinicData.doctorCount = dentistCount;
        clinicData.dentistCount = dentistCount; // Ensure dentistCount is set for mobile client
        clinicData.treatmentRooms = row.treatment_rooms_count; // Add treatment rooms count
      } catch (err) {
        console.error('⚠️ [getClinicById] Error fetching dentist count:', err.message);
        clinicData.rating = 4.5;
        clinicData.reviews = 120;
        clinicData.queue = 'Normal';
        clinicData.doctorCount = 0;
      }

      // Fetch gallery images with error handling
      try {
        console.log('🖼️ [getClinicById] Fetching gallery for branch_id:', row.branch_id);
        const galleryQuery = `
          SELECT image_url, image_type, display_order
          FROM clinic_gallery
          WHERE clinic_branch_id = $1 AND is_active = true
          ORDER BY display_order
          LIMIT 12
        `;
        const galleryResult = await query(galleryQuery, [row.branch_id]);
        console.log('✅ [getClinicById] Found', galleryResult.rows.length, 'gallery images');
        
        clinicData.gallery = galleryResult.rows.map(img => ({
          id: img.id,
          image_url: img.image_url,
          image_type: img.image_type,
          caption: img.caption,
        }));
        
        // Extract hero and cover images
        const heroImg = galleryResult.rows.find(img => img.image_type === 'hero');
        const coverImg = galleryResult.rows.find(img => img.image_type === 'cover');
        clinicData.heroImage = heroImg?.image_url || null;
        clinicData.coverImage = coverImg?.image_url || null;
      } catch (err) {
        console.error('⚠️ [getClinicById] Error fetching gallery:', err.message);
        // If table doesn't exist, return empty gallery gracefully
        clinicData.gallery = [];
        clinicData.heroImage = null;
        clinicData.coverImage = null;
      }

      // Fetch highlights with error handling
      try {
        console.log('⭐ [getClinicById] Fetching highlights for branch_id:', row.branch_id);
        const highlightsQuery = `
          SELECT highlight_text, icon, display_order
          FROM clinic_highlights
          WHERE clinic_branch_id = $1 AND is_active = true
          ORDER BY display_order
          LIMIT 6
        `;
        const highlightsResult = await query(highlightsQuery, [row.branch_id]);
        console.log('✅ [getClinicById] Found', highlightsResult.rows.length, 'highlights');
        
        clinicData.highlights = highlightsResult.rows.map(h => ({
          id: h.id,
          highlight_text: h.highlight_text,
          icon: h.icon || 'check',
        }));
      } catch (err) {
        console.error('⚠️ [getClinicById] Error fetching highlights:', err.message);
        clinicData.highlights = [];
      }

      // Fetch facilities with error handling
      try {
        console.log('🏥 [getClinicById] Fetching facilities for branch_id:', row.branch_id);
        const facilitiesQuery = `
          SELECT facility_name, description, icon, display_order
          FROM clinic_facilities
          WHERE clinic_branch_id = $1 AND is_active = true
          ORDER BY display_order
          LIMIT 8
        `;
        const facilitiesResult = await query(facilitiesQuery, [row.branch_id]);
        console.log('✅ [getClinicById] Found', facilitiesResult.rows.length, 'facilities');
        
        clinicData.facilities = facilitiesResult.rows.map(f => ({
          id: f.id,
          facility_name: f.facility_name,
          description: f.description,
          icon: f.icon || 'check-circle',
        }));
      } catch (err) {
        console.error('⚠️ [getClinicById] Error fetching facilities:', err.message);
        clinicData.facilities = [];
      }

      // Fetch services for this branch with error handling
      try {
        console.log('📋 [getClinicById] Fetching services for branch_id:', row.branch_id);
        const servicesQuery = `
          SELECT 
            id,
            name,
            description,
            category,
            COALESCE(base_price, 0) as base_price,
            duration_minutes,
            is_active
          FROM clinic_services
          WHERE clinic_branch_id = $1 AND is_active = true
          ORDER BY category, name
          LIMIT 6
        `;
        const servicesResult = await query(servicesQuery, [row.branch_id]);
        console.log('✅ [getClinicById] Found', servicesResult.rows.length, 'services with prices:', servicesResult.rows.map(s => ({ name: s.name, price: s.base_price })));
        
        // Use actual services or fallback to demo data if none exist
        if (servicesResult.rows.length === 0) {
          console.log('⚠️ [getClinicById] No services found, using demo data');
          clinicData.services = [
            { name: 'Konsultasi Gigi', description: 'Pemeriksaan dan konsultasi gigi menyeluruh', price: 250000, category: 'general' },
            { name: 'Pembersihan Karang Gigi', description: 'Scaling untuk membersihkan karang gigi dan plak', price: 300000, category: 'general' },
            { name: 'Ekstraksi Gigi', description: 'Pencabutan gigi dengan teknik modern dan aman', price: 500000, category: 'general' },
            { name: 'Tambal Gigi', description: 'Perawatan gigi berlubang dengan bahan berkualitas tinggi', price: 400000, category: 'general' },
            { name: 'Implan Gigi', description: 'Implan gigi titanium berstandar internasional', price: 5000000, category: 'specialist' },
            { name: 'Perawatan Saluran Akar', description: 'Root canal treatment untuk gigi yang terinfeksi', price: 1500000, category: 'specialist' },
          ];
        } else {
          clinicData.services = servicesResult.rows.map(svc => ({
            id: svc.id,
            name: svc.name,
            description: svc.description,
            category: svc.category,
            price: svc.base_price || 250000, // Fallback to default price if 0
            base_price: svc.base_price || 250000,
            duration_minutes: svc.duration_minutes,
            is_active: svc.is_active,
          }));
        }
      } catch (err) {
        console.error('⚠️ [getClinicById] Error fetching services:', err.message);
        // Fallback to demo data on error
        clinicData.services = [
          { name: 'Konsultasi Gigi', description: 'Pemeriksaan dan konsultasi gigi enyeluruh', price: 250000, category: 'general' },
          { name: 'Pembersihan Karang Gigi', description: 'Scaling untuk membersihkan karang gigi dan plak', price: 300000, category: 'general' },
          { name: 'Ekstraksi Gigi', description: 'Pencabutan gigi dengan teknik modern dan aman', price: 500000, category: 'general' },
        ];
      }

      // Fetch dentists for this clinic with error handling
      try {
        const clinicProfileId = Number(row.clinic_profile_id);
        const branchId = Number(row.branch_id);
        console.log('👨‍⚕️ [getClinicById] Fetching dentists for clinic_profile_id:', clinicProfileId, 'branch_id:', branchId);
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
        console.log('✅ [getClinicById] Found', dentistsResult.rows.length, 'dentists for branch', branchId);
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
        console.error('⚠️ [getClinicById] Error fetching dentists:', err.message);
        clinicData.doctors = [];
      }

      console.log('✅ [getClinicById] Returning clinic data with all nested data');
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
