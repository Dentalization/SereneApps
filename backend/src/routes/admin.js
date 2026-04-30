import express from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRoles } from '../utils/tokens.js';
import communicationsDiagnosticsRouter from './admin/communicationsDiagnostics.js';

const router = express.Router();
const prisma = new PrismaClient();

router.use('/communications', communicationsDiagnosticsRouter);

// Get all dentists (admin only) - combines users with dentist role and dentist profiles
router.get('/dentists', authenticateToken, requireRoles(['admin', 'super_admin']), async (req, res) => {
  try {
    console.log('🔍 Admin API: Fetching dentists');
    
    const { status, type, search, limit = '1000' } = req.query;
    
    // Build where clause for filtering
    const whereClause = {
      roles: {
        has: 'dentist'
      }
    };
    
    // Add search filter if provided
    if (search && search.trim()) {
      whereClause.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { email: { contains: search.trim(), mode: 'insensitive' } },
        {
          dentistProfile: {
            some: {
              licenseNumber: { contains: search.trim(), mode: 'insensitive' }
            }
          }
        }
      ];
    }

    // Get all dentist users with their profiles
    const dentistUsers = await prisma.user.findMany({
      where: whereClause,
      include: {
        dentistProfile: true,
        clinicStaff: {
          include: {
            clinicProfile: {
              select: {
                legalName: true,
                brandName: true
              }
            }
          }
        }
      },
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' }
    });

    console.log('👥 Found dentist users:', dentistUsers.length);

    // Transform the data to match frontend expectations
    const dentists = dentistUsers.map(user => {
      const profile = user.dentistProfile?.[0]; // Get first dentist profile
      const clinicStaff = user.clinicStaff;
      
      // Determine registration type
      let registrationType = 'independent';
      let clinicName = null;
      let clinicId = null;
      
      if (clinicStaff) {
        registrationType = 'clinic-staff';
        clinicName = clinicStaff.clinicProfile?.brandName || clinicStaff.clinicProfile?.legalName;
        clinicId = clinicStaff.clinicProfileId?.toString();
      }

      return {
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        avatar_url: user.avatar_url,
        registrationType,
        clinicName,
        clinicId,
        isVerified: profile?.isVerified || false,
        verificationDate: profile?.verificationDate?.toISOString(),
        createdAt: user.createdAt.toISOString(),
        
        // Professional details from dentist profile
        licenseNumber: profile?.licenseNumber || 'N/A',
        primarySpecialization: profile?.primarySpecialization || 'General Dentistry',
        yearsOfExperience: profile?.yearsOfExperience || 0,
        title: profile?.title || 'Dr.',
        educationQualification: profile?.educationQualification || '',
        licenseIssuingBody: profile?.licenseIssuingBody || '',
        licenseExpiryDate: profile?.licenseExpiryDate?.toISOString(),
        registrationNumber: profile?.registrationNumber || '',
        
        // Clinic/practice details
        clinicAddress: profile?.clinicAddress || '',
        clinicWorkingHours: profile?.clinicWorkingHours || {},
        consultationTypes: profile?.consultationTypes || [],
        servicesOffered: profile?.servicesOffered || [],
        consultationFee: profile?.consultationFee || 0,
        acceptsInsurance: profile?.acceptsInsurance || false,
        acceptsBPJS: profile?.acceptsBpjs || false,
        emergencyAvailability: profile?.emergencyAvailability || false,
        
        // Add file paths directly to the main object for easier access
        sipFilePath: profile?.sipFilePath,
        strFilePath: profile?.strFilePath,
        ijazahFilePaths: profile?.ijazahFilePaths || [],
        certificationFilePaths: profile?.certificationFilePaths || [],
        
        // Document paths (alternative structure)
        documents: {
          sipFile: profile?.sipFilePath,
          strFile: profile?.strFilePath,
          ijazahFiles: profile?.ijazahFilePaths || [],
          certificationFiles: profile?.certificationFilePaths || []
        },
        
        // Submission info
        submittedAt: user.createdAt.toISOString()
      };
    });

    // Apply additional filters
    let filteredDentists = dentists;
    
    if (status && status !== 'all') {
      if (status === 'verified') {
        filteredDentists = filteredDentists.filter(d => d.isVerified);
      } else if (status === 'pending') {
        filteredDentists = filteredDentists.filter(d => !d.isVerified);
      }
    }
    
    if (type && type !== 'all') {
      filteredDentists = filteredDentists.filter(d => d.registrationType === type);
    }

    // Calculate stats
    const stats = {
      totalDentists: dentists.length,
      pendingVerification: dentists.filter(d => !d.isVerified).length,
      independentDentists: dentists.filter(d => d.registrationType === 'independent').length,
      clinicDentists: dentists.filter(d => d.registrationType === 'clinic-staff').length,
      verifiedDentists: dentists.filter(d => d.isVerified).length
    };

    console.log('📊 Dentist stats:', stats);

    res.json({
      success: true,
      data: filteredDentists,
      stats,
      total: filteredDentists.length
    });

  } catch (error) {
    console.error('Error fetching dentists:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch dentists' 
    });
  }
});

