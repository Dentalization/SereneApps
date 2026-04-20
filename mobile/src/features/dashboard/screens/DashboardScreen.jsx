import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  StyleSheet,
  Linking,
  Animated,
  Easing
} from 'react-native';
import { Text, Avatar, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
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

  // --- ANIMATIONS ---
  const scrollY = useRef(new Animated.Value(0)).current;
  const mountAnim = useRef(new Animated.Value(0)).current;

  // Modern UI Gradient: Base Ungu (#982598) dengan sedikit sentuhan dimensi
  // Modern UI Gradient: Brand Violet
  const primaryPurple = '#62109F';
  const gradientColors = ['#62109F', '#7C3AED'];

  // Run entrance animation on mount
  useEffect(() => {
    Animated.timing(mountAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [mountAnim]);

  // Entrance interpolations
  const sheetTranslateY = mountAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });
  const sheetOpacity = mountAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  // Scroll animations
  const searchOpacity = scrollY.interpolate({
    inputRange: [0, 40, 80],
    outputRange: [1, 0.3, 0],
    extrapolate: 'clamp',
  });
  const searchTranslateY = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, -20],
    extrapolate: 'clamp',
  });

  const catOpacity = scrollY.interpolate({
    inputRange: [0, 30, 70],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  });
  const catTranslateY = scrollY.interpolate({
    inputRange: [0, 70],
    outputRange: [0, -15],
    extrapolate: 'clamp',
  });

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

      {/* TOP OVER-SCROLL FILLER (Purple) */}
      <View style={styles.topOverscrollFiller} />

      {/* FIXED GRADIENT BACKGROUND */}
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.topGradient}
      />

      {/* FIXED TOP BAR (PROFILE) */}
      <View style={[styles.fixedTopBar, { paddingTop: insets.top + 12 }]}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Decorative Background Accents */}
        <View style={styles.bubbleContainer}>
          <View style={[styles.bubble, { width: 180, height: 180, borderRadius: 90, top: -60, right: -60, backgroundColor: 'rgba(255,255,255,0.08)' }]} />
          <View style={[styles.bubble, { width: 120, height: 120, borderRadius: 60, top: 40, left: -40, backgroundColor: 'rgba(255,255,255,0.05)' }]} />
        </View>

        <View style={styles.profileRow}>
          <View style={styles.profileInfo}>
            <View style={styles.avatarContainer}>
              {avatarUrl ? (
                <Avatar.Image size={52} source={{ uri: avatarUrl }} style={styles.avatarShadow} />
              ) : (
                <Avatar.Text
                  size={52}
                  label={getInitials(user?.name || 'Tamu')}
                  style={[styles.avatarShadow, { backgroundColor: 'white' }]}
                  labelStyle={{ color: primaryPurple, fontSize: 18, fontWeight: '700' }}
                />
              )}
              <View style={styles.onlineBadge} />
            </View>
            <View style={{ marginLeft: 14 }}>
              <Text style={styles.greetingText}>Halo, {user?.name ? user.name.split(' ')[0] : 'Tamu'}</Text>
              <Text style={styles.subGreetingText}>Siap merawat gigimu hari ini?</Text>
            </View>
          </View>

          <TouchableOpacity activeOpacity={0.7} onPress={handleNotificationPress} style={styles.iconButton}>
            <MaterialCommunityIcons name="bell-badge-outline" size={24} color="white" />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>
      </View>

      {/* MAIN SCROLLVIEW */}
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: insets.top + 90,
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" progressViewOffset={insets.top + 90} />
        }
      >

        {/* HEADER CONTENT: Search & Categories */}
        <View style={styles.headerContent}>
          <Animated.View style={{ opacity: searchOpacity, transform: [{ translateY: searchTranslateY }] }}>
            <TouchableOpacity activeOpacity={0.9} onPress={handleOpenSearch} style={styles.searchBar}>
              <MaterialCommunityIcons name="magnify" size={24} color={primaryPurple} />
              <Text style={styles.searchText}>Cari dokter, klinik, artikel...</Text>
              <View style={styles.searchDivider} />
              <TouchableOpacity activeOpacity={0.7} style={styles.filterButton}>
                <MaterialCommunityIcons name="tune-variant" size={20} color="#FFF" />
              </TouchableOpacity>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={{ opacity: catOpacity, transform: [{ translateY: catTranslateY }] }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
              {CATEGORIES.map((c) => {
                const active = selectedCategory === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    activeOpacity={0.7}
                    onPress={() => setSelectedCategory(c.id)}
                    style={[styles.catChip, active ? styles.activeCat : styles.inactiveCat]}
                  >
                    <MaterialCommunityIcons
                      name={c.icon}
                      size={20}
                      color={active ? primaryPurple : 'rgba(255,255,255,0.8)'}
                    />
                    <Text style={[styles.catText, active ? { color: primaryPurple } : { color: 'white' }]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Animated.View>
        </View>

        {/* WHITE SHEET (Main Content with Entrance Animation) */}
        <Animated.View
          style={[
            styles.whiteSheet,
            {
              opacity: sheetOpacity,
              transform: [{ translateY: sheetTranslateY }]
            }
          ]}
        >
          {/* Handle Indicator */}
          <View style={styles.sheetHandle} />

          {/* Quick Actions Grid */}
          <View style={styles.gridContainer}>
            {displayedActions.map((action) => (
              <TouchableOpacity
                key={action.key}
                activeOpacity={0.6}
                style={[styles.gridItem, action.key === 'lainnya' && styles.gridItemLainnya]}
                onPress={() => handleActionPress(action.key)}
              >
                <View style={[styles.gridIcon, { backgroundColor: action.tint }]}>
                  <MaterialCommunityIcons name={action.icon} size={26} color={action.iconColor} />
                </View>
                {/* UBAH: Dihapus numberOfLines={1} agar teks bisa turun ke bawah jika panjang */}
                <Text style={styles.gridLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Content Sections */}
          <View style={{ gap: 28, paddingHorizontal: 4 }}>
            <FeaturedDoctors appointments={upcomingAppointments} onDoctorPress={handleAppointmentPress} onJoinCall={handleAppointmentAction} />
            <NearbyClinics onClinicPress={handleClinicPress} onBook={handleClinicBook} onSeeAll={() => navigation.navigate('NearbyClinics')} />
            <NearbyDentists onDoctorPress={handleDoctorPress} onMessage={() => { }} onBook={handleBook} onSeeAll={() => navigation.navigate('NearbyDentists')} />
            <Article articles={SAMPLE_ARTICLES} onOpen={handleArticleOpen} onSeeAll={() => navigation.navigate('ArticleList')} />
          </View>

          <View style={{ height: 24 }} />
        </Animated.View>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Neutral background for the bottom/overscroll
  },
  topGradient: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: height * 0.65, // Extended to cover search and categories without gaps
  },
  fixedTopBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 50,
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
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
  avatarShadow: {
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2, right: 2,
    width: 14, height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2.5, borderColor: '#982598',
  },
  greetingText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  subGreetingText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
    fontWeight: '500',
  },
  iconButton: {
    width: 44, height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  notifDot: {
    position: 'absolute', top: 10, right: 10,
    width: 10, height: 10,
    borderRadius: 5, backgroundColor: '#EF4444',
    borderWidth: 1.5, borderColor: '#982598',
  },

  // SCROLL CONTENT
  scrollView: {
    flex: 1,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingBottom: 35, // Reduced to tighten the gap to the white sheet
  },

  // Modern Search Bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 10,
    paddingLeft: 18,
    paddingRight: 10,
    marginBottom: 24,
    shadowColor: '#62109F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  searchText: {
    flex: 1,
    fontSize: 17,
    color: '#64748B',
    marginLeft: 12,
    fontWeight: '500',
  },
  searchDivider: {
    width: 1, height: 24,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
  },
  filterButton: {
    backgroundColor: '#982598',
    padding: 8,
    borderRadius: 12,
  },

  // Categories
  categoriesScroll: {
    marginBottom: 10,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    marginRight: 12,
  },
  activeCat: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  inactiveCat: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  catText: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
    letterSpacing: 0.3,
  },
  // New Decorative Elements
  topOverscrollFiller: {
    position: 'absolute',
    top: -height,
    left: 0, right: 0,
    height: height,
    backgroundColor: '#62109F', // Matches the start of the gradient
  },
  bubbleContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  bubble: {
    position: 'absolute',
  },

  // WHITE SHEET
  whiteSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 4, // Dipertahankan lebar
    paddingTop: 12,
    marginTop: -25, // Refined overlap
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 10,
  },
  sheetHandle: {
    width: 48, height: 5,
    backgroundColor: '#CBD5E1',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 30,
    marginTop: 8,
  },

  // Quick Actions Grid
  gridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start', // Penting agar sejajar atas jika ada teks 2 baris
    flexWrap: 'wrap',
    marginBottom: 32,
    paddingHorizontal: 4,
  },
  gridItem: {
    alignItems: 'center',
    width: (width - 16) / 4, // RUMUS PAS: width dikurangi total padding luar
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  gridItemLainnya: {
    opacity: 0.9,
  },
  gridIcon: {
    width: 56, height: 56,
    borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
  },
  gridLabel: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 18, // Ruang rapi untuk teks baris kedua
  },
});

export default DashboardScreen;