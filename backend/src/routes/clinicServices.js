import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;
import { authenticateToken } from '../utils/tokens.js';

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const normalizeSpecialization = (value) => (value || '').trim().toLowerCase();

const getClinicDentistsForBranch = async (clinicProfileId, clinicBranchId) => {
  const result = await pool.query(
    `SELECT dp.id, dp.primary_specialization
     FROM clinic_staff cs
     JOIN dentist_profiles dp ON dp.user_id = cs.user_id
     WHERE cs.clinic_profile_id = $1
       AND cs.role = 'dentist'
       AND cs.is_active = true
       AND COALESCE(cs.assigned_branch_id, $2) = $2`,
    [clinicProfileId, clinicBranchId]
  );
  return result.rows;
};

const autoAssignServiceDentists = async ({ serviceId, clinicProfileId, clinicBranchId, category, specialty }) => {
  const dentists = await getClinicDentistsForBranch(clinicProfileId, clinicBranchId);
  if (!dentists.length) {
    console.log('ℹ️ No dentists found for clinic branch, skipping auto assignment');
    return 0;
  }

  let eligibleIds = [];
  if (category === 'general') {
    eligibleIds = dentists.map((dentist) => dentist.id);
  } else if (category === 'specialist') {
    const target = normalizeSpecialization(specialty);
    eligibleIds = dentists
      .filter((dentist) => normalizeSpecialization(dentist.primary_specialization) === target)
      .map((dentist) => dentist.id);
  }

  if (!eligibleIds.length) {
    console.log(`ℹ️ No eligible dentists match auto assignment criteria for service ${serviceId}`);
    return 0;
  }

  await Promise.all(
    eligibleIds.map((dentistId) =>
      pool.query(
        `INSERT INTO service_dentist_assignments (clinic_service_id, dentist_profile_id)
         VALUES ($1, $2)
         ON CONFLICT (clinic_service_id, dentist_profile_id)
         DO UPDATE SET is_available = true`,
        [serviceId, dentistId]
      )
    )
  );

  return eligibleIds.length;
};

