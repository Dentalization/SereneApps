import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Text,
  Card,
  Button,
  TextInput,
  Chip,
  Avatar,
  useTheme,
  Portal,
  Modal,
  RadioButton,
  HelperText,
  ProgressBar,
} from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../../../store/slices/authSlice';
import { logoutPatient } from '../../../../services/authService';
import { getInitials } from '../../../../utils/formatters';
import { resolveMediaUrl } from '../../../../utils/media';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { buildScanCaptureMetadata } from '../../../../utils/scanCaptureMetadata';
import DentistRoleGuard from '../../components/DentistRoleGuard';
import {
  fetchScanPatients,
  createScanPatient,
  create3DScan,
  upload3DScanVideo,
  queue3DScan,
  fetch3DScanStatus,
  retry3DScan,
  fetch3DScanEngines,
  fetch3DScanLidraReport,
} from '../../../../services/scan3DService';

export const formatScanIdentifier = (id) => {
  if (!id) return '-';
  const str = String(id);
  if (str.startsWith('SCAN-3D-')) {
    const rawUuid = str.replace('SCAN-3D-', '');
    if (rawUuid.length >= 20) {
      return `SCAN-3D-${rawUuid.slice(0, 8)}...${rawUuid.slice(-6)}`;
    }
    return str;
  }
  if (str.length > 24) {
    return `${str.slice(0, 10)}...${str.slice(-6)}`;
  }
  return str;
};

export const scanFailureMessage = (code, reason) => {
  const messages = {
    SCAN_SERVICE_NOT_CONFIGURED: 'Layanan pemrosesan 3D belum dikonfigurasi. Hubungi administrator; merekam ulang tidak akan memperbaiki masalah ini.',
    ACQUISITION_SERVICE_UNAVAILABLE: 'Layanan analisis video sedang tidak tersedia. Rekaman sudah tersimpan; coba proses ulang setelah layanan aktif.',
    ACQUISITION_UNAVAILABLE: 'Video belum dapat dianalisis oleh layanan pemrosesan. Rekaman sudah tersimpan; periksa layanan sebelum mencoba proses ulang.',
    CAPTURE_QUALITY_REJECTED: 'Video tidak memiliki cukup frame yang berbeda dan jelas. Rekam video baru dengan gerakan kamera perlahan.',
    RECONSTRUCTION_GEOMETRY_INSUFFICIENT: 'Video menghasilkan geometri terlalu jarang untuk menjadi model gigi. Rekam video baru; arahkan kamera belakang lebih dekat ke gigi dan ulangi lintasan dari beberapa sudut.',
  };
  return messages[code] || reason || 'Terjadi gangguan saat memproses rekonstruksi video.';
};

// Prompts follow time, not observed anatomy. They do not certify tooth coverage.
export const captureGuideMessage = (elapsedSec) => {
  if (elapsedSec < 8) return 'Mulai dari geraham kiri. Dekatkan kamera belakang dan jaga 2–3 gigi tetap terlihat.';
  if (elapsedSec < 16) return 'Geser perlahan melewati gigi depan. Pertahankan tumpang tindih antar tampilan.';
  if (elapsedSec < 24) return 'Lanjutkan sampai geraham kanan. Hindari gerakan cepat dan pantulan lampu.';
  return 'Ambil sisi kunyah dan sisi pipi dari sudut berbeda; ulangi bagian yang belum terlihat.';
};

export const captureReviewWarnings = (video) => {
  if (!video) return [];
  const warnings = [];
  if (video.durationSec < 24) {
    warnings.push('Rekaman singkat untuk satu rahang. Pastikan geraham kiri, gigi depan, dan geraham kanan terlihat dari beberapa sudut.');
  }
  if (video.requestedResolution === '720p') {
    warnings.push('720p dipilih; detail gigi mungkin berkurang. Gunakan 1080p bila perangkat mendukung.');
  }
  return warnings;
};

