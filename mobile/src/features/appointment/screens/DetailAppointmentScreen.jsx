import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, StatusBar, Image, Alert, RefreshControl } from 'react-native';
import { Text, Button, ActivityIndicator, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatCurrency } from '../../../utils/formatters';
import { getAppointmentById, getAppointmentClinicalSummary, cancelAppointment } from '../../../services/appointmentService';
import ValidationToast from '../../settings/components/ValidationToast';
import useToast from '../../../hooks/useToast';
import AppointmentChatBanner from './AppointmentChatBanner';
import { colors as THEME_COLORS, withOpacity } from '../../../theme/colors';
import { typography as TYPOGRAPHY } from '../../../theme/dimensions';

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

  const onRefresh = () => {
    setRefreshing(true);
    fetchDetail(false);
  };

  const handleCancelRequest = () => {
    Alert.alert(
      'Batalkan Janji Temu',
      'Apakah Anda yakin ingin membatalkan janji temu ini? Pembatalan mungkin dikenakan biaya admin tergantung kebijakan klinik.',
      [
        { text: 'Tidak', style: 'cancel' },
        { 
          text: 'Ya, Batalkan', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await cancelAppointment(appointmentId, 'Dibatalkan oleh pasien');
              showToast('Janji temu berhasil dibatalkan', 'success');
              fetchDetail();
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
    navigation.navigate('BookingSlot', {
      dentistId: appointment?.dentistId,
      dentist: appointment?.dentist,
      isReschedule: true,
      originalAppointmentId: appointmentId,
    });
  };

  const handleJoinCall = () => {
    navigation.navigate('PatientTeledentistry', {
      appointmentId: appointmentId,
      appointmentDate: appointment?.startsAt,
      dentistName: appointment?.dentist?.name,
      dentistSpecialty: appointment?.dentist?.specialty,
      dentistAvatar: appointment?.dentist?.avatarUrl,
      dentistInitials: appointment?.dentist?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
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

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <StatusBar barStyle='light-content' />
      
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryLight]}
        style={{ paddingTop: insets.top + 20, paddingBottom: 60, paddingHorizontal: 20 }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
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
        {/* Dentist Card */}
        <View style={{ backgroundColor: COLORS.surfaceElevated, borderRadius: 24, padding: 16, flexDirection: 'row', alignItems: 'center', shadowColor: COLORS.textPrimary, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 }}>
          <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: withOpacity(COLORS.primary, 0.1), overflow: 'hidden' }}>
            <Image 
              source={{ uri: appointment?.dentist?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${appointment?.dentist?.id}&backgroundColor=8B5CF6` }}
              style={{ width: '100%', height: '100%' }}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={{ ...TYPOGRAPHY.h3, color: COLORS.textPrimary }}>{appointment?.dentist?.name}</Text>
            <Text style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary }}>{appointment?.dentist?.specialty}</Text>
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
        {(appointment?.status === 'scheduled' || appointment?.status === 'confirmed') && (
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
        )}

        {(appointment?.status === 'completed' || appointment?.status === 'finished') && (
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
                </>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="file-clock-outline" size={22} color={COLORS.textMuted} />
                  <Text style={{ ...TYPOGRAPHY.bodyMedium, color: COLORS.textSecondary, marginLeft: 10 }}>
                    Ringkasan konsultasi sedang disiapkan dokter.
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={{ marginTop: 32 }}>
          {isVirtualAppointment && (appointment?.status === 'scheduled' || appointment?.status === 'confirmed') && (
            <Button
              mode="contained"
              icon="video"
              onPress={handleJoinCall}
              style={{ borderRadius: 12, marginBottom: 12 }}
              buttonColor={COLORS.primary}
              contentStyle={{ height: 50 }}
            >
              Gabung Panggilan Video
            </Button>
          )}

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
