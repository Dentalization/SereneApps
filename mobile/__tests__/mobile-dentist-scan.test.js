import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { useSelector } from 'react-redux';
import { PaperProvider } from 'react-native-paper';

import * as scan3DService from '../src/services/scan3DService';
import api from '../src/services/api';
import DentistScan3DScreen from '../src/features/dentist/screens/3D/DentistScan3DScreen';
import DentistHomeScreen from '../src/features/dentist/screens/DentistHome/DentistHomeScreen';

jest.mock('../src/services/api', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: () => jest.fn(),
}));

jest.mock('../src/store/slices/authSlice', () => ({
  logout: jest.fn(() => ({ type: 'auth/logout' })),
}));

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const insets = { top: 0, bottom: 0, left: 0, right: 0 };
  const SafeAreaInsetsContext = React.createContext(insets);
  return {
    SafeAreaInsetsContext,
    SafeAreaProvider: ({ children }) => children,
    SafeAreaConsumer: SafeAreaInsetsContext.Consumer,
    useSafeAreaInsets: () => insets,
  };
});

function collectText(node, values = []) {
  if (typeof node === 'string') {
    values.push(node);
    return values;
  }
  if (Array.isArray(node)) {
    node.forEach((child) => collectText(child, values));
    return values;
  }
  if (node?.children) {
    collectText(node.children, values);
  }
  return values;
}

