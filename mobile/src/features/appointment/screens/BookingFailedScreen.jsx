import React, { useEffect, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, StatusBar, Animated } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatCurrency } from '../../../utils/formatters';

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
    <View style={{ flex: 1, backgroundColor: '#FEF2F2' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FEF2F2" />

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
            colors={['#EF4444', '#DC2626']}
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#EF4444',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
              elevation: 8,
            }}
          >
            <MaterialCommunityIcons name={errorInfo.icon} size={50} color="white" />
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
          <Text style={{ fontSize: 26, fontWeight: '700', color: '#0F172A', textAlign: 'center' }}>
            {errorInfo.title}
          </Text>
          <Text style={{ color: '#64748B', marginTop: 8, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 }}>
            {errorMessage || errorInfo.description}
          </Text>
          {errorCode && (
            <View
              style={{
                marginTop: 12,
                backgroundColor: '#FEE2E2',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: '#991B1B', fontSize: 12, fontFamily: 'monospace' }}>
                Kode Error: {errorCode}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Booking Details Card (what was attempted) */}
        {dentist && (
          <Animated.View
            style={{
              backgroundColor: 'white',
              borderRadius: 24,
              padding: 20,
              marginBottom: 20,
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.06,
              shadowRadius: 12,
              elevation: 3,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              borderWidth: 1,
              borderColor: '#FEE2E2',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <MaterialCommunityIcons name="calendar-clock" size={18} color="#94A3B8" />
              <Text style={{ marginLeft: 8, fontSize: 14, fontWeight: '600', color: '#64748B' }}>
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
                  backgroundColor: '#FEE2E2',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <MaterialCommunityIcons name="doctor" size={24} color="#EF4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#0F172A' }}>
                  {dentist?.name}
                </Text>
                <Text style={{ color: '#64748B', fontSize: 13 }}>{dentist?.specialty}</Text>
              </View>
            </View>

            {/* Details */}
            <View style={{ borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 }}>
              <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                <MaterialCommunityIcons name="calendar" size={16} color="#94A3B8" />
                <Text style={{ marginLeft: 8, color: '#64748B', flex: 1 }}>{dateLabel}</Text>
              </View>
              <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                <MaterialCommunityIcons name="clock-outline" size={16} color="#94A3B8" />
                <Text style={{ marginLeft: 8, color: '#64748B', flex: 1 }}>{slotTime} WIB</Text>
              </View>
              {fee > 0 && (
                <View style={{ flexDirection: 'row' }}>
                  <MaterialCommunityIcons name="cash" size={16} color="#94A3B8" />
                  <Text style={{ marginLeft: 8, color: '#64748B', flex: 1 }}>{formatCurrency(fee)}</Text>
                </View>
              )}
            </View>
          </Animated.View>
        )}

        {/* Troubleshooting Tips */}
        <Animated.View
          style={{
            backgroundColor: '#FFFBEB',
            borderRadius: 16,
            padding: 16,
            marginBottom: 20,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <MaterialCommunityIcons name="lightbulb-outline" size={20} color="#D97706" />
            <Text style={{ marginLeft: 8, fontWeight: '600', color: '#92400E' }}>
              Yang Bisa Anda Coba
            </Text>
          </View>
          <Text style={{ color: '#A16207', fontSize: 13, lineHeight: 22 }}>
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
            style={{ marginBottom: 12, borderRadius: 16, borderColor: '#E2E8F0' }}
            contentStyle={{ paddingVertical: 6 }}
            labelStyle={{ fontWeight: '600', color: '#475569' }}
          >
            Pilih Jadwal Lain
          </Button>

          {/* Tertiary actions */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8 }}>
            <TouchableOpacity
              onPress={handleContactSupport}
              style={{ paddingHorizontal: 16, paddingVertical: 8 }}
            >
              <Text style={{ color: '#7C3AED', fontWeight: '600' }}>Hubungi Bantuan</Text>
            </TouchableOpacity>
            <Text style={{ color: '#CBD5E1', alignSelf: 'center' }}>|</Text>
            <TouchableOpacity
              onPress={handleGoHome}
              style={{ paddingHorizontal: 16, paddingVertical: 8 }}
            >
              <Text style={{ color: '#64748B', fontWeight: '600' }}>Kembali ke Beranda</Text>
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
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#F1F5F9',
        }}
      >
        <TouchableOpacity
          onPress={handleContactSupport}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#F8FAFC',
            paddingVertical: 12,
            borderRadius: 12,
          }}
        >
          <MaterialCommunityIcons name="headphones" size={20} color="#64748B" />
          <Text style={{ marginLeft: 8, color: '#475569', fontWeight: '500' }}>
            Butuh bantuan? Hubungi Customer Service
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#94A3B8" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default BookingFailedScreen;
