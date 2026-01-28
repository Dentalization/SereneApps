/**
 * AI Text Helpers & Normalization
 * STABLE HYBRID VERSION: Combines strict Regex parsing (Legacy) with new Formatting Logic.
 * Prevents "White Blank Page" by keeping all original exports.
 */

const SUMMARY_INTRO_REGEX = /^Tentu,\s*mari\s*kita\s*bahas\s*lebih\s*lanjut\s*mengenai\s*kondisi\s*gigi\s*Anda\s*berdasarkan\s*informasi\s*yang\s*saya\s*miliki\s*dan\s*hasil\s*analisis\s*awal\.?\s*/i;

// Heuristic patterns for deterministic parsing (Indonesian dental domain)
const CONDITION_REGEX = /\b(karies|gigi berlubang|periodontitis|radang gusi|gingivitis|abses|pulpitis|kalkulus|karang gigi|perubahan warna|diskolorisasi|impaksi|gigi bungsu|retak|fraktur|infeksi|ulser|lesi)\b/i;
const LOCATION_REGEX = /\b(gigi\s*\[\d+\]|gigi\s*(depan|belakang|atas|bawah|geraham|taring)|rahang|kuadran\s*\d|kuadran)\b/i;
const PROB_REGEX = /(\d{1,3})\s?%/;
const RECO_REGEX = /\b(segera periksa|kunjungi dokter|rontgen|perawatan|tambalan|mahkota|saluran akar|scaling|bleaching|fluoride|kontrol|pembersihan|perawatan lanjutan)\b/i;
const EDU_REGEX = /\b(karies adalah|seperti yang saya sebutkan|artinya|ialah|adalah kerusakan|berfungsi untuk|ini seperti)\b/i;

const STOP_WORDS_SUMMARY = [
  'Ketika', 'Perawatan', 'Tujuan utama', 'Jika', 'Ini seperti', 'Penyebab', 
  'Rekomendasi', 'Masalah Estetika', 'Nyeri', 'Sensitivitas', 'Infeksi', 'Diagnosa', 'Analisis'
];

const CONDITION_KEYWORDS = [
  'Gigi Berlubang', 'Karies', 'Perubahan Warna', 'Diskolorasi', 'Infeksi', 
  'Radang', 'Gingivitis', 'Periodontitis', 'Abses'
];

/**
 * 1. INJECT LINE BREAKS (Crucial for Raw API Text)
 */
export const injectLineBreaks = (text) => {
  if (!text) return '';
  let processed = String(text);
  // Inject line breaks before semantic headers
  processed = processed.replace(/([.!?])\s*(Mengenai|Ketika|Perawatan|Rekomendasi|Penyebab|Tujuan|Masalah|Analisis|Kesimpulan|Diagnosa)/gi, '$1\n\n$2');
  // Split before numbered lists
  processed = processed.replace(/([.!?])\s+(\d+\.)/g, '$1\n$2');
  // Split before bullet points
  processed = processed.replace(/([.!?])\s+([*-] )/g, '$1\n$2');
  return processed;
};

const cleanBoilerplate = (text = '') => text
  .replace(/^Tentu,\s*mari\s*kita\s*bahas[^.]*\.\s*/i, '')
  .replace(/Seperti yang saya sebutkan sebelumnya,?\s*/gi, '')
  .trim();

const cleanText = (text = '') => {
  const formatted = injectLineBreaks(text || '');
  return cleanBoilerplate(formatted)
    .replace(/\s+/g, ' ')
    .replace(/\[.*?\]/g, '')
    .trim();
};

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

// --- EXPORT 1: Strip Intro ---
export const stripDiagnosisIntro = (text = '') => {
  if (typeof text !== 'string') return '';
  return text.replace(SUMMARY_INTRO_REGEX, '').trim();
};

export const deriveSummaryFromNarrative = (text = '') => {
  if (!text) return '';
  const cleaned = stripDiagnosisIntro(text);
  const sentences = cleaned.match(/[^.!?]+[.!?]+/g) || [];
  const picked = sentences.slice(0, 2).join(' ').trim();
  if (picked) return picked;
  return cleaned.length > 200 ? `${cleaned.slice(0, 200).trim()}...` : cleaned;
};

const splitSentencesStrict = (text = '') => text
  .split(/(?<=[.!?])\s+/)
  .map((s) => s.trim())
  .filter(Boolean);

