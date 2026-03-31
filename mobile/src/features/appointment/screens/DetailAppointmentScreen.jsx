import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
  Share,
} from 'react-native';
import { Text, Button, useTheme, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { getAppointmentById, cancelAppointment } from '../../../services/appointmentService';
import { API_BASE_URL } from '../../../services/api';
import ValidationToast from '../../settings/components/ValidationToast';
import useToast from '../../../hooks/useToast';
import AppointmentChatBanner from './AppointmentChatBanner';

// Only pass URLs that are valid http/https to <Image> — anything else crashes RCTImageManager
const resolveAvatarUrl = (raw) => {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const full = trimmed.startsWith('http') ? trimmed : `${API_BASE_URL}${trimmed}`;
  // Final guard: must be a proper http(s) URL
  return full.startsWith('http://') || full.startsWith('https://') ? full : null;
};

const DetailAppointmentScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  
  const { appointmentId, appointment: passedAppointment } = route.params || {};
  
  const [appointment, setAppointment] = useState(passedAppointment || null);
  const [loading, setLoading] = useState(!passedAppointment);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const { toast, showToast, hideToast } = useToast();

  // Fetch appointment details
  const fetchAppointment = useCallback(async (showLoading = true) => {
    if (!appointmentId) {
      console.log('[DetailAppointment] No appointmentId provided');
      return;
    }
    
    try {
      console.log('[DetailAppointment] Fetching appointment with ID:', appointmentId, 'Type:', typeof appointmentId);
      if (showLoading) setLoading(true);
      setLoadError(null);
      const response = await getAppointmentById(appointmentId);
      console.log('[DetailAppointment] Response received:', response?.data ? 'Success' : 'No data', 'ID:', response?.data?.id);
      if (response?.data) {
        console.log('[DetailAppointment] Appointment data:', {
          id: response.data.id,
          type: response.data.appointmentType,
          metadataType: response.data.metadata?.appointmentType,
          videoRoomRef: response.data.videoRoomRef,
        });
        setAppointment(response.data);
      }
    } catch (err) {
      const message = err?.message || 'Gagal memuat detail janji temu.';
      setLoadError(message);
      showToast(message, 'error');
      if (__DEV__) {
        console.warn('[DetailAppointment] Fetch failed:', err?.code || err?.status || err?.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [appointmentId, showToast]);

  useEffect(() => {
    if (!passedAppointment && appointmentId) {
      fetchAppointment();
    }
  }, [fetchAppointment, passedAppointment, appointmentId]);

  // Refetch when screen is focused (e.g. after booking or cancellation)
  useFocusEffect(
    useCallback(() => {
      if (appointmentId) {
        fetchAppointment(false);
      }
    }, [appointmentId, fetchAppointment])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAppointment(false);
  };

  // Format date and time
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    }) + ' WIB';
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Get status info
  const getStatusInfo = (status) => {
    switch (status) {
      case 'scheduled':
      case 'upcoming':
        return { label: 'Terjadwal', color: '#2563EB', bg: '#DBEAFE', icon: 'calendar-clock' };
      case 'confirmed':
        return { label: 'Dikonfirmasi', color: '#059669', bg: '#D1FAE5', icon: 'check-circle' };
      case 'completed':
        return { label: 'Selesai', color: '#6B7280', bg: '#F3F4F6', icon: 'check-all' };
      case 'cancelled':
        return { label: 'Dibatalkan', color: '#DC2626', bg: '#FEE2E2', icon: 'close-circle' };
      case 'no_show':
        return { label: 'Tidak Hadir', color: '#D97706', bg: '#FEF3C7', icon: 'account-off' };
      default:
        return { label: status || 'Unknown', color: '#6B7280', bg: '#F3F4F6', icon: 'help-circle' };
    }
  };

  // Get payment status info
  const getPaymentInfo = (payment) => {
    if (!payment) return { label: 'Belum bayar', color: '#94A3B8', bg: '#F1F5F9', icon: 'credit-card-outline' };
    switch (payment.status) {
      case 'succeeded':
        return { label: 'Lunas', color: '#059669', bg: '#D1FAE5', icon: 'check-circle' };
      case 'pending':
      case 'requires_action':
        return { label: 'Menunggu Pembayaran', color: '#D97706', bg: '#FEF3C7', icon: 'clock-outline' };
      case 'failed':
        return { label: 'Pembayaran Gagal', color: '#DC2626', bg: '#FEE2E2', icon: 'close-circle' };
      case 'cancelled':
        return { label: 'Dibatalkan', color: '#6B7280', bg: '#F3F4F6', icon: 'cancel' };
      default:
        return { label: payment.status, color: '#94A3B8', bg: '#F1F5F9', icon: 'credit-card' };
    }
  };

  // Actions
  const handleReschedule = () => {
    navigation.navigate('BookingSlot', {
      dentistId: appointment?.dentist?.id || appointment?.dentistId,
      appointmentId: appointment?.id,
      isReschedule: true,
    });
  };

  const handleCancel = () => {
    Alert.alert(
      'Batalkan Janji Temu',
      'Apakah Anda yakin ingin membatalkan janji temu ini? Tindakan ini tidak dapat dibatalkan.',
      [
        { text: 'Tidak', style: 'cancel' },
        {
          text: 'Ya, Batalkan',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancelling(true);
              const response = await cancelAppointment(appointment?.id);
              // Update local state immediately
              if (response?.data) {
                setAppointment(response.data);
              }
              Alert.alert('Berhasil', 'Janji temu telah dibatalkan.', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (err) {
              const errorMsg = err?.message || 'Gagal membatalkan janji temu.';
              showToast(errorMsg, 'error');
              Alert.alert('Gagal', errorMsg);
              if (__DEV__) {
                console.warn('[DetailAppointment] Cancel failed:', err?.code || err?.status || err?.message);
              }
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const handleOpenMaps = () => {
    const address = appointment?.clinic?.address || appointment?.dentist?.clinicAddress;
    if (address) {
      const url = `http://maps.google.com/?q=${encodeURIComponent(address)}`;
      Linking.openURL(url);
    }
  };

  const handleShare = async () => {
    try {
      const bookingCode = appointment?.bookingCode || `SRN-${String(appointment?.id).padStart(6, '0')}`;
      const dentistName = appointment?.dentist?.name || 'Dokter';
      const date = formatDate(appointment?.startsAt);
      const time = formatTime(appointment?.startsAt);
      const clinicName = appointment?.clinic?.name || appointment?.dentist?.clinicName || 'Klinik';

      await Share.share({
        message: `Janji Temu Dental\n\nKode Booking: ${bookingCode}\nDokter: ${dentistName}\nTanggal: ${date}\nWaktu: ${time}\nLokasi: ${clinicName}`,
      });
    } catch (err) {
      showToast('Gagal membagikan detail janji temu.', 'warning');
      if (__DEV__) {
        console.warn('[DetailAppointment] Share failed:', err?.message);
      }
    }
  };

  const handleJoinCall = () => {
    const dentistData = appointment?.dentist || {};
    const dentistAvatar = resolveAvatarUrl(
      dentistData?.avatar || dentistData?.avatar_url || dentistData?.avatarUrl
    );

    // Navigate to PatientTeledentistryScreen with appointment data
    navigation.navigate('PatientTeledentistry', {
      appointmentId: appointment?.id,
      dentistName: dentistData?.name || 'Dokter Gigi',
      dentistSpecialty: dentistData?.specialization || dentistData?.specialty || '',
      dentistAvatar,
      dentistInitials: (dentistData?.name || 'DG').split(' ').filter(w => w.length > 0).map(w => w[0]).join('').substring(0, 2).toUpperCase(),
      appointmentDate: appointment?.startsAt || null,
      roomRef: appointment?.videoRoomRef,
    });
  };

  // Data derived from appointment
  const bookingCode = appointment?.bookingCode || `SRN-${String(appointment?.id).padStart(6, '0')}`;
  const dentist = appointment?.dentist || {};
  const clinic = appointment?.clinic || {};
  const payment = appointment?.payment || null;
  const isIndependent = dentist?.dentistType === 'independent';
  const statusInfo = getStatusInfo(appointment?.status);
  const paymentInfo = getPaymentInfo(payment);
  const isUpcoming = ['scheduled', 'confirmed', 'upcoming'].includes(appointment?.status);
  const isCancellable = ['scheduled', 'confirmed'].includes(appointment?.status);
  const appointmentType = appointment?.metadata?.appointmentType || appointment?.appointmentType || appointment?.type;
  const isVirtual = appointmentType === 'virtual' || !!appointment?.videoRoomRef;

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 12, color: '#64748B' }}>Memuat detail...</Text>
      </View>
    );
  }

  if (!appointment) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 20 }}>
        <MaterialCommunityIcons name={loadError ? 'wifi-alert' : 'calendar-remove'} size={64} color={loadError ? '#F59E0B' : '#CBD5E1'} />
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#1E293B', marginTop: 16 }}>
          {loadError ? 'Detail belum dapat dimuat' : 'Janji temu tidak ditemukan'}
        </Text>
        {loadError ? (
          <Text style={{ marginTop: 10, textAlign: 'center', color: '#64748B', lineHeight: 20 }}>
            {loadError}
          </Text>
        ) : null}
        {loadError ? (
          <Button mode="contained" onPress={() => fetchAppointment()} style={{ marginTop: 20 }} icon="refresh">
            Coba Lagi
          </Button>
        ) : null}
        <Button mode="contained" onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
          Kembali
        </Button>
        <ValidationToast
          visible={toast.visible}
          message={toast.message}
          status={toast.status}
          onDismiss={hideToast}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Header */}
      <LinearGradient
        colors={[theme.colors.primary, '#7F1DFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: 56,
          paddingBottom: 24,
          paddingHorizontal: 20,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
        }}
      >
        {/* Top bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.2)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
          
          <Text style={{ fontSize: 18, fontWeight: '700', color: 'white' }}>Detail Janji Temu</Text>
          
          <TouchableOpacity
            onPress={handleShare}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.2)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <MaterialCommunityIcons name="share-variant" size={22} color="white" />
          </TouchableOpacity>
        </View>

        {/* Booking Code */}
        <View style={{ alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <MaterialCommunityIcons name="ticket-confirmation-outline" size={20} color="rgba(255,255,255,0.8)" />
            <Text style={{ marginLeft: 8, fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>Kode Booking</Text>
          </View>
          <Text style={{ fontSize: 28, fontWeight: '800', color: 'white', letterSpacing: 2 }}>
            {bookingCode}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Status Cards */}
        <View style={{ flexDirection: 'row', marginBottom: 20, gap: 12 }}>
          {/* Appointment Status */}
          <View style={{
            flex: 1,
            backgroundColor: statusInfo.bg,
            borderRadius: 16,
            padding: 16,
            alignItems: 'center',
          }}>
            <MaterialCommunityIcons name={statusInfo.icon} size={28} color={statusInfo.color} />
            <Text style={{ fontSize: 12, color: '#64748B', marginTop: 8 }}>Status</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: statusInfo.color, marginTop: 2 }}>
              {statusInfo.label}
            </Text>
          </View>

          {/* Payment Status */}
          <View style={{
            flex: 1,
            backgroundColor: paymentInfo.bg,
            borderRadius: 16,
            padding: 16,
            alignItems: 'center',
          }}>
            <MaterialCommunityIcons name={paymentInfo.icon} size={28} color={paymentInfo.color} />
            <Text style={{ fontSize: 12, color: '#64748B', marginTop: 8 }}>Pembayaran</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: paymentInfo.color, marginTop: 2 }}>
              {paymentInfo.label}
            </Text>
          </View>

          {/* Type */}
          <View style={{
            flex: 1,
            backgroundColor: isVirtual ? '#DBEAFE' : '#F0FDF4',
            borderRadius: 16,
            padding: 16,
            alignItems: 'center',
          }}>
            <MaterialCommunityIcons
              name={isVirtual ? 'video' : 'hospital-building'}
              size={28}
              color={isVirtual ? '#2563EB' : '#059669'}
            />
            <Text style={{ fontSize: 12, color: '#64748B', marginTop: 8 }}>Tipe</Text>
            <Text style={{
              fontSize: 14,
              fontWeight: '700',
              color: isVirtual ? '#2563EB' : '#059669',
              marginTop: 2
            }}>
              {isVirtual ? 'Online' : 'Di Klinik'}
            </Text>
          </View>
        </View>

        {/* Date & Time Card */}
        <View style={{
          backgroundColor: 'white',
          borderRadius: 20,
          padding: 20,
          marginBottom: 16,
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.05,
          shadowRadius: 12,
          elevation: 3,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: '#EEF2FF',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <MaterialCommunityIcons name="calendar" size={24} color={theme.colors.primary} />
            </View>
            <View style={{ marginLeft: 14, flex: 1 }}>
              <Text style={{ fontSize: 13, color: '#64748B' }}>Tanggal</Text>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#1E293B', marginTop: 2 }}>
                {formatDate(appointment?.startsAt)}
              </Text>
            </View>
          </View>

          <Divider style={{ marginVertical: 12 }} />

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: '#FEF3C7',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <MaterialCommunityIcons name="clock-outline" size={24} color="#D97706" />
            </View>
            <View style={{ marginLeft: 14, flex: 1 }}>
              <Text style={{ fontSize: 13, color: '#64748B' }}>Waktu</Text>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#1E293B', marginTop: 2 }}>
                {formatTime(appointment?.startsAt)} - {formatTime(appointment?.endsAt)}
              </Text>
            </View>
          </View>
        </View>

        {/* Dentist Card */}
        <View style={{
          backgroundColor: 'white',
          borderRadius: 20,
          padding: 20,
          marginBottom: 16,
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.05,
          shadowRadius: 12,
          elevation: 3,
        }}>
          <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 12 }}>Dokter Gigi</Text>
          
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{
              width: 60,
              height: 60,
              borderRadius: 16,
              backgroundColor: '#EEF2FF',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <MaterialCommunityIcons name="tooth-outline" size={32} color={theme.colors.primary} />
            </View>
            <View style={{ marginLeft: 14, flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 17, fontWeight: '700', color: '#1E293B' }}>
                  {dentist?.title ? `${dentist.title} ` : ''}{dentist?.name || 'Dokter Gigi'}
                </Text>
                {isIndependent && (
                  <View style={{
                    marginLeft: 8,
                    backgroundColor: '#FEF3C7',
                    borderRadius: 6,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                  }}>
                    <Text style={{ fontSize: 10, color: '#D97706', fontWeight: '600' }}>Mandiri</Text>
                  </View>
                )}
              </View>
              <Text style={{ fontSize: 14, color: '#6366F1', marginTop: 4 }}>
                {dentist?.specialization || dentist?.specialty || 'Dokter Gigi Umum'}
              </Text>
            </View>
          </View>

          {/* Chat Banner — shown for all upcoming appointments */}
          {isUpcoming && (
            <AppointmentChatBanner
              appointment={appointment}
              unreadCount={0}
              onPress={handleJoinCall}
            />
          )}
        </View>

        {/* Location Card (for non-virtual) */}
        {!isVirtual && (clinic?.name || dentist?.clinicName || dentist?.clinicAddress) && (
          <View style={{
            backgroundColor: 'white',
            borderRadius: 20,
            padding: 20,
            marginBottom: 16,
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 12,
            elevation: 3,
          }}>
            <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 12 }}>Lokasi</Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <View style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: '#DCFCE7',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <MaterialCommunityIcons name="map-marker" size={24} color="#059669" />
              </View>
              <View style={{ marginLeft: 14, flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#1E293B' }}>
                  {isIndependent ? (dentist?.clinicName || 'Praktik Mandiri') : (clinic?.name || 'Klinik')}
                </Text>
                <Text style={{ fontSize: 14, color: '#64748B', marginTop: 4 }}>
                  {isIndependent ? dentist?.clinicAddress : clinic?.address}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleOpenMaps}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#F1F5F9',
                borderRadius: 12,
                paddingVertical: 12,
                marginTop: 16,
              }}
            >
              <MaterialCommunityIcons name="directions" size={18} color="#475569" />
              <Text style={{ marginLeft: 8, color: '#475569', fontWeight: '600' }}>Buka di Maps</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Reason Card */}
        {appointment?.reason && (
          <View style={{
            backgroundColor: 'white',
            borderRadius: 20,
            padding: 20,
            marginBottom: 16,
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 12,
            elevation: 3,
          }}>
            <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 8 }}>Keluhan / Alasan</Text>
            <Text style={{ fontSize: 15, color: '#1E293B', lineHeight: 22 }}>
              {appointment.reason}
            </Text>
          </View>
        )}

        {/* Payment Details Card */}
        {payment && (
          <View style={{
            backgroundColor: 'white',
            borderRadius: 20,
            padding: 20,
            marginBottom: 16,
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 12,
            elevation: 3,
          }}>
            <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 12 }}>Detail Pembayaran</Text>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: '#64748B' }}>Biaya Konsultasi</Text>
              <Text style={{ fontWeight: '600', color: '#1E293B' }}>{formatCurrency(payment.amount)}</Text>
            </View>
            
            <Divider style={{ marginVertical: 12 }} />
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B' }}>Total</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: theme.colors.primary }}>
                {formatCurrency(payment.amount)}
              </Text>
            </View>
          </View>
        )}

        {/* Notes Card */}
        {appointment?.notes && (
          <View style={{
            backgroundColor: '#FEF3C7',
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <MaterialCommunityIcons name="note-text" size={18} color="#D97706" />
              <Text style={{ marginLeft: 8, fontSize: 13, fontWeight: '600', color: '#D97706' }}>Catatan</Text>
            </View>
            <Text style={{ color: '#92400E', lineHeight: 20 }}>{appointment.notes}</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Actions */}
      {isCancellable && (
        <View style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'white',
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 32,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 10,
        }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button
              mode="outlined"
              onPress={handleCancel}
              loading={cancelling}
              disabled={cancelling}
              style={{ flex: 1, borderColor: '#DC2626' }}
              labelStyle={{ color: '#DC2626' }}
              icon="close"
            >
              Batalkan
            </Button>
            <Button
              mode="contained"
              onPress={handleReschedule}
              style={{ flex: 1 }}
              icon="calendar-edit"
            >
              Ubah Jadwal
            </Button>
          </View>
        </View>
      )}

      <ValidationToast
        visible={toast.visible}
        message={toast.message}
        status={toast.status}
        onDismiss={hideToast}
      />
    </View>
  );
};

export default DetailAppointmentScreen;