import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRoles } from '../utils/tokens.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';
import {
  buildComplianceReport,
  buildMarketingReport,
  fetchOptionalReportSources
} from '../services/clinicReportInsights.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const prisma = new PrismaClient();
const CLINIC_PORTAL_ROLES = ['owner', 'clinic_owner', 'manager', 'clinic_staff'];

async function findClinicProfileForPortalUser(userId) {
  const normalizedUserId = BigInt(userId);
  let clinicProfile = await prisma.clinicProfile.findFirst({
    where: { userId: normalizedUserId }
  });

  if (!clinicProfile) {
    const staffRecord = await prisma.clinicStaff.findFirst({
      where: { userId: normalizedUserId },
      include: { clinicProfile: true }
    });
    clinicProfile = staffRecord?.clinicProfile || null;
  }

  return clinicProfile;
}

function sendInventoryUnavailable(res, key, reason) {
  return res.json({
    [key]: [],
    dataSource: {
      available: false,
      reason
    }
  });
}

function toId(value) {
  return value == null ? null : value.toString();
}

function toIso(value) {
  return value?.toISOString?.() || null;
}

function lineItemName(item) {
  return item.description || item.metadata?.name || item.metadata?.procedureName || 'Item tindakan';
}

function invoiceToUsageRecord(invoice) {
  const items = (invoice.items || []).map(item => ({
    id: toId(item.id),
    name: lineItemName(item),
    itemName: lineItemName(item),
    quantity: item.quantity || 1,
    qty: item.quantity || 1,
    unit: item.metadata?.unit || 'item',
    unitCost: item.unitPrice || 0,
    totalCost: item.total || 0
  }));
  const date = invoice.paidAt || invoice.createdAt;
  const firstItem = items[0]?.name;
  return {
    id: `invoice-${invoice.id.toString()}`,
    recordNumber: invoice.reference || `INV-${invoice.id.toString()}`,
    date: toIso(date),
    createdAt: toIso(invoice.createdAt),
    treatmentType: invoice.appointment?.reason || firstItem || 'Tindakan klinik',
    patient: invoice.patient?.name || null,
    patientName: invoice.patient?.name || null,
    dentist: invoice.appointment?.dentist?.name || null,
    dentistName: invoice.appointment?.dentist?.name || null,
    totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
    totalCost: invoice.grandTotal || invoice.total || 0,
    items
  };
}

function branchEquipment(branch, kind) {
  const isSterilization = kind === 'sterilization';
  const label = isSterilization ? 'Sterilization Unit' : 'Radiography Unit';
  return {
    id: `branch-${branch.id.toString()}-${kind}`,
    name: `${label} · ${branch.branchName}`,
    type: isSterilization ? 'Sterilisasi' : 'Radiografi',
    brand: null,
    model: null,
    serialNumber: branch.branchCode || null,
    location: branch.branchName,
    condition: branch.isActive ? 'good' : 'fair',
    status: branch.isActive ? 'operational' : 'maintenance',
    nextMaintenance: null,
    source: 'clinic_branches',
    branchId: branch.id.toString()
  };
}

function facilityEquipment(branch, facility, index) {
  return {
    id: `branch-${branch.id.toString()}-facility-${index}`,
    name: `${facility.facility_name} · ${branch.branchName}`,
    type: 'Fasilitas Klinik',
    brand: null,
    model: null,
    serialNumber: branch.branchCode || null,
    location: branch.branchName,
    condition: branch.isActive ? 'good' : 'fair',
    status: branch.isActive ? 'operational' : 'maintenance',
    nextMaintenance: null,
    source: 'clinic_facilities',
    branchId: branch.id.toString()
  };
}

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
router.put(
  '/admin/:id/verify',
  authenticateToken,
  requireRoles(['admin', 'super_admin', 'business_manager', 'customer_success_manager']),
  async (req, res) => {
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
  }
);

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
      facilities,
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
      data: {
        ...branchData,
        clinic_facilities: Array.isArray(facilities) && facilities.length
          ? {
              create: facilities.map((facilityName, index) => ({
                facility_name: String(facilityName),
                display_order: index,
                is_active: true
              }))
            }
          : undefined
      }
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
        clinicProfileId: clinicProfile.id
      },
      include: {
        clinicStaff: {
          where: { isActive: true },
          select: { id: true }
        },
        appointments: {
          where: {
            startsAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
          },
          select: { patientId: true }
        },
        clinic_facilities: {
          where: { is_active: true },
          orderBy: { display_order: 'asc' },
          select: { facility_name: true }
        }
      },
      orderBy: [
        { isMainBranch: 'desc' },
        { branchName: 'asc' }
      ]
    });

    // Convert BigInt to string for JSON serialization
    const serializableBranches = branches.map(branch => {
      const { clinicStaff, appointments, clinic_facilities, ...storedBranch } = branch;
      return {
        ...storedBranch,
        id: branch.id.toString(),
        clinicProfileId: branch.clinicProfileId.toString(),
        staffCount: clinicStaff.length,
        monthlyPatients: new Set(appointments.map(item => item.patientId.toString())).size,
        facilities: clinic_facilities.map(item => item.facility_name),
        ownerEmail: clinicProfile.ownerEmail,
        ownerName: clinicProfile.ownerName,
        ownerWhatsapp: clinicProfile.ownerWhatsapp
      };
    });

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

router.get('/inventory/stock', authenticateToken, requireRoles(CLINIC_PORTAL_ROLES), async (req, res) => {
  try {
    const clinicProfile = await findClinicProfileForPortalUser(req.user.id);
    if (!clinicProfile) return res.status(404).json({ error: 'Clinic profile not found' });

    return sendInventoryUnavailable(
      res,
      'items',
      'Native inventory stock table is not present in the current database schema.'
    );
  } catch (error) {
    console.error('Error fetching clinic inventory stock:', error);
    return res.status(500).json({ error: 'Failed to fetch inventory stock' });
  }
});