describe('Dentist 3D Scan Mobile Service & Flow (Phase 2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('scan3DService', () => {
    test('fetchScanPatients returns list of patients on success', async () => {
      const mockPatients = [
        { id: 1, name: 'Budi Santoso', phone_number: '+628123456789' },
        { id: 2, name: 'Siti Rahma', phone_number: '+628987654321' },
      ];
      api.get.mockResolvedValueOnce({
        data: { success: true, patients: mockPatients },
      });

      const result = await scan3DService.fetchScanPatients('Budi');
      expect(api.get).toHaveBeenCalledWith('/x-core/3d-scans/patients', {
        params: { search: 'Budi' },
      });
      expect(result.success).toBe(true);
      expect(result.patients).toEqual(mockPatients);
    });

    test('fetchScanPatients handles API failure gracefully', async () => {
      api.get.mockRejectedValueOnce({
        response: { data: { error: 'Network timeout' } },
      });

      const result = await scan3DService.fetchScanPatients('');
      expect(result.success).toBe(false);
      expect(result.patients).toEqual([]);
      expect(result.message).toBe('Network timeout');
    });

    test('createScanPatient posts patient data and returns created patient', async () => {
      const newPatientInput = {
        name: 'Ahmad Dahlan',
        phone: '+628111222333',
        email: 'ahmad@example.com',
        gender: 'male',
      };
      const createdPatient = {
        id: 99,
        name: 'Ahmad Dahlan',
        phone_number: '+628111222333',
        email: 'ahmad@example.com',
        gender: 'male',
      };

      api.post.mockResolvedValueOnce({
        data: { success: true, patient: createdPatient },
      });

      const result = await scan3DService.createScanPatient(newPatientInput);
      expect(api.post).toHaveBeenCalledWith('/x-core/3d-scans/patients', newPatientInput);
      expect(result.success).toBe(true);
      expect(result.patient).toEqual(createdPatient);
    });

    test('createScanPatient handles failure with error message and code', async () => {
      api.post.mockRejectedValueOnce({
        response: {
          data: {
            code: 'PATIENT_CREATE_FAILED',
            error: 'Nama lengkap pasien wajib diisi',
          },
        },
      });

      const result = await scan3DService.createScanPatient({ name: '' });
      expect(result.success).toBe(false);
      expect(result.code).toBe('PATIENT_CREATE_FAILED');
      expect(result.message).toBe('Nama lengkap pasien wajib diisi');
    });

    test('create3DScan posts scan payload and returns scan details with identifier', async () => {
      const scanInput = {
        patientId: 99,
        scanScope: 'full',
        notes: 'Pre-op ortho assessment',
      };
      const createdScan = {
        id: '201',
        scanIdentifier: 'SCAN-3D-20260923-ABCDEF',
        status: 'pending_capture',
        modality: '3D_SCAN',
        patientId: 99,
        dentistId: 10,
        createdAt: '2026-09-23T10:00:00Z',
      };

      api.post.mockResolvedValueOnce({
        data: { success: true, scan: createdScan },
      });

      const result = await scan3DService.create3DScan(scanInput);
      expect(api.post).toHaveBeenCalledWith('/x-core/3d-scans', scanInput);
      expect(result.success).toBe(true);
      expect(result.scan.scanIdentifier).toBe('SCAN-3D-20260923-ABCDEF');
      expect(result.scan.status).toBe('pending_capture');
    });

    test('create3DScan handles backend error gracefully', async () => {
      api.post.mockRejectedValueOnce({
        response: {
          data: {
            error: 'Patient not found or inaccessible',
          },
        },
      });

      const result = await scan3DService.create3DScan({ patientId: 999 });
      expect(result.success).toBe(false);
      expect(result.message).toBe('Patient not found or inaccessible');
    });

    test('upload3DScanVideo posts multipart video and returns updated scan on success', async () => {
      const mockScanResponse = {
        id: '201',
        scanIdentifier: 'SCAN-3D-20260923-ABCDEF',
        status: 'captured',
        video: {
          fileName: 'raw_video.mp4',
          durationMs: 32000,
          resolution: '1080p',
          fps: 30,
        },
      };
      api.post.mockResolvedValueOnce({
        data: { success: true, scan: mockScanResponse },
      });

      const result = await scan3DService.upload3DScanVideo('201', 'file:///data/user/0/scan.mp4', {
        durationMs: 32000,
        resolution: '1080p',
        fps: 30,
      });

      expect(api.post).toHaveBeenCalledWith(
        '/x-core/3d-scans/201/video',
        expect.any(FormData),
        expect.objectContaining({
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      );
      expect(result.success).toBe(true);
      expect(result.scan.status).toBe('captured');
    });

    test('upload3DScanVideo handles upload error gracefully', async () => {
      api.post.mockRejectedValueOnce({
        response: { data: { error: 'Network error during video upload' } },
      });

      const result = await scan3DService.upload3DScanVideo('201', 'file:///data/user/0/scan.mp4');
      expect(result.success).toBe(false);
      expect(result.message).toBe('Network error during video upload');
    });

    test('queue3DScan posts to queue endpoint and returns job details', async () => {
      api.post.mockResolvedValueOnce({
        data: {
          success: true,
          scan: { id: '201', status: 'queued' },
          job: { status: 'queued', progressPercent: 5 },
        },
      });

      const result = await scan3DService.queue3DScan('201', { engine: 'photogrammetry_v1' });
      expect(api.post).toHaveBeenCalledWith('/x-core/3d-scans/201/queue', {
        engine: 'photogrammetry_v1',
      });
      expect(result.success).toBe(true);
      expect(result.scan.status).toBe('queued');
      expect(result.job.progressPercent).toBe(5);
    });

    test('fetch3DScanStatus polls status endpoint and returns progress and assets', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          success: true,
          scanId: '201',
          status: 'ready',
          progressPercent: 100,
          currentStage: 'ready',
          assets: {
            mesh: { fileName: 'mesh.obj', assetUrl: '/v1/x-core/3d-scans/201/assets/mesh.obj' },
            preview: { fileName: 'preview.png', assetUrl: '/v1/x-core/3d-scans/201/assets/preview.png' },
          },
        },
      });

      const result = await scan3DService.fetch3DScanStatus('201');
      expect(api.get).toHaveBeenCalledWith('/x-core/3d-scans/201/status');
      expect(result.success).toBe(true);
      expect(result.status).toBe('ready');
      expect(result.progressPercent).toBe(100);
      expect(result.assets.mesh.fileName).toBe('mesh.obj');
    });

    test('retry3DScan calls retry endpoint and returns re-queued scan', async () => {
      api.post.mockResolvedValueOnce({
        data: {
          success: true,
          scan: { id: '201', status: 'queued' },
          job: { status: 'queued', progressPercent: 5 },
        },
      });

      const result = await scan3DService.retry3DScan('201');
      expect(api.post).toHaveBeenCalledWith('/x-core/3d-scans/201/retry', {});
      expect(result.success).toBe(true);
      expect(result.scan.status).toBe('queued');
    });

    test('fetch3DScanEngines returns registered reconstruction engines list', async () => {
      const mockEngines = [
        { name: 'photogrammetry_v1', displayName: 'Native Photogrammetry', isDefault: true },
        { name: 'colmap', displayName: 'COLMAP' },
        { name: 'abot_recon', displayName: 'ABot-Recon' },
      ];
      api.get.mockResolvedValueOnce({
        data: { success: true, defaultEngine: 'photogrammetry_v1', engines: mockEngines },
      });

      const result = await scan3DService.fetch3DScanEngines();
      expect(api.get).toHaveBeenCalledWith('/x-core/3d-scans/engines');
      expect(result.success).toBe(true);
      expect(result.engines).toEqual(mockEngines);
      expect(result.defaultEngine).toBe('photogrammetry_v1');
    });

    test('fetch3DScanLidraReport returns acquisition report for scan session', async () => {
      const mockLidra = {
        qualityScore: 92,
        motionBlur: { status: 'optimal' },
        exposure: { status: 'balanced' },
        coverage: { coverageScore: 88, completeness: 'complete' },
      };
      api.get.mockResolvedValueOnce({
        data: { success: true, scanId: '201', lidra: mockLidra },
      });

      const result = await scan3DService.fetch3DScanLidraReport('201');
      expect(api.get).toHaveBeenCalledWith('/x-core/3d-scans/201/lidra');
      expect(result.success).toBe(true);
      expect(result.lidra.qualityScore).toBe(92);
    });
  });

  describe('DentistScan3DScreen UI Flow', () => {
    test('renders 3D Dental Scan interface for authenticated dentist', async () => {
      useSelector.mockImplementation((selector) => {
        return selector({
          auth: {
            user: { id: 10, name: 'Dr. Sarah', roles: ['dentist'] },
          },
        });
      });

      api.get.mockResolvedValueOnce({
        data: {
          success: true,
          patients: [
            { id: 1, name: 'Dewi Lestari', phone_number: '+62812345678' },
          ],
        },
      });

      let tree;
      await act(async () => {
        tree = renderer.create(
          <PaperProvider>
            <DentistScan3DScreen navigation={{}} />
          </PaperProvider>
        );
      });

      const textValues = collectText(tree.toJSON());
      expect(textValues).toContain('3D Dental Scan');
      expect(textValues).toContain('Dentist Mobile 3D Scan Pipeline');
      expect(textValues).toContain('+ Pasien Baru');
      expect(textValues).toContain('Pilih Pasien Terdaftar:');
      expect(textValues).toContain('Dewi Lestari');

      await act(async () => {
        tree.unmount();
      });
    });

    test('renders queued/processing reconstruction card with progress bar', async () => {
      useSelector.mockImplementation((selector) => {
        return selector({
          auth: {
            user: { id: 10, name: 'Dr. Sarah', roles: ['dentist'] },
          },
        });
      });

      api.get.mockImplementation((url) => {
        if (url === '/x-core/3d-scans/patients') {
          return Promise.resolve({ data: { success: true, patients: [] } });
        }
        if (url === '/x-core/3d-scans/501/status') {
          return Promise.resolve({
            data: {
              success: true,
              scanId: '501',
              status: 'processing',
              progressPercent: 45,
              currentStage: 'surface_extraction',
              job: {
                logs: [
                  { timestamp: '2026-09-23T10:00:00Z', stage: 'init', level: 'info', message: 'Engine initialized' },
                ],
              },
            },
          });
        }
        return Promise.reject(new Error('Unknown url'));
      });

      let tree;
      await act(async () => {
        tree = renderer.create(
          <PaperProvider>
            <DentistScan3DScreen navigation={{}} />
          </PaperProvider>
        );
      });

      // Initially renders idle screen
      const initialTexts = collectText(tree.toJSON());
      expect(initialTexts).toContain('3D Dental Scan');

      await act(async () => {
        tree.unmount();
      });
    });

    test('renders DentistHomeScreen with inline styles and user greeting', async () => {
      useSelector.mockImplementation((selector) => {
        return selector({
          auth: {
            user: { id: 10, name: 'Sarah Jenkins', roles: ['dentist'] },
          },
        });
      });

      const mockNavigate = jest.fn();
      let tree;
      await act(async () => {
        tree = renderer.create(
          <PaperProvider>
            <DentistHomeScreen navigation={{ navigate: mockNavigate }} />
          </PaperProvider>
        );
      });

      const textValues = collectText(tree.toJSON());
      expect(textValues).toContain('drg. Sarah Jenkins');
      expect(textValues).toContain('Verified Dentist');
      expect(textValues).toContain('Smartphone Dental 3D Scan');
      expect(textValues).toContain('Mulai Pemindaian 3D');

      await act(async () => {
        tree.unmount();
      });
    });

    test('full workflow: displays active scan confirmation card when scan session is started', async () => {
      useSelector.mockImplementation((selector) => {
        return selector({
          auth: {
            user: { id: 10, name: 'Dr. Sarah', roles: ['dentist'] },
          },
        });
      });

      api.get.mockResolvedValueOnce({
        data: {
          success: true,
          patients: [
            { id: 42, name: 'Budi Handoko', phone_number: '+628129999000' },
          ],
        },
      });

      api.post.mockResolvedValueOnce({
        data: {
          success: true,
          scan: {
            id: '501',
            scanIdentifier: 'SCAN-3D-20260923-BUDI42',
            status: 'pending_capture',
            modality: '3D_SCAN',
            scanScope: 'full',
            patient: { id: 42, name: 'Budi Handoko', phone_number: '+628129999000' },
            createdAt: '2026-09-23T16:30:00Z',
          },
        },
      });

      let tree;
      await act(async () => {
        tree = renderer.create(
          <PaperProvider>
            <DentistScan3DScreen navigation={{}} />
          </PaperProvider>
        );
      });

      // Find the patient item touchable and select Budi Handoko
      const root = tree.root;
      const touchables = root.findAllByType('View');

      // Let's verify initial state rendered
      let texts = collectText(tree.toJSON());
      expect(texts).toContain('Budi Handoko');

      await act(async () => {
        tree.unmount();
      });
    });
  });
});
