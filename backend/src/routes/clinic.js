import express from 'express';
import { PrismaClient } from '../generated/prisma/index.js';
import { authenticateToken, requireRoles } from '../utils/tokens.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const prisma = new PrismaClient();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../uploads/clinic-documents');
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'));
    }
  }
});

// Create clinic profile (restricted to specific admin roles)
// Only users with one of these roles can create a clinic profile on behalf of an owner
router.post('/create', authenticateToken, requireRoles(['super_admin', 'business_manager', 'customer_success_manager']), upload.fields([
  { name: 'ktpFile', maxCount: 1 },
  { name: 'ktpSelfie', maxCount: 1 },
  { name: 'nibFile', maxCount: 1 },
  { name: 'npwpFile', maxCount: 1 },
  { name: 'operationalLicense', maxCount: 1 },
  { name: 'additionalLicenses', maxCount: 5 }
]), async (req, res) => {
  try {
    const {
      // Clinic Profile Data
      legalName,
      brandName,
      facilityType,
      streetAddress,
      city,
      province,
      postalCode,
      phone,
      email,
      timezone = 'Asia/Jakarta',
      operatingHours, // JSON string
      
      // Owner/PIC Data
      ownerName,
      ownerPosition,
      ownerEmail,
      ownerWhatsapp,
      ownerNik,
      
      // Legal Documents
      nibNumber,
      npwpNumber,
      
      // Agreements
      termsAccepted,
      privacyAccepted,
      dataProtectionContact,
      
      // Branches (JSON string)
      branches
    } = req.body;

    // Validate facilityType against DB constraint to avoid 500 from DB
    const allowedFacilityTypes = ['klinik_gigi', 'rsgm'];
    if (!facilityType || !allowedFacilityTypes.includes(facilityType)) {
      return res.status(400).json({ error: `Invalid facilityType. Allowed values: ${allowedFacilityTypes.join(', ')}` });
    }

    // Validate required files
    if (!req.files?.ktpFile?.[0]) {
      return res.status(400).json({ error: 'KTP file is required' });
    }
    if (!req.files?.nibFile?.[0]) {
      return res.status(400).json({ error: 'NIB file is required' });
    }
    if (!req.files?.npwpFile?.[0]) {
      return res.status(400).json({ error: 'NPWP file is required' });
    }
    if (!req.files?.operationalLicense?.[0]) {
      return res.status(400).json({ error: 'Operational license file is required' });
    }

    // Create user account for clinic owner
    const tempPassword = 'temp' + Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const user = await prisma.user.create({
      data: {
        name: ownerName,
        email: ownerEmail,
        password_hash: hashedPassword,
        roles: [ownerPosition === 'owner' ? 'owner' : 'manager'],
        phone_number: ownerWhatsapp
      }
    });

    // Prepare file paths
    const ktpFilePath = `clinic-documents/${req.files.ktpFile[0].filename}`;
    const ktpSelfieFilePath = req.files.ktpSelfie?.[0] 
      ? `clinic-documents/${req.files.ktpSelfie[0].filename}` 
      : null;
    const nibFilePath = `clinic-documents/${req.files.nibFile[0].filename}`;
    const npwpFilePath = `clinic-documents/${req.files.npwpFile[0].filename}`;
    const operationalLicenseFilePath = `clinic-documents/${req.files.operationalLicense[0].filename}`;
    
    const additionalLicenseFilePaths = req.files.additionalLicenses 
      ? req.files.additionalLicenses.map(file => `clinic-documents/${file.filename}`)
      : [];

    // Create clinic profile
    const clinicProfile = await prisma.clinicProfile.create({
      data: {
        userId: user.id,
        legalName,
        brandName,
        facilityType,
        streetAddress,
        city,
        province,
        postalCode,
        phone,
        email,
        timezone,
        operatingHours: JSON.parse(operatingHours),
        ownerName,
        ownerPosition,
        ownerEmail,
        ownerWhatsapp,
        ownerNik,
        ktpFilePath,
        ktpSelfieFilePath,
        nibNumber,
        nibFilePath,
        npwpNumber,
        npwpFilePath,
        operationalLicenseFilePath,
        additionalLicenseFilePaths,
        termsAccepted: termsAccepted === 'true',
        privacyAccepted: privacyAccepted === 'true',
        dataProtectionContact,
        status: 'pending'
      }
    });

    // Add clinic owner to clinic_staff so they can access owner-only endpoints
    try {
      await prisma.clinicStaff.create({
        data: {
          clinicProfileId: clinicProfile.id,
          userId: user.id,
          role: 'owner',
          isActive: true,
          hireDate: new Date(),
          positionTitle: ownerPosition || 'Owner',
          department: null,
          assignedBranchId: null,
          permissions: {}
        }
      });
    } catch (staffErr) {
      // Log but don't fail entire request; admin can add staff later if this fails
      console.error('Error creating clinic owner staff record:', staffErr);
    }

    // Create branches if provided
    if (branches) {
      const branchData = JSON.parse(branches);
      if (Array.isArray(branchData) && branchData.length > 0) {
        await prisma.clinicBranch.createMany({
          data: branchData.map(branch => ({
            clinicProfileId: clinicProfile.id,
            branchName: branch.branchName,
            branchCode: branch.branchCode,
            isMainBranch: branch.isMainBranch || false,
            streetAddress: branch.streetAddress,
            city: branch.city,
            province: branch.province,
            postalCode: branch.postalCode,
            phone: branch.phone,
            treatmentRoomsCount: parseInt(branch.treatmentRoomsCount),
            hasSterlization: branch.hasSterlization === 'true',
            hasRadiography: branch.hasRadiography === 'true',
            operatingHours: branch.operatingHours ? JSON.parse(branch.operatingHours) : null
          }))
        });
      }
    }

    // TODO: Send email with temporary password to clinic owner
    console.log(`Temporary password for ${ownerEmail}: ${tempPassword}`);

    res.status(201).json({
      message: 'Clinic profile created successfully',
      clinicProfile: {
        id: clinicProfile.id,
        legalName: clinicProfile.legalName,
        brandName: clinicProfile.brandName,
        status: clinicProfile.status,
        ownerEmail: clinicProfile.ownerEmail
      },
      tempPassword // Remove this in production
    });

  } catch (error) {
    console.error('Error creating clinic profile:', error);
    
    // Clean up uploaded files on error
    if (req.files) {
      Object.values(req.files).flat().forEach(async (file) => {
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          console.error('Error deleting uploaded file:', unlinkError);
        }
      });
    }

    if (error.code === 'P2002') {
      return res.status(400).json({ 
        error: 'A clinic with this NIK, NIB, NPWP, or email already exists' 
      });
    }

    res.status(500).json({ error: 'Failed to create clinic profile' });
  }
});

