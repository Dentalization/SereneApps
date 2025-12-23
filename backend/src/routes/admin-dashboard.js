import express from 'express';
import { PrismaClient } from '../generated/prisma/index.js';
import { authenticateToken, requireRoles } from '../utils/tokens.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get dashboard metrics
router.get('/metrics', authenticateToken, requireRoles(['super_admin', 'admin', 'business_manager', 'platform_manager', 'finance_manager', 'customer_success_manager', 'technical_support', 'ai_engineer', 'compliance_officer']), async (req, res) => {
  try {
    console.log('📊 Admin Dashboard: Fetching metrics');

    // Get current date for comparisons
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Parallel fetch all metrics
    const [
      totalClinics,
      activeClinics,
      lastMonthClinics,
      totalDentists,
      verifiedDentists,
      lastMonthDentists,
      totalPatients,
      lastMonthPatients,
      totalAppointments,
      completedAppointments,
      thisMonthAppointments,
      lastMonthAppointments,
      clinicsByStatus,
      dentistsByStatus,
      recentClinics,
      recentDentists,
      recentAppointments
    ] = await Promise.all([
      // Total clinics
      prisma.clinicProfile.count(),
      
      // Active clinics (verified status)
      prisma.clinicProfile.count({
        where: { verificationStatus: 'verified' }
      }),
      
      // Last month clinics
      prisma.clinicProfile.count({
        where: {
          createdAt: {
            gte: firstDayOfLastMonth,
            lte: lastDayOfLastMonth
          }
        }
      }),
      
      // Total dentists
      prisma.user.count({
        where: { roles: { has: 'dentist' } }
      }),
      
      // Verified dentists
      prisma.dentistProfile.count({
        where: { isVerified: true }
      }),
      
      // Last month dentists
      prisma.user.count({
        where: {
          roles: { has: 'dentist' },
          createdAt: {
            gte: firstDayOfLastMonth,
            lte: lastDayOfLastMonth
          }
        }
      }),
      
      // Total patients
      prisma.user.count({
        where: { roles: { has: 'patient' } }
      }),
      
      // Last month patients
      prisma.user.count({
        where: {
          roles: { has: 'patient' },
          createdAt: {
            gte: firstDayOfLastMonth,
            lte: lastDayOfLastMonth
          }
        }
      }),
      
      // Total appointments
      prisma.appointment.count(),
      
      // Completed appointments
      prisma.appointment.count({
        where: { status: 'completed' }
      }),
      
      // This month appointments
      prisma.appointment.count({
        where: {
          createdAt: { gte: firstDayOfMonth }
        }
      }),
      
      // Last month appointments
      prisma.appointment.count({
        where: {
          createdAt: {
            gte: firstDayOfLastMonth,
            lte: lastDayOfLastMonth
          }
        }
      }),
      
      // Clinics by status
      prisma.clinicProfile.groupBy({
        by: ['verificationStatus'],
        _count: true
      }),
      
      // Dentists by verification status
      prisma.dentistProfile.groupBy({
        by: ['isVerified'],
        _count: true
      }),
      
      // Recent 5 clinics
      prisma.clinicProfile.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          brandName: true,
          legalName: true,
          verificationStatus: true,
          createdAt: true,
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      }),
      
      // Recent 5 dentists
      prisma.user.findMany({
        where: { roles: { has: 'dentist' } },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          dentistProfile: {
            select: {
              isVerified: true,
              verificationDate: true,
              primarySpecialization: true
            }
          }
        }
      }),
      
      // Recent 5 appointments
      prisma.appointment.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: {
            select: {
              name: true,
              email: true
            }
          },
          dentistUser: {
            select: {
              name: true
            }
          },
          clinic: {
            select: {
              brandName: true
            }
          }
        }
      })
    ]);

    // Calculate growth percentages
    const clinicGrowth = lastMonthClinics > 0 
      ? ((activeClinics - lastMonthClinics) / lastMonthClinics * 100).toFixed(1)
      : 0;
      
    const dentistGrowth = lastMonthDentists > 0
      ? ((verifiedDentists - lastMonthDentists) / lastMonthDentists * 100).toFixed(1)
      : 0;
      
    const patientGrowth = lastMonthPatients > 0
      ? ((totalPatients - lastMonthPatients) / lastMonthPatients * 100).toFixed(1)
      : 0;
      
    const appointmentGrowth = lastMonthAppointments > 0
      ? ((thisMonthAppointments - lastMonthAppointments) / lastMonthAppointments * 100).toFixed(1)
      : 0;

    // Process clinic status breakdown
    const clinicStatusBreakdown = {
      verified: 0,
      pending: 0,
      rejected: 0
    };
    clinicsByStatus.forEach(item => {
      if (item.verificationStatus) {
        clinicStatusBreakdown[item.verificationStatus] = item._count;
      }
    });

    // Process dentist verification breakdown
    const dentistVerificationBreakdown = {
      verified: 0,
      pending: 0
    };
    dentistsByStatus.forEach(item => {
      dentistVerificationBreakdown[item.isVerified ? 'verified' : 'pending'] = item._count;
    });

    // Format recent activity
    const recentActivity = [
      ...recentClinics.map(clinic => ({
        type: 'clinic_registered',
        icon: 'Plus',
        color: 'blue',
        title: 'New clinic registered',
        description: `${clinic.brandName || clinic.legalName}`,
        timestamp: clinic.createdAt.toISOString(),
        status: clinic.verificationStatus
      })),
      ...recentDentists.map(dentist => ({
        type: dentist.dentistProfile?.[0]?.isVerified ? 'dentist_verified' : 'dentist_registered',
        icon: dentist.dentistProfile?.[0]?.isVerified ? 'CheckCircle' : 'UserPlus',
        color: dentist.dentistProfile?.[0]?.isVerified ? 'green' : 'purple',
        title: dentist.dentistProfile?.[0]?.isVerified ? 'Dentist verified' : 'New dentist registered',
        description: dentist.name,
        timestamp: dentist.createdAt.toISOString(),
        specialization: dentist.dentistProfile?.[0]?.primarySpecialization
      })),
      ...recentAppointments.map(apt => ({
        type: 'appointment_created',
        icon: 'Calendar',
        color: 'orange',
        title: 'New appointment',
        description: `${apt.patient?.name} with ${apt.dentistUser?.name || 'dentist'}`,
        timestamp: apt.createdAt.toISOString(),
        clinic: apt.clinic?.brandName,
        status: apt.status
      }))
    ]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10);

    const metrics = {
      clinics: {
        total: totalClinics,
        active: activeClinics,
        growth: parseFloat(clinicGrowth),
        breakdown: clinicStatusBreakdown
      },
      dentists: {
        total: totalDentists,
        verified: verifiedDentists,
        growth: parseFloat(dentistGrowth),
        breakdown: dentistVerificationBreakdown
      },
      patients: {
        total: totalPatients,
        growth: parseFloat(patientGrowth),
        thisMonth: totalPatients - lastMonthPatients
      },
      appointments: {
        total: totalAppointments,
        completed: completedAppointments,
        thisMonth: thisMonthAppointments,
        growth: parseFloat(appointmentGrowth)
      },
      recentActivity
    };

    console.log('✅ Dashboard metrics fetched successfully');
    res.json({ success: true, data: metrics });

  } catch (error) {
    console.error('❌ Error fetching dashboard metrics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch dashboard metrics',
      message: error.message 
    });
  }
});

