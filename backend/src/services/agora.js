import pkg from 'agora-access-token';

const { RtcTokenBuilder, RtcRole } = pkg;

const AGORA_APP_ID = process.env.AGORA_APP_ID || '';
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || '';

if (AGORA_APP_ID && !AGORA_APP_CERTIFICATE) {
  console.warn('⚠️ AGORA_APP_CERTIFICATE is missing. Video tokens will not be generated.');
}

export function buildAgoraToken({ channelName, uid, role = 'publisher', expireSeconds = 3600 }) {
  if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
    throw new Error('AGORA_CONFIG_MISSING');
  }

  const agoraRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
  const currentTs = Math.floor(Date.now() / 1000);
  const privilegeExpire = currentTs + expireSeconds;

  return RtcTokenBuilder.buildTokenWithAccount(
    AGORA_APP_ID,
    AGORA_APP_CERTIFICATE,
    channelName,
    uid.toString(),
    agoraRole,
    privilegeExpire
  );
}