// Get pending dentists for verification queue
router.get('/dentists/pending', authenticateToken, requireRoles(['admin', 'super_admin']), async (req, res) => {
  try {
    console.log('🔍 Admin API: Fetching pending dentists');
    
    const { type } = req.query;
    
    // Get all unverified dentist users
    const pendingDentists = await prisma.user.findMany({
      where: {
        roles: {
          has: 'dentist'
        },
        dentistProfile: {
          some: {
            isVerified: false
          }
        }
      },
      include: {
        dentistProfile: true,
        clinicStaff: {
          include: {
            clinicProfile: {
              select: {
                legalName: true,
                brandName: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' } // Oldest first for queue
    });

    console.log('⏳ Found pending dentists:', pendingDentists.length);

    // Transform data similar to the main dentists endpoint
    const dentists = pendingDentists.map(user => {
      const profile = user.dentistProfile?.[0];
      const clinicStaff = user.clinicStaff;
      
      let registrationType = 'independent';
      let clinicName = null;
      let clinicId = null;
      
      if (clinicStaff) {
        registrationType = 'clinic-staff';
        clinicName = clinicStaff.clinicProfile?.brandName || clinicStaff.clinicProfile?.legalName;
        clinicId = clinicStaff.clinicProfileId?.toString();
      }

      return {
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        avatar_url: user.avatar_url,
        registrationType,
        clinicName,
        clinicId,
        
        // Professional details
        licenseNumber: profile?.licenseNumber || 'N/A',
        primarySpecialization: profile?.primarySpecialization || 'General Dentistry',
        yearsOfExperience: profile?.yearsOfExperience || 0,
        title: profile?.title || 'Dr.',
        educationQualification: profile?.educationQualification || '',
        licenseIssuingBody: profile?.licenseIssuingBody || '',
        licenseExpiryDate: profile?.licenseExpiryDate?.toISOString(),
        registrationNumber: profile?.registrationNumber || '',
        
        // Documents
        documents: {
          sipFile: profile?.sipFilePath,
          strFile: profile?.strFilePath,
          ijazahFiles: profile?.ijazahFilePaths || [],
          certificationFiles: profile?.certificationFilePaths || []
        },
        
        submittedAt: user.createdAt.toISOString()
      };
    });

    // Apply type filter if specified
    let filteredDentists = dentists;
    if (type && type !== 'all') {
      filteredDentists = filteredDentists.filter(d => d.registrationType === type);
    }

    res.json({
      success: true,
      data: filteredDentists,
      total: filteredDentists.length
    });

  } catch (error) {
    console.error('Error fetching pending dentists:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch pending dentists' 
    });
  }
});

// Approve or reject dentist verification
router.post('/dentists/:dentistId/verify', authenticateToken, requireRoles(['admin', 'super_admin']), async (req, res) => {
  try {
    const { dentistId } = req.params;
    const { action, rejectionReason } = req.body; // action: 'approve' or 'reject'
    
    console.log('🔄 Admin API: Processing dentist verification:', { dentistId, action });
    
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Must be "approve" or "reject"'
      });
    }
    
    if (action === 'reject' && !rejectionReason?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Rejection reason is required when rejecting'
      });
    }

    // Find the dentist user
    const dentistUser = await prisma.user.findUnique({
      where: { id: BigInt(dentistId) },
      include: { dentistProfile: true }
    });

    if (!dentistUser || !dentistUser.roles.includes('dentist')) {
      return res.status(404).json({
        success: false,
        error: 'Dentist not found'
      });
    }

    const dentistProfile = dentistUser.dentistProfile?.[0];
    if (!dentistProfile) {
      return res.status(404).json({
        success: false,
        error: 'Dentist profile not found'
      });
    }

    // Update verification status
    if (action === 'approve') {
      await prisma.dentistProfile.update({
        where: { id: dentistProfile.id },
        data: {
          isVerified: true,
          verificationDate: new Date(),
          verificationNotes: 'Approved by admin'
        }
      });
      
      console.log('✅ Dentist approved:', dentistUser.name);
    } else {
      await prisma.dentistProfile.update({
        where: { id: dentistProfile.id },
        data: {
          isVerified: false,
          verificationDate: null,
          verificationNotes: rejectionReason
        }
      });
      
      console.log('❌ Dentist rejected:', dentistUser.name);
    }

    res.json({
      success: true,
      message: `Dentist ${action}d successfully`,
      data: {
        dentistId,
        action,
        rejectionReason: action === 'reject' ? rejectionReason : null
      }
    });

  } catch (error) {
    console.error('Error processing dentist verification:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to process verification' 
    });
  }
});