router.get('/inventory/purchase-requests', authenticateToken, requireRoles(CLINIC_PORTAL_ROLES), async (req, res) => {
  try {
    const clinicProfile = await findClinicProfileForPortalUser(req.user.id);
    if (!clinicProfile) return res.status(404).json({ error: 'Clinic profile not found' });

    return sendInventoryUnavailable(
      res,
      'requests',
      'Native inventory purchase request table is not present in the current database schema.'
    );
  } catch (error) {
    console.error('Error fetching clinic inventory purchase requests:', error);
    return res.status(500).json({ error: 'Failed to fetch inventory purchase requests' });
  }
});

router.get('/inventory/receipts', authenticateToken, requireRoles(CLINIC_PORTAL_ROLES), async (req, res) => {
  try {
    const clinicProfile = await findClinicProfileForPortalUser(req.user.id);
    if (!clinicProfile) return res.status(404).json({ error: 'Clinic profile not found' });

    return sendInventoryUnavailable(
      res,
      'receipts',
      'Native inventory goods receipt table is not present in the current database schema.'
    );
  } catch (error) {
    console.error('Error fetching clinic inventory receipts:', error);
    return res.status(500).json({ error: 'Failed to fetch inventory receipts' });
  }
});

router.get('/inventory/usage', authenticateToken, requireRoles(CLINIC_PORTAL_ROLES), async (req, res) => {
  try {
    const clinicProfile = await findClinicProfileForPortalUser(req.user.id);
    if (!clinicProfile) return res.status(404).json({ error: 'Clinic profile not found' });

    let branchId = null;
    if (req.query.branchId) {
      try {
        branchId = BigInt(req.query.branchId);
      } catch {
        return res.status(400).json({ error: 'Invalid branchId' });
      }
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 250);
    const invoices = await prisma.invoice.findMany({
      where: {
        ownerClinicId: clinicProfile.id,
        status: { in: ['paid', 'settled'] },
        ...(branchId ? { clinicBranchId: branchId } : {})
      },
      select: {
        id: true,
        reference: true,
        grandTotal: true,
        total: true,
        paidAt: true,
        createdAt: true,
        patient: { select: { name: true } },
        appointment: {
          select: {
            reason: true,
            dentist: { select: { name: true } }
          }
        },
        items: {
          select: {
            id: true,
            description: true,
            quantity: true,
            unitPrice: true,
            total: true,
            metadata: true
          }
        }
      },
      orderBy: [
        { paidAt: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limit
    });

    return res.json({
      records: invoices.map(invoiceToUsageRecord),
      dataSource: {
        available: true,
        source: 'invoices.invoice_items',
        note: 'Usage is derived from paid clinic invoice line items because no native stock usage ledger exists yet.'
      }
    });
  } catch (error) {
    console.error('Error fetching clinic inventory usage:', error);
    return res.status(500).json({ error: 'Failed to fetch inventory usage' });
  }
});

router.get('/inventory/equipment', authenticateToken, requireRoles(CLINIC_PORTAL_ROLES), async (req, res) => {
  try {
    const clinicProfile = await findClinicProfileForPortalUser(req.user.id);
    if (!clinicProfile) return res.status(404).json({ error: 'Clinic profile not found' });

    const branches = await prisma.clinicBranch.findMany({
      where: { clinicProfileId: clinicProfile.id },
      select: {
        id: true,
        branchName: true,
        branchCode: true,
        isActive: true,
        hasSterlization: true,
        hasRadiography: true,
        clinic_facilities: {
          where: { is_active: true },
          orderBy: { display_order: 'asc' },
          select: { facility_name: true }
        }
      },
      orderBy: [
        { isMainBranch: 'desc' },
        { branchName: 'asc' }
      ]
    });

    const equipment = [];
    for (const branch of branches) {
      if (branch.hasSterlization) equipment.push(branchEquipment(branch, 'sterilization'));
      if (branch.hasRadiography) equipment.push(branchEquipment(branch, 'radiography'));

      branch.clinic_facilities
        .filter(facility => /steril|radiografi|radiography|x-?ray|scanner|alat|equipment/i.test(facility.facility_name))
        .forEach((facility, index) => {
          const duplicate = equipment.some(item => item.name.toLowerCase().includes(facility.facility_name.toLowerCase()));
          if (!duplicate) equipment.push(facilityEquipment(branch, facility, index));
        });
    }

    return res.json({
      equipment,
      sterilizationRecords: [],
      dataSource: {
        available: true,
        source: 'clinic_branches.clinic_facilities',
        note: 'Equipment is derived from real branch facility flags. No native equipment maintenance or sterilization cycle table exists yet.'
      }
    });
  } catch (error) {
    console.error('Error fetching clinic inventory equipment:', error);
    return res.status(500).json({ error: 'Failed to fetch inventory equipment' });
  }
});

router.get('/reports', authenticateToken, requireRoles(['owner', 'clinic_owner', 'manager', 'clinic_staff']), async (req, res) => {
  try {
    const userId = BigInt(req.user.id);
    let clinicProfile = await prisma.clinicProfile.findFirst({ where: { userId } });
    if (!clinicProfile) {
      const staff = await prisma.clinicStaff.findFirst({
        where: { userId },
        include: { clinicProfile: true }
      });
      clinicProfile = staff?.clinicProfile || null;
    }
    if (!clinicProfile) return res.status(404).json({ error: 'Clinic profile not found' });

    const end = req.query.end ? new Date(req.query.end) : new Date();
    const start = req.query.start ? new Date(req.query.start) : new Date(end.getTime() - 29 * 86400000);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      return res.status(400).json({ error: 'Invalid report date range' });
    }
    if (end.getTime() - start.getTime() > 366 * 86400000) {
      return res.status(400).json({ error: 'Report range cannot exceed 366 days' });
    }
    let branchId = null;
    if (req.query.branchId) {
      try {
        branchId = BigInt(req.query.branchId);
      } catch {
        return res.status(400).json({ error: 'Invalid branchId' });
      }
    }
    const branchWhere = {
      clinicProfileId: clinicProfile.id,
      ...(branchId ? { id: branchId } : {})
    };
    const branches = await prisma.clinicBranch.findMany({
      where: branchWhere,
      select: { id: true, branchName: true, treatmentRoomsCount: true }
    });
    const branchIds = branches.map(branch => branch.id);
    const appointmentWhere = {
      ownerClinicId: clinicProfile.id,
      clinicBranchId: { in: branchIds },
      startsAt: { gte: start, lte: end }
    };
    const [appointments, invoices, staff] = await Promise.all([
      prisma.appointment.findMany({
        where: appointmentWhere,
        select: {
          id: true, startsAt: true, endsAt: true, status: true, dentistId: true, metadata: true,
          patientId: true, clinicBranchId: true,
          dentist: { select: { name: true } },
          preSessionHealthForm: { select: { id: true } }
        }
      }),
      prisma.invoice.findMany({
        where: {
          ownerClinicId: clinicProfile.id,
          clinicBranchId: { in: branchIds },
          status: { in: ['paid', 'settled'] },
          paidAt: { gte: start, lte: end }
        },
        select: {
          grandTotal: true, total: true, clinicBranchId: true,
          appointment: { select: { dentistId: true } }
        }
      }),
      prisma.clinicStaff.findMany({
        where: {
          clinicProfileId: clinicProfile.id,
          ...(branchId ? { assignedBranchId: branchId } : {})
        },
        select: {
          userId: true, role: true, isActive: true, assignedBranchId: true,
          user: { select: { name: true } }
        }
      })
    ]);

    const paidValue = invoice => invoice.grandTotal || invoice.total || 0;
    const peopleMap = new Map();
    for (const member of staff) {
      peopleMap.set(member.userId.toString(), {
        id: member.userId.toString(),
        name: member.user.name,
        role: member.role,
        active: member.isActive,
        branchId: member.assignedBranchId?.toString() || null,
        branchName: branches.find(branch => branch.id === member.assignedBranchId)?.branchName || null,
        appointments: 0, completed: 0, cancelled: 0, noShow: 0,
        uniquePatients: 0, revenue: 0, averageDurationMinutes: null
      });
    }
    const patientSets = new Map();
    const durationTotals = new Map();
    for (const appointment of appointments) {
      const key = appointment.dentistId.toString();
      if (!peopleMap.has(key)) {
        peopleMap.set(key, {
          id: key, name: appointment.dentist.name, role: 'dentist', active: true,
          branchId: appointment.clinicBranchId?.toString() || null,
          branchName: branches.find(branch => branch.id === appointment.clinicBranchId)?.branchName || null,
          appointments: 0, completed: 0, cancelled: 0, noShow: 0,
          uniquePatients: 0, revenue: 0, averageDurationMinutes: null
        });
      }
      const person = peopleMap.get(key);
      person.appointments++;
      const status = String(appointment.status).toLowerCase().replace('_', '-');
      if (status === 'completed') person.completed++;
      if (status === 'cancelled') person.cancelled++;
      if (status === 'no-show' || status === 'noshow') person.noShow++;
      if (!patientSets.has(key)) patientSets.set(key, new Set());
      patientSets.get(key).add(appointment.patientId.toString());
      const duration = Math.max(0, (appointment.endsAt - appointment.startsAt) / 60000);
      durationTotals.set(key, (durationTotals.get(key) || 0) + duration);
    }
    for (const invoice of invoices) {
      const key = invoice.appointment?.dentistId?.toString();
      if (key && peopleMap.has(key)) peopleMap.get(key).revenue += paidValue(invoice);
    }
    for (const [key, person] of peopleMap) {
      person.uniquePatients = patientSets.get(key)?.size || 0;
      person.completionRate = person.appointments ? Math.round(person.completed / person.appointments * 100) : null;
      person.averageDurationMinutes = person.appointments
        ? Math.round((durationTotals.get(key) || 0) / person.appointments)
        : null;
    }

    const dailyMap = new Map();
    for (const appointment of appointments) {
      const day = appointment.startsAt.toISOString().slice(0, 10);
      const row = dailyMap.get(day) || { date: day, scheduled: 0, completed: 0, cancelled: 0, noShow: 0 };
      row.scheduled++;
      const status = String(appointment.status).toLowerCase().replace('_', '-');
      if (status === 'completed') row.completed++;
      if (status === 'cancelled') row.cancelled++;
      if (status === 'no-show' || status === 'noshow') row.noShow++;
      dailyMap.set(day, row);
    }
    const completed = appointments.filter(item => item.status === 'completed').length;
    const cancelled = appointments.filter(item => item.status === 'cancelled').length;
    const noShow = appointments.filter(item => ['no-show', 'no_show', 'noshow'].includes(item.status)).length;
    const revenue = invoices.reduce((sum, invoice) => sum + paidValue(invoice), 0);
    const periodPatientIds = [...new Set(appointments.map(item => item.patientId))];
    const appointmentHistory = periodPatientIds.length
      ? await prisma.appointment.findMany({
          where: {
            ownerClinicId: clinicProfile.id,
            clinicBranchId: { in: branchIds },
            patientId: { in: periodPatientIds },
            startsAt: { lte: end }
          },
          select: {
            patientId: true,
            startsAt: true
          }
        })
      : [];
    const optionalSources = await fetchOptionalReportSources({
      db: prisma,
      clinicProfileId: clinicProfile.id,
      branchId,
      start,
      end,
      newPatientIds: periodPatientIds
    });
    const complianceReport = buildComplianceReport({
      appointments,
      staff,
      securityMetrics: optionalSources.securityMetrics,
      backupMetrics: optionalSources.backupMetrics,
      checklistItems: optionalSources.checklistItems,
      optionalSourceStatus: optionalSources.optionalSourceStatus
    });
    const marketingReport = buildMarketingReport({
      appointments,
      appointmentHistory,
      periodStart: start,
      attributionByPatient: optionalSources.attributionByPatient,
      reviewSummary: optionalSources.reviewSummary,
      campaignPerformance: optionalSources.campaignPerformance,
      optionalSourceStatus: optionalSources.optionalSourceStatus
    });

    return res.json({
      period: { start: start.toISOString(), end: end.toISOString() },
      branches: branches.map(branch => ({
        id: branch.id.toString(),
        name: branch.branchName,
        treatmentRooms: branch.treatmentRoomsCount
      })),
      summary: {
        appointments: appointments.length,
        completed,
        cancelled,
        noShow,
        completionRate: appointments.length ? Math.round(completed / appointments.length * 100) : null,
        uniquePatients: new Set(appointments.map(item => item.patientId.toString())).size,
        revenue,
        transactions: invoices.length,
        averageTransaction: invoices.length ? Math.round(revenue / invoices.length) : 0,
        activeStaff: staff.filter(member => member.isActive).length
      },
      daily: [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
      people: [...peopleMap.values()].sort((a, b) => b.completed - a.completed || b.revenue - a.revenue),
      compliance: complianceReport.compliance,
      marketing: marketingReport.marketing,
      dataAvailability: {
        operational: true,
        financial: true,
        compliance: complianceReport.availability,
        marketing: marketingReport.availability
      }
    });
  } catch (error) {
    console.error('Error generating clinic report:', error);
    return res.status(500).json({ error: 'Failed to generate clinic report' });
  }
});

router.get('/analytics/revenue-by-branch', authenticateToken, requireRoles(['owner', 'clinic_owner', 'manager', 'clinic_staff']), async (req, res) => {
  try {
    let clinicProfile = await prisma.clinicProfile.findFirst({
      where: { userId: req.user.id }
    });
    if (!clinicProfile) {
      const staffRecord = await prisma.clinicStaff.findFirst({
        where: { userId: req.user.id },
        select: { clinicProfile: true }
      });
      clinicProfile = staffRecord?.clinicProfile || null;
    }
    if (!clinicProfile) {
      return res.status(404).json({ error: 'Clinic profile not found' });
    }

    const now = new Date();
    const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const paidStatuses = ['paid', 'settled'];
    const branches = await prisma.clinicBranch.findMany({
      where: { clinicProfileId: clinicProfile.id },
      select: {
        id: true,
        branchName: true,
        invoices: {
          where: {
            status: { in: paidStatuses },
            paidAt: { gte: previousStart }
          },
          select: { grandTotal: true, total: true, paidAt: true }
        }
      },
      orderBy: [{ isMainBranch: 'desc' }, { branchName: 'asc' }]
    });

    const data = branches.map(branch => {
      const currentInvoices = branch.invoices.filter(invoice => invoice.paidAt >= currentStart);
      const previousInvoices = branch.invoices.filter(invoice => invoice.paidAt < currentStart);
      const sum = invoices => invoices.reduce(
        (total, invoice) => total + (invoice.grandTotal || invoice.total || 0),
        0
      );
      const monthlyRevenue = sum(currentInvoices);
      const previousRevenue = sum(previousInvoices);
      const growth = previousRevenue > 0
        ? Number((((monthlyRevenue - previousRevenue) / previousRevenue) * 100).toFixed(1))
        : null;

      return {
        branchId: branch.id.toString(),
        branchName: branch.branchName,
        monthlyRevenue,
        transactions: currentInvoices.length,
        avgTransaction: currentInvoices.length
          ? Math.round(monthlyRevenue / currentInvoices.length)
          : 0,
        growth
      };
    });

    return res.json({ data });
  } catch (error) {
    console.error('Error fetching revenue by branch:', error);
    return res.status(500).json({ error: 'Failed to fetch revenue by branch' });
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
    const facilities = Array.isArray(updateData.facilities) ? updateData.facilities : null;

    if (updateData.treatmentRoomsCount) {
      updateData.treatmentRoomsCount = parseInt(updateData.treatmentRoomsCount);
    }

    if (updateData.hasSterlization !== undefined) {
      updateData.hasSterlization = updateData.hasSterlization === 'true';
    }

    if (updateData.hasRadiography !== undefined) {
      updateData.hasRadiography = updateData.hasRadiography === 'true';
    }

    if (updateData.operatingHours && typeof updateData.operatingHours === 'string') {
      updateData.operatingHours = JSON.parse(updateData.operatingHours);
    }

    delete updateData.address;
    delete updateData.treatmentRooms;
    delete updateData.facilities;

    const updatedBranch = await prisma.$transaction(async transaction => {
      const branch = await transaction.clinicBranch.update({
        where: {
          id: BigInt(id),
          clinicProfileId: clinicProfile.id
        },
        data: updateData
      });
      if (facilities) {
        await transaction.clinic_facilities.deleteMany({
          where: { clinic_branch_id: branch.id }
        });
        if (facilities.length) {
          await transaction.clinic_facilities.createMany({
            data: facilities.map((facilityName, index) => ({
              clinic_branch_id: branch.id,
              facility_name: String(facilityName),
              display_order: index,
              is_active: true
            }))
          });
        }
      }
      return branch;
    });

    res.json({
      message: 'Branch updated successfully',
      branch: {
        ...updatedBranch,
        id: updatedBranch.id.toString(),
        clinicProfileId: updatedBranch.clinicProfileId.toString()
      }
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

    // Calculate real stats
    let calculatedStats = null;
    try {
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      
      const clinicAppointments = await prisma.appointment.findMany({
        where: {
          ownerClinicId: clinicId,
          startsAt: { gte: previousMonthStart }
        },
        select: {
          id: true,
          startsAt: true,
          status: true,
          dentistId: true
        }
      });

      const clinicInvoices = await prisma.invoice.findMany({
        where: {
          ownerClinicId: clinicId,
          status: { in: ['paid', 'settled'] },
          paidAt: { gte: previousMonthStart }
        },
        select: {
          grandTotal: true,
          paidAt: true
        }
      });

      const activeStaff = allStaff.filter(s => s.isActive);
      
      const curAppts = clinicAppointments.filter(a => a.startsAt >= currentMonthStart);
      const prevAppts = clinicAppointments.filter(a => a.startsAt < currentMonthStart);
      
      const curInvoices = clinicInvoices.filter(i => i.paidAt >= currentMonthStart);
      const prevInvoices = clinicInvoices.filter(i => i.paidAt < currentMonthStart);

      const curCompleted = curAppts.filter(a => a.status === 'completed').length;
      const curEfficiency = curAppts.length > 0 ? Math.round((curCompleted / curAppts.length) * 100) : 88;
      
      const prevCompleted = prevAppts.filter(a => a.status === 'completed').length;
      const prevEfficiency = prevAppts.length > 0 ? Math.round((prevCompleted / prevAppts.length) * 100) : 85;
      
      const efficiencyTrend = prevAppts.length > 0 ? curEfficiency - prevEfficiency : 0;

      const activeDentists = activeStaff.filter(s => s.role === 'dentist');
      const dentistCount = activeDentists.length > 0 ? activeDentists.length : 1;
      const curUtilization = Math.min(100, curAppts.length > 0 ? Math.round((curAppts.length / (dentistCount * 80)) * 100) : 75);
      const prevUtilization = Math.min(100, prevAppts.length > 0 ? Math.round((prevAppts.length / (dentistCount * 80)) * 100) : 72);
      const utilizationTrend = prevAppts.length > 0 ? curUtilization - prevUtilization : 0;

      const curSatisfaction = allStaff.length > 0 ? Math.round((activeStaff.length / allStaff.length) * 100) : 100;
      const satisfactionTrend = 0;

      const curRevenue = curInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
      const prevRevenue = prevInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
      
      const curRevPerStaff = activeStaff.length > 0 ? Math.round(curRevenue / activeStaff.length) : 0;
      const prevRevPerStaff = activeStaff.length > 0 ? Math.round(prevRevenue / activeStaff.length) : 0;
      const revenueTrend = (prevInvoices.length > 0 && prevRevPerStaff > 0) ? Math.round(((curRevPerStaff - prevRevPerStaff) / prevRevPerStaff) * 100) : 0;

      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const activeTodayCount = allStaff.filter(s => s.user.lastLoginAt && new Date(s.user.lastLoginAt) >= today).length;
      const activeTodayRatio = allStaff.length > 0 ? activeTodayCount / allStaff.length : 0.8;
      const curCapacity = Math.round(activeTodayRatio * curUtilization);
      const prevCapacity = Math.round(0.75 * prevUtilization);
      const capacityTrend = prevAppts.length > 0 ? curCapacity - prevCapacity : 0;

      const curProductivity = activeStaff.length > 0 ? Math.round((curCompleted / activeStaff.length) * 10) : 12;
      const prevProductivity = activeStaff.length > 0 ? Math.round((prevCompleted / activeStaff.length) * 10) : 10;
      const productivityTrend = prevAppts.length > 0 ? curProductivity - prevProductivity : 0;

      const attendanceRate = Math.round(activeTodayRatio * 100);
      const attendanceTrend = 0;

      const dentistAppointmentsTotal = {};
      const dentistAppointmentsCompleted = {};
      curAppts.forEach(a => {
        const dentistIdStr = a.dentistId.toString();
        dentistAppointmentsTotal[dentistIdStr] = (dentistAppointmentsTotal[dentistIdStr] || 0) + 1;
        if (a.status === 'completed') {
          dentistAppointmentsCompleted[dentistIdStr] = (dentistAppointmentsCompleted[dentistIdStr] || 0) + 1;
        }
      });

      const topPerformers = [];
      for (const s of activeStaff) {
        if (s.role === 'dentist') {
          const total = dentistAppointmentsTotal[s.userId.toString()] || 0;
          const completed = dentistAppointmentsCompleted[s.userId.toString()] || 0;
          if (total > 0) {
            const score = Math.round((completed / total) * 100);
            topPerformers.push({
              name: s.user.name,
              score: score,
              completed,
              total
            });
          }
        }
      }
      // Sort first by completion score, then by volume of completed treatments
      topPerformers.sort((a, b) => b.score - a.score || b.completed - a.completed);
      const slicedPerformers = topPerformers.slice(0, 3);
      
      // Fallback only if no clinical appointments were recorded at all
      if (slicedPerformers.length === 0 && activeStaff.length > 0) {
        activeStaff.slice(0, 3).forEach(s => {
          slicedPerformers.push({
            name: s.user.name,
            score: 0
          });
        });
      }

      const recommendations = [];
      if (curEfficiency < 80) {
        recommendations.push(`Optimize completion rate: currently only ${curEfficiency}% of appointments are marked completed.`);
      }
      if (curUtilization < 75) {
        recommendations.push(`Under-utilized capacity: current dentist scheduling utilization is at ${curUtilization}%.`);
      } else if (curUtilization > 95) {
        recommendations.push(`High capacity load: utilization is at ${curUtilization}%. Consider onboarding more dentists.`);
      }
      if (curSatisfaction < 80) {
        recommendations.push(`Improve retention: satisfaction/retention score is currently at ${curSatisfaction}%.`);
      }
      if (attendanceRate < 80) {
        recommendations.push(`Improve active attendance: only ${attendanceRate}% of registered staff logged in today.`);
      }
      if (recommendations.length === 0) {
        recommendations.push("Excellent performance across all metrics - maintain current operations.");
      }

      calculatedStats = {
        total: allStaff.length,
        active: activeStaff.length,
        efficiency: curEfficiency,
        efficiency_target: 85,
        efficiency_subtitle: 'task completion rate',
        efficiency_trend: efficiencyTrend,
        utilization: curUtilization,
        utilization_target: 80,
        utilization_subtitle: 'capacity utilization',
        utilization_trend: utilizationTrend,
        satisfaction: curSatisfaction,
        satisfaction_target: 85,
        satisfaction_subtitle: 'staff retention rate',
        satisfaction_trend: satisfactionTrend,
        revenue_per_staff: curRevPerStaff,
        revenue_per_staff_subtitle: 'monthly average',
        revenue_per_staff_trend: revenueTrend,
        capacity: curCapacity,
        capacity_subtitle: 'operational capacity',
        capacity_trend: capacityTrend,
        productivity: curProductivity,
        productivity_subtitle: 'tasks completed scale',
        productivity_trend: productivityTrend,
        attendance: attendanceRate,
        attendance_subtitle: 'daily attendance rate',
        attendance_trend: attendanceTrend,
        top_performers: slicedPerformers,
        recommendations
      };
    } catch (statsError) {
      console.error('⚠️ Failed to calculate real staff stats, omitting:', statsError);
    }

    res.json({
      message: 'Staff list retrieved successfully',
      staff: staffList,
      clinicId: clinicId.toString(),
      stats: calculatedStats
    });

  } catch (error) {
    console.error('Error fetching clinic staff:', error);
    res.status(500).json({ error: 'Failed to fetch staff list' });
  }
});

const CLINIC_STAFF_MANAGER_TOKEN_ROLES = [
  'owner',
  'clinic_owner',
  'manager',
  'clinic_manager',
  'clinic_admin',
  'admin'
];
const CLINIC_STAFF_MANAGER_ROLES = new Set(['owner', 'manager', 'admin']);
const CLINIC_STAFF_ELEVATED_ROLES = new Set(['manager', 'admin']);
const CLINIC_STAFF_ASSIGNABLE_ROLES = new Set([
  'manager',
  'front_office',
  'nurse',
  'cashier',
  'admin',
  'dentist',
  'staff'
]);
const CLINIC_PATIENT_TOKEN_ROLES = [
  'owner',
  'clinic_owner',
  'manager',
  'clinic_manager',
  'clinic_admin',
  'clinic_staff',
  'front_office',
  'nurse',
  'staff'
];
const CLINIC_PATIENT_STAFF_ROLES = new Set([
  'owner',
  'clinic_owner',
  'manager',
  'clinic_manager',
  'admin',
  'clinic_admin',
  'clinic_staff',
  'front_office',
  'nurse',
  'staff'
]);

function staffManagementError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function clinicStaffAuthRole(role) {
  return role === 'admin' ? 'clinic_admin' : role;
}

async function assertCanManageClinicStaff(
  userId,
  { requestedRole, targetStaff, modifiesPermissions = false } = {}
) {
  const requester = await prisma.clinicStaff.findUnique({
    where: { userId: BigInt(userId) },
    include: { clinicProfile: true }
  });
  if (!requester || !requester.isActive || !CLINIC_STAFF_MANAGER_ROLES.has(requester.role)) {
    throw staffManagementError(403, 'Only an active clinic owner or manager can manage staff');
  }
  if (requestedRole === 'owner') {
    throw staffManagementError(403, 'Clinic ownership can only be changed through ownership transfer');
  }
  if (requestedRole && !CLINIC_STAFF_ASSIGNABLE_ROLES.has(requestedRole)) {
    throw staffManagementError(400, 'Invalid role specified');
  }
  if (
    requestedRole &&
    CLINIC_STAFF_ELEVATED_ROLES.has(requestedRole) &&
    requester.role !== 'owner'
  ) {
    throw staffManagementError(403, 'Only the clinic owner can assign manager or admin roles');
  }
  if (modifiesPermissions && requester.role !== 'owner') {
    throw staffManagementError(403, 'Only the clinic owner can change staff permissions');
  }
  if (targetStaff) {
    if (targetStaff.clinicProfileId !== requester.clinicProfileId) {
      throw staffManagementError(403, 'Access denied - staff member not in your clinic');
    }
    if (targetStaff.role === 'owner') {
      throw staffManagementError(403, 'Cannot modify owner account');
    }
    if (
      requester.role !== 'owner' &&
      CLINIC_STAFF_ELEVATED_ROLES.has(targetStaff.role)
    ) {
      throw staffManagementError(403, 'Only the clinic owner can manage manager or admin accounts');
    }
  }
  return requester;
}

// Add staff to clinic (owner/manager only)
router.post('/staff', authenticateToken, requireRoles(CLINIC_STAFF_MANAGER_TOKEN_ROLES), async (req, res) => {
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

    const requestingUserStaff = await assertCanManageClinicStaff(user.id, {
      requestedRole: role,
      modifiesPermissions: permissions !== undefined
    });

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
          roles: [clinicStaffAuthRole(role)]
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
        roles: [...(targetUser.roles || []), clinicStaffAuthRole(role)]
          .filter((r, i, arr) => arr.indexOf(r) === i)
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
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Failed to add staff member' });
  }
});

// Update staff (owner/manager only)
router.put('/staff/:staffId', authenticateToken, requireRoles(CLINIC_STAFF_MANAGER_TOKEN_ROLES), async (req, res) => {
  try {
    const { staffId } = req.params;
    const { role, position, department, status, permissions, phone, name, email, branchId } = req.body;
    const user = req.user;

    console.log('🔄 PUT /staff/:staffId called with:', {
      staffId,
      requestBody: { role, position, department, status, permissions, phone, name, email, branchId },
      userId: user.id
    });

    // Find the staff member to update
    const targetStaff = await prisma.clinicStaff.findUnique({
      where: { id: parseInt(staffId) },
      include: { user: true }
    });

    if (!targetStaff) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    const requestingUserStaff = await assertCanManageClinicStaff(user.id, {
      requestedRole: role,
      targetStaff,
      modifiesPermissions: permissions !== undefined
    });
    if (
      targetStaff.userId === BigInt(user.id) &&
      (role !== undefined || status !== undefined)
    ) {
      throw staffManagementError(403, 'Use another authorized manager to change your own role or status');
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
      const previousAuthRole = clinicStaffAuthRole(targetStaff.role);
      const filtered = currentRoles.filter(
        (currentRole) => currentRole !== targetStaff.role && currentRole !== previousAuthRole
      );
      const nextRoles = [...filtered, clinicStaffAuthRole(role)]
        .filter((value, index, self) => self.indexOf(value) === index);
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
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Failed to update staff member' });
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
router.put('/staff/:userId/role', authenticateToken, requireRoles(CLINIC_STAFF_MANAGER_TOKEN_ROLES), async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, status } = req.body;
    const user = req.user;

    // Validate status
    const validStatuses = ['active', 'inactive'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status specified' });
    }

    const requestingUserStaff = await assertCanManageClinicStaff(user.id, {
      requestedRole: role
    });
    const clinicId = requestingUserStaff.clinicProfileId;

    // Get target staff member
    const targetStaff = await prisma.clinicStaff.findFirst({
      where: {
        userId: BigInt(userId),
        clinicProfileId: clinicId
      },
      include: {
        user: { select: { name: true, email: true, roles: true } }
      }
    });

    if (!targetStaff) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    await assertCanManageClinicStaff(user.id, { requestedRole: role, targetStaff });
    if (targetStaff.userId === BigInt(user.id)) {
      throw staffManagementError(403, 'Use another authorized manager to change your own role or status');
    }

    // Prepare update data
    const updateData = {};
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.isActive = status === 'active';

    const updatedStaff = await prisma.$transaction(async (tx) => {
      if (role !== undefined && role !== targetStaff.role) {
        const previousAuthRole = clinicStaffAuthRole(targetStaff.role);
        const retainedRoles = (targetStaff.user.roles || []).filter(
          (currentRole) => currentRole !== targetStaff.role && currentRole !== previousAuthRole
        );
        await tx.user.update({
          where: { id: targetStaff.userId },
          data: {
            roles: [...retainedRoles, clinicStaffAuthRole(role)]
              .filter((value, index, roles) => roles.indexOf(value) === index)
          }
        });
      }
      return tx.clinicStaff.update({
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
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Failed to update staff member' });
  }
});

// Remove staff member (owner/manager only)
router.delete('/staff/:userId', authenticateToken, requireRoles(CLINIC_STAFF_MANAGER_TOKEN_ROLES), async (req, res) => {
  try {
    const { userId } = req.params;
    const user = req.user;

    console.log('🗑️ DELETE /staff/:userId called');
    console.log('🗑️ Received userId parameter:', userId, 'type:', typeof userId);
    console.log('🗑️ Requesting user:', user.id, 'roles:', user.roles);

    const requestingUserStaff = await assertCanManageClinicStaff(user.id);
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

    await assertCanManageClinicStaff(user.id, { targetStaff });
    if (targetStaff.userId === BigInt(user.id)) {
      throw staffManagementError(403, 'You cannot remove your own staff access');
    }

    // Remove staff member and update user roles
    await prisma.$transaction(async (tx) => {
      // Remove staff assignment
      await tx.clinicStaff.delete({
        where: { userId: BigInt(userId) }
      });

      // Update user roles to remove clinic role
      const currentRoles = targetStaff.user.roles || [];
      const authRole = clinicStaffAuthRole(targetStaff.role);
      const newRoles = currentRoles.filter(r => r !== targetStaff.role && r !== authRole);

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
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Failed to remove staff member' });
  }
});

// =====================
// CLINIC PATIENTS ENDPOINT
// =====================
// Get all patients who have had appointments with dentists in this clinic
router.get('/patients', authenticateToken, requireRoles(CLINIC_PATIENT_TOKEN_ROLES), async (req, res) => {
  try {
    const user = req.user;
    const userId = BigInt(user.id);

    // 1. Find the clinic for this user
    const staffRecord = await prisma.clinicStaff.findFirst({
      where: { userId, isActive: true },
      select: {
        clinicProfileId: true,
        role: true,
        assignedBranchId: true
      }
    });

    if (!staffRecord) {
      return res.status(403).json({ error: 'Access denied - not associated with any clinic' });
    }
    if (!CLINIC_PATIENT_STAFF_ROLES.has(staffRecord.role)) {
      return res.status(403).json({ error: 'Access denied - clinic role cannot view patient records' });
    }

    const clinicId = staffRecord.clinicProfileId;
    const isClinicOwner = ['owner', 'clinic_owner'].includes(staffRecord.role);
    const assignedBranchScope = !isClinicOwner ? staffRecord.assignedBranchId : null;

    // 2. Get all staff (dentists) in this clinic
    const clinicStaffList = await prisma.clinicStaff.findMany({
      where: { clinicProfileId: clinicId, isActive: true },
      include: {
        user: {
          select: { id: true, name: true, roles: true }
        }
      }
    });

    // Filter to dentist-role staff only
    const dentistStaff = clinicStaffList.filter(s =>
      s.role === 'dentist' || s.role === 'owner' || s.user.roles.includes('dentist')
    );

    const dentistUserIds = dentistStaff.map(s => s.userId);

    if (dentistUserIds.length === 0) {
      return res.json({ patients: [], appointments: [], dentists: [] });
    }

    // 3. Get all appointments for these dentists
    const appointments = await prisma.appointment.findMany({
      where: {
        dentistId: { in: dentistUserIds },
        ...(assignedBranchScope ? { clinicBranchId: assignedBranchScope } : {}),
        OR: [
          { ownerClinicId: clinicId },
          { clinicBranch: { clinicProfileId: clinicId } }
        ]
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
            phone_number: true,
            avatar_url: true,
            createdAt: true,
            patientProfile: {
              select: {
                dateOfBirth: true,
                gender: true,
                insuranceProvider: true,
                insuranceNumber: true,
                insuranceMemberId: true,
                medicalDetails: true,
                address: true,
                emergencyContact: true,
                preferredLanguage: true
              }
            }
          }
        },
        dentist: {
          select: {
            id: true,
            name: true
          }
        },
        paymentIntents: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            amount: true,
            status: true,
            createdAt: true
          }
        },
        preSessionHealthForm: {
          select: {
            symptoms: true,
            painLevel: true,
            allergies: true,
            medications: true,
            notes: true,
            answers: true,
            submittedAt: true,
            updatedAt: true
          }
        }
      },
      orderBy: { startsAt: 'desc' }
    });

    // Accept both current and legacy success statuses for compatibility.
    const successfulPaymentStatuses = new Set(['succeeded', 'paid', 'settled']);

    // 4. Build unique patients map
    const patientsMap = new Map();
    const serializedAppointments = [];

    for (const apt of appointments) {
      const patientIdStr = apt.patientId.toString();
      const dentistIdStr = apt.dentistId.toString();
      const payment = apt.paymentIntents?.[0] || null;
      const fee = payment?.amount || 0;
      const isPaid = payment?.status ? successfulPaymentStatuses.has(payment.status) : false;

      // Serialize appointment
      serializedAppointments.push({
        id: apt.id.toString(),
        patientId: patientIdStr,
        patientName: apt.patient?.name || 'Unknown',
        dentistId: dentistIdStr,
        dentistName: apt.dentist?.name || 'Unknown',
        date: apt.startsAt.toISOString().split('T')[0],
        time: apt.startsAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }),
        startsAt: apt.startsAt.toISOString(),
        endsAt: apt.endsAt.toISOString(),
        status: apt.status,
        reason: apt.reason || '',
        treatment: apt.reason || '',
        notes: apt.notes || '',
        fee,
        isPaid,
        consultationType: apt.consultationType || 'onsite',
        healthForm: apt.preSessionHealthForm
          ? {
              ...apt.preSessionHealthForm,
              submittedAt: apt.preSessionHealthForm.submittedAt?.toISOString() || null,
              updatedAt: apt.preSessionHealthForm.updatedAt?.toISOString() || null
            }
          : null
      });

      // Build or update patient entry
      if (!patientsMap.has(patientIdStr)) {
        const profile = apt.patient?.patientProfile;
        const dob = profile?.dateOfBirth;
        let age = null;
        if (dob) {
          const today = new Date();
          const birth = new Date(dob);
          age = today.getFullYear() - birth.getFullYear();
          if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) {
            age--;
          }
        }

        // Normalize gender: DB may store 'male'/'female', frontend expects 'M'/'F'
        const rawGender = (profile?.gender || '').toLowerCase();
        const normalizedGender = rawGender === 'male' || rawGender === 'm' ? 'M'
          : rawGender === 'female' || rawGender === 'f' ? 'F'
            : null;

        patientsMap.set(patientIdStr, {
          id: patientIdStr,
          name: apt.patient?.name || 'Unknown',
          email: apt.patient?.email || '',
          phone: apt.patient?.phone_number || '',
          avatar: apt.patient?.avatar_url || null,
          age,
          gender: normalizedGender,
          dateOfBirth: dob ? dob.toISOString().split('T')[0] : null,
          address: profile?.address || null,
          insuranceProvider: profile?.insuranceProvider || null,
          insuranceNumber: profile?.insuranceNumber || null,
          insuranceMemberId: profile?.insuranceMemberId || null,
          preferredLanguage: profile?.preferredLanguage || null,
          medicalDetails: profile?.medicalDetails || null,
          medicalRecord: {
            allergies: profile?.medicalDetails?.allergies || [],
            conditions: profile?.medicalDetails?.conditions || [],
            bloodType: profile?.medicalDetails?.bloodType || null,
            lastTreatment: null
          },
          emergencyContact: profile?.emergencyContact || null,
          latestHealthForm: apt.preSessionHealthForm
            ? {
                symptoms: apt.preSessionHealthForm.symptoms || null,
                painLevel: apt.preSessionHealthForm.painLevel ?? null,
                allergies: apt.preSessionHealthForm.allergies || null,
                medications: apt.preSessionHealthForm.medications || null,
                notes: apt.preSessionHealthForm.notes || null,
                submittedAt: apt.preSessionHealthForm.submittedAt?.toISOString() || null
              }
            : null,
          status: 'active',
          createdAt: apt.patient?.createdAt?.toISOString() || null,
          // Will be updated below
          doctorId: dentistIdStr,
          doctorName: apt.dentist?.name || 'Unknown',
          lastVisit: apt.startsAt.toISOString().split('T')[0],
          totalVisits: 0,
          totalRevenue: 0,
          appointments: [],
          recentAppointments: []
        });
      }

      const patientEntry = patientsMap.get(patientIdStr);
      if (!patientEntry.latestHealthForm && apt.preSessionHealthForm) {
        patientEntry.latestHealthForm = {
          symptoms: apt.preSessionHealthForm.symptoms || null,
          painLevel: apt.preSessionHealthForm.painLevel ?? null,
          allergies: apt.preSessionHealthForm.allergies || null,
          medications: apt.preSessionHealthForm.medications || null,
          notes: apt.preSessionHealthForm.notes || null,
          submittedAt: apt.preSessionHealthForm.submittedAt?.toISOString() || null
        };
      }
      patientEntry.totalVisits++;
      if (isPaid) patientEntry.totalRevenue += fee;

      // Track latest visit
      if (apt.startsAt > new Date(patientEntry.lastVisit)) {
        patientEntry.lastVisit = apt.startsAt.toISOString().split('T')[0];
        patientEntry.doctorId = dentistIdStr;
        patientEntry.doctorName = apt.dentist?.name || 'Unknown';
        patientEntry.medicalRecord.lastTreatment = apt.reason || null;
      }
    }

    // 5. Finalize patients — attach appointments and recent
    const patients = Array.from(patientsMap.values()).map(p => {
      const patientApts = serializedAppointments.filter(a => a.patientId === p.id);
      return {
        ...p,
        appointments: patientApts,
        recentAppointments: patientApts.slice(0, 3).map(a => ({
          date: a.date,
          treatment: a.treatment,
          doctor: a.dentistName,
          status: a.status
        }))
      };
    });

    // 6. Build dentist list for the frontend
    const visibleDentistIds = new Set(appointments.map(appointment => appointment.dentistId.toString()));
    const dentists = dentistStaff
      .filter(staff => !assignedBranchScope || visibleDentistIds.has(staff.userId.toString()))
      .map(s => ({
        id: s.userId.toString(),
        name: s.user.name,
        role: s.role
      }));

    console.log(`📋 Clinic patients: ${patients.length} patients, ${serializedAppointments.length} appointments, ${dentists.length} dentists`);

    res.json({
      patients,
      appointments: serializedAppointments,
      dentists
    });

  } catch (error) {
    console.error('Error fetching clinic patients:', error);
    res.status(500).json({ error: 'Failed to fetch clinic patients' });
  }
});

export default router;
