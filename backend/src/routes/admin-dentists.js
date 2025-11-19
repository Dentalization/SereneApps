import express from 'express';
import { PrismaClient } from '../generated/prisma/index.js';
import { authenticateToken, requireRoles } from '../utils/tokens.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all dentists (admin only)
router.get('/dentists', authenticateToken, requireRoles(['super_admin', 'customer_success_manager']), async (req, res) => {
  try {
    console.log('🦷 Fetching all dentists for admin...');
    
    const { 
      status = 'all',        // all, verified, pending, rejected
      type = 'all',          // all, independent, clinic-staff
      search = '',
      specialization = 'all',
      location = 'all',
      page = 1,
      limit = 50
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
    let whereClause = {};
    
    // Filter by verification status
    if (status === 'verified') {
      whereClause.isVerified = true;
    } else if (status === 'pending') {
      whereClause.isVerified = false;
    }
    
    // Search filter
    if (search) {
      whereClause.OR = [
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { licenseNumber: { contains: search, mode: 'insensitive' } },
        { primarySpecialization: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // Specialization filter
    if (specialization !== 'all') {
      whereClause.primarySpecialization = specialization;
    }

    // Get dentist profiles with user data
    const dentistProfiles = await prisma.dentistProfile.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar_url: true,
            createdAt: true,
            lastLoginAt: true,
            roles: true,
            clinicStaff: {
              include: {
                clinicProfile: {
                  select: {
                    id: true,
                    legalName: true,
                    brandName: true
                  }
                },
                assignedBranch: {
                  select: {
                    id: true,
                    branchName: true,
                    city: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: parseInt(limit)
    });

    // Get total count for pagination
    const totalCount = await prisma.dentistProfile.count({
      where: whereClause
    });

    // Transform data
    const dentists = dentistProfiles.map(profile => {
      const isClinicStaff = !!profile.user.clinicStaff;
      const clinicInfo = profile.user.clinicStaff?.clinicProfile;
      const branchInfo = profile.user.clinicStaff?.assignedBranch;
      
      return {
        id: profile.id.toString(),
        userId: profile.user.id.toString(),
        name: profile.user.name,
        email: profile.user.email,
        avatar_url: profile.user.avatar_url,
        
        // Professional info
        title: profile.title,
        licenseNumber: profile.licenseNumber,
        licenseIssuingBody: profile.licenseIssuingBody,
        licenseExpiryDate: profile.licenseExpiryDate,
        registrationNumber: profile.registrationNumber,
        primarySpecialization: profile.primarySpecialization,
        educationQualification: profile.educationQualification,
        yearsOfExperience: profile.yearsOfExperience,
        
        // Clinic info
        registrationType: isClinicStaff ? 'clinic-staff' : 'independent',
        clinicName: isClinicStaff ? (clinicInfo?.brandName || clinicInfo?.legalName) : profile.clinicName,
        clinicId: isClinicStaff ? clinicInfo?.id?.toString() : null,
        clinicAddress: isClinicStaff ? branchInfo?.city : null,
        
        // Practice info
        consultationTypes: profile.consultationTypes || [],
        servicesOffered: profile.servicesOffered || [],
        consultationFee: profile.consultationFee,
        acceptsInsurance: profile.acceptsInsurance,
        acceptsBpjs: profile.acceptsBpjs,
        emergencyAvailability: profile.emergencyAvailability,
        
        // Verification info
        isVerified: profile.isVerified,
        verificationDate: profile.verificationDate,
        
        // System info
        createdAt: profile.createdAt,
        status: profile.isVerified ? 'verified' : 'pending'
      };
    });

    // Filter by type after data transformation (since it depends on clinic staff relationship)
    let filteredDentists = dentists;
    if (type === 'independent') {
      filteredDentists = dentists.filter(d => d.registrationType === 'independent');
    } else if (type === 'clinic-staff') {
      filteredDentists = dentists.filter(d => d.registrationType === 'clinic-staff');
    }

    // Calculate stats
    const allDentistProfiles = await prisma.dentistProfile.findMany({
      include: {
        user: {
          select: {
            clinicStaff: true
          }
        }
      }
    });

    const stats = {
      totalDentists: allDentistProfiles.length,
      pendingVerification: allDentistProfiles.filter(p => !p.isVerified).length,
      verifiedDentists: allDentistProfiles.filter(p => p.isVerified).length,
      independentDentists: allDentistProfiles.filter(p => !p.user.clinicStaff).length,
      clinicDentists: allDentistProfiles.filter(p => !!p.user.clinicStaff).length,
    };

    res.json({
      success: true,
      data: filteredDentists,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / parseInt(limit))
      },
      stats
    });

  } catch (error) {
    console.error('Error fetching dentists:', error);
    res.status(500).json({ error: 'Failed to fetch dentists' });
  }
});

// Get pending dentists for verification queue
router.get('/dentists/pending', authenticateToken, requireRoles(['super_admin', 'customer_success_manager']), async (req, res) => {
  try {
    console.log('🦷 Fetching pending dentists for verification...');
    
    const { type = 'all' } = req.query;

    // Get unverified dentist profiles
    const pendingProfiles = await prisma.dentistProfile.findMany({
      where: { isVerified: false },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar_url: true,
            createdAt: true,
            clinicStaff: {
              include: {
                clinicProfile: {
                  select: {
                    id: true,
                    legalName: true,
                    brandName: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' } // Oldest first for FIFO processing
    });

    // Transform data
    const pendingDentists = pendingProfiles.map(profile => {
      const isClinicStaff = !!profile.user.clinicStaff;
      const clinicInfo = profile.user.clinicStaff?.clinicProfile;
      
      return {
        id: profile.id.toString(),
        userId: profile.user.id.toString(),
        name: profile.user.name,
        email: profile.user.email,
        avatar_url: profile.user.avatar_url,
        
        // Professional info
        title: profile.title,
        licenseNumber: profile.licenseNumber,
        licenseIssuingBody: profile.licenseIssuingBody,
        licenseExpiryDate: profile.licenseExpiryDate,
        registrationNumber: profile.registrationNumber,
        primarySpecialization: profile.primarySpecialization,
        educationQualification: profile.educationQualification,
        yearsOfExperience: profile.yearsOfExperience,
        
        // Clinic info
        registrationType: isClinicStaff ? 'clinic-staff' : 'independent',
        clinicName: isClinicStaff ? (clinicInfo?.brandName || clinicInfo?.legalName) : profile.clinicName,
        clinicId: isClinicStaff ? clinicInfo?.id?.toString() : null,
        clinicAddress: profile.clinicAddress,
        clinicWorkingHours: profile.clinicWorkingHours,
        
        // Practice info
        consultationTypes: profile.consultationTypes || [],
        servicesOffered: profile.servicesOffered || [],
        consultationFee: profile.consultationFee,
        acceptsInsurance: profile.acceptsInsurance,
        acceptsBpjs: profile.acceptsBpjs,
        emergencyAvailability: profile.emergencyAvailability,
        
        // Documents
        documents: {
          sipFile: profile.sipFilePath,
          strFile: profile.strFilePath,
          ijazahFiles: profile.ijazahFilePaths || [],
          certificationFiles: profile.certificationFilePaths || []
        },
        
        // System info
        submittedAt: profile.createdAt,
        createdAt: profile.createdAt
      };
    });

    // Filter by type if specified
    let filteredDentists = pendingDentists;
    if (type === 'independent') {
      filteredDentists = pendingDentists.filter(d => d.registrationType === 'independent');
    } else if (type === 'clinic-staff') {
      filteredDentists = pendingDentists.filter(d => d.registrationType === 'clinic-staff');
    }

    res.json({
      success: true,
      data: filteredDentists,
      stats: {
        totalPending: pendingDentists.length,
        independentPending: pendingDentists.filter(d => d.registrationType === 'independent').length,
        clinicStaffPending: pendingDentists.filter(d => d.registrationType === 'clinic-staff').length
      }
    });

  } catch (error) {
    console.error('Error fetching pending dentists:', error);
    res.status(500).json({ error: 'Failed to fetch pending dentists' });
  }
});

// Verify/Approve dentist
router.post('/dentists/:dentistId/verify', authenticateToken, requireRoles(['super_admin', 'customer_success_manager']), async (req, res) => {
  try {
    const { dentistId } = req.params;
    const { action, rejectionReason } = req.body; // action: 'approve' or 'reject'
    const adminUser = req.user;

    console.log(`🦷 Processing verification for dentist ${dentistId}:`, { action, rejectionReason });

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Use "approve" or "reject"' });
    }

    if (action === 'reject' && !rejectionReason) {
      return res.status(400).json({ error: 'Rejection reason is required when rejecting a dentist' });
    }

    // Get dentist profile
    const dentistProfile = await prisma.dentistProfile.findUnique({
      where: { id: BigInt(dentistId) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!dentistProfile) {
      return res.status(404).json({ error: 'Dentist profile not found' });
    }

    if (dentistProfile.isVerified) {
      return res.status(400).json({ error: 'Dentist is already verified' });
    }

    // Start transaction
    await prisma.$transaction(async (tx) => {
      if (action === 'approve') {
        // Approve the dentist
        await tx.dentistProfile.update({
          where: { id: BigInt(dentistId) },
          data: {
            isVerified: true,
            verificationDate: new Date()
          }
        });

        console.log(`✅ Dentist ${dentistProfile.user.name} approved successfully`);
      } else {
        // For now, we'll just mark as rejected by setting a note
        // In a full implementation, you might want a separate rejections table
        await tx.dentistProfile.update({
          where: { id: BigInt(dentistId) },
          data: {
            isVerified: false,
            // You could add a rejectionReason field to the schema
          }
        });

        console.log(`❌ Dentist ${dentistProfile.user.name} rejected: ${rejectionReason}`);
      }
    });

    res.json({
      success: true,
      message: `Dentist ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      data: {
        dentistId,
        action,
        rejectionReason: action === 'reject' ? rejectionReason : null,
        processedBy: adminUser.id,
        processedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Error processing dentist verification:', error);
    res.status(500).json({ error: 'Failed to process verification' });
  }
});

// Get dentist details by ID
router.get('/dentists/:dentistId', authenticateToken, requireRoles(['super_admin', 'customer_success_manager']), async (req, res) => {
  try {
    const { dentistId } = req.params;

    const dentistProfile = await prisma.dentistProfile.findUnique({
      where: { id: BigInt(dentistId) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar_url: true,
            phone_number: true,
            createdAt: true,
            lastLoginAt: true,
            clinicStaff: {
              include: {
                clinicProfile: {
                  select: {
                    id: true,
                    legalName: true,
                    brandName: true,
                    city: true,
                    province: true
                  }
                },
                assignedBranch: {
                  select: {
                    id: true,
                    branchName: true,
                    city: true,
                    province: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!dentistProfile) {
      return res.status(404).json({ error: 'Dentist profile not found' });
    }

    const isClinicStaff = !!dentistProfile.user.clinicStaff;
    const clinicInfo = dentistProfile.user.clinicStaff?.clinicProfile;
    const branchInfo = dentistProfile.user.clinicStaff?.assignedBranch;

    const dentistDetails = {
      id: dentistProfile.id.toString(),
      userId: dentistProfile.user.id.toString(),
      
      // Personal info
      name: dentistProfile.user.name,
      email: dentistProfile.user.email,
      phone: dentistProfile.user.phone_number,
      avatar_url: dentistProfile.user.avatar_url,
      
      // Professional info
      title: dentistProfile.title,
      licenseNumber: dentistProfile.licenseNumber,
      licenseIssuingBody: dentistProfile.licenseIssuingBody,
      licenseExpiryDate: dentistProfile.licenseExpiryDate,
      registrationNumber: dentistProfile.registrationNumber,
      primarySpecialization: dentistProfile.primarySpecialization,
      educationQualification: dentistProfile.educationQualification,
      yearsOfExperience: dentistProfile.yearsOfExperience,
      
      // Clinic/Practice info
      registrationType: isClinicStaff ? 'clinic-staff' : 'independent',
      clinicName: isClinicStaff ? (clinicInfo?.brandName || clinicInfo?.legalName) : dentistProfile.clinicName,
      clinicId: isClinicStaff ? clinicInfo?.id?.toString() : null,
      clinicAddress: isClinicStaff 
        ? `${branchInfo?.city || clinicInfo?.city}, ${branchInfo?.province || clinicInfo?.province}`
        : dentistProfile.clinicAddress,
      clinicWorkingHours: dentistProfile.clinicWorkingHours,
      
      // Services
      consultationTypes: dentistProfile.consultationTypes || [],
      servicesOffered: dentistProfile.servicesOffered || [],
      consultationFee: dentistProfile.consultationFee,
      acceptsInsurance: dentistProfile.acceptsInsurance,
      acceptsBpjs: dentistProfile.acceptsBpjs,
      emergencyAvailability: dentistProfile.emergencyAvailability,
      
      // Documents
      documents: {
        sipFile: dentistProfile.sipFilePath,
        strFile: dentistProfile.strFilePath,
        ijazahFiles: dentistProfile.ijazahFilePaths || [],
        certificationFiles: dentistProfile.certificationFilePaths || []
      },
      
      // Verification info
      isVerified: dentistProfile.isVerified,
      verificationDate: dentistProfile.verificationDate,
      
      // System info
      createdAt: dentistProfile.createdAt,
      updatedAt: dentistProfile.updatedAt,
      lastLogin: dentistProfile.user.lastLoginAt
    };

    res.json({
      success: true,
      data: dentistDetails
    });

  } catch (error) {
    console.error('Error fetching dentist details:', error);
    res.status(500).json({ error: 'Failed to fetch dentist details' });
  }
});

export default router;