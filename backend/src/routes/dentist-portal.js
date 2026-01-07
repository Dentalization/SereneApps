/**
 * Dentist Portal Routes
 * Protected routes for dentist to manage their patients and appointments
 */

import express from 'express';
import { authenticateToken, requireRoles } from '../utils/tokens.js';
import { PrismaClient } from '../generated/prisma/index.js';

const router = express.Router();
const prisma = new PrismaClient();

function sendError(res, status, code, message, extras = {}) {
  return res.status(status).json({
    error: {
      code,
      message,
      ...extras
    }
  });
}

function toBigInt(value, fieldName) {
  try {
    return BigInt(value);
  } catch (err) {
    throw new Error(`INVALID_${fieldName?.toUpperCase() || 'ID'}`);
  }
}

/**
 * Serialize patient data with AI results
 */
function serializePatient(user, appointments = [], aiResults = []) {
  // Calculate last visit and next appointment
  const now = new Date();
  const pastAppointments = appointments.filter(a => new Date(a.startsAt) < now);
  const futureAppointments = appointments.filter(a => new Date(a.startsAt) >= now);
  
  const lastVisit = pastAppointments.length > 0 
    ? pastAppointments.sort((a, b) => new Date(b.startsAt) - new Date(a.startsAt))[0]
    : null;
  
  const nextAppointment = futureAppointments.length > 0
    ? futureAppointments.sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))[0]
    : null;

  // Calculate overall status based on appointments and AI results
  let status = 'inactive';
  if (futureAppointments.length > 0) {
    status = 'active';
  } else if (pastAppointments.length > 0) {
    status = 'completed';
  }

  // Check for any critical AI results
  const hasHighRisk = aiResults.some(r => r.riskLevel === 'high');
  if (hasHighRisk) {
    status = 'needs_attention';
  }

  return {
    id: user.id.toString(),
    name: user.name || 'Unknown',
    email: user.email || null,
    phone: user.phone_number || null,
    avatar: user.avatar_url || null,
    status,
    lastVisit: lastVisit ? new Date(lastVisit.startsAt).toISOString() : null,
    nextAppointment: nextAppointment ? new Date(nextAppointment.startsAt).toISOString() : null,
    appointmentCount: appointments.length,
    aiResults: aiResults.map(result => ({
      id: result.id.toString(),
      sessionId: result.sessionId,
      imageUrl: result.imageUrl,
      annotatedImageUrl: result.annotatedImageUrl,
      findings: result.findings,
      summary: result.summary,
      overallAssessment: result.overallAssessment,
      riskLevel: result.riskLevel,
      confidenceScore: result.confidenceScore,
      detections: result.detections || [],
      recommendations: result.recommendations || [],
      createdAt: result.createdAt?.toISOString() || null
    }))
  };
}

/**
 * GET /v1/dentist-portal/patients
 * Get all patients who have booked appointments with this dentist
 */
router.get(
  '/patients',
  authenticateToken,
  requireRoles(['dentist']),
  async (req, res) => {
    try {
      const dentistId = toBigInt(req.user.id, 'dentistId');
      const { search, status, sortBy = 'lastVisit', sortOrder = 'desc', limit = 50, offset = 0 } = req.query;

      // Get all unique patients from appointments with this dentist
      const appointments = await prisma.appointment.findMany({
        where: {
          dentistId
        },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              email: true,
              phone_number: true,
              avatar_url: true
            }
          }
        },
        orderBy: { startsAt: 'desc' }
      });

      // Group appointments by patient
      const patientMap = new Map();
      for (const appointment of appointments) {
        if (!appointment.patient) continue;
        
        const patientId = appointment.patient.id.toString();
        if (!patientMap.has(patientId)) {
          patientMap.set(patientId, {
            user: appointment.patient,
            appointments: []
          });
        }
        patientMap.get(patientId).appointments.push(appointment);
      }

      // Get AI analysis results for all patients
      const patientIds = Array.from(patientMap.keys()).map(id => BigInt(id));
      const aiResults = await prisma.aIAnalysisResult.findMany({
        where: {
          userId: { in: patientIds }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Group AI results by user
      const aiResultsByUser = new Map();
      for (const result of aiResults) {
        const userId = result.userId.toString();
        if (!aiResultsByUser.has(userId)) {
          aiResultsByUser.set(userId, []);
        }
        aiResultsByUser.get(userId).push(result);
      }

      // Serialize patients
      let patients = Array.from(patientMap.values()).map(({ user, appointments }) => {
        const userIdStr = user.id.toString();
        const patientAiResults = aiResultsByUser.get(userIdStr) || [];
        return serializePatient(user, appointments, patientAiResults);
      });

      // Apply search filter
      if (search) {
        const searchLower = search.toLowerCase();
        patients = patients.filter(p => 
          (p.name && p.name.toLowerCase().includes(searchLower)) ||
          (p.email && p.email.toLowerCase().includes(searchLower)) ||
          (p.phone && p.phone.includes(search))
        );
      }

      // Apply status filter
      if (status) {
        patients = patients.filter(p => p.status === status);
      }

      // Apply sorting
      patients.sort((a, b) => {
        let aVal, bVal;
        
        switch (sortBy) {
          case 'name':
            aVal = a.name || '';
            bVal = b.name || '';
            break;
          case 'nextAppointment':
            aVal = a.nextAppointment ? new Date(a.nextAppointment) : new Date(0);
            bVal = b.nextAppointment ? new Date(b.nextAppointment) : new Date(0);
            break;
          case 'lastVisit':
          default:
            aVal = a.lastVisit ? new Date(a.lastVisit) : new Date(0);
            bVal = b.lastVisit ? new Date(b.lastVisit) : new Date(0);
        }

        if (sortOrder === 'asc') {
          return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        } else {
          return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
        }
      });

      // Calculate summary
      const summary = {
        total: patients.length,
        byStatus: patients.reduce((acc, p) => {
          acc[p.status] = (acc[p.status] || 0) + 1;
          return acc;
        }, {}),
        withAiResults: patients.filter(p => p.aiResults.length > 0).length
      };

      // Apply pagination
      const paginatedPatients = patients.slice(
        parseInt(offset, 10),
        parseInt(offset, 10) + parseInt(limit, 10)
      );

      return res.json({
        patients: paginatedPatients,
        summary,
        pagination: {
          total: patients.length,
          limit: parseInt(limit, 10),
          offset: parseInt(offset, 10),
          hasMore: parseInt(offset, 10) + parseInt(limit, 10) < patients.length
        }
      });
    } catch (error) {
      console.error('Error fetching dentist patients:', error);
      return sendError(res, 500, 'fetch_patients_failed', 'Gagal memuat daftar pasien.');
    }
  }
);

