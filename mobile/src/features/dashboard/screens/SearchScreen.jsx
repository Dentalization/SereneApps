import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { 
  View, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Image, 
  StatusBar, 
  Dimensions, 
  Platform, 
  PixelRatio 
} from 'react-native';
import { Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getDentistDirectory } from '../../../services/dentistService';
import { getClinics } from '../../../services/clinicService';
import { API_BASE_URL } from '../../../services/api';
import ValidationToast from '../../settings/components/ValidationToast';
import useToast from '../../../hooks/useToast';

// --- UTILS RESPONSIVE ---
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 375; // Base width iPhone 11/Pro

const normalize = (size) => {
  const newSize = size * scale;
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  } else {
    return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 1;
  }
};
// -------------------------

const parseListInput = (value) => {
  if (!value && value !== 0) {
    return [];
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : item))
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || trimmed.includes('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
      } catch (err) {
        // fall through to comma split
      }
    }
    return trimmed
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const buildCatalogFromDentists = (dentists = []) => {
  const specCount = new Map();
  const serviceCount = new Map();
  const increment = (map, key) => {
    if (!key) return;
    const normalized = key.trim();
    if (!normalized) return;
    map.set(normalized, (map.get(normalized) || 0) + 1);
  };

  dentists.forEach((dentist) => {
    increment(specCount, dentist.specialization);
    (dentist.services || []).forEach((service) => increment(serviceCount, service));
  });

  const toArray = (map) =>
    Array.from(map.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);

  return {
    specializations: toArray(specCount).slice(0, 10),
    services: toArray(serviceCount).slice(0, 10),
  };
};

const QUICK_SUGGESTIONS = [
  { id: 'invisalign', label: 'Aligner / Invisalign' },
  { id: 'orthodontist', label: 'Ortodontis' },
  { id: 'kid', label: 'Dokter gigi anak' },
  { id: 'implant', label: 'Implan gigi' },
  { id: 'bleaching', label: 'Bleaching' },
];

const DICEBEAR_BG = encodeURIComponent('8B5CF6,A78BFA,C4B5FD,DDD6FE');
const API_BASE = API_BASE_URL.replace(/\/$/, '');

const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithRetry = async (fn, attempts = 2, delayMs = 250) => {
  let lastError;
  for (let i = 0; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      console.log(`⚠️ [SearchScreen] Fetch attempt ${i + 1} failed:`, err.message);
      if (i === attempts) {
        throw lastError;
      }
      await delay(delayMs * (i + 1));
    }
  }
  throw lastError;
};

const normalizeDicebear = (url = '', seed = 'dentist') => {
  if (!url || !url.includes('dicebear.com')) {
    return url || `https://api.dicebear.com/7.x/avataaars/png?seed=${seed}&backgroundColor=${DICEBEAR_BG}&size=256`;
  }
  return url.replace('/svg', '/png').replace('format=svg', 'format=png');
};

