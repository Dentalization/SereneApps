import React, { useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  ImageBackground,
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
import useAnchoredHeaderHeight from '../../../hooks/useAnchoredHeaderHeight';
import useNearbyClinics from '../../../hooks/useNearbyClinics';
import resolveMediaUrl from '../../../utils/media';
import StatPill from '../../../components/shared/StatPill';
import { colors as THEME_COLORS, withOpacity } from '../../../theme/colors';
import { typography as TYPOGRAPHY } from '../../../theme/dimensions';

const COLORS = THEME_COLORS;
const filters = [
  { key: 'all', label: 'Semua' },
  { key: 'nearby', label: 'Terdekat' },
  { key: 'highest_rated', label: 'Rating Tertinggi' },
  { key: 'available_today', label: 'Tersedia Hari Ini' },
  { key: 'insurance', label: 'BPJS / Asuransi' },
];

const formatDistance = (clinic) => {
  if (typeof clinic.distanceKm === 'number') {
    return `${clinic.distanceKm.toFixed(1)} km`;
  }
  if (typeof clinic.distance === 'number') {
    return `${clinic.distance.toFixed(1)} km`;
  }
  return clinic.distance || '—';
};

const isClinicAvailable = (clinic) => {
  if (typeof clinic.isOpenNow === 'boolean') return clinic.isOpenNow;
  if (typeof clinic.openStatus === 'string') {
    const lowered = clinic.openStatus.toLowerCase();
    return lowered.includes('buka') && !lowered.includes('tutup');
  }
  return false;
};

const StatChip = ({ icon, label }) => (
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: withOpacity(COLORS.white, 0.2),
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      marginRight: 8,
    }}
  >
    <MaterialCommunityIcons name={icon} size={14} color="white" />
    <Text
      style={{
        color: COLORS.white,
        marginLeft: 6,
        ...TYPOGRAPHY.caption,
        fontWeight: '600',
      }}
    >
      {label}
    </Text>
  </View>
);

