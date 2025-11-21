import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;
import { authenticateToken } from '../utils/tokens.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ============================================
// MIDDLEWARE: Check if user is clinic owner/manager
// ============================================
const requireClinicRole = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    
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

    if (staffCheck.rows.length === 0) {
      return res.status(403).json({ 
        error: 'Access denied. Only clinic owners/managers can manage clinic profile.' 
      });
    }

    req.clinicStaff = staffCheck.rows[0];
    req.clinicProfileId = staffCheck.rows[0].clinic_profile_id;
    req.clinicBranchId = staffCheck.rows[0].branch_id; // Use assigned branch or first branch
    next();
  } catch (error) {
    console.error('❌ Error checking clinic role:', error);
    res.status(500).json({ error: 'Failed to verify permissions' });
  }
};

// ============================================
// MULTER: Image upload configuration
// ============================================
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/clinic-gallery');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `clinic-${req.clinicBranchId}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, WebP) are allowed'));
    }
  },
});

// ============================================
// GALLERY ROUTES
// ============================================

// GET /api/v1/clinic/gallery
router.get('/gallery', authenticateToken, requireClinicRole, async (req, res) => {
  try {
    const { clinicBranchId } = req;
    const { imageType } = req.query;

    let query = 'SELECT * FROM clinic_gallery WHERE clinic_branch_id = $1';
    const params = [clinicBranchId];

    if (imageType) {
      query += ' AND image_type = $2';
      params.push(imageType);
    }

    query += ' ORDER BY display_order, created_at DESC';

    const result = await pool.query(query, params);
    res.json({ images: result.rows });
  } catch (error) {
    console.error('❌ Error fetching gallery:', error);
    res.status(500).json({ error: 'Failed to fetch gallery' });
  }
});

// POST /api/v1/clinic/gallery
router.post('/gallery', authenticateToken, requireClinicRole, upload.single('image'), async (req, res) => {
  try {
    const { clinicBranchId } = req;
    const { imageType, caption, displayOrder } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    const imageUrl = `/uploads/clinic-gallery/${req.file.filename}`;

    const result = await pool.query(
      `INSERT INTO clinic_gallery (clinic_branch_id, image_url, image_type, caption, display_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [clinicBranchId, imageUrl, imageType || 'general', caption, displayOrder || 0]
    );

    console.log(`✅ Added image to gallery: ${imageUrl}`);
    res.status(201).json({ 
      message: 'Image uploaded successfully',
      image: result.rows[0] 
    });
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// PUT /api/v1/clinic/gallery/:id
router.put('/gallery/:id', authenticateToken, requireClinicRole, async (req, res) => {
  try {
    const { id } = req.params;
    const { clinicBranchId } = req;
    const { imageType, caption, displayOrder, isActive } = req.body;

    const result = await pool.query(
      `UPDATE clinic_gallery 
       SET 
         image_type = COALESCE($1, image_type),
         caption = COALESCE($2, caption),
         display_order = COALESCE($3, display_order),
         is_active = COALESCE($4, is_active)
       WHERE id = $5 AND clinic_branch_id = $6
       RETURNING *`,
      [imageType, caption, displayOrder, isActive, id, clinicBranchId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.json({ 
      message: 'Image updated successfully',
      image: result.rows[0] 
    });
  } catch (error) {
    console.error('❌ Error updating image:', error);
    res.status(500).json({ error: 'Failed to update image' });
  }
});

// DELETE /api/v1/clinic/gallery/:id
router.delete('/gallery/:id', authenticateToken, requireClinicRole, async (req, res) => {
  try {
    const { id } = req.params;
    const { clinicBranchId } = req;

    // Get image info first
    const imageResult = await pool.query(
      'SELECT * FROM clinic_gallery WHERE id = $1 AND clinic_branch_id = $2',
      [id, clinicBranchId]
    );

    if (imageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const imageUrl = imageResult.rows[0].image_url;

    // Delete from database
    await pool.query('DELETE FROM clinic_gallery WHERE id = $1', [id]);

    // Try to delete file (don't fail if file doesn't exist)
    try {
      const filePath = path.join(__dirname, '../..', imageUrl);
      await fs.unlink(filePath);
      console.log(`✅ Deleted file: ${filePath}`);
    } catch (fileError) {
      console.warn('⚠️ Could not delete file:', fileError.message);
    }

    console.log(`✅ Deleted image from gallery: ${imageUrl}`);
    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting image:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// ============================================
// HIGHLIGHTS ROUTES
// ============================================

// GET /api/v1/clinic/highlights
router.get('/highlights', authenticateToken, requireClinicRole, async (req, res) => {
  try {
    const { clinicBranchId } = req;

    const result = await pool.query(
      'SELECT * FROM clinic_highlights WHERE clinic_branch_id = $1 AND is_active = true ORDER BY display_order',
      [clinicBranchId]
    );

    res.json({ highlights: result.rows });
  } catch (error) {
    console.error('❌ Error fetching highlights:', error);
    res.status(500).json({ error: 'Failed to fetch highlights' });
  }
});

// POST /api/v1/clinic/highlights
router.post('/highlights', authenticateToken, requireClinicRole, async (req, res) => {
  try {
    const { clinicBranchId } = req;
    const { highlightText, icon, displayOrder } = req.body;

    if (!highlightText) {
      return res.status(400).json({ error: 'Highlight text is required' });
    }

    const result = await pool.query(
      `INSERT INTO clinic_highlights (clinic_branch_id, highlight_text, icon, display_order)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [clinicBranchId, highlightText, icon, displayOrder || 0]
    );

    console.log(`✅ Added highlight: ${highlightText}`);
    res.status(201).json({ 
      message: 'Highlight added successfully',
      highlight: result.rows[0] 
    });
  } catch (error) {
    console.error('❌ Error adding highlight:', error);
    res.status(500).json({ error: 'Failed to add highlight' });
  }
});

