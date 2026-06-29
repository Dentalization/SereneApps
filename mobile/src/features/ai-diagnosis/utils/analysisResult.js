const firstNonEmptyArray = (...values) =>
  values.find((value) => Array.isArray(value) && value.length > 0) || [];

const stripMarkdown = (text = '') => String(text).replace(/\*\*/g, '').trim();

const parseContentSections = (text = '') => {
  if (typeof text !== 'string' || !text.includes('**')) return {};

  const sections = {};
  const regex = /\*\*([^\*]+)\*\*:?([\s\S]*?)(?=\n\*\*|$)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const title = match[1].trim().toLowerCase();
    const body = match[2]
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (body.length) sections[title] = body;
  }
  return sections;
};

export const normalizeConfidence = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.min(1, parsed > 1 ? parsed / 100 : parsed));
};

export const normalizeConcernLevel = (value) => {
  const normalized = String(value || '').trim().toLowerCase().replace(/[_-]+/g, ' ');
  if (
    normalized.includes('critical') ||
    normalized.includes('emergency') ||
    normalized.includes('urgent') ||
    normalized === 'high' ||
    normalized === 'severe'
  ) {
    return 'high';
  }
  if (
    normalized.includes('see dentist') ||
    normalized.includes('moderate') ||
    normalized.includes('medium')
  ) {
    return 'medium';
  }
  return 'low';
};