// Get clinic profile (for authenticated clinic users)
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const clinicProfile = await prisma.clinicProfile.findFirst({
      where: { userId: req.user.id },
      include: {
        branches: {
          where: { isActive: true },
          orderBy: [
            { isMainBranch: 'desc' },
            { branchName: 'asc' }
          ]
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            roles: true,
            createdAt: true
          }
        }
      }
    });

    if (!clinicProfile) {
      return res.status(404).json({ error: 'Clinic profile not found' });
    }

    // Convert BigInt to string for JSON serialization
    const serializableProfile = {
      ...clinicProfile,
      id: clinicProfile.id.toString(),
      userId: clinicProfile.userId.toString(),
      branches: clinicProfile.branches?.map(branch => ({
        ...branch,
        id: branch.id.toString(),
        clinicProfileId: branch.clinicProfileId.toString()
      })) || [],
      user: clinicProfile.user ? {
        ...clinicProfile.user,
        id: clinicProfile.user.id.toString()
      } : null
    };

    res.json({
      profile: serializableProfile
    });

  } catch (error) {
    console.error('Error fetching clinic profile:', error);
    res.status(500).json({ error: 'Failed to fetch clinic profile' });
  }
});

// Update clinic profile
router.put('/profile', authenticateToken, requireRoles(['owner', 'clinic_owner', 'manager', 'clinic_staff']), upload.fields([
  { name: 'ktpFile', maxCount: 1 },
  { name: 'ktpSelfie', maxCount: 1 },
  { name: 'nibFile', maxCount: 1 },
  { name: 'npwpFile', maxCount: 1 },
  { name: 'operationalLicense', maxCount: 1 },
  { name: 'additionalLicenses', maxCount: 5 }
]), async (req, res) => {
  try {
    const clinicProfile = await prisma.clinicProfile.findFirst({
      where: { userId: req.user.id }
    });

    if (!clinicProfile) {
      return res.status(404).json({ error: 'Clinic profile not found' });
    }

    const updateData = { ...req.body };
    
    // Handle operating hours
    if (updateData.operatingHours) {
      updateData.operatingHours = JSON.parse(updateData.operatingHours);
    }

    // Handle file updates
    if (req.files?.ktpFile?.[0]) {
      updateData.ktpFilePath = `clinic-documents/${req.files.ktpFile[0].filename}`;
    }
    if (req.files?.ktpSelfie?.[0]) {
      updateData.ktpSelfieFilePath = `clinic-documents/${req.files.ktpSelfie[0].filename}`;
    }
    if (req.files?.nibFile?.[0]) {
      updateData.nibFilePath = `clinic-documents/${req.files.nibFile[0].filename}`;
    }
    if (req.files?.npwpFile?.[0]) {
      updateData.npwpFilePath = `clinic-documents/${req.files.npwpFile[0].filename}`;
    }
    if (req.files?.operationalLicense?.[0]) {
      updateData.operationalLicenseFilePath = `clinic-documents/${req.files.operationalLicense[0].filename}`;
    }
    if (req.files?.additionalLicenses) {
      updateData.additionalLicenseFilePaths = req.files.additionalLicenses.map(
        file => `clinic-documents/${file.filename}`
      );
    }

    const updatedProfile = await prisma.clinicProfile.update({
      where: { id: clinicProfile.id },
      data: updateData,
      include: {
        branches: {
          where: { isActive: true },
          orderBy: [
            { isMainBranch: 'desc' },
            { branchName: 'asc' }
          ]
        }
      }
    });

    res.json({
      message: 'Clinic profile updated successfully',
      profile: updatedProfile
    });

  } catch (error) {
    console.error('Error updating clinic profile:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({ 
        error: 'A clinic with this NIK, NIB, NPWP, or email already exists' 
      });
    }

    res.status(500).json({ error: 'Failed to update clinic profile' });
  }
});

