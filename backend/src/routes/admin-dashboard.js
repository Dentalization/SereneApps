import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRoles } from '../utils/tokens.js';

const router = express.Router();
const prisma = new PrismaClient();
const SETTLED_PAYMENT_STATUSES = ['settled', 'succeeded', 'paid', 'completed'];
const PENDING_PAYMENT_STATUSES = ['pending', 'requires_action'];
const PAID_INVOICE_STATUSES = ['paid', 'settled'];
const PENDING_INVOICE_STATUSES = ['issued', 'pending', 'approved'];

const toNumber = (value) => Number(value || 0);
const formatIdr = (value) => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0
}).format(toNumber(value));

function monthBuckets(count, now = new Date()) {
  const months = [];
  const totals = {};

  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    months.push({
      key,
      label: date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })
    });
    totals[key] = 0;
  }

  return { months, totals };
}

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
        where: { OR: [{ status: 'verified' }, { isVerified: true }] }
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
        by: ['status'],
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
          status: true,
          isVerified: true,
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
          clinicBranch: {
            select: {
              branchName: true,
              clinicProfile: {
                select: {
                  brandName: true,
                  legalName: true
                }
              }
            }
          },
          ownerClinic: {
            select: {
              brandName: true,
              legalName: true
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
      if (item.status) {
        clinicStatusBreakdown[item.status] = item._count;
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
        status: clinic.status || (clinic.isVerified ? 'verified' : 'pending')
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
        clinic: apt.ownerClinic?.brandName || apt.ownerClinic?.legalName || apt.clinicBranch?.clinicProfile?.brandName || apt.clinicBranch?.branchName,
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
        status: { in: SETTLED_PAYMENT_STATUSES }
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
      formattedRevenue: new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
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
        formattedTotal: new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          maximumFractionDigits: 0
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

router.get('/financial-summary', authenticateToken, requireRoles(['super_admin', 'admin', 'business_manager', 'platform_manager', 'finance_manager']), async (req, res) => {
  try {
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const [
      settledPayments,
      recentPayments,
      recentInvoices,
      pendingInvoices,
      overdueInvoices,
      paidInvoices
    ] = await Promise.all([
      prisma.paymentIntent.findMany({
        where: {
          createdAt: { gte: twelveMonthsAgo },
          status: { in: SETTLED_PAYMENT_STATUSES }
        },
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          provider: true,
          providerOrderId: true,
          providerPaymentId: true,
          reconciliationStatus: true,
          reconciliationAttempts: true,
          reconciliationError: true,
          lastReconciledAt: true,
          createdAt: true,
          patient: { select: { name: true, email: true } },
          ownerClinic: { select: { brandName: true, legalName: true } },
          ownerDentist: { select: { name: true, email: true } },
          invoices: { select: { reference: true, status: true, grandTotal: true, total: true }, take: 1 }
        }
      }),
      prisma.paymentIntent.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          provider: true,
          providerOrderId: true,
          providerPaymentId: true,
          reconciliationStatus: true,
          reconciliationAttempts: true,
          reconciliationError: true,
          lastReconciledAt: true,
          createdAt: true,
          patient: { select: { name: true, email: true } },
          ownerClinic: { select: { brandName: true, legalName: true } },
          ownerDentist: { select: { name: true, email: true } },
          invoices: { select: { reference: true, status: true, grandTotal: true, total: true }, take: 1 }
        }
      }),
      prisma.invoice.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          reference: true,
          status: true,
          total: true,
          grandTotal: true,
          currency: true,
          issuedAt: true,
          dueAt: true,
          paidAt: true,
          createdAt: true,
          ownerClinic: { select: { brandName: true, legalName: true } },
          ownerDentist: { select: { name: true, email: true } },
          patient: { select: { name: true, email: true } },
          paymentIntent: {
            select: {
              status: true,
              provider: true,
              reconciliationStatus: true,
              reconciliationAttempts: true,
              reconciliationError: true,
              lastReconciledAt: true
            }
          }
        }
      }),
      prisma.invoice.count({ where: { status: { in: PENDING_INVOICE_STATUSES } } }),
      prisma.invoice.count({
        where: {
          status: { in: PENDING_INVOICE_STATUSES },
          dueAt: { lt: now }
        }
      }),
      prisma.invoice.count({ where: { status: { in: PAID_INVOICE_STATUSES } } })
    ]);

    const { months, totals } = monthBuckets(12, now);
    settledPayments.forEach((payment) => {
      const date = new Date(payment.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (Object.prototype.hasOwnProperty.call(totals, key)) {
        totals[key] += toNumber(payment.amount);
      }
    });

    const totalRevenue = settledPayments.reduce((sum, payment) => sum + toNumber(payment.amount), 0);
    const transactionCount = settledPayments.length;
    const averageTransaction = transactionCount ? Math.round(totalRevenue / transactionCount) : 0;

    const mapPaymentStatus = (status) => {
      const normalized = String(status || '').toLowerCase();
      if (SETTLED_PAYMENT_STATUSES.includes(normalized)) return 'success';
      if (PENDING_PAYMENT_STATUSES.includes(normalized)) return 'pending';
      return 'failed';
    };

    const mapInvoiceStatus = (invoice) => {
      const normalized = String(invoice.status || '').toLowerCase();
      if (PAID_INVOICE_STATUSES.includes(normalized)) return 'paid';
      if (invoice.dueAt && new Date(invoice.dueAt) < now && PENDING_INVOICE_STATUSES.includes(normalized)) return 'overdue';
      if (PENDING_INVOICE_STATUSES.includes(normalized)) return 'pending';
      return normalized || 'unknown';
    };

    const transactions = recentPayments.map((payment) => {
      const invoice = payment.invoices?.[0];
      const entity = payment.ownerClinic?.brandName ||
        payment.ownerClinic?.legalName ||
        payment.ownerDentist?.name ||
        payment.patient?.name ||
        'Unknown payer';

      return {
        id: payment.providerPaymentId || payment.providerOrderId || `PAY-${payment.id.toString()}`,
        date: payment.createdAt?.toISOString?.() || null,
        entity,
        type: payment.ownerClinic ? 'Clinic Payment' : payment.ownerDentist ? 'Dentist Payment' : 'Patient Payment',
        plan: invoice?.reference || payment.provider || 'Payment',
        amount: toNumber(invoice?.grandTotal || invoice?.total || payment.amount),
        currency: payment.currency || 'IDR',
        status: mapPaymentStatus(payment.status),
        rawStatus: payment.status,
        reconciliationStatus: payment.reconciliationStatus,
        reconciliationAttempts: payment.reconciliationAttempts,
        reconciliationError: payment.reconciliationError,
        lastReconciledAt: payment.lastReconciledAt?.toISOString?.() || null
      };
    });

    const invoices = recentInvoices.map((invoice) => {
      const client = invoice.ownerClinic?.brandName ||
        invoice.ownerClinic?.legalName ||
        invoice.ownerDentist?.name ||
        invoice.patient?.name ||
        'Unknown client';

      return {
        id: invoice.reference || `INV-${invoice.id.toString()}`,
        date: (invoice.issuedAt || invoice.createdAt)?.toISOString?.() || null,
        client,
        amount: toNumber(invoice.grandTotal || invoice.total),
        currency: invoice.currency || 'IDR',
        status: mapInvoiceStatus(invoice),
        rawStatus: invoice.status,
        dueDate: invoice.dueAt?.toISOString?.() || null,
        paidAt: invoice.paidAt?.toISOString?.() || null,
        paymentStatus: invoice.paymentIntent?.status || null,
        reconciliationStatus: invoice.paymentIntent?.reconciliationStatus || null,
        reconciliationAttempts: invoice.paymentIntent?.reconciliationAttempts || 0,
        reconciliationError: invoice.paymentIntent?.reconciliationError || null,
        lastReconciledAt: invoice.paymentIntent?.lastReconciledAt?.toISOString?.() || null
      };
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          formattedTotalRevenue: formatIdr(totalRevenue),
          mrr: null,
          formattedMrr: null,
          activeSubscriptions: null,
          pendingInvoices,
          overdueInvoices,
          paidInvoices,
          transactionCount,
          averageTransaction,
          formattedAverageTransaction: formatIdr(averageTransaction)
        },
        revenueTrends: months.map((month) => ({
          name: month.label,
          revenue: totals[month.key],
          expenses: null
        })),
        subscriptionDistribution: [],
        transactions,
        invoices,
        dataAvailability: {
          payments: {
            available: recentPayments.length > 0,
            sources: ['payment_intents'],
            missingSources: [],
            notes: recentPayments.length ? [] : ['Belum ada payment intent pada database.'],
            reconciliationFailures: recentPayments.filter(
              payment => payment.reconciliationStatus === 'failed'
            ).length
          },
          invoices: {
            available: recentInvoices.length > 0,
            sources: ['invoices'],
            missingSources: [],
            notes: recentInvoices.length ? [] : ['Belum ada invoice pada database.']
          },
          subscriptions: {
            available: false,
            sources: [],
            missingSources: ['subscriptions'],
            notes: ['Belum ada tabel/endpoint subscription plan untuk menghitung MRR dan tier distribution.']
          },
          expenses: {
            available: false,
            sources: [],
            missingSources: ['expenses'],
            notes: ['Belum ada sumber expense operational di backend. Chart hanya menampilkan revenue.']
          }
        }
      }
    });
  } catch (error) {
    console.error('❌ Error fetching admin financial summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch admin financial summary',
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
