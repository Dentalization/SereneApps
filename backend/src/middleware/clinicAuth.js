// Enhanced authentication middleware for clinic staff system
import jwt from 'jsonwebtoken';
import { PrismaClient } from '../generated/prisma/index.js';
import { getUserEffectiveRoles, canAccessClinicData } from '../services/clinicStaffService.js';

const prisma = new PrismaClient();

/**
 * Enhanced auth middleware yang support clinic staff roles
 */
export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: BigInt(decoded.userId) },
      include: {
        clinicStaff: {
          include: {
            clinicProfile: {
              select: {
                id: true,
                legalName: true,
                brandName: true,
                status: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get effective roles (User.roles + ClinicStaff.role)
    const effectiveRoles = await getUserEffectiveRoles(user.id);
    
    // Attach user info to request
    req.user = {
      ...user,
      effectiveRoles,
      clinicStaff: user.clinicStaff || null
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Role-based authorization middleware
 * Supports both User.roles and ClinicStaff.role
 */
export const requireRoles = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRoles = req.user.effectiveRoles || [];
    const hasRequiredRole = allowedRoles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: userRoles
      });
    }

    next();
  };
};

/**
 * Clinic access middleware
 * Ensures user can only access their assigned clinic data
 */
export const requireClinicAccess = (req, res, next) => {
  if (!req.user?.clinicStaff) {
    return res.status(403).json({ error: 'Clinic staff access required' });
  }

  if (!req.user.clinicStaff.isActive) {
    return res.status(403).json({ error: 'Inactive clinic staff' });
  }

  // Attach clinic info to request for easy access
  req.clinic = {
    id: req.user.clinicStaff.clinicProfileId,
    profile: req.user.clinicStaff.clinicProfile,
    staffRole: req.user.clinicStaff.role,
    permissions: req.user.clinicStaff.permissions
  };

  next();
};

/**
 * Validate clinic data access for specific clinic ID
 */
export const validateClinicDataAccess = async (req, res, next) => {
  const clinicId = req.params.clinicId || req.body.clinicId || req.query.clinicId;
  
  if (!clinicId) {
    return res.status(400).json({ error: 'Clinic ID required' });
  }

  const hasAccess = await canAccessClinicData(req.user.id, clinicId);
  
  if (!hasAccess) {
    return res.status(403).json({ error: 'Access denied to this clinic data' });
  }

  next();
};

/**
 * Admin authentication middleware
 */
export const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: BigInt(decoded.userId) },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar_url: true,
        roles: true,
        profile: {
          select: {
            bio: true,
            avatar_url: true
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Check if user has admin role
    const userRoles = user.roles || [];
    const adminRoles = ['super_admin', 'admin', 'business_manager', 'platform_manager', 'finance_manager', 'customer_success_manager', 'technical_support', 'ai_engineer', 'compliance_officer'];
    
    const hasAdminRole = userRoles.some(role => adminRoles.includes(role));
    
    if (!hasAdminRole) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export default {
  authMiddleware,
  requireRoles,
  requireClinicAccess,
  validateClinicDataAccess,
  authenticateAdmin
};