/**
 * GET /v1/dentist-portal/patients/:patientId
 * Get single patient details with all appointments and AI results
 */
router.get(
  '/patients/:patientId',
  authenticateToken,
  requireRoles(['dentist']),
  async (req, res) => {
    try {
      const dentistId = toBigInt(req.user.id, 'dentistId');
      const patientId = toBigInt(req.params.patientId, 'patientId');

      // Verify patient has appointments with this dentist
      const appointments = await prisma.appointment.findMany({
        where: {
          dentistId,
          patientId
        },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              email: true,
              phone_number: true,
              avatar_url: true
            }
          }
        },
        orderBy: { startsAt: 'desc' }
      });

      if (appointments.length === 0) {
        return sendError(res, 404, 'patient_not_found', 'Pasien tidak ditemukan atau belum pernah membuat janji dengan Anda.');
      }

      const patient = appointments[0].patient;

      // Get AI analysis results for this patient
      const aiResults = await prisma.aIAnalysisResult.findMany({
        where: {
          userId: patientId
        },
        orderBy: { createdAt: 'desc' },
        take: 10 // Limit to last 10 results
      });

      // Get patient profile
      const patientProfile = await prisma.patientProfile.findUnique({
        where: { userId: patientId }
      });

      const serializedPatient = serializePatient(patient, appointments, aiResults);
      
      // Add extended details
      serializedPatient.appointments = appointments.map(a => ({
        id: a.id.toString(),
        startsAt: a.startsAt?.toISOString(),
        endsAt: a.endsAt?.toISOString(),
        status: a.status,
        reason: a.reason,
        notes: a.notes
      }));

      if (patientProfile) {
        serializedPatient.dateOfBirth = patientProfile.dateOfBirth?.toISOString().split('T')[0] || null;
        serializedPatient.gender = patientProfile.gender;
        serializedPatient.insurance = patientProfile.insuranceProvider ? {
          provider: patientProfile.insuranceProvider,
          number: patientProfile.insuranceNumber,
          memberId: patientProfile.insuranceMemberId
        } : null;
        serializedPatient.emergencyContact = patientProfile.emergencyContact;
        serializedPatient.medicalDetails = patientProfile.medicalDetails;
      }

      return res.json({ patient: serializedPatient });
    } catch (error) {
      console.error('Error fetching patient details:', error);
      return sendError(res, 500, 'fetch_patient_failed', 'Gagal memuat detail pasien.');
    }
  }
);

/**
 * GET /v1/dentist-portal/patients/:patientId/ai-results
 * Get all AI analysis results for a specific patient
 */
router.get(
  '/patients/:patientId/ai-results',
  authenticateToken,
  requireRoles(['dentist']),
  async (req, res) => {
    try {
      const dentistId = toBigInt(req.user.id, 'dentistId');
      const patientId = toBigInt(req.params.patientId, 'patientId');

      // Verify patient has appointments with this dentist (security check)
      const hasAppointment = await prisma.appointment.findFirst({
        where: {
          dentistId,
          patientId
        },
        select: { id: true }
      });

      if (!hasAppointment) {
        return sendError(res, 403, 'forbidden', 'Anda tidak memiliki akses ke data pasien ini.');
      }

      // Get all AI analysis results for this patient
      const aiResults = await prisma.aIAnalysisResult.findMany({
        where: {
          userId: patientId
        },
        orderBy: { createdAt: 'desc' }
      });

      return res.json({
        aiResults: aiResults.map(result => ({
          id: result.id.toString(),
          sessionId: result.sessionId,
          imageUrl: result.imageUrl,
          annotatedImageUrl: result.annotatedImageUrl,
          findings: result.findings,
          summary: result.summary,
          overallAssessment: result.overallAssessment,
          riskLevel: result.riskLevel,
          confidenceScore: result.confidenceScore,
          detections: result.detections || [],
          recommendations: result.recommendations || [],
          createdAt: result.createdAt?.toISOString() || null
        })),
        total: aiResults.length
      });
    } catch (error) {
      console.error('Error fetching patient AI results:', error);
      return sendError(res, 500, 'fetch_ai_results_failed', 'Gagal memuat hasil AI diagnosis pasien.');
    }
  }
);

export default router;
