import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRoles } from '../utils/tokens.js';

const router = express.Router();
const prisma = new PrismaClient();

function toBigInt(value, fieldName) {
  try {
    return BigInt(value);
  } catch (err) {
    const error = new Error(`INVALID_${fieldName?.toUpperCase() || 'ID'}`);
    error.status = 400;
    throw error;
  }
}

// Helper: map midtrans type to expected frontend method
const getPaymentMethod = (pay) => {
  const type = pay.providerResponse?.payment_type?.toLowerCase() || '';
  if (type.includes('qris') || type.includes('gopay') || type.includes('shopeepay')) return 'qris';
  if (type.includes('transfer') || type.includes('va')) return 'transfer';
  if (type.includes('card')) return 'credit';
  return 'debit'; // fallback
};

// Helper: map internal payment status to frontend status
const getPaymentStatus = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'settled') return 'settled';
  if (s === 'paid') return 'paid';
  if (['pending', 'requires_action'].includes(s)) return 'pending';
  if (['refunded', 'partial_refund'].includes(s)) return 'refunded';
  return 'failed';
};

// -------------------------------------------------------------
// CLINIC FINANCIALS ENDPOINTS
// -------------------------------------------------------------

router.get(
  '/clinic/summary',
  authenticateToken,
  requireRoles(['owner', 'clinic_owner', 'manager', 'clinic_staff', 'clinic_admin', 'clinic_manager']),
  async (req, res) => {
    try {
      const userId = toBigInt(req.user.id, 'userId');
      
      // Resolve clinic profile
      let clinicProfile = await prisma.clinicProfile.findFirst({
        where: { userId }
      });

      if (!clinicProfile) {
        const staffRecord = await prisma.clinicStaff.findFirst({
          where: { userId },
          include: { clinicProfile: true }
        });
        if (staffRecord?.clinicProfile) {
          clinicProfile = staffRecord.clinicProfile;
        }
      }

      if (!clinicProfile) {
        return res.status(404).json({ error: 'Clinic profile not found for user' });
      }

      // Calculate total clinic earnings (strictly SETTLED only)
      const settledIntents = await prisma.paymentIntent.findMany({
        where: {
          ownerType: 'clinic',
          ownerClinicId: clinicProfile.id,
          status: 'settled'
        },
        include: { paymentSnapshot: true }
      });
      const totalEarnings = settledIntents.reduce((sum, item) => sum + (item.paymentSnapshot?.finalPaidAmount || item.amount), 0);

      // Calculate pending earnings (includes pending, requires_action, AND paid which is not yet settled)
      const pendingIntents = await prisma.paymentIntent.findMany({
        where: {
          ownerType: 'clinic',
          ownerClinicId: clinicProfile.id,
          status: { in: ['pending', 'requires_action', 'paid'] }
        },
        select: { amount: true }
      });
      const pendingEarnings = pendingIntents.reduce((sum, item) => sum + item.amount, 0);

      // Calculate refunded amount
      const refundedIntents = await prisma.paymentIntent.findMany({
        where: {
          ownerType: 'clinic',
          ownerClinicId: clinicProfile.id,
          status: { in: ['refunded', 'partial_refund'] }
        },
        include: { refunds: true }
      });
      const refundedAmount = refundedIntents.reduce((sum, item) => {
        const refundSum = item.refunds?.reduce((s, r) => s + r.refundAmount, 0) || 0;
        return sum + (refundSum || item.amount);
      }, 0);

      // Total transaction count
      const transactionCount = await prisma.paymentIntent.count({
        where: {
          ownerType: 'clinic',
          ownerClinicId: clinicProfile.id
        }
      });

      return res.json({
        totalEarnings,
        pendingEarnings,
        refundedAmount,
        transactionCount
      });
    } catch (error) {
      console.error('Error fetching clinic financials summary:', error);
      return res.status(500).json({ error: 'Failed to fetch clinic financials summary' });
    }
  }
);

