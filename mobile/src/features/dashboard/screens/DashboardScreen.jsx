import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, ScrollView, RefreshControl, TouchableOpacity, StatusBar, Dimensions, StyleSheet, Image, Linking, Animated } from 'react-native';
import { Text, Avatar, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getInitials } from '../../../utils/formatters';
import { resolveMediaUrl } from '../../../utils/media';
import { SAMPLE_ARTICLES } from '../data/articles';
import { SAMPLE_NOTIFICATIONS } from '../data/notifications';
import { getAppointments } from '../../../services/appointmentService';

// --- Imports Component ---
import * as FeaturedDoctorsMod from '../components/featuredDoctors';
import * as NearbyDentistsMod from '../components/nearbyDentists';
import * as QuickActionsMod from '../components/quickActions';
import * as NearbyClinicsMod from '../components/nearbyClinics';
import * as ArticleMod from '../components/article';
import QuickActionsManagerModal, { ALL_QUICK_ACTIONS, useSelectedQuickActions } from '../components/QuickActionsManagerModal';

const FeaturedDoctors = FeaturedDoctorsMod.default || FeaturedDoctorsMod;
const NearbyDentists = NearbyDentistsMod.default || NearbyDentistsMod;
const QuickActions = QuickActionsMod.default || QuickActionsMod;
const NearbyClinics = NearbyClinicsMod.default || NearbyClinicsMod;
const Article = ArticleMod.default || ArticleMod;

const { width, height } = Dimensions.get('window');

// Data Kategori Statis
const CATEGORIES = [
  { id: 'all', label: 'Semua', icon: 'view-grid-outline' },
  { id: 'orthodontic', label: 'Kawat Gigi', icon: 'tooth-outline' },
  { id: 'periodontic', label: 'Gusi', icon: 'water-outline' },
  { id: 'endodontic', label: 'Saraf', icon: 'lightning-bolt-outline' },
];

const LAINNYA_ACTION = {
  key: 'lainnya',
  label: 'Lainnya',
  icon: 'dots-grid',
  tint: '#F1F5F9',
  iconColor: '#64748B',
};

const DashboardScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useSelector((s) => s.auth);

  const avatarUrl = resolveMediaUrl(user?.avatar_url || null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [managerVisible, setManagerVisible] = useState(false);

  // Quick Actions dinamis dari AsyncStorage
  const { selected: selectedActionKeys, reload: reloadActions } = useSelectedQuickActions();
  const displayedActions = [
    ...selectedActionKeys
      .map((k) => ALL_QUICK_ACTIONS.find((a) => a.key === k))
      .filter(Boolean),
    LAINNYA_ACTION,
  ];

  // --- SCROLL ANIMATION ---
  const scrollY = useRef(new Animated.Value(0)).current;

  // Search bar: fade out + slide up smoothly
  const searchOpacity = scrollY.interpolate({
    inputRange: [0, 40, 70],
    outputRange: [1, 0.4, 0],
    extrapolate: 'clamp',
  });
  const searchTranslateY = scrollY.interpolate({
    inputRange: [0, 70],
    outputRange: [0, -15],
    extrapolate: 'clamp',
  });

  // Categories: staggered fade + slide (mulai sedikit setelah search)
  const catOpacity = scrollY.interpolate({
    inputRange: [0, 20, 60],
    outputRange: [1, 0.6, 0],
    extrapolate: 'clamp',
  });
  const catTranslateY = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [0, -10],
    extrapolate: 'clamp',
  });

  // Gradient yang SAMA dengan AIHomeScreen
  const gradientColors = ['#982598', '#982598'];

  const fetchUpcomingAppointments = useCallback(async () => {
    try {
      const response = await getAppointments({ limit: 10, status: 'scheduled,confirmed' });
      if (response?.data && Array.isArray(response.data)) {
        const transformed = response.data.map(apt => ({
          id: apt.id,
          dentist: {
            id: apt.dentistId,
            name: apt.dentist?.name || 'Dokter Gigi',
            specialty: apt.dentist?.specialization || 'Dokter Gigi Umum',
            avatar: apt.dentist?.avatar || null,
          },
          clinic: {
            id: apt.clinicBranchId,
            name: apt.dentist?.dentistType === 'independent' ? (apt.dentist?.clinicName || 'Praktik Mandiri') : (apt.clinicBranch?.branchName || 'Klinik'),
          },
          startsAt: apt.startsAt,
          status: apt.status === 'scheduled' ? 'upcoming' : apt.status,
          videoRoomRef: apt.videoRoomRef,
        }));
        setUpcomingAppointments(transformed);
      }
    } catch (err) {
      setUpcomingAppointments([]);
    }
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchUpcomingAppointments().finally(() => setRefreshing(false));
  }, [fetchUpcomingAppointments]);

  useEffect(() => { fetchUpcomingAppointments(); }, [fetchUpcomingAppointments]);

  // Handlers Navigasi
  const handleActionPress = (key) => {
    if (key === 'lainnya') { setManagerVisible(true); return; }
    if (key === 'dentists') navigation.navigate('DentistDirectory');
    else if (key === 'book') navigation.navigate('AppointmentTab', { screen: 'ClinicSearch' });
    else if (key === 'ai') navigation.navigate('AITab', { screen: 'AIHome' });
    else if (key === 'shop') navigation.navigate('ShopTab', { screen: 'ShopHome' });
    else if (key === 'history') navigation.navigate('AppointmentTab', { screen: 'AppointmentList' });
    else if (key === 'payment') navigation.navigate('AppointmentTab', { screen: 'Payment' });
    else if (key === 'chat') navigation.navigate('ChatTab');
    else if (key === 'nearby') navigation.navigate('NearbyClinics');
    else if (key === 'promo') navigation.navigate('Promo');
    else if (key === 'emergency') navigation.navigate('Emergency');
  };

  const handleOpenSearch = () => navigation.navigate('Search');
  const handleNotificationPress = () => navigation.navigate('Notifications', { notifications: SAMPLE_NOTIFICATIONS });

  // Handlers untuk Komponen Child (Featured, Nearby, dll)
  const handleAppointmentPress = (apt) => navigation.navigate('AppointmentTab', { screen: 'DetailAppointment', params: { appointmentId: apt.id } });
  const handleAppointmentAction = (apt) => {
    if (apt.videoRoomRef) navigation.navigate('VideoCall', { roomId: apt.videoRoomRef, appointmentId: apt.id });
    else navigation.navigate('AppointmentTab', { screen: 'DetailAppointment', params: { appointmentId: apt.id } });
  };
  const handleDoctorPress = (d) => navigation.navigate('DentistDetail', { dentistId: d.id, dentist: d });
  const handleClinicPress = (c) => navigation.navigate('ClinicDetail', { clinicId: c.id, clinic: c });
  const handleClinicBook = (c) => navigation.navigate('AppointmentTab', { screen: 'ClinicDetail', params: { clinicId: c.id, clinic: c } });
  const handleBook = (d) => navigation.navigate('AppointmentTab', { screen: 'BookingSlot', params: { dentistId: d.id, dentist: d } });
  const handleArticleOpen = (url) => { if (url) { try { Linking.openURL(url); } catch (e) { } } };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* --- LAYER 1: FIXED GRADIENT BACKGROUND (hanya top area) --- */}
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.topGradient}
      />

      {/* --- LAYER 2: FIXED TOP BAR (PROFILE) --- */}
      <View style={[styles.fixedTopBar, { paddingTop: insets.top + 10 }]}>

        {/* --- TAMBAHKAN INI DI DALAM VIEW TOP BAR --- */}
        {/* Ini akan menjadi background gradient khusus untuk top bar */}
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill} // KUNCI: Agar memenuhi area parent View
        />

        {/* Konten Profile (akan berada di atas gradient) */}
        <View style={styles.profileRow}>
          <View style={styles.profileInfo}>
            <View style={styles.avatarContainer}>
              {avatarUrl ? (
                <Avatar.Image size={40} source={{ uri: avatarUrl }} />
              ) : (
                <Avatar.Text size={40} label={getInitials(user?.name || 'Tamu')} style={{ backgroundColor: 'white' }} labelStyle={{ color: '#4F46E5' }} />
              )}
              <View style={styles.onlineBadge} />
            </View>
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.greetingText}>Halo, {user?.name ? user.name.split(' ')[0] : 'Tamu'}</Text>
              <Text style={styles.subGreetingText}>Siap merawat gigimu?</Text>
            </View>
          </View>

          <TouchableOpacity onPress={handleNotificationPress} style={styles.iconButton}>
            <MaterialCommunityIcons name="bell-outline" size={24} color="white" />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>
      </View>

      {/* --- LAYER 3: MAIN SCROLLVIEW --- */}
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: insets.top + 80, // Memberi ruang untuk Top Bar
          paddingBottom: 20
        }}
        showsVerticalScrollIndicator={false}
        bounces={true}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" progressViewOffset={insets.top + 80} />
        }
      >

        {/* A. HEADER CONTENT (Search & Categories) */}
        {/* Ini berada di atas gradient, sebelum white sheet */}
        <View style={styles.headerContent}>

          {/* Search Bar — smooth fade + slide up on scroll */}
          <Animated.View style={{
            opacity: searchOpacity,
            transform: [{ translateY: searchTranslateY }],
          }}>
            <TouchableOpacity activeOpacity={0.9} onPress={handleOpenSearch} style={styles.searchBar}>
              <MaterialCommunityIcons name="magnify" size={22} color="#4F46E5" />
              <Text style={styles.searchText}>Cari dokter, klinik...</Text>
              <View style={styles.searchDivider} />
              <MaterialCommunityIcons name="tune-vertical" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </Animated.View>

          {/* Categories — staggered fade + slide up */}
          <Animated.View style={{
            opacity: catOpacity,
            transform: [{ translateY: catTranslateY }],
          }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
              {CATEGORIES.map((c) => {
                const active = selectedCategory === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setSelectedCategory(c.id)}
                    style={[styles.catChip, active ? styles.activeCat : styles.inactiveCat]}
                  >
                    <MaterialCommunityIcons name={c.icon} size={18} color={active ? '#4F46E5' : 'rgba(255,255,255,0.9)'} />
                    <Text style={[styles.catText, active ? { color: '#4F46E5', fontWeight: '700' } : { color: 'white' }]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Animated.View>
        </View>

        {/* B. WHITE SHEET (Main Content) */}
        {/* Menggunakan marginTop negatif untuk menumpuk Header Content */}
        <View style={styles.whiteSheet}>
          {/* Handle Indicator */}
          <View style={styles.sheetHandle} />

          {/* Quick Actions Grid */}
          <View style={styles.gridContainer}>
            {displayedActions.map((action) => (
              <TouchableOpacity
                key={action.key}
                style={[
                  styles.gridItem,
                  action.key === 'lainnya' && styles.gridItemLainnya,
                ]}
                onPress={() => handleActionPress(action.key)}
              >
                <View style={[styles.gridIcon, { backgroundColor: action.tint }]}>
                  <MaterialCommunityIcons name={action.icon} size={24} color={action.iconColor} />
                </View>
                <Text style={styles.gridLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Content Sections */}
          <View style={{ gap: 24 }}>
            <FeaturedDoctors appointments={upcomingAppointments} onDoctorPress={handleAppointmentPress} onJoinCall={handleAppointmentAction} />
            <NearbyClinics onClinicPress={handleClinicPress} onBook={handleClinicBook} onSeeAll={() => navigation.navigate('NearbyClinics')} />
            <NearbyDentists onDoctorPress={handleDoctorPress} onMessage={() => { }} onBook={handleBook} onSeeAll={() => navigation.navigate('NearbyDentists')} />
            <Article articles={SAMPLE_ARTICLES} onOpen={handleArticleOpen} onSeeAll={() => navigation.navigate('ArticleList')} />
          </View>

          {/* Bottom Spacer */}
          <View style={{ height: 16 }} />
        </View>

      </Animated.ScrollView>

      {/* Quick Actions Manager Modal */}
      <QuickActionsManagerModal
        visible={managerVisible}
        onClose={() => setManagerVisible(false)}
        selectedKeys={selectedActionKeys}
        onSave={(newKeys) => {
          reloadActions();
          setManagerVisible(false);
        }}
      />
    </View>
  );
};

// --- STYLES (Inline-like structure for easy copying) ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Sama dengan whiteSheet agar tidak ada ungu di bawah
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.45, // Gradient hanya menutupi ~45% atas layar
  },

  // --- TOP BAR ---
  fixedTopBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 50, // Paling atas
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0, right: 0,
    width: 12, height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981', // Green success
    borderWidth: 2, borderColor: '#4F46E5', // Match gradient start
  },
  greetingText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.3,
  },
  subGreetingText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
  },
  iconButton: {
    width: 40, height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  notifDot: {
    position: 'absolute', top: 10, right: 10,
    width: 8, height: 8,
    borderRadius: 4, backgroundColor: '#EF4444',
  },

  // --- SCROLL CONTENT ---
  scrollView: {
    flex: 1,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingBottom: 50, // Memberi ruang agar White Sheet bisa overlap
  },

  // Search Bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  searchText: {
    flex: 1,
    fontSize: 14,
    color: '#94A3B8',
    marginLeft: 10,
    fontWeight: '500',
  },
  searchDivider: {
    width: 1, height: 20,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
  },

  // Categories
  categoriesScroll: {
    marginBottom: 4,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  activeCat: {
    backgroundColor: '#white',
    backgroundColor: 'white', // Harus white agar terlihat "active"
    elevation: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  inactiveCat: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  catText: {
    fontSize: 12, fontWeight: '600', marginLeft: 8,
  },

  // --- WHITE SHEET ---
  whiteSheet: {
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 8,
    paddingTop: 12,
    marginTop: -30, // KUNCI: Efek Overlap ke atas header content
    paddingBottom: 20,
  },
  sheetHandle: {
    width: 40, height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 24,
    marginTop: 8,
  },

  // Quick Actions Grid
  gridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  gridItem: {
    alignItems: 'center',
    width: (width - 24) / 4,
  },
  gridItemLainnya: {
    opacity: 0.85,
  },
  gridIcon: {
    width: 52, height: 52,
    borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
  },
  gridLabel: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default DashboardScreen;