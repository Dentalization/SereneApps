import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Image,
  Dimensions,
  Platform,
  PixelRatio,
  Animated,
} from 'react-native';
import {
  ActivityIndicator,
  Text,
  Searchbar,
  Chip,
  useTheme,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import useNearbyDentists from '../../../hooks/useNearbyDentists';
import { getDentistDirectory } from '../../../services/dentistService';
import ValidationToast from '../../settings/components/ValidationToast';
import useToast from '../../../hooks/useToast';
import { colors as THEME_COLORS } from '../../../theme/colors';
import { API_BASE_URL } from '../../../services/api';

// --- UTILS RESPONSIVE ---
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 375;

const normalize = (size) => {
  const newSize = size * scale;
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  } else {
    return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 1;
  }
};

const DICEBEAR_BG = encodeURIComponent('8B5CF6,A78BFA,C4B5FD,DDD6FE');
const API_BASE = API_BASE_URL.replace(/\/$/, '');

const normalizeDicebear = (url = '', fallbackSeed) => {
  if (!url.includes('dicebear.com')) {
    return url;
  }
  if (!url) {
    return `https://api.dicebear.com/7.x/avataaars/png?seed=${fallbackSeed || 'dentist'}&backgroundColor=${DICEBEAR_BG}&size=256`;
  }
  return url.replace('/svg', '/png').replace('format=svg', 'format=png');
};

const resolveAvatar = (path, fallbackSeed) => {
  if (!path) {
    return `https://api.dicebear.com/7.x/avataaars/png?seed=${fallbackSeed || 'dentist'}&backgroundColor=${DICEBEAR_BG}&size=256`;
  }
  if (/^https?:\/\//i.test(path)) {
    return normalizeDicebear(path, fallbackSeed);
  }
  const normalized = path.startsWith('/') ? path.slice(1) : path;
  return `${API_BASE}/${normalized}`;
};

const pickAvatarPath = (source = {}) =>
  source?.avatarUrl ||
  source?.avatar_url ||
  source?.avatar ||
  source?.image ||
  source?.imageUrl ||
  source?.photo ||
  source?.photo_url ||
  source?.profilePicture ||
  source?.profile_picture ||
  null;

const extractClinicContext = (dentist = {}) => {
  const profileId =
    dentist?.clinicProfileId ||
    dentist?.clinic_profile_id ||
    dentist?.clinicId ||
    dentist?.clinic_id;
  const branchId =
    dentist?.clinicBranchId ||
    dentist?.clinic_branch_id ||
    dentist?.assigned_branch_id;

  if (!profileId && !branchId) return null;

  return {
    profileId: profileId?.toString?.() || null,
    branchId: branchId?.toString?.() || null,
    name: dentist?.clinicBranchName || dentist?.clinicName,
    address: dentist?.clinicBranchAddress || dentist?.clinicAddress,
    distance: dentist?.distance || dentist?.distanceKm,
  };
};

const haversineDistance = (lat1, lon1, lat2, lon2) => {
  if (
    [lat1, lon1, lat2, lon2].some(
      (coord) => coord === null || coord === undefined || !Number.isFinite(coord)
    )
  ) {
    return null;
  }
  const R = 6371;
  const toRad = (deg) => deg * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
};

const formatDentistName = (name) => {
  if (!name) return 'Dokter Gigi';
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('drg.') || lower.startsWith('drg ') || lower.startsWith('dr.') || lower.startsWith('dr ')) {
    return trimmed;
  }
  return `drg. ${trimmed}`;
};

