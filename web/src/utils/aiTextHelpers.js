const SUMMARY_INTRO_REGEX = /^Tentu,\s*mari\s*kita\s*bahas\s*lebih\s*lanjut\s*mengenai\s*kondisi\s*gigi\s*Anda\s*berdasarkan\s*informasi\s*yang\s*saya\s*miliki\s*dan\s*hasil\s*analisis\s*awal\.?\s*/i;

// Heuristic patterns for deterministic parsing (Indonesian dental domain)
const CONDITION_REGEX = /\b(karies|gigi berlubang|periodontitis|radang gusi|gingivitis|abses|pulpitis|kalkulus|karang gigi|perubahan warna|diskolorisasi|impaksi|gigi bungsu|retak|fraktur|infeksi|ulser|lesi)\b/i;
const LOCATION_REGEX = /\b(gigi\s*\[\d+\]|gigi\s*(depan|belakang|atas|bawah|geraham|taring)|rahang|kuadran\s*\d|kuadran)\b/i;
const PROB_REGEX = /(\d{1,3})\s?%/;
const RECO_REGEX = /\b(segera periksa|kunjungi dokter|rontgen|perawatan|tambalan|mahkota|saluran akar|scaling|bleaching|fluoride|kontrol|pembersihan|perawatan lanjutan)\b/i;
const EDU_REGEX = /\b(karies adalah|seperti yang saya sebutkan|artinya|ialah|adalah kerusakan|berfungsi untuk|ini seperti)\b/i;

const STOP_WORDS_SUMMARY = [
  'Ketika',
  'Perawatan',
  'Tujuan utama',
  'Jika',
  'Ini seperti',
  'Penyebab',
  'Rekomendasi',
  'Masalah Estetika',
  'Nyeri',
  'Sensitivitas',
  'Infeksi',
];

const CONDITION_KEYWORDS = [
  'Gigi Berlubang',
  'Karies',
  'Perubahan Warna',
  'Diskolorasi',
  'Infeksi',
  'Radang',
];

const sentenceSplit = (text = '') => text
  .replace(/\r/g, ' ')
  .replace(/\s+/g, ' ')
  .replace(/[\n•\-]\s*/g, '. ')
  .split(/(?<=[.!?])\s+/)
  .map((s) => s.trim())
  .filter(Boolean);

const cleanBoilerplate = (text = '') => text
  .replace(/^Tentu,\s*mari\s*kita\s*bahas[^.]*\.\s*/i, '')
  .replace(/Seperti yang saya sebutkan sebelumnya,?\s*/gi, '')
  .trim();

const cleanText = (text = '') => cleanBoilerplate(text)
  .replace(/\s+/g, ' ')
  .replace(/\[.*?\]/g, '')
  .trim();

const dedupeSentences = (sentences = []) => {
  const seen = new Set();
  return sentences.filter((s) => {
    const key = s.toLowerCase().slice(0, 120);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const clip = (text = '', max = 220) => {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}...`;
};

const containsStopWord = (sentence = '') => STOP_WORDS_SUMMARY.some((word) => sentence.toLowerCase().startsWith(word.toLowerCase()));

export const stripDiagnosisIntro = (text = '') => {
  if (typeof text !== 'string') return '';
  return text.replace(SUMMARY_INTRO_REGEX, '').trim();
};

/**
 * Take a verbose AI narrative and extract a short 1–2 sentence summary
 * after removing the boilerplate intro.
 */
export const deriveSummaryFromNarrative = (text = '') => {
  if (!text) return '';
  const cleaned = stripDiagnosisIntro(text);
  const sentences = cleaned.match(/[^.!?]+[.!?]+/g) || [];
  const picked = sentences.slice(0, 2).join(' ').trim();
  if (picked) return picked;
  return cleaned.length > 200 ? `${cleaned.slice(0, 200).trim()}...` : cleaned;
};

// Strict sentence splitter for summary/diagnosis extraction
const splitSentencesStrict = (text = '') => text
  .split(/(?<=[.!?])\s+/)
  .map((s) => s.trim())
  .filter(Boolean);

/**
 * Deterministically extract a concise Summary (max 2 sentences, no treatment/education, stops on stop words).
 */
export const extractSummary = (rawText = '') => {
  if (!rawText) return '';

  const cleaned = cleanText(rawText || '');
  const sentences = dedupeSentences(splitSentencesStrict(cleaned));
  const picked = [];

  for (const s of sentences) {
    if (containsStopWord(s)) break; // stop when narrative shifts to treatment/implication
    if (RECO_REGEX.test(s)) continue; // skip recommendations
    if (EDU_REGEX.test(s)) continue; // skip education/analogies
    if (s.startsWith('Mengenai ')) continue; // avoid repeating section headers in summary

    // Skip definisi edukatif "adalah ... yang disebabkan"
    if (s.includes('adalah') && s.includes('yang disebabkan')) continue;

    picked.push(clip(s, 220));
    if (picked.length >= 2) break; // hard cap 2 sentences
  }

  return picked.join(' ') || 'Analisis singkat tidak tersedia.';
};

/**
 * Deterministically extract structured diagnoses (condition + optional location/probability + short explanation ≤2 sentences).
 */
export const extractDiagnosis = (rawText = '') => {
  if (!rawText) return [];

  const cleaned = cleanText(rawText || '');
  const sentences = splitSentencesStrict(cleaned);
  const items = [];

  for (const keyword of CONDITION_KEYWORDS) {
    const related = sentences.filter((s) => s.toLowerCase().includes(keyword.toLowerCase()));
    if (related.length === 0) continue;

    const explanation = related
      .filter((s) => !RECO_REGEX.test(s))
      .slice(0, 2)
      .join(' ');

    const locationMatch = explanation.match(/gigi\s+(depan|belakang|atas|bawah).*?\d+/i) || explanation.match(LOCATION_REGEX);
    const probabilityMatch = rawText.match(/(\d{1,3})%\s*probability/i) || rawText.match(PROB_REGEX);

    const key = `${keyword.toLowerCase()}|${locationMatch?.[0]?.toLowerCase() || ''}`;
    const existing = items.find((i) => i.__key === key);
    if (existing) {
      if (probabilityMatch) {
        const prob = Math.max(0, Math.min(100, parseInt(probabilityMatch[1], 10)));
        if ((existing.probability || 0) < prob) existing.probability = prob;
      }
      continue;
    }

    items.push({
      __key: key,
      condition: keyword,
      location: locationMatch ? locationMatch[0] : undefined,
      probability: probabilityMatch ? Math.max(0, Math.min(100, parseInt(probabilityMatch[1], 10))) : undefined,
      shortExplanation: explanation ? clip(explanation, 220) : undefined,
    });
  }

  return items.map(({ __key, ...rest }) => rest);
};

export const normalizeAIText = (rawText = '') => ({
  summary: extractSummary(rawText),
  diagnosis: extractDiagnosis(rawText),
});
