import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;
import { authenticateToken } from '../utils/tokens.js';

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const normalizeSpecialization = (value) => (value || '').trim().toLowerCase();

const requireDentistProfile = async (req, res, next) => {
  try {
    const userId = req.user?.id ?? req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { rows } = await pool.query(
      `SELECT id, user_id, dentist_type, clinic_id, primary_specialization
       FROM dentist_profiles
       WHERE user_id = $1`,
      [userId]
    );

    if (!rows.length) {
      return res.status(403).json({ error: 'Dentist profile not found' });
    }

    const profile = rows[0];
    const { rows: staffRows } = await pool.query(
      `SELECT cs.clinic_profile_id, cs.assigned_branch_id, cb.branch_name
       FROM clinic_staff cs
       LEFT JOIN clinic_branches cb
         ON cb.id = cs.assigned_branch_id
        AND cb.clinic_profile_id = cs.clinic_profile_id
        AND cb.is_active = true
       WHERE cs.user_id = $1 AND cs.is_active = true
       LIMIT 1`,
      [userId]
    );

    const staffRecord = staffRows[0] || null;
    const clinicProfileId = staffRecord?.clinic_profile_id || null;
    const isClinicDentist = Boolean(clinicProfileId);

    req.userId = userId;
    req.dentistProfile = profile;
    req.dentistProfileId = profile.id;
    req.clinicProfileId = clinicProfileId;
    req.clinicStaffRecord = staffRecord;
    req.dentistType = isClinicDentist ? 'clinic' : 'independent';
    next();
  } catch (error) {
    console.error('❌ Error loading dentist profile:', error);
    res.status(500).json({ error: 'Failed to verify dentist profile' });
  }
};

const resolveClinicContext = async (req) => {
  if (req.clinicContext || !req.clinicProfileId) {
    return req.clinicContext || null;
  }

  let staff = req.clinicStaffRecord || null;
  if (!staff) {
    const { rows: staffRows } = await pool.query(
      `SELECT cs.*, cb.branch_name
       FROM clinic_staff cs
       LEFT JOIN clinic_branches cb
         ON cb.id = cs.assigned_branch_id
        AND cb.clinic_profile_id = cs.clinic_profile_id
        AND cb.is_active = true
       WHERE cs.user_id = $1 AND cs.role = 'dentist' AND cs.is_active = true
       LIMIT 1`,
      [req.userId]
    );
    staff = staffRows[0];
    req.clinicStaffRecord = staff || null;
  }

  if (!staff) {
    return null;
  }

  let branchId = staff.branch_name ? staff.assigned_branch_id : null;
  let branchName = staff.branch_name || null;

  if (!branchId) {
    const { rows: branchRows } = await pool.query(
      `SELECT id, branch_name
       FROM clinic_branches
       WHERE clinic_profile_id = $1 AND is_active = true
       ORDER BY is_main_branch DESC, created_at ASC
       LIMIT 1`,
      [staff.clinic_profile_id]
    );
    if (!branchRows.length) {
      return null;
    }
    branchId = branchRows[0].id;
    branchName = branchRows[0].branch_name || null;
  }

  const { rows: clinicRows } = await pool.query(
    `SELECT id, legal_name, brand_name
     FROM clinic_profiles
     WHERE id = $1`,
    [staff.clinic_profile_id]
  );

  const clinicName = clinicRows[0]?.brand_name || clinicRows[0]?.legal_name || null;

  req.clinicContext = {
    clinicProfileId: staff.clinic_profile_id,
    clinicBranchId: branchId,
    branchName,
    clinicName,
  };

  return req.clinicContext;
};

router.get('/services/context', authenticateToken, requireDentistProfile, async (req, res) => {
  try {
    const payload = {
      dentistType: req.dentistType,
      dentistProfileId: req.dentistProfileId,
      primarySpecialization: req.dentistProfile.primary_specialization,
    };

    if (req.dentistType === 'clinic' && req.clinicProfileId) {
      const clinicContext = await resolveClinicContext(req);
      payload.clinic = clinicContext;
    }

    res.json(payload);
  } catch (error) {
    console.error('❌ Error fetching dentist context:', error);
    res.status(500).json({ error: 'Failed to fetch dentist context' });
  }
});

