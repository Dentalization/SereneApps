import React from 'react';
import { View, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as THEME_COLORS, withOpacity } from '../../../theme/colors';
import { typography as TYPOGRAPHY } from '../../../theme/dimensions';
import { formatCurrency } from '../../../utils/formatters';

const COLORS = THEME_COLORS;

const CancelSuccessScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const { appointment, cancellationFee } = route.params || {};

  const dentistName = appointment?.dentist?.name || 'Dokter Gigi';
  const dentistSpecialty = appointment?.dentist?.specialty || appointment?.dentist?.specialization || 'Dokter Gigi Umum';

  const appointmentDate = appointment?.startsAt
    ? new Date(appointment.startsAt).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    : '';

  const appointmentTime = appointment?.startsAt
    ? `${new Date(appointment.startsAt).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    })} WIB`
    : '';

  const refundAmount = appointment?.fee ? Math.max(0, appointment.fee - (cancellationFee || 0)) : 0;

  const handleGoHome = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'AppointmentList' }],
      })
    );
  };

  const handleSearchDoctor = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          { name: 'AppointmentList' },
          { name: 'ClinicSearch' }
        ],
      })
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: 24,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Warning/Cancel Visual Icon */}
        <View style={{ marginBottom: 24 }}>
          <LinearGradient
            colors={[COLORS.error, withOpacity(COLORS.error, 0.8)]}
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: COLORS.error,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.2,
              shadowRadius: 16,
              elevation: 8,
            }}
          >
            <MaterialCommunityIcons name="calendar-remove" size={48} color={COLORS.surfaceElevated} />
          </LinearGradient>
        </View>

        {/* Title & Desc */}
        <Text style={{ ...TYPOGRAPHY.h1, color: COLORS.textPrimary, textAlign: 'center' }}>
          Jadwal Dibatalkan
        </Text>
        <Text style={{ color: COLORS.textSecondary, ...TYPOGRAPHY.bodySmall, marginTop: 8, textAlign: 'center', lineHeight: 22, paddingHorizontal: 10 }}>
          Janji temu Anda telah berhasil dibatalkan. Rincian pengembalian dana dapat dilihat di bawah.
        </Text>

        {/* Details Card */}
        <View style={{
          width: '100%',
          backgroundColor: COLORS.surfaceElevated,
          borderRadius: 24,
          padding: 20,
          marginTop: 28,
          marginBottom: 20,
          shadowColor: COLORS.textPrimary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.05,
          shadowRadius: 12,
          elevation: 3,
          borderWidth: 1,
          borderColor: COLORS.border,
        }}>
          <Text style={{ ...TYPOGRAPHY.h4, color: COLORS.textPrimary, marginBottom: 16 }}>
            Rincian Janji Temu
          </Text>

          {/* Dentist Info */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: withOpacity(COLORS.primary, 0.1), alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <MaterialCommunityIcons name="doctor" size={22} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...TYPOGRAPHY.h5, color: COLORS.textPrimary }}>{dentistName}</Text>
              <Text style={{ color: COLORS.textSecondary, ...TYPOGRAPHY.caption }}>{dentistSpecialty}</Text>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: COLORS.border, marginBottom: 16 }} />

          {/* DateTime */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary }}>Waktu Janji</Text>
            <Text style={{ ...TYPOGRAPHY.bodySmall, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'right' }}>
              {appointmentDate}{'\n'}{appointmentTime}
            </Text>
          </View>

          {/* Consultation Fee */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary }}>Biaya Konsultasi</Text>
            <Text style={{ ...TYPOGRAPHY.bodySmall, fontWeight: '700', color: COLORS.textPrimary }}>
              {formatCurrency(appointment?.fee || 0)}
            </Text>
          </View>

          {/* Cancellation Fee */}
          {cancellationFee > 0 && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.error }}>Biaya Administrasi (Pembatalan)</Text>
              <Text style={{ ...TYPOGRAPHY.bodySmall, fontWeight: '700', color: COLORS.error }}>
                - {formatCurrency(cancellationFee)}
              </Text>
            </View>
          )}

          <View style={{ height: 1, backgroundColor: COLORS.border, marginVertical: 14 }} />

          {/* Total Refund */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ ...TYPOGRAPHY.body, color: COLORS.textPrimary, fontWeight: '800' }}>Dana Dikembalikan</Text>
            <Text style={{ ...TYPOGRAPHY.h2, color: COLORS.success }}>
              {formatCurrency(refundAmount)}
            </Text>
          </View>
        </View>

        {/* Refund Timeline Banner */}
        <View style={{
          flexDirection: 'row',
          backgroundColor: withOpacity(COLORS.warning, 0.08),
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: withOpacity(COLORS.warning, 0.2),
          alignItems: 'flex-start',
          width: '100%',
        }}>
          <MaterialCommunityIcons name="wallet-giftcard" size={20} color={COLORS.warning} style={{ marginTop: 2 }} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ ...TYPOGRAPHY.h5, color: COLORS.warning, marginBottom: 4 }}>Informasi Refund</Text>
            <Text style={{ color: COLORS.textSecondary, ...TYPOGRAPHY.caption, lineHeight: 18 }}>
              Proses pengembalian dana (refund) akan dilakukan otomatis melalui metode pembayaran asal Anda dalam waktu 3-5 hari kerja.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons Bar */}
      <View style={{
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
        flexDirection: 'row',
      }}>
        <Button
          mode="outlined"
          icon="home"
          onPress={handleGoHome}
          style={{ flex: 1, marginRight: 8, borderRadius: 16, borderColor: COLORS.border }}
          textColor={COLORS.textPrimary}
          contentStyle={{ paddingVertical: 6 }}
        >
          Beranda
        </Button>
        <Button
          mode="contained"
          icon="calendar-plus"
          onPress={handleSearchDoctor}
          style={{ flex: 1.2, marginLeft: 8, borderRadius: 16 }}
          buttonColor={COLORS.primary}
          contentStyle={{ paddingVertical: 6 }}
          labelStyle={{ fontWeight: '700' }}
        >
          Cari Dokter Lagi
        </Button>
      </View>
    </View>
  );
};

export default CancelSuccessScreen;
