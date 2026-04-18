import express from 'express';
import { authenticateToken } from '../../utils/tokens.js';
import { PrismaClient } from '@prisma/client';
import VideoService from '../../services/communications/videoService.js';

const router = express.Router();
const prisma = new PrismaClient();
const videoService = new VideoService();

// POST /appointments/:appointmentId/video/token
router.post('/appointments/:appointmentId/video/token', authenticateToken, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const userId = req.user.id;

    const appointment = await prisma.appointment.findUnique({
      where: { id: BigInt(appointmentId) }
    });

    if (!appointment) return res.status(404).json({ error: 'Not found' });

    // Verify requester
    if (appointment.dentistId !== BigInt(userId) && appointment.patientId !== BigInt(userId)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN' } });
    }

    if (appointment.status !== 'confirmed') {
      return res.status(403).json({ error: { code: 'APPOINTMENT_NOT_CONFIRMED' } });
    }

    const { roomSid, roomName } = await videoService.ensureRoom(appointmentId);

    const tokenData = await videoService.generateVideoToken({
      identity: String(userId),
      roomName,
      ttl: 14400
    });

    return res.status(200).json({
      token: tokenData.token,
      roomName: tokenData.roomName,
      identity: tokenData.identity,
      expiresAt: tokenData.expiresAt
    });

  } catch (error) {
    console.error('Video token error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /appointments/:appointmentId/video/leave
router.post('/appointments/:appointmentId/video/leave', authenticateToken, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const userId = req.user.id;

    // Check active session
    const session = await prisma.videoSession.findFirst({
      where: { 
        appointmentId: BigInt(appointmentId), 
        userId: BigInt(userId), 
        leftAt: null 
      },
      orderBy: { joinedAt: 'desc' }
    });

    if (session) {
      const now = new Date();
      const diffSecs = Math.floor((now.getTime() - session.joinedAt.getTime()) / 1000);
      
      await prisma.videoSession.update({
        where: { id: session.id },
        data: { leftAt: now, durationSeconds: diffSecs }
      });
    } else {
      // Clean up fallback insert
      await prisma.videoSession.create({
        data: {
          appointmentId: BigInt(appointmentId),
          userId: BigInt(userId),
          leftAt: new Date(),
          durationSeconds: 0
        }
      });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Video leave error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
