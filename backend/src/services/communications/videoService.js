import twilio from 'twilio';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default class VideoService {
  constructor() {
    this.client = twilio(process.env.TWILIO_API_KEY_SID, process.env.TWILIO_API_KEY_SECRET, { accountSid: process.env.TWILIO_ACCOUNT_SID });
    this.webhookBaseUrl = process.env.TWILIO_WEBHOOK_BASE_URL || process.env.API_BASE_URL;
  }

  async ensureRoom(appointmentId) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: BigInt(appointmentId) }
    });

    if (appointment && appointment.video_room_sid) {
      return { roomSid: appointment.video_room_sid, roomName: `appointment-${appointmentId}` };
    }

    const uniqueName = `appointment-${appointmentId}`;
    let roomSid;

    try {
      const room = await this.client.video.v1.rooms.create({
        uniqueName,
        type: 'go',
        statusCallback: this.webhookBaseUrl ? `${this.webhookBaseUrl}/webhooks/twilio/video` : undefined
      });
      roomSid = room.sid;
    } catch (err) {
      if (err.code === 53113) {
        // Idempotent recovery
        const room = await this.client.video.v1.rooms(uniqueName).fetch();
        roomSid = room.sid;
      } else {
        throw err;
      }
    }

    await prisma.appointment.update({
      where: { id: BigInt(appointmentId) },
      data: { video_room_sid: roomSid }
    });

    return { roomSid, roomName: uniqueName };
  }

  async generateVideoToken({ identity, roomName, ttl = 14400 }) {
    const AccessToken = twilio.jwt.AccessToken;
    const VideoGrant = AccessToken.VideoGrant;

    const token = new AccessToken(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_API_KEY_SID,
      process.env.TWILIO_API_KEY_SECRET,
      { identity, ttl }
    );

    const grant = new VideoGrant({ room: roomName });
    token.addGrant(grant);

    return {
      token: token.toJwt(),
      roomName,
      identity,
      expiresAt: new Date(Date.now() + ttl * 1000).toISOString()
    };
  }

  async getRoom(roomSid) {
    const room = await this.client.video.v1.rooms(roomSid).fetch();
    return {
      sid: room.sid,
      status: room.status,
      duration: room.duration,
      participants: room.participants || []
    };
  }
}
