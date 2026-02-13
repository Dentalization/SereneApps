// Clinic Staff Service
// Manages staff authentication and authorization for single-clinic model

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Get user's clinic staff information
 * Returns null if user is not a clinic staff
 */
export async function getUserClinicStaff(userId) {
  try {
    const clinicStaff = await prisma.clinicStaff.findUnique({
      where: { userId: BigInt(userId) },
      include: {
        clinicProfile: {
          select: {
            id: true,
            legalName: true,
            brandName: true,
            status: true
          }
        },
        assignedBranch: {
          select: {
            id: true,
            branchName: true,
            branchCode: true
          }
        }
      }
    });

    return clinicStaff;
  } catch (error) {
    console.error('Error getting clinic staff:', error);
    return null;
  }
}

/**
 * Check if user has specific role at any clinic
 */
export async function hasClinicRole(userId, requiredRoles) {
  try {
    const clinicStaff = await getUserClinicStaff(userId);
    
    if (!clinicStaff || !clinicStaff.isActive) {
      return false;
    }
    
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    return roles.includes(clinicStaff.role);
  } catch (error) {
    console.error('Error checking clinic role:', error);
    return false;
  }
}

/**
 * Get effective user roles (combines User.roles + ClinicStaff.role)
 */
export async function getUserEffectiveRoles(userId) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: BigInt(userId) },
      select: { roles: true }
    });

    if (!user) return [];

    const baseRoles = user.roles || [];
    const clinicStaff = await getUserClinicStaff(userId);
    
    if (clinicStaff && clinicStaff.isActive) {
      return [...baseRoles, clinicStaff.role];
    }
    
    return baseRoles;
  } catch (error) {
    console.error('Error getting effective roles:', error);
    return [];
  }
}

/**
 * Check if user can access clinic data
 * Only staff of that clinic can access its data
 */
export async function canAccessClinicData(userId, clinicProfileId) {
  try {
    const clinicStaff = await getUserClinicStaff(userId);
    
    if (!clinicStaff || !clinicStaff.isActive) {
      return false;
    }
    
    return clinicStaff.clinicProfileId === BigInt(clinicProfileId);
  } catch (error) {
    console.error('Error checking clinic access:', error);
    return false;
  }
}

/**
 * Create clinic staff assignment
 * This ensures one user can only work at one clinic
 */
export async function assignUserToClinic(userId, clinicProfileId, role, details = {}) {
  try {
    // Check if user is already assigned to a clinic
    const existingStaff = await getUserClinicStaff(userId);
    
    if (existingStaff) {
      throw new Error(`User is already assigned to clinic: ${existingStaff.clinicProfile.legalName}`);
    }
    
    const clinicStaff = await prisma.clinicStaff.create({
      data: {
        userId: BigInt(userId),
        clinicProfileId: BigInt(clinicProfileId),
        role,
        isActive: true,
        hireDate: details.hireDate || new Date(),
        positionTitle: details.positionTitle,
        department: details.department,
        assignedBranchId: details.assignedBranchId ? BigInt(details.assignedBranchId) : null,
        permissions: details.permissions || {}
      },
      include: {
        clinicProfile: {
          select: {
            legalName: true,
            brandName: true
          }
        }
      }
    });

    return clinicStaff;
  } catch (error) {
    console.error('Error assigning user to clinic:', error);
    throw error;
  }
}

/**
 * Remove user from clinic (terminate employment)
 */
export async function removeUserFromClinic(userId) {
  try {
    const clinicStaff = await prisma.clinicStaff.delete({
      where: { userId: BigInt(userId) }
    });
    
    return clinicStaff;
  } catch (error) {
    console.error('Error removing user from clinic:', error);
    throw error;
  }
}

/**
 * Get all staff members for a clinic
 */
export async function getClinicStaffMembers(clinicProfileId) {
  try {
    const staffMembers = await prisma.clinicStaff.findMany({
      where: { 
        clinicProfileId: BigInt(clinicProfileId)
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            roles: true,
            createdAt: true,
            lastLoginAt: true
          }
        },
        assignedBranch: {
          select: {
            id: true,
            branchName: true,
            branchCode: true
          }
        }
      },
      orderBy: [
        { isActive: 'desc' },
        { hireDate: 'desc' }
      ]
    });

    // Transform data for frontend
    return staffMembers.map(staff => ({
      id: staff.user.id.toString(),
      name: staff.user.name,
      email: staff.user.email,
      avatarUrl: staff.user.avatarUrl,
      role: staff.role,
      status: staff.isActive ? 'active' : 'inactive',
      hireDate: staff.hireDate,
      positionTitle: staff.positionTitle,
      department: staff.department,
      permissions: staff.permissions,
      branch: staff.assignedBranch,
      lastLoginAt: staff.user.lastLoginAt,
      createdAt: staff.user.createdAt
    }));
  } catch (error) {
    console.error('Error getting clinic staff members:', error);
    throw error;
  }
}

