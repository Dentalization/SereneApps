import express from 'express';
import { authenticateToken } from '../../utils/tokens.js';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

async function getAuthorizedAppointment(appointmentId, user) {
  const apptId = BigInt(appointmentId);
  const userId = BigInt(user.id);
  const roles = user.roles || [];
  const appointment = await prisma.appointment.findUnique({
    where: { id: apptId },
    select: { id: true, dentistId: true, patientId: true, status: true, videoRoomRef: true }
  });

  if (!appointment) {
    const error = new Error('APPOINTMENT_NOT_FOUND');
    error.status = 404;
    throw error;
  }

  const isAdmin = roles.includes('admin') || roles.includes('super_admin');
  if (!isAdmin && userId !== appointment.dentistId && userId !== appointment.patientId) {
    const error = new Error('FORBIDDEN');
    error.status = 403;
    throw error;
  }

  return appointment;
}

/**
 * @route POST /v1/appointments/:appointmentId/video/leave
 * @desc Handle logic when a participant leaves a video call
 */
router.post('/:appointmentId/video/leave', authenticateToken, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const userId = BigInt(req.user.id);
    const apptId = BigInt(appointmentId);

    console.log(`[Video] User ${userId} leaving appointment ${appointmentId}`);

    const appointment = await getAuthorizedAppointment(appointmentId, req.user);

    // Record session end (fallback for missed webhooks)
    const activeSession = await prisma.videoSession.findFirst({
      where: { appointmentId: apptId, userId, leftAt: null },
      orderBy: { joinedAt: 'desc' }
    });

    if (activeSession) {
      const leftAt = new Date();
      const durationSeconds = Math.max(1, Math.round((leftAt.getTime() - activeSession.joinedAt.getTime()) / 1000));
      await prisma.videoSession.update({
        where: { id: activeSession.id },
        data: { leftAt, durationSeconds }
      });
    } else {
      // If no active session found (missed join), create a dummy 1s session to mark presence
      await prisma.videoSession.create({
        data: {
          appointmentId: apptId,
          userId,
          actorRole: 'participant',
          joinedAt: new Date(Date.now() - 1000),
          leftAt: new Date(),
          durationSeconds: 1
        }
      });
    }

    // Optional: Log session event in status history
    await prisma.appointmentStatusHistory.create({
      data: {
        appointmentId: apptId,
        previousStatus: appointment.status,
        newStatus: appointment.status,
        changedBy: userId,
        notes: `Participant left video session (manual)`
      }
    }).catch(err => console.error('[Video] Failed to log leave event:', err.message));

    return res.json({ success: true, message: 'Successfully left session' });
  } catch (error) {
    console.error('[Video] Error in leave endpoint:', error);
    return res.status(500).json({ error: 'Failed to process leave request' });
  }
});

/**
 * @route GET /v1/appointments/:appointmentId/video/sessions
 * @desc Get aggregated video session stats for an appointment
 */
router.get('/:appointmentId/video/sessions', authenticateToken, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const apptId = BigInt(appointmentId);
    await getAuthorizedAppointment(appointmentId, req.user);

    const sessions = await prisma.videoSession.findMany({
      where: { appointmentId: apptId },
      orderBy: { joinedAt: 'asc' }
    });

    const totalDurationSeconds = sessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
    const participantStats = {};

    sessions.forEach(s => {
      const uid = s.userId.toString();
      if (!participantStats[uid]) {
        participantStats[uid] = { totalDuration: 0, sessionCount: 0 };
      }
      participantStats[uid].totalDuration += (s.durationSeconds || 0);
      participantStats[uid].sessionCount += 1;
    });

    return res.json({
      appointmentId: appointmentId.toString(),
      totalDurationSeconds,
      sessionCount: sessions.length,
      sessions: sessions.map(s => ({
        id: s.id.toString(),
        userId: s.userId.toString(),
        joinedAt: s.joinedAt,
        leftAt: s.leftAt,
        durationSeconds: s.durationSeconds
      })),
      participantStats
    });
  } catch (error) {
    console.error('[Video] Error fetching sessions:', error);
    return res.status(500).json({ error: 'Failed to fetch session history' });
  }
});

/**
 * @route GET /v1/appointments/:appointmentId/video/status
 * @desc Check the status of a video room
 */
router.get('/:appointmentId/video/status', authenticateToken, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const apptId = BigInt(appointmentId);

    const appointment = await getAuthorizedAppointment(appointmentId, req.user);

    return res.json({
      roomName: appointment.videoRoomRef,
      appointmentStatus: appointment.status,
      isActive: appointment.status === 'scheduled' || appointment.status === 'confirmed'
    });
  } catch (error) {
    console.error('[Video] Error in status endpoint:', error);
    return res.status(500).json({ error: 'Failed to fetch video status' });
  }
});

export default router;
