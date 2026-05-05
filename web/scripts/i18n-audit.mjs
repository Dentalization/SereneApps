import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(process.cwd(), 'src');
const failOnMissingKeys = process.argv.includes('--fail-on-missing-keys');
const failOnHardcoded = process.argv.includes('--fail-on-hardcoded');
const failOnParity = process.argv.includes('--fail-on-parity');

const ignoredDirs = new Set(['node_modules', 'build', 'dist']);
const fileExtensions = new Set(['.js', '.jsx', '.ts', '.tsx']);
const hardcodedPattern = />\s*([A-Za-zÀ-ž][^<>{}`\n]{1,140})<|(?:placeholder|title|aria-label)=["']([A-Za-zÀ-ž][^"']{1,140})["']|toast\.(?:success|error|info|warning)\(["']([A-Za-zÀ-ž][^"']{1,140})["']/g;
const tCallPattern = /\b(?:t|tSafe)\(\s*['"]([^'"]+)['"]/g;

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (fileExtensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

function mergeDeep(target, source) {
  if (!source || typeof source !== 'object') return target;
  if (Array.isArray(source)) return [...source];
  const output = target && typeof target === 'object' && !Array.isArray(target)
    ? { ...target }
    : {};
  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
      output[key] = mergeDeep(output[key] || {}, sourceValue);
    } else {
      output[key] = sourceValue;
    }
  }
  return output;
}

async function loadBundle(language) {
  const importTranslationModule = async (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
    return (await import(moduleUrl)).default || {};
  };

  const base = await importTranslationModule(path.resolve(process.cwd(), `src/translations/${language}.js`));
  let merged = base;
  try {
    const extra = await importTranslationModule(path.resolve(process.cwd(), `src/translations/${language}2.js`));
    merged = mergeDeep(merged, extra);
  } catch (_) {
    // Extended translation files are optional.
  }
  try {
    const coverage = await importTranslationModule(path.resolve(process.cwd(), 'src/translations/coverage.js'));
    merged = mergeDeep(merged, coverage[language] || {});
  } catch (_) {
    // Coverage translation file is optional.
  }
  return merged;
}

function resolveKey(bundle, key) {
  return key.split('.').reduce((value, part) => (
    value && typeof value === 'object' ? value[part] : undefined
  ), bundle);
}

function flattenKeys(source, prefix = '', keys = new Set()) {
  if (!source || typeof source !== 'object') return keys;
  for (const [key, value] of Object.entries(source)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flattenKeys(value, next, keys);
    } else {
      keys.add(next);
    }
  }
  return keys;
}

function isLikelyNonUserText(value) {
  const text = value.trim();
  if (!text) return true;
  if (/^(http|https|mailto|tel):/i.test(text)) return true;
  if (/^[A-Z0-9_./:-]+$/.test(text)) return true;
  if (/^(px|ms|s|m|min|kg|cm|mm|IDR|USD|Rp|\d|#)/.test(text)) return true;
  if (/^[{}()[\].,;:+*/%<>=!?|&-]+$/.test(text)) return true;
  return false;
}

const files = walk(root);
const usedKeys = new Map();
const hardcoded = [];

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = tCallPattern.exec(source))) {
    const key = match[1];
    if (!usedKeys.has(key)) usedKeys.set(key, []);
    usedKeys.get(key).push(path.relative(process.cwd(), file));
  }

  while ((match = hardcodedPattern.exec(source))) {
    const text = (match[1] || match[2] || match[3] || '').trim().replace(/\s+/g, ' ');
    if (isLikelyNonUserText(text)) continue;
    const line = source.slice(0, match.index).split('\n').length;
    hardcoded.push({
      file: path.relative(process.cwd(), file),
      line,
      text
    });
  }
}

const bundles = {
  en: await loadBundle('en'),
  id: await loadBundle('id')
};

const missingByLanguage = Object.fromEntries(Object.entries(bundles).map(([language, bundle]) => [
  language,
  [...usedKeys.keys()].filter((key) => resolveKey(bundle, key) === undefined).sort()
]));
const flattened = {
  en: flattenKeys(bundles.en),
  id: flattenKeys(bundles.id)
};
const parity = {
  onlyInEn: [...flattened.en].filter((key) => !flattened.id.has(key)).sort(),
  onlyInId: [...flattened.id].filter((key) => !flattened.en.has(key)).sort()
};

console.log(`i18n audit: ${files.length} source files scanned`);
console.log(`i18n audit: ${usedKeys.size} translation keys used`);
for (const [language, missing] of Object.entries(missingByLanguage)) {
  console.log(`i18n audit: ${language} missing keys: ${missing.length}`);
  missing.slice(0, 50).forEach((key) => console.log(`  ${key}`));
}
console.log(`i18n audit: keys only in en: ${parity.onlyInEn.length}`);
parity.onlyInEn.slice(0, 50).forEach((key) => console.log(`  ${key}`));
console.log(`i18n audit: keys only in id: ${parity.onlyInId.length}`);
parity.onlyInId.slice(0, 50).forEach((key) => console.log(`  ${key}`));
console.log(`i18n audit: hardcoded JSX candidates: ${hardcoded.length}`);
hardcoded.slice(0, 80).forEach((item) => {
  console.log(`  ${item.file}:${item.line} ${item.text}`);
});

const hasMissingKeys = Object.values(missingByLanguage).some((missing) => missing.length > 0);
const hasParityDrift = parity.onlyInEn.length > 0 || parity.onlyInId.length > 0;
if (
  (failOnMissingKeys && hasMissingKeys)
  || (failOnParity && hasParityDrift)
  || (failOnHardcoded && hardcoded.length > 0)
) {
  process.exit(1);
}
