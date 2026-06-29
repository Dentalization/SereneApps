const fs = require('fs');
const path = require('path');

const read = (relativePath) =>
  fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

describe('mobile AI diagnosis API contract', () => {
  test('routes AI traffic through Serene proxy without bundled service keys', () => {
    const config = read('src/config/api.config.js');
    const service = read('src/services/aiDiagnosisService.js');

    expect(config).not.toMatch(/EXPO_PUBLIC_AI_KEY|AI_API_KEY|aiApiKey/);
    expect(service).not.toMatch(/X-API-Key|AI_API_KEY/);
    expect(service).toContain('py-api/api/v1');
    expect(service).toMatch(/Authorization/);
    expect(service).not.toContain("'Content-Type': 'multipart/form-data'");
  });

  test('patient role is fixed by the service and response aliases are normalized', () => {
    const service = read('src/services/aiDiagnosisService.js');
    const analyzeImageSection = service.slice(
      service.indexOf('export const analyzeImage'),
      service.indexOf('// Detect only'),
    );

    expect(service).toMatch(/const PATIENT_ROLE = 'patient'/);
    expect(service).not.toMatch(/analyzeImage = async \(\{[^}]*role/);
    expect(service).toMatch(/normalizeMessages/);
    expect(service).toMatch(/annotated_image_signed_url/);
    expect(service).toMatch(/annotated_image_base64/);
    expect(service).toMatch(/per_page: 200/);
    expect(analyzeImageSection).toContain("'/images/analyze'");
    expect(analyzeImageSection).not.toContain("'/chat/upload'");
    expect(analyzeImageSection).toContain('source_image_uri');
    expect(service).toMatch(/PATIENT_ANALYSIS_CONTEXT/);
    expect(service).toMatch(/isStructuredAnalysisFailure/);
  });

  test('mobile persists original and annotated images for dentist continuity', () => {
    const analysisScreen = read('src/features/ai-diagnosis/screens/AnalysisScreen.jsx');
    const syncService = read('src/services/aiAnalysisSyncService.js');

    expect(analysisScreen).toMatch(/source_image_uri/);
    const resultScreen = read('src/features/ai-diagnosis/screens/ResultScreen.jsx');
    expect(resultScreen).toMatch(/imageBackfillRef/);
    expect(resultScreen).toMatch(/syncAnalysisToBackend/);
    expect(resultScreen).toMatch(/images\?\.\[0\]\?\.uri/);
    expect(syncService).toMatch(/toPersistableImageUrl/);
    expect(syncService).toMatch(/readAsStringAsync/);
    expect(syncService).not.toMatch(/payloadSize > 200000/);
    expect(syncService).not.toMatch(/annotatedImageTooLarge/);
  });
});
