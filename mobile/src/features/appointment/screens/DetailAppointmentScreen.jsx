import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, StatusBar, Image, Alert, RefreshControl, Animated, Linking } from 'react-native';
import { Text, Button, ActivityIndicator, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatCurrency } from '../../../utils/formatters';
import { getAppointmentById, getAppointmentClinicalSummary, cancelAppointment, getAppointmentConfig } from '../../../services/appointmentService';
import ValidationToast from '../../settings/components/ValidationToast';
import useToast from '../../../hooks/useToast';
import AppointmentChatBanner from './AppointmentChatBanner';
import { colors as THEME_COLORS, withOpacity } from '../../../theme/colors';
import { typography as TYPOGRAPHY } from '../../../theme/dimensions';
import resolveMediaUrl from '../../../utils/media';

const COLORS = THEME_COLORS;

const DetailAppointmentScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { toast, showToast, hideToast } = useToast();

  const appointmentId = route.params?.appointmentId;
  const [appointment, setAppointment] = useState(route.params?.appointment || null);
  const [clinicalSummary, setClinicalSummary] = useState(null);
  const [clinicalSummaryStatus, setClinicalSummaryStatus] = useState('pending');
  const [loading, setLoading] = useState(!route.params?.appointment);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(new Date());
  const chatPulse = useRef(new Animated.Value(0)).current;
  const [refreshingSummary, setRefreshingSummary] = useState(false);
  const [appointmentConfig, setAppointmentConfig] = useState(null);
  const [hasNudged, setHasNudged] = useState(false);

  const fetchDetail = useCallback(async (showLoading = true) => {
    if (!appointmentId) return;
    try {
      if (showLoading) setLoading(true);
      const result = await getAppointmentById(appointmentId);
      const appointmentData = result.data;
      setAppointment(appointmentData);

      // ISSUE-016: Only fetch clinical summary for completed appointments
      if (appointmentData?.status === 'completed' || appointmentData?.status === 'finished') {
        try {
          const summaryResult = await getAppointmentClinicalSummary(appointmentId);
          setClinicalSummary(summaryResult.summary || null);
          setClinicalSummaryStatus(summaryResult.status || 'pending');
        } catch (_summaryError) {
          setClinicalSummary(null);
          setClinicalSummaryStatus('pending');
        }
      }
    } catch (error) {
      showToast(error.message || 'Gagal memuat detail janji temu', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    getAppointmentConfig()
      .then((res) => {
        setAppointmentConfig(res);
      })
      .catch((err) => {
        if (__DEV__) console.warn('[DetailAppointment] Failed to fetch appointment config:', err);
      });
  }, []);

  useEffect(() => {
    if (!appointment?.startsAt || appointment?.status === 'completed' || appointment?.status === 'finished' || appointment?.status === 'cancelled') return;
    const remaining = new Date(appointment.startsAt).getTime() - now.getTime();

    // T-15 minutes nudge for virtual appointments
    if (isVirtualAppointment && remaining <= 15 * 60 * 1000 && remaining > 0 && !hasNudged) {
      setHasNudged(true);
      showToast('Konsultasi virtual Anda akan dimulai dalam 15 menit. Silakan bersiap masuk ruang chat.', 'info');
    }

    if (remaining <= 0 && remaining > -2500) {
      Animated.sequence([
        Animated.timing(chatPulse, { toValue: 1, duration: 250, useNativeDriver: false }),
        Animated.timing(chatPulse, { toValue: 0, duration: 900, useNativeDriver: false }),
      ]).start();
    }
  }, [appointment?.startsAt, appointment?.status, chatPulse, now, isVirtualAppointment, hasNudged]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDetail(false);
  };

  const handleCancelRequest = () => {
    const startsAtMs = new Date(appointment?.startsAt).getTime();
    const nowMs = new Date().getTime();
    const hoursLeft = (startsAtMs - nowMs) / (1000 * 60 * 60);

    const cutoffHours = appointmentConfig?.cancelCutoffHours ?? 24;
    const feePercent = appointmentConfig?.cancellationFeePercent ?? 50;

    const isWithinCutoff = hoursLeft < cutoffHours;
    const warningText = isWithinCutoff
      ? `Pembatalan kurang dari ${cutoffHours} jam sebelum jadwal akan dikenakan biaya administrasi sebesar ${feePercent}%. Apakah Anda yakin ingin membatalkan?`
      : 'Apakah Anda yakin ingin membatalkan janji temu ini? Pembatalan mungkin dikenakan biaya admin tergantung kebijakan klinik.';

    Alert.alert(
      'Batalkan Janji Temu',
      warningText,
      [
        { text: 'Tidak', style: 'cancel' },
        {
          text: 'Ya, Batalkan',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const cancelRes = await cancelAppointment(appointmentId, 'Dibatalkan oleh pasien');
              navigation.navigate('CancelSuccess', {
                appointment: appointment,
                cancellationFee: cancelRes?.data?.cancellationFee || (isWithinCutoff ? Math.round(appointment.fee * (feePercent / 100)) : 0),
              });
            } catch (error) {
              showToast(error.message || 'Gagal membatalkan janji temu', 'error');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleReschedule = () => {
    const pId = appointment?.dentist?.profileId || appointment?.dentistId;
    navigation.navigate('BookingSlot', {
      dentistId: pId,
      dentist: {
        ...appointment?.dentist,
        id: pId,
        specialty: appointment?.dentist?.specialty || appointment?.dentist?.specialization || 'Dokter Gigi Umum',
        clinicContext: appointment?.clinicBranch ? {
          profileId: appointment?.clinicBranch?.clinicProfileId,
          branchId: appointment?.clinicBranch?.id,
          name: appointment?.clinicBranch?.name,
          address: appointment?.clinicBranch?.address,
        } : (appointment?.ownerClinicId ? {
          profileId: appointment?.ownerClinicId,
          name: appointment?.dentist?.clinicName || 'Praktik Mandiri',
          address: appointment?.dentist?.clinicAddress || appointment?.dentist?.address || 'Lokasi Mandiri',
        } : undefined),
      },
      isReschedule: true,
      originalAppointmentId: appointmentId,
    });
  };

  const handleJoinCall = () => {
    const dentistAvatar = resolveMediaUrl(appointment?.dentist?.avatar || appointment?.dentist?.avatarUrl);
    const dentistInitials = appointment?.dentist?.name
      ? appointment.dentist.name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2)
      : 'DR';

    navigation.navigate('PatientTeledentistry', {
      appointmentId: appointmentId,
      appointmentDate: appointment?.startsAt,
      dentistName: appointment?.dentist?.name,
      dentistSpecialty: appointment?.dentist?.specialty || appointment?.dentist?.specialization || 'Dokter Gigi Umum',
      dentistAvatar: dentistAvatar,
      dentistInitials: dentistInitials,
    });
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'scheduled':
      case 'confirmed':
        return { label: 'Akan Datang', color: COLORS.success, icon: 'calendar-check' };
      case 'completed':
      case 'finished':
        return { label: 'Selesai', color: COLORS.primary, icon: 'check-circle' };
      case 'cancelled':
        return { label: 'Dibatalkan', color: COLORS.error, icon: 'close-circle' };
      case 'overdue':
        return { label: 'Terlewat', color: COLORS.warning, icon: 'clock-alert' };
      default:
        return { label: status, color: COLORS.textSecondary, icon: 'help-circle' };
    }
  };

  if (loading && !appointment) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surface }}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  const statusConfig = getStatusConfig(appointment?.status);
  const isVirtualAppointment = appointment?.appointmentType === 'virtual'
    || appointment?.type === 'virtual'
    || appointment?.metadata?.appointmentType === 'virtual'
    || Boolean(appointment?.videoRoomRef);
  const remainingMs = appointment?.startsAt ? new Date(appointment.startsAt).getTime() - now.getTime() : 0;
  const remainingLabel = remainingMs > 60 * 60 * 1000
    ? `${Math.floor(remainingMs / 3600000)}j ${Math.floor((remainingMs % 3600000) / 60000)}m`
    : remainingMs > 0
      ? `${Math.floor(remainingMs / 60000)}m ${Math.floor((remainingMs % 60000) / 1000)}s`
      : 'Mulai sekarang';
  const isUnpaid = !['paid', 'settled', 'succeeded', 'settlement', 'capture'].includes(appointment?.payment?.status) &&
    appointment?.status !== 'cancelled';
  const isUnpaidAndOverdue = isUnpaid && appointment?.status === 'overdue';

  const lifecycleSteps = isUnpaid
    ? ['Dipesan', 'Bayar', 'Dikonfirmasi', 'Selesai']
    : ['Dipesan', 'Dikonfirmasi', 'Berlangsung', 'Selesai'];

  const currentStep = isUnpaid
    ? 1
    : appointment?.status === 'completed' || appointment?.status === 'finished'
      ? 3
      : appointment?.status === 'confirmed'
        ? 1
        : remainingMs <= 0 && ['scheduled', 'confirmed'].includes(appointment?.status)
          ? 2
          : 0;

  const dentistAvatar = resolveMediaUrl(appointment?.dentist?.avatar || appointment?.dentist?.avatarUrl);
  const dentistInitials = appointment?.dentist?.name
    ? appointment.dentist.name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'DR';

  const canJoinVideo = true; // Always allow entering the chat/teledentistry room

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <StatusBar barStyle='light-content' />

      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryLight]}
        style={{ paddingTop: insets.top + 20, paddingBottom: 60, paddingHorizontal: 20 }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => {
              const state = navigation.getState();
              const routes = state?.routes || [];
              if (routes.length > 1) {
                navigation.goBack();
              } else {
                navigation.navigate('AppointmentList');
              }
            }}
            accessibilityLabel="Kembali"
            accessibilityRole="button"
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: withOpacity(COLORS.white, 0.2), justifyContent: 'center', alignItems: 'center' }}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.surfaceElevated} />
          </TouchableOpacity>
          <View style={{ backgroundColor: withOpacity(COLORS.white, 0.2), paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}>
            <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.surfaceElevated, fontWeight: '700' }}>#{appointmentId?.toString().slice(-6).toUpperCase()}</Text>
          </View>
        </View>

        <View style={{ marginTop: 24, alignItems: 'center' }}>
          <View style={{ backgroundColor: withOpacity(statusConfig.color, 0.12), paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: withOpacity(statusConfig.color, 0.4) }}>
            <MaterialCommunityIcons name={statusConfig.icon} size={14} color={statusConfig.color} />
            <Text style={{ color: statusConfig.color, ...TYPOGRAPHY.caption, fontWeight: '700', marginLeft: 6 }}>{statusConfig.label}</Text>
          </View>
          <Text style={{ ...TYPOGRAPHY.h2, color: COLORS.surfaceElevated }}>Detail Janji Temu</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1, marginTop: -32, borderTopLeftRadius: 32, borderTopRightRadius: 32, backgroundColor: COLORS.surface }}
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Countdown Card */}
        {['scheduled', 'confirmed'].includes(appointment?.status) && (() => {
          const isNearStart = isVirtualAppointment && remainingMs <= 15 * 60 * 1000 && remainingMs > 0;
          return (
            <View style={{
              backgroundColor: isNearStart ? withOpacity(COLORS.warning, 0.08) : COLORS.surfaceElevated,
              borderRadius: 22,
              padding: 16,
              borderWidth: 1,
              borderColor: isNearStart ? COLORS.warning : withOpacity(COLORS.primary, 0.14),
              marginBottom: 20,
              shadowColor: COLORS.textPrimary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.05,
              shadowRadius: 10,
              elevation: 2
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 7, borderColor: isNearStart ? withOpacity(COLORS.warning, 0.18) : withOpacity(COLORS.primary, 0.18), alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                  <Text style={{ ...TYPOGRAPHY.bodySmall, color: isNearStart ? COLORS.warning : COLORS.primary, fontWeight: '900', textAlign: 'center' }}>{remainingLabel}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textMuted, fontWeight: '800', textTransform: 'uppercase' }}>Sesi dimulai dalam</Text>
                  <Text style={{ ...TYPOGRAPHY.bodyLarge, color: COLORS.textPrimary, fontWeight: '800', marginTop: 4 }}>
                    Siapkan koneksi dan dokumen pendukung sebelum masuk ruang konsultasi.
                  </Text>
                  {isNearStart && (
                    <TouchableOpacity
                      onPress={handleJoinCall}
                      style={{
                        marginTop: 10,
                        backgroundColor: COLORS.primary,
                        borderRadius: 10,
                        paddingVertical: 8,
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'center'
                      }}
                    >
                      <MaterialCommunityIcons name="message-video" size={16} color={COLORS.white} style={{ marginRight: 6 }} />
                      <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 12 }}>Masuk Ruang Konsultasi</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          );
        })()}

        {/* Status Stepper */}
        <View style={{
          backgroundColor: COLORS.surfaceElevated,
          borderRadius: 20,
          padding: 16,
          marginBottom: 20,
          shadowColor: COLORS.textPrimary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          elevation: 2
        }}>
          <Text style={{ ...TYPOGRAPHY.bodyLarge, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 14 }}>Status Janji Temu</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            {lifecycleSteps.map((step, index) => {
              const done = index < currentStep;
              const active = index === currentStep;
              return (
                <View key={step} style={{ flex: 1, alignItems: 'center' }}>
                  <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: done ? COLORS.success : active ? COLORS.primary : COLORS.border, alignItems: 'center', justifyContent: 'center' }}>
                    {done ? <MaterialCommunityIcons name="check" size={14} color={COLORS.white} /> : null}
                  </View>
                  <Text style={{ ...TYPOGRAPHY.caption, color: active ? COLORS.primary : COLORS.textMuted, marginTop: 6, textAlign: 'center', fontWeight: active ? '800' : '600' }}>{step}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Overdue Unpaid Alert or Payment Warning Card */}
        {isUnpaidAndOverdue ? (
          <View style={{
            backgroundColor: withOpacity(COLORS.error, 0.08),
            borderRadius: 22,
            padding: 16,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: withOpacity(COLORS.error, 0.3),
            shadowColor: COLORS.error,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
            elevation: 2
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: withOpacity(COLORS.error, 0.15), alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <MaterialCommunityIcons name="calendar-remove" size={22} color={COLORS.error} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...TYPOGRAPHY.bodyLarge, fontWeight: '800', color: COLORS.error }}>Jadwal Terlewat & Belum Dibayar</Text>
                <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 2 }}>Jadwal janji temu virtual Anda telah terlewat tanpa pembayaran. Silakan buat janji temu baru.</Text>
              </View>
            </View>
            <Button
              mode="contained"
              buttonColor={COLORS.primary}
              textColor={COLORS.white}
              onPress={() => {
                navigation.navigate('ClinicSearch');
              }}
              style={{ borderRadius: 12 }}
              labelStyle={{ fontWeight: '700' }}
            >
              Buat Janji Temu Baru
            </Button>
          </View>
        ) : isUnpaid ? (
          <View style={{
            backgroundColor: withOpacity(COLORS.warning, 0.08),
            borderRadius: 22,
            padding: 16,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: withOpacity(COLORS.warning, 0.3),
            shadowColor: COLORS.warning,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
            elevation: 2
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: withOpacity(COLORS.warning, 0.15), alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <MaterialCommunityIcons name="wallet-giftcard" size={22} color={COLORS.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...TYPOGRAPHY.bodyLarge, fontWeight: '800', color: COLORS.warning }}>Menunggu Pembayaran</Text>
                <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 2 }}>Segera selesaikan pembayaran untuk mengamankan slot Anda.</Text>
              </View>
            </View>
            <Button
              mode="contained"
              buttonColor={COLORS.warning}
              textColor={COLORS.white}
              onPress={() => {
                navigation.navigate('Payment', {
                  appointmentId: appointment.id,
                  dentist: appointment.dentist,
                  slot: { time: new Date(appointment.startsAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) },
                  date: appointment.startsAt.split('T')[0],
                  fee: appointment.fee,
                  paymentMethod: appointment.payment?.provider || 'card',
                  type: isVirtualAppointment ? 'virtual' : 'onsite',
                });
              }}
              style={{ borderRadius: 12 }}
              labelStyle={{ fontWeight: '700' }}
            >
              Bayar Sekarang
            </Button>
          </View>
        ) : null}

        {/* Dentist Card */}
        <View style={{ backgroundColor: COLORS.surfaceElevated, borderRadius: 24, padding: 16, flexDirection: 'row', alignItems: 'center', shadowColor: COLORS.textPrimary, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 }}>
          <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: withOpacity(COLORS.primary, 0.1), overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}>
            {appointment?.dentist && dentistAvatar ? (
              <Image
                source={{ uri: dentistAvatar }}
                style={{ width: '100%', height: '100%' }}
              />
            ) : (
              <Text style={{ ...TYPOGRAPHY.h3, color: COLORS.primary, fontWeight: '700' }}>
                {appointment?.dentist ? dentistInitials : 'DG'}
              </Text>
            )}
          </View>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={{ ...TYPOGRAPHY.h3, color: COLORS.textPrimary }}>
              {appointment?.dentist?.name || 'Dokter akan ditugaskan'}
            </Text>
            <Text style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary }}>
              {appointment?.dentist ? (appointment.dentist.specialty || appointment.dentist.specialization || 'Dokter Gigi Umum') : 'Selesaikan pembayaran terlebih dahulu'}
            </Text>
          </View>
        </View>

        {/* Schedule Info */}
        <View style={{ marginTop: 24 }}>
          <Text style={{ ...TYPOGRAPHY.bodyLarge, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 }}>Jadwal & Lokasi</Text>
          <View style={{ backgroundColor: COLORS.surfaceElevated, borderRadius: 20, padding: 16 }}>
            <InfoRow icon="calendar" label="Tanggal" value={new Date(appointment?.startsAt).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} />
            <Divider style={{ marginVertical: 12 }} />
            <InfoRow icon="clock-outline" label="Waktu" value={`${new Date(appointment?.startsAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`} />
            <Divider style={{ marginVertical: 12 }} />
            <InfoRow icon="map-marker" label="Klinik" value={appointment?.clinic?.name || 'Klinik Serene'} />
            <Divider style={{ marginVertical: 12 }} />
            <InfoRow icon="medical-bag" label="Layanan" value={appointment?.reason || 'Konsultasi Umum'} />
          </View>
        </View>

        {/* Payment Summary if exists */}
        {appointment?.fee > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={{ ...TYPOGRAPHY.bodyLarge, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 }}>Informasi Biaya</Text>
            <View style={{ backgroundColor: COLORS.surfaceElevated, borderRadius: 20, padding: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ ...TYPOGRAPHY.bodyMedium, color: COLORS.textSecondary }}>Biaya Konsultasi</Text>
                <Text style={{ ...TYPOGRAPHY.bodyLarge, fontWeight: '700', color: COLORS.textPrimary }}>{formatCurrency(appointment.fee)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Chat Banner */}
        {(appointment?.status === 'scheduled' || appointment?.status === 'confirmed') && !isUnpaid && (
          <Animated.View style={{ borderRadius: 20, borderWidth: chatPulse.interpolate({ inputRange: [0, 1], outputRange: [0, 2] }), borderColor: chatPulse.interpolate({ inputRange: [0, 1], outputRange: [withOpacity(COLORS.primary, 0), COLORS.primary] }) }}>
            <AppointmentChatBanner
              appointment={appointment}
              onPress={() => navigation.navigate('PatientTeledentistry', {
                appointmentId: appointmentId,
                appointmentDate: appointment?.startsAt,
                dentistName: appointment?.dentist?.name,
                dentistSpecialty: appointment?.dentist?.specialty,
                dentistAvatar: appointment?.dentist?.avatarUrl,
                dentistInitials: appointment?.dentist?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
              })}
            />
          </Animated.View>
        )}

        {(appointment?.status === 'completed' || appointment?.status === 'finished') && (() => {
          const handleRefreshSummary = async () => {
            setRefreshingSummary(true);
            await fetchDetail(false);
            setRefreshingSummary(false);
          };
          return (
            <View style={{ marginTop: 24 }}>
              <Text style={{ ...TYPOGRAPHY.bodyLarge, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 }}>Ringkasan Konsultasi</Text>
              <View style={{ backgroundColor: COLORS.surfaceElevated, borderRadius: 20, padding: 16 }}>
                {clinicalSummaryStatus === 'finalized' || clinicalSummaryStatus === 'amended' ? (
                  <>
                    <SummaryRow label="Keluhan utama" value={clinicalSummary?.chiefComplaint} />
                    <Divider style={{ marginVertical: 12 }} />
                    <SummaryRow label="Temuan objektif" value={clinicalSummary?.objectiveFindings} />
                    <Divider style={{ marginVertical: 12 }} />
                    <SummaryRow label="Assessment" value={clinicalSummary?.assessment} />
                    <Divider style={{ marginVertical: 12 }} />
                    <SummaryRow label="Rencana tindakan" value={clinicalSummary?.plan} />
                    {clinicalSummary?.recommendations?.length > 0 && (
                      <>
                        <Divider style={{ marginVertical: 12 }} />
                        <SummaryRow label="Rekomendasi" value={clinicalSummary.recommendations.join('\n')} />
                      </>
                    )}
                    {clinicalSummary?.attachments?.length > 0 && (
                      <>
                        <Divider style={{ marginVertical: 12 }} />
                        <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textMuted }}>Lampiran</Text>
                        <View style={{ marginTop: 8, gap: 8 }}>
                          {clinicalSummary.attachments.map((file, idx) => {
                            const handleOpenAttachment = () => {
                              const resolvedUrl = resolveMediaUrl(file.fileUrl || file.storageObjectKey);
                              if (resolvedUrl) {
                                Linking.openURL(resolvedUrl).catch(() => {
                                  Alert.alert('Gagal Membuka Lampiran', 'Tidak dapat membuka URL lampiran.');
                                });
                              }
                            };
                            return (
                              <TouchableOpacity
                                key={idx}
                                onPress={handleOpenAttachment}
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  backgroundColor: COLORS.surface,
                                  borderRadius: 12,
                                  paddingVertical: 10,
                                  paddingHorizontal: 12,
                                  borderWidth: 1,
                                  borderColor: withOpacity(COLORS.primary, 0.1)
                                }}
                              >
                                <MaterialCommunityIcons name="file-document-outline" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
                                <Text style={{ flex: 1, ...TYPOGRAPHY.bodySmall, color: COLORS.textPrimary }} numberOfLines={1}>
                                  {file.fileName || file.name || 'Dokumen Lampiran'}
                                </Text>
                                <MaterialCommunityIcons name="download" size={16} color={COLORS.textMuted} />
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </>
                    )}
                  </>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                      <MaterialCommunityIcons name="file-clock-outline" size={22} color={COLORS.textMuted} />
                      <View style={{ marginLeft: 10, flex: 1 }}>
                        <Text style={{ ...TYPOGRAPHY.bodyMedium, color: COLORS.textSecondary }}>
                          Ringkasan konsultasi sedang disiapkan dokter.
                        </Text>
                        <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textMuted, marginTop: 4 }}>
                          Penyusunan ringkasan biasanya memakan waktu 10-15 menit setelah sesi berakhir.
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={handleRefreshSummary}
                      disabled={refreshingSummary}
                      style={{ padding: 8, borderRadius: 8, backgroundColor: withOpacity(COLORS.primary, 0.1) }}
                    >
                      {refreshingSummary ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                      ) : (
                        <MaterialCommunityIcons name="refresh" size={20} color={COLORS.primary} />
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          );
        })()}

        {/* Actions */}
        <View style={{ marginTop: 32 }}>
          {isVirtualAppointment && (appointment?.status === 'scheduled' || appointment?.status === 'confirmed') && !isUnpaid && (
            <Button
              mode="contained"
              icon="message-video"
              onPress={handleJoinCall}
              style={{ borderRadius: 12, marginBottom: 6 }}
              buttonColor={COLORS.primary}
              textColor={COLORS.white}
              contentStyle={{ height: 50 }}
            >
              Buka Ruang Konsultasi
            </Button>
          )}

          {isUnpaidAndOverdue ? (
            <Button
              mode="contained"
              icon="calendar-plus"
              onPress={() => {
                navigation.navigate('ClinicSearch');
              }}
              style={{ borderRadius: 12, marginBottom: 12 }}
              buttonColor={COLORS.primary}
              textColor={COLORS.white}
              contentStyle={{ height: 50 }}
            >
              Buat Janji Temu Baru
            </Button>
          ) : isUnpaid ? (
            <Button
              mode="contained"
              icon="credit-card"
              onPress={() => {
                navigation.navigate('Payment', {
                  appointmentId: appointment.id,
                  dentist: appointment.dentist,
                  slot: { time: new Date(appointment.startsAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) },
                  date: appointment.startsAt.split('T')[0],
                  fee: appointment.fee,
                  paymentMethod: appointment.payment?.provider || 'card',
                  type: isVirtualAppointment ? 'virtual' : 'onsite',
                });
              }}
              style={{ borderRadius: 12, marginBottom: 12 }}
              buttonColor={COLORS.warning}
              textColor={COLORS.white}
              contentStyle={{ height: 50 }}
            >
              Selesaikan Pembayaran
            </Button>
          ) : null}

          {(appointment?.status === 'scheduled' || appointment?.status === 'confirmed') && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Button
                mode="outlined"
                icon="calendar-edit"
                onPress={handleReschedule}
                style={{ flex: 1, borderRadius: 12, marginRight: 8, borderColor: COLORS.border }}
                textColor={COLORS.textPrimary}
              >
                Ubah Jadwal
              </Button>
              <Button
                mode="outlined"
                icon="close-circle-outline"
                onPress={handleCancelRequest}
                style={{ flex: 1, borderRadius: 12, marginLeft: 8, borderColor: withOpacity(COLORS.error, 0.4) }}
                textColor={COLORS.error}
              >
                Batalkan
              </Button>
            </View>
          )}

          {appointment?.status === 'completed' && !appointment?.hasReview && (
            <Button
              mode="contained"
              icon="star"
              onPress={() => navigation.navigate('Review', {
                appointmentId,
                dentistId: appointment?.dentist?.id || appointment?.dentistId,
                dentistName: appointment?.dentist?.name,
                dentistTitle: appointment?.dentist?.title || 'drg.',
                clinicBranchId: appointment?.clinicBranchId,
              })}
              style={{ borderRadius: 12 }}
              buttonColor={COLORS.primary}
            >
              Berikan Penilaian
            </Button>
          )}
        </View>
      </ScrollView>

      <ValidationToast
        visible={toast.visible}
        message={toast.message}
        status={toast.status}
        onDismiss={hideToast}
      />
    </View>
  );
};

const InfoRow = ({ icon, label, value }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' }}>
      <MaterialCommunityIcons name={icon} size={18} color={COLORS.primary} />
    </View>
    <View style={{ marginLeft: 12, flex: 1 }}>
      <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textMuted }}>{label}</Text>
      <Text style={{ ...TYPOGRAPHY.bodyMedium, color: COLORS.textPrimary, fontWeight: '600', marginTop: 2 }}>{value}</Text>
    </View>
  </View>
);

const SummaryRow = ({ label, value }) => (
  <View>
    <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textMuted }}>{label}</Text>
    <Text style={{ ...TYPOGRAPHY.bodyMedium, color: COLORS.textPrimary, marginTop: 4, lineHeight: 22 }}>{value || '-'}</Text>
  </View>
);

export default DetailAppointmentScreen;