// ============================================
// MIDDLEWARE: Check if user is clinic owner/manager
// ============================================
const requireClinicRole = async (req, res, next) => {
  try {
    const userId = req.user?.id ?? req.user?.userId;

    if (!userId) {
      console.log('❌ Missing user ID in authenticated request');
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log('🔍 Checking clinic role for user:', userId);
    
    // Check if user is clinic staff with owner/manager/admin role
    const staffCheck = await pool.query(
      `SELECT cs.*, cs.clinic_profile_id, cs.assigned_branch_id,
              COALESCE(cs.assigned_branch_id, (
                SELECT id FROM clinic_branches 
                WHERE clinic_profile_id = cs.clinic_profile_id 
                LIMIT 1
              )) as branch_id
       FROM clinic_staff cs
       WHERE cs.user_id = $1 AND cs.role IN ('owner', 'manager', 'admin') AND cs.is_active = true`,
      [userId]
    );

    console.log('📊 Staff check result:', staffCheck.rows);

    if (staffCheck.rows.length === 0) {
      console.log('❌ No clinic staff record found for user:', userId);
      return res.status(403).json({ 
        error: 'Access denied. Only clinic owners/managers can manage services.' 
      });
    }

    req.clinicStaff = staffCheck.rows[0];
    req.clinicProfileId = staffCheck.rows[0].clinic_profile_id;
    req.clinicBranchId = staffCheck.rows[0].branch_id; // Use assigned branch or first branch
    
    console.log('✅ Clinic access granted:', {
      userId,
      role: staffCheck.rows[0].role,
      clinicProfileId: req.clinicProfileId,
      clinicBranchId: req.clinicBranchId
    });
    
    next();
  } catch (error) {
    console.error('❌ Error checking clinic role:', error);
    res.status(500).json({ error: 'Failed to verify permissions' });
  }
};

// ============================================
// GET /api/v1/clinic/services
// Get all services for clinic branch
// ============================================
router.get('/services', authenticateToken, requireClinicRole, async (req, res) => {
  try {
    const { clinicBranchId } = req;
    const { category, isActive } = req.query;

    let query = `
      SELECT 
        cs.*,
        COUNT(sda.id)::int as assigned_dentists_count
      FROM clinic_services cs
      LEFT JOIN service_dentist_assignments sda ON cs.id = sda.clinic_service_id AND sda.is_available = true
      WHERE cs.clinic_branch_id = $1
    `;
    
    const params = [clinicBranchId];
    let paramIndex = 2;

    if (category) {
      query += ` AND cs.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (isActive !== undefined) {
      query += ` AND cs.is_active = $${paramIndex}`;
      params.push(isActive === 'true');
      paramIndex++;
    }

    query += `
      GROUP BY cs.id
      ORDER BY cs.category, cs.name
    `;

    const result = await pool.query(query, params);

    console.log(`✅ Retrieved ${result.rows.length} services for clinic branch ${clinicBranchId}`);
    res.json({ services: result.rows });
  } catch (error) {
    console.error('❌ Error fetching clinic services:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// ============================================
// GET /api/v1/clinic/services/:id
// Get single service details
// ============================================
router.get('/services/:id', authenticateToken, requireClinicRole, async (req, res) => {
  try {
    const { id } = req.params;
    const { clinicBranchId } = req;

    const result = await pool.query(
      `SELECT cs.*,
        (SELECT json_agg(
          json_build_object(
            'dentistId', dp.id,
            'dentistName', u.full_name,
            'customPrice', sda.custom_price,
            'isAvailable', sda.is_available
          )
        )
        FROM service_dentist_assignments sda
        JOIN dentist_profiles dp ON sda.dentist_profile_id = dp.id
        JOIN users u ON dp.user_id = u.id
        JOIN clinic_staff cst ON cst.user_id = u.id
        WHERE sda.clinic_service_id = cs.id AND cst.clinic_branch_id = $2
        ) as assigned_dentists
      FROM clinic_services cs
      WHERE cs.id = $1 AND cs.clinic_branch_id = $2`,
      [id, clinicBranchId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json({ service: result.rows[0] });
  } catch (error) {
    console.error('❌ Error fetching service details:', error);
    res.status(500).json({ error: 'Failed to fetch service details' });
  }
});

// ============================================
// POST /api/v1/clinic/services
// Create new clinic service
// ============================================
router.post('/services', authenticateToken, requireClinicRole, async (req, res) => {
  try {
    const { clinicBranchId, clinicProfileId } = req;
    const {
      name,
      description,
      basePrice,
      category,
      specialty,
      durationMinutes,
      isAvailableForAllDentists,
    } = req.body;

    const trimmedName = (name || '').trim();
    if (!trimmedName) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const parsedPrice = Number(basePrice);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ error: 'Base price must be a positive number' });
    }

    const normalizedCategory = (category || 'general').toLowerCase() === 'specialist' ? 'specialist' : 'general';
    const normalizedSpecialty = normalizedCategory === 'specialist' ? (specialty || '').trim() : null;
    const normalizedDuration = durationMinutes ? parseInt(durationMinutes, 10) : 30;
    const normalizedAvailability = normalizedCategory === 'general' ? true : isAvailableForAllDentists !== false;

    const result = await pool.query(
      `INSERT INTO clinic_services (
        clinic_branch_id, name, description, base_price, category, 
        specialty, duration_minutes, is_available_for_all_dentists
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        clinicBranchId,
        trimmedName,
        description,
        parsedPrice,
        normalizedCategory,
        normalizedSpecialty,
        normalizedDuration || 30,
        normalizedAvailability,
      ]
    );

    const createdService = result.rows[0];
    const assigned = await autoAssignServiceDentists({
      serviceId: createdService.id,
      clinicProfileId,
      clinicBranchId,
      category: normalizedCategory,
      specialty: normalizedSpecialty,
    });

    console.log(`✅ Created new service: ${trimmedName} (ID: ${createdService.id}) auto-assigned to ${assigned} dentist(s)`);
    res.status(201).json({ 
      message: 'Service created successfully',
      service: { ...createdService, autoAssignedDentists: assigned }
    });
  } catch (error) {
    console.error('❌ Error creating service:', error);
    res.status(500).json({ error: 'Failed to create service' });
  }
});

// ============================================
// PUT /api/v1/clinic/services/:id
// Update clinic service
// ============================================
router.put('/services/:id', authenticateToken, requireClinicRole, async (req, res) => {
  try {
    const { id } = req.params;
    const { clinicBranchId } = req;
    const {
      name,
      description,
      basePrice,
      category,
      specialty,
      durationMinutes,
      isAvailableForAllDentists,
      isActive,
    } = req.body;

    // Check if service exists and belongs to this clinic
    const existingService = await pool.query(
      'SELECT * FROM clinic_services WHERE id = $1 AND clinic_branch_id = $2',
      [id, clinicBranchId]
    );

    if (existingService.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Validation
    if (basePrice !== undefined && basePrice < 0) {
      return res.status(400).json({ error: 'Price cannot be negative' });
    }

    const result = await pool.query(
      `UPDATE clinic_services 
       SET 
         name = COALESCE($1, name),
         description = COALESCE($2, description),
         base_price = COALESCE($3, base_price),
         category = COALESCE($4, category),
         specialty = COALESCE($5, specialty),
         duration_minutes = COALESCE($6, duration_minutes),
         is_available_for_all_dentists = COALESCE($7, is_available_for_all_dentists),
         is_active = COALESCE($8, is_active)
       WHERE id = $9 AND clinic_branch_id = $10
       RETURNING *`,
      [
        name,
        description,
        basePrice,
        category,
        specialty,
        durationMinutes,
        isAvailableForAllDentists,
        isActive,
        id,
        clinicBranchId,
      ]
    );

    console.log(`✅ Updated service: ${result.rows[0].name} (ID: ${id})`);
    res.json({ 
      message: 'Service updated successfully',
      service: result.rows[0] 
    });
  } catch (error) {
    console.error('❌ Error updating service:', error);
    res.status(500).json({ error: 'Failed to update service' });
  }
});

// ============================================
// DELETE /api/v1/clinic/services/:id
// Delete clinic service (soft delete by setting is_active = false)
// ============================================
router.delete('/services/:id', authenticateToken, requireClinicRole, async (req, res) => {
  try {
    const { id } = req.params;
    const { clinicBranchId } = req;
    const { hardDelete } = req.query;

    // Check if service exists
    const existingService = await pool.query(
      'SELECT * FROM clinic_services WHERE id = $1 AND clinic_branch_id = $2',
      [id, clinicBranchId]
    );

    if (existingService.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    if (hardDelete === 'true') {
      // Hard delete - permanently remove from database
      await pool.query(
        'DELETE FROM clinic_services WHERE id = $1 AND clinic_branch_id = $2',
        [id, clinicBranchId]
      );
      console.log(`✅ Permanently deleted service ID: ${id}`);
      res.json({ message: 'Service permanently deleted' });
    } else {
      // Soft delete - just mark as inactive
      await pool.query(
        'UPDATE clinic_services SET is_active = false WHERE id = $1 AND clinic_branch_id = $2',
        [id, clinicBranchId]
      );
      console.log(`✅ Soft deleted service ID: ${id}`);
      res.json({ message: 'Service deactivated successfully' });
    }
  } catch (error) {
    console.error('❌ Error deleting service:', error);
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

// ============================================
// POST /api/v1/clinic/services/:id/assign-dentist
// Assign service to specific dentist(s)
// ============================================
router.post('/services/:id/assign-dentist', authenticateToken, requireClinicRole, async (req, res) => {
  try {
    const { id: serviceId } = req.params;
    const { clinicBranchId } = req;
    const { dentistProfileIds, customPrice } = req.body;

    if (!dentistProfileIds || !Array.isArray(dentistProfileIds) || dentistProfileIds.length === 0) {
      return res.status(400).json({ error: 'dentistProfileIds array is required' });
    }

    // Verify service exists
    const serviceCheck = await pool.query(
      'SELECT * FROM clinic_services WHERE id = $1 AND clinic_branch_id = $2',
      [serviceId, clinicBranchId]
    );

    if (serviceCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Verify all dentists belong to this clinic
    const dentistCheck = await pool.query(
      `SELECT dp.id 
       FROM dentist_profiles dp
       JOIN clinic_staff cs ON cs.user_id = dp.user_id
       WHERE dp.id = ANY($1) AND cs.clinic_branch_id = $2 AND cs.role = 'dentist'`,
      [dentistProfileIds, clinicBranchId]
    );

    if (dentistCheck.rows.length !== dentistProfileIds.length) {
      return res.status(400).json({ 
        error: 'Some dentists do not belong to this clinic or are not dentists' 
      });
    }

    // Insert assignments (ON CONFLICT UPDATE)
    const assignments = [];
    for (const dentistId of dentistProfileIds) {
      const result = await pool.query(
        `INSERT INTO service_dentist_assignments (clinic_service_id, dentist_profile_id, custom_price)
         VALUES ($1, $2, $3)
         ON CONFLICT (clinic_service_id, dentist_profile_id) 
         DO UPDATE SET custom_price = EXCLUDED.custom_price, is_available = true
         RETURNING *`,
        [serviceId, dentistId, customPrice]
      );
      assignments.push(result.rows[0]);
    }

    console.log(`✅ Assigned service ${serviceId} to ${assignments.length} dentist(s)`);
    res.json({ 
      message: 'Service assigned to dentists successfully',
      assignments 
    });
  } catch (error) {
    console.error('❌ Error assigning service to dentists:', error);
    res.status(500).json({ error: 'Failed to assign service' });
  }
});

// ============================================
// DELETE /api/v1/clinic/services/:id/unassign-dentist/:dentistId
// Remove service assignment from dentist
// ============================================
router.delete('/services/:id/unassign-dentist/:dentistId', authenticateToken, requireClinicRole, async (req, res) => {
  try {
    const { id: serviceId, dentistId } = req.params;
    const { clinicBranchId } = req;

    // Verify service belongs to this clinic
    const serviceCheck = await pool.query(
      'SELECT * FROM clinic_services WHERE id = $1 AND clinic_branch_id = $2',
      [serviceId, clinicBranchId]
    );

    if (serviceCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Remove assignment
    const result = await pool.query(
      'DELETE FROM service_dentist_assignments WHERE clinic_service_id = $1 AND dentist_profile_id = $2 RETURNING *',
      [serviceId, dentistId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    console.log(`✅ Unassigned service ${serviceId} from dentist ${dentistId}`);
    res.json({ message: 'Service unassigned successfully' });
  } catch (error) {
    console.error('❌ Error unassigning service:', error);
    res.status(500).json({ error: 'Failed to unassign service' });
  }
});

export default router;
