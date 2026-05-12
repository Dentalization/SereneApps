import React, { useEffect, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, StatusBar, Animated, Share } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as THEME_COLORS, withOpacity } from '../../../theme/colors';
import { typography as TYPOGRAPHY } from '../../../theme/dimensions';
import { formatCurrency } from '../../../utils/formatters';

const COLORS = THEME_COLORS;

const BookingSuccessScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  // Animation refs
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Data from PaymentScreen
  const dentist = route.params?.dentist;
  const slot = route.params?.slot;
  const selectedDate = route.params?.date;
  const type = route.params?.type || 'onsite';
  const notes = route.params?.notes || '';
  const reminder = route.params?.reminder || 30;
  const fee = route.params?.fee || 0;
  const paymentMethod = route.params?.paymentMethod;
  const bookingId = route.params?.bookingId || `SRN-${Date.now()}`;

  const summaryDate = new Date(selectedDate);
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

  const handleGoToAppointments = () => {
    // Reset navigation stack and go to AppointmentList
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'AppointmentList' }],
      })
    );
  };

  const handleAddToCalendar = () => {
    // TODO: Full implementation with expo-calendar
    const { Alert } = require('react-native');
    Alert.alert(
      'Tambah ke Kalender',
      `Janji temu dengan ${dentist?.name}\n${dateLabel}, ${slotTime} WIB\n\nFitur ini akan segera tersedia.`,
      [{ text: 'OK' }]
    );
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Janji temu saya dengan ${dentist?.name} di Serene Apps\n\n📅 ${dateLabel}\n⏰ ${slotTime} WIB\n📍 ${type === 'virtual' ? 'Konsultasi Virtual' : 'Kunjungan Tatap Muka'}\n\nKode Booking: ${bookingId}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Icon */}
        <Animated.View
          style={{
            alignItems: 'center',
            marginBottom: 24,
            transform: [{ scale: scaleAnim }],
          }}
        >
          <LinearGradient
            colors={[COLORS.success, withOpacity(COLORS.success, 0.8)]}
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: COLORS.success,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
              elevation: 8,
            }}
          >
            <MaterialCommunityIcons name="check" size={50} color={COLORS.surfaceElevated} />
          </LinearGradient>
        </Animated.View>

        {/* Success Message */}
        <Animated.View
          style={{
            alignItems: 'center',
            marginBottom: 32,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <Text style={{ ...TYPOGRAPHY.h1, color: COLORS.textPrimary, textAlign: 'center' }}>
            Booking Berhasil! 🎉
          </Text>
          <Text style={{ color: COLORS.textSecondary, ...TYPOGRAPHY.bodySmall, marginTop: 8, textAlign: 'center', lineHeight: 22 }}>
            Janji temu Anda telah dikonfirmasi.{'\n'}Detail telah dikirim ke email Anda.
          </Text>
        </Animated.View>

        {/* Booking ID Card */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 24,
              padding: 20,
              marginBottom: 20,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: withOpacity(COLORS.white, 0.7), ...TYPOGRAPHY.caption, marginBottom: 4 }}>
              KODE BOOKING
            </Text>
            <Text style={{ color: COLORS.surfaceElevated, ...TYPOGRAPHY.h1, fontWeight: '700', letterSpacing: 2 }}>
              {bookingId}
            </Text>
            <Text style={{ color: withOpacity(COLORS.white, 0.8), ...TYPOGRAPHY.caption, marginTop: 8 }}>
              Tunjukkan kode ini saat kedatangan
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* Appointment Details Card */}
        <Animated.View
          style={{
            backgroundColor: COLORS.surfaceElevated,
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
          }}
        >
          <Text style={{ ...TYPOGRAPHY.h4, color: COLORS.textPrimary, marginBottom: 16 }}>
            Detail Janji Temu
          </Text>

          {/* Dentist Info */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 18,
                backgroundColor: withOpacity(COLORS.primary, 0.1),
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 14,
              }}
            >
              <MaterialCommunityIcons name="doctor" size={28} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...TYPOGRAPHY.h5, color: COLORS.textPrimary }}>
                {dentist?.name}
              </Text>
              <Text style={{ color: COLORS.textSecondary, marginTop: 2, ...TYPOGRAPHY.bodySmall }}>{dentist?.specialty}</Text>
              {dentist?.clinic?.name && (
                <Text style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 2 }}>
                  {dentist.clinic.name}
                </Text>
              )}
            </View>
          </View>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: COLORS.border, marginBottom: 16 }} />

          {/* Details Grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <DetailItem
              icon="calendar"
              label="Tanggal"
              value={dateLabel}
            />
            <DetailItem
              icon="clock-outline"
              label="Waktu"
              value={`${slotTime} WIB`}
            />
            <DetailItem
              icon={type === 'virtual' ? 'video' : 'map-marker'}
              label="Tipe"
              value={type === 'virtual' ? 'Virtual' : 'Tatap Muka'}
            />
            <DetailItem
              icon="bell-ring-outline"
              label="Pengingat"
              value={`${reminder} menit sebelum`}
            />
          </View>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: COLORS.border, marginVertical: 16 }} />

          {/* Total Paid */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ ...TYPOGRAPHY.body, color: COLORS.textSecondary }}>Total Dibayar</Text>
            <Text style={{ ...TYPOGRAPHY.h2, color: COLORS.success }}>
              {formatCurrency(fee)}
            </Text>
          </View>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View
          style={{
            flexDirection: 'row',
            marginBottom: 20,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <TouchableOpacity
            onPress={handleAddToCalendar}
            accessibilityLabel="Tambah ke Kalender"
            accessibilityRole="button"
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: COLORS.surfaceElevated,
              paddingVertical: 14,
              borderRadius: 16,
              marginRight: 10,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <MaterialCommunityIcons name="calendar-plus" size={20} color={COLORS.primary} />
            <Text style={{ marginLeft: 8, fontWeight: '600', color: COLORS.primary }}>
              Tambah ke Kalender
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleShare}
            accessibilityLabel="Bagikan Kode Booking"
            accessibilityRole="button"
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              backgroundColor: COLORS.surfaceElevated,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <MaterialCommunityIcons name="share-variant" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </Animated.View>

        {/* Tips Card */}
        <Animated.View
          style={{
            backgroundColor: withOpacity(COLORS.warning, 0.15),
            borderRadius: 16,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'flex-start',
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <MaterialCommunityIcons name="lightbulb-outline" size={20} color={COLORS.warning} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ ...TYPOGRAPHY.h5, color: COLORS.warning, marginBottom: 4 }}>
              Tips Sebelum Kunjungan
            </Text>
            <Text style={{ color: COLORS.warning, ...TYPOGRAPHY.caption, lineHeight: 20 }}>
              • Datang 15 menit lebih awal{'\n'}
              • Bawa KTP dan kartu BPJS (jika ada){'\n'}
              • Siapkan riwayat kesehatan gigi
            </Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Bottom Button */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: 20,
          paddingBottom: insets.bottom + 20,
          backgroundColor: COLORS.white,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          shadowColor: COLORS.textPrimary,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 10,
        }}
      >
        <Button
          mode="contained"
          icon="calendar-check"
          onPress={handleGoToAppointments}
          buttonColor={COLORS.primary}
          style={{ borderRadius: 16 }}
          contentStyle={{ paddingVertical: 6 }}
          labelStyle={{ ...TYPOGRAPHY.bodyLarge, fontWeight: '700' }}
          accessibilityLabel="Lihat Janji Temu Saya"
        >
          Lihat Janji Temu Saya
        </Button>
      </View>
    </View>
  );
};

const DetailItem = ({ icon, label, value }) => (
  <View style={{ width: '50%', marginBottom: 14 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
      <MaterialCommunityIcons name={icon} size={14} color={COLORS.textMuted} />
      <Text style={{ marginLeft: 6, fontSize: 12, color: COLORS.textMuted }}>{label}</Text>
    </View>
    <Text style={{ fontWeight: '600', color: COLORS.textPrimary, marginLeft: 20 }}>{value}</Text>
  </View>
);

export default BookingSuccessScreen;