const ActionButton = ({ label, icon, onPress, variant }) => {
  const isFilled = variant === 'filled';
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 999,
        backgroundColor: isFilled ? COLORS.white : withOpacity(COLORS.white, 0.15),
        borderWidth: isFilled ? 0 : 1,
        borderColor: withOpacity(COLORS.white, 0.4),
        marginLeft: isFilled ? 12 : 0,
      }}
    >
      <MaterialCommunityIcons
        name={icon}
        size={16}
        color={isFilled ? COLORS.textPrimary : COLORS.white}
      />
      <Text
        style={{
          color: isFilled ? COLORS.textPrimary : COLORS.white,
          fontWeight: '700',
          marginLeft: 6,
          ...TYPOGRAPHY.bodySmall,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const ClinicSearchScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  const {
    clinics,
    loading,
    error,
    refresh,
    location,
    usedDefaultLocation,
  } = useNearbyClinics({
    radius: 12,
    limit: 30,
    allowRadiusExpansion: false,
    strictRadius: true,
  });

  const { headerHeight, handleHeaderLayout } = useAnchoredHeaderHeight(300);

  const filteredClinics = useMemo(() => {
    let data = Array.isArray(clinics) ? [...clinics] : [];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      data = data.filter((clinic) => {
        const nameMatch = clinic.name?.toLowerCase().includes(q);
        const address = (
          clinic.addressText ||
          clinic.address ||
          ''
        )
          .toString()
          .toLowerCase();
        const addressMatch = address.includes(q);
        const cityMatch = clinic.city?.toLowerCase().includes(q);
        return nameMatch || addressMatch || cityMatch;
      });
    }

    switch (selectedFilter) {
      case 'nearby': {
        data = [...data].sort((a, b) => {
          const aDist =
            typeof a.distanceKm === 'number'
              ? a.distanceKm
              : Number(a.distance) || Infinity;
          const bDist =
            typeof b.distanceKm === 'number'
              ? b.distanceKm
              : Number(b.distance) || Infinity;
          return aDist - bDist;
        });
        break;
      }
      case 'highest_rated':
        data = [...data].sort(
          (a, b) => (b.rating || 0) - (a.rating || 0),
        );
        break;
      case 'available_today':
        data = data.filter(isClinicAvailable);
        break;
      case 'insurance':
        data = data.filter((clinic) =>
          (clinic.highlights || []).some((item) => {
            if (typeof item !== 'string') return false;
            const lowered = item.toLowerCase();
            return (
              lowered.includes('insurance') ||
              lowered.includes('bpjs') ||
              lowered.includes('asuransi')
            );
          }),
        );
        break;
      default:
        break;
    }

    return data;
  }, [clinics, searchQuery, selectedFilter]);

  const stats = useMemo(() => {
    const total = clinics.length;
    const nearby = clinics.filter(
      (clinic) => (clinic.distanceKm || 0) <= 10,
    ).length;
    const avgRating = total
      ? (
          clinics.reduce(
            (sum, clinic) => sum + (clinic.rating || 0),
            0,
          ) / total
        ).toFixed(1)
      : '0.0';
    return { total, nearby, avgRating };
  }, [clinics]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <View
        onLayout={handleHeaderLayout}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
        }}
      >
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 2 }]}
        >
          <View style={styles.heroHeader}>
            <TouchableOpacity
              style={styles.heroBack}
              onPress={() => navigation.goBack()}
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={22}
                color={COLORS.white}
              />
            </TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
              <Text
                style={{
                  color: withOpacity(COLORS.white, 0.7),
                  ...TYPOGRAPHY.caption,
                }}
              >
                Penjelajah
              </Text>
              <Text style={styles.heroTitle}>
                Temukan klinik terbaik
              </Text>
            </View>
            <TouchableOpacity
              style={styles.heroBack}
              onPress={() =>
                navigation.navigate('NearbyDentists', {
                  maxDistanceKm: 5,
                })
              }
            >
              <MaterialCommunityIcons
                name="map-search"
                size={22}
                color="white"
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.heroSubtitle}>
            {usedDefaultLocation
              ? 'Menampilkan klinik populer karena lokasi perangkat belum aktif.'
              : 'Kurasi klinik dengan teknologi modern & dokter pilihan Serene.'}
          </Text>

          <View style={styles.heroStats}>
            <StatPill
              variant="horizontal"
              icon="map-marker"
              label="Dekat Anda"
              value={`${stats.nearby} klinik`}
            />
            <StatPill
              variant="horizontal"
              icon="star"
              label="Rating rata-rata"
              value={`${stats.avgRating}/5`}
            />
          </View>

          <Searchbar
            placeholder="Cari nama klinik atau lokasi"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.heroSearch}
            inputStyle={{ color: COLORS.textPrimary, ...TYPOGRAPHY.body }}
            iconColor={COLORS.textMuted}
            accessibilityLabel="Cari klinik"
          />
        </LinearGradient>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight + 16,
          paddingBottom: 140,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} />
        }
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ paddingHorizontal: 20, marginTop: 8 }}
        >
          {filters.map((filter) => {
            const active = selectedFilter === filter.key;
            return (
              <Chip
                key={filter.key}
                selected={active}
                onPress={() => setSelectedFilter(filter.key)}
                accessibilityLabel={`Filter ${filter.label}`}
                accessibilityRole="button"
                style={{
                  marginRight: 10,
                  height: 38,
                  backgroundColor: active ? withOpacity(COLORS.primary, 0.1) : COLORS.surfaceElevated,
                  borderColor: active ? COLORS.primary : COLORS.border,
                  borderWidth: 1,
                }}
                textStyle={{
                  color: active ? COLORS.primary : COLORS.textSecondary,
                  fontWeight: '600',
                }}
              >
                {filter.label}
              </Chip>
            );
          })}
        </ScrollView>

        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          {error ? (
            <TouchableOpacity
              onPress={refresh}
              style={{
                backgroundColor: withOpacity(COLORS.error, 0.15),
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: withOpacity(COLORS.error, 0.3),
              }}
            >
              <Text
                style={{
                  color: COLORS.error,
                  fontWeight: '700',
                  ...TYPOGRAPHY.h5,
                }}
              >
                Tidak dapat memuat klinik
              </Text>
              <Text
                style={{
                  color: COLORS.error,
                  marginTop: 4,
                  ...TYPOGRAPHY.bodySmall,
                }}
              >
                Ketuk untuk coba lagi
              </Text>
            </TouchableOpacity>
          ) : null}

          {!filteredClinics.length && !loading ? (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <MaterialCommunityIcons
                name="hospital-box-outline"
                size={56}
                color={withOpacity(COLORS.primary, 0.2)}
              />
              <Text
                style={{
                  ...TYPOGRAPHY.h4,
                  color: COLORS.textPrimary,
                  marginTop: 12,
                }}
              >
                Klinik tidak ditemukan
              </Text>
              <Text
                style={{
                  color: COLORS.textSecondary,
                  textAlign: 'center',
                  marginTop: 4,
                  ...TYPOGRAPHY.bodySmall,
                }}
              >
                Coba ubah kata kunci atau filter pencarian Anda.
              </Text>
            </View>
          ) : null}

          {loading && !clinics.length ? (
            <View
              style={{
                alignItems: 'center',
                paddingVertical: 40,
              }}
            >
              <ActivityIndicator
                animating
                color={COLORS.primary}
              />
              <Text
                style={{ marginTop: 12, color: COLORS.textSecondary, ...TYPOGRAPHY.bodySmall }}
              >
                Memuat klinik terdekat...
              </Text>
            </View>
          ) : null}

          {filteredClinics.map((clinic) => {
            let imageUri =
              resolveMediaUrl(clinic.heroImage) ||
              resolveMediaUrl(clinic.coverImage) ||
              clinic.heroImage ||
              clinic.coverImage;

            if (
              !imageUri &&
              Array.isArray(clinic.gallery) &&
              clinic.gallery.length > 0
            ) {
              imageUri =
                resolveMediaUrl(clinic.gallery[0]) ||
                clinic.gallery[0];
            }

            if (!imageUri || imageUri.includes('photo-160000')) {
              imageUri =
                'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop';
            }

            return (
              <TouchableOpacity
                key={clinic.id}
                onPress={() =>
                  navigation.navigate('ClinicDetail', {
                    clinicId: clinic.id,
                    clinic,
                    coords: location,
                  })
                }
                accessibilityLabel={`Klinik ${clinic.name}, Jarak ${formatDistance(clinic)}, Rating ${clinic.rating || 4.8}`}
                accessibilityRole="button"
                style={{ marginBottom: 20 }}
                activeOpacity={0.9}
              >
                <ImageBackground
                  source={{ uri: imageUri }}
                  style={{
                    width: '100%',
                    height: 240,
                    borderRadius: 24,
                    overflow: 'hidden',
                  }}
                  imageStyle={{ borderRadius: 24 }}
                >
                  <LinearGradient
                    colors={[
                      withOpacity(COLORS.textPrimary, 0.1),
                      withOpacity(COLORS.textPrimary, 0.75),
                    ]}
                    style={{
                      flex: 1,
                      padding: 20,
                      justifyContent: 'space-between',
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                      }}
                    >
                      <View
                        style={{
                          backgroundColor: withOpacity(COLORS.white, 0.95),
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: 999,
                          flexDirection: 'row',
                          alignItems: 'center',
                        }}
                      >
                        <MaterialCommunityIcons
                          name="map-marker-distance"
                          size={16}
                          color={COLORS.primary}
                        />
                        <Text
                          style={{
                            color: COLORS.textPrimary,
                            fontWeight: '700',
                            marginLeft: 6,
                            ...TYPOGRAPHY.caption,
                          }}
                        >
                          {formatDistance(clinic)}
                        </Text>
                      </View>

                      <View
                        style={{
                          backgroundColor: withOpacity(COLORS.white, 0.95),
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 999,
                          flexDirection: 'row',
                          alignItems: 'center',
                        }}
                      >
                        <MaterialCommunityIcons
                          name="star"
                          size={14}
                          color={COLORS.warning}
                        />
                        <Text
                          style={{
                            color: COLORS.textPrimary,
                            fontWeight: '700',
                            marginLeft: 4,
                            ...TYPOGRAPHY.caption,
                          }}
                        >
                          {(clinic.rating || 4.8).toFixed(1)}
                        </Text>
                      </View>
                    </View>

                    <View>
                      <Text
                        style={{
                          color: COLORS.white,
                          ...TYPOGRAPHY.h3,
                          marginBottom: 6,
                        }}
                      >
                        {clinic.name}
                      </Text>
                      <Text
                        style={{
                          color: withOpacity(COLORS.white, 0.9),
                          ...TYPOGRAPHY.bodySmall,
                          marginBottom: 14,
                        }}
                      >
                        {clinic.tagline ||
                          clinic.addressText ||
                          clinic.address ||
                          clinic.city}
                      </Text>

                      <View
                        style={{
                          flexDirection: 'row',
                          marginBottom: 14,
                        }}
                      >
                        <StatChip
                          icon="doctor"
                          label={`${clinic.dentistCount || 0} Dokter`}
                        />
                        <StatChip
                          icon="clock-outline"
                          label={
                            clinic.isOpenNow
                              ? 'Buka'
                              : clinic.openStatus ||
                                'Jadwal Fleksibel'
                          }
                        />
                      </View>

                      <View style={{ flexDirection: 'row' }}>
                        <ActionButton
                          label="Info"
                          icon="information-outline"
                          onPress={() =>
                            navigation.navigate('ClinicDetail', {
                              clinicId: clinic.id,
                              clinic,
                              coords: location,
                            })
                          }
                          variant="outline"
                        />
                        <ActionButton
                          label="Booking"
                          icon="calendar-check"
                          onPress={() =>
                            navigation.navigate('ClinicDetail', {
                              clinicId: clinic.id,
                              clinic,
                              coords: location,
                              autoScrollToBooking: true,
                            })
                          }
                          variant="filled"
                        />
                      </View>
                    </View>
                  </LinearGradient>
                </ImageBackground>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const InfoChip = ({ icon, label }) => (
  <View style={styles.infoChip}>
    <MaterialCommunityIcons name={icon} size={14} color={COLORS.primary} />
    <Text
      style={{
        marginLeft: 6,
        color: COLORS.primary,
        fontWeight: '600',
        ...TYPOGRAPHY.caption,
      }}
    >
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroBack: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: withOpacity(COLORS.white, 0.2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { color: COLORS.white, ...TYPOGRAPHY.h3 },
  heroSubtitle: {
    color: withOpacity(COLORS.white, 0.85),
    marginTop: 10,
    ...TYPOGRAPHY.bodySmall,
    lineHeight: 20,
  },
  heroStats: { flexDirection: 'row', marginTop: 18 },
  heroSearch: {
    marginTop: 18,
    backgroundColor: COLORS.white,
    borderRadius: 18,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  imageWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardTitle: { ...TYPOGRAPHY.h4, color: COLORS.textPrimary },
  cardSubtitle: { color: COLORS.textMuted, ...TYPOGRAPHY.caption, marginBottom: 4 },
  ratingBadge: {
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  metaText: {
    color: COLORS.textMuted,
    marginLeft: 6,
    ...TYPOGRAPHY.caption,
    flex: 1,
  },
  infoChips: { flexDirection: 'row', marginTop: 14 },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: withOpacity(COLORS.primary, 0.05),
    marginRight: 10,
  },
  facilityChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    marginRight: 10,
  },
  cardActions: {
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
});

export default ClinicSearchScreen;
