#!/usr/bin/env node
// Generate solid-background favicon variants for Safari (16px & 32px)
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

(async () => {
  try {
    const publicDir = path.join(process.cwd(), 'public');
    const sizes = [32, 16];
    for (const size of sizes) {
      const src = path.join(publicDir, `icon-${size}.png`);
      if (!fs.existsSync(src)) {
        console.error('Source not found for', src);
        continue;
      }

      const bgColor = process.env.SOLID_BG || '#ffffff';
      const overlay = await sharp(src).png().toBuffer();

      const outPath = path.join(publicDir, `icon-${size}-solid.png`);

      await sharp({ create: { width: size, height: size, channels: 4, background: bgColor } })
        .composite([{ input: overlay, gravity: 'center' }])
        .png({ compressionLevel: 9 })
        .toFile(outPath);

      console.log('Wrote', outPath);
    }

    console.log('Solid icons generated. Copy them to build/ if needed.');
  } catch (e) {
    console.error('Error generating solid icons:', e);
    process.exit(1);
  }
})();
