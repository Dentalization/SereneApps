/**
 * PatientTeledentistryScreen.jsx
 * * Complete teledentistry session UI for the patient side.
 * Handles: Upcoming → Chat → Incoming Call → Active Video Call → Session Ended.
 * Backend chat, token, video room, attachment, and summary operations are API-backed.
 * All styles are inline for easy modification.
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, StatusBar, Animated, Easing, Image, StyleSheet, Alert, ActivityIndicator, NativeModules } from 'react-native';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';


const isExpoGo = !NativeModules.TWVideoModule || NativeModules.TWVideoModule.connect?.toString().includes('() => {}');

// Mock components for Expo Go
let SafeTwilioVideoLocalView = View;
let SafeTwilioVideoParticipantView = View;
let SafeTwilioVideo = View;

if (!isExpoGo) {
  try {
    const TwilioSdk = require('@twilio/video-react-native-sdk');
    SafeTwilioVideoLocalView = TwilioSdk.TwilioVideoLocalView;
    SafeTwilioVideoParticipantView = TwilioSdk.TwilioVideoParticipantView;
    SafeTwilioVideo = TwilioSdk.TwilioVideo;
  } catch (e) {
    console.warn("Twilio SDK not available:", e);
  }
}

import { useChat } from '../../../hooks/useChat';
import { useI18n } from '../../../hooks/useI18n';
import { useTwilioVideoClient } from '../../../hooks/useTwilioVideoClient';
import PreCallSystemCheckSheet from '../../../components/teledentistry/PreCallSystemCheckSheet';
import resolveMediaUrl from '../../../utils/media';
import {
  acknowledgeAppointmentClinicalSummary,
  getAppointmentClinicalSummary,
  getPreSessionHealthForm,
  savePreSessionHealthForm,
} from '../../../services/appointmentService';

import { colors as THEME_COLORS, withOpacity } from '../../../theme/colors';
import { typography as TYPOGRAPHY } from '../../../theme/dimensions';

// ─── Brand / Theme Constants ───────────────────────────────────────────────────
const COLORS = {
  ...THEME_COLORS,
  background: THEME_COLORS.surface || '#F8FAFC',
  black: '#000000',
  accent: THEME_COLORS.accent || '#38BDF8',
  primaryDark: THEME_COLORS.primaryDark || '#1A0A30', // ISSUE-006: ensure fallback
  gray100: '#F1F5F9',
  gray200: '#E2E8F0',
  gray300: '#CBD5E1',
  gray400: '#94A3B8',
  gray500: '#64748B',
  gray600: '#475569',
  gray900: '#0F172A',
  chatSystem: '#EEF2FF',
  chatUser: THEME_COLORS.primary || '#7C3AED',
  chatDentist: '#FFFFFF',
};

// ─── Utility: Format appointment date for display ─────────────────────────────
const formatAppointmentDateTime = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }) + ', ' + d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  }) + ' WIB';
};

// ─── Utility: Timestamp ────────────────────────────────────────────────────────
const formatTimestamp = (date) => {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
};

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const waitingRoomMessage = (waitingRoom) => {
  if (!waitingRoom) return 'Sesi belum siap. Silakan coba lagi beberapa saat.';
  switch (waitingRoom.state) {
    case 'payment_pending':
      return 'Pembayaran belum selesai. Selesaikan pembayaran sebelum bergabung ke video call.';
    case 'scheduled_waiting':
      return waitingRoom.opensAt
        ? `Ruang video dibuka pada ${formatAppointmentDateTime(waitingRoom.opensAt)}.`
        : 'Ruang video belum dibuka untuk jadwal konsultasi ini.';
    case 'ended':
      return 'Sesi video sudah berakhir dan tidak dapat dimasuki kembali.';
    default:
      return 'Ruang video belum siap. Silakan coba lagi.';
  }
};

const buildPickedAssetFile = (asset) => {
  if (!asset?.uri) return null;
  const uriParts = asset.uri.split('/');
  const fallbackName = `teledentistry-attachment-${Date.now()}.jpg`;
  return {
    uri: asset.uri,
    name: asset.fileName || uriParts[uriParts.length - 1] || fallbackName,
    type: asset.mimeType || 'image/jpeg',
  };
};

// ─── Unique ID Generator ───────────────────────────────────────────────────────
let _msgId = 0;
const nextId = () => {
  _msgId += 1;
  return `msg-${_msgId}-${Date.now()}`;
};

// Only pass URLs that are valid http/https to <Image> — anything else crashes RCTImageManager
const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const t = url.trim();
  return t.startsWith('http://') || t.startsWith('https://');
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  MAIN COMPONENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const PatientTeledentistryScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  // Route params (from DetailAppointmentScreen or wherever)
  const {
    dentistName = 'Dokter Gigi',
    dentistSpecialty = '',
    dentistAvatar: _rawDentistAvatar = null,
    dentistInitials = 'DG',
    appointmentId = null,
    appointmentDate = null,
    appointmentStatus = null,
    sessionMode = null,
  } = route.params || {};

  const safeDentistName = dentistName || 'Dokter Gigi';
  const safeDentistSpecialty = dentistSpecialty || 'Dokter Gigi Umum';

  // Sanitize avatar — must be a valid http(s) URL or null, never empty/relative
  const dentistAvatar = resolveMediaUrl(_rawDentistAvatar);

  // ─── Determine initial session status from appointment time ─────────────────
  const resolvedAppointmentDate = useMemo(
    () => (appointmentDate ? new Date(appointmentDate) : null),
    [appointmentDate],
  );
  const isSessionReady = useMemo(
    () => !resolvedAppointmentDate || new Date() >= resolvedAppointmentDate,
    [resolvedAppointmentDate],
  );
  const isArchiveSession = useMemo(
    () => sessionMode === 'archive' || ['completed', 'overdue', 'cancelled', 'no-show'].includes(String(appointmentStatus || '').toLowerCase()),
    [appointmentStatus, sessionMode]
  );

  // Display specialty: use what's provided, don't default to generic
  const displaySpecialty = safeDentistSpecialty;

  // ─── Real Chat Backend ─────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => {
    AsyncStorage.getItem('user').then((json) => {
      if (json) {
        try {
          setCurrentUser(JSON.parse(json));
        } catch (_parseErr) {
          // RISK-002: Corrupted user data — silently ignore
          if (__DEV__) console.warn('[Teledentistry] Corrupt user data in AsyncStorage');
        }
      }
    }).catch(() => { });
  }, []);

  const {
    messages: chatMessagesFromSocket,
    socketConnected,
    connectionState,
    reconnectError,
    incomingCall,
    selectConversation,
    sendMessage,
    sendAttachmentMessage,
    sendTypingIndicator,
    typingParticipants,
    emitVideoCallResponse,
    emitVideoCallEnded,
    fetchVideoToken,
    chatUnavailable,
    setChatUnavailable,
    resetTwilioAttempts,
  } = useChat({ userId: currentUser?.id });

  const {
    twilioRef,
    isConnected,
    isAudioEnabled,
    isVideoEnabled,
    remoteVideoTracks,
    remoteParticipants,
    connectError,
    connectionState: videoConnectionState,
    networkQuality,
    networkQualityEvent,
    connect,
    disconnect,
    toggleAudio,
    toggleVideo,
    flipCamera,
    handlers
  } = useTwilioVideoClient();

  const [systemMessages, setSystemMessages] = useState([]);
  const [sessionStatus, setSessionStatus] = useState(isArchiveSession ? 'ended' : (isSessionReady ? 'active' : 'upcoming'));
  const [callStatus, setCallStatus] = useState('idle');  // 'idle' | 'incoming' | 'active'
  const [clinicalSummaryStatus, setClinicalSummaryStatus] = useState('pending');
  const [clinicalSummary, setClinicalSummary] = useState(null);
  const [summaryAckStatus, setSummaryAckStatus] = useState('idle');
  const [callJoinStatus, setCallJoinStatus] = useState('idle');
  const [callNotice, setCallNotice] = useState(null);
  const [attachmentUpload, setAttachmentUpload] = useState(null);
  const [lowQualityCard, setLowQualityCard] = useState(null);
  const [showConnectionDiagnostics, setShowConnectionDiagnostics] = useState(false);
  const [preCallSystemCheck, setPreCallSystemCheck] = useState({ visible: false, session: null, checks: [], canJoin: false, audioOnly: false });
  const [pendingTextRetry, setPendingTextRetry] = useState(null);
  const qualityHistoryRef = useRef([]);
  const lowQualityRef = useRef([]);
  const [healthFormStatus, setHealthFormStatus] = useState('loading');
  const [healthFormSaving, setHealthFormSaving] = useState(false);
  const [showHealthForm, setShowHealthForm] = useState(false);
  const [healthForm, setHealthForm] = useState({
    symptoms: '',
    painLevel: null,
    allergies: '',
    medications: '',
    notes: '',
  });

  // ─── UI State ──────────────────────────────────────────────────────────────
  const [inputText, setInputText] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [avatarError, setAvatarError] = useState(false);
  const resolvedAvatar = avatarError ? null : dentistAvatar;

  // ─── Refs ──────────────────────────────────────────────────────────────────
  const scrollViewRef = useRef(null);
  const callTimerRef = useRef(null);
  const typingThrottleRef = useRef(0);

  // ─── Animations ────────────────────────────────────────────────────────────
  const incomingCallAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const videoCallAnim = useRef(new Animated.Value(0)).current;

  // ─── Merge socket messages + system messages for display ──────────────────
  const chatMessages = useMemo(() => {
    const socketMsgs = (chatMessagesFromSocket || []).map((m) => ({
      id: m.id,
      role: m.senderId === currentUser?.id?.toString() ? 'user' : 'dentist',
      text: m.messageType === 'file'
        ? (m.attachmentAvailable === false
          ? `Lampiran tidak tersedia: ${m.fileName || m.message || 'Attachment'}`
          : `Lampiran: ${m.fileName || m.message || 'Attachment'}`)
        : m.message,
      timestamp: new Date(m.createdAt),
    }));
    const all = [...systemMessages, ...socketMsgs];
    all.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    return all;
  }, [chatMessagesFromSocket, systemMessages, currentUser?.id]);

  const healthFormSubmitted = healthFormStatus === 'submitted';

  // ─── Pre-session health form status. This form is optional. ───────────────
  useEffect(() => {
    let ignore = false;
    if (!appointmentId || !currentUser?.id) {
      setHealthFormStatus('submitted');
      return () => { ignore = true; };
    }

    setHealthFormStatus('loading');
    getPreSessionHealthForm(appointmentId.toString())
      .then((result) => {
        if (ignore) return;
        if (result?.form) {
          setHealthForm({
            symptoms: result.form.symptoms || '',
            painLevel: result.form.painLevel || null,
            allergies: result.form.allergies || '',
            medications: result.form.medications || '',
            notes: result.form.notes || '',
          });
          setHealthFormStatus('submitted');
          setShowHealthForm(false);
        } else {
          setHealthFormStatus('missing');
          setShowHealthForm(false);
        }
      })
      .catch((error) => {
        if (ignore) return;
        setHealthFormStatus('error');
        setShowHealthForm(false);
        setCallNotice(error?.message || 'Gagal memuat formulir pra-sesi.');
      });

    return () => { ignore = true; };
  }, [appointmentId, currentUser?.id]);

  // ─── Join chat room. The pre-session health form is optional. ─────────────
  const selectConversationCalledRef = useRef(null);
  useEffect(() => {
    if (appointmentId && currentUser?.id && selectConversationCalledRef.current !== appointmentId) {
      selectConversationCalledRef.current = appointmentId;
      selectConversation(appointmentId.toString());
    }
  }, [appointmentId, currentUser?.id, selectConversation]);

  const handleRetryChat = useCallback(() => {
    if (appointmentId) {
      resetTwilioAttempts();
      setChatUnavailable(false);
      selectConversationCalledRef.current = null;
      // trigger selectConversation again
      selectConversationCalledRef.current = appointmentId;
      selectConversation(appointmentId.toString());
    }
  }, [appointmentId, selectConversation, resetTwilioAttempts, setChatUnavailable]);

  // ─── Init: Push system welcome message ─────────────────────────────────────
  useEffect(() => {
    const shortName = safeDentistName.split(',')[0];
    let systemText;
    if (!isSessionReady && resolvedAppointmentDate) {
      const formattedDate = formatAppointmentDateTime(resolvedAppointmentDate);
      systemText = `Sesi Anda dijadwalkan pada ${formattedDate}. Anda belum bisa mengirim pesan hingga jadwal dimulai.`;
    } else {
      systemText = `Sesi telah dimulai. Silakan tunggu, ${shortName} akan segera menghubungi Anda via Video Call.`;
    }
    setSystemMessages([{ id: 'sys-init', role: 'system', text: systemText, timestamp: new Date() }]);
  }, [safeDentistName, isSessionReady, resolvedAppointmentDate]);

  // ─── Upcoming → Active transition timer ────────────────────────────────────
  useEffect(() => {
    if (isArchiveSession) {
      setSessionStatus('ended');
      return;
    }
    if (sessionStatus !== 'upcoming' || !resolvedAppointmentDate) return;
    const now = new Date();
    const msUntilStart = resolvedAppointmentDate.getTime() - now.getTime();
    if (msUntilStart <= 0) {
      setSessionStatus('active');
      addSystemMessage(`Sesi telah dimulai. Silakan tunggu, ${safeDentistName.split(',')[0]} akan segera menghubungi Anda via Video Call.`);
      return;
    }
    const timer = setTimeout(() => {
      setSessionStatus('active');
      addSystemMessage(`Sesi telah dimulai. Silakan tunggu, ${safeDentistName.split(',')[0]} akan segera menghubungi Anda via Video Call.`);
    }, msUntilStart);
    return () => clearTimeout(timer);
  }, [sessionStatus, resolvedAppointmentDate, safeDentistName, isArchiveSession]);

  // ─── Auto-scroll on new message ────────────────────────────────────────────
  useEffect(() => {
    if (chatMessages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd?.({ animated: true });
      }, 150);
    }
  }, [chatMessages]);

  // ─── Incoming Call Animation ───────────────────────────────────────────────
  useEffect(() => {
    if (callStatus === 'incoming') {
      Animated.timing(incomingCallAnim, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();

      // Pulse loop for accept button
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => {
        pulse.stop();
        incomingCallAnim.stopAnimation();
        pulseAnim.stopAnimation();
      };
    } else {
      incomingCallAnim.stopAnimation();
      Animated.timing(incomingCallAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [callStatus, incomingCallAnim, pulseAnim]);

  // ─── Video Call Overlay Animation ──────────────────────────────────────────
  useEffect(() => {
    if (callStatus === 'active') {
      Animated.timing(videoCallAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      videoCallAnim.stopAnimation();
      Animated.timing(videoCallAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
    return () => videoCallAnim.stopAnimation();
  }, [callStatus, videoCallAnim]);

  // ─── Call Timer ────────────────a────────────────────────────────────────────
  useEffect(() => {
    if (callStatus === 'active') {
      setCallDuration(0);
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [callStatus]);

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const formatCallDuration = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const addSystemMessage = useCallback((text) => {
    setSystemMessages((prev) => [...prev, {
      id: `sys-${Date.now()}`,
      role: 'system',
      text,
      timestamp: new Date(),
    }]);
  }, []);

  // ─── Listen for incoming call from socket ──────────────────────────────────
  useEffect(() => {
    if (incomingCall && incomingCall.appointmentId === appointmentId?.toString()) {
      setCallStatus('incoming');
    }
  }, [incomingCall, appointmentId]);

  // ─── Actions ───────────────────────────────────────────────────────────────
  const handleSaveHealthForm = async () => {
    if (!appointmentId || healthFormSaving) return;
    const payload = {
      symptoms: healthForm.symptoms.trim(),
      painLevel: healthForm.painLevel ? Number(healthForm.painLevel) : null,
      allergies: healthForm.allergies.trim(),
      medications: healthForm.medications.trim(),
      notes: healthForm.notes.trim(),
      answers: {
        source: 'patient_mobile_pre_session',
        optional: true,
      },
    };

    setHealthFormSaving(true);
    try {
      const result = await savePreSessionHealthForm(appointmentId.toString(), payload);
      setHealthFormStatus('submitted');
      setShowHealthForm(false);
      addSystemMessage('Form kesehatan pra-sesi berhasil dikirim ke dokter.');
      if (result?.form) {
        setHealthForm({
          symptoms: result.form.symptoms || '',
          painLevel: result.form.painLevel || null,
          allergies: result.form.allergies || '',
          medications: result.form.medications || '',
          notes: result.form.notes || '',
        });
      }
    } catch (error) {
      setHealthFormStatus('error');
      Alert.alert('Gagal Menyimpan', error?.message || 'Form kesehatan pra-sesi gagal disimpan.');
    } finally {
      setHealthFormSaving(false);
    }
  };

  const handleInputTextChange = (text) => {
    setInputText(text);
    const isEndedAndDentistLast = sessionStatus === 'ended' && chatMessages[chatMessages.length - 1]?.role === 'dentist';
    if (!text.trim() || (sessionStatus !== 'active' && !isEndedAndDentistLast) || !appointmentId) return;
    const now = Date.now();
    if (now - typingThrottleRef.current < 2500) return;
    typingThrottleRef.current = now;
    sendTypingIndicator?.(appointmentId.toString());
  };

  const handleSend = async () => {
    const trimmed = inputText.trim();
    const isEndedAndDentistLast = sessionStatus === 'ended' && chatMessages[chatMessages.length - 1]?.role === 'dentist';
    if (!trimmed || (sessionStatus !== 'active' && !isEndedAndDentistLast)) return;
    try {
      const saved = await sendMessage({ appointmentId: appointmentId?.toString(), text: trimmed });
      if (saved) {
        setInputText('');
        setPendingTextRetry(null);
      }
    } catch (error) {
      setPendingTextRetry({ text: trimmed, message: error?.message || t('mobile.teledentistry.chat.sendFailed', { fallbackText: 'Pesan gagal dikirim. Teks tetap disimpan agar dapat dicoba lagi.' }) });
      Alert.alert('Pesan Gagal', error?.message || t('mobile.teledentistry.chat.sendFailed', { fallbackText: 'Pesan gagal dikirim. Teks tetap disimpan agar dapat dicoba lagi.' }));
    }
  };

  const completeAcceptCall = async (session, { enableVideo = true } = {}) => {
    setCallJoinStatus('connecting');
    await connect({ roomName: session.roomName, token: session.token, enableVideo });
    emitVideoCallResponse(appointmentId.toString(), true);
    setCallStatus('active');
    setCallJoinStatus('idle');
    addSystemMessage(enableVideo ? 'Video call dimulai.' : 'Video call dimulai dalam mode audio saja.');
  };

  const handleRetryText = async () => {
    const isEndedAndDentistLast = sessionStatus === 'ended' && chatMessages[chatMessages.length - 1]?.role === 'dentist';
    if (!pendingTextRetry?.text || !appointmentId || (sessionStatus !== 'active' && !isEndedAndDentistLast)) return;

    try {
      const saved = await sendMessage({
        appointmentId: appointmentId.toString(),
        text: pendingTextRetry.text,
      });

      if (saved) {
        setPendingTextRetry(null);
      }
    } catch (error) {
      setPendingTextRetry((prev) => ({
        ...prev,
        message: error?.message || t('mobile.teledentistry.chat.sendFailed', {
          fallbackText: 'Pesan gagal dikirim. Teks tetap disimpan agar dapat dicoba lagi.',
        }),
      }));
    }
  };

  const handleAcceptCall = async () => {
    try {
      if (!appointmentId || callJoinStatus !== 'idle') return;
      setCallNotice(null);
      setCallJoinStatus('checking');

      const session = await fetchVideoToken(appointmentId.toString());
      if (session.canJoinVideo === false || session.waitingRoom?.canJoinVideo === false) {
        const message = waitingRoomMessage(session.waitingRoom);
        setCallNotice(message);
        addSystemMessage(message);
        setCallJoinStatus('idle');
        return;
      }
      if (!session.token || !session.roomName) {
        const message = 'Token atau ruang video belum siap. Silakan coba lagi.';
        setCallNotice(message);
        addSystemMessage(message);
        setCallJoinStatus('idle');
        return;
      }

      setCallJoinStatus('permissions');
      const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
      const { status: micStatus } = await Camera.requestMicrophonePermissionsAsync();

      const micGranted = micStatus === 'granted';
      const cameraGranted = cameraStatus === 'granted';
      const checks = [
        {
          key: 'camera',
          label: t('mobile.teledentistry.preCall.camera', { fallbackText: 'Kamera' }),
          status: cameraGranted ? 'passed' : 'warning',
          message: cameraGranted ? 'Kamera siap.' : 'Kamera tidak aktif. Anda masih dapat bergabung audio saja.',
        },
        {
          key: 'microphone',
          label: t('mobile.teledentistry.preCall.microphone', { fallbackText: 'Mikrofon' }),
          status: micGranted ? 'passed' : 'failed',
          message: micGranted ? 'Mikrofon siap.' : 'Izinkan mikrofon sebelum bergabung.',
        },
        {
          key: 'connection',
          label: t('mobile.teledentistry.preCall.connection', { fallbackText: 'Koneksi' }),
          status: networkQuality >= 0 && networkQuality <= 1 ? 'warning' : 'passed',
          message: networkQuality >= 0 ? `Kualitas jaringan ${networkQuality}/5.` : 'Koneksi akan dipantau saat panggilan dimulai.',
        },
        {
          key: 'battery',
          label: t('mobile.teledentistry.preCall.battery', { fallbackText: 'Baterai' }),
          status: 'unknown',
          message: t('mobile.teledentistry.preCall.unavailable', { fallbackText: 'Tidak tersedia' }),
        },
      ];

      if (!micGranted) {
        const message = 'Aplikasi memerlukan akses Mikrofon untuk Video Call.';
        setCallNotice(message);
        setPreCallSystemCheck({ visible: true, session, checks, canJoin: false, audioOnly: !cameraGranted });
        Alert.alert('Izin Ditolak', message);
        setCallJoinStatus('idle');
        return;
      }

      setPreCallSystemCheck({
        visible: true,
        session,
        checks,
        canJoin: true,
        audioOnly: !cameraGranted,
      });
    } catch (e) {
      const message = e?.response?.data?.error?.code === 'ROOM_ENDED'
        ? 'Sesi video sudah berakhir dan tidak dapat dimasuki kembali.'
        : e?.message || 'Gagal memulai video call. Silakan coba lagi.';
      setCallNotice(message);
      Alert.alert('Gagal Bergabung', message);
      console.warn('Failed to join video call', e?.message || e);
    } finally {
      if (!preCallSystemCheck.visible) setCallJoinStatus('idle');
    }
  };

  const handleRejectCall = () => {
    if (appointmentId) {
      emitVideoCallResponse(appointmentId.toString(), false);
    }
    setCallStatus('idle');
    addSystemMessage('Panggilan video ditolak.');
  };

  const handleEndCall = () => {
    const duration = formatCallDuration(callDuration);
    if (appointmentId) {
      emitVideoCallEnded(appointmentId.toString());
    }
    disconnect();
    setCallStatus('idle');
    setCallNotice(null);
    addSystemMessage(`Video call berakhir. Durasi: ${duration}.`);
  };

  const handleEndSession = () => {
    setSessionStatus('ended');
    setCallStatus('idle');
    addSystemMessage('Sesi konsultasi telah berakhir.');
  };

  const handleAcknowledgeSummary = async () => {
    if (!appointmentId || summaryAckStatus === 'saving') return;
    setSummaryAckStatus('saving');
    try {
      const result = await acknowledgeAppointmentClinicalSummary(appointmentId);
      setClinicalSummaryStatus(result.status || 'finalized');
      setClinicalSummary(result.summary || clinicalSummary);
      setSummaryAckStatus('done');
      addSystemMessage('Ringkasan konsultasi telah dikonfirmasi.');
    } catch (error) {
      setSummaryAckStatus('error');
      Alert.alert('Gagal', error.message || 'Gagal mengonfirmasi ringkasan konsultasi.');
    }
  };

  const switchToAudioOnly = () => {
    if (isVideoEnabled) {
      toggleVideo();
      addSystemMessage('Mode audio-only diaktifkan karena kualitas jaringan rendah.');
    }
  };

  useEffect(() => {
    if (!networkQualityEvent || networkQualityEvent.quality < 0) return;
    const now = networkQualityEvent.timestamp || Date.now();
    const quality = networkQualityEvent.quality;
    qualityHistoryRef.current = [
      ...qualityHistoryRef.current.slice(-24),
      { quality, timestamp: now },
    ];
    if (quality > 1) return;
    lowQualityRef.current = [...lowQualityRef.current.filter((item) => now - item <= 30000), now];
    if (lowQualityRef.current.length >= 3) {
      if (isVideoEnabled) toggleVideo();
      const message = t('mobile.teledentistry.network.autoAudioOnly', { fallbackText: 'Kualitas jaringan sangat rendah. Video dimatikan untuk menjaga audio.' });
      setLowQualityCard({ id: `quality-${now}`, message });
      addSystemMessage(message);
      lowQualityRef.current = [];
    }
  }, [addSystemMessage, isVideoEnabled, networkQualityEvent?.sequence, t, toggleVideo]);

  const handlePickAttachment = async () => {
    const isEndedAndDentistLast = sessionStatus === 'ended' && chatMessages[chatMessages.length - 1]?.role === 'dentist';
    if (!appointmentId || (sessionStatus !== 'active' && !isEndedAndDentistLast) || attachmentUpload?.status === 'uploading') return;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Izin Ditolak', 'Izinkan akses galeri untuk mengunggah lampiran konsultasi.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 0.85,
      });
      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > MAX_ATTACHMENT_BYTES) {
        Alert.alert('File Terlalu Besar', 'Ukuran lampiran maksimal 10 MB.');
        return;
      }

      const file = buildPickedAssetFile(asset);
      if (!file) {
        Alert.alert('Lampiran Tidak Valid', 'File tidak dapat diproses. Silakan pilih file lain.');
        return;
      }

      setAttachmentUpload({ status: 'uploading', progress: 0, fileName: file.name });
      await sendAttachmentMessage({
        appointmentId: appointmentId.toString(),
        file,
        onUploadProgress: (event) => {
          if (!event.total) return;
          const progress = Math.round((event.loaded / event.total) * 100);
          setAttachmentUpload((prev) => prev ? { ...prev, progress } : prev);
        },
      });
      setAttachmentUpload({ status: 'done', progress: 100, fileName: file.name });
      setTimeout(() => setAttachmentUpload(null), 1600);
    } catch (error) {
      setAttachmentUpload({ status: 'error', progress: 0, fileName: null });
      Alert.alert('Upload Gagal', error?.message || 'Lampiran gagal diunggah. Silakan coba lagi.');
    }
  };

  useEffect(() => {
    if (connectError && callStatus === 'active') {
      setCallNotice(videoConnectionState === 'reconnecting'
        ? 'Koneksi video terputus sementara, mencoba menyambungkan ulang...'
        : `Koneksi video bermasalah: ${connectError}`);
    }
  }, [connectError, callStatus, videoConnectionState]);

  useEffect(() => {
    if (!appointmentId || sessionStatus !== 'ended') return;
    getAppointmentClinicalSummary(appointmentId)
      .then((result) => {
        setClinicalSummaryStatus(result.status || 'pending');
        setClinicalSummary(result.summary || null);
      })
      .catch(() => {
        setClinicalSummaryStatus('pending');
        setClinicalSummary(null);
      });
  }, [appointmentId, sessionStatus]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  SUB-COMPONENTS (RENDER FUNCTIONS)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // ──── Header ───────────────────────────────────────────────────────────────
  const renderHeader = () => (
    <LinearGradient
      colors={[COLORS.primary, COLORS.primaryLight]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 14,
        paddingHorizontal: 16,
        paddingTop: insets.top + 8,
      }}
    >
      {/* Back button */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        accessibilityLabel="Kembali"
        accessibilityRole="button"
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: withOpacity(COLORS.white, 0.15),
          justifyContent: 'center',
          alignItems: 'center',
        }}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.white} />
      </TouchableOpacity>

      {/* Dentist Info */}
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', marginHorizontal: 12 }}>
        <View style={{ position: 'relative' }}>
          {resolvedAvatar ? (
            <Image
              source={{ uri: resolvedAvatar }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                borderWidth: 2,
                borderColor: withOpacity(COLORS.white, 0.3),
              }}
              onError={() => setAvatarError(true)}
            />
          ) : (
            <LinearGradient
              colors={[COLORS.primaryLight, COLORS.primary]}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 2,
                borderColor: withOpacity(COLORS.white, 0.3),
              }}
            >
              <Text style={{ ...TYPOGRAPHY.bodySmall, fontWeight: '700', color: COLORS.white }}>
                {dentistInitials}
              </Text>
            </LinearGradient>
          )}
          {sessionStatus === 'active' && (
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: COLORS.success,
                borderWidth: 2,
                borderColor: COLORS.primary,
              }}
            />
          )}
        </View>
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.white }} numberOfLines={1}>
            {safeDentistName}
          </Text>
          <Text style={{ fontSize: 12, color: withOpacity(COLORS.white, 0.7), marginTop: 1 }} numberOfLines={1}>
            {sessionStatus === 'ended'
              ? 'Sesi berakhir'
              : sessionStatus === 'upcoming'
                ? 'Menunggu jadwal'
                : displaySpecialty}
          </Text>
        </View>
      </View>

      {/* Call icons (disabled for patient) */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: withOpacity(COLORS.white, 0.08),
            justifyContent: 'center',
            alignItems: 'center',
          }}
          disabled
          activeOpacity={1}
          accessibilityLabel="Telepon (Hanya Dokter)"
          accessibilityRole="image"
        >
          <MaterialCommunityIcons name="phone" size={20} color={withOpacity(COLORS.white, 0.35)} />
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: withOpacity(COLORS.white, 0.08),
            justifyContent: 'center',
            alignItems: 'center',
            marginLeft: 6,
          }}
          disabled
          activeOpacity={1}
          accessibilityLabel="Video Call (Hanya Dokter)"
          accessibilityRole="image"
        >
          <MaterialCommunityIcons name="video" size={20} color={withOpacity(COLORS.white, 0.35)} />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );

  // ──── Message Bubble ───────────────────────────────────────────────────────
  const renderMessage = (msg) => {
    if (msg.role === 'system') {
      return (
        <View key={msg.id} style={{ alignItems: 'center', marginVertical: 8 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: COLORS.chatSystem,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 16,
              maxWidth: '90%',
            }}
          >
            <MaterialCommunityIcons name="information-outline" size={14} color={COLORS.gray500} style={{ marginRight: 6 }} />
            <Text style={{ fontSize: 12, color: COLORS.gray600, lineHeight: 17, flex: 1 }}>{msg.text}</Text>
          </View>
        </View>
      );
    }

    const isUser = msg.role === 'user';
    return (
      <View
        key={msg.id}
        style={{
          flexDirection: 'row',
          marginBottom: 10,
          alignItems: 'flex-end',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
        }}
      >
        {/* Dentist avatar on left */}
        {!isUser && (
          <View style={{ marginRight: 8, marginBottom: 2 }}>
            {resolvedAvatar ? (
              <Image
                source={{ uri: resolvedAvatar }}
                style={{ width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' }}
                onError={() => setAvatarError(true)}
              />
            ) : (
              <LinearGradient
                colors={['#B388FF', '#7C4DFF']}
                style={{ width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.white }}>
                  {dentistInitials}
                </Text>
              </LinearGradient>
            )}
          </View>
        )}
        <View
          accessible={true}
          accessibilityLabel={`Pesan dari ${isUser ? 'Anda' : safeDentistName}: ${msg.text}, dikirim pada ${formatTimestamp(msg.timestamp)}`}
          accessibilityRole="text"
          style={{
            maxWidth: '75%',
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 18,
            backgroundColor: isUser ? COLORS.chatUser : COLORS.chatDentist,
            borderBottomRightRadius: isUser ? 4 : 18,
            borderBottomLeftRadius: isUser ? 18 : 4,
            borderWidth: isUser ? 0 : 1,
            borderColor: COLORS.gray200,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              lineHeight: 20,
              color: isUser ? COLORS.white : COLORS.gray900,
            }}
          >
            {msg.text}
          </Text>
          <Text
            style={{
              fontSize: 10,
              marginTop: 4,
              color: isUser ? withOpacity(COLORS.white, 0.6) : COLORS.gray400,
              textAlign: isUser ? 'right' : 'left',
            }}
          >
            {formatTimestamp(msg.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  // ──── Chat View ────────────────────────────────────────────────────────────
  const renderChatView = () => (
    <ScrollView
      ref={scrollViewRef}
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {chatUnavailable && (
        <View style={{ marginBottom: 16, alignItems: 'center' }}>
          <View
            style={{
              backgroundColor: withOpacity(COLORS.error, 0.1),
              borderRadius: 16,
              padding: 20,
              alignItems: 'center',
              width: '100%',
              borderWidth: 1,
              borderColor: withOpacity(COLORS.error, 0.3),
            }}
          >
            <MaterialCommunityIcons name="alert-circle-outline" size={32} color={COLORS.error} />
            <Text style={{ ...TYPOGRAPHY.bodyLarge, fontWeight: '700', color: COLORS.error, marginTop: 8 }}>
              Koneksi Chat Gagal
            </Text>
            <Text style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' }}>
              Tidak dapat menghubungkan ke server obrolan saat ini.
            </Text>
            <TouchableOpacity
              onPress={handleRetryChat}
              style={{
                marginTop: 16,
                backgroundColor: COLORS.primary,
                borderRadius: 12,
                paddingHorizontal: 20,
                paddingVertical: 10,
              }}
            >
              <Text style={{ color: COLORS.white, fontWeight: '800', fontSize: 13 }}>
                Coba Hubungkan Lagi
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Date separator — ISSUE-014: dynamic date */}
      {(() => {
        const now = new Date();
        const firstMsg = chatMessages[0];
        const msgDate = firstMsg ? firstMsg.timestamp : now;
        const isToday = msgDate.toDateString() === now.toDateString();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = msgDate.toDateString() === yesterday.toDateString();
        const label = isToday ? 'Hari ini' : isYesterday ? 'Kemarin' : msgDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: COLORS.gray200 }} />
            <Text style={{ marginHorizontal: 12, fontSize: 12, color: COLORS.gray500, fontWeight: '500' }}>{label}</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: COLORS.gray200 }} />
          </View>
        );
      })()}

      {chatMessages.map(renderMessage)}

      {sessionStatus === 'active' && healthFormStatus !== 'loading' && !healthFormSubmitted && (
        <TouchableOpacity
          onPress={() => setShowHealthForm(true)}
          accessibilityRole="button"
          accessibilityLabel="Isi form kesehatan pra-sesi opsional"
          style={{ marginTop: 8, marginBottom: 12, borderRadius: 18, borderWidth: 1, borderColor: withOpacity(COLORS.primary, 0.24), backgroundColor: withOpacity(COLORS.primary, 0.08), padding: 14, flexDirection: 'row', alignItems: 'center' }}
        >
          <View style={{ width: 38, height: 38, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
            <MaterialCommunityIcons name="clipboard-pulse-outline" size={20} color={COLORS.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.primaryDark, fontWeight: '800' }}>
              Form kesehatan opsional
            </Text>
            <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 2 }}>
              Boleh dilewati. Isi jika ingin memberi konteks awal ke dokter.
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      )}

      {lowQualityCard && (
        <View style={{ marginTop: 8, marginBottom: 12, borderRadius: 18, borderWidth: 1, borderColor: withOpacity(COLORS.warning, 0.34), backgroundColor: withOpacity(COLORS.warning, 0.12), padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <MaterialCommunityIcons name="signal-cellular-outline" size={20} color={COLORS.warning} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textPrimary, fontWeight: '800' }}>{lowQualityCard.message}</Text>
              <TouchableOpacity
                onPress={() => {
                  if (!isVideoEnabled) toggleVideo();
                  setLowQualityCard(null);
                }}
                style={{ marginTop: 10, alignSelf: 'flex-start', borderRadius: 12, backgroundColor: COLORS.warning, paddingHorizontal: 12, paddingVertical: 7 }}
              >
                <Text style={{ color: COLORS.white, fontWeight: '800', fontSize: 12 }}>
                  {t('mobile.teledentistry.network.retryVideo', { fallbackText: 'Coba hidupkan video lagi' })}
                </Text>
              </TouchableOpacity>
              <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 8 }}>
                {t('mobile.teledentistry.network.autoAudioOnlyDescription', { fallbackText: 'Video dimatikan sementara agar suara tetap stabil.' })}
              </Text>
              <TouchableOpacity onPress={() => setShowConnectionDiagnostics(true)} style={{ marginTop: 8 }}>
                <Text style={{ color: COLORS.primary, fontWeight: '800', fontSize: 12 }}>
                  {t('mobile.teledentistry.network.diagnostics', { fallbackText: 'Diagnostik Koneksi' })}
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => setLowQualityCard(null)} accessibilityLabel="Tutup peringatan jaringan">
              <MaterialCommunityIcons name="close" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {typingParticipants?.length > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginLeft: 36 }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: COLORS.chatDentist,
            borderWidth: 1,
            borderColor: COLORS.gray200,
            borderRadius: 18,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <MaterialCommunityIcons name="message-processing-outline" size={16} color={COLORS.primary} />
            </Animated.View>
            <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginLeft: 8, fontWeight: '700' }}>
              Dokter sedang mengetik...
            </Text>
          </View>
        </View>
      )}

      {/* Upcoming banner */}
      {sessionStatus === 'upcoming' && resolvedAppointmentDate && (
        <View style={{ marginTop: 16, marginBottom: 8, alignItems: 'center' }}>
          <View
            style={{
              backgroundColor: withOpacity(COLORS.primary, 0.15),
              borderRadius: 16,
              padding: 20,
              alignItems: 'center',
              width: '100%',
              borderWidth: 1,
              borderColor: withOpacity(COLORS.primary, 0.3),
            }}
          >
            <MaterialCommunityIcons name="calendar-clock" size={24} color={COLORS.primary} />
            <Text style={{ ...TYPOGRAPHY.bodyLarge, fontWeight: '700', color: COLORS.primaryDark, marginTop: 8 }}>
              Menunggu Jadwal Konsultasi
            </Text>
            <Text style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.primary, marginTop: 4, textAlign: 'center', fontWeight: '600' }}>
              {formatAppointmentDateTime(resolvedAppointmentDate)}
            </Text>
          </View>
        </View>
      )}

      {/* Ended banner */}
      {(sessionStatus === 'ended' || isArchiveSession) && (
        <View style={{ marginTop: 16, marginBottom: 8, alignItems: 'center' }}>
          <View
            style={{
              backgroundColor: withOpacity(COLORS.success, 0.15),
              borderRadius: 16,
              padding: 20,
              alignItems: 'center',
              width: '100%',
              borderWidth: 1,
              borderColor: withOpacity(COLORS.success, 0.3),
            }}
          >
            <MaterialCommunityIcons name="check-decagram" size={24} color={COLORS.success} />
            <Text style={{ ...TYPOGRAPHY.bodyLarge, fontWeight: '700', color: COLORS.success, marginTop: 8 }}>
              Sesi konsultasi telah selesai
            </Text>
            <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.success, marginTop: 4, textAlign: 'center' }}>
              Riwayat chat di atas disimpan untuk referensi Anda.
            </Text>
            <View style={{ marginTop: 12, width: '100%', backgroundColor: COLORS.white, borderRadius: 12, padding: 12 }}>
              {clinicalSummaryStatus === 'finalized' || clinicalSummaryStatus === 'amended' ? (
                <>
                  <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textMuted }}>Ringkasan dokter</Text>
                  <Text style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textPrimary, marginTop: 4, fontWeight: '700' }}>
                    {clinicalSummary?.assessment || 'Ringkasan tersedia'}
                  </Text>
                  <Text style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, marginTop: 6 }}>
                    {clinicalSummary?.plan || '-'}
                  </Text>
                  {clinicalSummary?.patientAcknowledgedAt ? (
                    <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.success, marginTop: 8 }}>
                      Sudah dikonfirmasi.
                    </Text>
                  ) : (
                    <TouchableOpacity
                      style={{ marginTop: 10, backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}
                      onPress={handleAcknowledgeSummary}
                      disabled={summaryAckStatus === 'saving'}
                    >
                      <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 12 }}>
                        {summaryAckStatus === 'saving' ? 'Mengonfirmasi...' : 'Konfirmasi sudah membaca'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <Text style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, textAlign: 'center' }}>
                  Ringkasan konsultasi sedang disiapkan dokter.
                </Text>
              )}
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );

  // ──── Input Bar ────────────────────────────────────────────────────────────
  const renderInputBar = () => {
    if (sessionStatus === 'upcoming' || isArchiveSession) return null;
    if (chatUnavailable) {
      return (
        <View style={{
          paddingHorizontal: 16,
          paddingVertical: 14,
          backgroundColor: COLORS.surfaceElevated || '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: COLORS.border || COLORS.gray200,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: Math.max(insets.bottom, 14),
        }}>
          <MaterialCommunityIcons name="chat-lock-outline" size={20} color={COLORS.textMuted || COLORS.gray500} />
          <Text style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, marginLeft: 8, fontWeight: '600' }}>
            Obrolan tidak tersedia. Coba hubungkan kembali di atas.
          </Text>
        </View>
      );
    }
    if (sessionStatus === 'ended') {
      const lastMessage = chatMessages[chatMessages.length - 1];
      const isDentistLastSender = lastMessage && lastMessage.role === 'dentist';
      if (!isDentistLastSender) {
        return (
          <View style={{
            paddingHorizontal: 16,
            paddingVertical: 14,
            backgroundColor: COLORS.surfaceElevated,
            borderTopWidth: 1,
            borderTopColor: COLORS.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingBottom: Math.max(insets.bottom, 14),
          }}>
            <MaterialCommunityIcons name="chat-lock-outline" size={20} color={COLORS.textMuted} />
            <Text style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, marginLeft: 8, fontWeight: '600' }}>
              Sesi berakhir. Chat dinonaktifkan karena Anda mengirim pesan terakhir.
            </Text>
          </View>
        );
      }
    }

    return (
      <View>
        {attachmentUpload && (
          <View style={{ backgroundColor: attachmentUpload.status === 'error' ? withOpacity(COLORS.error, 0.1) : withOpacity(COLORS.primary, 0.08), paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderTopColor: COLORS.gray200 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {attachmentUpload.status === 'uploading' ? (
                <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 8 }} />
              ) : (
                <MaterialCommunityIcons
                  name={attachmentUpload.status === 'done' ? 'check-circle-outline' : 'alert-circle-outline'}
                  size={16}
                  color={attachmentUpload.status === 'done' ? COLORS.success : COLORS.error}
                  style={{ marginRight: 8 }}
                />
              )}
              <Text style={{ flex: 1, ...TYPOGRAPHY.caption, color: attachmentUpload.status === 'error' ? COLORS.error : COLORS.textSecondary, fontWeight: '600' }} numberOfLines={1}>
                {attachmentUpload.status === 'uploading'
                  ? `Mengunggah ${attachmentUpload.fileName || 'lampiran'} ${attachmentUpload.progress || 0}%`
                  : attachmentUpload.status === 'done'
                    ? 'Lampiran berhasil dikirim'
                    : 'Lampiran gagal diunggah'}
              </Text>
            </View>
          </View>
        )}
        {pendingTextRetry && (
          <View style={{ backgroundColor: withOpacity(COLORS.error, 0.08), paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderTopColor: withOpacity(COLORS.error, 0.2), flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color={COLORS.error} />
            <Text style={{ flex: 1, marginLeft: 8, ...TYPOGRAPHY.caption, color: COLORS.error, fontWeight: '700' }} numberOfLines={1}>
              {pendingTextRetry.message}
            </Text>
            <TouchableOpacity onPress={handleRetryText} accessibilityRole="button" accessibilityLabel={t('mobile.teledentistry.chat.retrySend', { fallbackText: 'Coba kirim ulang' })}>
              <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.primary, fontWeight: '900' }}>
                {t('mobile.teledentistry.chat.retrySend', { fallbackText: 'Coba kirim ulang' })}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            paddingHorizontal: 12,
            paddingTop: 10,
            backgroundColor: COLORS.white,
            borderTopWidth: attachmentUpload ? 0 : 1,
            borderTopColor: COLORS.gray200,
            paddingBottom: Math.max(insets.bottom, 12),
          }}
        >
          {/* Attachment */}
          <TouchableOpacity
            style={{ width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 4 }}
            activeOpacity={0.7}
            accessibilityLabel="Unggah Lampiran"
            accessibilityRole="button"
            onPress={handlePickAttachment}
            disabled={attachmentUpload?.status === 'uploading'}
          >
            <MaterialCommunityIcons name="paperclip" size={22} color={attachmentUpload?.status === 'uploading' ? COLORS.gray300 : (COLORS.textMuted || COLORS.gray500)} />
          </TouchableOpacity>

          {/* Text Input */}
          <View style={{ flex: 1 }}>
            <View
              style={{
                backgroundColor: COLORS.gray100,
                borderRadius: 22,
                paddingHorizontal: 14,
                paddingVertical: Platform.OS === 'ios' ? 10 : 4,
                maxHeight: 120,
                justifyContent: 'center',
              }}
            >
              <TextInput
                style={{ fontSize: 14, color: COLORS.gray900, maxHeight: 100, lineHeight: 20 }}
                placeholder="Ketik pesan..."
                placeholderTextColor={COLORS.gray400}
                value={inputText}
                onChangeText={handleInputTextChange}
                multiline
                maxLength={1000}
                returnKeyType="default"
              />
            </View>
            {inputText.length > 800 && (
              <Text style={{ fontSize: 10, color: COLORS.textMuted, textAlign: 'right', marginTop: 4, marginRight: 8 }}>
                {inputText.length}/1000
              </Text>
            )}
          </View>

          {/* Send Button */}
          <TouchableOpacity
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              justifyContent: 'center',
              alignItems: 'center',
              marginLeft: 6,
              backgroundColor: inputText.trim() ? COLORS.primary : COLORS.gray200,
            }}
            onPress={handleSend}
            disabled={!inputText.trim()}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="send" size={20} color={inputText.trim() ? COLORS.white : COLORS.gray400} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderPreSessionHealthForm = () => {
    if (!showHealthForm) return null;

    return (
      <View style={{ ...StyleSheet.absoluteFillObject, zIndex: 120, backgroundColor: withOpacity(COLORS.black, 0.55), justifyContent: 'flex-end' }}>
        <Animated.View style={{ maxHeight: '92%', borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden', backgroundColor: COLORS.white }}>
          <LinearGradient
            colors={[COLORS.primaryDark, COLORS.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingTop: 20, paddingHorizontal: 20, paddingBottom: 18 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 46, height: 46, borderRadius: 18, backgroundColor: withOpacity(COLORS.white, 0.16), alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <MaterialCommunityIcons name="clipboard-pulse-outline" size={24} color={COLORS.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...TYPOGRAPHY.h3, color: COLORS.white }}>Form Kesehatan Pra-Sesi</Text>
                <Text style={{ ...TYPOGRAPHY.caption, color: withOpacity(COLORS.white, 0.75), marginTop: 3 }}>
                  Opsional. Dokter dapat membacanya jika Anda memilih untuk mengisi.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowHealthForm(false)}
                accessibilityRole="button"
                accessibilityLabel="Lewati form kesehatan pra-sesi"
                style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: withOpacity(COLORS.white, 0.14) }}
              >
                <MaterialCommunityIcons name="close" size={20} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <ScrollView style={{ paddingHorizontal: 20 }} contentContainerStyle={{ paddingTop: 18, paddingBottom: Math.max(insets.bottom, 18) + 76 }}>
            <Text style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 16 }}>
              Anda tetap bisa masuk chat dan video tanpa mengisi form ini. Jika diisi, dokter mendapat konteks awal sebelum sesi.
            </Text>

            <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textPrimary, fontWeight: '800', marginBottom: 8 }}>Keluhan utama</Text>
            <TextInput
              value={healthForm.symptoms}
              onChangeText={(symptoms) => setHealthForm((prev) => ({ ...prev, symptoms }))}
              placeholder="Contoh: nyeri gigi kanan bawah sejak kemarin"
              placeholderTextColor={COLORS.gray400}
              multiline
              style={{ minHeight: 86, borderRadius: 16, borderWidth: 1, borderColor: COLORS.gray200, backgroundColor: COLORS.gray100, padding: 12, color: COLORS.gray900, textAlignVertical: 'top', marginBottom: 16 }}
            />

            <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textPrimary, fontWeight: '800', marginBottom: 8 }}>Skala nyeri</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
              {Array.from({ length: 10 }, (_, index) => index + 1).map((level) => {
                const active = Number(healthForm.painLevel) === level;
                return (
                  <TouchableOpacity
                    key={level}
                    onPress={() => setHealthForm((prev) => ({ ...prev, painLevel: level }))}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`Skala nyeri ${level}`}
                    style={{ width: '18%', marginRight: '2%', marginBottom: 8, borderRadius: 14, paddingVertical: 10, alignItems: 'center', backgroundColor: active ? COLORS.primary : COLORS.gray100, borderWidth: 1, borderColor: active ? COLORS.primary : COLORS.gray200 }}
                  >
                    <Text style={{ fontWeight: '800', color: active ? COLORS.white : COLORS.textSecondary }}>{level}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {[
              ['allergies', 'Alergi', 'Contoh: alergi ibuprofen atau tidak ada'],
              ['medications', 'Obat yang sedang dikonsumsi', 'Contoh: amoxicillin, paracetamol, atau tidak ada'],
              ['notes', 'Catatan tambahan', 'Tambahkan foto/riwayat singkat bila perlu'],
            ].map(([key, label, placeholder]) => (
              <View key={key} style={{ marginBottom: 14 }}>
                <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textPrimary, fontWeight: '800', marginBottom: 8 }}>{label}</Text>
                <TextInput
                  value={healthForm[key]}
                  onChangeText={(value) => setHealthForm((prev) => ({ ...prev, [key]: value }))}
                  placeholder={placeholder}
                  placeholderTextColor={COLORS.gray400}
                  multiline={key === 'notes'}
                  style={{ minHeight: key === 'notes' ? 72 : 46, borderRadius: 16, borderWidth: 1, borderColor: COLORS.gray200, backgroundColor: COLORS.gray100, padding: 12, color: COLORS.gray900, textAlignVertical: key === 'notes' ? 'top' : 'center' }}
                />
              </View>
            ))}

            {healthFormStatus === 'error' && (
              <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.error, marginTop: 2 }}>
                Form belum tersinkron. Periksa koneksi lalu coba simpan lagi.
              </Text>
            )}
          </ScrollView>

          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 14), backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.gray200 }}>
            <TouchableOpacity
              onPress={handleSaveHealthForm}
              disabled={healthFormSaving}
              accessibilityRole="button"
              accessibilityLabel="Simpan form kesehatan pra-sesi"
              style={{ borderRadius: 18, backgroundColor: COLORS.primary, paddingVertical: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
            >
              {healthFormSaving ? (
                <ActivityIndicator size="small" color={COLORS.white} style={{ marginRight: 8 }} />
              ) : (
                <MaterialCommunityIcons name="check-decagram" size={18} color={COLORS.white} style={{ marginRight: 8 }} />
              )}
              <Text style={{ color: COLORS.white, fontWeight: '800' }}>
                {healthFormSaving ? 'Menyimpan...' : 'Simpan Form'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowHealthForm(false)}
              disabled={healthFormSaving}
              accessibilityRole="button"
              accessibilityLabel="Lewati form kesehatan"
              style={{ marginTop: 10, paddingVertical: 10, alignItems: 'center' }}
            >
              <Text style={{ color: COLORS.textSecondary, fontWeight: '700' }}>Lewati dulu</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    );
  };

  // ──── Incoming Call Overlay ─────────────────────────────────────────────────
  const renderIncomingCallOverlay = () => {
    if (callStatus !== 'incoming') return null;

    return (
      <Animated.View
        style={{
          ...StyleSheet.absoluteFillObject,
          zIndex: 100,
          opacity: incomingCallAnim,
          transform: [
            {
              translateY: incomingCallAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            },
          ],
        }}
        pointerEvents={callStatus === 'incoming' ? 'auto' : 'none'}
      >
        <LinearGradient
          colors={[COLORS.primaryDark || '#1A0A30', COLORS.primary || '#2D1155', COLORS.primaryDark || '#1A0A30']}
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          {/* Decorative rings */}
          <Animated.View style={{ position: 'absolute', borderRadius: 999, borderWidth: 1.5, borderColor: withOpacity(COLORS.primary, 0.25), width: 260, height: 260, transform: [{ scale: pulseAnim }] }} />
          <Animated.View style={{ position: 'absolute', borderRadius: 999, borderWidth: 1.5, borderColor: withOpacity(COLORS.primary, 0.4), width: 200, height: 200, transform: [{ scale: pulseAnim }] }} />

          {/* Caller Info */}
          <View style={{ alignItems: 'center', marginBottom: 80 }}>
            <View style={{ marginBottom: 24 }}>
              {resolvedAvatar ? (
                <Image
                  source={{ uri: resolvedAvatar }}
                  style={{ width: 110, height: 110, borderRadius: 55, justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: withOpacity(COLORS.white, 0.2) }}
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <LinearGradient
                  colors={[COLORS.primaryLight, COLORS.primary]}
                  style={{ width: 110, height: 110, borderRadius: 55, justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: withOpacity(COLORS.white, 0.2) }}
                >
                  <Text style={{ fontSize: 40, fontWeight: '700', color: COLORS.white }}>{dentistInitials}</Text>
                </LinearGradient>
              )}
            </View>
            <Text style={{ fontSize: 14, color: withOpacity(COLORS.white, 0.6), letterSpacing: 1, textTransform: 'uppercase', fontWeight: '600', marginBottom: 8 }}>Video Call Masuk</Text>
            <Text style={{ fontSize: 24, fontWeight: '800', color: COLORS.white, textAlign: 'center', marginBottom: 4 }}>{safeDentistName}</Text>
            <Text style={{ fontSize: 14, color: withOpacity(COLORS.white, 0.5) }}>{displaySpecialty}</Text>
            {callNotice && (
              <View style={{ marginTop: 16, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: withOpacity(COLORS.warning, 0.18), maxWidth: 280 }}>
                <Text style={{ color: COLORS.white, fontSize: 12, lineHeight: 18, textAlign: 'center', fontWeight: '600' }}>{callNotice}</Text>
              </View>
            )}
          </View>

          {/* Accept / Reject Buttons */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 60 }}>
            {/* Reject */}
            <View style={{ alignItems: 'center' }}>
              <TouchableOpacity
                style={{ width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, backgroundColor: COLORS.error }}
                onPress={handleRejectCall}
                activeOpacity={0.8}
                accessibilityLabel="Tolak Panggilan"
                accessibilityRole="button"
              >
                <MaterialCommunityIcons name="phone-hangup" size={32} color={COLORS.white} />
              </TouchableOpacity>
              <Text style={{ color: withOpacity(COLORS.white, 0.7), ...TYPOGRAPHY.bodySmall, fontWeight: '600', marginTop: 10 }}>Tolak</Text>
            </View>

            {/* Accept (with pulse) */}
            <View style={{ alignItems: 'center' }}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <TouchableOpacity
                  style={{ width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, backgroundColor: COLORS.success }}
                  onPress={handleAcceptCall}
                  disabled={callJoinStatus !== 'idle'}
                  activeOpacity={0.8}
                  accessibilityLabel="Terima Panggilan"
                  accessibilityRole="button"
                >
                  {callJoinStatus !== 'idle' ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <MaterialCommunityIcons name="video" size={32} color={COLORS.white} />
                  )}
                </TouchableOpacity>
              </Animated.View>
              <Text style={{ color: withOpacity(COLORS.white, 0.7), ...TYPOGRAPHY.bodySmall, fontWeight: '600', marginTop: 10 }}>
                {callJoinStatus === 'checking' ? 'Cek sesi' : callJoinStatus === 'permissions' ? 'Izin' : callJoinStatus === 'connecting' ? 'Menghubungkan' : 'Terima'}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  // ──── Active Video Call Overlay ─────────────────────────────────────────────
  const renderVideoCallOverlay = () => {
    if (callStatus !== 'active') return null;
    const isReconnecting = videoConnectionState === 'reconnecting';
    const callStateLabel = isReconnecting ? 'Reconnect' : isConnected ? 'Live' : 'Connecting';
    const callStateColor = isReconnecting ? COLORS.warning : isConnected ? COLORS.success : COLORS.accent;

    return (
      <Animated.View
        style={{
          ...StyleSheet.absoluteFillObject,
          zIndex: 100,
          opacity: videoCallAnim,
          transform: [
            {
              scale: videoCallAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.95, 1],
              }),
            },
          ],
        }}
        pointerEvents={callStatus === 'active' ? 'auto' : 'none'}
      >
        {/* Remote Participant View / Background */}
        <View style={StyleSheet.absoluteFill}>
          {remoteVideoTracks.length > 0 ? (
            <View style={{ flex: 1, backgroundColor: COLORS.black, flexDirection: remoteVideoTracks.length > 1 ? 'row' : 'column', flexWrap: 'wrap' }}>
              {remoteVideoTracks.slice(0, 4).map((remoteTrack) => (
                <View
                  key={`${remoteTrack.participantSid}-${remoteTrack.videoTrackSid}`}
                  style={{
                    width: remoteVideoTracks.length > 1 ? '50%' : '100%',
                    height: remoteVideoTracks.length > 2 ? '50%' : '100%',
                    backgroundColor: COLORS.black,
                    overflow: 'hidden',
                  }}
                >
                  <SafeTwilioVideoParticipantView
                    style={{ flex: 1, backgroundColor: COLORS.black }}
                    trackIdentifier={{
                      participantSid: remoteTrack.participantSid,
                      videoTrackSid: remoteTrack.videoTrackSid
                    }}
                  />
                  <View style={{ position: 'absolute', left: 10, bottom: 10, backgroundColor: withOpacity(COLORS.black, 0.45), borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 }}>
                    <Text style={{ color: COLORS.white, fontSize: 11, fontWeight: '700' }} numberOfLines={1}>
                      {remoteTrack.identity?.includes('dentist') ? 'Dokter' : safeDentistName}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <LinearGradient colors={['#0F172A', '#1E293B']} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <View style={{ position: 'relative' }}>
                {resolvedAvatar ? (
                  <Image source={{ uri: resolvedAvatar }} style={{ width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: withOpacity(COLORS.white, 0.2), marginBottom: 16 }} onError={() => setAvatarError(true)} />
                ) : (
                  <LinearGradient colors={[COLORS.primaryLight, COLORS.primary]} style={{ width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                    <Text style={{ fontSize: 36, fontWeight: '700', color: COLORS.white }}>{dentistInitials}</Text>
                  </LinearGradient>
                )}
                <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.white, textAlign: 'center' }}>{safeDentistName}</Text>
                <Text style={{ fontSize: 13, color: withOpacity(COLORS.white, 0.5), marginTop: 4, textAlign: 'center' }}>{displaySpecialty}</Text>
                <Text style={{ fontSize: 14, color: COLORS.accent, marginTop: 12, textAlign: 'center' }}>
                  {remoteParticipants.length > 0 ? 'Audio tersambung. Kamera dokter tidak aktif.' : 'Menunggu terhubung...'}
                </Text>
              </View>
            </LinearGradient>
          )}
        </View>

        {/* Top Bar: Timer + Back */}
        <SafeAreaView style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8 }}>
            <TouchableOpacity style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: withOpacity(COLORS.white, 0.15), justifyContent: 'center', alignItems: 'center' }} onPress={handleEndCall} accessibilityLabel="Kembali" accessibilityRole="button">
              <MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.white} />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: withOpacity(COLORS.white, 0.15), paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: callStateColor, marginRight: 8 }} />
              <Text style={{ color: COLORS.white, fontSize: 11, fontWeight: '700', marginRight: 8 }}>{callStateLabel}</Text>
              <Text style={{ color: COLORS.white, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{formatCallDuration(callDuration)}</Text>
              <MaterialCommunityIcons name="signal-cellular-2" size={14} color={COLORS.white} style={{ marginLeft: 10, marginRight: 4 }} />
              <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: '700' }}>{networkQuality >= 0 ? networkQuality : '-'}/5</Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowConnectionDiagnostics(true)}
              accessibilityLabel="Diagnostik Koneksi"
              accessibilityRole="button"
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: withOpacity(COLORS.white, 0.15), justifyContent: 'center', alignItems: 'center' }}
            >
              <MaterialCommunityIcons name="dots-horizontal" size={22} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {networkQuality >= 0 && networkQuality <= 1 && (
          <View style={{ position: 'absolute', top: insets.top + 58, left: 16, right: 16, zIndex: 11, backgroundColor: withOpacity(COLORS.warning, 0.92), borderRadius: 12, padding: 10 }}>
            <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: '700', textAlign: 'center' }}>
              Kualitas jaringan buruk. Gunakan audio-only bila video terputus.
            </Text>
            {isVideoEnabled && (
              <TouchableOpacity
                onPress={switchToAudioOnly}
                style={{ marginTop: 8, alignSelf: 'center', borderWidth: 1, borderColor: withOpacity(COLORS.white, 0.5), borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}
              >
                <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: '700' }}>Audio only</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {callNotice && (
          <View style={{ position: 'absolute', top: insets.top + (networkQuality >= 0 && networkQuality <= 1 ? 142 : 58), left: 16, right: 16, zIndex: 11, backgroundColor: withOpacity(isReconnecting ? COLORS.warning : COLORS.error, 0.92), borderRadius: 12, padding: 10 }}>
            <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: '700', textAlign: 'center' }}>{callNotice}</Text>
          </View>
        )}

        {/* PIP (Patient Camera) */}
        <View style={{ position: 'absolute', right: 16, width: 110, height: 150, borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: withOpacity(COLORS.white, 0.3), elevation: 10, shadowColor: COLORS.black, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, top: insets.top + 60, backgroundColor: '#263238' }}>
          {isVideoEnabled ? (
            <SafeTwilioVideoLocalView enabled={true} style={{ flex: 1 }} />
          ) : (
            <LinearGradient colors={['#37474F', '#263238']} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <MaterialCommunityIcons name="camera-off" size={32} color={withOpacity(COLORS.white, 0.6)} />
              <Text style={{ color: withOpacity(COLORS.white, 0.5), fontSize: 10, marginTop: 4 }}>Kamera Mati</Text>
            </LinearGradient>
          )}
        </View>

        {/* Bottom Controls */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 20, paddingBottom: Math.max(insets.bottom, 20) }}>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, paddingHorizontal: 20 }}>
            {/* Mute */}
            <TouchableOpacity
              style={{ alignItems: 'center', justifyContent: 'center', width: 64, height: 76, borderRadius: 20, backgroundColor: !isAudioEnabled ? withOpacity(COLORS.white, 0.3) : withOpacity(COLORS.white, 0.15), paddingTop: 6 }}
              onPress={toggleAudio}
              activeOpacity={0.8}
              accessibilityLabel={!isAudioEnabled ? "Nyalakan Mikrofon" : "Matikan Mikrofon"}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name={!isAudioEnabled ? 'microphone-off' : 'microphone'} size={24} color={COLORS.white} />
              <Text style={{ color: COLORS.white, ...TYPOGRAPHY.caption, fontWeight: '500', marginTop: 4 }}>{!isAudioEnabled ? 'Unmute' : 'Mute'}</Text>
            </TouchableOpacity>

            {/* Camera Toggle */}
            <TouchableOpacity
              style={{ alignItems: 'center', justifyContent: 'center', width: 64, height: 76, borderRadius: 20, backgroundColor: !isVideoEnabled ? withOpacity(COLORS.white, 0.3) : withOpacity(COLORS.white, 0.15), paddingTop: 6 }}
              onPress={toggleVideo}
              activeOpacity={0.8}
              accessibilityLabel={!isVideoEnabled ? "Nyalakan Kamera" : "Matikan Kamera"}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name={!isVideoEnabled ? 'camera-off' : 'camera'} size={24} color={COLORS.white} />
              <Text style={{ color: COLORS.white, ...TYPOGRAPHY.caption, fontWeight: '500', marginTop: 4 }}>{!isVideoEnabled ? 'Nyalakan' : 'Matikan'}</Text>
            </TouchableOpacity>

            {/* Switch Camera */}
            <TouchableOpacity
              style={{ alignItems: 'center', justifyContent: 'center', width: 64, height: 76, borderRadius: 20, backgroundColor: withOpacity(COLORS.white, 0.15), paddingTop: 6 }}
              onPress={flipCamera}
              activeOpacity={0.8}
              accessibilityLabel="Ganti Kamera"
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="camera-flip-outline" size={24} color={COLORS.white} />
              <Text style={{ color: COLORS.white, ...TYPOGRAPHY.caption, fontWeight: '500', marginTop: 4 }}>Flip</Text>
            </TouchableOpacity>

            {/* End Call */}
            <TouchableOpacity
              style={{ alignItems: 'center', justifyContent: 'center', width: 64, height: 76, borderRadius: 20, backgroundColor: COLORS.error, paddingTop: 6 }}
              onPress={handleEndCall}
              activeOpacity={0.8}
              accessibilityLabel="Akhiri Panggilan"
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="phone-hangup" size={24} color={COLORS.white} />
              <Text style={{ color: COLORS.white, ...TYPOGRAPHY.caption, fontWeight: '500', marginTop: 4 }}>Akhiri</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  MAIN RENDER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {renderHeader()}

      {appointmentId && !socketConnected && !isArchiveSession && sessionStatus !== 'ended' && (
        <View style={{ backgroundColor: COLORS.warning, paddingVertical: 8, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name="wifi-off" size={16} color={COLORS.white} style={{ marginRight: 8 }} />
          <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: '600' }}>
            {reconnectError || (connectionState === 'connecting' ? 'Menghubungkan ulang sesi chat...' : 'Koneksi terputus. Menghubungkan kembali...')}
          </Text>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {renderChatView()}
        {renderInputBar()}
      </KeyboardAvoidingView>

      {/* Overlays */}
      {renderPreSessionHealthForm()}
      {renderIncomingCallOverlay()}
      {renderVideoCallOverlay()}
      {showConnectionDiagnostics && (
        <View style={{ ...StyleSheet.absoluteFillObject, zIndex: 130, backgroundColor: withOpacity(COLORS.black, 0.45), justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: COLORS.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: Math.max(insets.bottom, 20) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <MaterialCommunityIcons name="chart-line" size={22} color={COLORS.primary} />
              <Text style={{ ...TYPOGRAPHY.h3, color: COLORS.textPrimary, marginLeft: 10, flex: 1 }}>Diagnostik Koneksi</Text>
              <TouchableOpacity onPress={() => setShowConnectionDiagnostics(false)} accessibilityLabel="Tutup diagnostik koneksi">
                <MaterialCommunityIcons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            {qualityHistoryRef.current.slice(-8).map((item) => (
              <View key={item.timestamp} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 }}>
                <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textMuted, width: 78 }}>
                  {new Date(item.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </Text>
                <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: COLORS.gray100, overflow: 'hidden' }}>
                  <View style={{ width: `${Math.max(8, (item.quality / 5) * 100)}%`, height: '100%', backgroundColor: item.quality <= 1 ? COLORS.error : item.quality <= 2 ? COLORS.warning : COLORS.success }} />
                </View>
                <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textPrimary, marginLeft: 10, fontWeight: '800' }}>{item.quality}/5</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <PreCallSystemCheckSheet
        visible={preCallSystemCheck.visible}
        checks={preCallSystemCheck.checks}
        canJoin={preCallSystemCheck.canJoin}
        audioOnly={preCallSystemCheck.audioOnly}
        joining={callJoinStatus === 'connecting'}
        labels={{
          title: t('mobile.teledentistry.preCall.title', { fallbackText: 'Pemeriksaan Sebelum Panggilan' }),
          close: t('common.actions.close', { fallbackText: 'Tutup' }),
          ready: t('mobile.teledentistry.preCall.ready', { fallbackText: 'Siap bergabung' }),
          joinAudioOnly: t('mobile.teledentistry.preCall.joinAudioOnly', { fallbackText: 'Bergabung audio saja' }),
        }}
        onClose={() => setPreCallSystemCheck({ visible: false, session: null, checks: [], canJoin: false, audioOnly: false })}
        onJoin={async () => {
          if (!preCallSystemCheck.session) return;
          try {
            await completeAcceptCall(preCallSystemCheck.session, { enableVideo: !preCallSystemCheck.audioOnly });
            setPreCallSystemCheck({ visible: false, session: null, checks: [], canJoin: false, audioOnly: false });
          } catch (error) {
            const message = error?.message || 'Gagal memulai video call. Silakan coba lagi.';
            setCallNotice(message);
            Alert.alert('Gagal Bergabung', message);
            setCallJoinStatus('idle');
          }
        }}
      />

      {/* Global Twilio Video Engine */}
      <SafeTwilioVideo ref={twilioRef} {...handlers} />
    </View>
  );
};

export default PatientTeledentistryScreen;
