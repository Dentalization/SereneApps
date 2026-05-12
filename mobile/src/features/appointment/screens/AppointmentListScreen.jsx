import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { View, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Animated, ScrollView } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAppointments } from '../../../services/appointmentService';
import { registerAppointmentReminderPushToken } from '../../../services/pushNotificationService';
import ValidationToast from '../../settings/components/ValidationToast';
import useToast from '../../../hooks/useToast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as THEME_COLORS, withOpacity } from '../../../theme/colors';
import { typography as TYPOGRAPHY } from '../../../theme/dimensions';

const COLORS = THEME_COLORS;

const formatRelativeSync = (date, now = new Date()) => {
  if (!date) return 'belum pernah';
  const seconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
  if (seconds < 60) return 'baru saja';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.floor(hours / 24)} hari lalu`;
};

// --- KOMPONEN PENDUKUNG ---

// 1. Empty State Modern
const ModernEmptyState = ({ title, description, icon, action }) => (
  <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 40 }}>
    <View style={{
      width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.surface,
      alignItems: 'center', justifyContent: 'center', marginBottom: 24
    }}>
      <MaterialCommunityIcons name={icon} size={48} color={COLORS.primary} />
    </View>
    <Text style={{ ...TYPOGRAPHY.h3, color: COLORS.textPrimary, marginBottom: 8, textAlign: 'center' }}>
      {title}
    </Text>
    <Text style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
      {description}
    </Text>
    {action}
  </View>
);

const UpcomingOnboardingEmptyState = ({ onClinicSearch, onDentistSearch }) => {
  const arrowAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(arrowAnim, { toValue: 8, duration: 500, useNativeDriver: true }),
        Animated.timing(arrowAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    ).start();
  }, [arrowAnim]);

  return (
    <View style={{ paddingHorizontal: 12, paddingTop: 28 }}>
      <LinearGradient colors={[withOpacity(COLORS.primary, 0.14), COLORS.surfaceElevated]} style={{ borderRadius: 28, padding: 22, borderWidth: 1, borderColor: withOpacity(COLORS.primary, 0.18) }}>
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: 96, height: 96, borderRadius: 34, backgroundColor: withOpacity(COLORS.primary, 0.1), alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <MaterialCommunityIcons name="seat-recline-normal" size={44} color={COLORS.primary} />
          </View>
          <Text style={{ ...TYPOGRAPHY.h3, color: COLORS.textPrimary, textAlign: 'center' }}>Mulai perjalanan perawatan gigi Anda</Text>
          <Text style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 21, marginTop: 8 }}>
            Temukan dokter, konsultasi virtual, dan simpan ringkasan medis digital dalam satu alur.
          </Text>
        </View>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ marginTop: 18 }}>
          {[
            ['chat-processing-outline', 'Chat langsung dengan dokter'],
            ['video-outline', 'Video konsultasi HD'],
            ['file-document-check-outline', 'Ringkasan medis digital'],
          ].map(([icon, label]) => (
            <View key={label} style={{ width: 220, borderRadius: 20, backgroundColor: COLORS.white, padding: 16, marginRight: 12, borderWidth: 1, borderColor: COLORS.border }}>
              <MaterialCommunityIcons name={icon} size={24} color={COLORS.primary} />
              <Text style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textPrimary, fontWeight: '800', marginTop: 10 }}>{label}</Text>
            </View>
          ))}
        </ScrollView>
        <Animated.View style={{ alignItems: 'center', marginTop: 14, transform: [{ translateY: arrowAnim }] }}>
          <MaterialCommunityIcons name="arrow-down" size={20} color={COLORS.primary} />
        </Animated.View>
        <View style={{ flexDirection: 'row', marginTop: 14 }}>
          <Button mode="contained" onPress={onClinicSearch} style={{ flex: 1, borderRadius: 14, marginRight: 8 }} buttonColor={COLORS.primary}>
            Cari Klinik
          </Button>
          <Button mode="outlined" onPress={onDentistSearch} style={{ flex: 1, borderRadius: 14, borderColor: COLORS.primary }} textColor={COLORS.primary}>
            Dokter Terdekat
          </Button>
        </View>
      </LinearGradient>
    </View>
  );
};

// 2. Modern Card Component
const ModernAppointmentCard = ({ appointment, onPress, onRebook, unreadCount = 0 }) => {
  const navigation = useNavigation();
  const starts = new Date(appointment.startsAt);
  const dayNumber = starts.getDate();
  const monthShort = starts.toLocaleDateString('id-ID', { month: 'short' });
  const timeText = starts.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  const isVirtual = appointment.type === 'virtual';
  const isPaid = appointment.payment?.status === 'succeeded';
  const isHistory = appointment.status === 'completed' || new Date(appointment.startsAt) < new Date();

  // --- OVERDUE LOGIC ---
  // Backend sudah auto-mark status 'overdue' untuk jadwal lewat & belum bayar
  const isOverdue = appointment.status === 'overdue';

  // Status Color Logic using Theme Tokens
  const getStatusColor = (status) => {
    switch (status) {
      case 'overdue': return { bg: withOpacity(COLORS.error, 0.1), text: COLORS.error, icon: 'close-circle-outline' };
      case 'upcoming': return { bg: withOpacity(COLORS.primary, 0.1), text: COLORS.primary, icon: 'clock-outline' };
      case 'completed': return { bg: withOpacity(COLORS.success, 0.1), text: COLORS.success, icon: 'check-circle-outline' };
      case 'cancelled': return { bg: withOpacity(COLORS.error, 0.1), text: COLORS.error, icon: 'close-circle-outline' };
      default: return { bg: COLORS.surface, text: COLORS.textSecondary, icon: 'help-circle-outline' };
    }
  };

  const statusStyle = getStatusColor(appointment.status);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Janji temu dengan ${appointment.dentist?.name}, ${appointment.status}`}
      style={{
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: 24,
        marginBottom: 20,
        shadowColor: isOverdue ? COLORS.error : COLORS.textSecondary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isOverdue ? 0.12 : 0.08,
        shadowRadius: 16,
        elevation: 4,
        overflow: 'hidden',
        borderWidth: isOverdue ? 1.5 : 0,
        borderColor: isOverdue ? withOpacity(COLORS.error, 0.3) : 'transparent',
      }}
    >
      {/* Top Header: Booking ID & Status */}
      <View style={{
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
        borderBottomWidth: 1, borderBottomColor: isOverdue ? withOpacity(COLORS.error, 0.2) : COLORS.border
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isOverdue ? withOpacity(COLORS.error, 0.1) : COLORS.surface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
          <MaterialCommunityIcons name="ticket-outline" size={14} color={isOverdue ? COLORS.error : COLORS.textSecondary} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: isOverdue ? COLORS.error : COLORS.textSecondary, marginLeft: 6 }}>
            {appointment.bookingCode}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Badge BELUM BAYAR (non-overdue) */}
          {!isPaid && !isOverdue && appointment.status !== 'cancelled' && (
            <View style={{ marginRight: 8, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: withOpacity(COLORS.warning, 0.1), borderRadius: 6 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.warning }}>BELUM BAYAR</Text>
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
          backgroundColor: withOpacity(COLORS.error, 0.1), paddingHorizontal: 16, paddingVertical: 12,
          marginHorizontal: 12, marginTop: 12, borderRadius: 12,
          borderWidth: 1, borderColor: withOpacity(COLORS.error, 0.2),
        }}>
          <MaterialCommunityIcons name="alert-outline" size={18} color={COLORS.error} style={{ marginTop: 1 }} />
          <Text style={{ flex: 1, fontSize: 12, color: COLORS.error, lineHeight: 18, marginLeft: 8, fontWeight: '500' }}>
            Jadwal ini telah terlewat dan pembayaran belum diselesaikan. Silakan hubungi admin atau lakukan pembayaran segera.
          </Text>
        </View>
      )}

      {/* Main Body */}
      <View style={{ flexDirection: 'row', padding: 20 }}>
        {/* Left: Date Block */}
        <View style={{
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: isOverdue ? withOpacity(COLORS.error, 0.1) : COLORS.background, borderRadius: 16,
          width: 60, height: 70, marginRight: 16,
          borderWidth: 1, borderColor: isOverdue ? COLORS.error : COLORS.border
        }}>
          <Text style={{ ...TYPOGRAPHY.h2, color: isOverdue ? COLORS.error : COLORS.textPrimary }}>{dayNumber}</Text>
          <Text style={{ ...TYPOGRAPHY.caption, fontWeight: '600', color: isOverdue ? COLORS.error : COLORS.textSecondary, textTransform: 'uppercase' }}>{monthShort}</Text>
        </View>

        {/* Right: Info */}
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text numberOfLines={1} style={{ ...TYPOGRAPHY.bodyLarge, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 }}>
            {appointment.dentist?.name}
          </Text>
          <Text style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, marginBottom: 8 }}>
            {appointment.dentist?.specialty || 'Dokter Gigi Umum'} • {appointment.clinic.name}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
              <MaterialCommunityIcons name="clock-time-four-outline" size={14} color={isOverdue ? COLORS.error : COLORS.primaryLight} />
              <Text style={{ ...TYPOGRAPHY.caption, fontWeight: '600', color: isOverdue ? COLORS.error : COLORS.primaryLight, marginLeft: 4 }}>
                {timeText} WIB
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name={isVirtual ? "video-outline" : "map-marker-outline"} size={14} color={COLORS.textSecondary} />
              <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginLeft: 4 }}>
                {isVirtual ? 'Konsultasi Online' : 'Kunjungan Klinik'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Footer Actions */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        {isHistory && !isOverdue ? (
          <Button
            mode="contained"
            buttonColor={COLORS.primary}
            textColor={COLORS.surfaceElevated}
            style={{ borderRadius: 12, elevation: 0 }}
            labelStyle={{ fontWeight: '700', fontSize: 13 }}
            icon="calendar-refresh"
            onPress={onRebook}
            accessibilityLabel="Pesan Lagi dengan Dokter yang Sama"
          >
            Pesan Lagi
          </Button>
        ) : isOverdue ? (
          <Button
            mode="outlined"
            textColor={COLORS.error}
            style={{ borderRadius: 12, elevation: 0, borderColor: COLORS.error, borderWidth: 1.5 }}
            labelStyle={{ fontWeight: '700', fontSize: 13 }}
            icon="alert-circle-outline"
            onPress={onPress}
            accessibilityLabel="Selesaikan Pembayaran Sekarang"
          >
            Selesaikan Pembayaran
          </Button>
        ) : (
          <Button
            mode="contained"
            buttonColor={withOpacity(COLORS.primary, 0.15)}
            textColor={COLORS.primary}
            style={{ borderRadius: 12, elevation: 0 }}
            labelStyle={{ fontWeight: '700', fontSize: 13 }}
            onPress={onPress}
            accessibilityLabel="Lihat Detail Janji Temu dan Pembayaran"
          >
            Lihat Detail & Pembayaran
          </Button>
        )}
      </View>

      {/* Chat Nudge Row */}
      {(appointment.status === 'upcoming' || appointment.status === 'scheduled' || appointment.status === 'confirmed') && (
        <TouchableOpacity
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={unreadCount > 0 ? `Buka chat, ada ${unreadCount} pesan baru` : "Buka chat dengan dokter"}
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
              isVirtual: appointment.type === 'virtual' || !!appointment.videoRoomRef,
            });
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderTopWidth: 1,
            borderTopColor: COLORS.border,
          }}
        >
          <MaterialCommunityIcons name="chat-processing-outline" size={16} color={COLORS.primary} />
          <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.primary, marginLeft: 8, flex: 1 }}>
            {unreadCount > 0 ? `${unreadCount} pesan baru` : 'Mulai chat'}
          </Text>
          {unreadCount > 0 && (
            <View
              style={{
                backgroundColor: COLORS.error,
                borderRadius: 10,
                minWidth: 20,
                height: 20,
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: 6,
                marginRight: 4,
              }}
              accessibilityLabel={`${unreadCount} pesan belum dibaca`}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.surfaceElevated }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
          <MaterialCommunityIcons name="chevron-right" size={16} color={COLORS.textMuted} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const SwipeQuickActions = ({ appointment, onDetail, onRebook }) => {
  const isHistory = appointment.status === 'completed' || new Date(appointment.startsAt) < new Date();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'stretch', marginBottom: 20, paddingLeft: 8 }}>
      {isHistory ? (
        <TouchableOpacity
          onPress={onRebook}
          accessibilityRole="button"
          accessibilityLabel="Pesan Lagi"
          style={{ width: 92, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}
        >
          <MaterialCommunityIcons name="calendar-refresh" size={22} color={COLORS.surfaceElevated} />
          <Text style={{ color: COLORS.surfaceElevated, fontWeight: '800', fontSize: 12, marginTop: 4 }}>Pesan Lagi</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={onDetail}
          accessibilityRole="button"
          accessibilityLabel="Lihat Detail"
          style={{ width: 84, borderRadius: 20, backgroundColor: withOpacity(COLORS.primary, 0.12), alignItems: 'center', justifyContent: 'center', marginLeft: 8, borderWidth: 1, borderColor: withOpacity(COLORS.primary, 0.22) }}
        >
          <MaterialCommunityIcons name="file-document-outline" size={22} color={COLORS.primary} />
          <Text style={{ color: COLORS.primary, fontWeight: '800', fontSize: 12, marginTop: 4 }}>Detail</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// 3. Animated List Item Wrapper (ANIM-003)
const AnimatedListItem = ({ children, index }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 350,
      delay: Math.min(index * 100, 1000), // Stagger cap at 10 items to prevent huge delays
      useNativeDriver: true,
    }).start();
  }, [anim, index]);

  return (
    <Animated.View style={{
      opacity: anim,
      transform: [{
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [30, 0]
        })
      }]
    }}>
      {children}
    </Animated.View>
  );
};