// Get monthly revenue trends (last 6 months)
router.get('/revenue-trends', authenticateToken, requireRoles(['super_admin', 'admin', 'business_manager', 'platform_manager', 'finance_manager']), async (req, res) => {
  try {
    console.log('💰 Admin Dashboard: Fetching revenue trends');

    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

    // Get payment intents grouped by month
    const payments = await prisma.paymentIntent.findMany({
      where: {
        createdAt: { gte: sixMonthsAgo },
        status: { in: ['succeeded', 'completed'] }
      },
      select: {
        amount: true,
        createdAt: true
      }
    });

    // Group by month
    const monthlyRevenue = {};
    const months = [];
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      months.push({ key: monthKey, label: monthLabel });
      monthlyRevenue[monthKey] = 0;
    }

    // Aggregate payments by month
    payments.forEach(payment => {
      const date = new Date(payment.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthlyRevenue[monthKey] !== undefined) {
        monthlyRevenue[monthKey] += parseFloat(payment.amount) || 0;
      }
    });

    // Format response
    const trends = months.map(month => ({
      month: month.label,
      revenue: monthlyRevenue[month.key],
      formattedRevenue: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(monthlyRevenue[month.key])
    }));

    // Calculate total and average
    const totalRevenue = Object.values(monthlyRevenue).reduce((sum, val) => sum + val, 0);
    const averageRevenue = totalRevenue / months.length;

    console.log('✅ Revenue trends fetched successfully');
    res.json({ 
      success: true, 
      data: {
        trends,
        total: totalRevenue,
        average: averageRevenue,
        formattedTotal: new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(totalRevenue)
      }
    });

  } catch (error) {
    console.error('❌ Error fetching revenue trends:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch revenue trends',
      message: error.message 
    });
  }
});

// Get user growth trends (last 6 months)
router.get('/user-growth', authenticateToken, requireRoles(['super_admin', 'admin', 'business_manager', 'platform_manager']), async (req, res) => {
  try {
    console.log('📈 Admin Dashboard: Fetching user growth trends');

    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

    // Get users grouped by month and role
    const users = await prisma.user.findMany({
      where: {
        createdAt: { gte: sixMonthsAgo }
      },
      select: {
        roles: true,
        createdAt: true
      }
    });

    // Initialize months
    const months = [];
    const growthData = {};
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      months.push({ key: monthKey, label: monthLabel });
      growthData[monthKey] = {
        patients: 0,
        dentists: 0,
        clinics: 0,
        total: 0
      };
    }

    // Aggregate users by month and role
    users.forEach(user => {
      const date = new Date(user.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (growthData[monthKey]) {
        if (user.roles.includes('patient')) growthData[monthKey].patients++;
        if (user.roles.includes('dentist')) growthData[monthKey].dentists++;
        if (user.roles.includes('clinic_owner')) growthData[monthKey].clinics++;
        growthData[monthKey].total++;
      }
    });

    // Format response
    const trends = months.map(month => ({
      month: month.label,
      ...growthData[month.key]
    }));

    console.log('✅ User growth trends fetched successfully');
    res.json({ success: true, data: trends });

  } catch (error) {
    console.error('❌ Error fetching user growth trends:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch user growth trends',
      message: error.message 
    });
  }
});

export default router;
