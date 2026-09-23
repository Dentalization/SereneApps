import api from './api';

/**
 * 3D Scan Client Service
 * Connects Dentist Mobile to backend 3D scan and patient ingestion endpoints.
 */

/**
 * Fetch accessible patients for 3D scanning.
 * @param {string} [search=''] - Search term for patient name, phone, or MRN.
 * @returns {Promise<{success: boolean, patients: Array, message?: string}>}
 */
export const fetchScanPatients = async (search = '') => {
  try {
    const params = search ? { search } : {};
    const response = await api.get('/x-core/3d-scans/patients', { params });
    return {
      success: true,
      patients: response.data?.patients || [],
    };
  } catch (error) {
    console.error('[scan3DService] fetchScanPatients error:', error);
    return {
      success: false,
      patients: [],
      message: error.response?.data?.error || error.message || 'Gagal memuat daftar pasien',
    };
  }
};

/**
 * Create or link a patient specifically for a 3D scan session.
 * @param {Object} patientData - { name, phone, email, gender }
 * @returns {Promise<{success: boolean, patient?: Object, message?: string, code?: string}>}
 */
export const createScanPatient = async (patientData) => {
  try {
    const response = await api.post('/x-core/3d-scans/patients', patientData);
    return {
      success: true,
      patient: response.data?.patient,
    };
  } catch (error) {
    console.error('[scan3DService] createScanPatient error:', error);
    const errData = error.response?.data;
    return {
      success: false,
      code: errData?.code || 'PATIENT_CREATE_FAILED',
      message: errData?.error || error.message || 'Gagal menambahkan pasien baru',
    };
  }
};

/**
 * Create a new 3D scan session in the backend.
 * @param {Object} scanData - { patientId, scanScope, notes, metadata }
 * @returns {Promise<{success: boolean, scan?: Object, message?: string}>}
 */
export const create3DScan = async (scanData) => {
  try {
    const response = await api.post('/x-core/3d-scans', scanData);
    return {
      success: true,
      scan: response.data?.scan,
    };
  } catch (error) {
    console.error('[scan3DService] create3DScan error:', error);
    const errData = error.response?.data;
    return {
      success: false,
      message: errData?.error || error.message || 'Gagal membuat sesi 3D scan',
    };
  }
};

/**
 * Fetch details of a 3D scan session.
 * @param {string|number} scanId
 * @returns {Promise<{success: boolean, scan?: Object, message?: string}>}
 */
export const fetch3DScan = async (scanId) => {
  try {
    const response = await api.get(`/x-core/3d-scans/${scanId}`);
    return {
      success: true,
      scan: response.data?.scan,
    };
  } catch (error) {
    console.error('[scan3DService] fetch3DScan error:', error);
    const errData = error.response?.data;
    return {
      success: false,
      message: errData?.error || error.message || 'Gagal memuat detail sesi 3D scan',
    };
  }
};

/**
 * Upload raw continuous smartphone RGB video for a 3D scan session.
 * @param {string|number} scanId
 * @param {string} videoUri - Local device URI of the recorded video file.
 * @param {Object} [metadata={}] - { durationMs, resolution, fps, scanScope }
 * @returns {Promise<{success: boolean, scan?: Object, message?: string}>}
 */
export const upload3DScanVideo = async (scanId, videoUri, metadata = {}) => {
  try {
    const filename = videoUri.split('/').pop() || 'continuous_scan.mp4';
    const match = /\.(\w+)$/.exec(filename);
    const ext = match ? match[1].toLowerCase() : 'mp4';
    const mimeType = ext === 'mov' ? 'video/quicktime' : 'video/mp4';

    const formData = new FormData();
    formData.append('video', {
      uri: videoUri,
      name: filename,
      type: mimeType,
    });

    if (metadata.durationMs) {
      formData.append('durationMs', String(metadata.durationMs));
    }
    if (metadata.resolution) {
      formData.append('resolution', String(metadata.resolution));
    }
    if (metadata.fps) {
      formData.append('fps', String(metadata.fps));
    }

    const response = await api.post(`/x-core/3d-scans/${scanId}/video`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 180000,
    });

    return {
      success: true,
      scan: response.data?.scan,
      message: response.data?.message,
    };
  } catch (error) {
    console.error('[scan3DService] upload3DScanVideo error:', error);
    const errData = error.response?.data;
    return {
      success: false,
      message: errData?.error || error.message || 'Gagal mengunggah video 3D scan',
    };
  }
};

