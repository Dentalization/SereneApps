import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { Text, Button, useTheme, Surface, Avatar, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAppointments } from '../../../services/appointmentService';
import ValidationToast from '../../settings/components/ValidationToast';
import useToast from '../../../hooks/useToast';

// Dimensi Layar
const { width } = Dimensions.get('window');

// --- KOMPONEN PENDUKUNG ---

// 1. Empty State Modern
const ModernEmptyState = ({ title, description, icon, action }) => (
  <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 40 }}>
    <View style={{
      width: 100, height: 100, borderRadius: 50, backgroundColor: '#EEF2FF',
      alignItems: 'center', justifyContent: 'center', marginBottom: 24
    }}>
      <MaterialCommunityIcons name={icon} size={48} color="#6366F1" />
    </View>
    <Text style={{ fontSize: 20, fontWeight: '700', color: '#1E293B', marginBottom: 8, textAlign: 'center' }}>
      {title}
    </Text>
    <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
      {description}
    </Text>
    {action}
  </View>
);

// 2. Modern Card Component
const ModernAppointmentCard = ({ appointment, onPress, unreadCount = 0 }) => {
  const navigation = useNavigation();
  const starts = new Date(appointment.startsAt);
  const dayNumber = starts.getDate();
  const monthShort = starts.toLocaleDateString('id-ID', { month: 'short' });
  const timeText = starts.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  const isVirtual = appointment.type === 'virtual';
  const isPaid = appointment.payment?.status === 'succeeded';

  // --- OVERDUE LOGIC ---
  // Backend sudah auto-mark status 'overdue' untuk jadwal lewat & belum bayar
  const isOverdue = appointment.status === 'overdue';

  // Status Color Logic
  const getStatusColor = (status) => {
    switch (status) {
      case 'overdue': return { bg: '#FEF2F2', text: '#DC2626', icon: 'close-circle-outline' };
      case 'upcoming': return { bg: '#EEF2FF', text: '#4F46E5', icon: 'clock-outline' };
      case 'completed': return { bg: '#ECFDF5', text: '#059669', icon: 'check-circle-outline' };
      case 'cancelled': return { bg: '#FEF2F2', text: '#DC2626', icon: 'close-circle-outline' };
      default: return { bg: '#F1F5F9', text: '#64748B', icon: 'help-circle-outline' };
    }
  };

  const statusStyle = getStatusColor(appointment.status);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={{
        backgroundColor: 'white',
        borderRadius: 24,
        marginBottom: 20,
        shadowColor: isOverdue ? '#DC2626' : '#64748B',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isOverdue ? 0.12 : 0.08,
        shadowRadius: 16,
        elevation: 4,
        overflow: 'hidden',
        borderWidth: isOverdue ? 1.5 : 0,
        borderColor: isOverdue ? '#FECACA' : 'transparent',
      }}
    >
      {/* Top Header: Booking ID & Status */}
      <View style={{
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
        borderBottomWidth: 1, borderBottomColor: isOverdue ? '#FEE2E2' : '#F1F5F9'
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isOverdue ? '#FEF2F2' : '#F8FAFC', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
          <MaterialCommunityIcons name="ticket-outline" size={14} color={isOverdue ? '#DC2626' : '#64748B'} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: isOverdue ? '#DC2626' : '#64748B', marginLeft: 6 }}>
            {appointment.bookingCode}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Badge BELUM BAYAR (non-overdue) */}
          {!isPaid && !isOverdue && appointment.status !== 'cancelled' && (
            <View style={{ marginRight: 8, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#FFF7ED', borderRadius: 6 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#EA580C' }}>BELUM BAYAR</Text>
            </View>
          )}
          {/* Status Badge */}
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: statusStyle.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
            <MaterialCommunityIcons name={statusStyle.icon} size={14} color={statusStyle.text} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: statusStyle.text, marginLeft: 4, textTransform: 'capitalize' }}>
              {isOverdue ? 'LEWAT JADWAL' : appointment.status === 'upcoming' ? 'Akan Datang' : appointment.status}
            </Text>
          </View>
        </View>
      </View>

      {/* --- OVERDUE ALERT BANNER --- */}
      {isOverdue && (
        <View style={{
          flexDirection: 'row', alignItems: 'flex-start',
          backgroundColor: '#FEF2F2', paddingHorizontal: 16, paddingVertical: 12,
          marginHorizontal: 12, marginTop: 12, borderRadius: 12,
          borderWidth: 1, borderColor: '#FECACA',
        }}>
          <MaterialCommunityIcons name="alert-outline" size={18} color="#DC2626" style={{ marginTop: 1 }} />
          <Text style={{ flex: 1, fontSize: 12, color: '#991B1B', lineHeight: 18, marginLeft: 8, fontWeight: '500' }}>
            Jadwal ini telah terlewat dan pembayaran belum diselesaikan. Silakan hubungi admin atau lakukan pembayaran segera.
          </Text>
        </View>
      )}

      {/* Main Body */}
      <View style={{ flexDirection: 'row', padding: 20 }}>
        {/* Left: Date Block */}
        <View style={{
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: isOverdue ? '#FEF2F2' : '#F8FAFC', borderRadius: 16,
          width: 60, height: 70, marginRight: 16,
          borderWidth: 1, borderColor: isOverdue ? '#FECACA' : '#E2E8F0'
        }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: isOverdue ? '#DC2626' : '#1E293B' }}>{dayNumber}</Text>
          <Text style={{ fontSize: 12, fontWeight: '600', color: isOverdue ? '#F87171' : '#64748B', textTransform: 'uppercase' }}>{monthShort}</Text>
        </View>

        {/* Right: Info */}
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 4 }}>
            {appointment.dentist?.name}
          </Text>
          <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 8 }}>
            {appointment.dentist?.specialty || 'Dokter Gigi Umum'} • {appointment.clinic.name}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
              <MaterialCommunityIcons name="clock-time-four-outline" size={14} color={isOverdue ? '#DC2626' : '#6366F1'} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: isOverdue ? '#DC2626' : '#6366F1', marginLeft: 4 }}>
                {timeText} WIB
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name={isVirtual ? "video-outline" : "map-marker-outline"} size={14} color="#64748B" />
              <Text style={{ fontSize: 13, color: '#64748B', marginLeft: 4 }}>
                {isVirtual ? 'Konsultasi Online' : 'Kunjungan Klinik'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Footer Actions */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        {isOverdue ? (
          <Button
            mode="outlined"
            textColor="#DC2626"
            style={{ borderRadius: 12, elevation: 0, borderColor: '#DC2626', borderWidth: 1.5 }}
            labelStyle={{ fontWeight: '700', fontSize: 13 }}
            icon="alert-circle-outline"
            onPress={onPress}
          >
            Selesaikan Pembayaran
          </Button>
        ) : (
          <Button
            mode="contained"
            buttonColor="#EEF2FF"
            textColor="#4F46E5"
            style={{ borderRadius: 12, elevation: 0 }}
            labelStyle={{ fontWeight: '700', fontSize: 13 }}
            onPress={onPress}
          >
            Lihat Detail & Pembayaran
          </Button>
        )}
      </View>

      {/* Chat Nudge Row */}
      {(appointment.status === 'upcoming' || appointment.status === 'scheduled') && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            const dentistData = appointment.dentist || {};
            navigation.navigate('PatientTeledentistry', {
              appointmentId: appointment.id,
              dentistName: dentistData.name || 'Dokter Gigi',
              dentistSpecialty: dentistData.specialty || '',
              dentistAvatar: dentistData.avatar || null,
              dentistInitials: (dentistData.name || 'DG')
                .split(' ')
                .filter((w) => w.length > 0)
                .map((w) => w[0])
                .join('')
                .substring(0, 2)
                .toUpperCase(),
              appointmentDate: appointment.startsAt,
              roomRef: appointment.videoRoomRef,
            });
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderTopWidth: 1,
            borderTopColor: '#F1F5F9',
          }}
        >
          <MaterialCommunityIcons name="chat-processing-outline" size={16} color="#6366F1" />
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#6366F1', marginLeft: 8, flex: 1 }}>
            {unreadCount > 0 ? `${unreadCount} pesan belum dibaca` : 'Mulai chat'}
          </Text>
          {unreadCount > 0 && (
            <View
              style={{
                backgroundColor: '#DC2626',
                borderRadius: 10,
                minWidth: 20,
                height: 20,
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: 6,
                marginRight: 4,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
          <MaterialCommunityIcons name="chevron-right" size={16} color="#94A3B8" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

// --- MAIN SCREEN ---

const AppointmentListScreen = ({ unreadMap = {} }) => {
  const theme = useTheme();
  const navigation = useNavigation();
  const [tab, setTab] = useState('upcoming');
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(null);
  const { toast, showToast, hideToast } = useToast();

  // ... (Logika Auth & Fetch sama seperti sebelumnya, tidak diubah logic-nya) ...
  const checkAuthStatus = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      setIsLoggedIn(!!token);
      return !!token;
    } catch (e) {
      setIsLoggedIn(false);
      return false;
    }
  }, []);

  const fetchAppointments = useCallback(async (showLoading = true) => {
    try {
      const hasToken = await checkAuthStatus();
      if (!hasToken) {
        setAppointments([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (showLoading) setLoading(true);
      setError(null);

      const response = await getAppointments({ limit: 50 });

      if (response?.data && Array.isArray(response.data)) {
        // Transformasi Data
        const transformed = response.data.map(apt => ({
          id: apt.id,
          bookingCode: apt.bookingCode || `SRN-${String(apt.id).padStart(6, '0')}`,
          startsAt: apt.startsAt,
          endsAt: apt.endsAt,
          status: apt.status === 'scheduled' ? 'upcoming' : apt.status,
          type: apt.metadata?.appointmentType || apt.appointmentType || (apt.videoRoomRef ? 'virtual' : 'onsite'),
          reason: apt.reason || 'Konsultasi gigi',
          videoRoomRef: apt.videoRoomRef,
          dentist: {
            id: apt.dentistId,
            name: apt.dentist?.name || 'Dokter Gigi',
            title: apt.dentist?.title || null,
            specialty: apt.dentist?.specialization || 'Dokter Gigi Umum',
            dentistType: apt.dentist?.dentistType || 'clinic',
            avatar: apt.dentist?.avatar || null,
          },
          clinic: {
            id: apt.clinicBranchId,
            name: apt.dentist?.dentistType === 'independent' ? (apt.dentist?.clinicName || 'Praktik Mandiri') : (apt.clinicBranch?.branchName || apt.clinicBranch?.name || 'Klinik'),
            address: apt.dentist?.dentistType === 'independent' ? apt.dentist?.clinicAddress : apt.clinicBranch?.streetAddress,
          },
          payment: apt.payment ? {
            id: apt.payment.id,
            amount: apt.payment.amount,
            status: apt.payment.status,
            provider: apt.payment.provider,
          } : null,
          actions: { canJoinCall: apt.videoRoomRef && apt.status === 'scheduled' },
        }));

        setAppointments(transformed);
      } else {
        setAppointments([]);
      }
    } catch (err) {
      const message = err?.message || 'Gagal memuat janji temu';
      setError(message);
      showToast(message, 'error');
      if (__DEV__) {
        console.warn('[AppointmentList] Fetch failed:', err?.code || err?.status || err?.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [checkAuthStatus, showToast]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);
  useFocusEffect(useCallback(() => { fetchAppointments(false); }, [fetchAppointments]));

  const onRefresh = () => { setRefreshing(true); fetchAppointments(false); };

  // Filter Logic — overdue masuk ke tab Riwayat
  const filteredAppointments = appointments
    .filter(apt => {
      if (tab === 'upcoming') return apt.status === 'upcoming' || apt.status === 'scheduled';
      return apt.status === 'completed' || apt.status === 'cancelled' || apt.status === 'overdue';
    })
    .sort((a, b) => {
      // Dalam tab riwayat, overdue ditaruh paling atas
      if (tab !== 'upcoming') {
        const aOverdue = a.status === 'overdue' ? 1 : 0;
        const bOverdue = b.status === 'overdue' ? 1 : 0;
        if (aOverdue !== bOverdue) return bOverdue - aOverdue;
      }
      return new Date(a.startsAt) - new Date(b.startsAt);
    });

  const upcomingCount = appointments.filter(apt => apt.status === 'upcoming' || apt.status === 'scheduled').length;
  const historyCount = appointments.filter(apt => apt.status === 'completed' || apt.status === 'cancelled' || apt.status === 'overdue').length;

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>

      {/* --- HEADER --- */}
      <LinearGradient
        colors={[theme.colors.primary, '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: 60, paddingBottom: 30, paddingHorizontal: 24, borderBottomRightRadius: 32, borderBottomLeftRadius: 32 }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600', letterSpacing: 0.5 }}>JADWAL KONSULTASI</Text>
            <Text style={{ color: 'white', fontSize: 28, fontWeight: '800', marginTop: 4 }}>Janji Temu</Text>
          </View>
          {/* Floating Add Button */}
          <TouchableOpacity
            onPress={() => navigation.navigate('ClinicSearch')}
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)', width: 48, height: 48, borderRadius: 24,
              alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)'
            }}
          >
            <MaterialCommunityIcons name="plus" size={28} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* --- CONTENT CONTAINER --- */}
      <View style={{ flex: 1, marginTop: -20 }}>
        {/* Floating Tabs */}
        <View style={{ flexDirection: 'row', marginHorizontal: 24, backgroundColor: 'white', borderRadius: 20, padding: 6, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 }}>
          <TouchableOpacity
            onPress={() => setTab('upcoming')}
            style={{ flex: 1, paddingVertical: 10, borderRadius: 16, backgroundColor: tab === 'upcoming' ? '#EEF2FF' : 'transparent', alignItems: 'center' }}
          >
            <Text style={{ fontWeight: '700', color: tab === 'upcoming' ? '#4F46E5' : '#94A3B8' }}>Akan Datang ({upcomingCount})</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTab('history')}
            style={{ flex: 1, paddingVertical: 10, borderRadius: 16, backgroundColor: tab === 'history' ? '#EEF2FF' : 'transparent', alignItems: 'center' }}
          >
            <Text style={{ fontWeight: '700', color: tab === 'history' ? '#4F46E5' : '#94A3B8' }}>Riwayat ({historyCount})</Text>
          </TouchableOpacity>
        </View>

        {/* Scrollable List */}
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
        >
          {loading || isLoggedIn === null ? (
            <View style={{ marginTop: 50, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={{ marginTop: 16, color: '#94A3B8', fontWeight: '500' }}>Sinkronisasi jadwal...</Text>
            </View>
          ) : isLoggedIn === false ? (
            <ModernEmptyState
              icon="lock-outline"
              title="Akses Terbatas"
              description="Login untuk melihat jadwal konsultasi dan riwayat perawatan gigi Anda."
              action={
                <Button mode="contained" style={{ borderRadius: 12, marginTop: 10 }} onPress={() => navigation.navigate('SettingsTab', { screen: 'Login' })}>
                  Login Sekarang
                </Button>
              }
            />
          ) : error && filteredAppointments.length === 0 ? (
            <ModernEmptyState
              icon="wifi-alert"
              title="Koneksi Bermasalah"
              description={error}
              action={
                <Button mode="contained" style={{ borderRadius: 12, marginTop: 10 }} onPress={() => fetchAppointments()}>
                  Coba Lagi
                </Button>
              }
            />
          ) : filteredAppointments.length === 0 ? (
            <ModernEmptyState
              icon={tab === 'upcoming' ? 'calendar-blank-outline' : 'history'}
              title={tab === 'upcoming' ? "Tidak Ada Jadwal" : "Belum Ada Riwayat"}
              description={tab === 'upcoming' ? "Anda belum memiliki jadwal konsultasi gigi dalam waktu dekat." : "Anda belum menyelesaikan sesi konsultasi apapun."}
              action={
                tab === 'upcoming' && (
                  <Button mode="contained" style={{ borderRadius: 12, marginTop: 10 }} onPress={() => navigation.navigate('ClinicSearch')}>
                    Buat Janji Baru
                  </Button>
                )
              }
            />
          ) : (
            filteredAppointments.map((appointment) => (
              <ModernAppointmentCard
                key={appointment.id}
                appointment={appointment}
                unreadCount={unreadMap[appointment.id] || 0}
                onPress={() => navigation.navigate('DetailAppointment', { appointmentId: appointment.id, appointment })}
              />
            ))
          )}
        </ScrollView>
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

export default AppointmentListScreen;