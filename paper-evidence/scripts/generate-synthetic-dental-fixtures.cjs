const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { ensureDir, repoRootFromScript } = require('./experiment-utils.cjs');

const root = repoRootFromScript();
const defaultOutDir = path.join(root, 'paper-evidence', 'fixtures', 'synthetic_dental_images');

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let k = 0; k < 8; k += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function clamp(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function toothIntensity(x, y, centerX, centerY, radiusX, radiusY, shade) {
  const dx = (x - centerX) / radiusX;
  const dy = (y - centerY) / radiusY;
  const distance = (dx * dx) + (dy * dy);
  if (distance > 1) return 0;
  const edge = Math.max(0, 1 - distance);
  return shade * (0.45 + edge * 0.55);
}

function generatePixels(width, height, variant) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  const teeth = [];
  const count = 14;
  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1);
    const archX = width * (0.12 + 0.76 * t);
    const archY = height * (0.52 + 0.20 * Math.sin((t - 0.5) * Math.PI));
    teeth.push({
      x: archX,
      y: archY + Math.sin(variant + i) * 4,
      rx: width * (0.026 + ((i + variant) % 3) * 0.003),
      ry: height * (0.105 + (i % 2) * 0.012),
      shade: 150 + ((i * 13 + variant * 17) % 45),
    });
  }

  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 3 + 1);
    raw[rowStart] = 0;
    for (let x = 0; x < width; x += 1) {
      const gradient = 18 + (y / height) * 26;
      const noise = ((x * 17 + y * 31 + variant * 23) % 19) - 9;
      let value = gradient + noise;

      for (const tooth of teeth) {
        value += toothIntensity(x, y, tooth.x, tooth.y, tooth.rx, tooth.ry, tooth.shade);
        value += toothIntensity(x, y, tooth.x, tooth.y + height * 0.17, tooth.rx * 0.45, tooth.ry * 0.55, tooth.shade * 0.45);
      }

      const canal = Math.abs(y - (height * 0.74 + Math.sin(x / 55 + variant) * 7));
      if (canal < 2.5 && x > width * 0.15 && x < width * 0.85) value += 26;

      const pixel = clamp(value);
      const offset = rowStart + 1 + x * 3;
      raw[offset] = pixel;
      raw[offset + 1] = pixel;
      raw[offset + 2] = pixel;
    }
  }
  return raw;
}

function encodePng(width, height, raw) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function generateFixtures({ outDir = defaultOutDir, count = 30, width = 1024, height = 512 } = {}) {
  ensureDir(outDir);
  const files = [];
  for (let i = 1; i <= count; i += 1) {
    const raw = generatePixels(width, height, i);
    const png = encodePng(width, height, raw);
    const filePath = path.join(outDir, `synthetic_opg_${String(i).padStart(3, '0')}.png`);
    fs.writeFileSync(filePath, png);
    files.push(filePath);
  }
  return files;
}

if (require.main === module) {
  const countIndex = process.argv.indexOf('--count');
  const outIndex = process.argv.indexOf('--out-dir');
  const count = countIndex >= 0 ? Number(process.argv[countIndex + 1]) : Number(process.env.SYNTHETIC_IMAGE_COUNT || 30);
  const outDir = outIndex >= 0 ? path.resolve(process.argv[outIndex + 1]) : defaultOutDir;
  const files = generateFixtures({ outDir, count });
  console.log(JSON.stringify({ outDir, count: files.length, files }, null, 2));
}

module.exports = {
  generateFixtures,
};