/**
 * Put an uploaded 3D scan into the asynchronous reconstruction queue.
 * @param {string|number} scanId
 * @param {Object} [options={}]
 * @returns {Promise<{success: boolean, scan?: Object, job?: Object, message?: string}>}
 */
export const queue3DScan = async (scanId, options = {}) => {
  try {
    const response = await api.post(`/x-core/3d-scans/${scanId}/queue`, options);
    return {
      success: true,
      scan: response.data?.scan,
      job: response.data?.job,
      message: response.data?.message,
    };
  } catch (error) {
    console.error('[scan3DService] queue3DScan error:', error);
    const errData = error.response?.data;
    return {
      success: false,
      message: errData?.error || error.message || 'Gagal memulai antrean rekonstruksi',
    };
  }
};

/**
 * Poll the processing status of a 3D scan session.
 * @param {string|number} scanId
 * @returns {Promise<{success: boolean, status?: string, progressPercent?: number, currentStage?: string, job?: Object, assets?: Object, message?: string}>}
 */
export const fetch3DScanStatus = async (scanId) => {
  try {
    const response = await api.get(`/x-core/3d-scans/${scanId}/status`);
    return {
      success: true,
      ...response.data,
    };
  } catch (error) {
    console.error('[scan3DService] fetch3DScanStatus error:', error);
    const errData = error.response?.data;
    return {
      success: false,
      message: errData?.error || error.message || 'Gagal memuat status rekonstruksi',
    };
  }
};

/**
 * Retry a failed 3D scan session.
 * @param {string|number} scanId
 * @param {Object} [options={}]
 * @returns {Promise<{success: boolean, scan?: Object, job?: Object, message?: string}>}
 */
export const retry3DScan = async (scanId, options = {}) => {
  try {
    const response = await api.post(`/x-core/3d-scans/${scanId}/retry`, options);
    return {
      success: true,
      scan: response.data?.scan,
      job: response.data?.job,
      message: response.data?.message,
    };
  } catch (error) {
    console.error('[scan3DService] retry3DScan error:', error);
    const errData = error.response?.data;
    return {
      success: false,
      message: errData?.error || error.message || 'Gagal menjadwalkan ulang rekonstruksi',
    };
  }
};

/**
 * Fetch available 3D reconstruction engines and capabilities.
 * @returns {Promise<{success: boolean, engines: Array, defaultEngine?: string, message?: string}>}
 */
export const fetch3DScanEngines = async () => {
  try {
    const response = await api.get('/x-core/3d-scans/engines');
    return {
      success: true,
      engines: response.data?.engines || [],
      defaultEngine: response.data?.defaultEngine,
    };
  } catch (error) {
    console.error('[scan3DService] fetch3DScanEngines error:', error);
    const errData = error.response?.data;
    return {
      success: false,
      engines: [],
      message: errData?.error || error.message || 'Gagal memuat daftar engine rekonstruksi',
    };
  }
};

/**
 * Fetch LIDRA acquisition intelligence report for a 3D scan.
 * @param {string|number} scanId
 * @returns {Promise<{success: boolean, lidra?: Object, message?: string}>}
 */
export const fetch3DScanLidraReport = async (scanId) => {
  try {
    const response = await api.get(`/x-core/3d-scans/${scanId}/lidra`);
    return {
      success: true,
      lidra: response.data?.lidra,
    };
  } catch (error) {
    console.error('[scan3DService] fetch3DScanLidraReport error:', error);
    const errData = error.response?.data;
    return {
      success: false,
      message: errData?.error || error.message || 'Gagal memuat laporan akuisisi LIDRA',
    };
  }
};

