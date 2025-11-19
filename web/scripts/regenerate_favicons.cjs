#!/usr/bin/env node
// Regenerate favicons by trimming transparent padding and centering the glyph at a larger scale.
// Usage: node scripts/regenerate_favicons.cjs

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

(async () => {
  try {
    const publicDir = path.join(process.cwd(), 'public');
    const source = path.join(publicDir, 'icon-512.png');
    if (!fs.existsSync(source)) {
      console.error('Source icon not found:', source);
      process.exit(1);
    }

  const sizes = [512, 192, 180, 64, 48, 32, 16];
  // Percentage of canvas to fill with glyph (leave some margin)
  // Can be overridden with environment variable FILL_PERCENT (e.g. FILL_PERCENT=0.92)
  // For very small sizes (16/32) Safari can still make the glyph look tiny; allow a larger fill for small icons.
  const defaultFillPercent = process.env.FILL_PERCENT ? parseFloat(process.env.FILL_PERCENT) : 0.92; // default to 92% of size
  const smallFillPercent = process.env.SMALL_FILL_PERCENT ? parseFloat(process.env.SMALL_FILL_PERCENT) : 1.6; // 160% for small canvases (will be cropped)

    // Load source, trim transparent edges
    const srcBuffer = await sharp(source)
      .png()
      .trim() // remove surrounding background similar to ImageMagick -trim
      .toBuffer();

    const meta = await sharp(srcBuffer).metadata();
    console.log('Trimmed glyph size:', meta.width, 'x', meta.height);

    for (const size of sizes) {
      console.log('\nProcessing size:', size);
  // use a larger fill percent for very small icons so the glyph intentionally overflows and is cropped to fill the canvas
  const fillForThisSize = size <= 32 ? smallFillPercent : defaultFillPercent;
  const inner = Math.round(size * fillForThisSize);

      // Resize trimmed glyph to the target inner square using 'cover' so it fills the inner area.
      const glyphResizedBuffer = await sharp(srcBuffer)
        .resize({ width: inner, height: inner, fit: 'cover' })
        .png()
        .toBuffer();

      const glyphMeta = await sharp(glyphResizedBuffer).metadata();
      console.log(' inner:', inner, ' glyph after resize:', glyphMeta.width + 'x' + glyphMeta.height);

      // If the resized glyph is larger than the target size, crop the centered area; otherwise composite centered on transparent canvas.
      let finalImageBuffer;
      if (inner > size) {
        const extractLeft = Math.floor((inner - size) / 2);
        const extractTop = Math.floor((inner - size) / 2);
        finalImageBuffer = await sharp(glyphResizedBuffer).extract({ left: extractLeft, top: extractTop, width: size, height: size }).png().toBuffer();
      } else {
        const glyphW = glyphMeta.width;
        const glyphH = glyphMeta.height;
        const left = Math.floor((size - glyphW) / 2);
        const top = Math.floor((size - glyphH) / 2);
        finalImageBuffer = await sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
          .composite([{ input: glyphResizedBuffer, left, top }])
          .png({ compressionLevel: 9 })
          .toBuffer();
      }

      const outPath = path.join(publicDir, `icon-${size}.png`);
      try {
        await sharp(finalImageBuffer).toFile(outPath);
      } catch (err) {
        console.error('Failed writing', outPath, '— debug:', { size, inner, glyphMeta });
        throw err;
      }

      console.log('Wrote', outPath);
    }

    console.log('Favicons regenerated. Please hard-refresh browser cache or open in incognito to see changes.');
  } catch (e) {
    console.error('Error regenerating favicons:', e);
    process.exit(1);
  }
})();
