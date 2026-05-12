import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { Text, Button, Chip, TextInput, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { formatCurrency } from '../../../utils/formatters';
import useAnchoredHeaderHeight from '../../../hooks/useAnchoredHeaderHeight';
import { getAppointmentById, getDentistById, REMINDER_MINUTES } from '../data/appointments';
import { createAppointment } from '../../../services/appointmentService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as THEME_COLORS, withOpacity } from '../../../theme/colors';
import { typography as TYPOGRAPHY } from '../../../theme/dimensions';

const COLORS = THEME_COLORS;

import useToast from '../../../hooks/useToast';

const BookingConfirmScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();

  const appointmentFromList = route.params?.appointmentId ? getAppointmentById(route.params.appointmentId) : null;
  const dentist = route.params?.dentist || appointmentFromList?.dentist || getDentistById('dentist-001');
  const selectedDate = route.params?.date || appointmentFromList?.startsAt;
  const type = route.params?.type || appointmentFromList?.type || 'onsite';
  const service = route.params?.service || null;
  const slot = route.params?.slot || appointmentFromList?.slot;
  const slotTime = slot?.time || new Date(selectedDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const fee = (service?.price != null ? service.price : null)
    ?? slot?.raw?.fee
    ?? appointmentFromList?.billing?.fee
    ?? dentist?.consultationFee
    ?? 350000;

  const [notes, setNotes] = useState('');
  const [reminder, setReminder] = useState(30);
  const [payment, setPayment] = useState('card');
  const [isCreating, setIsCreating] = useState(false);
  const isReschedule = route.params?.isReschedule === true;
  const originalAppointmentId = route.params?.originalAppointmentId || null;
  const routeMetadata = route.params?.metadata || {};
  const { toast, showToast, hideToast } = useToast();

  const summaryDate = new Date(selectedDate);
  const dateLabel = summaryDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });

  const handleConfirm = async () => {
    setIsCreating(true);
    try {
      // BUG-003: Create appointment via API before navigating to payment
      const result = await createAppointment({
        dentistId: dentist?.id,
        clinicBranchId: dentist?.clinicContext?.branchId,
        startsAt: slot?.raw?.startsAt || `${selectedDate}T${slot?.time || '09:00'}:00`,
        endsAt: slot?.raw?.endsAt,
        appointmentType: type,
        serviceId: service?.id,
        reason: notes || undefined,
        reminderMinutes: reminder,
        isReschedule,
        originalAppointmentId,
        metadata: {
          ...routeMetadata,
          reminderMinutes: reminder,
          source: routeMetadata.rebookingFromAppointmentId ? 'smart_rebooking' : 'standard_booking',
        },
      });

      const appointmentId = result?.data?.id || result?.id;
      if (!appointmentId) throw new Error('Failed to create appointment');

      navigation.navigate('Payment', {
        appointmentId,
        dentist,
        slot,
        date: selectedDate,
        type,
        service,
        notes,
        reminder,
        fee,
        paymentMethod: payment,
        isReschedule,
        originalAppointmentId,
      });
    } catch (error) {
      showToast(error?.message || 'Gagal membuat janji temu. Silakan coba lagi.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const { headerHeight, handleHeaderLayout } = useAnchoredHeaderHeight(240);
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <StatusBar barStyle='light-content' backgroundColor="transparent" translucent />

      <View
        onLayout={handleHeaderLayout}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, elevation: 10 }}
      >
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingTop: insets.top + 10, paddingHorizontal: 20, paddingBottom: 32, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              accessibilityLabel="Kembali"
              accessibilityRole="button"
              style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: withOpacity(COLORS.white, 0.2), alignItems: 'center', justifyContent: 'center' }}
            >
              <MaterialCommunityIcons name='arrow-left' size={22} color={COLORS.surfaceElevated} />
            </TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: withOpacity(COLORS.white, 0.7), ...TYPOGRAPHY.caption }}>Langkah 2/3</Text>
              <Text style={{ color: COLORS.surfaceElevated, ...TYPOGRAPHY.h3, marginTop: 4 }}>
                {isReschedule ? 'Ubah Jadwal' : 'Konfirmasi jadwal'}
              </Text>
            </View>
            {/* Show clinic info button only if dentist has a clinic (not independent) */}
            {(dentist?.clinicContext?.branchId || dentist?.clinicContext?.profileId || dentist?.clinic?.id) ? (
              <TouchableOpacity
                onPress={() => {
                  const targetClinicId = dentist?.clinicContext?.branchId || dentist?.clinicContext?.profileId || dentist?.clinic?.id;
                  if (targetClinicId) {
                    navigation.navigate('ClinicDetail', {
                      clinicId: targetClinicId,
                      clinic: {
                        id: targetClinicId,
                        name: dentist?.clinicContext?.name || dentist?.clinic?.name,
                        address: dentist?.clinicContext?.address || dentist?.clinic?.address,
                      },
                    });
                  }
                }}
                accessibilityLabel="Detail Klinik"
                accessibilityRole="button"
                style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: withOpacity(COLORS.white, 0.2), alignItems: 'center', justifyContent: 'center' }}
              >
                <MaterialCommunityIcons name='information-outline' size={22} color={COLORS.surfaceElevated} />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 48 }} />
            )}
          </View>
          <View style={{ marginTop: 20 }}>
            <Text style={{ color: withOpacity(COLORS.white, 0.8) }}>Periksa kembali detail pemesanan sebelum konfirmasi.</Text>
            <View style={{ marginTop: 20 }}>
              <ProgressIndicator current={2} />
            </View>
          </View>
        </LinearGradient>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingTop: headerHeight + 16, paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
          <Text style={{ ...TYPOGRAPHY.h2, color: COLORS.textPrimary }}>Konfirmasi janji</Text>
          <Text style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, marginBottom: 20 }}>
            Periksa kembali detail sebelum kamu menyelesaikan pemesanan.
          </Text>

          <SummaryCard
            dentist={dentist}
            type={type}
            dateLabel={dateLabel}
            timeLabel={slotTime}
            clinic={dentist?.clinic}
          />

          <Section title='Catatan untuk dokter'>
            <TextInput
              mode='outlined'
              placeholder='Tambahkan detail keluhan, alergi, dll'
              value={notes}
              onChangeText={setNotes}
              multiline
              outlineColor={COLORS.border}
              activeOutlineColor={COLORS.primary}
              style={{ backgroundColor: COLORS.surfaceElevated }}
            />
          </Section>

          <Section title='Pengingat'>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {REMINDER_MINUTES.map((value) => (
                <Chip
                  key={value}
                  selected={reminder === value}
                  onPress={() => setReminder(value)}
                  style={{ marginRight: 8, marginBottom: 8, backgroundColor: reminder === value ? COLORS.primary : COLORS.border }}
                  textStyle={{ color: reminder === value ? COLORS.surfaceElevated : COLORS.textSecondary }}
                >
                  {value} menit sebelumnya
                </Chip>
              ))}
            </View>
          </Section>

          <Section title='Metode pembayaran'>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {[
                { key: 'card', label: 'Kartu' },
                { key: 'va', label: 'Virtual Account (VA)' },
                { key: 'cash', label: dentist?.dentistType === 'independent' ? 'Bayar langsung' : 'Bayar di klinik' },
              ].map((option) => (
                <Chip
                  key={option.key}
                  selected={payment === option.key}
                  onPress={() => setPayment(option.key)}
                  style={{ marginRight: 8, marginBottom: 8, backgroundColor: payment === option.key ? COLORS.primary : COLORS.border }}
                  textStyle={{ color: payment === option.key ? COLORS.surfaceElevated : COLORS.textSecondary }}
                >
                  {option.label}
                </Chip>
              ))}
            </View>
          </Section>

          {/* DIBUNGKUS DENGAN SECTION BARU AGAR RAPI DAN MEMPERBAIKI SYNTAX ERROR SEBELUMNYA */}
          {/* Cost Summary */}
          <Section title='Ringkasan Biaya'>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: COLORS.textSecondary, ...TYPOGRAPHY.bodyLarge }}>Total dibayar</Text>
              <Text style={{ ...TYPOGRAPHY.h2, color: COLORS.primary }}>{formatCurrency(fee)}</Text>
            </View>
          </Section>

          {/* Cancellation Policy */}
          <View style={{
            backgroundColor: withOpacity(COLORS.warning, 0.1),
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: withOpacity(COLORS.warning, 0.2),
            flexDirection: 'row',
            marginBottom: 24
          }}>
            <MaterialCommunityIcons name="information" size={20} color={COLORS.warning} style={{ marginTop: 2 }} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ ...TYPOGRAPHY.h5, color: COLORS.warning, marginBottom: 4 }}>Kebijakan Pembatalan</Text>
              <Text style={{ ...TYPOGRAPHY.caption, color: withOpacity(COLORS.warning, 0.8), lineHeight: 18 }}>
                Pembatalan kurang dari 24 jam sebelum jadwal akan dikenakan biaya administrasi 50%. Dana akan dikembalikan melalui metode pembayaran asal.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 20, backgroundColor: COLORS.surfaceElevated, borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: COLORS.textPrimary, shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 10 }}>
        <Button
          mode='contained'
          icon='arrow-right'
          onPress={handleConfirm}
          loading={isCreating}
          disabled={isCreating}
          buttonColor={COLORS.primary}
          contentStyle={{ paddingVertical: 6 }}
          labelStyle={{ ...TYPOGRAPHY.bodyLarge, fontWeight: '700' }}
          accessibilityLabel={isReschedule ? 'Ubah Jadwal' : 'Lanjut ke Pembayaran'}
        >
          {isCreating ? 'Membuat janji...' : isReschedule ? 'Ubah Jadwal' : 'Lanjut ke Pembayaran'}
        </Button>
      </View>
    </View>
  );
};

