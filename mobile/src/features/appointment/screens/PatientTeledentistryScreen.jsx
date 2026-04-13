/**
 * PatientTeledentistryScreen.jsx
 * * Complete teledentistry session UI for the patient side.
 * Handles: Upcoming → Chat → Incoming Call → Active Video Call → Session Ended.
 * * All backend interactions are simulated via local state.
 * All styles are inline for easy modification.
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, StatusBar, Animated, Easing, Image, StyleSheet, Alert, } from 'react-native';
import { Camera } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TwilioVideoLocalView, TwilioVideoParticipantView, TwilioVideo } from '@twilio/video-react-native-sdk';
import { useChat } from '../../../hooks/useChat';
import { useTwilioVideoClient } from '../../../hooks/useTwilioVideoClient';

// ─── Brand / Theme Constants ───────────────────────────────────────────────────
const COLORS = {
  primary: '#62109F', primaryLight: '#982BEA', primaryDark: '#450B71', secondary: '#00BFA6',
  accent: '#FF6B9D', success: '#4CAF50', error: '#F44336', warning: '#FF9800', white: '#FFFFFF',
  black: '#000000', gray50: '#FAFAFA', gray100: '#F5F5F5', gray200: '#EEEEEE',
  gray300: '#E0E0E0', gray400: '#BDBDBD', gray500: '#9E9E9E', gray600: '#757575',
  gray700: '#616161', gray800: '#424242', gray900: '#212121', background: '#F8FAFC',
  chatUser: '#62109F', chatDentist: '#FFFFFF', chatSystem: '#F1F5F9', overlayDark: 'rgba(0,0,0,0.75)', overlayBlur: 'rgba(15,10,30,0.85)',
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

  // Route params (from DetailAppointmentScreen or wherever)
  const {
    dentistName = 'Dokter Gigi',
    dentistSpecialty = '',
    dentistAvatar: _rawDentistAvatar = null,
    dentistInitials = 'DG',
    appointmentId = null,
    appointmentDate = null,
  } = route.params || {};

  // Sanitize avatar — must be a valid http(s) URL or null, never empty/relative
  const dentistAvatar = isValidImageUrl(_rawDentistAvatar) ? _rawDentistAvatar.trim() : null;

  // ─── Determine initial session status from appointment time ─────────────────
  const resolvedAppointmentDate = useMemo(
    () => (appointmentDate ? new Date(appointmentDate) : null),
    [appointmentDate],
  );
  const isSessionReady = useMemo(
    () => !resolvedAppointmentDate || new Date() >= resolvedAppointmentDate,
    [resolvedAppointmentDate],
  );

  // Display specialty: use what's provided, don't default to generic
  const displaySpecialty = dentistSpecialty || 'Dokter Gigi';

  // ─── Real Chat Backend ─────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => {
    AsyncStorage.getItem('user').then((json) => {
      if (json) setCurrentUser(JSON.parse(json));
    }).catch(() => { });
  }, []);

  const {
    messages: chatMessagesFromSocket,
    socketConnected,
    incomingCall,
    selectConversation,
    sendMessage,
    emitVideoCallResponse,
    emitVideoCallEnded,
    fetchVideoToken,
  } = useChat({ userId: currentUser?.id });

  const { twilioRef, isConnected, isAudioEnabled, isVideoEnabled, remoteParticipantSids, connect, disconnect, toggleAudio, toggleVideo, flipCamera, handlers } = useTwilioVideoClient();

  const [systemMessages, setSystemMessages] = useState([]);
  const [sessionStatus, setSessionStatus] = useState(isSessionReady ? 'active' : 'upcoming');
  const [callStatus, setCallStatus] = useState('idle');  // 'idle' | 'incoming' | 'active'

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

  // ─── Animations ────────────────────────────────────────────────────────────
  const incomingCallAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const videoCallAnim = useRef(new Animated.Value(0)).current;

  // ─── Merge socket messages + system messages for display ──────────────────
  const chatMessages = useMemo(() => {
    const socketMsgs = (chatMessagesFromSocket || []).map((m) => ({
      id: m.id,
      role: m.senderId === currentUser?.id?.toString() ? 'user' : 'dentist',
      text: m.message,
      timestamp: new Date(m.createdAt),
    }));
    const all = [...systemMessages, ...socketMsgs];
    all.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    return all;
  }, [chatMessagesFromSocket, systemMessages, currentUser?.id]);

  // ─── Join chat room on mount ───────────────────────────────────────────────
  useEffect(() => {
    if (appointmentId && socketConnected) {
      selectConversation(appointmentId.toString());
    }
  }, [appointmentId, socketConnected, selectConversation]);

  // ─── Init: Push system welcome message ─────────────────────────────────────
  useEffect(() => {
    const shortName = dentistName.split(',')[0];
    let systemText;
    if (!isSessionReady && resolvedAppointmentDate) {
      const formattedDate = formatAppointmentDateTime(resolvedAppointmentDate);
      systemText = `Sesi Anda dijadwalkan pada ${formattedDate}. Anda belum bisa mengirim pesan hingga jadwal dimulai.`;
    } else {
      systemText = `Sesi telah dimulai. Silakan tunggu, ${shortName} akan segera menghubungi Anda via Video Call.`;
    }
    setSystemMessages([{ id: 'sys-init', role: 'system', text: systemText, timestamp: new Date() }]);
  }, [dentistName, isSessionReady, resolvedAppointmentDate]);

  // ─── Upcoming → Active transition timer ────────────────────────────────────
  useEffect(() => {
    if (sessionStatus !== 'upcoming' || !resolvedAppointmentDate) return;
    const now = new Date();
    const msUntilStart = resolvedAppointmentDate.getTime() - now.getTime();
    if (msUntilStart <= 0) {
      setSessionStatus('active');
      addSystemMessage(`Sesi telah dimulai. Silakan tunggu, ${dentistName.split(',')[0]} akan segera menghubungi Anda via Video Call.`);
      return;
    }
    const timer = setTimeout(() => {
      setSessionStatus('active');
      addSystemMessage(`Sesi telah dimulai. Silakan tunggu, ${dentistName.split(',')[0]} akan segera menghubungi Anda via Video Call.`);
    }, msUntilStart);
    return () => clearTimeout(timer);
  }, [sessionStatus, resolvedAppointmentDate, dentistName]);

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
      return () => pulse.stop();
    } else {
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
      Animated.timing(videoCallAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
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
  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || sessionStatus !== 'active') return;
    setInputText('');
    await sendMessage({ appointmentId: appointmentId?.toString(), text: trimmed });
  };

  const handleAcceptCall = async () => {
    try {
      const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
      const { status: micStatus } = await Camera.requestMicrophonePermissionsAsync();

      if (cameraStatus !== 'granted' || micStatus !== 'granted') {
        Alert.alert('Izin Ditolak', 'Aplikasi memerlukan akses Kamera dan Mikrofon untuk Video Call.');
        return;
      }

      if (appointmentId) {
        emitVideoCallResponse(appointmentId.toString(), true);
        const { token, roomName } = await fetchVideoToken(appointmentId.toString());
        connect({ roomName, token });
      }
      setCallStatus('active');
      addSystemMessage('Video call dimulai.');
    } catch (e) {
      console.warn('Failed to get permissions', e);
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
    addSystemMessage(`Video call berakhir. Durasi: ${duration}.`);
  };

  const handleEndSession = () => {
    setSessionStatus('ended');
    setCallStatus('idle');
    addSystemMessage('Sesi konsultasi telah berakhir.');
  };

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
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: 'rgba(255,255,255,0.15)',
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
                borderColor: 'rgba(255,255,255,0.3)',
              }}
              onError={() => setAvatarError(true)}
            />
          ) : (
            <LinearGradient
              colors={['#B388FF', '#7C4DFF']}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 2,
                borderColor: 'rgba(255,255,255,0.3)',
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.white }}>
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
            {dentistName}
          </Text>
          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 1 }} numberOfLines={1}>
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
            backgroundColor: 'rgba(255,255,255,0.08)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          disabled
          activeOpacity={1}
        >
          <MaterialCommunityIcons name="phone" size={20} color="rgba(255,255,255,0.35)" />
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: 'rgba(255,255,255,0.08)',
            justifyContent: 'center',
            alignItems: 'center',
            marginLeft: 6,
          }}
          disabled
          activeOpacity={1}
        >
          <MaterialCommunityIcons name="video" size={20} color="rgba(255,255,255,0.35)" />
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
              color: isUser ? 'rgba(255,255,255,0.6)' : COLORS.gray400,
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
      {/* Date separator */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: COLORS.gray200 }} />
        <Text style={{ marginHorizontal: 12, fontSize: 12, color: COLORS.gray500, fontWeight: '500' }}>Hari ini</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: COLORS.gray200 }} />
      </View>

      {chatMessages.map(renderMessage)}

      {/* Upcoming banner */}
      {sessionStatus === 'upcoming' && resolvedAppointmentDate && (
        <View style={{ marginTop: 16, marginBottom: 8, alignItems: 'center' }}>
          <View
            style={{
              backgroundColor: '#EDE7F6',
              borderRadius: 16,
              padding: 20,
              alignItems: 'center',
              width: '100%',
              borderWidth: 1,
              borderColor: '#D1C4E9',
            }}
          >
            <MaterialCommunityIcons name="calendar-clock" size={24} color={COLORS.primary} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.primaryDark, marginTop: 8 }}>
              Menunggu Jadwal Konsultasi
            </Text>
            <Text style={{ fontSize: 13, color: COLORS.primary, marginTop: 4, textAlign: 'center', fontWeight: '600' }}>
              {formatAppointmentDateTime(resolvedAppointmentDate)}
            </Text>
          </View>
        </View>
      )}

      {/* Ended banner */}
      {sessionStatus === 'ended' && (
        <View style={{ marginTop: 16, marginBottom: 8, alignItems: 'center' }}>
          <View
            style={{
              backgroundColor: '#E8F5E9',
              borderRadius: 16,
              padding: 20,
              alignItems: 'center',
              width: '100%',
              borderWidth: 1,
              borderColor: '#A5D6A7',
            }}
          >
            <MaterialCommunityIcons name="check-decagram" size={24} color={COLORS.secondary} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#2E7D32', marginTop: 8 }}>
              Sesi konsultasi telah selesai
            </Text>
            <Text style={{ fontSize: 12, color: '#4CAF50', marginTop: 4, textAlign: 'center' }}>
              Riwayat chat di atas disimpan untuk referensi Anda.
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );

  // ──── Input Bar ────────────────────────────────────────────────────────────
  const renderInputBar = () => {
    if (sessionStatus === 'ended' || sessionStatus === 'upcoming') return null;

    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          paddingHorizontal: 12,
          paddingTop: 10,
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.gray200,
          paddingBottom: Math.max(insets.bottom, 12),
        }}
      >
        {/* Attachment */}
        <TouchableOpacity
          style={{ width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 4 }}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="paperclip" size={22} color={COLORS.gray500} />
        </TouchableOpacity>

        {/* Text Input */}
        <View
          style={{
            flex: 1,
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
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            returnKeyType="default"
          />
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
        <LinearGradient colors={['#1A0A30', '#2D1155', '#1A0A30']} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          {/* Decorative rings */}
          <Animated.View style={{ position: 'absolute', borderRadius: 999, borderWidth: 1.5, borderColor: 'rgba(152,43,234,0.25)', width: 260, height: 260, transform: [{ scale: pulseAnim }] }} />
          <Animated.View style={{ position: 'absolute', borderRadius: 999, borderWidth: 1.5, borderColor: 'rgba(152,43,234,0.4)', width: 200, height: 200, transform: [{ scale: pulseAnim }] }} />

          {/* Caller Info */}
          <View style={{ alignItems: 'center', marginBottom: 80 }}>
            <View style={{ marginBottom: 24 }}>
              {resolvedAvatar ? (
                <Image
                  source={{ uri: resolvedAvatar }}
                  style={{ width: 110, height: 110, borderRadius: 55, justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: 'rgba(255,255,255,0.2)' }}
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <LinearGradient
                  colors={[COLORS.primaryLight, COLORS.primary]}
                  style={{ width: 110, height: 110, borderRadius: 55, justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: 'rgba(255,255,255,0.2)' }}
                >
                  <Text style={{ fontSize: 40, fontWeight: '700', color: COLORS.white }}>{dentistInitials}</Text>
                </LinearGradient>
              )}
            </View>
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', letterSpacing: 1, textTransform: 'uppercase', fontWeight: '600', marginBottom: 8 }}>Video Call Masuk</Text>
            <Text style={{ fontSize: 24, fontWeight: '800', color: COLORS.white, textAlign: 'center', marginBottom: 4 }}>{dentistName}</Text>
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>{displaySpecialty}</Text>
          </View>

          {/* Accept / Reject Buttons */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 60 }}>
            {/* Reject */}
            <View style={{ alignItems: 'center' }}>
              <TouchableOpacity
                style={{ width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, backgroundColor: COLORS.error }}
                onPress={handleRejectCall}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="phone-hangup" size={32} color={COLORS.white} />
              </TouchableOpacity>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600', marginTop: 10 }}>Tolak</Text>
            </View>

            {/* Accept (with pulse) */}
            <View style={{ alignItems: 'center' }}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <TouchableOpacity
                  style={{ width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, backgroundColor: COLORS.success }}
                  onPress={handleAcceptCall}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="video" size={32} color={COLORS.white} />
                </TouchableOpacity>
              </Animated.View>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600', marginTop: 10 }}>Terima</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  // ──── Active Video Call Overlay ─────────────────────────────────────────────
  const renderVideoCallOverlay = () => {
    if (callStatus !== 'active') return null;

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
          {remoteParticipantSids.length > 0 ? (
            <TwilioVideoParticipantView
              style={{ flex: 1, backgroundColor: '#000' }}
              trackIdentifier={{
                participantSid: remoteParticipantSids[0],
                videoTrackSid: ''
              }}
            />
          ) : (
            <LinearGradient colors={['#0F172A', '#1E293B']} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <View style={{ position: 'relative' }}>
                {resolvedAvatar ? (
                  <Image source={{ uri: resolvedAvatar }} style={{ width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: 'rgba(255,255,255,0.2)', marginBottom: 16 }} onError={() => setAvatarError(true)} />
                ) : (
                  <LinearGradient colors={[COLORS.primaryLight, COLORS.primary]} style={{ width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                    <Text style={{ fontSize: 36, fontWeight: '700', color: COLORS.white }}>{dentistInitials}</Text>
                  </LinearGradient>
                )}
                <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.white, textAlign: 'center' }}>{dentistName}</Text>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4, textAlign: 'center' }}>{displaySpecialty}</Text>
                <Text style={{ fontSize: 14, color: COLORS.accent, marginTop: 12, textAlign: 'center' }}>Menunggu terhubung...</Text>
              </View>
            </LinearGradient>
          )}
        </View>

        {/* Top Bar: Timer + Back */}
        <SafeAreaView style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8 }}>
            <TouchableOpacity style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' }} onPress={handleEndCall}>
              <MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.white} />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.error, marginRight: 8 }} />
              <Text style={{ color: COLORS.white, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{formatCallDuration(callDuration)}</Text>
            </View>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' }} />
          </View>
        </SafeAreaView>

        {/* PIP (Patient Camera) */}
        <View style={{ position: 'absolute', right: 16, width: 110, height: 150, borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, top: insets.top + 60, backgroundColor: '#263238' }}>
          {isVideoEnabled ? (
            <TwilioVideoLocalView enabled={true} style={{ flex: 1 }} />
          ) : (
            <LinearGradient colors={['#37474F', '#263238']} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <MaterialCommunityIcons name="camera-off" size={32} color="rgba(255,255,255,0.6)" />
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 4 }}>Kamera Mati</Text>
            </LinearGradient>
          )}
        </View>

        {/* Bottom Controls */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 20, paddingBottom: Math.max(insets.bottom, 20) }}>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, paddingHorizontal: 20 }}>
            {/* Mute */}
            <TouchableOpacity
              style={{ alignItems: 'center', justifyContent: 'center', width: 64, height: 76, borderRadius: 20, backgroundColor: !isAudioEnabled ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)', paddingTop: 6 }}
              onPress={toggleAudio}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name={!isAudioEnabled ? 'microphone-off' : 'microphone'} size={24} color={COLORS.white} />
              <Text style={{ color: COLORS.white, fontSize: 10, fontWeight: '500', marginTop: 4 }}>{!isAudioEnabled ? 'Unmute' : 'Mute'}</Text>
            </TouchableOpacity>

            {/* Camera Toggle */}
            <TouchableOpacity
              style={{ alignItems: 'center', justifyContent: 'center', width: 64, height: 76, borderRadius: 20, backgroundColor: !isVideoEnabled ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)', paddingTop: 6 }}
              onPress={toggleVideo}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name={!isVideoEnabled ? 'camera-off' : 'camera'} size={24} color={COLORS.white} />
              <Text style={{ color: COLORS.white, fontSize: 10, fontWeight: '500', marginTop: 4 }}>{!isVideoEnabled ? 'Nyalakan' : 'Matikan'}</Text>
            </TouchableOpacity>

            {/* Switch Camera */}
            <TouchableOpacity
              style={{ alignItems: 'center', justifyContent: 'center', width: 64, height: 76, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', paddingTop: 6 }}
              onPress={flipCamera}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="camera-flip-outline" size={24} color={COLORS.white} />
              <Text style={{ color: COLORS.white, fontSize: 10, fontWeight: '500', marginTop: 4 }}>Flip</Text>
            </TouchableOpacity>

            {/* End Call */}
            <TouchableOpacity
              style={{ alignItems: 'center', justifyContent: 'center', width: 64, height: 76, borderRadius: 20, backgroundColor: COLORS.error, paddingTop: 6 }}
              onPress={handleEndCall}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="phone-hangup" size={24} color={COLORS.white} />
              <Text style={{ color: COLORS.white, fontSize: 10, fontWeight: '500', marginTop: 4 }}>Akhiri</Text>
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

      {!socketConnected && (
        <View style={{ backgroundColor: '#F59E0B', paddingVertical: 8, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name="wifi-off" size={16} color={COLORS.white} style={{ marginRight: 8 }} />
          <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: '600' }}>Koneksi terputus. Menghubungkan kembali...</Text>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {renderChatView()}
        {renderInputBar()}
      </KeyboardAvoidingView>

      {/* Overlays */}
      {renderIncomingCallOverlay()}
      {renderVideoCallOverlay()}

      {/* Global Twilio Video Engine */}
      <TwilioVideo ref={twilioRef} {...handlers} />
    </View>
  );
};

export default PatientTeledentistryScreen;