const normalizeSpecialty = (specialization) => {
  if (!specialization) return 'Dokter Gigi';
  const spec = specialization.trim().toLowerCase();
  if (spec.includes('ortho')) {
    return 'Spesialis Ortodonsia (Sp.Ort)';
  }
  if (spec.includes('pediat') || spec.includes('anak')) {
    return 'Spesialis Kedokteran Gigi Anak (Sp.KGA)';
  }
  if (spec.includes('conserv') || spec.includes('endo') || spec.includes('konservasi')) {
    return 'Spesialis Konservasi Gigi (Sp.KG)';
  }
  if (spec.includes('perio')) {
    return 'Spesialis Periodonsia (Sp.Perio)';
  }
  if (spec.includes('prostho') || spec.includes('prostodonsia')) {
    return 'Spesialis Prostodonsia (Sp.Pros)';
  }
  if (spec.includes('surgery') || spec.includes('bedah')) {
    return 'Spesialis Bedah Mulut (Sp.BM)';
  }
  if (spec.includes('medicine') || spec.includes('penyakit mulut')) {
    return 'Spesialis Penyakit Mulut (Sp.PM)';
  }
  if (spec.includes('digital')) {
    return 'Kedokteran Gigi Digital';
  }
  if (spec.includes('implant')) {
    return 'Implantologi';
  }
  if (spec.includes('cosmetic') || spec.includes('estetika')) {
    return 'Estetika Gigi';
  }
  if (spec.includes('general') || spec.includes('umum') || spec.includes('dentist')) {
    return 'Dokter Gigi Umum';
  }
  return 'Dokter Gigi';
};

const normalizeRawDentist = (dentist, userCoords = null) => {
  if (!dentist) return null;
  const years = dentist?.yearsOfExperience || 0;
  const fallbackRating = 4 + Math.min(1, years / 15);

  let distance = null;
  if (userCoords && typeof userCoords.latitude === 'number' && dentist?.latitude && dentist?.longitude) {
    distance = haversineDistance(
      userCoords.latitude,
      userCoords.longitude,
      parseFloat(dentist.latitude),
      parseFloat(dentist.longitude)
    );
  }

  const avatarPath = pickAvatarPath(dentist);
  return {
    id: dentist?.id?.toString?.() || dentist?.userId?.toString?.() || `dentist-${dentist?.name}`,
    name: formatDentistName(dentist?.name || dentist?.fullname),
    specialty: normalizeSpecialty(dentist?.specialization || dentist?.primarySpecialization || dentist?.primary_specialization),
    clinic: dentist?.clinicName || dentist?.clinic || dentist?.clinicAddress || 'Klinik gigimu',
    clinicContext: extractClinicContext(dentist),
    rating: Number((dentist?.rating || fallbackRating).toFixed(1)),
    reviews: dentist?.reviewCount || dentist?.reviews || 0,
    price: dentist?.consultationFee || dentist?.price || 0,
    image: resolveAvatar(avatarPath, dentist?.id || dentist?.userId),
    distance: distance,
    raw: dentist,
  };
};

const DentistSearchScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { toast, showToast, hideToast } = useToast();

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all'); // Default to 'all' to show all dentists from start
  const [filteredDentists, setFilteredDentists] = useState([]);
  const [allDirectoryDentists, setAllDirectoryDentists] = useState([]);
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const shimmer = useRef(new Animated.Value(0.3)).current;

  const {
    dentists,
    loading: nearbyLoading,
    error: nearbyError,
    refresh: refreshNearby,
    location,
  } = useNearbyDentists({
    radius: 50, // Larger default search radius
    limit: 100,
    autoFetch: true,
    type: 'clinic',
  });

  const loading = nearbyLoading || directoryLoading;
  const error = nearbyError;
  const dentistsList = dentists || [];

  const fetchDirectoryDentists = useCallback(async () => {
    try {
      setDirectoryLoading(true);
      const res = await getDentistDirectory({ verifiedOnly: true, limit: 300 });
      const items = res?.data?.dentists ?? res?.dentists ?? [];
      setAllDirectoryDentists(items);
    } catch (err) {
      console.log('Error fetching directory in DentistSearchScreen:', err);
    } finally {
      setDirectoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDirectoryDentists();
  }, [fetchDirectoryDentists]);

  const handleRefresh = useCallback(async () => {
    refreshNearby();
    await fetchDirectoryDentists();
  }, [refreshNearby, fetchDirectoryDentists]);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Persist filter preference
  useEffect(() => {
    AsyncStorage.setItem('dentistSearchFilter', selectedFilter).catch(() => null);
  }, [selectedFilter]);

  // Load saved filter
  useEffect(() => {
    AsyncStorage.getItem('dentistSearchFilter').then((saved) => {
      if (saved && ['all', 'nearby', 'highest_rated'].includes(saved)) {
        setSelectedFilter(saved);
      }
    }).catch(() => null);
  }, []);

  // Shimmer animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 0.7, duration: 600, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0.3, duration: 600, useNativeDriver: true }),
      ]),
    ).start();
  }, [shimmer]);

  // Apply filtering and searching
  useEffect(() => {
    let sourceData = [];
    if (allDirectoryDentists && allDirectoryDentists.length > 0) {
      sourceData = allDirectoryDentists.map((d) => normalizeRawDentist(d, location)).filter(Boolean);
    } else if (Array.isArray(dentistsList)) {
      sourceData = dentistsList.map((d) => normalizeRawDentist(d?.raw || d, location)).filter(Boolean);
    }

    console.log('🦷 [DentistSearchScreen] Starting filter with', sourceData.length, 'dentists');
    let data = [...sourceData];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      data = data.filter((dentist) => {
        const nameMatch = dentist.name?.toLowerCase().includes(q);
        const specialtyMatch = dentist.specialty?.toLowerCase().includes(q);
        const clinicMatch = dentist.clinic?.toLowerCase().includes(q);
        return nameMatch || specialtyMatch || clinicMatch;
      });
      console.log('🦷 [DentistSearchScreen] After search filter:', data.length, 'dentists');
    }

    // Apply sort/filter
    switch (selectedFilter) {
      case 'nearby': {
        // Sort by distance (closest first), placing undefined distances at the end
        data.sort((a, b) => {
          const aDist = a.distance !== null ? Number(a.distance) : Infinity;
          const bDist = b.distance !== null ? Number(b.distance) : Infinity;
          return aDist - bDist;
        });
        break;
      }
      case 'highest_rated':
        data.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      default:
        break;
    }

    console.log('🦷 [DentistSearchScreen] Final filtered data:', data.length, 'dentists');
    setFilteredDentists(data);
  }, [dentistsList, allDirectoryDentists, searchQuery, selectedFilter, location]);

  const stats = useMemo(() => {
    const total = filteredDentists.length;
    const nearby = filteredDentists.filter((d) => d.distance !== null && d.distance <= 15).length;
    const avgRating = total
      ? (filteredDentists.reduce((sum, d) => sum + (d.rating || 0), 0) / total).toFixed(1)
      : '0.0';
    return { total, nearby, avgRating };
  }, [filteredDentists]);

  const handleProfile = (dentist) => {
    console.log('🦷 [DentistSearchScreen] handleProfile called');
    console.log('🦷 Dentist object keys:', Object.keys(dentist || {}));
    console.log('🦷 dentist.id:', dentist?.id);
    console.log('🦷 dentist.name:', dentist?.name);
    console.log('🦷 dentist.raw exists?:', !!dentist?.raw);
    console.log('🦷 dentist.clinicContext exists?:', !!dentist?.clinicContext);

    if (!dentist?.id || !dentist?.raw) {
      console.error('🦷 [DentistSearchScreen] Missing required data:', { id: dentist?.id, rawExists: !!dentist?.raw });
      showToast('Data dokter tidak lengkap', 'error');
      return;
    }

    console.log('🦷 [DentistSearchScreen] Navigation data:', {
      dentistId: dentist.id,
      dentistRawKeys: Object.keys(dentist.raw || {}),
      clinicContextKeys: Object.keys(dentist.clinicContext || {}),
    });

    try {
      navigation.navigate('DentistDetail', {
        dentistId: dentist.id,
        dentist: dentist.raw,
        clinicContext: dentist.clinicContext,
      });
      console.log('🦷 [DentistSearchScreen] Navigation succeeded');
    } catch (navError) {
      console.error('🦷 [DentistSearchScreen] Navigation error:', navError);
      showToast('Gagal membuka detail dokter', 'error');
    }
  };

  const handleBook = (dentist) => {
    console.log('🦷 [DentistSearchScreen] handleBook called');
    if (!dentist?.id || !dentist?.raw) {
      console.error('🦷 [DentistSearchScreen] Missing required data for booking');
      showToast('Data dokter tidak lengkap', 'error');
      return;
    }

    try {
      navigation.navigate('BookingSlot', {
        dentistId: dentist.id,
        dentist: dentist.raw,
        clinicContext: dentist.clinicContext,
      });
      console.log('🦷 [DentistSearchScreen] Booking navigation succeeded');
    } catch (navError) {
      console.error('🦷 [DentistSearchScreen] Booking navigation error:', navError);
      showToast('Gagal membuka booking', 'error');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

      {/* Header */}
      <LinearGradient
        colors={[theme.colors.primary, '#9333EA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: insets.top + 10,
          paddingHorizontal: 20,
          paddingBottom: 32,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              width: normalize(40),
              height: normalize(40),
              borderRadius: normalize(20),
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialCommunityIcons name="arrow-left" size={normalize(22)} color="white" />
          </TouchableOpacity>

          <View style={{ flex: 1, paddingHorizontal: 12 }}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Penjelajah</Text>
            <Text style={{ color: 'white', fontSize: 24, fontWeight: '800', marginTop: 4 }}>
              Temukan dokter
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.75)', marginTop: 6 }}>
              {stats.nearby} dokter terdekat · rating {stats.avgRating}/5
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setSelectedFilter((prev) => (prev === 'highest_rated' ? 'all' : 'highest_rated'))}
            style={{
              width: normalize(40),
              height: normalize(40),
              borderRadius: normalize(20),
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialCommunityIcons
              name={selectedFilter === 'highest_rated' ? 'star' : 'star-outline'}
              size={normalize(20)}
              color="white"
            />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <Searchbar
          placeholder="Cari nama dokter atau spesialisasi"
          value={searchInput}
          onChangeText={setSearchInput}
          style={{ marginTop: 16, borderRadius: 12, backgroundColor: 'white' }}
          inputStyle={{ color: '#0F172A' }}
          iconColor="#94A3B8"
          accessibilityLabel="Cari dokter"
        />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={nearbyLoading || directoryLoading} onRefresh={handleRefresh} tintColor={theme.colors.primary} />
        }
      >
        {/* Debug Info */}
        {__DEV__ && (
          <View style={{ backgroundColor: '#F3F4F6', padding: 12, borderRadius: 8, marginBottom: 12 }}>
            <Text style={{ fontSize: 10, color: '#666', fontFamily: 'monospace' }}>
              dentists: {dentistsList.length} | filtered: {filteredDentists.length} | loading: {loading ? '1' : '0'} | error: {error ? '1' : '0'}
            </Text>
          </View>
        )}
        {/* Filter Chips */}
        <View style={{ flexDirection: 'row', marginBottom: 20, gap: 8 }}>
          {['all', 'nearby', 'highest_rated'].map((filter) => {
            const labels = {
              all: 'Semua',
              nearby: 'Terdekat',
              highest_rated: 'Rating Tertinggi',
            };
            return (
              <Chip
                key={filter}
                selected={selectedFilter === filter}
                onPress={() => setSelectedFilter(filter)}
                style={{
                  backgroundColor: selectedFilter === filter ? theme.colors.primary : '#E2E8F0',
                }}
                textStyle={{
                  color: selectedFilter === filter ? 'white' : '#475569',
                  fontWeight: '600',
                  fontSize: 12,
                }}
              >
                {labels[filter]}
              </Chip>
            );
          })}
        </View>

        {/* Loading State */}
        {loading && filteredDentists.length === 0 && (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator animating size="large" color={theme.colors.primary} />
            <Text style={{ marginTop: 12, color: '#475569' }}>Mencari dokter terdekat...</Text>
          </View>
        )}

        {/* Error State */}
        {error && !loading && (
          <TouchableOpacity
            onPress={handleRefresh}
            style={{
              backgroundColor: '#FFE4E6',
              borderColor: '#FDA4AF',
              borderWidth: 1,
              padding: 16,
              borderRadius: 16,
              marginBottom: 20,
            }}
          >
            <Text style={{ color: '#9F1239', fontWeight: '600', marginBottom: 4 }}>Terjadi Kesalahan</Text>
            <Text style={{ color: '#9F1239', fontSize: 13 }}>{error}</Text>
            <Text style={{ color: '#9F1239', marginTop: 8, fontWeight: '600' }}>Ketuk untuk coba lagi</Text>
          </TouchableOpacity>
        )}

        {/* No Dentists Found State */}
        {!loading && !error && dentistsList.length === 0 && (
          <View
            style={{
              padding: 24,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              alignItems: 'center',
              backgroundColor: 'white',
            }}
          >
            <MaterialCommunityIcons name="hospital-box-outline" size={48} color="#94A3B8" />
            <Text style={{ marginTop: 12, fontWeight: '600', color: '#0F172A', fontSize: 16 }}>
              Dokter Tidak Ditemukan
            </Text>
            <Text style={{ color: '#94A3B8', marginTop: 4, textAlign: 'center' }}>
              Tidak ada dokter tersedia di area Anda. Coba lagi atau ubah preferensi lokasi.
            </Text>
          </View>
        )}

        {/* Empty State */}
        {!loading && !error && filteredDentists.length === 0 && dentistsList.length > 0 && (
          <View style={{ gap: 16 }}>
            {/* Elegant Banner explaining search has no results */}
            <View
              style={{
                padding: 20,
                borderRadius: 24,
                borderWidth: 1.5,
                borderColor: '#E2E8F0',
                alignItems: 'center',
                backgroundColor: 'white',
                shadowColor: '#0F172A',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.05,
                shadowRadius: 16,
                elevation: 2,
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: 'rgba(152, 43, 234, 0.1)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <MaterialCommunityIcons name="magnify-close" size={24} color={theme.colors.primary} />
              </View>
              <Text style={{ fontWeight: '700', color: '#0F172A', fontSize: 16, textAlign: 'center' }}>
                Tidak ada dokter yang cocok
              </Text>
              <Text style={{ color: '#64748B', marginTop: 6, textAlign: 'center', fontSize: 13, lineHeight: 18 }}>
                Coba ubah kata kunci pencarian atau ganti filter kategori Anda.
              </Text>
            </View>

            {/* Illustrative Dentist Card Preview */}
            <View
              style={{
                backgroundColor: 'white',
                borderRadius: 24,
                padding: normalize(16),
                shadowColor: '#0F172A',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.08,
                shadowRadius: 18,
                elevation: 4,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                position: 'relative',
                overflow: 'hidden',
                marginBottom: 16,
              }}
            >
              {/* Top Banner Badge */}
              <View
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  backgroundColor: 'rgba(152, 43, 234, 0.1)',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 8,
                  zIndex: 2,
                }}
              >
                <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 9 }}>
                  CONTOH KARTU DOKTER
                </Text>
              </View>

              <View style={{ flexDirection: 'row' }}>
                <Image
                  source={{ uri: 'https://api.dicebear.com/7.x/avataaars/png?seed=test&size=256' }}
                  style={{
                    width: normalize(70),
                    height: normalize(70),
                    borderRadius: 20,
                    marginRight: 16,
                    backgroundColor: '#F1F5F9',
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', fontSize: normalize(16), color: '#0F172A', paddingRight: 110 }}>
                    drg. Aditya Pratama, Sp.KG
                  </Text>
                  <Text style={{ color: theme.colors.primary, fontWeight: '600', marginTop: 2, fontSize: normalize(12) }}>
                    Spesialis Konservasi Gigi
                  </Text>
                  <Text style={{ color: '#64748B', fontWeight: '500', marginTop: 2, fontSize: normalize(11) }}>
                    Dental Care Studio Utama
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                    <MaterialCommunityIcons name="star" size={14} color="#FACC15" />
                    <Text style={{ marginLeft: 4, color: '#475569', fontWeight: '600', fontSize: normalize(11) }}>
                      4.9 · 2.5 km
                    </Text>
                  </View>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={{ color: '#94A3B8', fontSize: normalize(10) }}>Mulai dari</Text>
                  <Text style={{ fontWeight: '700', color: '#0F172A', marginTop: 2, fontSize: normalize(14) }}>
                    Rp 150.000
                  </Text>
                </View>
                <View style={{ flexDirection: 'row' }}>
                  <View
                    style={{ borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 12, height: normalize(36), marginRight: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', opacity: 0.6 }}
                  >
                    <MaterialCommunityIcons name="information-outline" size={16} color="#475569" />
                  </View>
                  <View
                    style={{ borderRadius: 16, paddingHorizontal: 16, height: normalize(36), flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primary, justifyContent: 'center', opacity: 0.6 }}
                  >
                    <MaterialCommunityIcons name="calendar-check" size={16} color="white" style={{ marginRight: 6 }} />
                    <Text style={{ color: 'white', fontWeight: '700', fontSize: normalize(12) }}>Pesan</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Dentist Cards */}
        {filteredDentists.map((dentist) => (
          <TouchableOpacity
            key={dentist.id}
            onPress={() => handleProfile(dentist)}
            activeOpacity={0.95}
            style={{
              backgroundColor: 'white',
              borderRadius: 24,
              padding: normalize(16),
              marginBottom: 16,
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.08,
              shadowRadius: 18,
              elevation: 4,
              borderWidth: 1,
              borderColor: '#E2E8F0',
            }}
          >
            {/* Dentist Header */}
            <View style={{ flexDirection: 'row' }}>
              <Image
                source={{ uri: dentist.image }}
                style={{
                  width: normalize(70),
                  height: normalize(70),
                  borderRadius: 20,
                  marginRight: 16,
                  backgroundColor: '#F1F5F9',
                }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontWeight: '700',
                    fontSize: normalize(16),
                    color: '#0F172A',
                  }}
                  numberOfLines={1}
                >
                  {dentist.name}
                </Text>
                <Text
                  style={{
                    color: theme.colors.primary,
                    fontWeight: '600',
                    marginTop: 2,
                    fontSize: normalize(12),
                  }}
                >
                  {dentist.specialty}
                </Text>
                {/* Clinic Name */}
                <Text
                  style={{
                    color: '#0F172A',
                    fontWeight: '500',
                    marginTop: 2,
                    fontSize: normalize(11),
                  }}
                  numberOfLines={1}
                >
                  {dentist.clinic}
                </Text>
                {/* Clinic Address */}
                {dentist.clinicContext?.address && (
                  <Text
                    style={{
                      color: '#94A3B8',
                      marginTop: 1,
                      fontSize: normalize(9),
                    }}
                    numberOfLines={1}
                  >
                    {dentist.clinicContext.address}
                  </Text>
                )}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: 6,
                  }}
                >
                  <MaterialCommunityIcons name="star" size={14} color="#FACC15" />
                  <Text
                    style={{
                      marginLeft: 4,
                      color: '#475569',
                      fontWeight: '600',
                      fontSize: normalize(11),
                    }}
                  >
                    {dentist.rating} {dentist.distance !== null && dentist.distance !== undefined ? `· ${dentist.distance.toFixed(1)} km` : ''}
                  </Text>
                </View>
              </View>
            </View>

            {/* Footer with Price and Actions */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 16,
                borderTopWidth: 1,
                borderTopColor: '#F1F5F9',
                paddingTop: 12,
              }}
            >
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ color: '#94A3B8', fontSize: normalize(10) }}>Mulai dari</Text>
                <Text
                  style={{
                    fontWeight: '700',
                    color: '#0F172A',
                    marginTop: 2,
                    fontSize: normalize(14),
                  }}
                >
                  Rp {Number(dentist.price || 0).toLocaleString('id-ID')}
                </Text>
              </View>
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity
                  onPress={() => handleProfile(dentist)}
                  activeOpacity={0.7}
                  style={{
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    paddingHorizontal: 12,
                    height: normalize(36),
                    marginRight: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialCommunityIcons name="information-outline" size={16} color="#475569" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleBook(dentist)}
                  activeOpacity={0.7}
                  style={{
                    borderRadius: 16,
                    paddingHorizontal: 16,
                    height: normalize(36),
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: theme.colors.primary,
                    justifyContent: 'center',
                  }}
                >
                  <MaterialCommunityIcons
                    name="calendar-check"
                    size={16}
                    color="white"
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={{
                      color: 'white',
                      fontWeight: '700',
                      fontSize: normalize(12),
                    }}
                  >
                    Pesan
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        ))}
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

export default DentistSearchScreen;
