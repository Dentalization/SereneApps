const MAX_CONTEXT_LENGTH = 6000;
const MAX_REFERENCE_QUESTION_LENGTH = 2000;

function compact(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function formatConfidence(value) {
  if (value === null || value === undefined || value === '') return 'unknown';
  const numeric = Number(String(value).replace(/%$/, ''));
  if (!Number.isFinite(numeric)) return compact(value);
  const percentage = numeric <= 1 ? numeric * 100 : numeric;
  return `${Math.round(percentage)}%`;
}

function formatDetection(detection = {}) {
  const label = compact(detection.label) || 'unknown finding';
  const confidence = formatConfidence(detection.confidence);
  const mark = compact(detection.mark_id);
  return `- ${label} (${confidence} confidence${mark ? `, mark ${mark}` : ''})`;
}

function formatFinding(finding = {}) {
  const location = compact(finding.location || finding.tooth_or_region) || 'Region unknown';
  const description = compact(finding.description || finding.notes || finding.label) || 'No description';
  const severity = compact(finding.severity);
  const confidence = finding.confidence === null || finding.confidence === undefined || finding.confidence === ''
    ? ''
    : `, confidence ${formatConfidence(finding.confidence)}`;
  const differentials = Array.isArray(finding.differentials)
    ? finding.differentials.map(compact).filter(Boolean)
    : [];
  return [
    `- ${location}: ${description}${severity ? ` (severity ${severity}${confidence})` : confidence ? ` (${confidence.slice(2)})` : ''}`,
    differentials.length > 0 ? `  Diagnosis banding: ${differentials.join(', ')}` : '',
  ].filter(Boolean).join('\n');
}

export function findLatestVisualFindings(messages = []) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.type === 'ai' && message.visualFindings) return message.visualFindings;
  }
  return null;
}

export function buildPriorImageContext(messages = []) {
  const findings = findLatestVisualFindings(messages);
  if (!findings) return null;

  const detections = Array.isArray(findings.detections)
    ? findings.detections.map(formatDetection).join('\n')
    : '';
  const clinicalFindings = Array.isArray(findings.findings)
    ? findings.findings.map(formatFinding).join('\n')
    : '';
  const context = [
    '[KONTEKS ANALISIS GAMBAR DENTAL SESI INI]',
    `Kualitas gambar: ${compact(findings.image_quality) || 'unknown'}`,
    `Tingkat keparahan: ${compact(findings.concern_level) || 'unknown'}`,
    detections ? `Deteksi visual:\n${detections}` : '',
    clinicalFindings ? `Temuan klinis:\n${clinicalFindings}` : '',
    findings.limitations ? `Limitasi: ${compact(findings.limitations)}` : '',
    '[END KONTEKS]',
  ].filter(Boolean).join('\n');

  return context.slice(0, MAX_CONTEXT_LENGTH);
}

export function buildFollowUpMessage(messages = [], message = '') {
  const question = String(message || '').trim();
  const priorImageContext = buildPriorImageContext(messages);
  return priorImageContext
    ? `${priorImageContext}\n\nDentist Question: ${question}`
    : question;
}

export function buildJournalReferenceQuestion({ message = '', findings = null } = {}) {
  if (!findings) return compact(message).slice(0, MAX_REFERENCE_QUESTION_LENGTH);

  const detections = Array.isArray(findings.detections)
    ? findings.detections.map(formatDetection).join('\n')
    : '';
  const clinicalFindings = Array.isArray(findings.findings)
    ? findings.findings.map(formatFinding).join('\n')
    : '';
  const question = [
    'Berikan rujukan jurnal dan evidence klinis yang spesifik untuk temuan dental berikut.',
    'Fokuskan reasoning pada hubungan temuan visual, diagnosis banding, langkah konfirmasi klinis, dan opsi tata laksana; hindari uraian anatomi umum yang tidak relevan.',
    message ? `Pertanyaan dokter: ${compact(message)}` : '',
    `Kualitas gambar: ${compact(findings.image_quality) || 'unknown'}`,
    `Tingkat keparahan: ${compact(findings.concern_level) || 'unknown'}`,
    detections ? `Deteksi visual:\n${detections}` : '',
    clinicalFindings ? `Temuan klinis:\n${clinicalFindings}` : '',
    findings.limitations ? `Limitasi modalitas: ${compact(findings.limitations)}` : '',
    'Jawab dalam Bahasa Indonesia dan nyatakan ketidakpastian bila confidence rendah.',
  ].filter(Boolean).join('\n');

  return question.slice(0, MAX_REFERENCE_QUESTION_LENGTH);
}
