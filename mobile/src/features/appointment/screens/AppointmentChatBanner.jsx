import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors as THEME_COLORS, withOpacity } from '../../../theme/colors';
import { typography as TYPOGRAPHY } from '../../../theme/dimensions';
import resolveMediaUrl from '../../../utils/media';

const COLORS = THEME_COLORS;

const CHAT_READY_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

const AppointmentChatBanner = ({ appointment, unreadCount = 0, onPress }) => {
  const dentist = appointment?.dentist || {};
  const dentistName = dentist?.name || 'Dokter Gigi';
  const avatar = resolveMediaUrl(dentist?.avatar || dentist?.avatar_url || dentist?.avatarUrl);
  const initials = (dentistName || 'DG')
    .split(' ')
    .filter((w) => w.length > 0)
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const [timeState, setTimeState] = React.useState({ isChatReady: true, timeLabel: null });

  React.useEffect(() => {
    if (!appointment?.startsAt) {
      setTimeState({ isChatReady: true, timeLabel: null });
      return;
    }

    const calculateTime = () => {
      const startsAt = new Date(appointment.startsAt);
      const now = new Date();
      const diff = startsAt.getTime() - now.getTime();

      if (diff <= 0 || diff <= CHAT_READY_THRESHOLD_MS) {
        return { isChatReady: true, timeLabel: null };
      }
      
      const hours = Math.floor(diff / (60 * 60 * 1000));
      const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
      const label = hours > 0 ? `${hours} jam ${mins} menit lagi` : `${mins} menit lagi`;
      return { isChatReady: false, timeLabel: label };
    };

    setTimeState(calculateTime());
    
    const interval = setInterval(() => {
      setTimeState(calculateTime());
    }, 60000); // update every minute

    return () => clearInterval(interval);
  }, [appointment?.startsAt]);

  const { isChatReady, timeLabel } = timeState;

  return (
    <TouchableOpacity
      onPress={isChatReady ? onPress : undefined}
      activeOpacity={isChatReady ? 0.7 : 1}
      disabled={!isChatReady}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isChatReady ? withOpacity(COLORS.success, 0.1) : COLORS.surface,
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginTop: 16,
        borderWidth: 1,
        borderColor: isChatReady ? withOpacity(COLORS.success, 0.3) : COLORS.border,
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
              borderColor: isChatReady ? withOpacity(COLORS.success, 0.5) : COLORS.border,
            }}
          />
        ) : (
          <LinearGradient
            colors={isChatReady ? [withOpacity(COLORS.success, 0.4), withOpacity(COLORS.success, 0.6)] : [COLORS.border, COLORS.textMuted]}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{ ...TYPOGRAPHY.caption, fontWeight: '700', color: COLORS.white }}>{initials}</Text>
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
              backgroundColor: COLORS.success,
              borderWidth: 2,
              borderColor: COLORS.surfaceElevated,
            }}
          />
        )}
      </View>

      {/* Text */}
      <View style={{ flex: 1, marginLeft: 12 }}>
        {isChatReady ? (
          <>
            <Text style={{ ...TYPOGRAPHY.bodySmall, fontWeight: '600', color: withOpacity(COLORS.success, 0.85) }}>
              Chat dengan {dentistName.split(',')[0]}
            </Text>
            <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.success, marginTop: 2, fontWeight: '500' }}>
              Chat tersedia • Ketuk untuk mulai
            </Text>
          </>
        ) : (
          <>
            <Text style={{ ...TYPOGRAPHY.bodySmall, fontWeight: '600', color: COLORS.textSecondary }}>
              Chat dengan {dentistName.split(',')[0]}
            </Text>
            <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textMuted, marginTop: 2 }}>
              Dibuka {timeLabel}
            </Text>
          </>
        )}
      </View>

      {/* Unread Badge */}
      {isChatReady && unreadCount > 0 && (
        <View
          style={{
            backgroundColor: COLORS.error,
            borderRadius: 10,
            minWidth: 20,
            height: 20,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 6,
            marginRight: 8,
          }}
        >
          <Text style={{ ...TYPOGRAPHY.overline, fontWeight: '700', color: COLORS.white }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}

      {/* Chevron */}
      <MaterialCommunityIcons
        name="chevron-right"
        size={20}
        color={isChatReady ? COLORS.success : COLORS.border}
      />
    </TouchableOpacity>
  );
};

export default AppointmentChatBanner;