router.get('/practice/services', authenticateToken, requireDentistProfile, async (req, res) => {
  if (req.dentistType !== 'independent') {
    return res.status(403).json({ error: 'Only independent dentists can manage personal services' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT *
       FROM dentist_services
       WHERE dentist_profile_id = $1
       ORDER BY created_at DESC`,
      [req.dentistProfileId]
    );

    res.json({ services: rows });
  } catch (error) {
    console.error('❌ Error fetching dentist services:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

router.post('/practice/services', authenticateToken, requireDentistProfile, async (req, res) => {
  if (req.dentistType !== 'independent') {
    return res.status(403).json({ error: 'Clinic dentists cannot create personal services' });
  }

  try {
    const {
      name,
      description,
      price,
      durationMinutes = 30,
      isActive = true,
    } = req.body;

    const trimmedName = (name || '').trim();
    if (!trimmedName) {
      return res.status(400).json({ error: 'Service name is required' });
    }

    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ error: 'Price must be a positive number' });
    }

    const parsedDuration = durationMinutes ? parseInt(durationMinutes, 10) : 30;

    // Get dentist's primary specialization to determine category and specialty
    const primarySpec = req.dentistProfile.primary_specialization || 'Dokter Gigi Umum';
    const isGeneralDentist = primarySpec.toLowerCase().includes('umum') || 
                            primarySpec.toLowerCase() === 'dokter gigi';
    
    const category = isGeneralDentist ? 'general' : 'specialist';
    const specialty = isGeneralDentist ? null : primarySpec;

    const { rows } = await pool.query(
      `INSERT INTO dentist_services (
        dentist_profile_id, name, description, price, category,
        specialty, duration_minutes, is_active, managed_by, can_edit
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'dentist', true)
      RETURNING *`,
      [
        req.dentistProfileId,
        trimmedName,
        description || null,
        parsedPrice,
        category,
        specialty,
        parsedDuration,
        isActive,
      ]
    );

    res.status(201).json({ message: 'Service created', service: rows[0] });
  } catch (error) {
    console.error('❌ Error creating independent service:', error);
    res.status(500).json({ error: 'Failed to create service' });
  }
});

router.put('/practice/services/:id', authenticateToken, requireDentistProfile, async (req, res) => {
  if (req.dentistType !== 'independent') {
    return res.status(403).json({ error: 'Clinic dentists cannot edit personal services' });
  }

  try {
    const { id } = req.params;
    const existing = await pool.query(
      'SELECT * FROM dentist_services WHERE id = $1 AND dentist_profile_id = $2',
      [id, req.dentistProfileId]
    );

    if (!existing.rows.length) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const {
      name,
      description,
      price,
      durationMinutes,
      isActive,
    } = req.body;

    if (price !== undefined) {
      const parsed = Number(price);
      if (!Number.isFinite(parsed) || parsed < 0) {
        return res.status(400).json({ error: 'Price must be a positive number' });
      }
    }

    const updated = await pool.query(
      `UPDATE dentist_services
       SET
         name = COALESCE($1, name),
         description = COALESCE($2, description),
         price = COALESCE($3, price),
         duration_minutes = COALESCE($4, duration_minutes),
         is_active = COALESCE($5, is_active),
         updated_at = NOW()
       WHERE id = $6 AND dentist_profile_id = $7
       RETURNING *`,
      [
        name?.trim() || null,
        description || null,
        price,
        durationMinutes,
        typeof isActive === 'boolean' ? isActive : null,
        id,
        req.dentistProfileId,
      ]
    );

    res.json({ message: 'Service updated', service: updated.rows[0] });
  } catch (error) {
    console.error('❌ Error updating independent service:', error);
    res.status(500).json({ error: 'Failed to update service' });
  }
});

router.delete('/practice/services/:id', authenticateToken, requireDentistProfile, async (req, res) => {
  if (req.dentistType !== 'independent') {
    return res.status(403).json({ error: 'Clinic dentists cannot delete personal services' });
  }

  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM dentist_services WHERE id = $1 AND dentist_profile_id = $2 RETURNING id',
      [id, req.dentistProfileId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json({ message: 'Service deleted' });
  } catch (error) {
    console.error('❌ Error deleting independent service:', error);
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

router.get('/clinic/services', authenticateToken, requireDentistProfile, async (req, res) => {
  if (req.dentistType !== 'clinic') {
    return res.status(403).json({ error: 'Only clinic dentists can view clinic services' });
  }

  try {
    const clinicContext = await resolveClinicContext(req);
    if (!clinicContext?.clinicBranchId) {
      return res.status(404).json({ error: 'Clinic branch not found for this dentist' });
    }

    const generalServicesPromise = pool.query(
      `SELECT cs.*
       FROM clinic_services cs
       WHERE cs.clinic_branch_id = $1
         AND cs.category = 'general'
         AND cs.is_active = true
       ORDER BY cs.name`,
      [clinicContext.clinicBranchId]
    );

    const specialistServicesPromise = pool.query(
      `SELECT cs.*, sda.custom_price, sda.is_available
       FROM service_dentist_assignments sda
       JOIN clinic_services cs ON cs.id = sda.clinic_service_id
       WHERE sda.dentist_profile_id = $1
         AND sda.is_available = true
         AND cs.is_active = true
       ORDER BY cs.category, cs.name`,
      [req.dentistProfileId]
    );

    const [generalServicesResult, specialistServicesResult] = await Promise.all([
      generalServicesPromise,
      specialistServicesPromise,
    ]);

    const generalServices = generalServicesResult.rows.map((service) => ({
      ...service,
      applies_to_all: true,
    }));

    res.json({
      clinic: clinicContext,
      general: generalServices,
      specialist: specialistServicesResult.rows,
    });
  } catch (error) {
    console.error('❌ Error fetching clinic dentist services:', error);
    res.status(500).json({ error: 'Failed to fetch clinic services' });
  }
});

export default router;
