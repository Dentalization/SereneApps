import {
  normalizeAnalysisResult,
  toImageUri,
} from '../src/features/ai-diagnosis/utils/analysisResult';

describe('patient AI analysis result normalization', () => {
  test('joins patient reasoning with detector confidence by mark ID', () => {
    const result = normalizeAnalysisResult({
      concern_level: 'high',
      image_quality: 'Patient-appropriate analysis',
      limitations: 'Analysis limited to visible image content.',
      annotated_image_base64: 'synthetic-base64',
      detections: [
        { mark_id: '[1]', label: 'caries', confidence: 0.6436 },
        { mark_id: '[2]', label: 'caries', confidence: 0.4481 },
      ],
      findings: [
        {
          mark_id: '[1]',
          concern_level: 'should see dentist',
          description: 'Terlihat area berwarna coklat gelap.',
          what_it_means: 'Kemungkinan merupakan karies yang perlu dikonfirmasi.',
        },
        {
          mark_id: '[2]',
          concern_level: 'should see dentist',
          description: 'Terlihat kerusakan di sekitar area pertama.',
          what_it_means: 'Kerusakan dapat meluas bila tidak ditangani.',
        },
      ],
      recommendations: ['Jadwalkan pemeriksaan dokter gigi.'],
      suggested_questions: ['Apakah kondisi ini perlu segera dirawat?'],
    });

    expect(result.riskLevel).toBe('high');
    expect(result.confidence).toBeCloseTo((0.6436 + 0.4481) / 2);
    expect(result.findings[0]).toMatchObject({
      mark: '[1]',
      name: 'Kemungkinan Caries',
      description: 'Terlihat area berwarna coklat gelap.',
      reasoning: 'Kemungkinan merupakan karies yang perlu dikonfirmasi.',
      severity: 'medium',
      confidence: 0.6436,
    });
    expect(result.imageQuality).toBe('Memadai untuk analisis AI');
    expect(result.limitations).toBe('Analisis terbatas pada bagian yang terlihat di dalam gambar.');
    expect(result.suggestedQuestions).toEqual(['Apakah kondisi ini perlu segera dirawat?']);
    expect(toImageUri(result.annotatedImage)).toBe('data:image/jpeg;base64,synthetic-base64');
  });

  test('does not invent detector confidence when it is absent', () => {
    const result = normalizeAnalysisResult({
      findings: [{ mark_id: '[1]', description: 'Area perlu ditinjau.' }],
    });

    expect(result.confidence).toBeNull();
    expect(result.findings[0].confidence).toBeNull();
  });
});