router.get(
  '/clinic/history',
  authenticateToken,
  requireRoles(['owner', 'clinic_owner', 'manager', 'clinic_staff', 'clinic_admin', 'clinic_manager']),
  async (req, res) => {
    try {
      const userId = toBigInt(req.user.id, 'userId');
      
      // Resolve clinic profile
      let clinicProfile = await prisma.clinicProfile.findFirst({
        where: { userId }
      });

      if (!clinicProfile) {
        const staffRecord = await prisma.clinicStaff.findFirst({
          where: { userId },
          include: { clinicProfile: true }
        });
        if (staffRecord?.clinicProfile) {
          clinicProfile = staffRecord.clinicProfile;
        }
      }

      if (!clinicProfile) {
        return res.status(404).json({ error: 'Clinic profile not found for user' });
      }

      // Fetch Invoices
      const invoices = await prisma.invoice.findMany({
        where: {
          ownerType: 'clinic',
          ownerClinicId: clinicProfile.id
        },
        include: {
          patient: { select: { id: true, name: true, email: true } },
          items: true,
          paymentIntent: { select: { status: true } },
          appointment: {
            select: {
              startsAt: true,
              reason: true,
              dentist: { select: { name: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Fetch Payments (PaymentIntents)
      const payments = await prisma.paymentIntent.findMany({
        where: {
          ownerType: 'clinic',
          ownerClinicId: clinicProfile.id
        },
        include: {
          patient: { select: { id: true, name: true, email: true } },
          appointment: {
            select: {
              startsAt: true,
              reason: true,
              dentist: { select: { name: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Map Invoices to frontend schema
      const mappedInvoices = invoices.map(inv => {
        const paymentStatus = inv.paymentIntent?.status?.toLowerCase() || '';
        const status = ['paid', 'settled'].includes(paymentStatus) ? 'paid' : 'pending';

        return {
          id: inv.reference || `INV-${inv.id.toString().padStart(6, '0')}`,
          dbId: inv.id.toString(),
          patient: inv.patient?.name || 'Pasien',
          services: inv.items.map(item => item.description),
          amount: inv.total,
          status,
          dueDate: inv.dueAt || new Date(new Date(inv.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: inv.createdAt
        };
      });

      // Map Payments to frontend schema
      const mappedPayments = payments.map(pay => {
        const associatedInvoice = invoices.find(inv => inv.paymentIntentId === pay.id);
        const invoiceRef = associatedInvoice 
          ? (associatedInvoice.reference || `INV-${associatedInvoice.id.toString().padStart(6, '0')}`)
          : `INV-${pay.id.toString().padStart(6, '0')}`;

        return {
          id: `PAY-${pay.id.toString().padStart(4, '0')}`,
          dbId: pay.id.toString(),
          invoice: invoiceRef,
          patient: pay.patient?.name || 'Pasien',
          amount: pay.amount,
          method: getPaymentMethod(pay),
          status: getPaymentStatus(pay.status),
          receivedBy: pay.appointment?.dentist?.name?.split?.(',')[0] || 'Midtrans',
          receivedAt: pay.createdAt,
          notes: pay.providerResponse?.status_message || 'Online Payment'
        };
      });

      return res.json({
        invoices: mappedInvoices,
        payments: mappedPayments
      });
    } catch (error) {
      console.error('Error fetching clinic financials history:', error);
      return res.status(500).json({ error: 'Failed to fetch clinic financials history' });
    }
  }
);

router.get(
  '/clinic/analytics',
  authenticateToken,
  requireRoles(['owner', 'clinic_owner', 'manager', 'clinic_staff', 'clinic_admin', 'clinic_manager']),
  async (req, res) => {
    try {
      const userId = toBigInt(req.user.id, 'userId');
      
      let clinicProfile = await prisma.clinicProfile.findFirst({
        where: { userId }
      });

      if (!clinicProfile) {
        const staffRecord = await prisma.clinicStaff.findFirst({
          where: { userId },
          include: { clinicProfile: true }
        });
        if (staffRecord?.clinicProfile) {
          clinicProfile = staffRecord.clinicProfile;
        }
      }

      if (!clinicProfile) {
        return res.status(404).json({ error: 'Clinic profile not found' });
      }

      const clinicId = clinicProfile.id;

      // 1. Settled transactions (Revenue must use SETTLED only)
      const settledIntents = await prisma.paymentIntent.findMany({
        where: {
          ownerType: 'clinic',
          ownerClinicId: clinicId,
          status: 'settled'
        },
        include: {
          paymentSnapshot: true,
          appointment: true
        }
      });

      const totalRevenue = settledIntents.reduce((sum, item) => sum + (item.paymentSnapshot?.finalPaidAmount || item.amount), 0);
      const settledCount = settledIntents.length;
      const averageTransactionValue = settledCount > 0 ? Math.round(totalRevenue / settledCount) : 0;

      // 2. Trends: Group by month/day (daily and monthly revenue)
      const dailyRevenue = {};
      const monthlyRevenue = {};
      
      settledIntents.forEach(item => {
        const dateStr = item.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD
        const monthStr = dateStr.slice(0, 7); // YYYY-MM
        const amount = item.paymentSnapshot?.finalPaidAmount || item.amount;
        
        dailyRevenue[dateStr] = (dailyRevenue[dateStr] || 0) + amount;
        monthlyRevenue[monthStr] = (monthlyRevenue[monthStr] || 0) + amount;
      });

      // 3. Virtual vs Onsite comparison
      let virtualRevenue = 0;
      let onsiteRevenue = 0;
      let virtualCount = 0;
      let onsiteCount = 0;

      settledIntents.forEach(item => {
        const amount = item.paymentSnapshot?.finalPaidAmount || item.amount;
        if (item.appointment?.consultationType === 'virtual') {
          virtualRevenue += amount;
          virtualCount++;
        } else {
          onsiteRevenue += amount;
          onsiteCount++;
        }
      });

      // 4. Cancellation losses
      const cancelledAppointments = await prisma.appointment.findMany({
        where: {
          ownerClinicId: clinicId,
          status: 'cancelled'
        },
        include: {
          dentist: {
            include: {
              dentistProfile: true
            }
          }
        }
      });
      const cancellationLosses = cancelledAppointments.reduce((sum, app) => {
        const baseFee = app.dentist?.dentistProfile?.[0]?.consultationFee || 150000;
        return sum + (baseFee - (app.cancellationFee || 0));
      }, 0);

      // 5. Refund totals
      const refunds = await prisma.refund.findMany({
        where: {
          paymentIntent: {
            ownerType: 'clinic',
            ownerClinicId: clinicId
          },
          refundStatus: 'refunded'
        }
      });
      const refundTotals = refunds.reduce((sum, r) => sum + r.refundAmount, 0);

      // 6. Top earning dentists
      const dentistStats = {};
      settledIntents.forEach(item => {
        if (item.appointment) {
          const dentistId = item.appointment.dentistId.toString();
          const amount = item.paymentSnapshot?.finalPaidAmount || item.amount;
          const dentistShare = item.paymentSnapshot?.dentistShare || Math.round(amount * 0.3); // 30% default fallback
          
          if (!dentistStats[dentistId]) {
            dentistStats[dentistId] = { dentistId, totalEarned: 0, appointmentsCount: 0 };
          }
          dentistStats[dentistId].totalEarned += dentistShare;
          dentistStats[dentistId].appointmentsCount++;
        }
      });

      const dentistIds = Object.keys(dentistStats).map(id => BigInt(id));
      const dentists = await prisma.user.findMany({
        where: { id: { in: dentistIds } },
        select: { id: true, name: true }
      });

      const topEarningDentists = Object.values(dentistStats).map(stat => {
        const d = dentists.find(x => x.id.toString() === stat.dentistId);
        return {
          dentistName: d ? d.name : 'Unknown Dentist',
          totalEarned: stat.totalEarned,
          appointmentsCount: stat.appointmentsCount
        };
      }).sort((a, b) => b.totalEarned - a.totalEarned);

      const clinicUtilization = {
        totalAppointments: await prisma.appointment.count({ where: { ownerClinicId: clinicId } }),
        confirmedAppointments: await prisma.appointment.count({ where: { ownerClinicId: clinicId, status: 'confirmed' } }),
        completedAppointments: await prisma.appointment.count({ where: { ownerClinicId: clinicId, status: 'completed' } }),
        cancelledAppointments: cancelledAppointments.length
      };

      return res.json({
        totalRevenue,
        averageTransactionValue,
        dailyRevenue,
        monthlyRevenue,
        virtualVsOnsite: {
          virtual: { revenue: virtualRevenue, count: virtualCount },
          onsite: { revenue: onsiteRevenue, count: onsiteCount }
        },
        cancellationLosses,
        refundTotals,
        topEarningDentists,
        clinicUtilization
      });
    } catch (error) {
      console.error('Error fetching clinic analytics:', error);
      return res.status(500).json({ error: 'Failed to fetch clinic analytics' });
    }
  }
);

// -------------------------------------------------------------
// DENTIST FINANCIALS ENDPOINTS
// -------------------------------------------------------------

router.get(
  '/dentist/summary',
  authenticateToken,
  requireRoles(['dentist']),
  async (req, res) => {
    try {
      const dentistId = toBigInt(req.user.id, 'dentistId');

      // Calculate total dentist independent earnings (strictly SETTLED only)
      const settledIntents = await prisma.paymentIntent.findMany({
        where: {
          ownerType: 'dentist',
          ownerDentistId: dentistId,
          status: 'settled'
        },
        include: { paymentSnapshot: true }
      });
      const totalEarnings = settledIntents.reduce((sum, item) => sum + (item.paymentSnapshot?.finalPaidAmount || item.amount), 0);
      const independentCount = settledIntents.length;

      // Count clinic-affiliated appointments handled by this dentist
      const clinicAffiliatedCount = await prisma.appointment.count({
        where: {
          dentistId,
          ownerType: 'clinic',
          status: 'confirmed'
        }
      });

      // Calculate average ticket size
      const averageTicketSize = independentCount > 0 ? Math.round(totalEarnings / independentCount) : 0;

      return res.json({
        totalEarnings,
        independentCount,
        clinicAffiliatedCount,
        averageTicketSize
      });
    } catch (error) {
      console.error('Error fetching dentist financials summary:', error);
      return res.status(500).json({ error: 'Failed to fetch dentist financials summary' });
    }
  }
);

router.get(
  '/dentist/history',
  authenticateToken,
  requireRoles(['dentist']),
  async (req, res) => {
    try {
      const dentistId = toBigInt(req.user.id, 'dentistId');

      // Fetch dentist independent Invoices
      const invoices = await prisma.invoice.findMany({
        where: {
          ownerType: 'dentist',
          ownerDentistId: dentistId
        },
        include: {
          patient: { select: { id: true, name: true, email: true } },
          items: true,
          paymentIntent: { select: { status: true } },
          appointment: {
            select: {
              startsAt: true,
              reason: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Fetch dentist independent Payments (PaymentIntents)
      const payments = await prisma.paymentIntent.findMany({
        where: {
          ownerType: 'dentist',
          ownerDentistId: dentistId
        },
        include: {
          patient: { select: { id: true, name: true, email: true } },
          appointment: {
            select: {
              startsAt: true,
              reason: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Map Invoices to frontend schema
      const mappedInvoices = invoices.map(inv => {
        const paymentStatus = inv.paymentIntent?.status?.toLowerCase() || '';
        const status = ['paid', 'settled'].includes(paymentStatus) ? 'paid' : 'pending';

        return {
          id: inv.reference || `INV-${inv.id.toString().padStart(6, '0')}`,
          dbId: inv.id.toString(),
          patient: inv.patient?.name || 'Patient',
          services: inv.items.map(item => item.description),
          amount: inv.total,
          status,
          dueDate: inv.dueAt || new Date(new Date(inv.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: inv.createdAt
        };
      });

      // Map Payments to frontend schema
      const mappedPayments = payments.map(pay => {
        const associatedInvoice = invoices.find(inv => inv.paymentIntentId === pay.id);
        const invoiceRef = associatedInvoice 
          ? (associatedInvoice.reference || `INV-${associatedInvoice.id.toString().padStart(6, '0')}`)
          : `INV-${pay.id.toString().padStart(6, '0')}`;

        return {
          id: `PAY-${pay.id.toString().padStart(4, '0')}`,
          dbId: pay.id.toString(),
          invoice: invoiceRef,
          patient: pay.patient?.name || 'Patient',
          amount: pay.amount,
          method: getPaymentMethod(pay),
          status: getPaymentStatus(pay.status),
          receivedBy: pay.appointment?.dentist?.name?.split?.(',')[0] || 'Midtrans',
          receivedAt: pay.createdAt,
          notes: pay.providerResponse?.status_message || 'Online Payment'
        };
      });

      return res.json({
        invoices: mappedInvoices,
        payments: mappedPayments
      });
    } catch (error) {
      console.error('Error fetching dentist financials history:', error);
      return res.status(500).json({ error: 'Failed to fetch dentist financials history' });
    }
  }
);

router.get(
  '/dentist/analytics',
  authenticateToken,
  requireRoles(['dentist']),
  async (req, res) => {
    try {
      const dentistId = toBigInt(req.user.id, 'dentistId');

      // 1. Settled transactions (Independent only)
      const settledIntents = await prisma.paymentIntent.findMany({
        where: {
          ownerType: 'dentist',
          ownerDentistId: dentistId,
          status: 'settled'
        },
        include: {
          paymentSnapshot: true,
          appointment: true
        }
      });

      const totalRevenue = settledIntents.reduce((sum, item) => sum + (item.paymentSnapshot?.finalPaidAmount || item.amount), 0);
      const settledCount = settledIntents.length;
      const averageTransactionValue = settledCount > 0 ? Math.round(totalRevenue / settledCount) : 0;

      // 2. Trends: Group by month/day
      const dailyRevenue = {};
      const monthlyRevenue = {};
      
      settledIntents.forEach(item => {
        const dateStr = item.createdAt.toISOString().split('T')[0];
        const monthStr = dateStr.slice(0, 7);
        const amount = item.paymentSnapshot?.finalPaidAmount || item.amount;
        
        dailyRevenue[dateStr] = (dailyRevenue[dateStr] || 0) + amount;
        monthlyRevenue[monthStr] = (monthlyRevenue[monthStr] || 0) + amount;
      });

      // 3. Virtual vs Onsite comparison
      let virtualRevenue = 0;
      let onsiteRevenue = 0;
      let virtualCount = 0;
      let onsiteCount = 0;

      settledIntents.forEach(item => {
        const amount = item.paymentSnapshot?.finalPaidAmount || item.amount;
        if (item.appointment?.consultationType === 'virtual') {
          virtualRevenue += amount;
          virtualCount++;
        } else {
          onsiteRevenue += amount;
          onsiteCount++;
        }
      });

      // 4. Cancellation losses
      const cancelledAppointments = await prisma.appointment.findMany({
        where: {
          dentistId,
          ownerType: 'dentist',
          status: 'cancelled'
        },
        include: {
          dentist: {
            include: {
              dentistProfile: true
            }
          }
        }
      });
      const cancellationLosses = cancelledAppointments.reduce((sum, app) => {
        const baseFee = app.dentist?.dentistProfile?.[0]?.consultationFee || 150000;
        return sum + (baseFee - (app.cancellationFee || 0));
      }, 0);

      // 5. Refund totals
      const refunds = await prisma.refund.findMany({
        where: {
          paymentIntent: {
            ownerType: 'dentist',
            ownerDentistId: dentistId
          },
          refundStatus: 'refunded'
        }
      });
      const refundTotals = refunds.reduce((sum, r) => sum + r.refundAmount, 0);

      return res.json({
        totalRevenue,
        averageTransactionValue,
        dailyRevenue,
        monthlyRevenue,
        virtualVsOnsite: {
          virtual: { revenue: virtualRevenue, count: virtualCount },
          onsite: { revenue: onsiteRevenue, count: onsiteCount }
        },
        cancellationLosses,
        refundTotals
      });
    } catch (error) {
      console.error('Error fetching dentist analytics:', error);
      return res.status(500).json({ error: 'Failed to fetch dentist analytics' });
    }
  }
);

export default router;