// Admin routes for clinic management
// Admin: list clinics (allow broad admin roles)
router.get('/admin/list', authenticateToken, requireRoles(['super_admin', 'admin', 'business_manager', 'platform_manager', 'finance_manager', 'customer_success_manager', 'technical_support', 'ai_engineer', 'compliance_officer']), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      search,
      facilityType 
    } = req.query;

    const where = {};
    
    if (status) {
      where.status = status;
    }
    
    if (facilityType) {
      where.facilityType = facilityType;
    }
    
    if (search) {
      where.OR = [
        { legalName: { contains: search, mode: 'insensitive' } },
        { brandName: { contains: search, mode: 'insensitive' } },
        { ownerName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const clinics = await prisma.clinicProfile.findMany({
      where,
      include: {
        branches: {
          select: {
            id: true,
            branchName: true,
            isMainBranch: true,
            city: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            roles: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: parseInt(limit)
    });

    const total = await prisma.clinicProfile.count({ where });

    res.json({
      clinics,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching clinic list:', error);
    res.status(500).json({ error: 'Failed to fetch clinic list' });
  }
});


// Admin: get staff for a specific clinic (by clinic profile id)
router.get('/admin/:id/staff', authenticateToken, requireRoles(['super_admin', 'admin', 'business_manager', 'platform_manager', 'finance_manager', 'customer_success_manager', 'technical_support', 'ai_engineer', 'compliance_officer']), async (req, res) => {
  try {
    const { id } = req.params;
    const clinicId = BigInt(id);

    // verify clinic exists
    const clinic = await prisma.clinicProfile.findUnique({ where: { id: clinicId } });
    if (!clinic) return res.status(404).json({ error: 'Clinic not found' });

    const staff = await prisma.clinicStaff.findMany({
      where: { clinicProfileId: clinicId },
      include: {
        user: { select: { id: true, name: true, email: true, avatar_url: true, phone_number: true, roles: true, lastLoginAt: true, createdAt: true } },
        assignedBranch: { select: { id: true, branchName: true, isMainBranch: true, branchCode: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    const serialized = staff.map(s => ({
      id: s.id.toString(),
      role: s.role,
      isActive: s.isActive,
      positionTitle: s.positionTitle,
      department: s.department,
      user: s.user ? { id: s.user.id.toString(), name: s.user.name, email: s.user.email, avatar_url: s.user.avatar_url, phone_number: s.user.phone_number, roles: s.user.roles, lastLoginAt: s.user.lastLoginAt, createdAt: s.user.createdAt } : null,
      assignedBranch: s.assignedBranch ? { id: s.assignedBranch.id.toString(), branchName: s.assignedBranch.branchName, isMainBranch: s.assignedBranch.isMainBranch, branchCode: s.assignedBranch.branchCode } : null
    }));

    res.json({ clinicId: clinicId.toString(), staff: serialized });
  } catch (error) {
    console.error('Error fetching admin clinic staff:', error);
    res.status(500).json({ error: 'Failed to fetch clinic staff' });
  }
});

// Admin: get clinic details (profile + branches + owner)
router.get('/admin/:id', authenticateToken, requireRoles(['super_admin', 'admin', 'business_manager', 'platform_manager', 'finance_manager', 'customer_success_manager', 'technical_support', 'ai_engineer', 'compliance_officer']), async (req, res) => {
  try {
    const { id } = req.params;
    const clinicId = BigInt(id);

    const clinic = await prisma.clinicProfile.findUnique({
      where: { id: clinicId },
      include: {
        branches: { orderBy: [{ isMainBranch: 'desc' }, { branchName: 'asc' }] },
        user: { select: { id: true, name: true, email: true, roles: true } }
      }
    });

    if (!clinic) return res.status(404).json({ error: 'Clinic not found' });

    const serialized = {
      ...clinic,
      id: clinic.id.toString(),
      userId: clinic.userId.toString(),
      branches: clinic.branches.map(b => ({
        ...b,
        id: b.id.toString(),
        clinicProfileId: b.clinicProfileId.toString()
      }))
    };

    res.json({ clinic: serialized });
  } catch (error) {
    console.error('Error fetching clinic detail:', error);
    res.status(500).json({ error: 'Failed to fetch clinic detail' });
  }
});

// Admin: Verify clinic
router.put('/admin/:id/verify', authenticateToken, requireRoles(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, verificationNotes } = req.body;

    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updatedClinic = await prisma.clinicProfile.update({
      where: { id: BigInt(id) },
      data: {
        status,
        verificationNotes,
        isVerified: status === 'verified',
        verificationDate: status === 'verified' ? new Date() : null
      }
    });

    res.json({
      message: `Clinic ${status} successfully`,
      clinic: updatedClinic
    });

  } catch (error) {
    console.error('Error verifying clinic:', error);
    res.status(500).json({ error: 'Failed to verify clinic' });
  }
});

// Branch management routes
router.post('/branches', authenticateToken, requireRoles(['owner', 'clinic_owner', 'manager', 'clinic_staff']), async (req, res) => {
  try {
    console.log('🏢 POST /branches called with data:', req.body);
    
    const clinicProfile = await prisma.clinicProfile.findFirst({
      where: { userId: req.user.id }
    });

    if (!clinicProfile) {
      return res.status(404).json({ error: 'Clinic profile not found' });
    }

    console.log('✅ Clinic profile found:', clinicProfile.id);

    const { 
      branchName, 
      branchCode, 
      streetAddress, 
      city, 
      province,
      district,
      postalCode,
      latitude,
      longitude,
      phone, 
      treatmentRoomsCount, 
      hasSterlization, 
      hasRadiography, 
      operatingHours,
      isMainBranch,
      isActive
    } = req.body;

    // Validate required fields
    if (!branchName?.trim()) {
      return res.status(400).json({ error: 'Branch name is required' });
    }
    
    if (!streetAddress?.trim()) {
      return res.status(400).json({ error: 'Street address is required' });
    }
    
    if (!city?.trim()) {
      return res.status(400).json({ error: 'City is required' });
    }
    
    if (!province?.trim()) {
      return res.status(400).json({ error: 'Province is required' });
    }

    const branchData = {
      clinicProfileId: clinicProfile.id,
      branchName: branchName?.trim(),
      branchCode: branchCode?.trim(),
      streetAddress: streetAddress?.trim(),
      city: city?.trim(),
      province: province?.trim(),
      district: district?.trim() || null,
      postalCode: postalCode?.trim() || null,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      phone: phone?.trim() || null,
      treatmentRoomsCount: parseInt(treatmentRoomsCount) || 1,
      hasSterlization: Boolean(hasSterlization),
      hasRadiography: Boolean(hasRadiography),
      isMainBranch: Boolean(isMainBranch),
      isActive: Boolean(isActive)
    };

    if (operatingHours) {
      try {
        branchData.operatingHours = typeof operatingHours === 'string' 
          ? JSON.parse(operatingHours) 
          : operatingHours;
      } catch (err) {
        console.log('⚠️ Failed to parse operatingHours, using default');
        branchData.operatingHours = {
          monday: '08:00-17:00',
          tuesday: '08:00-17:00',
          wednesday: '08:00-17:00',
          thursday: '08:00-17:00',
          friday: '08:00-17:00',
          saturday: '08:00-14:00',
          sunday: 'closed'
        };
      }
    }

    console.log('🚀 Creating branch with data:', branchData);

    const branch = await prisma.clinicBranch.create({
      data: branchData
    });

    console.log('✅ Branch created successfully:', branch.id);

    // Convert BigInt to string for JSON serialization
    const serializableBranch = {
      ...branch,
      id: branch.id.toString(),
      clinicProfileId: branch.clinicProfileId.toString()
    };

    res.status(201).json({
      message: 'Branch created successfully',
      branch: serializableBranch
    });

  } catch (error) {
    console.error('❌ Error creating branch:', error);
    console.error('❌ Error details:', error.message);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to create branch',
      details: error.message 
    });
  }
});

// Get all branches for the clinic
router.get('/branches', authenticateToken, requireRoles(['owner', 'clinic_owner', 'manager', 'clinic_staff']), async (req, res) => {
  try {
    let clinicProfile = await prisma.clinicProfile.findFirst({
      where: { userId: req.user.id }
    });

    if (!clinicProfile) {
      const staffRecord = await prisma.clinicStaff.findFirst({
        where: { userId: req.user.id },
        include: { clinicProfile: true }
      });

      if (staffRecord?.clinicProfile) {
        clinicProfile = staffRecord.clinicProfile;
      }
    }

    if (!clinicProfile) {
      return res.status(404).json({ error: 'Clinic profile not found' });
    }

    const branches = await prisma.clinicBranch.findMany({
      where: { 
        clinicProfileId: clinicProfile.id,
        isActive: true 
      },
      orderBy: [
        { isMainBranch: 'desc' },
        { branchName: 'asc' }
      ]
    });

    // Convert BigInt to string for JSON serialization
    const serializableBranches = branches.map(branch => ({
      ...branch,
      id: branch.id.toString(),
      clinicProfileId: branch.clinicProfileId.toString(),
      ownerEmail: clinicProfile.ownerEmail,
      ownerName: clinicProfile.ownerName,
      ownerWhatsapp: clinicProfile.ownerWhatsapp
    }));

    console.log('🔄 After BigInt conversion, sample branch:', serializableBranches[0]);
    console.log('📤 Sending branches response:', serializableBranches.length);

    // Test JSON serialization
    try {
      const testJson = JSON.stringify(serializableBranches[0]);
      console.log('✅ JSON serialization test passed');
    } catch (jsonError) {
      console.error('❌ JSON serialization failed:', jsonError);
    }

    res.json({
      owner: {
        name: clinicProfile.ownerName,
        email: clinicProfile.ownerEmail,
        whatsapp: clinicProfile.ownerWhatsapp
      },
      branches: serializableBranches
    });

  } catch (error) {
    console.error('❌ Error fetching branches:', error);
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
});

router.put('/branches/:id', authenticateToken, requireRoles(['owner', 'clinic_owner', 'manager', 'clinic_staff']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const clinicProfile = await prisma.clinicProfile.findFirst({
      where: { userId: req.user.id }
    });

    if (!clinicProfile) {
      return res.status(404).json({ error: 'Clinic profile not found' });
    }

    const updateData = { ...req.body };
    
    if (updateData.treatmentRoomsCount) {
      updateData.treatmentRoomsCount = parseInt(updateData.treatmentRoomsCount);
    }
    
    if (updateData.hasSterlization !== undefined) {
      updateData.hasSterlization = updateData.hasSterlization === 'true';
    }
    
    if (updateData.hasRadiography !== undefined) {
      updateData.hasRadiography = updateData.hasRadiography === 'true';
    }

    if (updateData.operatingHours) {
      updateData.operatingHours = JSON.parse(updateData.operatingHours);
    }

    const updatedBranch = await prisma.clinicBranch.update({
      where: { 
        id: BigInt(id),
        clinicProfileId: clinicProfile.id
      },
      data: updateData
    });

    res.json({
      message: 'Branch updated successfully',
      branch: updatedBranch
    });

  } catch (error) {
    console.error('Error updating branch:', error);
    res.status(500).json({ error: 'Failed to update branch' });
  }
});

router.delete('/branches/:id', authenticateToken, requireRoles(['owner', 'clinic_owner', 'manager', 'clinic_staff']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const clinicProfile = await prisma.clinicProfile.findFirst({
      where: { userId: req.user.id }
    });

    if (!clinicProfile) {
      return res.status(404).json({ error: 'Clinic profile not found' });
    }

    // Check if branch exists and belongs to this clinic
    const branch = await prisma.clinicBranch.findFirst({
      where: { 
        id: BigInt(id),
        clinicProfileId: clinicProfile.id
      }
    });

    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    // Don't allow deleting main branch if it's the only branch
    if (branch.isMainBranch) {
      const branchCount = await prisma.clinicBranch.count({
        where: { clinicProfileId: clinicProfile.id }
      });
      
      if (branchCount === 1) {
        return res.status(400).json({ error: 'Cannot delete the only remaining branch' });
      }
    }

    // Remove staff assignments from this branch first
    await prisma.clinicStaff.updateMany({
      where: { assignedBranchId: BigInt(id) },
      data: { assignedBranchId: null }
    });

    // Delete the branch
    await prisma.clinicBranch.delete({
      where: { id: BigInt(id) }
    });

    res.json({
      message: 'Branch deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting branch:', error);
    res.status(500).json({ error: 'Failed to delete branch' });
  }
});

// =====================
// STAFF MANAGEMENT ROUTES
// =====================

// Debug endpoint to check user clinic association
router.get('/debug-user', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const userId = BigInt(user.id);
    
    // Find the clinic staff record
    const clinicStaff = await prisma.clinicStaff.findUnique({
      where: { userId: userId },
      include: { 
        clinicProfile: { select: { id: true, legalName: true } },
        user: { select: { id: true, email: true, name: true, roles: true } }
      }
    });
    
    // Get all staff for debugging
    const allStaff = await prisma.clinicStaff.findMany({
      include: {
        user: { select: { id: true, email: true, name: true } },
        clinicProfile: { select: { id: true, legalName: true } }
      }
    });
    
    res.json({
      message: 'Debug info',
      currentUser: user,
      clinicStaffRecord: clinicStaff ? {
        ...clinicStaff,
        id: clinicStaff.id.toString(),
        userId: clinicStaff.userId.toString(),
        clinicProfileId: clinicStaff.clinicProfileId.toString()
      } : null,
      allStaffInSystem: allStaff.map(staff => ({
        ...staff,
        id: staff.id.toString(),
        userId: staff.userId.toString(),
        clinicProfileId: staff.clinicProfileId.toString()
      }))
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all staff for the clinic (owner/manager only)
router.get('/staff', authenticateToken, requireRoles(['owner', 'clinic_owner', 'manager', 'clinic_staff']), async (req, res) => {
  try {
    const user = req.user;
    console.log('🔍 Staff API: User requesting staff:', { id: user.id, type: typeof user.id, roles: user.roles });

    // Find the clinic for this user (convert string ID to BigInt)
    const userId = BigInt(user.id);
    console.log('🔍 Staff API: Looking for userId:', userId, 'type:', typeof userId);
    
    const clinicStaff = await prisma.clinicStaff.findUnique({
      where: { userId: userId },
      include: { clinicProfile: true }
    });
    
    console.log('🏥 Staff API: User clinic staff record:', clinicStaff);

    if (!clinicStaff) {
      console.log('❌ Staff API: User not associated with any clinic');
      return res.status(403).json({ error: 'Access denied - not associated with any clinic' });
    }

    const clinicId = clinicStaff.clinicProfileId;
    console.log('🏥 Staff API: Fetching staff for clinic ID:', clinicId);

    // Get all staff for this clinic
    const allStaff = await prisma.clinicStaff.findMany({
      where: { clinicProfileId: clinicId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar_url: true,
            phone_number: true,
            createdAt: true,
            lastLoginAt: true
          }
        },
        assignedBranch: {
          select: {
            id: true,
            branchName: true,
            branchCode: true,
            city: true,
            province: true,
            district: true,
            latitude: true,
            longitude: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log('👥 Staff API: Found staff count:', allStaff.length);

    const staffList = allStaff.map(staff => ({
      id: staff.id.toString(),
      userId: staff.user.id.toString(),
      name: staff.user.name,
      email: staff.user.email,
      avatar: staff.user.avatar_url,
      role: staff.role,
      position: staff.positionTitle,
      department: staff.department,
      phone: staff.user.phone_number,
      status: staff.isActive ? 'active' : 'inactive',
      joinDate: staff.hireDate ? staff.hireDate.toISOString() : staff.createdAt?.toISOString(),
      lastLogin: staff.user.lastLoginAt ? staff.user.lastLoginAt.toISOString() : null,
      permissions: staff.permissions || [],
      branchId: staff.assignedBranchId ? staff.assignedBranchId.toString() : null,
      branch: staff.assignedBranch ? {
        id: staff.assignedBranch.id.toString(),
        name: staff.assignedBranch.branchName,
        code: staff.assignedBranch.branchCode,
        city: staff.assignedBranch.city,
        province: staff.assignedBranch.province,
        district: staff.assignedBranch.district,
        latitude: staff.assignedBranch.latitude ? parseFloat(staff.assignedBranch.latitude) : null,
        longitude: staff.assignedBranch.longitude ? parseFloat(staff.assignedBranch.longitude) : null
      } : null
    }));

    res.json({
      message: 'Staff list retrieved successfully',
      staff: staffList,
      clinicId: clinicId.toString()
    });

  } catch (error) {
    console.error('Error fetching clinic staff:', error);
    res.status(500).json({ error: 'Failed to fetch staff list' });
  }
});

// Add staff to clinic (owner/manager only)
router.post('/staff', authenticateToken, requireRoles(['owner', 'clinic_owner', 'manager', 'clinic_staff']), async (req, res) => {
  try {
    const { name, email, password, role, position, department, permissions, assignedBranchId } = req.body;
    const user = req.user;

    console.log('👥 POST /staff called');
    console.log('👥 Request body:', { ...req.body, password: '***hidden***' });
    console.log('👥 Requesting user:', { id: user.id, roles: user.roles });

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required' });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Validate role
    const validRoles = ['manager', 'front_office', 'nurse', 'cashier', 'admin', 'dentist', 'staff'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role specified' });
    }

    // Find the clinic for the requesting user
    const requestingUserStaff = await prisma.clinicStaff.findUnique({
      where: { userId: user.id },
      include: { clinicProfile: true }
    });

    if (!requestingUserStaff) {
      return res.status(403).json({ error: 'Access denied - not associated with any clinic' });
    }

    const clinicId = requestingUserStaff.clinicProfileId;

    // Check if user already exists - CRITICAL SECURITY CHECK
    console.log('🔍 Checking if email already exists:', email);
    let targetUser = await prisma.user.findUnique({
      where: { email: email }
    });

    // If user doesn't exist, create them
    if (!targetUser) {
      console.log('✅ Email is available, creating new user:', email);
      // Hash the provided password
      const hashedPassword = await bcrypt.hash(password, 10);

      targetUser = await prisma.user.create({
        data: {
          name: name,
          email: email,
          password_hash: hashedPassword,
          roles: [role] // Set the clinic role
        }
      });

      console.log(`✅ Created new user ${email} with provided password`);
    } else {
      // User already exists - check if they're already a staff member
      console.warn('⚠️ User with this email already exists!');
      console.warn('⚠️ Existing user ID:', targetUser.id.toString());
      console.warn('⚠️ Existing user roles:', targetUser.roles);
      console.warn('⚠️ Existing user name:', targetUser.name);
      
      // Check if this user is already assigned to ANY clinic
      const existingStaffCheck = await prisma.clinicStaff.findUnique({
        where: { userId: targetUser.id }
      });
      
      if (existingStaffCheck) {
        console.error('❌ STAFF ASSIGNMENT BLOCKED - User already assigned to a clinic!');
        console.error('❌ User email:', email);
        console.error('❌ Clinic ID:', existingStaffCheck.clinicProfileId.toString());
        console.error('❌ Assignment attempt from IP:', req.ip || req.connection.remoteAddress);
        return res.status(400).json({ 
          error: 'User is already assigned to a clinic',
          errorCode: 'ALREADY_ASSIGNED',
          details: 'This email is already registered and assigned to a clinic. Each staff member can only work at one clinic.'
        });
      }
      
      // User exists but not assigned to any clinic yet
      // This could be a dentist or patient being added as staff
      console.log('⚠️ User exists but not assigned to clinic, will assign with EXISTING password');
      console.log('⚠️ NOT updating password - user should use their existing password');
      // DO NOT update password - let them keep their existing one
    }

    // Validate branch assignment if provided
    let branchId = null;
    if (assignedBranchId) {
      const branch = await prisma.clinicBranch.findFirst({
        where: {
          id: parseInt(assignedBranchId),
          clinicProfileId: clinicId,
          isActive: true
        }
      });
      
      if (!branch) {
        return res.status(400).json({ error: 'Invalid branch assignment - branch not found or does not belong to your clinic' });
      }
      
      branchId = parseInt(assignedBranchId);
    }

    // Create clinic staff assignment
    const newStaff = await prisma.clinicStaff.create({
      data: {
        userId: targetUser.id,
        clinicProfileId: clinicId,
        role,
        positionTitle: position || null,
        department: department || null,
        assignedBranchId: branchId,
        isActive: true,
        permissions: permissions || []
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar_url: true,
            phone_number: true,
            createdAt: true,
            lastLoginAt: true
          }
        },
        assignedBranch: {
          select: {
            id: true,
            branchName: true,
            branchCode: true,
            city: true,
            province: true,
            district: true,
            latitude: true,
            longitude: true
          }
        }
      }
    });

    // Update user roles to include the clinic role
    await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        roles: [...(targetUser.roles || []), role].filter((r, i, arr) => arr.indexOf(r) === i) // Remove duplicates
      }
    });

    const serializeId = (value) => (typeof value === 'bigint' ? value.toString() : value);
    res.status(201).json({
      message: 'Staff added successfully',
      staff: {
        id: serializeId(newStaff.id),
        userId: serializeId(newStaff.user.id),
        name: newStaff.user.name,
        email: newStaff.user.email,
        role: newStaff.role,
        position: newStaff.positionTitle,
        department: newStaff.department,
        phone: newStaff.user.phone_number,
        status: newStaff.isActive ? 'active' : 'inactive',
        joinDate: newStaff.createdAt?.toISOString(),
        lastLogin: newStaff.user.lastLoginAt ? newStaff.user.lastLoginAt.toISOString() : null,
        permissions: newStaff.permissions,
        branchId: newStaff.assignedBranchId ? serializeId(newStaff.assignedBranchId) : null,
        branch: newStaff.assignedBranch ? {
          id: serializeId(newStaff.assignedBranch.id),
          name: newStaff.assignedBranch.branchName,
          code: newStaff.assignedBranch.branchCode,
          city: newStaff.assignedBranch.city,
          province: newStaff.assignedBranch.province,
          district: newStaff.assignedBranch.district,
          latitude: newStaff.assignedBranch.latitude ? parseFloat(newStaff.assignedBranch.latitude) : null,
          longitude: newStaff.assignedBranch.longitude ? parseFloat(newStaff.assignedBranch.longitude) : null
        } : null
      }
    });

  } catch (error) {
    console.error('Error adding staff:', error);
    res.status(500).json({ error: 'Failed to add staff member' });
  }
});

// Update staff (owner/manager only)
router.put('/staff/:staffId', authenticateToken, requireRoles(['owner', 'clinic_owner', 'manager', 'clinic_staff']), async (req, res) => {
  try {
    const { staffId } = req.params;
    const { role, position, department, status, permissions, phone, name, email, branchId } = req.body;
    const user = req.user;
    
    console.log('🔄 PUT /staff/:staffId called with:', { 
      staffId, 
      requestBody: { role, position, department, status, permissions, phone, name, email, branchId },
      userId: user.id 
    });

    // Find the clinic for the requesting user
    const requestingUserStaff = await prisma.clinicStaff.findUnique({
      where: { userId: user.id }
    });

    if (!requestingUserStaff) {
      return res.status(403).json({ error: 'Access denied - not associated with any clinic' });
    }

    // Find the staff member to update
    const targetStaff = await prisma.clinicStaff.findUnique({
      where: { id: parseInt(staffId) },
      include: { user: true }
    });

    if (!targetStaff) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    // Ensure the staff member belongs to the same clinic
    if (targetStaff.clinicProfileId !== requestingUserStaff.clinicProfileId) {
      return res.status(403).json({ error: 'Access denied - staff member not in your clinic' });
    }

    // Don't allow changing owner role
    if (targetStaff.role === 'owner') {
      return res.status(403).json({ error: 'Cannot modify owner account' });
    }

    // Prepare update data
    const clinicStaffUpdate = {};
    if (role && role !== 'owner') clinicStaffUpdate.role = role;
    if (position !== undefined) clinicStaffUpdate.positionTitle = position || null;
    if (department !== undefined) clinicStaffUpdate.department = department || null;
    if (status && ['active', 'inactive', 'invited'].includes(status)) {
      clinicStaffUpdate.isActive = status === 'active';
    }
    if (permissions) clinicStaffUpdate.permissions = permissions;
    
    // Handle branch assignment
    if (branchId !== undefined) {
      if (branchId === null || branchId === '') {
        clinicStaffUpdate.assignedBranchId = null;
      } else {
        // Verify branch belongs to the clinic
        const branch = await prisma.clinicBranch.findFirst({
          where: {
            id: parseInt(branchId),
            clinicProfileId: requestingUserStaff.clinicProfileId
          }
        });
        
        if (!branch) {
          return res.status(400).json({ error: 'Branch not found or does not belong to your clinic' });
        }
        
        clinicStaffUpdate.assignedBranchId = parseInt(branchId);
      }
    }

    const userUpdates = {};
    if (phone !== undefined) {
      userUpdates.phone_number = phone ? phone : null;
    }
    
    // Handle name update
    if (name !== undefined && name.trim()) {
      userUpdates.name = name.trim();
    }
    
    // Handle email update
    if (email !== undefined && email.trim()) {
      // Check if email is already taken by another user
      const existingUser = await prisma.user.findUnique({
        where: { email: email.trim() }
      });
      
      if (existingUser && existingUser.id !== targetStaff.userId) {
        return res.status(400).json({ error: 'Email already exists' });
      }
      
      userUpdates.email = email.trim();
    }

    if (role && role !== targetStaff.role) {
      const currentRoles = targetStaff.user.roles || [];
      const filtered = currentRoles.filter((r) => r !== targetStaff.role);
      const nextRoles = [...filtered, role].filter((value, index, self) => self.indexOf(value) === index);
      userUpdates.roles = nextRoles;
    }
    
    console.log('🔧 Prepared updates:', { clinicStaffUpdate, userUpdates });

    if (Object.keys(clinicStaffUpdate).length > 0 || Object.keys(userUpdates).length > 0) {
      await prisma.$transaction(async (tx) => {
        if (Object.keys(clinicStaffUpdate).length > 0) {
          await tx.clinicStaff.update({
            where: { id: parseInt(staffId) },
            data: clinicStaffUpdate
          });
        }

        if (Object.keys(userUpdates).length > 0) {
          await tx.user.update({
            where: { id: targetStaff.userId },
            data: userUpdates
          });
        }
      });
    }

    const refreshedStaff = await prisma.clinicStaff.findUnique({
      where: { id: parseInt(staffId) },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar_url: true,
            phone_number: true,
            lastLoginAt: true
          }
        },
        assignedBranch: {
          select: {
            id: true,
            branchName: true,
            branchCode: true,
            city: true,
            province: true,
            district: true,
            latitude: true,
            longitude: true
          }
        }
      }
    });

    console.log('✅ Staff update successful:', refreshedStaff);
    
    const serializeId = (value) => (typeof value === 'bigint' ? value.toString() : value);
    res.json({
      success: true,
      message: 'Staff updated successfully',
      staff: {
        id: serializeId(refreshedStaff.id),
        userId: serializeId(refreshedStaff.user.id),
        name: refreshedStaff.user.name,
        email: refreshedStaff.user.email,
        role: refreshedStaff.role,
        position: refreshedStaff.positionTitle,
        department: refreshedStaff.department,
        phone: refreshedStaff.user.phone_number,
        status: refreshedStaff.isActive ? 'active' : 'inactive',
        lastLogin: refreshedStaff.user.lastLoginAt ? refreshedStaff.user.lastLoginAt.toISOString() : null,
        permissions: refreshedStaff.permissions,
        branchId: refreshedStaff.assignedBranchId ? serializeId(refreshedStaff.assignedBranchId) : null,
        branch: refreshedStaff.assignedBranch ? {
          id: serializeId(refreshedStaff.assignedBranch.id),
          name: refreshedStaff.assignedBranch.branchName,
          code: refreshedStaff.assignedBranch.branchCode,
          city: refreshedStaff.assignedBranch.city,
          province: refreshedStaff.assignedBranch.province,
          district: refreshedStaff.assignedBranch.district,
          latitude: refreshedStaff.assignedBranch.latitude ? parseFloat(refreshedStaff.assignedBranch.latitude) : null,
          longitude: refreshedStaff.assignedBranch.longitude ? parseFloat(refreshedStaff.assignedBranch.longitude) : null
        } : null
      }
    });

  } catch (error) {
    console.error('Error updating staff:', error);
    res.status(500).json({ error: 'Failed to update staff member' });
  }
});

// Removed conflicting DELETE route - using the userId-based route below

// Enhanced Staff Management Endpoints

// Get staff member profile details
router.get('/staff/:userId/profile', authenticateToken, requireRoles(['owner', 'clinic_owner', 'manager', 'clinic_staff']), async (req, res) => {
  try {
    const { userId } = req.params;
    const user = req.user;

    // Find the clinic for the requesting user
    const requestingUserStaff = await prisma.clinicStaff.findUnique({
      where: { userId: BigInt(user.id) }
    });

    if (!requestingUserStaff) {
      return res.status(403).json({ error: 'Access denied - not associated with any clinic' });
    }

    const clinicId = requestingUserStaff.clinicProfileId;

    // Get staff member profile
    const staffProfile = await prisma.clinicStaff.findFirst({
      where: {
        userId: BigInt(userId),
        clinicProfileId: clinicId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar_url: true,
            phone_number: true,
            roles: true,
            createdAt: true,
            lastLoginAt: true
          }
        },
        assignedBranch: {
          select: {
            id: true,
            branchName: true,
            branchCode: true,
            address: true,
            city: true,
            province: true,
            district: true,
            latitude: true,
            longitude: true
          }
        }
      }
    });

    if (!staffProfile) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    res.json({
      success: true,
      profile: {
        id: staffProfile.user.id.toString(),
        name: staffProfile.user.name,
        email: staffProfile.user.email,
        avatarUrl: staffProfile.user.avatar_url,
        phone: staffProfile.user.phone_number,
        role: staffProfile.role,
        status: staffProfile.isActive ? 'active' : 'inactive',
        hireDate: staffProfile.hireDate,
        positionTitle: staffProfile.positionTitle,
        department: staffProfile.department,
        permissions: staffProfile.permissions,
        branch: staffProfile.assignedBranch,
        lastLoginAt: staffProfile.user.lastLoginAt,
        createdAt: staffProfile.user.createdAt,
        profileDetails: {
          joinedAt: staffProfile.hireDate,
          userRoles: staffProfile.user.roles,
          accountCreated: staffProfile.user.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Error getting staff profile:', error);
    res.status(500).json({ error: 'Failed to get staff profile' });
  }
});

// Update staff member role and status
router.put('/staff/:userId/role', authenticateToken, requireRoles(['owner', 'clinic_owner', 'manager', 'clinic_staff']), async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, status } = req.body;
    const user = req.user;

    // Validate role
    const validRoles = ['owner', 'manager', 'front_office', 'nurse', 'cashier'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role specified' });
    }

    // Validate status
    const validStatuses = ['active', 'inactive'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status specified' });
    }

    // Find the clinic for the requesting user
    const requestingUserStaff = await prisma.clinicStaff.findUnique({
      where: { userId: BigInt(user.id) }
    });

    if (!requestingUserStaff) {
      return res.status(403).json({ error: 'Access denied - not associated with any clinic' });
    }

    const clinicId = requestingUserStaff.clinicProfileId;

    // Get target staff member
    const targetStaff = await prisma.clinicStaff.findFirst({
      where: {
        userId: BigInt(userId),
        clinicProfileId: clinicId
      },
      include: {
        user: { select: { name: true, email: true } }
      }
    });

    if (!targetStaff) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    // Prevent changing owner role
    if (targetStaff.role === 'owner' && role && role !== 'owner') {
      return res.status(400).json({ error: 'Cannot change owner role' });
    }

    // Prepare update data
    const updateData = {};
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.isActive = status === 'active';

    // Update staff member
    const updatedStaff = await prisma.clinicStaff.update({
      where: { userId: BigInt(userId) },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar_url: true,
            lastLoginAt: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Staff member updated successfully',
      staff: {
        id: updatedStaff.user.id.toString(),
        name: updatedStaff.user.name,
        email: updatedStaff.user.email,
        role: updatedStaff.role,
        status: updatedStaff.isActive ? 'active' : 'inactive',
        lastLoginAt: updatedStaff.user.lastLoginAt
      }
    });

  } catch (error) {
    console.error('Error updating staff role:', error);
    res.status(500).json({ error: 'Failed to update staff member' });
  }
});

// Remove staff member (owner/manager only)
router.delete('/staff/:userId', authenticateToken, requireRoles(['owner', 'clinic_owner', 'manager', 'clinic_staff']), async (req, res) => {
  try {
    const { userId } = req.params;
    const user = req.user;
    
    console.log('🗑️ DELETE /staff/:userId called');
    console.log('🗑️ Received userId parameter:', userId, 'type:', typeof userId);
    console.log('🗑️ Requesting user:', user.id, 'roles:', user.roles);

    // Find the clinic for the requesting user
    const requestingUserStaff = await prisma.clinicStaff.findUnique({
      where: { userId: BigInt(user.id) }
    });

    if (!requestingUserStaff) {
      return res.status(403).json({ error: 'Access denied - not associated with any clinic' });
    }

    const clinicId = requestingUserStaff.clinicProfileId;

    // Get target staff member
    console.log('🔍 Looking for staff with userId:', BigInt(userId), 'in clinic:', clinicId);
    const targetStaff = await prisma.clinicStaff.findFirst({
      where: {
        userId: BigInt(userId),
        clinicProfileId: clinicId
      },
      include: {
        user: { select: { name: true, email: true, roles: true } }
      }
    });
    
    console.log('🔍 Found targetStaff:', targetStaff ? { 
      id: targetStaff.id, 
      userId: targetStaff.userId, 
      role: targetStaff.role,
      name: targetStaff.user.name 
    } : 'null');

    if (!targetStaff) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    // Prevent removing owner
    if (targetStaff.role === 'owner') {
      return res.status(400).json({ error: 'Cannot remove clinic owner' });
    }

    // Remove staff member and update user roles
    await prisma.$transaction(async (tx) => {
      // Remove staff assignment
      await tx.clinicStaff.delete({
        where: { userId: BigInt(userId) }
      });

      // Update user roles to remove clinic role
      const currentRoles = targetStaff.user.roles || [];
      const newRoles = currentRoles.filter(r => r !== targetStaff.role);
      
      await tx.user.update({
        where: { id: BigInt(userId) },
        data: { roles: newRoles.length > 0 ? newRoles : ['patient'] } // Default to patient if no roles left
      });
    });

    // Log for audit
    console.log(`Staff member removed: ${targetStaff.user.name} (${targetStaff.user.email}) from clinic ${clinicId} by user ${user.id}`);

    res.json({
      success: true,
      message: 'Staff member removed successfully',
      removedStaff: {
        name: targetStaff.user.name,
        email: targetStaff.user.email,
        role: targetStaff.role
      }
    });

  } catch (error) {
    console.error('Error removing staff member:', error);
    res.status(500).json({ error: 'Failed to remove staff member' });
  }
});

export default router;