// --- EXPORT 2: Extract Summary ---
export const extractSummary = (rawText = '') => {
  if (!rawText) return '';
  const cleaned = cleanText(rawText || '');
  const sentences = dedupeSentences(splitSentencesStrict(cleaned));
  const picked = [];
  for (const s of sentences) {
    if (containsStopWord(s)) break;
    if (RECO_REGEX.test(s)) continue;
    if (EDU_REGEX.test(s)) continue;
    if (s.startsWith('Mengenai ')) continue;
    if (s.includes('adalah') && s.includes('yang disebabkan')) continue;
    picked.push(clip(s, 220));
    if (picked.length >= 2) break;
  }
  return picked.join(' ') || 'Analisis singkat tidak tersedia.';
};

// --- EXPORT 3: Extract Diagnosis ---
export const extractDiagnosis = (rawText = '') => {
  if (!rawText) return [];
  const cleaned = cleanText(rawText || '');
  const sentences = splitSentencesStrict(cleaned);
  const items = [];
  for (const keyword of CONDITION_KEYWORDS) {
    const related = sentences.filter((s) => s.toLowerCase().includes(keyword.toLowerCase()));
    if (related.length === 0) continue;
    const explanation = related.filter((s) => !RECO_REGEX.test(s)).slice(0, 2).join(' ');
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

// --- EXPORT 4: Extract Sections ---
export const extractSections = (rawText = '') => {
  const cleaned = injectLineBreaks(rawText);
  const lines = cleaned.split('\n');
  const sections = [];
  let currentSection = null;
  let currentContent = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const headerMatch = trimmed.match(/^(\**?[^:]+?\**?):\s*(.*)$/);
    if (headerMatch && headerMatch[1].length < 60 && headerMatch[1].length > 3) {
      if (currentSection) {
        sections.push({ title: currentSection.replace(/\*\*/g, ''), content: currentContent.join(' ').trim() });
      }
      currentSection = headerMatch[1].trim();
      currentContent = headerMatch[2] ? [headerMatch[2].trim()] : [];
    } else if (currentSection) {
      currentContent.push(trimmed);
    }
  }
  if (currentSection) {
    sections.push({ title: currentSection.replace(/\*\*/g, ''), content: currentContent.join(' ').trim() });
  }
  return sections;
};

// --- 🔥 NEW EXPORT: Robust Markdown Parser (Fixes "Messy Format") ---
export const parseMarkdownText = (text) => {
  if (!text) return [];
  
  let processed = String(text);
  // Fix: "text.**Header**" -> "text.\n\n**Header**"
  processed = processed.replace(/([.!?])\s*(\*\*|##)/g, '$1\n\n$2');
  // Fix: "text.* Item" -> "text.\n* Item"
  processed = processed.replace(/([^\n])\s*(\* |- |\d+\. )/g, '$1\n$2');
  
  const lines = processed.split('\n');
  const structured = [];
  let currentList = null;

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) {
        if (currentList) { structured.push(currentList); currentList = null; }
        return;
    }

    // A. Header
    const isHeader = (trimmed.startsWith('**') && trimmed.endsWith('**') && trimmed.length < 100) || trimmed.startsWith('##');
    if (isHeader) {
      if (currentList) { structured.push(currentList); currentList = null; }
      structured.push({ type: 'header', content: trimmed.replace(/\*\*/g, '').replace(/^##\s*/, '').replace(/:$/, '') });
    }
    // B. List
    else if (trimmed.match(/^(\*|-|\d+\.)\s/)) {
      if (!currentList) currentList = { type: 'list', items: [] };
      currentList.items.push(trimmed.replace(/^(\*|-|\d+\.)\s/, ''));
    }
    // C. Paragraph
    else {
      if (currentList) { structured.push(currentList); currentList = null; }
      const inlineMatch = trimmed.match(/^(\*\*.*?\*\*):?\s*(.*)/);
      if (inlineMatch) {
         structured.push({ type: 'header_paragraph', title: inlineMatch[1].replace(/\*\*/g, ''), content: inlineMatch[2] });
      } else {
         structured.push({ type: 'paragraph', content: trimmed });
      }
    }
  });
  
  if (currentList) structured.push(currentList);
  return structured;
};

// --- Main Normalizer (Updated) ---
export const normalizeAIText = (rawText = '') => ({
  summary: extractSummary(rawText),
  diagnosis: extractDiagnosis(rawText),
  sections: extractSections(rawText),
  structured: parseMarkdownText(rawText) // Added for UI
});

export const normalizeAIExplanation = normalizeAIText;

// Default export (Includes EVERYTHING to stay safe)
export default {
  injectLineBreaks,
  stripDiagnosisIntro,
  extractSummary,
  extractDiagnosis,
  extractSections,
  parseMarkdownText,
  normalizeAIText,
  normalizeAIExplanation
};