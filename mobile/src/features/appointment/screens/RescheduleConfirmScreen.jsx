import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Alert, TextInput } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as THEME_COLORS, withOpacity } from '../../../theme/colors';
import { typography as TYPOGRAPHY } from '../../../theme/dimensions';
import { getAppointmentById, rescheduleAppointment, getAppointmentConfig } from '../../../services/appointmentService';
import ValidationToast from '../../settings/components/ValidationToast';
import useToast from '../../../hooks/useToast';

const COLORS = THEME_COLORS;

const RescheduleConfirmScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { toast, showToast, hideToast } = useToast();

  const { dentist, slot, date, type, originalAppointmentId } = route.params || {};

  const [originalAppointment, setOriginalAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState('');
  const [config, setConfig] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      if (!originalAppointmentId) {
        showToast('ID janji temu asal tidak ditemukan', 'error');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [aptRes, configRes] = await Promise.all([
          getAppointmentById(originalAppointmentId),
          getAppointmentConfig().catch(() => null),
        ]);
        setOriginalAppointment(aptRes.data);
        if (configRes) {
          setConfig(configRes);
        }
      } catch (err) {
        showToast(err.message || 'Gagal memuat detail janji temu asal', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [originalAppointmentId]);

  const handleConfirmReschedule = async () => {
    if (!originalAppointmentId || !slot) return;
    setSubmitting(true);
    try {
      // Calculate startsAt and endsAt based on date and slot.time
      const startsAtStr = slot.raw?.startsAt || `${date}T${slot.time || '09:00'}:00+07:00`;
      const startsAtDate = new Date(startsAtStr);
      
      const duration = slot.duration || 30;
      const endsAtDate = slot.raw?.endsAt 
        ? new Date(slot.raw.endsAt)
        : new Date(startsAtDate.getTime() + duration * 60 * 1000);

      await rescheduleAppointment(originalAppointmentId, {
        startsAt: startsAtDate.toISOString(),
        endsAt: endsAtDate.toISOString(),
        reason: reason || 'Ubah jadwal atas permintaan pasien',
      });

      showToast('Jadwal berhasil diubah!', 'success');
      
      // Delay navigation slightly to let the toast display
      setTimeout(() => {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'AppointmentList' }],
          })
        );
      }, 1500);

    } catch (err) {
      showToast(err.message || 'Gagal mengubah jadwal janji temu', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return `${new Date(dateStr).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    })} WIB`;
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surface }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ ...TYPOGRAPHY.bodySmall, marginTop: 12, color: COLORS.textSecondary }}>Memuat detail...</Text>
      </View>
    );
  }

  const oldDateLabel = originalAppointment ? formatDate(originalAppointment.startsAt) : '';
  const oldTimeLabel = originalAppointment ? formatTime(originalAppointment.startsAt) : '';
  const newDateLabel = formatDate(`${date}T${slot?.time || '09:00'}:00`);
  const newTimeLabel = `${slot?.time || '—'} WIB`;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

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
            <Text style={{ color: withOpacity(COLORS.white, 0.7), ...TYPOGRAPHY.caption }}>Langkah 2/2</Text>
            <Text style={{ color: COLORS.surfaceElevated, ...TYPOGRAPHY.h3, marginTop: 4 }}>Konfirmasi Jadwal Baru</Text>
          </View>
          <View style={{ width: 48 }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
        <Text style={{ ...TYPOGRAPHY.h2, color: COLORS.textPrimary }}>Perubahan Jadwal</Text>
        <Text style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, marginBottom: 24 }}>
          Berikut perbandingan jadwal lama dengan jadwal baru yang Anda pilih.
        </Text>

        {/* Diff Comparison Card */}
        <View style={{
          backgroundColor: COLORS.surfaceElevated,
          borderRadius: 24,
          padding: 20,
          borderWidth: 1,
          borderColor: COLORS.border,
          marginBottom: 24,
          shadowColor: COLORS.textPrimary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.05,
          shadowRadius: 12,
          elevation: 3,
        }}>
          {/* Dentist info */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: withOpacity(COLORS.primary, 0.1), alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <MaterialCommunityIcons name="doctor" size={24} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...TYPOGRAPHY.h4, color: COLORS.textPrimary }}>
                {dentist?.name || originalAppointment?.dentist?.name || 'Dokter Gigi'}
              </Text>
              <Text style={{ color: COLORS.textSecondary, ...TYPOGRAPHY.caption }}>
                {dentist?.specialty || originalAppointment?.dentist?.specialty || 'Dokter Gigi Umum'}
              </Text>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: COLORS.border, marginBottom: 20 }} />

          {/* Old Slot Card */}
          <View style={{ padding: 14, backgroundColor: withOpacity(COLORS.error, 0.04), borderRadius: 18, borderWidth: 1, borderColor: withOpacity(COLORS.error, 0.1), marginBottom: 12 }}>
            <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.error, fontWeight: '800', textTransform: 'uppercase' }}>JADWAL SEMULA</Text>
            <Text style={{ ...TYPOGRAPHY.bodyMedium, fontWeight: '700', color: COLORS.textPrimary, marginTop: 4 }}>{oldDateLabel}</Text>
            <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 2 }}>{oldTimeLabel} · {originalAppointment?.appointmentType === 'virtual' ? 'Virtual Visit' : 'Tatap Muka'}</Text>
          </View>

          {/* Connection Indicator */}
          <View style={{ alignItems: 'center', marginVertical: 4 }}>
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: withOpacity(COLORS.primary, 0.1), alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="arrow-down" size={18} color={COLORS.primary} />
            </View>
          </View>

          {/* New Slot Card */}
          <View style={{ padding: 14, backgroundColor: withOpacity(COLORS.success, 0.04), borderRadius: 18, borderWidth: 1, borderColor: withOpacity(COLORS.success, 0.1) }}>
            <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.success, fontWeight: '800', textTransform: 'uppercase' }}>JADWAL BARU</Text>
            <Text style={{ ...TYPOGRAPHY.bodyMedium, fontWeight: '700', color: COLORS.textPrimary, marginTop: 4 }}>{newDateLabel}</Text>
            <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 2 }}>{newTimeLabel} · {type === 'virtual' ? 'Virtual Visit' : 'Tatap Muka'}</Text>
          </View>
        </View>

        {/* Optional Reason Section */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ ...TYPOGRAPHY.h4, color: COLORS.textPrimary, marginBottom: 10 }}>Alasan Pengubahan Jadwal (Opsional)</Text>
          <TextInput
            style={{
              backgroundColor: COLORS.surfaceElevated,
              borderRadius: 12,
              padding: 14,
              borderWidth: 1,
              borderColor: COLORS.border,
              color: COLORS.textPrimary,
              height: 80,
              textAlignVertical: 'top',
            }}
            placeholder="Tulis alasan jika Anda ingin menginformasikan dokter..."
            placeholderTextColor={COLORS.textMuted}
            value={reason}
            onChangeText={setReason}
            multiline
          />
        </View>

        {/* Reschedule Cutoff Warning */}
        <View style={{
          backgroundColor: withOpacity(COLORS.warning, 0.1),
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: withOpacity(COLORS.warning, 0.2),
          flexDirection: 'row',
          marginBottom: 24,
        }}>
          <MaterialCommunityIcons name="information" size={20} color={COLORS.warning} style={{ marginTop: 2 }} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={{ ...TYPOGRAPHY.h5, color: COLORS.warning, marginBottom: 4 }}>Kebijakan Reschedule</Text>
            <Text style={{ ...TYPOGRAPHY.caption, color: withOpacity(COLORS.warning, 0.8), lineHeight: 18 }}>
              Pengubahan jadwal hanya dapat dilakukan maksimal {config?.rescheduleCutoffHours ?? 24} jam sebelum waktu janji temu mula-mula. Pengubahan di bawah batas waktu ini tidak diperbolehkan.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Confirm Button Bar */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 20, backgroundColor: COLORS.surfaceElevated, borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: COLORS.textPrimary, shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 10 }}>
        <Button
          mode="contained"
          icon="calendar-edit"
          onPress={handleConfirmReschedule}
          loading={submitting}
          disabled={submitting}
          buttonColor={COLORS.primary}
          contentStyle={{ paddingVertical: 6 }}
          labelStyle={{ ...TYPOGRAPHY.bodyLarge, fontWeight: '700' }}
          accessibilityLabel="Konfirmasi Reschedule"
        >
          {submitting ? 'Memproses reschedule...' : 'Ubah Jadwal Sekarang'}
        </Button>
      </View>

      <ValidationToast
        visible={toast.visible}
        message={toast.message}
        status={toast.status}
        onDismiss={hideToast}
      />
    </View>
  );
};

export default RescheduleConfirmScreen;