// PUT /api/v1/clinic/highlights/:id
router.put('/highlights/:id', authenticateToken, requireClinicRole, async (req, res) => {
  try {
    const { id } = req.params;
    const { clinicBranchId } = req;
    const { highlightText, icon, displayOrder, isActive } = req.body;

    const result = await pool.query(
      `UPDATE clinic_highlights 
       SET 
         highlight_text = COALESCE($1, highlight_text),
         icon = COALESCE($2, icon),
         display_order = COALESCE($3, display_order),
         is_active = COALESCE($4, is_active)
       WHERE id = $5 AND clinic_branch_id = $6
       RETURNING *`,
      [highlightText, icon, displayOrder, isActive, id, clinicBranchId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Highlight not found' });
    }

    res.json({ 
      message: 'Highlight updated successfully',
      highlight: result.rows[0] 
    });
  } catch (error) {
    console.error('❌ Error updating highlight:', error);
    res.status(500).json({ error: 'Failed to update highlight' });
  }
});

// DELETE /api/v1/clinic/highlights/:id
router.delete('/highlights/:id', authenticateToken, requireClinicRole, async (req, res) => {
  try {
    const { id } = req.params;
    const { clinicBranchId } = req;

    const result = await pool.query(
      'DELETE FROM clinic_highlights WHERE id = $1 AND clinic_branch_id = $2 RETURNING *',
      [id, clinicBranchId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Highlight not found' });
    }

    console.log(`✅ Deleted highlight: ${result.rows[0].highlight_text}`);
    res.json({ message: 'Highlight deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting highlight:', error);
    res.status(500).json({ error: 'Failed to delete highlight' });
  }
});

// ============================================
// FACILITIES ROUTES
// ============================================

// GET /api/v1/clinic/facilities
router.get('/facilities', authenticateToken, requireClinicRole, async (req, res) => {
  try {
    const { clinicBranchId } = req;

    const result = await pool.query(
      'SELECT * FROM clinic_facilities WHERE clinic_branch_id = $1 AND is_active = true ORDER BY display_order',
      [clinicBranchId]
    );

    res.json({ facilities: result.rows });
  } catch (error) {
    console.error('❌ Error fetching facilities:', error);
    res.status(500).json({ error: 'Failed to fetch facilities' });
  }
});

// POST /api/v1/clinic/facilities
router.post('/facilities', authenticateToken, requireClinicRole, async (req, res) => {
  try {
    const { clinicBranchId } = req;
    const { facilityName, description, icon, displayOrder } = req.body;

    if (!facilityName) {
      return res.status(400).json({ error: 'Facility name is required' });
    }

    const result = await pool.query(
      `INSERT INTO clinic_facilities (clinic_branch_id, facility_name, description, icon, display_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [clinicBranchId, facilityName, description, icon, displayOrder || 0]
    );

    console.log(`✅ Added facility: ${facilityName}`);
    res.status(201).json({ 
      message: 'Facility added successfully',
      facility: result.rows[0] 
    });
  } catch (error) {
    console.error('❌ Error adding facility:', error);
    res.status(500).json({ error: 'Failed to add facility' });
  }
});

// PUT /api/v1/clinic/facilities/:id
router.put('/facilities/:id', authenticateToken, requireClinicRole, async (req, res) => {
  try {
    const { id } = req.params;
    const { clinicBranchId } = req;
    const { facilityName, description, icon, displayOrder, isActive } = req.body;

    const result = await pool.query(
      `UPDATE clinic_facilities 
       SET 
         facility_name = COALESCE($1, facility_name),
         description = COALESCE($2, description),
         icon = COALESCE($3, icon),
         display_order = COALESCE($4, display_order),
         is_active = COALESCE($5, is_active)
       WHERE id = $6 AND clinic_branch_id = $7
       RETURNING *`,
      [facilityName, description, icon, displayOrder, isActive, id, clinicBranchId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Facility not found' });
    }

    res.json({ 
      message: 'Facility updated successfully',
      facility: result.rows[0] 
    });
  } catch (error) {
    console.error('❌ Error updating facility:', error);
    res.status(500).json({ error: 'Failed to update facility' });
  }
});

// DELETE /api/v1/clinic/facilities/:id
router.delete('/facilities/:id', authenticateToken, requireClinicRole, async (req, res) => {
  try {
    const { id } = req.params;
    const { clinicBranchId } = req;

    const result = await pool.query(
      'DELETE FROM clinic_facilities WHERE id = $1 AND clinic_branch_id = $2 RETURNING *',
      [id, clinicBranchId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Facility not found' });
    }

    console.log(`✅ Deleted facility: ${result.rows[0].facility_name}`);
    res.json({ message: 'Facility deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting facility:', error);
    res.status(500).json({ error: 'Failed to delete facility' });
  }
});

export default router;
