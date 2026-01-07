import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EmptyState from '../../../components/shared/EmptyState';
import { getAppointments } from '../../../services/appointmentService';

const AppointmentListScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const [tab, setTab] = useState('upcoming');
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(null); // null = checking, true/false = known

  // Check if user is logged in
  const checkAuthStatus = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      console.log('[AppointmentList] Token exists:', !!token, token ? `(${token.substring(0, 20)}...)` : '(none)');
      setIsLoggedIn(!!token);
      return !!token;
    } catch (e) {
      console.log('[AppointmentList] Error checking token:', e);
      setIsLoggedIn(false);
      return false;
    }
  }, []);

  // Fetch appointments from API
  const fetchAppointments = useCallback(async (showLoading = true) => {
    try {
      // Check auth status first
      const hasToken = await checkAuthStatus();
      if (!hasToken) {
        setAppointments([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (showLoading) setLoading(true);
      setError(null);

      console.log('[AppointmentList] Fetching appointments...');
      const response = await getAppointments({ limit: 50 });
      
      if (response?.data && Array.isArray(response.data)) {
        // Transform API data to match UI format
        // Backend serializeAppointment returns camelCase fields
        const transformed = response.data.map(apt => ({
          id: apt.id,
          bookingCode: apt.bookingCode || `SRN-${String(apt.id).padStart(6, '0')}`,
          startsAt: apt.startsAt,
          endsAt: apt.endsAt,
          status: apt.status === 'scheduled' ? 'upcoming' : apt.status,
          type: apt.appointmentType || (apt.videoRoomRef ? 'virtual' : 'onsite'),
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
            name: apt.dentist?.dentistType === 'independent' 
              ? (apt.dentist?.clinicName || 'Praktik Mandiri')
              : (apt.clinicBranch?.branchName || apt.clinicBranch?.name || 'Klinik'),
            address: apt.dentist?.dentistType === 'independent'
              ? apt.dentist?.clinicAddress
              : apt.clinicBranch?.streetAddress,
          },
          payment: apt.payment ? {
            id: apt.payment.id,
            amount: apt.payment.amount,
            status: apt.payment.status, // pending, succeeded, failed, cancelled
            provider: apt.payment.provider,
          } : null,
          actions: {
            canJoinCall: apt.videoRoomRef && apt.status === 'scheduled',
          },
        }));
        
        setAppointments(transformed);
        console.log('[AppointmentList] Fetched', transformed.length, 'appointments');
      } else {
        setAppointments([]);
      }
    } catch (err) {
      console.error('[AppointmentList] Error fetching:', err);
      
      // Handle auth errors gracefully
      const status = err.response?.status;
      const errorMsg = err.response?.data?.error || err.message || '';
      
      if (status === 401) {
        // Token completely invalid or no token - need to login
        setIsLoggedIn(false);
        setAppointments([]);
        setError(null);
      } else if (status === 403 && errorMsg.includes('expired')) {
        // Token expired - api.js should have tried to refresh
        // If we're here, refresh also failed - need to login
        setIsLoggedIn(false);
        setAppointments([]);
        setError(null);
      } else if (status === 403) {
        // Other 403 (permission issues) - show error, don't logout
        setError('Anda tidak memiliki akses ke fitur ini. Pastikan akun Anda sebagai pasien.');
        setAppointments([]);
      } else {
        setError(err.message || 'Gagal memuat janji temu');
        setAppointments([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [checkAuthStatus]);

  // Fetch on mount
  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Refetch when screen is focused (after booking success)
  useFocusEffect(
    useCallback(() => {
      console.log('[AppointmentList] Screen focused, refreshing...');
      fetchAppointments(false);
    }, [fetchAppointments])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAppointments(false);
  };

  // Filter appointments by tab
  const filteredAppointments = appointments.filter(apt => {
    if (tab === 'upcoming') {
      return apt.status === 'upcoming' || apt.status === 'scheduled';
    }
    return apt.status === 'completed';
  });

  const upcomingCount = appointments.filter(
    apt => apt.status === 'upcoming' || apt.status === 'scheduled'
  ).length;
  const completedCount = appointments.filter(apt => apt.status === 'completed').length;

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* HEADER (ANCHOR) */}
      <LinearGradient
        colors={[theme.colors.primary, '#7F1DFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingHorizontal: 20,
          paddingTop: 52,
          paddingBottom: 32,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Janji temu Anda</Text>
            <Text style={{ color: 'white', fontSize: 26, fontWeight: '700', marginTop: 4 }}>
              Kelola jadwal
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
              {upcomingCount} aktif · {completedCount} selesai
            </Text>
          </View>
          <Button
            icon="calendar-plus"
            mode="contained"
            onPress={() => navigation.navigate('ClinicSearch')}
            labelStyle={{ fontWeight: '700' }}
            style={{ borderRadius: 16 }}
          >
            Buat janji
          </Button>
        </View>
      </LinearGradient>

      {/* WRAPPER UNTUK TABS + SCROLLABLE LIST */}
      <View style={{ flex: 1, marginTop: -24 }}>
        {/* STATUS TABS (ANCHOR) */}
        <View style={{ paddingHorizontal: 20 }}>
          <StatusTabs
            value={tab}
            onChange={setTab}
            upcomingCount={upcomingCount}
            completedCount={completedCount}
          />
        </View>

        {/* HANYA APPOINTMENT CARD YANG SCROLLABLE */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
        >
          {loading || isLoggedIn === null ? (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={{ marginTop: 12, color: '#64748B' }}>Memuat janji temu...</Text>
            </View>
          ) : isLoggedIn === false ? (
            <EmptyState
              icon="account-circle-outline"
              title="Masuk untuk Melihat Janji"
              description="Silakan masuk ke akun Anda untuk melihat dan mengelola janji temu"
              action={
                <Button
                  mode="contained"
                  onPress={() => navigation.navigate('SettingsTab', { screen: 'Login' })}
                  icon="login"
                >
                  Masuk
                </Button>
              }
            />
          ) : error ? (
            <EmptyState
              icon="alert-circle-outline"
              title="Gagal Memuat"
              description={error}
              action={
                <Button mode="contained" onPress={() => fetchAppointments()} icon="refresh">
                  Coba Lagi
                </Button>
              }
            />
          ) : filteredAppointments.length === 0 ? (
            <EmptyState
              icon="calendar-blank"
              title="Belum Ada Janji Temu"
              description="Buat janji temu pertama Anda dengan dokter gigi terpercaya"
              action={
                <Button
                  mode="contained"
                  onPress={() => navigation.navigate('ClinicSearch')}
                  icon="calendar-plus"
                >
                  Buat Janji Temu
                </Button>
              }
            />
          ) : (
            filteredAppointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onPress={() =>
                  navigation.navigate('DetailAppointment', {
                    appointmentId: appointment.id,
                    appointment: appointment,
                  })
                }
                onJoin={() =>
                  navigation.navigate('BookingConfirm', { appointmentId: appointment.id })
                }
                onReschedule={() =>
                  navigation.navigate('BookingSlot', {
                    dentistId: appointment.dentist.id,
                    appointmentId: appointment.id,
                  })
                }
              />
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const StatusTabs = ({ value, onChange, upcomingCount, completedCount }) => {
  const tabs = [
    { key: 'upcoming', label: 'Akan datang', count: upcomingCount },
    { key: 'completed', label: 'Selesai', count: completedCount },
  ];
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: 18,
        padding: 4,
        marginBottom: 20,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 4,
      }}
    >
      {tabs.map((tab) => {
        const active = value === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 14,
              backgroundColor: active ? '#EEF2FF' : 'transparent',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontWeight: '700',
                color: active ? '#4C1D95' : '#64748B',
              }}
            >
              {tab.label}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: active ? '#4C1D95' : '#94A3B8',
              }}
            >
              {tab.count} janji
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const AppointmentCard = ({ appointment, onPress, onJoin, onReschedule }) => {
  const starts = new Date(appointment.startsAt);
  const dateText = starts.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const timeText = starts.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const typeColor = appointment.type === 'virtual' ? '#2563EB' : '#0EA5E9';
  const canJoin = appointment.type === 'virtual' && appointment.actions?.canJoinCall;
  const showPrimary = appointment.status === 'upcoming';
  
  // Payment status colors and labels
  const getPaymentInfo = (payment) => {
    if (!payment) return { color: '#94A3B8', bg: '#F1F5F9', label: 'Belum bayar' };
    switch (payment.status) {
      case 'succeeded':
        return { color: '#059669', bg: '#D1FAE5', label: 'Lunas' };
      case 'pending':
      case 'requires_action':
        return { color: '#D97706', bg: '#FEF3C7', label: 'Menunggu' };
      case 'failed':
        return { color: '#DC2626', bg: '#FEE2E2', label: 'Gagal' };
      case 'cancelled':
        return { color: '#6B7280', bg: '#F3F4F6', label: 'Dibatalkan' };
      default:
        return { color: '#94A3B8', bg: '#F1F5F9', label: payment.status };
    }
  };
  
  const paymentInfo = getPaymentInfo(appointment.payment);
  const isIndependent = appointment.dentist?.dentistType === 'independent';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={{
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#EEF2FF',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
      }}
    >
      {/* Booking Code Header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
          paddingBottom: 8,
          borderBottomWidth: 1,
          borderBottomColor: '#F1F5F9',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MaterialCommunityIcons name="ticket-confirmation-outline" size={16} color="#6366F1" />
          <Text
            style={{
              marginLeft: 6,
              fontSize: 13,
              fontWeight: '700',
              color: '#6366F1',
              letterSpacing: 0.5,
            }}
          >
            {appointment.bookingCode}
          </Text>
        </View>
        {/* Payment Status Badge */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 999,
            backgroundColor: paymentInfo.bg,
          }}
        >
          <MaterialCommunityIcons
            name={appointment.payment?.status === 'succeeded' ? 'check-circle' : 'credit-card-outline'}
            size={12}
            color={paymentInfo.color}
          />
          <Text
            style={{
              marginLeft: 4,
              fontSize: 11,
              fontWeight: '600',
              color: paymentInfo.color,
            }}
          >
            {paymentInfo.label}
          </Text>
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <View>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: '#0F172A',
            }}
          >
            {dateText}
          </Text>
          <Text style={{ color: '#94A3B8' }}>{timeText} WIB</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {isIndependent && (
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: '#FEF3C7',
              }}
            >
              <Text
                style={{
                  color: '#D97706',
                  fontWeight: '700',
                  fontSize: 11,
                }}
              >
                Mandiri
              </Text>
            </View>
          )}
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: `${typeColor}1A`,
            }}
          >
            <Text
              style={{
                color: typeColor,
                fontWeight: '700',
                fontSize: 12,
              }}
            >
              {appointment.type === 'virtual' ? 'Online' : 'Di klinik'}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 18,
            backgroundColor: '#EEF2FF',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <MaterialCommunityIcons name="tooth-outline" size={28} color="#6366F1" />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontWeight: '700',
              color: '#0F172A',
            }}
          >
            {appointment.dentist?.title ? `${appointment.dentist.title} ` : ''}{appointment.dentist.name}
          </Text>
          <Text
            style={{
              color: '#6366F1',
              fontSize: 12,
              marginTop: 2,
            }}
          >
            {appointment.dentist?.specialty || 'Dokter Gigi Umum'}
          </Text>
          <Text
            style={{
              color: '#64748B',
              fontSize: 12,
              marginTop: 2,
            }}
          >
            {appointment.clinic.name}
          </Text>
        </View>
      </View>

      <View
        style={{
          marginTop: 14,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <MaterialCommunityIcons
          name="message-text-outline"
          size={16}
          color="#A5B4FC"
        />
        <Text
          style={{
            marginLeft: 6,
            color: '#475569',
          }}
        >
          {appointment.reason}
        </Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          marginTop: 18,
        }}
      >
        {showPrimary ? (
          <Button
            mode="contained"
            icon="eye"
            style={{ flex: 1 }}
            onPress={onPress}
          >
            Lihat Detail
          </Button>
        ) : (
          <Button
            mode="contained"
            style={{ flex: 1 }}
            onPress={onPress}
          >
            Lihat Detail
          </Button>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default AppointmentListScreen;