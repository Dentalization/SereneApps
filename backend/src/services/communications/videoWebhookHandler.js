import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function handleVideoEvent(event) {
  const {
    StatusCallbackEvent,
    RoomSid,
    RoomName,
    RoomDuration,
    ParticipantIdentity,
    Timestamp,
  } = event;

  switch (StatusCallbackEvent) {
    case 'room-ended': {
      if (!RoomName || !RoomName.startsWith('appointment-')) return { skipped: true };
      
      const appointmentId = Number(RoomName.split('-')[1]);
      if (isNaN(appointmentId)) return { skipped: true };

      const appointment = await prisma.appointment.findUnique({
        where: { id: BigInt(appointmentId) }
      });

      if (appointment && appointment.status === 'confirmed') {
        await prisma.appointment.update({
          where: { id: BigInt(appointmentId) },
          data: { status: 'completed' }
        });

        await prisma.appointmentStatusHistory.create({
          data: {
            appointmentId: BigInt(appointmentId),
            newStatus: 'completed',
            previousStatus: 'confirmed',
            reason: 'video_session_ended',
            metadata: {
              roomSid: RoomSid,
              durationSeconds: Number(RoomDuration)
            }
          }
        });

        await prisma.domainEventOutbox.create({
          data: {
            eventType: 'video_session_ended',
            aggregateType: 'appointment',
            aggregateId: String(appointmentId),
            payload: {
              appointmentId,
              roomSid: RoomSid,
              durationSeconds: Number(RoomDuration)
            }
          }
        });
      }

      return { processed: true };
    }
    
    case 'participant-connected': {
      if (!RoomName || !RoomName.startsWith('appointment-')) return { skipped: true };
      
      const appointmentId = Number(RoomName.split('-')[1]);
      if (isNaN(appointmentId) || !ParticipantIdentity) return { skipped: true };

      const existing = await prisma.videoSession.findFirst({
         where: { appointmentId: BigInt(appointmentId), userId: BigInt(ParticipantIdentity), leftAt: null }
      });

      if (!existing) {
         await prisma.videoSession.create({
            data: {
              appointmentId: BigInt(appointmentId),
              userId: BigInt(ParticipantIdentity),
              joinedAt: new Date(Timestamp)
            }
         });
      } else {
         await prisma.videoSession.update({
            where: { id: existing.id },
            data: { joinedAt: new Date(Timestamp) }
         });
      }

      return { processed: true };
    }

    case 'participant-disconnected': {
        if (!RoomName || !RoomName.startsWith('appointment-')) return { skipped: true };
        
        const appointmentId = Number(RoomName.split('-')[1]);
        if (isNaN(appointmentId) || !ParticipantIdentity) return { skipped: true };

        const session = await prisma.videoSession.findFirst({
            where: {
                appointmentId: BigInt(appointmentId),
                userId: BigInt(ParticipantIdentity),
                leftAt: null
            },
            orderBy: { joinedAt: 'desc' }
        });

        if (session) {
            const leftAt = new Date(Timestamp);
            const durationSeconds = Math.round((leftAt.getTime() - session.joinedAt.getTime()) / 1000);
            
            await prisma.videoSession.update({
                where: { id: session.id },
                data: {
                    leftAt,
                    durationSeconds
                }
            });
        }
        return { processed: true };
    }

    default:
      return { skipped: true };
  }
}