const humanizeLabel = (value = '') => {
  const label = String(value).replace(/[_-]+/g, ' ').trim();
  if (!label) return '';
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const recommendationText = (recommendation) => {
  if (typeof recommendation === 'string') return recommendation.trim();
  if (!recommendation || typeof recommendation !== 'object') return '';
  return (
    recommendation.description ||
    recommendation.text ||
    recommendation.recommendation ||
    recommendation.action ||
    recommendation.title ||
    ''
  ).trim();
};

const observationText = (observation) => {
  if (typeof observation === 'string') return observation.trim();
  if (!observation || typeof observation !== 'object') return '';
  return (
    observation.description ||
    observation.text ||
    observation.observation ||
    observation.title ||
    ''
  ).trim();
};

const imageQualityText = (quality) => {
  const raw = quality && typeof quality === 'object'
    ? quality.rating || quality.label || quality.description || ''
    : quality;
  const normalized = String(raw || '').trim();
  if (!normalized) return null;
  if (/patient-appropriate|adequate|acceptable/i.test(normalized)) {
    return 'Memadai untuk analisis AI';
  }
  return normalized;
};

const limitationsText = (limitations) => {
  const normalized = String(limitations || '').trim();
  if (!normalized) return null;
  if (/analysis limited to visible image content/i.test(normalized)) {
    return 'Analisis terbatas pada bagian yang terlihat di dalam gambar.';
  }
  return normalized;
};

export const normalizeAnalysisResult = (analysisData) => {
  if (!analysisData) {
    return {
      riskLevel: 'low',
      confidence: null,
      findings: [],
      recommendations: [],
      observations: [],
      annotatedImage: null,
      summary: null,
      limitations: null,
      imageQuality: null,
      suggestedQuestions: [],
    };
  }

  const visual = analysisData.visual_findings || {};
  const nested = analysisData.data || {};
  const nestedVisual = nested.visual_findings || {};
  const contentText = typeof analysisData.content === 'string' ? analysisData.content : '';
  const contentSections = parseContentSections(contentText);

  const detections = firstNonEmptyArray(
    analysisData.detections,
    visual.detections,
    nested.detections,
    nestedVisual.detections,
  );

  let rawFindings = firstNonEmptyArray(
    analysisData.findings,
    visual.findings,
    nested.findings,
    nestedVisual.findings,
  );
  if (!rawFindings.length && Array.isArray(analysisData.content)) {
    rawFindings =
      analysisData.content.find((entry) => Array.isArray(entry?.findings) && entry.findings.length)
        ?.findings || [];
  }
  if (!rawFindings.length) rawFindings = detections;

  const globalConcern =
    analysisData.concern_level ||
    visual.concern_level ||
    nested.concern_level ||
    nestedVisual.concern_level ||
    'low';

  const findings = rawFindings.map((finding, index) => {
    const source = finding && typeof finding === 'object'
      ? finding
      : { description: String(finding || '') };
    const mark = source.mark_id || source.mark || `[${index + 1}]`;
    const detection =
      detections.find((item) => item?.mark_id === mark || item?.mark === mark) || {};
    const rawLabel =
      source.name ||
      source.condition ||
      source.label ||
      detection.label ||
      '';
    const label = humanizeLabel(rawLabel);
    const description =
      source.description ||
      source.observation ||
      detection.description ||
      '';

    return {
      id: source.id || mark || index + 1,
      mark,
      name: label ? `Kemungkinan ${label}` : `Temuan area ${mark}`,
      label,
      description,
      reasoning:
        source.what_it_means ||
        source.whatItMeans ||
        source.clinical_reasoning ||
        source.reasoning ||
        source.explanation ||
        source.details ||
        '',
      severity: normalizeConcernLevel(
        source.severity || source.concern_level || detection.severity || globalConcern,
      ),
      concernText: source.concern_level || source.severity || null,
      confidence: normalizeConfidence(source.confidence ?? detection.confidence),
      location: source.location || source.area || detection.location || null,
    };
  });

  let observations = firstNonEmptyArray(
    analysisData.observations,
    visual.observations,
    nested.observations,
    nestedVisual.observations,
  );
  if (!observations.length && Array.isArray(analysisData.content)) {
    observations =
      analysisData.content.find(
        (entry) => Array.isArray(entry?.observations) && entry.observations.length,
      )?.observations || [];
  }
  if (!observations.length && Object.keys(contentSections).length) {
    observations = Object.entries(contentSections)
      .filter(([title]) => title.startsWith('area bertanda'))
      .map(([title, lines]) => stripMarkdown(`${title}: ${lines.join(' ')}`));
  }
  observations = observations.map(observationText).filter(Boolean);

  let recommendations = firstNonEmptyArray(
    analysisData.recommendations,
    visual.recommendations,
    nested.recommendations,
    nestedVisual.recommendations,
  );
  if (!recommendations.length && Array.isArray(analysisData.content)) {
    recommendations =
      analysisData.content.find(
        (entry) => Array.isArray(entry?.recommendations) && entry.recommendations.length,
      )?.recommendations || [];
  }
  if (!recommendations.length && Object.keys(contentSections).length) {
    recommendations =
      contentSections.rekomendasi ||
      contentSections['rekomendasi perawatan di rumah'] ||
      contentSections['rekomendasi tambahan'] ||
      [];
  }
  recommendations = recommendations.map(recommendationText).filter(Boolean);

  let summary =
    analysisData.summary ||
    analysisData.overall_assessment ||
    visual.summary ||
    nested.summary ||
    nested.overall_assessment ||
    null;
  if (!summary && contentSections['apa artinya ini?']) {
    summary = stripMarkdown(contentSections['apa artinya ini?'].join(' '));
  }
  if (!summary && contentText) summary = stripMarkdown(contentText);

  const confidenceValues = findings
    .map((finding) => finding.confidence)
    .filter((value) => value !== null);

  return {
    riskLevel: normalizeConcernLevel(globalConcern),
    confidence: confidenceValues.length
      ? confidenceValues.reduce((total, value) => total + value, 0) / confidenceValues.length
      : null,
    findings,
    recommendations,
    observations,
    annotatedImage:
      analysisData.annotated_image_base64 ||
      analysisData.annotatedImage ||
      visual.annotated_image_base64 ||
      nested.annotated_image_base64 ||
      nestedVisual.annotated_image_base64 ||
      null,
    summary,
    limitations: limitationsText(
      analysisData.limitations ||
      visual.limitations ||
      nested.limitations ||
      nestedVisual.limitations ||
      null,
    ),
    imageQuality: imageQualityText(
      analysisData.image_quality ||
      visual.image_quality ||
      nested.image_quality ||
      nestedVisual.image_quality ||
      null,
    ),
    suggestedQuestions: firstNonEmptyArray(
      analysisData.suggested_questions,
      visual.suggested_questions,
      nested.suggested_questions,
      nestedVisual.suggested_questions,
    ).filter((question) => typeof question === 'string' && question.trim()),
  };
};

export const toImageUri = (value) => {
  if (!value) return null;
  if (/^(data:|https?:|file:|content:)/i.test(value)) return value;
  return `data:image/jpeg;base64,${value}`;
};
