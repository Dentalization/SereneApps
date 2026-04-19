import React, { useEffect, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, StatusBar, Animated } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatCurrency } from '../../../utils/formatters';

import { colors as THEME_COLORS, withOpacity } from '../../../theme/colors';
import { typography as TYPOGRAPHY } from '../../../theme/dimensions';

const COLORS = THEME_COLORS;

const ERROR_MESSAGES = {
  payment_failed: {
    title: 'Pembayaran Gagal',
    description: 'Transaksi pembayaran tidak dapat diproses. Silakan coba lagi atau gunakan metode pembayaran lain.',
    icon: 'credit-card-off',
  },
  slot_unavailable: {
    title: 'Jadwal Tidak Tersedia',
    description: 'Maaf, jadwal yang Anda pilih sudah tidak tersedia. Silakan pilih jadwal lain.',
    icon: 'calendar-remove',
  },
  network_error: {
    title: 'Koneksi Terputus',
    description: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda dan coba lagi.',
    icon: 'wifi-off',
  },
  timeout: {
    title: 'Waktu Habis',
    description: 'Proses booking memakan waktu terlalu lama. Silakan coba lagi.',
    icon: 'timer-off',
  },
  server_error: {
    title: 'Terjadi Kesalahan',
    description: 'Server sedang mengalami gangguan. Silakan coba beberapa saat lagi.',
    icon: 'server-off',
  },
  default: {
    title: 'Booking Gagal',
    description: 'Terjadi kesalahan saat memproses booking Anda. Silakan coba lagi.',
    icon: 'alert-circle',
  },
};

const BookingFailedScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  // Animation refs
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Data from PaymentScreen
  const dentist = route.params?.dentist;
  const slot = route.params?.slot;
  const selectedDate = route.params?.date;
  const type = route.params?.type || 'onsite';
  const fee = route.params?.fee || 0;
  const errorType = route.params?.errorType || 'default';
  const errorCode = route.params?.errorCode;
  const errorMessage = route.params?.errorMessage;

  const errorInfo = ERROR_MESSAGES[errorType] || ERROR_MESSAGES.default;

  const summaryDate = selectedDate ? new Date(selectedDate) : new Date();
  const dateLabel = summaryDate.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const slotTime = slot?.time || summaryDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  useEffect(() => {
    // Start animations
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
      // Shake animation for error emphasis
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const handleRetry = () => {
    // Go back to payment screen to retry
    navigation.goBack();
  };

  const handleChangeSlot = () => {
    // Go back to slot selection
    navigation.navigate('BookingSlot', {
      dentistId: dentist?.id,
      dentist,
    });
  };

  const handleContactSupport = () => {
    // TODO: Implement support contact
    console.log('Contact support');
  };

  const handleGoHome = () => {
    navigation.navigate('AppointmentList');
  };

  return (
    <View style={{ flex: 1, backgroundColor: withOpacity(COLORS.error, 0.05) }}>
      <StatusBar barStyle="dark-content" backgroundColor={withOpacity(COLORS.error, 0.05)} />

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Error Icon */}
        <Animated.View
          style={{
            alignItems: 'center',
            marginBottom: 24,
            transform: [
              { scale: scaleAnim },
              { translateX: shakeAnim },
            ],
          }}
        >
          <LinearGradient
            colors={[COLORS.error, withOpacity(COLORS.error, 0.8)]}
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: COLORS.error,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
              elevation: 8,
            }}
          >
            <MaterialCommunityIcons name={errorInfo.icon} size={50} color={COLORS.surfaceElevated} />
          </LinearGradient>
        </Animated.View>

        {/* Error Message */}
        <Animated.View
          style={{
            alignItems: 'center',
            marginBottom: 32,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <Text style={{ ...TYPOGRAPHY.h1, color: COLORS.textPrimary, textAlign: 'center' }}>
            {errorInfo.title}
          </Text>
          <Text style={{ color: COLORS.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 }}>
            {errorMessage || errorInfo.description}
          </Text>
          {errorCode && (
            <View
              style={{
                marginTop: 12,
                backgroundColor: withOpacity(COLORS.error, 0.1),
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: COLORS.error, fontSize: 12, fontFamily: 'monospace' }}>
                Kode Error: {errorCode}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Booking Details Card (what was attempted) */}
        {dentist && (
          <Animated.View
            style={{
              backgroundColor: COLORS.white,
              borderRadius: 24,
              padding: 20,
              marginBottom: 20,
              shadowColor: COLORS.textPrimary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.06,
              shadowRadius: 12,
              elevation: 3,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              borderWidth: 1,
              borderColor: withOpacity(COLORS.error, 0.15),
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <MaterialCommunityIcons name="calendar-clock" size={18} color={COLORS.textMuted} />
              <Text style={{ marginLeft: 8, ...TYPOGRAPHY.bodySmall, fontWeight: '600', color: COLORS.textSecondary }}>
                Detail Booking yang Gagal
              </Text>
            </View>

            {/* Dentist Info */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 16,
                  backgroundColor: withOpacity(COLORS.error, 0.1),
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <MaterialCommunityIcons name="doctor" size={24} color={COLORS.error} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...TYPOGRAPHY.h5, color: COLORS.textPrimary }}>
                  {dentist?.name}
                </Text>
                <Text style={{ color: COLORS.textSecondary, ...TYPOGRAPHY.caption }}>{dentist?.specialty}</Text>
              </View>
            </View>

            {/* Details */}
            <View style={{ borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 }}>
              <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                <MaterialCommunityIcons name="calendar" size={16} color={COLORS.textMuted} />
                <Text style={{ marginLeft: 8, ...TYPOGRAPHY.caption, color: COLORS.textSecondary, flex: 1 }}>{dateLabel}</Text>
              </View>
              <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                <MaterialCommunityIcons name="clock-outline" size={16} color={COLORS.textMuted} />
                <Text style={{ marginLeft: 8, ...TYPOGRAPHY.caption, color: COLORS.textSecondary, flex: 1 }}>{slotTime} WIB</Text>
              </View>
              {fee > 0 && (
                <View style={{ flexDirection: 'row' }}>
                  <MaterialCommunityIcons name="cash" size={16} color={COLORS.textMuted} />
                  <Text style={{ marginLeft: 8, ...TYPOGRAPHY.caption, color: COLORS.textSecondary, flex: 1 }}>{formatCurrency(fee)}</Text>
                </View>
              )}
            </View>
          </Animated.View>
        )}

        {/* Troubleshooting Tips */}
        <Animated.View
          style={{
            backgroundColor: withOpacity(COLORS.warning, 0.1),
            borderRadius: 16,
            padding: 16,
            marginBottom: 20,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <MaterialCommunityIcons name="lightbulb-outline" size={20} color={COLORS.warning} />
            <Text style={{ marginLeft: 8, ...TYPOGRAPHY.h5, color: COLORS.warning }}>
              Yang Bisa Anda Coba
            </Text>
          </View>
          <Text style={{ color: COLORS.warning, ...TYPOGRAPHY.caption, lineHeight: 22 }}>
            • Periksa koneksi internet Anda{'\n'}
            • Pastikan saldo/limit kartu mencukupi{'\n'}
            • Coba metode pembayaran lain{'\n'}
            • Pilih jadwal yang berbeda
          </Text>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* Primary: Retry */}
          <Button
            mode="contained"
            icon="refresh"
            onPress={handleRetry}
            style={{ marginBottom: 12, borderRadius: 16 }}
            contentStyle={{ paddingVertical: 6 }}
            labelStyle={{ fontWeight: '700', fontSize: 16 }}
          >
            Coba Lagi
          </Button>

          {/* Secondary: Change Slot */}
          <Button
            mode="outlined"
            icon="calendar-edit"
            onPress={handleChangeSlot}
            style={{ marginBottom: 12, borderRadius: 16, borderColor: COLORS.border }}
            contentStyle={{ paddingVertical: 6 }}
            labelStyle={{ ...TYPOGRAPHY.bodyLarge, fontWeight: '600', color: COLORS.textSecondary }}
          >
            Pilih Jadwal Lain
          </Button>

          {/* Tertiary actions */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8 }}>
            <TouchableOpacity
              onPress={handleContactSupport}
              style={{ paddingHorizontal: 16, paddingVertical: 8 }}
            >
              <Text style={{ color: COLORS.primary, fontWeight: '600' }}>Hubungi Bantuan</Text>
            </TouchableOpacity>
            <Text style={{ color: COLORS.border, alignSelf: 'center' }}>|</Text>
            <TouchableOpacity
              onPress={handleGoHome}
              style={{ paddingHorizontal: 16, paddingVertical: 8 }}
            >
              <Text style={{ color: COLORS.textSecondary, fontWeight: '600' }}>Kembali ke Beranda</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Bottom Help Banner */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: 16,
          paddingBottom: insets.bottom + 16,
          backgroundColor: COLORS.surfaceElevated,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
        }}
      >
        <TouchableOpacity
          onPress={handleContactSupport}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: COLORS.surface,
            paddingVertical: 12,
            borderRadius: 12,
          }}
        >
          <MaterialCommunityIcons name="headphones" size={20} color={COLORS.textSecondary} />
          <Text style={{ marginLeft: 8, color: COLORS.textSecondary, fontWeight: '500' }}>
            Butuh bantuan? Hubungi Customer Service
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textMuted} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default BookingFailedScreen;
