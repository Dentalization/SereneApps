import twilio from 'twilio';
import { PrismaClient } from '@prisma/client';
import { getTwilioStandardKeyConfig, getWebhookBaseUrl } from './config.js';
import { videoRoomNameForAppointment } from './naming.js';
import { logCommunicationEvent } from './logging.js';

const prisma = new PrismaClient();

export default class VideoService {
  constructor() {
    const config = getTwilioStandardKeyConfig();
    this.client = twilio(config.apiKeySid, config.apiKeySecret, { accountSid: config.accountSid });
    this.accountSid = config.accountSid;
    this.apiKeySid = config.apiKeySid;
    this.apiKeySecret = config.apiKeySecret;
    this.webhookBaseUrl = getWebhookBaseUrl();
  }

  async ensureRoom(appointmentId) {
    const roomName = videoRoomNameForAppointment(appointmentId);
    const appointment = await prisma.appointment.findUnique({
      where: { id: BigInt(appointmentId) },
      select: {
        id: true,
        videoRoomRef: true,
        video_room_sid: true
      }
    });

    if (!appointment) {
      const error = new Error('APPOINTMENT_NOT_FOUND');
      error.status = 404;
      throw error;
    }

    if (appointment.video_room_sid && appointment.videoRoomRef === roomName) {
      return { roomSid: appointment.video_room_sid, roomName };
    }

    let roomSid;
    const apiPrefix = `/${process.env.API_VERSION || 'v1'}`;
    const callbackBase = this.webhookBaseUrl.endsWith(apiPrefix)
      ? this.webhookBaseUrl
      : `${this.webhookBaseUrl}${apiPrefix}`;

    try {
      const room = await this.client.video.v1.rooms.create({
        uniqueName: roomName,
        type: 'go',
        statusCallback: this.webhookBaseUrl
          ? `${callbackBase}/webhooks/twilio/video`
          : undefined
      });
      roomSid = room.sid;
    } catch (err) {
      if (err.code === 53113) {
        const room = await this.client.video.v1.rooms(roomName).fetch();
        roomSid = room.sid;
      } else {
        throw err;
      }
    }

    await prisma.appointment.update({
      where: { id: BigInt(appointmentId) },
      data: {
        video_room_sid: roomSid,
        videoRoomRef: roomName
      }
    });

    logCommunicationEvent('room_ensured', {
      appointmentId,
      roomName,
      roomSid
    });

    return { roomSid, roomName };
  }

  async generateVideoToken({ identity, roomName, ttl = 14400 }) {
    const AccessToken = twilio.jwt.AccessToken;
    const VideoGrant = AccessToken.VideoGrant;

    const token = new AccessToken(
      this.accountSid,
      this.apiKeySid,
      this.apiKeySecret,
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

  async disconnectParticipant({ roomSid, identity }) {
    if (!roomSid || !identity) return { disconnected: false };
    try {
      await this.client.video.v1
        .rooms(roomSid)
        .participants(identity)
        .update({ status: 'disconnected' });
      return { disconnected: true };
    } catch (error) {
      if (Number(error?.status || error?.statusCode) === 404 || Number(error?.code) === 20404) {
        return { disconnected: false };
      }
      throw error;
    }
  }

  async completeRoom(roomSid) {
    if (!roomSid) return { ended: false };
    try {
      const room = await this.client.video.v1.rooms(roomSid).update({ status: 'completed' });
      return { ended: true, roomSid: room.sid, status: room.status };
    } catch (error) {
      if (Number(error?.status || error?.statusCode) === 404 || Number(error?.code) === 20404) {
        return { ended: false };
      }
      throw error;
    }
  }
}
