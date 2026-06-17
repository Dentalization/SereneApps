import api from '../src/services/api';
import {
  createAppointment,
  getAppointments,
} from '../src/services/appointmentService';
import {
  saveAIAnalysis,
  syncAIAnalysisHistory,
} from '../src/services/aiAnalysisSyncService';

jest.mock('../src/services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
  },
}));

describe('mobile appointment service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('maps patient appointment request into backend payload', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        appointment: { id: 42, status: 'scheduled' },
        dentist: { id: 10 },
      },
    });

    const result = await createAppointment({
      dentistId: 10,
      clinicBranchId: 3,
      startsAt: '2026-07-01T02:00:00.000Z',
      duration: 45,
      appointmentType: 'virtual',
      reason: 'Kontrol behel',
      notes: 'Pagi hari',
      metadata: { source: 'test' },
    });

    expect(api.post).toHaveBeenCalledWith('/appointments', {
      dentistId: 10,
      clinicBranchId: 3,
      start: '2026-07-01T02:00:00.000Z',
      end: '2026-07-01T02:45:00.000Z',
      appointmentType: 'virtual',
      reason: 'Kontrol behel',
      notes: 'Pagi hari',
      metadata: { source: 'test' },
    });
    expect(result).toEqual({
      success: true,
      data: { id: 42, status: 'scheduled' },
      dentist: { id: 10 },
    });
  });

  test('builds patient appointment query parameters for list view', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        appointments: [{ id: 1 }],
        summary: { total: 1 },
      },
    });

    const result = await getAppointments({
      limit: 10,
      status: 'scheduled,confirmed',
      from: '2026-07-01',
      to: '2026-07-31',
      order: 'desc',
    });

    expect(api.get).toHaveBeenCalledWith('/appointments?limit=10&view=patient&status=scheduled%2Cconfirmed&from=2026-07-01&to=2026-07-31&order=desc');
    expect(result).toEqual({
      success: true,
      data: [{ id: 1 }],
      summary: { total: 1 },
    });
  });
});

describe('mobile AI analysis sync service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('normalizes CDSS result fields before saving to backend', async () => {
    api.post.mockResolvedValueOnce({ data: { id: 77, synced: true } });

    const result = await saveAIAnalysis({
      id: 'local-session-1',
      image_url: 'file://synthetic.png',
      confidence: 0.82,
      detections: [
        {
          name: 'Caries suspect',
          probability: 91,
          bbox: [1, 2, 30, 40],
          details: 'Synthetic finding',
          severity: 'medium',
        },
      ],
      recommendations: [
        {
          action: 'Review with dentist',
          text: 'Schedule consultation',
          importance: 'high',
          timeframe: 'soon',
        },
      ],
      overallAssessment: 'Screening support only',
      timestamp: '2026-07-01T00:00:00.000Z',
    });

    const [, payload] = api.post.mock.calls[0];
    expect(api.post).toHaveBeenCalledWith('/ai-analysis', expect.any(Object));
    expect(payload).toMatchObject({
      sessionId: 'local-session-1',
      imageUrl: 'file://synthetic.png',
      findings: 'Caries suspect',
      overallAssessment: 'Screening support only',
      riskLevel: 'medium',
      confidenceScore: 82,
      detections: [
        {
          label: 'Caries suspect',
          confidence: 0.91,
          area: [1, 2, 30, 40],
          details: 'Synthetic finding',
          severity: 'medium',
        },
      ],
      recommendations: [
        {
          title: 'Review with dentist',
          description: 'Schedule consultation',
          priority: 'high',
          urgency: 'soon',
        },
      ],
    });
    expect(payload.metadata).toMatchObject({
      source: 'mobile_app',
      analyzedAt: '2026-07-01T00:00:00.000Z',
      originalId: 'local-session-1',
      detectionCount: 1,
      recommendationCount: 1,
    });
    expect(result).toEqual({ id: 77, synced: true });
  });

  test('retries save without annotated image after backend server error', async () => {
    api.post
      .mockRejectedValueOnce({ response: { status: 500, data: { message: 'too large' } } })
      .mockResolvedValueOnce({ data: { id: 88, synced: true } });

    const result = await saveAIAnalysis({
      id: 'analysis-with-image',
      annotatedImageUrl: 'data:image/png;base64,small-test-payload',
      detections: [],
      recommendations: [],
    });

    expect(api.post).toHaveBeenCalledTimes(2);
    expect(api.post.mock.calls[0][1].annotatedImageUrl).toBe('data:image/png;base64,small-test-payload');
    expect(api.post.mock.calls[1][1].annotatedImageUrl).toBeNull();
    expect(api.post.mock.calls[1][1].metadata.retriedWithoutImage).toBe(true);
    expect(result).toEqual({ id: 88, synced: true });
  });

  test('summarizes successful and failed local CDSS history sync attempts', async () => {
    api.post
      .mockResolvedValueOnce({ data: { id: 1 } })
      .mockRejectedValueOnce(new Error('network down'));

    const result = await syncAIAnalysisHistory([
      { id: 'ok', detections: [], recommendations: [] },
      { id: 'fail', detections: [], recommendations: [] },
    ]);

    expect(result).toEqual({ synced: 1, failed: 1 });
  });
});
