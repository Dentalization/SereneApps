import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const resolveAvatarUrl = (raw) => {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : null;
};

const CHAT_READY_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours

const AppointmentChatBanner = ({ appointment, unreadCount = 0, onPress }) => {
  const dentist = appointment?.dentist || {};
  const dentistName = dentist?.name || 'Dokter Gigi';
  const avatar = resolveAvatarUrl(dentist?.avatar || dentist?.avatar_url || dentist?.avatarUrl);
  const initials = (dentistName || 'DG')
    .split(' ')
    .filter((w) => w.length > 0)
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const { isChatReady, timeLabel } = useMemo(() => {
    if (!appointment?.startsAt) return { isChatReady: true, timeLabel: null };
    const startsAt = new Date(appointment.startsAt);
    const now = new Date();
    const diff = startsAt.getTime() - now.getTime();

    if (diff <= 0) {
      return { isChatReady: true, timeLabel: null };
    }
    if (diff <= CHAT_READY_THRESHOLD_MS) {
      return { isChatReady: true, timeLabel: null };
    }
    // More than 2 hours away
    const hours = Math.floor(diff / (60 * 60 * 1000));
    const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
    const label = hours > 0 ? `${hours} jam ${mins} menit lagi` : `${mins} menit lagi`;
    return { isChatReady: false, timeLabel: label };
  }, [appointment?.startsAt]);

  return (
    <TouchableOpacity
      onPress={isChatReady ? onPress : undefined}
      activeOpacity={isChatReady ? 0.7 : 1}
      disabled={!isChatReady}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isChatReady ? '#F0FDF4' : '#F8FAFC',
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginTop: 16,
        borderWidth: 1,
        borderColor: isChatReady ? '#BBF7D0' : '#E2E8F0',
      }}
    >
      {/* Dentist Avatar */}
      <View style={{ position: 'relative' }}>
        {avatar ? (
          <Image
            source={{ uri: avatar }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              borderWidth: 2,
              borderColor: isChatReady ? '#86EFAC' : '#E2E8F0',
            }}
          />
        ) : (
          <LinearGradient
            colors={isChatReady ? ['#86EFAC', '#4ADE80'] : ['#CBD5E1', '#94A3B8']}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>{initials}</Text>
          </LinearGradient>
        )}
        {isChatReady && (
          <View
            style={{
              position: 'absolute',
              bottom: -2,
              right: -2,
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: '#22C55E',
              borderWidth: 2,
              borderColor: '#F0FDF4',
            }}
          />
        )}
      </View>

      {/* Text */}
      <View style={{ flex: 1, marginLeft: 12 }}>
        {isChatReady ? (
          <>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#166534' }}>
              Chat dengan {dentistName.split(',')[0]}
            </Text>
            <Text style={{ fontSize: 12, color: '#4ADE80', marginTop: 2, fontWeight: '500' }}>
              Chat tersedia • Ketuk untuk mulai
            </Text>
          </>
        ) : (
          <>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#64748B' }}>
              Chat dengan {dentistName.split(',')[0]}
            </Text>
            <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
              Dibuka {timeLabel}
            </Text>
          </>
        )}
      </View>

      {/* Unread Badge */}
      {isChatReady && unreadCount > 0 && (
        <View
          style={{
            backgroundColor: '#DC2626',
            borderRadius: 10,
            minWidth: 20,
            height: 20,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 6,
            marginRight: 8,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}

      {/* Chevron */}
      <MaterialCommunityIcons
        name="chevron-right"
        size={20}
        color={isChatReady ? '#22C55E' : '#CBD5E1'}
      />
    </TouchableOpacity>
  );
};

export default AppointmentChatBanner;
