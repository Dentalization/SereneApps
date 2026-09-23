import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  TextInput,
  Chip,
  useTheme,
  Portal,
  Modal,
  RadioButton,
  HelperText,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import DentistRoleGuard from '../../components/DentistRoleGuard';
import {
  fetchScanPatients,
  createScanPatient,
  create3DScan,
  upload3DScanVideo,
} from '../../../../services/scan3DService';

const DentistScan3DScreen = ({ navigation }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

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
  const [scanArch, setScanArch] = useState('full'); // 'full' | 'upper' | 'lower'
  const [scanNotes, setScanNotes] = useState('');
  const [creatingScan, setCreatingScan] = useState(false);
  const [activeScanSession, setActiveScanSession] = useState(null);

  // Workflow Stage: 'setup' | 'camera' | 'review' | 'uploading' | 'completed'
  const [scanStage, setScanStage] = useState('setup');

  // Camera & Recording states
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const cameraRef = useRef(null);
  const timerRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDurationSec, setRecordingDurationSec] = useState(0);
  const [videoQuality, setVideoQuality] = useState('1080p'); // '1080p' | '720p'
  const [enableTorch, setEnableTorch] = useState(false);
  const [facing, setFacing] = useState('back');
  const [recordedVideo, setRecordedVideo] = useState(null);
  const [uploadError, setUploadError] = useState('');

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

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
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
    setActiveScanSession(null);
    setSelectedPatient(null);
    setScanNotes('');
    setRecordedVideo(null);
    setIsRecording(false);
    setRecordingDurationSec(0);
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
    if (!cameraRef.current) return;
    try {
      setIsRecording(true);
      setRecordingDurationSec(0);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRecordingDurationSec((prev) => prev + 1);
      }, 1000);

      const recordPromise = cameraRef.current.recordAsync({
        maxDuration: 120,
        quality: videoQuality,
      });

      const videoResult = await recordPromise;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsRecording(false);

      if (videoResult?.uri) {
        let sizeInBytes = 0;
        try {
          const fileInfo = await FileSystem.getInfoAsync(videoResult.uri);
          sizeInBytes = fileInfo?.size || 0;
        } catch (e) {
          console.warn('[DentistScan3D] Error reading file size:', e);
        }

        const durationSec = recordingDurationSec || 1;
        const formattedSize = sizeInBytes > 0
          ? `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`
          : `${getEstimatedFileSize(durationSec, videoQuality)} MB`;

        setRecordedVideo({
          uri: videoResult.uri,
          sizeInBytes,
          durationSec,
          formattedSize,
          resolution: videoQuality,
          fps: 30,
        });
        setScanStage('review');
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
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setRecordedVideo(null);
    setScanStage('setup');
  };

  const handleUploadVideo = async () => {
    if (!activeScanSession || !recordedVideo) return;
    setScanStage('uploading');
    setUploadError('');

    const uploadRes = await upload3DScanVideo(activeScanSession.id, recordedVideo.uri, {
      durationMs: recordedVideo.durationSec * 1000,
      resolution: recordedVideo.resolution,
      fps: recordedVideo.fps,
      scanScope: activeScanSession.scanScope,
    });

    if (uploadRes.success && uploadRes.scan) {
      setActiveScanSession(uploadRes.scan);
      setScanStage('completed');
    } else {
      setUploadError(uploadRes.message || 'Gagal mengunggah video scan');
      setScanStage('review');
      Alert.alert('Gagal Mengunggah', uploadRes.message || 'Terjadi gangguan jaringan saat mengunggah video.');
    }
  };

  if (scanStage === 'camera') {
    const hasCameraPerm = cameraPermission?.granted;
    const hasMicPerm = micPermission?.granted;

    return (
      <DentistRoleGuard navigation={navigation}>
        <View style={{ flex: 1, backgroundColor: '#000000', position: 'relative', paddingTop: insets.top, paddingBottom: insets.bottom }}>
          {!hasCameraPerm ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#FFFFFF' }}>
              <MaterialCommunityIcons name="camera-off" size={64} color="#EF4444" />
              <Text variant="titleMedium" style={{ fontWeight: '700', color: '#0F172A', marginTop: 16, marginBottom: 8, textAlign: 'center' }}>
                Izin Kamera & Audio Diperlukan
              </Text>
              <Text variant="bodyMedium" style={{ color: '#64748B', textAlign: 'center', marginBottom: 20, lineHeight: 20, paddingHorizontal: 16 }}>
                Untuk merekam video kontinu intraoral 3D scan, SereneApps membutuhkan izin akses kamera dan mikrofon.
              </Text>
              <Button
                mode="contained"
                onPress={async () => {
                  await requestCameraPermission();
                  await requestMicPermission();
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
                ref={cameraRef}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                mode="video"
                facing={facing}
                enableTorch={enableTorch}
              />

              {/* CAMERA TOP BAR */}
              <View style={{ position: 'absolute', left: 16, right: 16, top: insets.top + 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
                <TouchableOpacity style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }} onPress={handleCancelRecording}>
                  <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TouchableOpacity
                    style={[{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }, enableTorch && { backgroundColor: '#0284C7', borderColor: '#38BDF8' }]}
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
                    onPress={() => setVideoQuality((prev) => (prev === '1080p' ? '720p' : '1080p'))}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>{videoQuality.toUpperCase()}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
                    onPress={() => setFacing((prev) => (prev === 'back' ? 'front' : 'back'))}
                  >
                    <MaterialCommunityIcons name="camera-flip" size={22} color="#FFFFFF" />
                  </TouchableOpacity>
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
                      ? 'Gerakkan kamera perlahan di sepanjang lengkung gigi (sudut 45°)'
                      : `Arahkan kamera ke lengkung gigi ${activeScanSession?.scanScope?.toUpperCase() || 'FULL'}`}
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
                    activeOpacity={0.8}
                  >
                    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#EF4444' }} />
                  </TouchableOpacity>
                )}
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                  {isRecording ? 'Tekan untuk Selesai' : 'Mulai Perekaman'}
                </Text>
              </View>
            </View>
          )}
        </View>
      </DentistRoleGuard>
    );
  }

  return (
    <DentistRoleGuard navigation={navigation}>
      <View style={{ flex: 1, backgroundColor: '#F8FAFC', paddingTop: insets.top }}>
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={{ marginBottom: 16, marginTop: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E0F2FE' }}>
                <MaterialCommunityIcons name="cube-scan" size={24} color="#0284C7" />
              </View>
              <View>
                <Text variant="titleLarge" style={{ fontWeight: '800', color: '#0F172A' }}>
                  3D Dental Scan
                </Text>
                <Text variant="bodySmall" style={{ color: '#64748B' }}>
                  Dentist Mobile 3D Scan MVP
                </Text>
              </View>
            </View>
          </View>

          {/* REVIEW STATE */}
          {scanStage === 'review' && recordedVideo ? (
            <Card style={{ backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 16 }} elevation={3}>
              <Card.Content>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E0F2FE' }}>
                    <MaterialCommunityIcons name="movie-check" size={24} color="#0284C7" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="titleMedium" style={{ fontWeight: '800', color: '#0F172A' }}>
                      Tinjau Rekaman 3D Scan
                    </Text>
                    <Text variant="bodySmall" style={{ color: '#64748B', fontSize: 12 }}>
                      Verifikasi rekaman sebelum diunggah ke server untuk rekonstruksi
                    </Text>
                  </View>
                </View>

                {/* Specs Box */}
                <View style={{ flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0', justifyContent: 'space-around' }}>
                  <View style={{ alignItems: 'center', flex: 1 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B', marginBottom: 4 }}>DURASI</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>{formatTimer(recordedVideo.durationSec)}</Text>
                  </View>
                  <View style={{ width: 1, backgroundColor: '#E2E8F0' }} />
                  <View style={{ alignItems: 'center', flex: 1 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B', marginBottom: 4 }}>UKURAN FILE</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>{recordedVideo.formattedSize}</Text>
                  </View>
                  <View style={{ width: 1, backgroundColor: '#E2E8F0' }} />
                  <View style={{ alignItems: 'center', flex: 1 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B', marginBottom: 4 }}>RESOLUSI</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>{recordedVideo.resolution.toUpperCase()}</Text>
                  </View>
                </View>

                {/* Patient & Scan Linkage */}
                <View style={{ backgroundColor: '#F0F9FF', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#BAE6FD', gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, color: '#0369A1', fontWeight: '600' }}>Pasien:</Text>
                    <Text style={{ fontSize: 12, color: '#0C4A6E', fontWeight: '700' }}>{activeScanSession?.patient?.name}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, color: '#0369A1', fontWeight: '600' }}>Target Lengkung:</Text>
                    <Text style={{ fontSize: 12, color: '#0C4A6E', fontWeight: '700' }}>{activeScanSession?.scanScope?.toUpperCase()}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, color: '#0369A1', fontWeight: '600' }}>Scan Identifier:</Text>
                    <Text style={{ fontSize: 12, color: '#0C4A6E', fontWeight: '700' }}>{activeScanSession?.scanIdentifier}</Text>
                  </View>
                </View>

                {/* Guidance quality notice */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F0FDF4', borderRadius: 8, padding: 10, marginBottom: 16 }}>
                  <MaterialCommunityIcons name="shield-check" size={18} color="#16A34A" />
                  <Text style={{ fontSize: 11, color: '#15803D', flex: 1, fontWeight: '500' }}>
                    Video kontinu RGB tersimpan dengan kualitas penuh tanpa kompresi kehilangan data.
                  </Text>
                </View>

                {/* Actions */}
                <View style={{ marginTop: 20, gap: 10 }}>
                  <Button
                    mode="contained"
                    icon="cloud-upload"
                    onPress={handleUploadVideo}
                    style={{ borderRadius: 12 }}
                    buttonColor="#16A34A"
                  >
                    Unggah Video Scan
                  </Button>

                  <Button
                    mode="outlined"
                    icon="refresh"
                    onPress={handleRetryRecording}
                    style={{ borderRadius: 12, borderColor: '#94A3B8' }}
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
            <Card style={{ backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 16, paddingVertical: 20 }} elevation={3}>
              <Card.Content style={{ alignItems: 'center', paddingVertical: 12 }}>
                <ActivityIndicator size="large" color="#0284C7" style={{ marginBottom: 16 }} />
                <Text variant="titleMedium" style={{ fontWeight: '800', color: '#0F172A', marginTop: 8, marginBottom: 4 }}>
                  Mengunggah Video 3D Scan...
                </Text>
                <Text variant="bodySmall" style={{ color: '#64748B', textAlign: 'center', fontSize: 12, maxWidth: '85%', marginBottom: 12 }}>
                  Menyimpan video kontinu resolusi tinggi ke server X-Core untuk persiapan rekonstruksi.
                </Text>
                <View style={{ backgroundColor: '#E0F2FE', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
                  <Text style={{ color: '#0369A1', fontSize: 12, fontWeight: '700' }}>
                    {recordedVideo?.formattedSize || '1080p'} • {formatTimer(recordedVideo?.durationSec || 0)}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          ) : scanStage === 'completed' ? (
            /* COMPLETED STATE */
            <Card style={{ backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 16 }} elevation={3}>
              <Card.Content>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="check-bold" size={28} color="#16A34A" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="titleMedium" style={{ fontWeight: '800', color: '#0F172A' }}>
                      Video 3D Scan Berhasil Diunggah!
                    </Text>
                    <Text variant="bodySmall" style={{ color: '#64748B' }}>
                      Rekaman video kontinu tersimpan aman di server X-Core. Siap untuk tahap rekonstruksi 3D (Phase 4).
                    </Text>
                  </View>
                </View>

                {/* Scan Identifier Badge */}
                <View style={{ backgroundColor: '#F0F9FF', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#BAE6FD', marginBottom: 16 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#0284C7', letterSpacing: 0.5 }}>SCAN IDENTIFIER:</Text>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#0369A1', marginTop: 2 }}>{activeScanSession?.scanIdentifier}</Text>
                </View>

                {/* Patient Relationship Info */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Pasien:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B' }}>{activeScanSession?.patient?.name}</Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Status Sesi:</Text>
                  <Chip compact style={{ backgroundColor: '#DCFCE7', height: 24 }} textStyle={{ color: '#16A34A', fontWeight: '700', fontSize: 11 }}>
                    {activeScanSession?.status} (Video Tersimpan)
                  </Chip>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>File Video:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B' }}>
                    {activeScanSession?.video?.fileName || 'raw_video.mp4'} ({recordedVideo?.formattedSize || 'Tersimpan'})
                  </Text>
                </View>

                <View style={{ marginTop: 20, gap: 10 }}>
                  <Button
                    mode="contained"
                    icon="plus"
                    onPress={handleResetScanSession}
                    style={{ borderRadius: 12 }}
                    buttonColor={theme.colors.primary || '#0284C7'}
                  >
                    Buat Sesi Scan Baru
                  </Button>
                </View>
              </Card.Content>
            </Card>
          ) : activeScanSession ? (
            /* ACTIVE SCAN CONFIRMATION STATE */
            <Card style={{ backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 16, borderWidth: 1.5, borderColor: '#BAE6FD' }} elevation={3}>
              <Card.Content>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="check-bold" size={28} color="#16A34A" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="titleMedium" style={{ fontWeight: '800', color: '#0F172A' }}>
                      Sesi 3D Scan Berhasil Dibuat!
                    </Text>
                    <Text variant="bodySmall" style={{ color: '#64748B' }}>
                      Tautan data pasien & identifikasi scan telah tercatat
                    </Text>
                  </View>
                </View>

                {/* Scan Identifier Badge */}
                <View style={{ backgroundColor: '#F0F9FF', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#BAE6FD', marginBottom: 16 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#0284C7', letterSpacing: 0.5 }}>SCAN IDENTIFIER:</Text>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#0369A1', marginTop: 2 }}>{activeScanSession.scanIdentifier}</Text>
                </View>

                {/* Patient Relationship Info */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Pasien:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B' }}>{activeScanSession.patient?.name}</Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Nomor Kontak:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B' }}>{activeScanSession.patient?.phone || '-'}</Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Target Lengkung:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B' }}>{activeScanSession.scanScope?.toUpperCase()}</Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Status Sesi:</Text>
                  <Chip compact style={{ backgroundColor: '#FEF3C7', height: 24 }} textStyle={{ color: '#D97706', fontWeight: '700', fontSize: 11 }}>
                    {activeScanSession.status} (Siap Rekam)
                  </Chip>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Waktu Pembuatan:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B' }}>
                    {new Date(activeScanSession.createdAt).toLocaleString('id-ID')}
                  </Text>
                </View>

                <View style={{ marginTop: 20, gap: 10 }}>
                  <Button
                    mode="contained"
                    icon="camera"
                    onPress={() => setScanStage('camera')}
                    style={{ borderRadius: 12 }}
                    buttonColor={theme.colors.primary || '#0284C7'}
                  >
                    Lanjutkan ke Perekaman Video
                  </Button>

                  <Button
                    mode="outlined"
                    icon="plus"
                    onPress={handleResetScanSession}
                    style={{ borderRadius: 12, borderColor: '#94A3B8' }}
                  >
                    Buat Sesi Scan Baru
                  </Button>
                </View>
              </Card.Content>
            </Card>
          ) : (
            <>
              {/* SECTION 1: Patient Selection & Creation */}
              <Card style={{ backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 16 }} elevation={2}>
                <Card.Content>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text variant="titleMedium" style={{ fontWeight: '700', color: '#0F172A' }}>
                      1. Pasien untuk 3D Scan
                    </Text>
                    {selectedPatient ? (
                      <Button mode="text" compact onPress={handleClearPatient} textColor="#EF4444">
                        Ganti
                      </Button>
                    ) : (
                      <Button
                        mode="contained-tonal"
                        compact
                        icon="account-plus"
                        onPress={handleOpenAddPatientModal}
                        style={{ borderRadius: 8 }}
                      >
                        + Pasien Baru
                      </Button>
                    )}
                  </View>

                  {selectedPatient ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F9FF', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#BAE6FD' }}>
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#E0F2FE', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                        <MaterialCommunityIcons name="account-check" size={24} color="#0284C7" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '700', fontSize: 14, color: '#0369A1' }}>{selectedPatient.name}</Text>
                        <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                          {selectedPatient.mrn} • {selectedPatient.phone || selectedPatient.email}
                        </Text>
                      </View>
                      <Chip compact style={{ backgroundColor: '#DCFCE7' }} textStyle={{ color: '#15803D', fontSize: 11, fontWeight: '700' }}>
                        Terpilih
                      </Chip>
                    </View>
                  ) : (
                    <View style={{ marginTop: 4 }}>
                      <TextInput
                        mode="outlined"
                        placeholder="Cari pasien berdasarkan nama atau no. telepon..."
                        value={patientSearchQuery}
                        onChangeText={setPatientSearchQuery}
                        left={<TextInput.Icon icon="magnify" />}
                        style={{ backgroundColor: '#FFFFFF', marginBottom: 8 }}
                        outlineStyle={{ borderRadius: 12, borderColor: '#E2E8F0' }}
                        dense
                      />

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 6 }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#64748B' }}>Pilih Pasien Terdaftar:</Text>
                        {loadingPatients && <ActivityIndicator size="small" color="#0284C7" />}
                      </View>

                      {patients.length === 0 && !loadingPatients ? (
                        <View style={{ padding: 16, alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                          <Text style={{ fontSize: 12, color: '#64748B', textAlign: 'center', lineHeight: 18 }}>
                            {patientSearchQuery
                              ? 'Tidak ada pasien yang cocok. Tambahkan pasien baru untuk scan ini.'
                              : 'Belum ada pasien terdaftar. Silakan tambah pasien baru.'}
                          </Text>
                          <Button
                            mode="outlined"
                            compact
                            icon="account-plus"
                            onPress={handleOpenAddPatientModal}
                            style={{ marginTop: 8 }}
                          >
                            Tambah Pasien Baru
                          </Button>
                        </View>
                      ) : (
                        <View style={{ gap: 8 }}>
                          {patients.map((patient) => (
                            <TouchableOpacity
                              key={patient.id}
                              onPress={() => handleSelectPatient(patient)}
                              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#F8FAFC', borderRadius: 10, borderWidth: 1, borderColor: '#F1F5F9' }}
                              activeOpacity={0.7}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <MaterialCommunityIcons name="account-outline" size={20} color="#64748B" />
                                <View>
                                  <Text style={{ fontWeight: '600', fontSize: 13, color: '#1E293B' }}>{patient.name}</Text>
                                  <Text style={{ fontSize: 11, color: '#64748B' }}>
                                    {patient.mrn} • {patient.phone || 'Tanpa No. HP'}
                                  </Text>
                                </View>
                              </View>
                              <MaterialCommunityIcons name="chevron-right" size={20} color="#94A3B8" />
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </Card.Content>
              </Card>

              {/* SECTION 2: Scan Scope / Target Arch */}
              <Card style={{ backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 16 }} elevation={2}>
                <Card.Content>
                  <Text variant="titleMedium" style={{ fontWeight: '700', color: '#0F172A' }}>
                    2. Target Lengkung Gigi
                  </Text>
                  <Text variant="bodySmall" style={{ color: '#64748B', marginBottom: 12 }}>
                    Pilih cakupan area scan yang akan direkonstruksi:
                  </Text>

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                    <Chip
                      selected={scanArch === 'full'}
                      onPress={() => setScanArch('full')}
                      style={[{ backgroundColor: '#F1F5F9' }, scanArch === 'full' && { backgroundColor: '#E0F2FE', borderColor: '#0284C7' }]}
                      textStyle={scanArch === 'full' ? { color: '#0284C7', fontWeight: '700', fontSize: 12 } : { color: '#475569', fontSize: 12 }}
                    >
                      Full Arch (Kedua Lengkung)
                    </Chip>
                    <Chip
                      selected={scanArch === 'upper'}
                      onPress={() => setScanArch('upper')}
                      style={[{ backgroundColor: '#F1F5F9' }, scanArch === 'upper' && { backgroundColor: '#E0F2FE', borderColor: '#0284C7' }]}
                      textStyle={scanArch === 'upper' ? { color: '#0284C7', fontWeight: '700', fontSize: 12 } : { color: '#475569', fontSize: 12 }}
                    >
                      Maxilla (Atas)
                    </Chip>
                    <Chip
                      selected={scanArch === 'lower'}
                      onPress={() => setScanArch('lower')}
                      style={[{ backgroundColor: '#F1F5F9' }, scanArch === 'lower' && { backgroundColor: '#E0F2FE', borderColor: '#0284C7' }]}
                      textStyle={scanArch === 'lower' ? { color: '#0284C7', fontWeight: '700', fontSize: 12 } : { color: '#475569', fontSize: 12 }}
                    >
                      Mandibula (Bawah)
                    </Chip>
                  </View>

                  <TextInput
                    mode="outlined"
                    label="Catatan Klinis (Opsional)"
                    placeholder="Contoh: Evaluasi implan regio 36"
                    value={scanNotes}
                    onChangeText={setScanNotes}
                    style={{ backgroundColor: '#FFFFFF', marginTop: 4 }}
                    outlineStyle={{ borderRadius: 12, borderColor: '#E2E8F0' }}
                    dense
                  />
                </Card.Content>
              </Card>

              {/* SECTION 3: Action Button */}
              <Button
                mode="contained"
                disabled={!selectedPatient || creatingScan}
                loading={creatingScan}
                onPress={handleStartScan}
                style={[
                  { borderRadius: 14, marginTop: 8, marginBottom: 16, elevation: 2 },
                  { backgroundColor: selectedPatient ? (theme.colors.primary || '#0284C7') : '#CBD5E1' },
                ]}
                contentStyle={{ paddingVertical: 8 }}
                icon="cube-scan"
              >
                {selectedPatient ? 'Mulai Sesi 3D Scan' : 'Pilih Pasien Terlebih Dahulu'}
              </Button>

              {/* Research Reference Badge */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8 }}>
                <MaterialCommunityIcons name="school-outline" size={16} color="#64748B" />
                <Text variant="bodySmall" style={{ color: '#64748B', fontSize: 11, textAlign: 'center' }}>
                  Research Precedent: In Vitro Implant Protocol • Deep Learning 3D Reconstruction
                </Text>
              </View>
            </>
          )}

          {/* MODAL: Tambah Pasien Baru */}
          <Portal>
            <Modal
              visible={isAddPatientModalVisible}
              onDismiss={() => setIsAddPatientModalVisible(false)}
              contentContainerStyle={{ backgroundColor: '#FFFFFF', marginHorizontal: 20, padding: 24, borderRadius: 20 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <MaterialCommunityIcons name="account-plus-outline" size={24} color="#0284C7" />
                <Text variant="titleMedium" style={{ fontWeight: '700', color: '#0F172A' }}>
                  Tambah Pasien Baru
                </Text>
              </View>

              <Text variant="bodySmall" style={{ color: '#64748B', marginBottom: 16 }}>
                Daftarkan pasien secara instan untuk pemindaian 3D scan ini.
              </Text>

              {addPatientError ? (
                <HelperText type="error" visible style={{ paddingHorizontal: 0 }}>
                  {addPatientError}
                </HelperText>
              ) : null}

              <TextInput
                mode="outlined"
                label="Nama Lengkap Pasien *"
                value={newPatientForm.name}
                onChangeText={(text) => setNewPatientForm((prev) => ({ ...prev, name: text }))}
                style={{ backgroundColor: '#FFFFFF', marginBottom: 12 }}
                dense
              />

              <TextInput
                mode="outlined"
                label="Nomor Telepon / WhatsApp *"
                placeholder="Contoh: 081234567890"
                keyboardType="phone-pad"
                value={newPatientForm.phone}
                onChangeText={(text) => setNewPatientForm((prev) => ({ ...prev, phone: text }))}
                style={{ backgroundColor: '#FFFFFF', marginBottom: 12 }}
                dense
              />

              <TextInput
                mode="outlined"
                label="Email (Opsional)"
                keyboardType="email-address"
                autoCapitalize="none"
                value={newPatientForm.email}
                onChangeText={(text) => setNewPatientForm((prev) => ({ ...prev, email: text }))}
                style={{ backgroundColor: '#FFFFFF', marginBottom: 12 }}
                dense
              />

              <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginTop: 4, marginBottom: 6 }}>Jenis Kelamin:</Text>
              <View style={{ flexDirection: 'row', gap: 16, marginBottom: 20 }}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                  onPress={() => setNewPatientForm((prev) => ({ ...prev, gender: 'male' }))}
                >
                  <RadioButton
                    value="male"
                    status={newPatientForm.gender === 'male' ? 'checked' : 'unchecked'}
                    onPress={() => setNewPatientForm((prev) => ({ ...prev, gender: 'male' }))}
                  />
                  <Text style={{ fontSize: 13, color: '#1E293B' }}>Laki-laki</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                  onPress={() => setNewPatientForm((prev) => ({ ...prev, gender: 'female' }))}
                >
                  <RadioButton
                    value="female"
                    status={newPatientForm.gender === 'female' ? 'checked' : 'unchecked'}
                    onPress={() => setNewPatientForm((prev) => ({ ...prev, gender: 'female' }))}
                  />
                  <Text style={{ fontSize: 13, color: '#1E293B' }}>Perempuan</Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
                <Button
                  mode="text"
                  onPress={() => setIsAddPatientModalVisible(false)}
                  style={{ borderRadius: 10 }}
                >
                  Batal
                </Button>
                <Button
                  mode="contained"
                  loading={creatingPatient}
                  disabled={creatingPatient}
                  onPress={handleCreatePatientSubmit}
                  style={{ borderRadius: 10, paddingHorizontal: 8 }}
                  buttonColor={theme.colors.primary || '#0284C7'}
                >
                  Simpan & Pilih
                </Button>
              </View>
            </Modal>
          </Portal>
        </ScrollView>
      </View>
    </DentistRoleGuard>
  );
};

export default DentistScan3DScreen;
