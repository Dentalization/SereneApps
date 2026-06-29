import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  resolveFacilityIcon,
  resolveHighlightIcon
} from '../src/pages/clinic-portal/public-profile/profileIcons.mjs';

const webRoot = path.resolve(new URL('..', import.meta.url).pathname);
const read = (relativePath) => fs.readFileSync(path.resolve(webRoot, relativePath), 'utf8');

test('public profile resolves clinic features to restrained semantic icons', () => {
  assert.equal(resolveHighlightIcon('parking', ''), 'CircleParking');
  assert.equal(resolveHighlightIcon('', 'Layanan darurat 24 jam'), 'Clock3');
  assert.equal(resolveHighlightIcon('wifi', ''), 'Wifi');
  assert.equal(resolveFacilityIcon('', 'Ruang X-Ray Digital'), 'ScanLine');
  assert.equal(resolveFacilityIcon('', 'Ruang tunggu pasien'), 'Armchair');
  assert.equal(resolveFacilityIcon('sterilization', ''), 'ShieldCheck');
});

test('public profile management UI does not use emoji or hand-authored inline SVG icons', () => {
  const files = [
    'src/pages/clinic-portal/public-profile/index.jsx',
    'src/pages/clinic-portal/public-profile/components/ServicesManagement.jsx',
    'src/pages/clinic-portal/public-profile/components/GalleryManagement.jsx',
    'src/pages/clinic-portal/public-profile/components/HighlightsManagement.jsx',
    'src/pages/clinic-portal/public-profile/components/FacilitiesManagement.jsx'
  ];
  const emojiPattern = /[🩺🦷🔒✨📷🖼️🏥⭐💡📶🅿️💳🧸🕒]/u;

  for (const file of files) {
    const source = read(file);
    assert.equal(source.includes('<svg'), false, file);
    assert.equal(emojiPattern.test(source), false, file);
    assert.match(source, /AppIcon|Icon/, file);
  }
});

test('highlight and facility forms use curated icon categories', () => {
  const highlights = read('src/pages/clinic-portal/public-profile/components/HighlightsManagement.jsx');
  const facilities = read('src/pages/clinic-portal/public-profile/components/FacilitiesManagement.jsx');

  assert.match(highlights, /HIGHLIGHT_ICON_OPTIONS/);
  assert.match(highlights, /Pilih otomatis dari teks/);
  assert.doesNotMatch(highlights, /Enter an icon name or emoji/);
  assert.match(facilities, /FACILITY_ICON_OPTIONS/);
  assert.match(facilities, /Pilih otomatis dari nama/);
});