const DentistScan3DContent = ({ navigation }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const user = useSelector((state) => state?.auth?.user);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  const handleLogout = async () => {
    dispatch(logout());
    await logoutPatient();
  };

  const rawName = user?.name || 'Dentist';
  const dentistName = rawName.startsWith('drg.') ? rawName : `drg. ${rawName}`;
  const initials = getInitials(rawName.replace(/^drg\.\s*/i, '')) || 'DR';

  const rawAvatar =
    user?.avatar_url ||
    user?.avatarUrl ||
    user?.avatar ||
    user?.profile_picture ||
    user?.profilePicture ||
    user?.dentistProfile?.avatar_url ||
    user?.dentistProfile?.photo ||
    null;
  const resolvedAvatar = resolveMediaUrl(rawAvatar);

  // Search & Patient List state
  const [patients, setPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Add Patient Modal state
  const [isAddPatientModalVisible, setIsAddPatientModalVisible] = useState(false);
  const [newPatientForm, setNewPatientForm] = useState({
    name: '',
    phone: '',
    email: '',
    gender: 'male',
  });
  const [creatingPatient, setCreatingPatient] = useState(false);
  const [addPatientError, setAddPatientError] = useState('');

  // Scan Configuration & Active Scan state
  const [scanArch, setScanArch] = useState('upper'); // Capture one arch per session.
  const [scanNotes, setScanNotes] = useState('');
  const [creatingScan, setCreatingScan] = useState(false);
  const [activeScanSession, setActiveScanSession] = useState(null);

  // Workflow Stage: 'setup' | 'camera' | 'review' | 'uploading' | 'processing'
  const [scanStage, setScanStage] = useState('setup');

  // Sembunyikan floating bottom navbar HANYA saat berada di mode kamera perekaman video
  useEffect(() => {
    navigation?.setParams?.({ hideTabBar: scanStage === 'camera' });
    return () => {
      navigation?.setParams?.({ hideTabBar: false });
    };
  }, [scanStage, navigation]);

  // Camera & Recording states
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const recordingCancelledRef = useRef(false);
  const cameraRef = useRef(null);
  const timerRef = useRef(null);
  const pollTimerRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [recordingDurationSec, setRecordingDurationSec] = useState(0);
  const [videoQuality, setVideoQuality] = useState('1080p'); // '1080p' | '720p'
  const [enableTorch, setEnableTorch] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState(null);
  const [uploadError, setUploadError] = useState('');

  // Asynchronous Processing states (Phase 5)
  const [processingStatus, setProcessingStatus] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    if (scanStage === 'camera') {
      setCameraReady(false);
      setCameraError(false);
    }
  }, [scanStage]);

  // Load patients from backend
  const loadPatients = useCallback(async (query = '') => {
    setLoadingPatients(true);
    const result = await fetchScanPatients(query);
    if (result.success) {
      setPatients(result.patients);
    }
    setLoadingPatients(false);
  }, []);

  useEffect(() => {
    loadPatients(patientSearchQuery);
  }, [loadPatients, patientSearchQuery]);

  const startPollingStatus = useCallback((scanId) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(async () => {
      const res = await fetch3DScanStatus(scanId);
      if (res.success) {
        setProcessingStatus(res);
        if (res.status === 'ready' || res.status === 'failed') {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      }
    }, 2000);
  }, []);

  useEffect(() => {
    return () => {
      recordingCancelledRef.current = true;
      cameraRef.current?.stopRecording();
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setActiveScanSession(null);
    setScanStage('setup');
  };

  const handleClearPatient = () => {
    setSelectedPatient(null);
    setActiveScanSession(null);
    setScanStage('setup');
  };

  const handleOpenAddPatientModal = () => {
    setNewPatientForm({
      name: '',
      phone: '',
      email: '',
      gender: 'male',
    });
    setAddPatientError('');
    setIsAddPatientModalVisible(true);
  };

  const handleCreatePatientSubmit = async () => {
    if (!newPatientForm.name.trim()) {
      setAddPatientError('Nama lengkap pasien wajib diisi.');
      return;
    }
    if (!newPatientForm.phone.trim()) {
      setAddPatientError('Nomor telepon / WhatsApp wajib diisi.');
      return;
    }

    setCreatingPatient(true);
    setAddPatientError('');

    const result = await createScanPatient({
      name: newPatientForm.name.trim(),
      phone: newPatientForm.phone.trim(),
      email: newPatientForm.email.trim() || undefined,
      gender: newPatientForm.gender,
    });

    setCreatingPatient(false);

    if (result.success && result.patient) {
      setIsAddPatientModalVisible(false);
      setSelectedPatient(result.patient);
      loadPatients('');
    } else {
      setAddPatientError(result.message || 'Gagal menambahkan pasien');
    }
  };

  const handleStartScan = async () => {
    if (!selectedPatient) return;

    setCreatingScan(true);
    const result = await create3DScan({
      patientId: selectedPatient.id,
      scanScope: scanArch,
      notes: scanNotes.trim() || undefined,
    });
    setCreatingScan(false);

    if (result.success && result.scan) {
      setActiveScanSession(result.scan);
      setScanStage('setup');
    } else {
      Alert.alert('Gagal Memulai Scan', result.message || 'Terjadi kesalahan sistem');
    }
  };

  const handleResetScanSession = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setActiveScanSession(null);
    setSelectedPatient(null);
    setScanNotes('');
    setRecordedVideo(null);
    setIsRecording(false);
    setRecordingDurationSec(0);
    setProcessingStatus(null);
    setScanStage('setup');
  };

  const formatTimer = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getEstimatedFileSize = (sec, quality) => {
    const rate = quality === '2160p' ? 4.4 : quality === '720p' ? 1.0 : 1.8;
    return (sec * rate).toFixed(1);
  };

  const handleStartRecording = async () => {
    if (!cameraRef.current || !cameraReady || isRecording) return;
    const startedAt = new Date().toISOString();
    const startedClock = performance.now();
    recordingCancelledRef.current = false;
    try {
      setIsRecording(true);
      setRecordingDurationSec(0);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRecordingDurationSec((prev) => prev + 1);
      }, 1000);

      const recordPromise = cameraRef.current.recordAsync({
        maxDuration: 120,
      });

      const videoResult = await recordPromise;
      const elapsedMs = performance.now() - startedClock;
      if (recordingCancelledRef.current) return;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsRecording(false);

      if (videoResult?.uri) {
        let sizeInBytes = 0;
        let fileInfo;
        try {
          fileInfo = await FileSystem.getInfoAsync(videoResult.uri);
          sizeInBytes = fileInfo?.size || 0;
        } catch (e) {
          console.warn('[DentistScan3D] Error reading file size:', e);
        }
        if (fileInfo?.exists === false || fileInfo?.size === 0) {
          Alert.alert('Rekaman Tidak Tersimpan', 'File video tidak tersedia. Rekam ulang sebelum mengunggah.');
          return;
        }

        const durationSec = Math.floor(elapsedMs / 1000);
        const formattedSize = sizeInBytes > 0
          ? `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`
          : 'Tidak tersedia';

        setRecordedVideo({
          uri: videoResult.uri,
          sizeInBytes,
          durationSec,
          formattedSize,
          requestedResolution: videoQuality,
          captureMetadata: buildScanCaptureMetadata({
            platform: Platform.OS, osVersion: Platform.Version,
            deviceModel: Platform.constants?.Model || null,
            requested: { resolution: videoQuality, facing: 'back', torch: enableTorch, audio: false },
            sizeInBytes, startedAt, elapsedMs, viewport: Dimensions.get('window'),
          }),
        });
        setScanStage('review');
      } else {
        Alert.alert('Rekaman Tidak Tersimpan', 'Kamera tidak menghasilkan file video. Coba rekam ulang.');
      }
    } catch (err) {
      console.error('[DentistScan3D] Recording error:', err);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsRecording(false);
      Alert.alert('Gagal Merekam', 'Terjadi kesalahan saat memulai perekaman video.');
    }
  };

  const handleStopRecording = () => {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsRecording(false);
    }
  };

  const handleRetryRecording = () => {
    setRecordedVideo(null);
    setRecordingDurationSec(0);
    setScanStage('camera');
  };

  const handleCancelRecording = () => {
    recordingCancelledRef.current = true;
    cameraRef.current?.stopRecording();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setIsRecording(false);
    setRecordedVideo(null);
    setScanStage('setup');
  };

  // Phase 4 & Phase 5: Upload video and queue for async reconstruction
  const handleUploadVideo = async () => {
    if (!activeScanSession || !recordedVideo) return;
    setScanStage('uploading');
    setUploadError('');

    const uploadRes = await upload3DScanVideo(activeScanSession.id, recordedVideo.uri, {
      captureMetadata: recordedVideo.captureMetadata,
      scanScope: activeScanSession.scanScope,
    });

    if (uploadRes.success && uploadRes.scan) {
      setActiveScanSession(uploadRes.scan);
      setScanStage('processing');
      setProcessingStatus({
        status: 'submitting',
        progressPercent: 0,
        currentStage: 'Menjadwalkan Rekonstruksi 3D',
      });
      await submitReconstructionQueue(uploadRes.scan.id);
    } else {
      setUploadError(uploadRes.message || 'Gagal mengunggah video scan');
      setScanStage('review');
      Alert.alert('Gagal Mengunggah', uploadRes.message || 'Terjadi gangguan jaringan saat mengunggah video.');
    }
  };

  const submitReconstructionQueue = async (scanId) => {
    const queueRes = await queue3DScan(scanId);
    if (queueRes.success) {
      setProcessingStatus({ status: 'queued', progressPercent: queueRes.job?.progressPercent ?? 5,
        currentStage: queueRes.job?.currentStage || 'Antrean Rekonstruksi 3D', job: queueRes.job });
      startPollingStatus(scanId);
      return;
    }

    // A timed-out queue request may have succeeded server-side. Check before offering a safe retry.
    const statusRes = await fetch3DScanStatus(scanId);
    if (statusRes.success && ['queued', 'processing', 'ready', 'failed'].includes(statusRes.status)) {
      setProcessingStatus(statusRes);
      if (statusRes.status === 'queued' || statusRes.status === 'processing') startPollingStatus(scanId);
      return;
    }
    setProcessingStatus({ status: 'queue_failed', failureReason: queueRes.message || 'Video tersimpan, tetapi rekonstruksi belum dijadwalkan.' });
  };

  const handleRetryQueue = async () => {
    if (!activeScanSession || isRetrying) return;
    setIsRetrying(true);
    setProcessingStatus({ status: 'submitting', progressPercent: 0, currentStage: 'Menjadwalkan Rekonstruksi 3D' });
    try {
      await submitReconstructionQueue(activeScanSession.id);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleRetryProcessing = async () => {
    if (!activeScanSession) return;
    setIsRetrying(true);
    setProcessingStatus((prev) => ({
      ...prev,
      status: 'queued',
      progressPercent: 5,
      currentStage: 'Menjadwalkan Ulang Rekonstruksi',
    }));

    const retryRes = await retry3DScan(activeScanSession.id);
    setIsRetrying(false);

    if (retryRes.success) {
      startPollingStatus(activeScanSession.id);
    } else {
      Alert.alert('Gagal Menjadwalkan Ulang', retryRes.message || 'Terjadi kesalahan sistem');
    }
  };

  if (scanStage === 'camera') {
    const hasCameraPerm = cameraPermission?.granted;

    return (
      <>
        <View style={{ flex: 1, backgroundColor: '#000000', position: 'relative', paddingTop: insets.top, paddingBottom: insets.bottom }}>
          {!hasCameraPerm ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#FFFFFF' }}>
              <MaterialCommunityIcons name="camera-off" size={64} color="#EF4444" />
              <Text variant="titleMedium" style={{ fontWeight: '700', color: '#0F172A', marginTop: 16, marginBottom: 8, textAlign: 'center' }}>
                Izin Kamera Diperlukan
              </Text>
              <Text variant="bodyMedium" style={{ color: '#64748B', textAlign: 'center', marginBottom: 20, lineHeight: 20, paddingHorizontal: 16 }}>
                Untuk merekam video kontinu intraoral 3D scan, SereneApps membutuhkan izin akses kamera. Audio tidak direkam.
              </Text>
              <Button
                mode="contained"
                onPress={async () => {
                  await requestCameraPermission();
                }}
                style={{ borderRadius: 12, marginBottom: 12, paddingHorizontal: 16 }}
                buttonColor={theme.colors.primary || '#0284C7'}
              >
                Berikan Izin Akses
              </Button>
              <Button mode="text" onPress={handleCancelRecording} textColor="#64748B">
                Kembali ke Pengaturan
              </Button>
            </View>
          ) : (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
              <CameraView
                key={videoQuality}
                ref={cameraRef}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                mode="video"
                videoQuality={videoQuality}
                mute
                facing="back"
                enableTorch={enableTorch}
                onCameraReady={() => { setCameraReady(true); setCameraError(false); }}
                onMountError={(event) => {
                  console.warn('[DentistScan3D] Camera mount error:', event?.nativeEvent?.message);
                  setCameraReady(false);
                  setCameraError(true);
                }}
              />

              {cameraError && (
                <View style={{ position: 'absolute', top: insets.top + 72, left: 16, right: 16, zIndex: 11, backgroundColor: '#7F1D1D', borderRadius: 12, padding: 12 }}>
                  <Text style={{ color: '#FFFFFF', textAlign: 'center' }}>Kamera gagal dibuka. Kembali ke pengaturan lalu coba lagi.</Text>
                </View>
              )}

              {/* CAMERA TOP BAR */}
              <View style={{ position: 'absolute', left: 16, right: 16, top: insets.top + 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
                <TouchableOpacity style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }} onPress={handleCancelRecording}>
                  <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TouchableOpacity
                    style={[{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }, enableTorch && { backgroundColor: '#0284C7', borderColor: '#38BDF8' }]}
                    disabled={isRecording}
                    onPress={() => setEnableTorch((prev) => !prev)}
                  >
                    <MaterialCommunityIcons
                      name={enableTorch ? 'flashlight' : 'flashlight-off'}
                      size={18}
                      color="#FFFFFF"
                    />
                    <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>Lampu</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}
                    disabled={isRecording}
                    onPress={() => { setCameraReady(false); setVideoQuality((prev) => (prev === '1080p' ? '720p' : '1080p')); }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>{videoQuality.toUpperCase()}</Text>
                  </TouchableOpacity>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 }}>
                    <MaterialCommunityIcons name="camera-rear" size={16} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>Belakang</Text>
                  </View>
                </View>
              </View>

              {/* GUIDED MOVEMENT OVERLAY */}
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 5 }} pointerEvents="none">
                <View style={{ width: 220, height: 140, justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}>
                  <View style={{ position: 'absolute', width: 200, height: 120, borderTopLeftRadius: 100, borderTopRightRadius: 100, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)', borderStyle: 'dashed' }} />
                  <MaterialCommunityIcons name="tooth-outline" size={32} color="rgba(255,255,255,0.85)" />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(15,23,42,0.8)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, maxWidth: '85%' }}>
                  <MaterialCommunityIcons
                    name={isRecording ? 'video' : 'information-outline'}
                    size={16}
                    color="#FFFFFF"
                  />
                  <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600', textAlign: 'center' }}>
                    {isRecording
                      ? captureGuideMessage(recordingDurationSec)
                      : `Satu rahang: ${activeScanSession?.scanScope === 'lower' ? 'BAWAH' : activeScanSession?.scanScope === 'upper' ? 'ATAS' : 'PILIH ATAS/BAWAH'}. Mulai dari geraham kiri; pastikan gigi memenuhi bingkai.`}
                  </Text>
                </View>
              </View>

              {/* LIVE RECORDING HUD (DUR & SIZE) */}
              {isRecording && (
                <View style={{ position: 'absolute', top: 80, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(220,38,38,0.9)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, zIndex: 10, gap: 8 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' }} />
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14, letterSpacing: 1 }}>{formatTimer(recordingDurationSec)}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>|</Text>
                  <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>
                    ~{getEstimatedFileSize(recordingDurationSec, videoQuality)} MB
                  </Text>
                </View>
              )}

              {/* BOTTOM SHUTTER / RECORD CONTROLS */}
              <View style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 16, alignItems: 'center', zIndex: 10 }}>
                {isRecording ? (
                  <TouchableOpacity
                    style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent', marginBottom: 8 }}
                    onPress={handleStopRecording}
                    activeOpacity={0.8}
                  >
                    <View style={{ width: 30, height: 30, borderRadius: 6, backgroundColor: '#EF4444' }} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent', marginBottom: 8 }}
                    onPress={handleStartRecording}
                    disabled={!cameraReady || cameraError}
                    activeOpacity={0.8}
                  >
                    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#EF4444' }} />
                  </TouchableOpacity>
                )}
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                  {isRecording ? 'Tekan untuk Selesai' : cameraError ? 'Kamera Tidak Siap' : cameraReady ? 'Mulai Perekaman' : 'Menyiapkan Kamera...'}
                </Text>
                {isRecording && recordingDurationSec < 24 && (
                  <Text style={{ color: '#E2E8F0', fontSize: 11, textAlign: 'center', marginTop: 4 }}>
                    Panduan lintasan: {24 - recordingDurationSec} detik lagi · waktu bukan bukti cakupan gigi
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>
      </>
    );
  }

  const getPatientInitials = (name) => {
    if (!name) return 'P';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView
          contentContainerStyle={[styles.scrollContainer, { paddingBottom: insets.bottom + 140 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* TOP HEADER - 100% Identik dengan DentistHomeScreen */}
          <View style={styles.headerRow}>
            <View style={styles.doctorInfoRow}>
              <View style={styles.avatarWrapper}>
                {resolvedAvatar && !avatarLoadFailed ? (
                  <Avatar.Image
                    size={50}
                    source={{ uri: resolvedAvatar }}
                    style={styles.avatar}
                    onError={() => setAvatarLoadFailed(true)}
                  />
                ) : (
                  <Avatar.Text
                    size={50}
                    label={initials}
                    style={styles.avatar}
                    labelStyle={styles.avatarLabel}
                  />
                )}
                <View style={styles.doctorOnlineBadge} />
              </View>

              <View style={styles.doctorTitleCol}>
                <Text variant="titleMedium" style={styles.doctorNameText} numberOfLines={2}>
                  {dentistName}
                </Text>
                <View style={styles.badgeRow}>
                  <View style={styles.verifiedBadge}>
                    <MaterialCommunityIcons name="check-decagram" size={13} color="#15803D" />
                    <Text style={styles.verifiedBadgeText}>Akun Dokter Gigi</Text>
                  </View>
                </View>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleLogout}
              style={styles.logoutButton}
            >
              <MaterialCommunityIcons name="logout-variant" size={16} color="#EF4444" />
              <Text style={styles.logoutText}>Keluar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.heroShadow}>
            <LinearGradient colors={['#4A0E78', '#62109F', '#7E22CE']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
              <View style={[styles.heroGlow, { width: 140, height: 140, top: -42, right: -35 }]} />
              <View style={[styles.heroGlow, { width: 90, height: 90, bottom: -42, left: -30 }]} />
              <View style={styles.heroTopRow}>
                <View style={styles.heroIconBox}><MaterialCommunityIcons name="tooth" size={26} color="#FFFFFF" /></View>
                <View style={styles.heroStatusPill}>
                  <MaterialCommunityIcons name="circle-small" size={16} color="#A7F3D0" />
                  <Text style={styles.heroStatusText}>
                    {scanStage === 'setup' ? (activeScanSession ? 'Siap Rekam' : 'Persiapan') :
                      scanStage === 'review' ? 'Tinjau Rekaman' : scanStage === 'uploading' ? 'Mengunggah' :
                      scanStage === 'processing' ? 'Memproses' : 'Selesai'}
                  </Text>
                </View>
              </View>
              <Text style={styles.heroTitle}>Smartphone Dental 3D Scan</Text>
              <Text style={styles.heroDescription}>
                Pilih pasien, tentukan area gigi, lalu rekam video untuk membuat model 3D eksperimental.
              </Text>
              <View style={styles.heroSteps}>
                {['Pasien', 'Area', 'Rekam'].map((label, index) => (
                  <View key={label} style={styles.heroStep}>
                    <View style={[styles.heroStepDot, (index === 0 || (index === 1 && selectedPatient) || (index === 2 && activeScanSession)) && styles.heroStepDotActive]}>
                      <Text style={[styles.heroStepNumber, !(index === 0 || (index === 1 && selectedPatient) || (index === 2 && activeScanSession)) && styles.heroStepNumberInactive]}>{index + 1}</Text>
                    </View>
                    <Text style={styles.heroStepLabel}>{label}</Text>
                  </View>
                ))}
              </View>
            </LinearGradient>
          </View>

          {/* REVIEW STATE */}
          {scanStage === 'review' && recordedVideo ? (
            <Card style={styles.card} elevation={2}>
              <Card.Content>
                <View style={styles.cardHeaderRow}>
                  <View style={[styles.cardHeaderIconBox, { backgroundColor: '#F3E8FF' }]}>
                    <MaterialCommunityIcons name="movie-check" size={24} color="#62109F" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="titleMedium" style={styles.cardTitle}>
                      Tinjau Rekaman 3D Scan
                    </Text>
                    <Text variant="bodySmall" style={styles.cardSubtitle}>
                      Verifikasi rekaman sebelum diunggah ke server untuk rekonstruksi
                    </Text>
                  </View>
                </View>

                {/* Specs Box */}
                <View style={styles.specsGrid}>
                  <View style={styles.specItem}>
                    <Text style={styles.specLabel}>DURASI (ESTIMASI)</Text>
                    <Text style={styles.specValue}>{formatTimer(recordedVideo.durationSec)}</Text>
                  </View>
                  <View style={styles.specDivider} />
                  <View style={styles.specItem}>
                    <Text style={styles.specLabel}>UKURAN FILE</Text>
                    <Text style={styles.specValue}>{recordedVideo.formattedSize}</Text>
                  </View>
                  <View style={styles.specDivider} />
                  <View style={styles.specItem}>
                    <Text style={styles.specLabel}>RESOLUSI DIMINTA</Text>
                    <Text style={styles.specValue}>{recordedVideo.requestedResolution.toUpperCase()}</Text>
                  </View>
                </View>

                {/* Patient & Scan Linkage */}
                <View style={styles.linkageBox}>
                  <View style={styles.linkageRow}>
                    <Text style={styles.linkageLabel}>Pasien:</Text>
                    <Text style={styles.linkageValue}>{activeScanSession?.patient?.name}</Text>
                  </View>
                  <View style={styles.linkageRow}>
                    <Text style={styles.linkageLabel}>Target Lengkung:</Text>
                    <Text style={styles.linkageValue}>{activeScanSession?.scanScope?.toUpperCase()}</Text>
                  </View>
                  <View style={styles.linkageRow}>
                    <Text style={styles.linkageLabel}>Scan Identifier:</Text>
                    <Text style={styles.linkageIdValue} numberOfLines={1} ellipsizeMode="middle">
                      {formatScanIdentifier(activeScanSession?.scanIdentifier)}
                    </Text>
                  </View>
                </View>

                {/* Guidance notice */}
                <View style={styles.guidanceBox}>
                  <MaterialCommunityIcons name="shield-check" size={18} color="#16A34A" />
                  <Text style={styles.guidanceText}>
                    File video asli akan diunggah. Codec dan resolusi aktual diverifikasi oleh server.
                  </Text>
                </View>

                {captureReviewWarnings(recordedVideo).map((warning) => (
                  <View key={warning} style={[styles.guidanceBox, { backgroundColor: '#FFFBEB' }]}>
                    <MaterialCommunityIcons name="alert-outline" size={18} color="#B45309" />
                    <Text style={[styles.guidanceText, { color: '#92400E' }]}>{warning}</Text>
                  </View>
                ))}
                <Text variant="bodySmall" style={{ color: '#64748B', marginBottom: 8 }}>
                  Aplikasi belum memverifikasi jumlah gigi atau cakupan anatomi. Tinjau rekaman Anda sendiri sebelum mengunggah.
                </Text>

                {/* Actions */}
                <View style={styles.cardActionGroup}>
                  <Button
                    mode="contained"
                    icon="cloud-upload"
                    onPress={handleUploadVideo}
                    style={styles.actionBtnPrimary}
                    buttonColor="#16A34A"
                  >
                    Unggah & Mulai Rekonstruksi
                  </Button>

                  <Button
                    mode="outlined"
                    icon="refresh"
                    onPress={handleRetryRecording}
                    style={styles.actionBtnOutlined}
                    textColor="#62109F"
                  >
                    Ulangi Rekaman
                  </Button>

                  <Button
                    mode="text"
                    onPress={handleCancelRecording}
                    textColor="#64748B"
                  >
                    Batal & Kembali
                  </Button>
                </View>
              </Card.Content>
            </Card>
          ) : scanStage === 'uploading' ? (
            /* UPLOADING STATE */
            <Card style={styles.card} elevation={2}>
              <Card.Content style={styles.centeredCardContent}>
                <ActivityIndicator size="large" color="#62109F" style={{ marginBottom: 16 }} />
                <Text variant="titleMedium" style={styles.cardTitleCentered}>
                  Mengunggah Video 3D Scan...
                </Text>
                <Text variant="bodySmall" style={styles.cardSubtitleCentered}>
                  Menyimpan video kontinu resolusi tinggi ke server X-Core dan menjadwalkan rekonstruksi.
                </Text>
                <View style={styles.uploadingPill}>
                  <Text style={styles.uploadingPillText}>
                    {recordedVideo?.formattedSize || '1080p'} • {formatTimer(recordedVideo?.durationSec || 0)}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          ) : scanStage === 'processing' ? (
            /* ASYNCHRONOUS PROCESSING STAGE */
            processingStatus?.status === 'ready' ? (
              /* READY / COMPLETED STATE */
              <Card style={styles.card} elevation={2}>
                <Card.Content>
                  <View style={styles.cardHeaderRow}>
                    <View style={[styles.cardHeaderIconBox, { backgroundColor: '#DCFCE7' }]}>
                      <MaterialCommunityIcons name="check-decagram" size={28} color="#16A34A" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="titleMedium" style={styles.cardTitle}>
                        Mesh Eksperimental Dibuat
                      </Text>
                      <Text variant="bodySmall" style={styles.cardSubtitle}>
                        Aset 3D tersedia di X-Core. Bentuk dan cakupan tiap gigi belum tervalidasi.
                      </Text>
                    </View>
                  </View>

                  {/* 3D Asset Spec Card */}
                  <View style={styles.assetSpecBox}>
                    <View style={styles.assetSpecHeader}>
                      <MaterialCommunityIcons name="cube-outline" size={20} color="#16A34A" />
                      <Text style={styles.assetSpecTitle}>ASET 3D MESH TERDAFTAR</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabelGreen}>Format File:</Text>
                      <Text style={styles.infoValueGreen}>{processingStatus?.assets?.mesh?.format || 'Tidak tersedia'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabelGreen}>Jumlah Vertex:</Text>
                      <Text style={styles.infoValueGreen}>
                        {processingStatus?.assets?.mesh?.vertexCount ?? 'Tidak tersedia'} vertices
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabelGreen}>Jumlah Face:</Text>
                      <Text style={styles.infoValueGreen}>
                        {processingStatus?.assets?.mesh?.faceCount ?? 'Tidak tersedia'} polygons
                      </Text>
                    </View>
                  </View>

                  {/* LIDRA INTELLIGENCE CARD */}
                  <View style={styles.lidraBox}>
                    <View style={styles.lidraHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <MaterialCommunityIcons name="shield-check" size={18} color="#62109F" />
                        <Text style={styles.lidraTitle}>LIDRA ACQUISITION INTELLIGENCE</Text>
                      </View>
                      <Chip compact style={{ backgroundColor: '#EDE9FE', height: 22 }} textStyle={{ color: '#62109F', fontSize: 10, fontWeight: '700' }}>
                        {processingStatus?.lidra?.qualityScore ?? 'Tidak tersedia'}
                      </Chip>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Ketajaman & Motion Blur:</Text>
                      <Text style={styles.infoValueSuccess}>
                        {processingStatus?.lidra?.blur?.status || processingStatus?.lidra?.motionBlur?.status || 'Tidak tersedia'}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Pencahayaan & Kontras:</Text>
                      <Text style={styles.infoValue}>
                        {processingStatus?.lidra?.exposure?.status || 'Tidak tersedia'}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Keyframe Terpilih:</Text>
                      <Text style={[styles.infoValue, { color: '#62109F', fontWeight: '700' }]}>
                        {processingStatus?.lidra?.selectedFramesCount ?? processingStatus?.lidra?.frameSelection?.selectedFramesCount ?? 'Tidak tersedia'}
                        {(processingStatus?.lidra?.selectedFramesCount ?? processingStatus?.lidra?.frameSelection?.selectedFramesCount) != null ? ' frames' : ''}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardActionGroup}>
                    <Button
                      mode="contained"
                      icon="plus"
                      onPress={handleResetScanSession}
                      style={styles.actionBtnPrimary}
                      buttonColor="#62109F"
                    >
                      Buat Sesi Scan Baru
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            ) : processingStatus?.status === 'queue_failed' ? (
              <Card style={styles.card} elevation={2}>
                <Card.Content>
                  <View style={styles.cardHeaderRow}>
                    <View style={[styles.cardHeaderIconBox, { backgroundColor: '#FEF3C7' }]}>
                      <MaterialCommunityIcons name="cloud-alert" size={28} color="#B45309" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="titleMedium" style={styles.cardTitle}>Video Tersimpan, Rekonstruksi Belum Dimulai</Text>
                      <Text variant="bodySmall" style={styles.cardSubtitle}>
                        {processingStatus.failureReason}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardActionGroup}>
                    <Button mode="contained" icon="refresh" loading={isRetrying} disabled={isRetrying}
                      onPress={handleRetryQueue} style={styles.actionBtnPrimary} buttonColor="#62109F">
                      Coba Jadwalkan Lagi
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            ) : processingStatus?.status === 'failed' ? (
              /* FAILED STATE */
              <Card style={styles.card} elevation={2}>
                <Card.Content>
                  <View style={styles.cardHeaderRow}>
                    <View style={[styles.cardHeaderIconBox, { backgroundColor: '#FEE2E2' }]}>
                      <MaterialCommunityIcons name="alert-circle" size={28} color="#EF4444" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="titleMedium" style={styles.cardTitle}>
                        Rekonstruksi 3D Gagal
                      </Text>
                      <Text variant="bodySmall" style={styles.cardSubtitle}>
                        {scanFailureMessage(processingStatus?.job?.failureCode, processingStatus?.failureReason)}
                      </Text>
                      {processingStatus?.job?.failureCode ? (
                        <Text style={styles.failureCode}>Kode: {processingStatus.job.failureCode}</Text>
                      ) : null}
                      {processingStatus?.failureReason ? (
                        <Text style={styles.failureCode}>Detail server: {processingStatus.failureReason}</Text>
                      ) : null}
                    </View>
                  </View>

                  <View style={styles.cardActionGroup}>
                    {['CAPTURE_QUALITY_REJECTED', 'RECONSTRUCTION_GEOMETRY_INSUFFICIENT', 'VIDEO_NOT_VERIFIED', 'VIDEO_CORRUPT', 'INVALID_VIDEO'].includes(processingStatus?.job?.failureCode) ? (
                      <Button mode="contained" icon="video" onPress={handleRetryRecording}
                        style={styles.actionBtnPrimary} buttonColor="#62109F">Rekam Video Baru</Button>
                    ) : (
                      <Button mode="contained" icon="refresh" loading={isRetrying} disabled={isRetrying}
                        onPress={handleRetryProcessing} style={styles.actionBtnPrimary} buttonColor="#62109F">
                        Coba Lagi Rekonstruksi
                      </Button>
                    )}
                    <Button
                      mode="text"
                      onPress={handleResetScanSession}
                      textColor="#64748B"
                    >
                      Kembali & Buat Sesi Baru
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            ) : (
              /* IN-PROGRESS / QUEUED WORKER STATE */
              <Card style={styles.card} elevation={2}>
                <Card.Content style={styles.centeredCardContent}>
                  <ActivityIndicator size="large" color="#62109F" style={{ marginBottom: 16 }} />
                  <Text variant="titleMedium" style={styles.cardTitleCentered}>
                    {processingStatus?.status === 'queued' ? 'Menunggu Antrean Rekonstruksi...' : 'Sedang Rekonstruksi 3D...'}
                  </Text>
                  <Text variant="bodySmall" style={styles.cardSubtitleCentered}>
                    Pipeline asinkron X-Core sedang memproses ekstraksi surface mesh dari video kontinu RGB.
                  </Text>

                  {/* Progress Indicator */}
                  <View style={styles.progressBarWrapper}>
                    <ProgressBar
                      progress={(processingStatus?.progressPercent || 25) / 100}
                      color="#62109F"
                      style={styles.progressBar}
                    />
                    <View style={styles.progressInfoRow}>
                      <Text style={styles.progressStageText}>
                        Tahap: {processingStatus?.currentStage || 'processing'}
                      </Text>
                      <Text style={styles.progressPercentText}>
                        {processingStatus?.progressPercent || 25}%
                      </Text>
                    </View>
                  </View>

                  <View style={styles.backgroundNoticeBox}>
                    <MaterialCommunityIcons name="information-outline" size={18} color="#64748B" />
                    <Text style={styles.backgroundNoticeText}>
                      Proses ini berjalan di background server. Anda dapat kembali ke halaman utama kapan saja.
                    </Text>
                  </View>

                  <Button
                    mode="outlined"
                    onPress={handleResetScanSession}
                    style={styles.actionBtnOutlined}
                    textColor="#475569"
                  >
                    Lanjutkan di Latar Belakang
                  </Button>
                </Card.Content>
              </Card>
            )
          ) : activeScanSession ? (
            /* ACTIVE SCAN CONFIRMATION STATE */
            <Card style={[styles.card, { borderColor: '#DDD6FE', borderWidth: 1.5 }]} elevation={3}>
              <Card.Content>
                <View style={styles.cardHeaderRow}>
                  <View style={[styles.cardHeaderIconBox, { backgroundColor: '#F3E8FF' }]}>
                    <MaterialCommunityIcons name="check-bold" size={24} color="#62109F" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="titleMedium" style={styles.cardTitle}>
                      Sesi 3D Scan Berhasil Dibuat!
                    </Text>
                    <Text variant="bodySmall" style={styles.cardSubtitle}>
                      Tautan data pasien & identifikasi scan telah tercatat
                    </Text>
                  </View>
                </View>

                <View style={styles.linkageBox}>
                  <Text style={styles.linkageHeaderTitle}>SCAN IDENTIFIER:</Text>
                  <Text style={styles.linkageValueMonospace} numberOfLines={1} ellipsizeMode="middle">
                    {formatScanIdentifier(activeScanSession.scanIdentifier)}
                  </Text>
                </View>

                <View style={styles.infoRowDivider}>
                  <Text style={styles.infoLabel}>Pasien:</Text>
                  <Text style={styles.infoValue}>{activeScanSession.patient?.name}</Text>
                </View>

                <View style={styles.infoRowDivider}>
                  <Text style={styles.infoLabel}>Target Lengkung:</Text>
                  <Text style={styles.infoValue}>{activeScanSession.scanScope?.toUpperCase()}</Text>
                </View>

                <View style={styles.infoRowDivider}>
                  <Text style={styles.infoLabel}>Status Sesi:</Text>
                  <View style={styles.sessionStatusBadge}>
                    <View style={styles.sessionStatusDot} />
                    <Text style={styles.sessionStatusBadgeText}>
                      {activeScanSession.status || 'created'} (Siap Rekam)
                    </Text>
                  </View>
                </View>

                <View style={styles.cardActionGroup}>
                  <Button
                    mode="contained"
                    icon="camera"
                    onPress={() => setScanStage('camera')}
                    style={styles.actionBtnPrimary}
                    buttonColor="#62109F"
                  >
                    Lanjutkan ke Perekaman Video
                  </Button>

                  <Button
                    mode="outlined"
                    icon="plus"
                    onPress={handleResetScanSession}
                    style={styles.actionBtnOutlined}
                    textColor="#64748B"
                  >
                    Buat Sesi Scan Baru
                  </Button>
                </View>
              </Card.Content>
            </Card>
          ) : (
            <>
              {/* SECTION 1: Patient Selection & Creation */}
              <Card style={styles.card} elevation={1}>
                <Card.Content style={styles.cardContent}>
                  <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionTitleRow}>
                      <View style={styles.stepNumCircle}>
                        <Text style={styles.stepNumText}>1</Text>
                      </View>
                      <Text variant="titleMedium" style={styles.sectionTitle}>
                        Pasien untuk 3D Scan
                      </Text>
                    </View>
                    {selectedPatient ? (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={handleClearPatient}
                        style={styles.changePatientBtn}
                      >
                        <MaterialCommunityIcons name="sync" size={14} color="#62109F" style={{ marginRight: 4 }} />
                        <Text style={styles.changePatientText}>Ganti</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handleOpenAddPatientModal}
                        style={styles.addPatientBtn}
                      >
                        <MaterialCommunityIcons name="account-plus" size={14} color="#62109F" style={{ marginRight: 4 }} />
                        <Text style={styles.addPatientBtnText}>+ Pasien Baru</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {selectedPatient ? (
                    <View style={styles.selectedPatientCard}>
                      <View style={styles.selectedPatientAvatar}>
                        {selectedPatient?.avatar_url || selectedPatient?.avatar ? (
                          <Avatar.Image
                            size={42}
                            source={{ uri: resolveMediaUrl(selectedPatient.avatar_url || selectedPatient.avatar) }}
                          />
                        ) : (
                          <Text style={styles.selectedPatientAvatarText}>
                            {getPatientInitials(selectedPatient.name)}
                          </Text>
                        )}
                      </View>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.selectedPatientName} numberOfLines={1}>
                            {selectedPatient.name}
                          </Text>
                          <View style={styles.selectedPillBadge}>
                            <MaterialCommunityIcons name="check-circle" size={12} color="#15803D" />
                            <Text style={styles.selectedPillBadgeText}>Terpilih</Text>
                          </View>
                        </View>
                        <Text style={styles.selectedPatientMeta} numberOfLines={1}>
                          {selectedPatient.mrn} • {selectedPatient.phone || selectedPatient.phone_number || selectedPatient.email || 'Tanpa No. HP'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={handleClearPatient}
                        style={styles.clearSelectedBtn}
                      >
                        <MaterialCommunityIcons name="close" size={18} color="#64748B" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ marginTop: 2 }}>
                      <TextInput
                        mode="outlined"
                        placeholder="Cari pasien berdasarkan nama atau no. telepon..."
                        placeholderTextColor="#94A3B8"
                        value={patientSearchQuery}
                        onChangeText={setPatientSearchQuery}
                        left={<TextInput.Icon icon="magnify" color="#94A3B8" />}
                        right={
                          patientSearchQuery ? (
                            <TextInput.Icon icon="close" onPress={() => setPatientSearchQuery('')} color="#94A3B8" />
                          ) : null
                        }
                        style={styles.searchTextInput}
                        outlineStyle={styles.searchOutline}
                        dense
                      />

                      <View style={styles.patientSubheaderRow}>
                        <Text style={styles.patientSubheaderTitle}>Pilih Pasien Terdaftar:</Text>
                        {loadingPatients && <ActivityIndicator size="small" color="#62109F" />}
                      </View>

                      {patients.length === 0 && !loadingPatients ? (
                        <View style={styles.emptyPatientsContainer}>
                          <MaterialCommunityIcons name="account-search-outline" size={32} color="#94A3B8" />
                          <Text style={styles.emptyPatientsText}>
                            {patientSearchQuery
                              ? 'Tidak ada pasien yang cocok. Tambahkan pasien baru untuk scan ini.'
                              : 'Belum ada pasien terdaftar. Silakan tambah pasien baru.'}
                          </Text>
                          <TouchableOpacity
                            onPress={handleOpenAddPatientModal}
                            style={styles.emptyAddBtn}
                            activeOpacity={0.8}
                          >
                            <MaterialCommunityIcons name="account-plus-outline" size={16} color="#62109F" style={{ marginRight: 6 }} />
                            <Text style={styles.emptyAddBtnText}>Tambah Pasien Baru</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={styles.patientListBoundedWrap}>
                          <ScrollView
                            nestedScrollEnabled={true}
                            showsVerticalScrollIndicator={true}
                            style={styles.patientListScrollView}
                          >
                            {patients.map((patient) => {
                              const pInitials = getPatientInitials(patient.name);
                              return (
                                <TouchableOpacity
                                  key={patient.id}
                                  onPress={() => handleSelectPatient(patient)}
                                  style={styles.patientRowItem}
                                  activeOpacity={0.7}
                                >
                                  <View style={styles.patientRowAvatar}>
                                    {patient.avatar_url || patient.avatar ? (
                                      <Avatar.Image
                                        size={34}
                                        source={{ uri: resolveMediaUrl(patient.avatar_url || patient.avatar) }}
                                      />
                                    ) : (
                                      <Text style={styles.patientRowAvatarText}>{pInitials}</Text>
                                    )}
                                  </View>
                                  <View style={{ flex: 1, marginRight: 8 }}>
                                    <Text style={styles.patientRowName} numberOfLines={1}>{patient.name}</Text>
                                    <Text style={styles.patientRowMeta} numberOfLines={1}>
                                      {patient.mrn} • {patient.phone || patient.phone_number || 'Tanpa No. HP'}
                                    </Text>
                                  </View>
                                  <MaterialCommunityIcons name="chevron-right" size={20} color="#CBD5E1" />
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                  )}
                </Card.Content>
              </Card>

              {/* SECTION 2: Scan Scope / Target Arch */}
              <Card style={styles.card} elevation={1}>
                <Card.Content style={styles.cardContent}>
                  <View style={styles.sectionTitleRow}>
                    <View style={styles.stepNumCircle}>
                      <Text style={styles.stepNumText}>2</Text>
                    </View>
                    <Text variant="titleMedium" style={styles.sectionTitle}>
                      Target Lengkung Gigi
                    </Text>
                  </View>
                  <Text variant="bodySmall" style={styles.sectionSubtitle}>
                    Pilih cakupan area scan yang akan direkonstruksi:
                  </Text>

                  {/* 3-Column Segmented Arch Selector */}
                  <View style={styles.archGridRow}>
                    {/* Full Arch */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      disabled
                      style={[
                        styles.archSegmentCard,
                        { opacity: 0.5 },
                      ]}
                    >
                      <View style={styles.archIconCircle}>
                        <MaterialCommunityIcons
                          name="tooth-outline"
                          size={20}
                          color="#64748B"
                        />
                      </View>
                      <Text style={styles.archSegmentTitle}>
                        Full Arch
                      </Text>
                      <Text style={styles.archSegmentSubtitle}>2 sesi terpisah</Text>
                    </TouchableOpacity>

                    {/* Maxilla (Atas) */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setScanArch('upper')}
                      style={[
                        styles.archSegmentCard,
                        scanArch === 'upper' && styles.archSegmentCardActive,
                      ]}
                    >
                      <View style={[styles.archIconCircle, scanArch === 'upper' && styles.archIconCircleActive]}>
                        <MaterialCommunityIcons
                          name="arrow-up-circle-outline"
                          size={20}
                          color={scanArch === 'upper' ? '#62109F' : '#64748B'}
                        />
                      </View>
                      <Text style={[styles.archSegmentTitle, scanArch === 'upper' && styles.archSegmentTitleActive]}>
                        Maxilla
                      </Text>
                      <Text style={styles.archSegmentSubtitle}>Rahang Atas</Text>
                      {scanArch === 'upper' && (
                        <View style={styles.archCheckDot}>
                          <MaterialCommunityIcons name="check" size={10} color="#FFFFFF" />
                        </View>
                      )}
                    </TouchableOpacity>

                    {/* Mandibula (Bawah) */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setScanArch('lower')}
                      style={[
                        styles.archSegmentCard,
                        scanArch === 'lower' && styles.archSegmentCardActive,
                      ]}
                    >
                      <View style={[styles.archIconCircle, scanArch === 'lower' && styles.archIconCircleActive]}>
                        <MaterialCommunityIcons
                          name="arrow-down-circle-outline"
                          size={20}
                          color={scanArch === 'lower' ? '#62109F' : '#64748B'}
                        />
                      </View>
                      <Text style={[styles.archSegmentTitle, scanArch === 'lower' && styles.archSegmentTitleActive]}>
                        Mandibula
                      </Text>
                      <Text style={styles.archSegmentSubtitle}>Rahang Bawah</Text>
                      {scanArch === 'lower' && (
                        <View style={styles.archCheckDot}>
                          <MaterialCommunityIcons name="check" size={10} color="#FFFFFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>

                  <Text variant="bodySmall" style={{ color: '#64748B', marginTop: 8, lineHeight: 18 }}>
                    Rekam rahang atas dan bawah sebagai sesi terpisah. Satu video untuk kedua rahang belum menghasilkan model tiap gigi yang andal.
                  </Text>

                  <TextInput
                    mode="outlined"
                    label="Catatan Klinis (Opsional)"
                    placeholder="Contoh: Evaluasi implan regio 36"
                    placeholderTextColor="#94A3B8"
                    value={scanNotes}
                    onChangeText={setScanNotes}
                    outlineColor="#E2E8F0"
                    activeOutlineColor="#62109F"
                    style={styles.notesTextInput}
                    outlineStyle={{ borderRadius: 12 }}
                    dense
                  />
                </Card.Content>
              </Card>

              {/* SECTION 3: Action Button */}
              <View style={styles.bottomActionWrapper}>
                <TouchableOpacity
                  activeOpacity={selectedPatient && !creatingScan ? 0.85 : 1}
                  disabled={!selectedPatient || creatingScan}
                  onPress={handleStartScan}
                  style={[
                    styles.primaryCtaButton,
                    selectedPatient ? styles.primaryCtaActive : styles.primaryCtaDisabled,
                  ]}
                >
                  {creatingScan ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <View style={styles.primaryCtaInner}>
                      <MaterialCommunityIcons
                        name="tooth-outline"
                        size={20}
                        color={selectedPatient ? '#FFFFFF' : '#94A3B8'}
                        style={{ marginRight: 8 }}
                      />
                      <Text
                        style={[
                          styles.primaryCtaText,
                          selectedPatient ? styles.primaryCtaTextActive : styles.primaryCtaTextDisabled,
                        ]}
                      >
                        {selectedPatient ? 'Mulai Sesi 3D Scan' : 'Pilih Pasien Terlebih Dahulu'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                {!selectedPatient && (
                  <Text style={styles.ctaDisabledHint}>
                    Silakan pilih salah satu pasien di atas untuk memulai pemindaian 3D
                  </Text>
                )}

                {/* Research Reference Disclaimer Card */}
                <View style={styles.researchDisclaimerCard}>
                  <View style={styles.researchDisclaimerIconWrap}>
                    <MaterialCommunityIcons name="school-outline" size={16} color="#62109F" />
                  </View>
                  <Text style={styles.researchDisclaimerText}>
                    Riset in vitro sebagai referensi; hasil SereneApps belum tervalidasi klinis
                  </Text>
                </View>
              </View>
            </>
          )}

          {/* MODAL: Tambah Pasien Baru */}
          <Portal>
            <Modal
              visible={isAddPatientModalVisible}
              onDismiss={() => setIsAddPatientModalVisible(false)}
              contentContainerStyle={styles.modalContent}
            >
              <View style={styles.modalHeaderRow}>
                <View style={styles.modalIconBox}>
                  <MaterialCommunityIcons name="account-plus-outline" size={24} color="#62109F" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="titleMedium" style={styles.modalTitle}>
                    Tambah Pasien Baru
                  </Text>
                  <Text variant="bodySmall" style={styles.modalSubtitle}>
                    Daftarkan pasien secara instan untuk pemindaian 3D scan ini.
                  </Text>
                </View>
              </View>

              {addPatientError ? (
                <View style={styles.modalErrorBanner}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#DC2626" style={{ marginRight: 8, marginTop: 1 }} />
                  <Text style={styles.modalErrorText}>{addPatientError}</Text>
                </View>
              ) : null}

              <TextInput
                mode="outlined"
                label="Nama Lengkap Pasien *"
                value={newPatientForm.name}
                onChangeText={(text) => setNewPatientForm((prev) => ({ ...prev, name: text }))}
                outlineColor="#E2E8F0"
                activeOutlineColor="#62109F"
                style={styles.modalInput}
                outlineStyle={{ borderRadius: 12 }}
                dense
              />

              <TextInput
                mode="outlined"
                label="Nomor Telepon / WhatsApp *"
                placeholder="Contoh: 081234567890"
                keyboardType="phone-pad"
                value={newPatientForm.phone}
                onChangeText={(text) => setNewPatientForm((prev) => ({ ...prev, phone: text }))}
                outlineColor="#E2E8F0"
                activeOutlineColor="#62109F"
                style={styles.modalInput}
                outlineStyle={{ borderRadius: 12 }}
                dense
              />

              <TextInput
                mode="outlined"
                label="Email (Opsional)"
                keyboardType="email-address"
                autoCapitalize="none"
                value={newPatientForm.email}
                onChangeText={(text) => setNewPatientForm((prev) => ({ ...prev, email: text }))}
                outlineColor="#E2E8F0"
                activeOutlineColor="#62109F"
                style={styles.modalInput}
                outlineStyle={{ borderRadius: 12 }}
                dense
              />

              <Text style={styles.genderLabel}>Jenis Kelamin:</Text>
              <View style={styles.genderRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.genderPill,
                    newPatientForm.gender === 'male' && styles.genderPillActive,
                  ]}
                  onPress={() => setNewPatientForm((prev) => ({ ...prev, gender: 'male' }))}
                >
                  <MaterialCommunityIcons
                    name="gender-male"
                    size={16}
                    color={newPatientForm.gender === 'male' ? '#62109F' : '#64748B'}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.genderPillText,
                      newPatientForm.gender === 'male' && styles.genderPillTextActive,
                    ]}
                  >
                    Laki-laki
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.genderPill,
                    newPatientForm.gender === 'female' && styles.genderPillActive,
                  ]}
                  onPress={() => setNewPatientForm((prev) => ({ ...prev, gender: 'female' }))}
                >
                  <MaterialCommunityIcons
                    name="gender-female"
                    size={16}
                    color={newPatientForm.gender === 'female' ? '#62109F' : '#64748B'}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.genderPillText,
                      newPatientForm.gender === 'female' && styles.genderPillTextActive,
                    ]}
                  >
                    Perempuan
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalBtnRow}>
                <Button
                  mode="text"
                  onPress={() => setIsAddPatientModalVisible(false)}
                  style={{ borderRadius: 12 }}
                  textColor="#64748B"
                >
                  Batal
                </Button>
                <Button
                  mode="contained"
                  loading={creatingPatient}
                  disabled={creatingPatient}
                  onPress={handleCreatePatientSubmit}
                  style={styles.modalSubmitBtn}
                  buttonColor="#62109F"
                >
                  Simpan & Pilih
                </Button>
              </View>
            </Modal>
          </Portal>
        </ScrollView>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    marginTop: 4,
  },
  doctorInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    backgroundColor: '#62109F',
  },
  avatarLabel: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 18,
  },
  doctorOnlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  doctorTitleCol: {
    flex: 1,
  },
  doctorNameText: {
    fontWeight: '800',
    color: '#0F172A',
    fontSize: 18,
    letterSpacing: 0.2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  verifiedBadgeText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
  heroShadow: {
    borderRadius: 22,
    marginBottom: 18,
    shadowColor: '#62109F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 8,
  },
  heroCard: {
    borderRadius: 22,
    padding: 22,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  heroIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  heroStatusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
    marginBottom: 6,
  },
  heroDescription: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 18,
  },
  heroSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.24)',
  },
  heroStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroStepDot: {
    width: 21,
    height: 21,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  heroStepDotActive: {
    backgroundColor: '#FFFFFF',
  },
  heroStepNumber: {
    color: '#62109F',
    fontWeight: '800',
    fontSize: 11,
  },
  heroStepNumberInactive: {
    color: '#FFFFFF',
  },
  heroStepLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },

  /* Cards */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EDE9F3',
    overflow: 'hidden',
  },
  cardContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  cardHeaderIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontWeight: '800',
    color: '#0F172A',
    fontSize: 16,
  },
  cardSubtitle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  failureCode: {
    color: '#9F1239',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
  },
  centeredCardContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  cardTitleCentered: {
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
  },
  cardSubtitleCentered: {
    color: '#64748B',
    textAlign: 'center',
    fontSize: 12,
    maxWidth: '85%',
    marginBottom: 16,
  },

  /* Section Headers */
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepNumCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumText: {
    color: '#62109F',
    fontSize: 11,
    fontWeight: '800',
  },
  sectionTitle: {
    fontWeight: '800',
    color: '#0F172A',
    fontSize: 16,
  },
  sectionSubtitle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 14,
  },

  /* Section 1: Patient Buttons */
  addPatientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  addPatientBtnText: {
    color: '#62109F',
    fontSize: 12,
    fontWeight: '700',
  },
  changePatientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  changePatientText: {
    color: '#62109F',
    fontSize: 11,
    fontWeight: '700',
  },

  /* Selected Patient Card */
  selectedPatientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF5FF',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
  },
  selectedPatientAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#62109F',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectedPatientAvatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  selectedPatientName: {
    fontWeight: '700',
    fontSize: 14,
    color: '#0F172A',
  },
  selectedPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  selectedPillBadgeText: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '700',
  },
  selectedPatientMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 3,
  },
  clearSelectedBtn: {
    padding: 6,
  },

  /* Search & Patient List */
  searchTextInput: {
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  searchOutline: {
    borderRadius: 12,
    borderColor: '#E2E8F0',
  },
  patientSubheaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
  },
  patientSubheaderTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  patientListBoundedWrap: {
    maxHeight: 220,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#FAFAFA',
    overflow: 'hidden',
  },
  patientListScrollView: {
    padding: 6,
  },
  patientRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  patientRowAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  patientRowAvatarText: {
    color: '#62109F',
    fontWeight: '700',
    fontSize: 12,
  },
  patientRowName: {
    fontWeight: '600',
    fontSize: 13,
    color: '#1E293B',
  },
  patientRowMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },

  /* Empty Patient State */
  emptyPatientsContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 4,
  },
  emptyPatientsText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 10,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  emptyAddBtnText: {
    color: '#62109F',
    fontSize: 12,
    fontWeight: '700',
  },

  /* Section 2: Arch Scope Grid */
  archGridRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  archSegmentCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  archSegmentCardActive: {
    backgroundColor: '#FAF5FF',
    borderColor: '#62109F',
    shadowColor: '#62109F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  archIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  archIconCircleActive: {
    backgroundColor: '#EDE9FE',
  },
  archSegmentTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
  },
  archSegmentTitleActive: {
    color: '#62109F',
    fontWeight: '800',
  },
  archSegmentSubtitle: {
    fontSize: 9.5,
    color: '#94A3B8',
    marginTop: 2,
    textAlign: 'center',
  },
  archCheckDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#62109F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notesTextInput: {
    backgroundColor: '#FFFFFF',
  },

  /* Section 3: Bottom Action */
  bottomActionWrapper: {
    marginTop: 8,
    marginBottom: 20,
  },
  primaryCtaButton: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCtaActive: {
    backgroundColor: '#62109F',
    shadowColor: '#62109F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryCtaDisabled: {
    backgroundColor: '#E2E8F0',
  },
  primaryCtaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCtaText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  primaryCtaTextActive: {
    color: '#FFFFFF',
  },
  primaryCtaTextDisabled: {
    color: '#94A3B8',
  },
  ctaDisabledHint: {
    fontSize: 11.5,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
    paddingHorizontal: 16,
  },
  researchDisclaimerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  researchDisclaimerIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  researchDisclaimerText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: '#64748B',
    fontWeight: '500',
  },

  /* Review / Linkage / Specs Box */
  specsGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'space-around',
  },
  specItem: {
    alignItems: 'center',
    flex: 1,
  },
  specDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
  },
  specLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 3,
  },
  specValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  linkageBox: {
    backgroundColor: '#FAF5FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    gap: 6,
  },
  linkageHeaderTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#62109F',
    letterSpacing: 0.5,
  },
  linkageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  linkageLabel: {
    fontSize: 12,
    color: '#62109F',
    fontWeight: '600',
  },
  linkageValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
  },
  linkageIdValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#62109F',
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  linkageValueMonospace: {
    fontSize: 13,
    fontWeight: '800',
    color: '#62109F',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  sessionStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 6,
  },
  sessionStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D97706',
  },
  sessionStatusBadgeText: {
    color: '#D97706',
    fontWeight: '700',
    fontSize: 11,
    lineHeight: 15,
  },
  guidanceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  guidanceText: {
    fontSize: 11,
    color: '#15803D',
    flex: 1,
    fontWeight: '500',
  },
  cardActionGroup: {
    marginTop: 14,
    gap: 10,
  },
  actionBtnPrimary: {
    borderRadius: 14,
  },
  actionBtnOutlined: {
    borderRadius: 14,
    borderColor: '#CBD5E1',
  },
  uploadingPill: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  uploadingPillText: {
    color: '#62109F',
    fontSize: 12,
    fontWeight: '700',
  },

  /* Processing Stage */
  assetSpecBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 14,
  },
  assetSpecHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  assetSpecTitle: {
    fontWeight: '700',
    fontSize: 12,
    color: '#166534',
  },
  lidraBox: {
    backgroundColor: '#FAF5FF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginBottom: 14,
  },
  lidraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  lidraTitle: {
    fontWeight: '700',
    fontSize: 12,
    color: '#62109F',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  infoRowDivider: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  infoLabelGreen: {
    fontSize: 12,
    color: '#15803D',
  },
  infoValueGreen: {
    fontSize: 12,
    fontWeight: '700',
    color: '#14532D',
  },
  infoValueSuccess: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
  },
  progressBarWrapper: {
    width: '100%',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  progressInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressStageText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  progressPercentText: {
    fontSize: 11,
    color: '#62109F',
    fontWeight: '700',
  },
  backgroundNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
    marginBottom: 16,
  },
  backgroundNoticeText: {
    fontSize: 11,
    color: '#475569',
    flex: 1,
  },

  /* Add Patient Modal */
  modalContent: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    padding: 22,
    borderRadius: 22,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  modalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontWeight: '800',
    color: '#0F172A',
    fontSize: 16,
  },
  modalSubtitle: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 1,
  },
  modalInput: {
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
  },
  genderLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginTop: 4,
    marginBottom: 6,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  genderPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  genderPillActive: {
    borderColor: '#62109F',
    backgroundColor: '#FAF5FF',
  },
  genderPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  genderPillTextActive: {
    color: '#62109F',
    fontWeight: '700',
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  modalSubmitBtn: {
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  modalErrorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  modalErrorText: {
    flex: 1,
    fontSize: 12,
    color: '#DC2626',
    lineHeight: 17,
  },
});

const DentistScan3DScreen = (props) => (
  <DentistRoleGuard navigation={props.navigation}>
    <DentistScan3DContent {...props} />
  </DentistRoleGuard>
);

export default DentistScan3DScreen;