const resolveAvatar = (path, seed = 'dentist') => {
  if (!path) {
    return `https://api.dicebear.com/7.x/avataaars/png?seed=${seed}&backgroundColor=${DICEBEAR_BG}&size=256`;
  }
  if (/^https?:\/\//i.test(path)) {
    return normalizeDicebear(path, seed);
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

const formatCurrency = (value) => {
  if (!value && value !== 0) return 'Konsultasi';
  return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
};

const extractClinicContext = (dentist = {}) => {
  const source = dentist.raw || dentist;
  const profileId =
    source?.clinicProfileId ||
    source?.clinic_profile_id ||
    source?.clinicId ||
    source?.clinic_id ||
    source?.primaryClinicId;
  const branchId =
    source?.clinicBranchId ||
    source?.clinic_branch_id ||
    source?.assigned_branch_id ||
    source?.branchId;

  if (!profileId && !branchId) {
    return null;
  }

  return {
    profileId: profileId?.toString?.() || null,
    branchId: branchId?.toString?.() || null,
    name:
      source?.clinicBranchName ||
      source?.clinicName ||
      source?.clinic_branch_name ||
      source?.clinic_name ||
      source?.clinicAddress,
    address:
      source?.clinicBranchAddress ||
      source?.clinicAddress ||
      source?.clinic_branch_address ||
      source?.address ||
      source?.clinic_location,
    distance: source?.distance || source?.distanceKm,
  };
};

const normalizeDentist = (dentist) => {
  const years = dentist?.yearsOfExperience ?? dentist?.years_of_experience ?? 0;
  const clinicId = dentist?.clinicId ?? dentist?.clinic_id;
  const clinicName = dentist?.clinicName ?? dentist?.clinic_name;
  const clinicAddress = dentist?.clinicAddress ?? dentist?.clinic_address;
  const avatarPath = pickAvatarPath(dentist);
  const consultationTypes = parseListInput(
    dentist?.consultationTypes ?? dentist?.consultation_types
  );
  const services = parseListInput(
    dentist?.servicesOffered ??
      dentist?.services_offered ??
      dentist?.raw?.services_offered
  );

  const clinicContext = extractClinicContext(dentist);

  return {
    id: dentist?.id?.toString?.() || dentist?.userId?.toString?.() || `dentist-${dentist?.name}`,
    name: dentist?.name || 'Dokter Gigi',
    specialization: dentist?.specialization || dentist?.primary_specialization || 'Dokter Gigi',
    experience: years,
    rating: Number((4.2 + Math.min(0.8, years / 20)).toFixed(1)),
    consultationFee: dentist?.consultationFee ?? dentist?.consultation_fee ?? null,
    avatar: resolveAvatar(avatarPath, dentist?.id),
    consultationTypes,
    services,
    clinicContext,
    clinic: {
      id: clinicContext?.profileId || (clinicId ? clinicId.toString() : null),
      name: clinicContext?.name || clinicName || 'Praktik belum ditentukan',
      address: clinicContext?.address || clinicAddress || 'Alamat belum tersedia',
    },
    raw: dentist,
  };
};

const normalizeClinic = (clinic) => ({
  id: clinic?.id?.toString?.() || clinic?.clinicId?.toString?.(),
  name: clinic?.name || clinic?.brand_name || 'Klinik Gigi',
  address: clinic?.address || clinic?.street_address || '-',
  city: clinic?.city,
  province: clinic?.province,
  phone: clinic?.phone_number,
  isVerified: clinic?.is_verified ?? false,
  dentists: [],
  raw: clinic,
});

const SearchScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState('');
  const [dentistResults, setDentistResults] = useState([]);
  const [clinicResults, setClinicResults] = useState([]);
  const [serviceResults, setServiceResults] = useState([]);
  const [specializationResults, setSpecializationResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [catalog, setCatalog] = useState({ specializations: [], services: [] });
  const [directoryReady, setDirectoryReady] = useState(false);
  const [selectedTab, setSelectedTab] = useState('all');

  const { toast, showToast, hideToast } = useToast();

  const directoryCache = useRef({ normalized: [], loaded: false });
  const lastSuccessfulRef = useRef({
    dentists: [],
    clinics: [],
    services: [],
    specializations: [],
  });
  const latestQueryRef = useRef('');

  const ensureDirectory = useCallback(async () => {
    if (directoryCache.current.loaded) {
      setDirectoryReady(true);
      return directoryCache.current.normalized;
    }
    try {
      const response = await fetchWithRetry(
        () =>
          getDentistDirectory({
            verifiedOnly: true,
            limit: 400,
          }),
        2,
        300
      );
      const dentists = response?.data?.dentists ?? response?.dentists ?? [];
      const normalized = dentists.map((item) => normalizeDentist(item));
      directoryCache.current = { normalized, loaded: true };
      setCatalog((prev) =>
        prev.specializations.length || prev.services.length
          ? prev
          : buildCatalogFromDentists(normalized)
      );
      setDirectoryReady(true);
      return normalized;
    } catch (err) {
      console.log('❌ [SearchScreen] Failed to preload dentist directory:', err.message);
      setDirectoryReady(true);
      if (directoryCache.current.normalized.length) {
        return directoryCache.current.normalized;
      }
      throw err;
    }
  }, []);

  useEffect(() => {
    ensureDirectory().catch(() => {});
  }, [ensureDirectory]);

  const attachDentistsToClinic = useCallback((clinic, dentists) => {
    if (!dentists.length) return clinic;
    const clinicLower = clinic.name?.toLowerCase();
    const matches = dentists
      .filter((dentist) => {
        const rawClinicId = dentist.raw?.clinicId ?? dentist.raw?.clinic_id;
        if (clinic.id && rawClinicId) {
          return rawClinicId.toString() === clinic.id;
        }
        const dentistClinicName = dentist.clinic?.name?.toLowerCase();
        return clinicLower && dentistClinicName && dentistClinicName.includes(clinicLower);
      })
      .slice(0, 4);

    const serviceSet = new Set();
    matches.forEach((doc) => {
      (doc.services || []).forEach((service) => {
        if (service) serviceSet.add(service);
      });
    });
    const services = Array.from(serviceSet);

    return { ...clinic, dentists: matches, services };
  }, []);

  const handleSearch = useCallback(
    async (term) => {
      const trimmed = term.trim();
      latestQueryRef.current = trimmed;

      if (!trimmed) {
        setDentistResults([]);
        setClinicResults([]);
        setServiceResults([]);
        setSpecializationResults([]);
        setError(null);
        setSearching(false);
        setSelectedTab('all');
        return;
      }

      setSearching(true);
      setError(null);

      try {
        const normalizedDentists = await ensureDirectory();
        const lowered = trimmed.toLowerCase();

        const dentistMatches = normalizedDentists
          .filter((dentist) => {
            const name = dentist.name?.toLowerCase() || '';
            const specialty = dentist.specialization?.toLowerCase() || '';
            const clinicName = dentist.clinic?.name?.toLowerCase() || '';
            const servicesText = (dentist.services || []).join(' ').toLowerCase();
            const consultationText = (dentist.consultationTypes || [])
              .join(' ')
              .toLowerCase();
            return (
              name.includes(lowered) ||
              specialty.includes(lowered) ||
              clinicName.includes(lowered) ||
              servicesText.includes(lowered) ||
              consultationText.includes(lowered)
            );
          })
          .slice(0, 12);

        const specializationMap = new Map();
        dentistMatches.forEach((dentist) => {
          const spec = dentist.specialization;
          if (!spec) return;
          if (!spec.toLowerCase().includes(lowered)) return;
          if (!specializationMap.has(spec)) {
            specializationMap.set(spec, {
              label: spec,
              dentists: [],
              count: 0,
            });
          }
          const entry = specializationMap.get(spec);
          entry.count += 1;
          if (entry.dentists.length < 4) {
            entry.dentists.push(dentist);
          }
        });

        const serviceMap = new Map();
        dentistMatches.forEach((dentist) => {
          (dentist.services || []).forEach((service) => {
            if (!service?.toLowerCase().includes(lowered)) return;
            if (!serviceMap.has(service)) {
              serviceMap.set(service, {
                label: service,
                dentists: [],
                clinics: new Map(),
                count: 0,
              });
            }
            const entry = serviceMap.get(service);
            entry.count += 1;
            if (entry.dentists.length < 3) {
              entry.dentists.push(dentist);
            }
            if (dentist.clinic?.name && !entry.clinics.has(dentist.clinic.name)) {
              entry.clinics.set(dentist.clinic.name, dentist.clinic);
            }
          });
        });

        let clinicMatchesResponse = [];
        try {
          const clinicResponse = await fetchWithRetry(
            () => getClinics({ search: trimmed, limit: 10, sortBy: 'brand_name' }),
            1,
            300
          );
          clinicMatchesResponse =
            clinicResponse?.data?.clinics ?? clinicResponse?.clinics ?? [];
        } catch (clinicError) {
          console.log('ℹ️ [SearchScreen] Clinic search fallback:', clinicError.message);
        }

        let clinicMatches = clinicMatchesResponse.map((clinic) =>
          normalizeClinic(clinic)
        );

        if (!clinicMatches.length) {
          const fallbackClinicMap = new Map();
          normalizedDentists.forEach((dentist) => {
            const clinicName = dentist.clinic?.name;
            if (
              clinicName &&
              clinicName.toLowerCase().includes(lowered) &&
              !fallbackClinicMap.has(clinicName)
            ) {
              fallbackClinicMap.set(clinicName, {
                id: dentist.clinic?.id || clinicName,
                name: clinicName,
                address: dentist.clinic?.address || '-',
                city: dentist.raw?.clinic_city || '',
                services: dentist.services || [],
              });
            }
          });
          clinicMatches = Array.from(fallbackClinicMap.values()).map((clinic) =>
            normalizeClinic(clinic)
          );
        }

        const enrichedClinics = clinicMatches.map((clinic) =>
          attachDentistsToClinic(clinic, normalizedDentists)
        );

        const specializationMatches = Array.from(specializationMap.values()).sort(
          (a, b) => b.count - a.count
        );
        const serviceMatches = Array.from(serviceMap.values()).map((entry) => ({
          ...entry,
          clinics: Array.from(entry.clinics.values()).slice(0, 3),
        }));

        if (latestQueryRef.current !== trimmed) {
          return;
        }

        setDentistResults(dentistMatches);
        setClinicResults(enrichedClinics);
        setSpecializationResults(specializationMatches);
        setServiceResults(serviceMatches);
        lastSuccessfulRef.current = {
          dentists: dentistMatches,
          clinics: enrichedClinics,
          services: serviceMatches,
          specializations: specializationMatches,
        };
        setError(null);
      } catch (err) {
        console.log('❌ [SearchScreen] Search failed:', err.message);
        if (latestQueryRef.current !== trimmed) {
          return;
        }
        const fallback = lastSuccessfulRef.current;
        if (
          fallback.dentists.length ||
          fallback.clinics.length ||
          fallback.services.length ||
          fallback.specializations.length
        ) {
          console.log('ℹ️ [SearchScreen] Using cached results after failure');
          setDentistResults(fallback.dentists);
          setClinicResults(fallback.clinics);
          setServiceResults(fallback.services);
          setSpecializationResults(fallback.specializations);
          setError('Menampilkan data terakhir. Tarik untuk coba lagi.');
          showToast('Memakai data sebelumnya karena koneksi bermasalah', 'warning');
        } else {
          setDentistResults([]);
          setClinicResults([]);
          setSpecializationResults([]);
          setServiceResults([]);
          setError('Gagal memuat hasil pencarian. Coba lagi nanti.');
          showToast('Tidak dapat memuat hasil pencarian', 'error');
        }
      } finally {
        if (latestQueryRef.current === trimmed) {
          setSearching(false);
        }
      }
    },
    [attachDentistsToClinic, ensureDirectory, showToast]
  );

  useEffect(() => {
    const debounce = setTimeout(() => {
      handleSearch(query);
    }, 400);
    return () => clearTimeout(debounce);
  }, [query, handleSearch]);

  const handleDentistPress = (dentist) => {
    navigation.navigate('DentistDetail', {
      dentistId: dentist.id,
      dentist,
      clinicContext: dentist.clinicContext,
      clinicId: dentist.clinicContext?.profileId,
      clinicBranchId: dentist.clinicContext?.branchId,
    });
  };

  const handleClinicPress = (clinic) => {
    navigation.navigate('ClinicDetail', {
      clinicId: clinic.id,
      clinic,
    });
  };

  const emptyState = useMemo(
    () =>
      !query.trim() &&
      !dentistResults.length &&
      !clinicResults.length &&
      !serviceResults.length &&
      !searching,
    [query, dentistResults.length, clinicResults.length, serviceResults.length, searching]
  );

  const tabs = useMemo(
    () => [
      { id: 'all', label: 'Semua' },
      { id: 'dentists', label: `Dokter (${dentistResults.length})` },
      { id: 'clinics', label: `Klinik (${clinicResults.length})` },
      { id: 'services', label: `Layanan (${serviceResults.length})` },
      { id: 'specializations', label: `Spesialis (${specializationResults.length})` },
    ],
    [dentistResults.length, clinicResults.length, serviceResults.length, specializationResults.length]
  );

  useEffect(() => {
    if (selectedTab === 'all') return;
    const hasData =
      (selectedTab === 'dentists' && dentistResults.length > 0) ||
      (selectedTab === 'clinics' && clinicResults.length > 0) ||
      (selectedTab === 'services' && serviceResults.length > 0) ||
      (selectedTab === 'specializations' && specializationResults.length > 0);
    if (!hasData) {
      setSelectedTab('all');
    }
  }, [selectedTab, dentistResults.length, clinicResults.length, serviceResults.length, specializationResults.length]);

  const shouldShowDentists =
    dentistResults.length > 0 && (selectedTab === 'all' || selectedTab === 'dentists');
  const shouldShowClinics =
    clinicResults.length > 0 && (selectedTab === 'all' || selectedTab === 'clinics');
  const shouldShowServices =
    serviceResults.length > 0 && (selectedTab === 'all' || selectedTab === 'services');
  const shouldShowSpecializations =
    specializationResults.length > 0 &&
    (selectedTab === 'all' || selectedTab === 'specializations');

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
      
      {/* HEADER GRADIENT */}
      <LinearGradient
        colors={[theme.colors.primary, '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: insets.top + normalize(2),
          paddingHorizontal: normalize(20),
          paddingBottom: normalize(12),
          borderBottomLeftRadius: normalize(28),
          borderBottomRightRadius: normalize(28),
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: normalize(16) }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              width: normalize(44),
              height: normalize(44),
              borderRadius: normalize(22),
              backgroundColor: 'rgba(255,255,255,0.2)',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: normalize(12),
            }}
          >
            <MaterialCommunityIcons name="chevron-left" size={normalize(26)} color="#fff" />
          </TouchableOpacity>
          <Text style={{ fontSize: normalize(20), fontWeight: '700', color: '#fff' }}>Cari layanan</Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'white',
            borderRadius: normalize(20),
            paddingHorizontal: normalize(16),
            paddingVertical: normalize(10),
          }}
        >
          <MaterialCommunityIcons name="magnify" size={normalize(22)} color="#9CA3AF" />
          <TextInput
            autoFocus
            placeholder="Cari dokter, klinik, atau layanan"
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={setQuery}
            style={{ 
              flex: 1, 
              marginLeft: normalize(10), 
              fontSize: normalize(15), 
              color: '#111827',
              height: normalize(24), // Ensure height for text visibility
              paddingVertical: 0
            }}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <MaterialCommunityIcons name="close-circle" size={normalize(20)} color="#CBD5F5" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: normalize(20), paddingBottom: normalize(120) }}
        keyboardShouldPersistTaps="handled"
      >


        {shouldShowSpecializations && (
          <View style={{ marginBottom: normalize(24) }}>
            <Text style={{ fontSize: normalize(18), fontWeight: '700', color: '#0F172A', marginBottom: normalize(12) }}>
              Spesialis sesuai pencarian
            </Text>
            {specializationResults.map((spec) => (
              <View
                key={spec.label}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: normalize(20),
                  padding: normalize(16),
                  marginBottom: normalize(16),
                  borderWidth: 1,
                  borderColor: 'rgba(226,232,240,0.8)',
                }}
              >
                <TouchableOpacity
                  onPress={() => setQuery(spec.label)}
                  style={{ flexDirection: 'row', alignItems: 'center', marginBottom: normalize(12) }}
                  activeOpacity={0.8}
                >
                  <View
                    style={{
                      width: normalize(44),
                      height: normalize(44),
                      borderRadius: normalize(16),
                      backgroundColor: '#E0F2FE',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: normalize(12),
                    }}
                  >
                    <MaterialCommunityIcons name="stethoscope" size={normalize(22)} color="#0284C7" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', fontSize: normalize(16), color: '#0F172A' }}>
                      {spec.label}
                    </Text>
                    <Text style={{ color: '#94A3B8', fontSize: normalize(13) }}>{spec.count} dokter tersedia</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={normalize(22)} color="#94A3B8" />
                </TouchableOpacity>
                {spec.dentists.map((dentist) => (
                  <TouchableOpacity
                    key={`${spec.label}-${dentist.id}`}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: normalize(8) }}
                    onPress={() => handleDentistPress(dentist)}
                  >
                    <Image
                      source={{ uri: dentist.avatar }}
                      style={{ width: normalize(38), height: normalize(38), borderRadius: normalize(19), marginRight: normalize(12) }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '600', color: '#0F172A', fontSize: normalize(14) }}>{dentist.name}</Text>
                      <Text style={{ color: '#94A3B8', fontSize: normalize(12) }}>{dentist.clinic?.name}</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={normalize(20)} color="#CBD5F5" />
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        )}

        {shouldShowServices && (
          <View style={{ marginBottom: normalize(24) }}>
            <Text style={{ fontSize: normalize(18), fontWeight: '700', color: '#0F172A', marginBottom: normalize(12) }}>
              Layanan sesuai pencarian
            </Text>
            {serviceResults.map((service) => (
              <View
                key={service.label}
                style={{
                  backgroundColor: '#fff',
                  padding: normalize(16),
                  borderRadius: normalize(20),
                  marginBottom: normalize(16),
                  shadowColor: '#0F172A',
                  shadowOpacity: 0.04,
                  shadowOffset: { width: 0, height: 8 },
                  shadowRadius: 16,
                  elevation: 4,
                }}
              >
                <TouchableOpacity
                  onPress={() => setQuery(service.label)}
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                >
                  <View
                    style={{
                      width: normalize(44),
                      height: normalize(44),
                      borderRadius: normalize(16),
                      backgroundColor: '#FCE7F3',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: normalize(12),
                    }}
                  >
                    <MaterialCommunityIcons name="tooth" size={normalize(22)} color="#DB2777" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', fontSize: normalize(16), color: '#0F172A' }}>
                      {service.label}
                    </Text>
                    <Text style={{ color: '#94A3B8', fontSize: normalize(13) }}>
                      {service.count} dokter menyediakannya
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={normalize(22)} color="#94A3B8" />
                </TouchableOpacity>
                {service.dentists.length > 0 && (
                  <View style={{ marginTop: normalize(12) }}>
                    <Text style={{ fontWeight: '600', color: '#0F172A', marginBottom: normalize(6), fontSize: normalize(13) }}>
                      Rekomendasi dokter
                    </Text>
                    {service.dentists.map((dentist) => (
                      <TouchableOpacity
                        key={`${service.label}-${dentist.id}`}
                        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: normalize(8) }}
                        onPress={() => handleDentistPress(dentist)}
                      >
                        <Image
                          source={{ uri: dentist.avatar }}
                          style={{ width: normalize(38), height: normalize(38), borderRadius: normalize(19), marginRight: normalize(12) }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: '600', color: '#0F172A', fontSize: normalize(14) }}>{dentist.name}</Text>
                          <Text style={{ color: '#94A3B8', fontSize: normalize(12) }}>{dentist.clinic?.name}</Text>
                        </View>
                        <MaterialCommunityIcons name="arrow-top-right" size={normalize(18)} color="#A855F7" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {service.clinics.length > 0 && (
                  <View style={{ marginTop: normalize(10) }}>
                    <Text style={{ fontWeight: '600', color: '#0F172A', marginBottom: normalize(6), fontSize: normalize(13) }}>
                      Klinik pilihan
                    </Text>
                    {service.clinics.map((clinic) => (
                      <TouchableOpacity
                        key={`${service.label}-${clinic.id || clinic.name}`}
                        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: normalize(6) }}
                        onPress={() => handleClinicPress(clinic)}
                      >
                        <View
                          style={{
                            width: normalize(32),
                            height: normalize(32),
                            borderRadius: normalize(10),
                            backgroundColor: '#EEF2FF',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: normalize(10),
                          }}
                        >
                          <MaterialCommunityIcons
                            name="office-building-marker"
                            size={normalize(18)}
                            color={theme.colors.primary}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: '600', color: '#0F172A', fontSize: normalize(13) }}>{clinic.name}</Text>
                          <Text style={{ color: '#94A3B8', fontSize: normalize(12) }}>{clinic.address}</Text>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={normalize(18)} color="#CBD5F5" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {directoryReady && catalog.specializations.length > 0 && (
          <View style={{ marginBottom: normalize(24) }}>
            <Text style={{ fontSize: normalize(16), fontWeight: '700', color: '#0F172A', marginBottom: normalize(12) }}>
              Spesialisasi populer
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {catalog.specializations.map((item) => (
                <TouchableOpacity
                  key={item.label}
                  onPress={() => setQuery(item.label)}
                  style={{
                    paddingHorizontal: normalize(16),
                    paddingVertical: normalize(8),
                    backgroundColor: '#E0E7FF',
                    borderRadius: normalize(18),
                    marginRight: normalize(10),
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <MaterialCommunityIcons
                    name="medical-bag"
                    size={normalize(16)}
                    color={theme.colors.primary}
                  />
                  <Text style={{ marginLeft: normalize(6), color: theme.colors.primary, fontWeight: '600', fontSize: normalize(13) }}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {directoryReady && catalog.services.length > 0 && (
          <View style={{ marginBottom: normalize(24) }}>
            <Text style={{ fontSize: normalize(16), fontWeight: '700', color: '#0F172A', marginBottom: normalize(12) }}>
              Layanan favorit pasien
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {catalog.services.map((item) => (
                <TouchableOpacity
                  key={item.label}
                  onPress={() => setQuery(item.label)}
                  style={{
                    paddingHorizontal: normalize(16),
                    paddingVertical: normalize(8),
                    backgroundColor: '#FDF2F8',
                    borderRadius: normalize(18),
                    marginRight: normalize(10),
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <MaterialCommunityIcons name="tooth-outline" size={normalize(16)} color="#DB2777" />
                  <Text style={{ marginLeft: normalize(6), color: '#DB2777', fontWeight: '600', fontSize: normalize(13) }}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {searching && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: normalize(16) }}>
            <ActivityIndicator color={theme.colors.primary} size="small" />
            <Text style={{ marginLeft: normalize(8), color: '#475569', fontSize: normalize(14) }}>Mencari hasil terbaik...</Text>
          </View>
        )}

        {!emptyState && (
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: '#ECEAFF',
              borderRadius: normalize(18),
              padding: normalize(4),
              marginBottom: normalize(16),
            }}
          >
            {tabs.map((tab) => {
              const active = selectedTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setSelectedTab(tab.id)}
                  style={{
                    flex: 1,
                    paddingVertical: normalize(8),
                    borderRadius: normalize(14),
                    backgroundColor: active ? '#FFFFFF' : 'transparent',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: normalize(13),
                      fontWeight: '600',
                      color: active ? theme.colors.primary : '#6366F1',
                    }}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {shouldShowDentists && (
          <View style={{ marginBottom: normalize(24) }}>
            <Text style={{ fontSize: normalize(18), fontWeight: '700', color: '#0F172A', marginBottom: normalize(12) }}>
              Dokter ditemukan
            </Text>
            {dentistResults.map((dentist) => (
              <View
                key={dentist.id}
                style={{
                  backgroundColor: '#fff',
                  padding: normalize(16),
                  borderRadius: normalize(20),
                  marginBottom: normalize(16),
                  shadowColor: '#0F172A',
                  shadowOpacity: 0.06,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 3,
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => handleDentistPress(dentist)}
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                >
                  <View
                    style={{
                      width: normalize(60),
                      height: normalize(60),
                      borderRadius: normalize(30),
                      overflow: 'hidden',
                      borderWidth: 2,
                      borderColor: theme.colors.primary,
                      marginRight: normalize(16),
                    }}
                  >
                    <Image
                      source={{ uri: dentist.avatar }}
                      style={{ width: '100%', height: '100%' }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: normalize(16), fontWeight: '700', color: '#0F172A' }} numberOfLines={1}>
                      {dentist.name}
                    </Text>
                    <Text style={{ color: theme.colors.primary, fontWeight: '600', marginTop: normalize(2), fontSize: normalize(13) }}>
                      {dentist.specialization}
                    </Text>
                    <View style={{ flexDirection: 'row', marginTop: normalize(6) }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: normalize(12) }}>
                        <MaterialCommunityIcons name="star" size={normalize(16)} color="#FBBF24" />
                        <Text style={{ marginLeft: normalize(4), color: '#475569', fontSize: normalize(12) }}>
                          {dentist.rating.toFixed(1)}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialCommunityIcons name="briefcase" size={normalize(16)} color="#94A3B8" />
                        <Text style={{ marginLeft: normalize(4), color: '#475569', fontSize: normalize(12) }}>
                          {dentist.experience || 0} thn
                        </Text>
                      </View>
                    </View>
                    {dentist.consultationFee !== null && (
                      <Text style={{ marginTop: normalize(6), color: '#0F172A', fontWeight: '600', fontSize: normalize(14) }}>
                        {formatCurrency(dentist.consultationFee)}
                      </Text>
                    )}
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={normalize(24)} color="#94A3B8" />
                </TouchableOpacity>

                {dentist.services?.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: normalize(12) }}>
                    {dentist.services.slice(0, 3).map((service) => (
                      <View
                        key={`${dentist.id}-${service}`}
                        style={{
                          backgroundColor: '#EEF2FF',
                          paddingHorizontal: normalize(10),
                          paddingVertical: normalize(4),
                          borderRadius: normalize(12),
                          marginRight: normalize(8),
                          marginBottom: normalize(6),
                        }}
                      >
                        <Text style={{ fontSize: normalize(12), color: theme.colors.primary }}>{service}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {dentist.clinic?.name && (
                  <TouchableOpacity
                    style={{
                      marginTop: normalize(12),
                      backgroundColor: '#F8FAFC',
                      borderRadius: normalize(16),
                      padding: normalize(12),
                      borderWidth: 1,
                      borderColor: 'rgba(99,102,241,0.15)',
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                    onPress={() => handleClinicPress(dentist.clinic)}
                  >
                    <View
                      style={{
                        width: normalize(42),
                        height: normalize(42),
                        borderRadius: normalize(12),
                        backgroundColor: '#EEF2FF',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: normalize(12),
                      }}
                    >
                      <MaterialCommunityIcons
                        name="office-building-marker"
                        size={normalize(22)}
                        color={theme.colors.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '600', color: '#0F172A', fontSize: normalize(13) }}>
                        {dentist.clinic.name}
                      </Text>
                      <Text style={{ color: '#94A3B8', fontSize: normalize(12) }} numberOfLines={1}>
                        {dentist.clinic.address}
                      </Text>
                    </View>
                    <MaterialCommunityIcons name="arrow-top-right" size={normalize(20)} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        {shouldShowClinics && (
          <View style={{ marginBottom: normalize(24) }}>
            <Text style={{ fontSize: normalize(18), fontWeight: '700', color: '#0F172A', marginBottom: normalize(12) }}>
              Klinik ditemukan
            </Text>
            {clinicResults.map((clinic) => (
              <View
                key={clinic.id || clinic.name}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: normalize(20),
                  padding: normalize(16),
                  marginBottom: normalize(16),
                  borderWidth: 1,
                  borderColor: 'rgba(148,163,184,0.2)',
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => handleClinicPress(clinic)}
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                >
                  <View
                    style={{
                      width: normalize(48),
                      height: normalize(48),
                      borderRadius: normalize(16),
                      backgroundColor: '#EEF2FF',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: normalize(12),
                    }}
                  >
                    <MaterialCommunityIcons
                      name="hospital-building"
                      size={normalize(24)}
                      color={theme.colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: normalize(16), fontWeight: '700', color: '#0F172A' }}>
                      {clinic.name}
                    </Text>
                    <Text style={{ color: '#94A3B8', marginTop: normalize(4), fontSize: normalize(13) }}>
                      {clinic.address}
                    </Text>
                    {clinic.city && (
                      <Text style={{ color: '#94A3B8', marginTop: normalize(2), fontSize: normalize(12) }}>
                        {clinic.city}
                        {clinic.province ? `, ${clinic.province}` : ''}
                      </Text>
                    )}
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={normalize(24)} color="#94A3B8" />
                </TouchableOpacity>

                {clinic.services?.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: normalize(12) }}>
                    {clinic.services.slice(0, 4).map((service) => (
                      <View
                        key={`${clinic.id || clinic.name}-${service}`}
                        style={{
                          backgroundColor: '#ECFEFF',
                          paddingHorizontal: normalize(10),
                          paddingVertical: normalize(4),
                          borderRadius: normalize(12),
                          marginRight: normalize(8),
                          marginBottom: normalize(6),
                        }}
                      >
                        <Text style={{ fontSize: normalize(12), color: '#0EA5E9' }}>{service}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {clinic.dentists?.length > 0 && (
                  <View style={{ marginTop: normalize(14) }}>
                    <Text style={{ fontWeight: '600', color: '#0F172A', marginBottom: normalize(8), fontSize: normalize(13) }}>
                      Dokter di klinik ini
                    </Text>
                    {clinic.dentists.map((dentist) => (
                      <TouchableOpacity
                        key={`${clinic.id}-${dentist.id}`}
                        onPress={() => handleDentistPress(dentist)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: normalize(8),
                        }}
                      >
                        <Image
                          source={{ uri: dentist.avatar }}
                          style={{ width: normalize(42), height: normalize(42), borderRadius: normalize(21), marginRight: normalize(12) }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: '600', color: '#0F172A', fontSize: normalize(14) }}>{dentist.name}</Text>
                          <Text style={{ color: '#94A3B8', fontSize: normalize(12) }}>{dentist.specialization}</Text>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={normalize(20)} color="#CBD5F5" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {!searching && query.trim() && !dentistResults.length && !clinicResults.length && !serviceResults.length && !specializationResults.length && (
          <View style={{ paddingVertical: normalize(48), alignItems: 'center' }}>
            <MaterialCommunityIcons name="emoticon-confused-outline" size={normalize(48)} color="#CBD5F5" />
            <Text style={{ fontSize: normalize(16), fontWeight: '600', color: '#0F172A', marginTop: normalize(12) }}>
              Hasil tidak ditemukan
            </Text>
            <Text style={{ textAlign: 'center', color: '#94A3B8', marginTop: normalize(6), fontSize: normalize(14) }}>
              Coba gunakan kata kunci lain atau cari berdasarkan layanan populer.
            </Text>
          </View>
        )}
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

export default SearchScreen;
