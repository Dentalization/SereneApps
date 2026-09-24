import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import { sha256File } from './scanStorage.js';
const execute = promisify(execFile);
export const MAX_VIDEO_BYTES = 512 * 1024 * 1024;

export function parseVideoProbe(probe) {
  const videos = (probe.streams || []).filter(s => s.codec_type === 'video' && !s.disposition?.attached_pic);
  const stream = videos[0];
  const duration = Number(stream?.duration || probe.format?.duration);
  const [numerator, denominator = 1] = String(stream?.avg_frame_rate || '').split('/').map(Number);
  const fps = numerator / denominator;
  if (!stream || videos.length !== 1 || !['h264', 'hevc', 'vp8', 'vp9', 'av1', 'mpeg4'].includes(stream.codec_name)
      || !Number.isFinite(duration) || duration <= 0 || duration > 180
      || !Number.isFinite(fps) || fps <= 0 || fps > 120
      || !Number.isInteger(stream.width) || !Number.isInteger(stream.height)
      || Math.min(stream.width, stream.height) < 64 || Math.max(stream.width, stream.height) > 7680) {
    throw Object.assign(new Error('Video has unsupported or invalid media properties'), { status: 422, code: 'INVALID_VIDEO' });
  }
  const format = String(probe.format?.format_name);
  const webm = format.includes('webm') && ['vp8', 'vp9', 'av1'].includes(stream.codec_name);
  if (!webm && !/(?:^|,)(mov|mp4)(?:,|$)/.test(format)) throw Object.assign(new Error('Unsupported video container'), { status: 422, code: 'INVALID_VIDEO' });
  return { codec: stream.codec_name, width: stream.width, height: stream.height,
    resolution: `${stream.width}x${stream.height}`, durationMs: Math.round(duration * 1000), fps,
    format: probe.format?.format_name, extension: webm ? '.webm' : '.mp4',
    mimeType: webm ? 'video/webm' : 'video/mp4', inspectedBy: 'ffprobe', metadataSource: 'server_probe' };
}

export async function inspectVideo(filePath) {
  const stat = await fs.stat(filePath);
  if (!stat.isFile() || stat.size <= 0 || stat.size > MAX_VIDEO_BYTES) {
    throw Object.assign(new Error('Video file is empty or exceeds the 512 MiB limit'), { status: 413, code: 'VIDEO_SIZE_LIMIT' });
  }
  let probe;
  try {
    const { stdout } = await execute(process.env.FFPROBE_PATH || 'ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', filePath], { timeout: 15000, maxBuffer: 1024 * 1024 });
    probe = JSON.parse(stdout);
  } catch (error) {
    if (error.code === 'ENOENT') throw Object.assign(new Error('Server media inspection is unavailable'), { status: 503, code: 'MEDIA_INSPECTION_UNAVAILABLE' });
    throw Object.assign(new Error('Video could not be inspected; capture and upload a new recording'), { status: 422, code: 'INVALID_VIDEO' });
  }
  const video = parseVideoProbe(probe);
  // Probe validates container metadata; decode the stream as well to reject corrupt/truncated payloads.
  try {
    await execute(process.env.FFMPEG_PATH || 'ffmpeg', ['-nostdin', '-v', 'error', '-xerror', '-i', filePath, '-map', '0:v:0', '-an', '-f', 'null', '-'], { timeout: 120000, maxBuffer: 1024 * 1024 });
  } catch (error) {
    if (error.code === 'ENOENT') throw Object.assign(new Error('Server video decoding is unavailable'), { status: 503, code: 'MEDIA_INSPECTION_UNAVAILABLE' });
    throw Object.assign(new Error('Video decoding failed; capture and upload a new recording'), { status: 422, code: 'INVALID_VIDEO' });
  }
  return { ...video, sizeInBytes: stat.size, checksum: await sha256File(filePath), inspectedAt: new Date().toISOString(), decodeVerified: true };
}