// --- MAIN SCREEN ---

const AppointmentListScreen = ({ unreadMap = {} }) => {
  const theme = useTheme();
  const navigation = useNavigation();
  const [tab, setTab] = useState('upcoming');
  const fadeAnim = useRef(new Animated.Value(1)).current; // UX-001: Cross fade
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [nowTick, setNowTick] = useState(new Date());
  const { toast, showToast, hideToast } = useToast();
  const insets = useSafeAreaInsets(); // UX-002: SafeAreaInsets

  const handleTabChange = (newTab) => {
    if (tab === newTab) return;
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setTab(newTab);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  };

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
          status: (apt.status === 'scheduled' || apt.status === 'confirmed') ? 'upcoming' : apt.status,
          type: apt.metadata?.appointmentType || apt.appointmentType || (apt.videoRoomRef ? 'virtual' : 'onsite'),
          reason: apt.reason || 'Konsultasi gigi',
          videoRoomRef: apt.videoRoomRef,
          dentist: {
            id: apt.dentistId,
            profileId: apt.dentist?.profileId || apt.dentist?.dentistProfileId || apt.metadata?.dentistProfileId || null,
            name: apt.dentist?.name || 'Dokter Gigi',
            title: apt.dentist?.title || null,
            specialty: apt.dentist?.specialization || 'Dokter Gigi Umum',
            dentistType: apt.dentist?.dentistType || 'clinic',
            avatar: apt.dentist?.avatar || null,
          },
          clinic: {
            id: apt.clinicBranchId,
            branchId: apt.clinicBranchId,
            profileId: apt.clinicBranch?.clinicProfileId || null,
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
        setLastSyncedAt(new Date());
      } else {
        setAppointments([]);
        setLastSyncedAt(new Date());
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

  useEffect(() => {
    const timer = setInterval(() => setNowTick(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    registerAppointmentReminderPushToken()
      .catch((err) => {
        if (__DEV__) console.warn('[AppointmentList] Push reminder registration skipped:', err?.message || err);
      });
  }, [isLoggedIn]);

  const onRefresh = () => { setRefreshing(true); fetchAppointments(false); };

  const handleOpenDetail = useCallback((appointment) => {
    navigation.navigate('DetailAppointment', { appointmentId: appointment.id, appointment });
  }, [navigation]);

  const handleRebook = useCallback((appointment) => {
    const profileId = appointment.dentist?.profileId || appointment.dentist?.id;
    navigation.navigate('BookingSlot', {
      dentistId: profileId,
      dentist: {
        id: profileId,
        userId: appointment.dentist?.id,
        name: appointment.dentist?.name,
        specialty: appointment.dentist?.specialty,
        avatarUrl: appointment.dentist?.avatar,
        dentistType: appointment.dentist?.dentistType,
        clinicContext: {
          profileId: appointment.clinic?.profileId,
          branchId: appointment.clinic?.branchId || appointment.clinic?.id,
          name: appointment.clinic?.name,
          address: appointment.clinic?.address,
        },
      },
      clinicId: appointment.clinic?.profileId,
      clinicBranchId: appointment.clinic?.branchId || appointment.clinic?.id,
      type: appointment.type || 'virtual',
      rebookingFromAppointmentId: appointment.id,
    });
  }, [navigation]);

  // Filter Logic — overdue atau waktu sudah lewat masuk ke tab Riwayat (sesuai request)
  const filteredAppointments = appointments
    .filter(apt => {
      const isPast = new Date(apt.startsAt) < new Date();
      if (tab === 'upcoming') {
        // Hanya tampilkan jika belum lewat DAN statusnya masih aktif
        return !isPast && (apt.status === 'upcoming' || apt.status === 'scheduled' || apt.status === 'confirmed');
      }
      // Pindahkan ke riwayat jika statusnya riwayat ATAU waktu sudah lewat
      return isPast || apt.status === 'completed' || apt.status === 'cancelled' || apt.status === 'overdue';
    })
    .sort((a, b) => {
      // Tab Upcoming: Urutkan dari yang PALING DEKAT (ASC)
      if (tab === 'upcoming') {
        return new Date(a.startsAt) - new Date(b.startsAt);
      }
      // Tab Riwayat: Urutkan dari yang PALING BARU (DESC)
      // Overdue tetap ditaruh paling atas karena masih butuh atensi
      const aOverdue = a.status === 'overdue' ? 1 : 0;
      const bOverdue = b.status === 'overdue' ? 1 : 0;
      if (aOverdue !== bOverdue) return bOverdue - aOverdue;

      return new Date(b.startsAt) - new Date(a.startsAt);
    });

  const upcomingCount = appointments.filter(apt => {
    const isPast = new Date(apt.startsAt) < new Date();
    return !isPast && (apt.status === 'upcoming' || apt.status === 'scheduled' || apt.status === 'confirmed');
  }).length;
  const historyCount = appointments.filter(apt => {
    const isPast = new Date(apt.startsAt) < new Date();
    return isPast || apt.status === 'completed' || apt.status === 'cancelled' || apt.status === 'overdue';
  }).length;
  const attentionCount = useMemo(() => {
    const now = Date.now();
    return appointments.reduce((count, apt) => {
      const startsAt = new Date(apt.startsAt).getTime();
      const within24h = startsAt >= now && startsAt <= now + 24 * 60 * 60 * 1000;
      const unread = unreadMap[apt.id] || 0;
      const overdue = apt.status === 'overdue';
      return count + (within24h ? 1 : 0) + (unread > 0 ? 1 : 0) + (overdue ? 1 : 0);
    }, 0);
  }, [appointments, unreadMap]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>

      {/* --- HEADER --- */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: Math.max(insets.top, 20) + 20, paddingBottom: 30, paddingHorizontal: 24, borderBottomRightRadius: 32, borderBottomLeftRadius: 32 }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: withOpacity(COLORS.surfaceElevated, 0.8), ...TYPOGRAPHY.caption, fontWeight: '600', letterSpacing: 0.5 }}>JADWAL KONSULTASI</Text>
            <Text style={{ color: COLORS.surfaceElevated, ...TYPOGRAPHY.h1, marginTop: 4 }}>Janji Temu</Text>
          </View>
          {/* Floating Add Button */}
          <TouchableOpacity
            onPress={() => navigation.navigate('ClinicSearch')}
            accessibilityLabel="Cari Klinik dan Buat Janji"
            accessibilityRole="button"
            style={{
              backgroundColor: withOpacity(COLORS.surfaceElevated, 0.2), width: 48, height: 48, borderRadius: 24,
              alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: withOpacity(COLORS.surfaceElevated, 0.3)
            }}
          >
            <MaterialCommunityIcons name="plus" size={28} color={COLORS.surfaceElevated} />
            {attentionCount > 0 ? (
              <View style={{ position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.error, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.surfaceElevated }}>
                <Text style={{ color: COLORS.white, fontSize: 10, fontWeight: '900' }}>{attentionCount > 9 ? '9+' : attentionCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* --- CONTENT CONTAINER --- */}
      <View style={{ flex: 1, marginTop: -20 }}>
        {/* Floating Tabs */}
        <View style={{ flexDirection: 'row', marginHorizontal: 24, backgroundColor: COLORS.surfaceElevated, borderRadius: 20, padding: 6, marginBottom: 16, shadowColor: COLORS.textPrimary, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 }}>
          <TouchableOpacity
            onPress={() => handleTabChange('upcoming')}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'upcoming' }}
            accessibilityLabel={`Tab Akan Datang, ${upcomingCount} janji`}
            style={{ flex: 1, paddingVertical: 10, borderRadius: 16, backgroundColor: tab === 'upcoming' ? withOpacity(COLORS.primary, 0.1) : 'transparent', alignItems: 'center' }}
          >
            <Text style={{ ...TYPOGRAPHY.bodySmall, fontWeight: '700', color: tab === 'upcoming' ? COLORS.primary : COLORS.textMuted }}>Akan Datang ({upcomingCount})</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleTabChange('history')}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'history' }}
            accessibilityLabel={`Tab Riwayat, ${historyCount} janji`}
            style={{ flex: 1, paddingVertical: 10, borderRadius: 16, backgroundColor: tab === 'history' ? withOpacity(COLORS.primary, 0.1) : 'transparent', alignItems: 'center' }}
          >
            <Text style={{ ...TYPOGRAPHY.bodySmall, fontWeight: '700', color: tab === 'history' ? COLORS.primary : COLORS.textMuted }}>Riwayat ({historyCount})</Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginHorizontal: 24, marginBottom: 12, flexDirection: 'row', alignItems: 'center' }}>
          {refreshing ? (
            <ActivityIndicator size={12} color={COLORS.primary} style={{ marginRight: 8 }} />
          ) : (
            <MaterialCommunityIcons name="sync" size={13} color={COLORS.textMuted} style={{ marginRight: 6 }} />
          )}
          <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textMuted, fontWeight: '600' }}>
            {refreshing ? 'Memperbarui...' : `Diperbarui ${formatRelativeSync(lastSyncedAt, nowTick)}`}
          </Text>
        </View>

        {/* Scrollable List */}
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <FlatList
            data={filteredAppointments}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              loading || isLoggedIn === null ? (
                <View style={{ marginTop: 50, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={{ marginTop: 16, color: COLORS.textMuted, fontWeight: '500' }}>Sinkronisasi jadwal...</Text>
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
              ) : error ? (
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
              ) : tab === 'upcoming' ? (
                <UpcomingOnboardingEmptyState
                  onClinicSearch={() => navigation.navigate('ClinicSearch')}
                  onDentistSearch={() => navigation.navigate('ClinicSearch', { initialFilter: 'nearby_dentists' })}
                />
              ) : (
                <ModernEmptyState
                  icon="history"
                  title="Belum Ada Riwayat"
                  description="Anda belum menyelesaikan sesi konsultasi apapun."
                />
              )
            )}
            renderItem={({ item, index }) => (
              <AnimatedListItem index={index}>
                <Swipeable
                  overshootRight={false}
                  renderRightActions={() => (
                    <SwipeQuickActions
                      appointment={item}
                      onDetail={() => handleOpenDetail(item)}
                      onRebook={() => handleRebook(item)}
                    />
                  )}
                >
                  <ModernAppointmentCard
                    appointment={item}
                    unreadCount={unreadMap[item.id] || 0}
                    onPress={() => handleOpenDetail(item)}
                    onRebook={() => handleRebook(item)}
                  />
                </Swipeable>
              </AnimatedListItem>
            )}
          />
        </Animated.View>
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