/**
 * Update staff member role and status
 */
export async function updateStaffMember(userId, clinicProfileId, updates) {
  try {
    // Verify staff belongs to this clinic
    const existingStaff = await prisma.clinicStaff.findFirst({
      where: {
        userId: BigInt(userId),
        clinicProfileId: BigInt(clinicProfileId)
      }
    });

    if (!existingStaff) {
      throw new Error('Staff member not found in this clinic');
    }

    // Prepare update data
    const updateData = {};
    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.status !== undefined) updateData.isActive = updates.status === 'active';
    if (updates.positionTitle !== undefined) updateData.positionTitle = updates.positionTitle;
    if (updates.department !== undefined) updateData.department = updates.department;
    if (updates.permissions !== undefined) updateData.permissions = updates.permissions;
    if (updates.assignedBranchId !== undefined) {
      updateData.assignedBranchId = updates.assignedBranchId ? BigInt(updates.assignedBranchId) : null;
    }

    const updatedStaff = await prisma.clinicStaff.update({
      where: { userId: BigInt(userId) },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            roles: true,
            lastLoginAt: true
          }
        },
        assignedBranch: {
          select: {
            id: true,
            branchName: true,
            branchCode: true
          }
        }
      }
    });

    // Transform for frontend
    return {
      id: updatedStaff.user.id.toString(),
      name: updatedStaff.user.name,
      email: updatedStaff.user.email,
      avatarUrl: updatedStaff.user.avatarUrl,
      role: updatedStaff.role,
      status: updatedStaff.isActive ? 'active' : 'inactive',
      hireDate: updatedStaff.hireDate,
      positionTitle: updatedStaff.positionTitle,
      department: updatedStaff.department,
      permissions: updatedStaff.permissions,
      branch: updatedStaff.assignedBranch,
      lastLoginAt: updatedStaff.user.lastLoginAt
    };
  } catch (error) {
    console.error('Error updating staff member:', error);
    throw error;
  }
}

/**
 * Remove staff member from clinic (with proper cleanup)
 */
export async function removeStaffMember(userId, clinicProfileId, removedByUserId) {
  try {
    // Verify staff belongs to this clinic
    const existingStaff = await prisma.clinicStaff.findFirst({
      where: {
        userId: BigInt(userId),
        clinicProfileId: BigInt(clinicProfileId)
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    if (!existingStaff) {
      throw new Error('Staff member not found in this clinic');
    }

    // Check if trying to remove owner
    if (existingStaff.role === 'owner') {
      throw new Error('Cannot remove clinic owner');
    }

    // Remove from clinic_staff table
    await prisma.clinicStaff.delete({
      where: { userId: BigInt(userId) }
    });

    // Log the removal for audit trail
    console.log(`Staff member removed: ${existingStaff.user.name} (${existingStaff.user.email}) from clinic ${clinicProfileId} by user ${removedByUserId}`);

    return {
      success: true,
      removedStaff: {
        name: existingStaff.user.name,
        email: existingStaff.user.email,
        role: existingStaff.role
      }
    };
  } catch (error) {
    console.error('Error removing staff member:', error);
    throw error;
  }
}

/**
 * Get staff member profile details
 */
export async function getStaffMemberProfile(userId, clinicProfileId) {
  try {
    const staff = await prisma.clinicStaff.findFirst({
      where: {
        userId: BigInt(userId),
        clinicProfileId: BigInt(clinicProfileId)
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
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
            address: true
          }
        }
      }
    });

    if (!staff) {
      throw new Error('Staff member not found');
    }

    return {
      id: staff.user.id.toString(),
      name: staff.user.name,
      email: staff.user.email,
      avatarUrl: staff.user.avatarUrl,
      role: staff.role,
      status: staff.isActive ? 'active' : 'inactive',
      hireDate: staff.hireDate,
      positionTitle: staff.positionTitle,
      department: staff.department,
      permissions: staff.permissions,
      branch: staff.assignedBranch,
      lastLoginAt: staff.user.lastLoginAt,
      createdAt: staff.user.createdAt,
      profileDetails: {
        joinedAt: staff.hireDate,
        userRoles: staff.user.roles,
        accountCreated: staff.user.createdAt
      }
    };
  } catch (error) {
    console.error('Error getting staff member profile:', error);
    throw error;
  }
}

export default {
  getUserClinicStaff,
  hasClinicRole,
  getUserEffectiveRoles,
  canAccessClinicData,
  assignUserToClinic,
  removeUserFromClinic,
  getClinicStaffMembers,
  updateStaffMember,
  removeStaffMember,
  getStaffMemberProfile
};