// Get verified dentists for professional network
router.get('/dentists/verified', authenticateToken, requireRoles(['admin', 'super_admin']), async (req, res) => {
  try {
    console.log('🔍 Admin API: Fetching verified dentists - START');
    
    const { search, specialization, location } = req.query;
    
    // Build where clause
    const whereClause = {
      roles: {
        has: 'dentist'
      }
    };

    // Get verified dentist users
    const verifiedDentists = await prisma.user.findMany({
      where: whereClause,
      include: {
        dentistProfile: true,
        clinicStaff: {
          include: {
            clinicProfile: {
              select: {
                legalName: true,
                brandName: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('✅ Found verified dentists:', verifiedDentists.length);
    console.log('🔍 Processing dentists...');

    // Filter only verified dentists and transform data
    const dentists = verifiedDentists
      .filter(user => {
        const profile = user.dentistProfile?.[0];
        return profile?.isVerified === true;
      })
      .map(user => {
        const profile = user.dentistProfile?.[0];
        const clinicStaff = user.clinicStaff?.[0];
        
        let registrationType = 'independent';
        let clinicName = null;
      
        if (clinicStaff) {
          registrationType = 'clinic-staff';
          clinicName = clinicStaff.clinicProfile?.brandName || clinicStaff.clinicProfile?.legalName;
        }

        // Extract location from clinic address (simplified)
        const location = profile?.clinicAddress?.includes('Jakarta') ? 'Jakarta' :
                        profile?.clinicAddress?.includes('Surabaya') ? 'Surabaya' :
                        profile?.clinicAddress?.includes('Bandung') ? 'Bandung' :
                        profile?.clinicAddress?.includes('Medan') ? 'Medan' :
                        'Jakarta'; // Default fallback

        return {
          id: user.id.toString(),
          name: user.name || 'Unknown',
          email: user.email || 'N/A',
          avatar_url: user.avatar_url,
          registrationType,
          clinicName,
          isVerified: true,
          verificationDate: profile?.verificationDate?.toISOString() || new Date().toISOString(),
          
          // Professional details
          licenseNumber: profile?.licenseNumber || 'N/A',
          primarySpecialization: profile?.primarySpecialization || 'General Dentistry',
          yearsOfExperience: profile?.yearsOfExperience || 5,
          location,
          
          // Professional network metrics (mock data for now)
          rating: 4.5 + Math.random() * 0.5, // Random between 4.5-5.0
          totalReviews: Math.floor(Math.random() * 200) + 50,
          patientsServed: Math.floor(Math.random() * 500) + 200,
          networkConnections: Math.floor(Math.random() * 80) + 20,
          referralsMade: Math.floor(Math.random() * 50) + 10,
          referralsReceived: Math.floor(Math.random() * 40) + 5,
          
          // Practice details
          consultationFee: profile?.consultationFee || 200000,
          acceptsInsurance: profile?.acceptsInsurance || false,
          acceptsBPJS: profile?.acceptsBpjs || false,
          emergencyAvailability: profile?.emergencyAvailability || false
        };
      });

    // Apply filters
    let filteredDentists = dentists;
    
    if (search?.trim()) {
      const searchLower = search.toLowerCase();
      filteredDentists = filteredDentists.filter(d => 
        d.name.toLowerCase().includes(searchLower) ||
        d.email.toLowerCase().includes(searchLower) ||
        d.primarySpecialization.toLowerCase().includes(searchLower) ||
        d.location.toLowerCase().includes(searchLower)
      );
    }
    
    if (specialization && specialization !== 'all') {
      filteredDentists = filteredDentists.filter(d => d.primarySpecialization === specialization);
    }
    
    if (location && location !== 'all') {
      filteredDentists = filteredDentists.filter(d => d.location === location);
    }

    // Calculate network stats
    const specializations = {};
    const locations = {};
    
    filteredDentists.forEach(dentist => {
      // Count specializations
      if (specializations[dentist.primarySpecialization]) {
        specializations[dentist.primarySpecialization]++;
      } else {
        specializations[dentist.primarySpecialization] = 1;
      }
      
      // Count locations
      if (locations[dentist.location]) {
        locations[dentist.location]++;
      } else {
        locations[dentist.location] = 1;
      }
    });

    // Calculate recent joins (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentJoins = filteredDentists.filter(d => 
      new Date(d.verificationDate) >= thirtyDaysAgo
    ).length;

    const networkStats = {
      totalVerified: filteredDentists.length,
      bySpecialization: specializations,
      byLocation: locations,
      recentJoins
    };

    console.log('✅ Returning verified dentists:', filteredDentists.length);
    
    res.json({
      success: true,
      data: filteredDentists,
      networkStats,
      total: filteredDentists.length
    });

  } catch (error) {
    console.error('Error fetching verified dentists:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch verified dentists',
      details: error.message 
    });
  }
});

// Get document file for a dentist by type
// Middleware to check token from query parameter or header
const authenticateTokenFlexible = (req, res, next) => {
  let token = null;
  
  // First check Authorization header
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }
  
  // If no header token, check query parameter
  if (!token && req.query.token) {
    token = req.query.token;
  }
  
  console.log('🔍 Token check - Header:', !!authHeader, 'Query:', !!req.query.token, 'Token found:', !!token);
  
  if (!token) {
    console.log('❌ No token found in header or query');
    return res.status(401).json({ error: 'Access token required' });
  }
  
  try {
    console.log('🔑 Verifying token:', token.substring(0, 20) + '...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.sub, roles: decoded.roles || [] };
    console.log('✅ Token verified for user:', req.user.id, 'roles:', req.user.roles);
    next();
  } catch (error) {
    console.error('❌ Token verification failed:', error.message);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

router.get('/dentists/:userId/documents/:docType', authenticateTokenFlexible, requireRoles(['admin', 'super_admin']), async (req, res) => {
  try {
    const { userId, docType } = req.params;
    const fs = await import('fs');
    const path = await import('path');
    
    console.log('🔍 Admin API: Searching for document:', { userId, docType });
    
    // Map document types to folder names
    const docTypeMap = {
      'sip': 'sip',
      'str': 'str', 
      'ijazah': 'ijazah',
      'education': 'ijazah',
      'certification': 'certification',
      'certificate': 'certification'
    };
    
    const folderName = docTypeMap[docType.toLowerCase()];
    if (!folderName) {
      return res.status(400).json({
        success: false,
        error: 'Invalid document type'
      });
    }
    
    const documentsDir = path.default.join(process.cwd(), 'uploads', 'documents', folderName);
    
    // Check if directory exists
    if (!fs.default.existsSync(documentsDir)) {
      return res.status(404).json({
        success: false,
        error: 'Document directory not found'
      });
    }
    
    // Find any PDF file in the directory (for now, return the first one found)
    const files = fs.default.readdirSync(documentsDir).filter(file => file.endsWith('.pdf'));
    
    if (files.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No documents found for this type'
      });
    }
    
    // For now, return the first PDF found
    // In production, you'd want to match by userId or other criteria
    const filePath = path.default.join(documentsDir, files[0]);
    const fileName = files[0];
    
    console.log('✅ Found document:', fileName);
    
    // Set appropriate headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    
    // Stream the file
    const fileStream = fs.default.createReadStream(filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('Error serving document:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to serve document' 
    });
  }
});

export default router;