const ProgressIndicator = ({ current }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
    {['Pilih slot', 'Konfirmasi', 'Bayar'].map((label, index) => {
      const step = index + 1;
      const active = step <= current;
      const completed = step < current;
      return (
        <View key={label} style={{ alignItems: 'center', flex: 1 }}>
          <LinearGradient
            colors={active ? [COLORS.warning, withOpacity(COLORS.warning, 0.8)] : [withOpacity(COLORS.primary, 0.1), withOpacity(COLORS.primary, 0.05)]}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {completed ? (
              <MaterialCommunityIcons name="check" size={18} color={COLORS.surfaceElevated} />
            ) : (
              <Text style={{ color: active ? COLORS.textPrimary : COLORS.textMuted, fontWeight: '700' }}>{step}</Text>
            )}
          </LinearGradient>
          <Text style={{ marginTop: 6, ...TYPOGRAPHY.caption, color: active ? COLORS.white : withOpacity(COLORS.white, 0.7) }}>{label}</Text>
        </View>
      );
    })}
  </View>
);

const SummaryCard = ({ dentist, clinic, type, dateLabel, timeLabel }) => {
  const isIndependent = dentist?.dentistType === 'independent' || !dentist?.clinicContext?.profileId;
  const locationName = clinic?.name ||
    dentist?.clinicContext?.name ||
    dentist?.clinicName ||
    (isIndependent ? 'Praktik Mandiri' : 'Lokasi belum ditentukan');

  return (
    <LinearGradient
      colors={[withOpacity(COLORS.primary, 0.05), COLORS.surfaceElevated]}
      style={{ borderRadius: 24, padding: 18, marginBottom: 22, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 4 }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
        <View>
          <Text style={{ ...TYPOGRAPHY.h5, color: COLORS.textPrimary }}>{dateLabel}</Text>
          <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 2 }}>{timeLabel} WIB</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textMuted }}>{type === 'virtual' ? 'Virtual visit' : 'Tatap muka'}</Text>
          <Text style={{ ...TYPOGRAPHY.h5, color: COLORS.textPrimary, marginTop: 4 }}>{locationName}</Text>
          {isIndependent && (
            <Text style={{ ...TYPOGRAPHY.overline, color: COLORS.primary, marginTop: 2 }}>Dokter Mandiri</Text>
          )}
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 52, height: 52, borderRadius: 20, backgroundColor: withOpacity(COLORS.primary, 0.1), alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          <MaterialCommunityIcons name='account-heart' size={26} color={COLORS.primary} />
        </View>
        <View>
          <Text style={{ ...TYPOGRAPHY.h5, color: COLORS.textPrimary }}>{dentist?.name}</Text>
          <Text style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, marginTop: 2 }}>{dentist?.specialty}</Text>
        </View>
      </View>
    </LinearGradient>
  );
};

const Section = ({ title, children }) => (
  <View style={{ marginBottom: 24 }}>
    <Text style={{ ...TYPOGRAPHY.h4, color: COLORS.textPrimary, marginBottom: 12 }}>{title}</Text>
    {children}
  </View>
);

export default BookingConfirmScreen;
