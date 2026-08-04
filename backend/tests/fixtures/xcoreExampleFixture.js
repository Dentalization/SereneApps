import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_FIXTURE = path.resolve(__dirname, '../../../web/public/assets/imagesTesting/test4.png');

function overlaySvg(width, height, { markerNumber, markerX, markerY, measurement = false }) {
  const radius = Math.max(15, Math.round(Math.min(width, height) * 0.035));
  const measurementSvg = measurement
    ? `<line x1="${Math.round(width * 0.28)}" y1="${Math.round(height * 0.36)}" x2="${Math.round(width * 0.56)}" y2="${Math.round(height * 0.66)}" stroke="#34d399" stroke-width="5"/>
       <circle cx="${Math.round(width * 0.28)}" cy="${Math.round(height * 0.36)}" r="6" fill="#34d399"/>
       <circle cx="${Math.round(width * 0.56)}" cy="${Math.round(height * 0.66)}" r="6" fill="#34d399"/>`
    : '';
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="${Math.round(width * 0.49)}" cy="${Math.round(height * 0.49)}" rx="${Math.round(width * 0.11)}" ry="${Math.round(height * 0.16)}" fill="none" stroke="#f59e0b" stroke-width="5"/>
    ${measurementSvg}
    <circle cx="${markerX}" cy="${markerY}" r="${radius + 4}" fill="#020617"/>
    <circle cx="${markerX}" cy="${markerY}" r="${radius}" fill="#0e7490" stroke="#ffffff" stroke-width="4"/>
    <text x="${markerX}" y="${markerY + Math.round(radius * 0.38)}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${Math.round(radius * 1.25)}" font-weight="800" fill="#ffffff">${markerNumber}</text>
  </svg>`);
}

async function annotate(buffer, markerNumber, markerPosition, measurement = false) {
  const metadata = await sharp(buffer).metadata();
  return sharp(buffer).composite([{ input: overlaySvg(metadata.width, metadata.height, {
    markerNumber,
    markerX: Math.round(metadata.width * markerPosition.x),
    markerY: Math.round(metadata.height * markerPosition.y),
    measurement,
  }) }]).png().toBuffer();
}

export async function buildXCoreExampleFixture() {
  const source = await fs.readFile(REPOSITORY_FIXTURE);
  const pa11Clean = await sharp(source).extract({ left: 445, top: 55, width: 390, height: 620 }).png().toBuffer();
  const pa36Clean = await sharp(source).extract({ left: 120, top: 55, width: 390, height: 620 }).png().toBuffer();
  const panoClean = await sharp(source).resize({ width: 1400, withoutEnlargement: true }).png().toBuffer();
  const annotated = {
    pa11: await annotate(pa11Clean, 1, { x: 0.72, y: 0.28 }, true),
    pa36: await annotate(pa36Clean, 1, { x: 0.32, y: 0.68 }, true),
    pano: await annotate(panoClean, 1, { x: 0.58, y: 0.56 }, false),
  };
  return { sourcePath: REPOSITORY_FIXTURE, clean: { pa11: pa11Clean, pa36: pa36Clean, pano: panoClean }, annotated };
}
