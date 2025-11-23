import React, { useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, StatusBar, RefreshControl, ImageBackground } from 'react-native';
import { ActivityIndicator, Text, Searchbar, Chip, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import useAnchoredHeaderHeight from '../../../hooks/useAnchoredHeaderHeight';
import useNearbyClinics from '../../../hooks/useNearbyClinics';

const filters = [
  { key: 'all', label: 'Semua' },
  { key: 'nearby', label: 'Terdekat' },
  { key: 'highest_rated', label: 'Rating Tertinggi' },
  { key: 'available', label: 'Tersedia Hari Ini' },
  { key: 'insurance', label: 'BPJS / Asuransi' },
];

const formatDistance = (clinic) =>
  typeof clinic.distanceKm === 'number'
    ? `${clinic.distanceKm.toFixed(1)} km`
    : clinic.distance || '—';

const StatChip = ({ icon, label }) => (
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      marginRight: 8,
    }}
  >
    <MaterialCommunityIcons name={icon} size={14} color="white" />
    <Text style={{ color: 'white', marginLeft: 6, fontSize: 12, fontWeight: '600' }}>{label}</Text>
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
        backgroundColor: isFilled ? 'white' : 'rgba(255,255,255,0.15)',
        borderWidth: isFilled ? 0 : 1,
        borderColor: 'rgba(255,255,255,0.4)',
        marginLeft: isFilled ? 12 : 0,
      }}
    >
      <MaterialCommunityIcons name={icon} size={16} color={isFilled ? '#1D1B20' : 'white'} />
      <Text
        style={{
          color: isFilled ? '#1D1B20' : 'white',
          fontWeight: '700',
          marginLeft: 6,
          fontSize: 13,
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const {
    clinics,
    loading,
    error,
    refresh,
    location,
    usedDefaultLocation,
  } = useNearbyClinics({ radius: 12, limit: 50 });

  const { headerHeight, handleHeaderLayout } = useAnchoredHeaderHeight(300);

  const filteredClinics = useMemo(() => {
    let data = clinics;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(
        (clinic) =>
          clinic.name?.toLowerCase().includes(q) ||
          clinic.address?.toLowerCase().includes(q) ||
          clinic.city?.toLowerCase().includes(q)
      );
    }

    switch (selectedFilter) {
      case 'nearby':
        data = [...data].sort((a, b) => (a.distanceKm || Infinity) - (b.distanceKm || Infinity));
        break;
      case 'highest_rated':
        data = [...data].sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'available':
        data = data.filter((clinic) => clinic.isOpenNow);
        break;
      case 'insurance':
        data = data.filter((clinic) =>
          (clinic.highlights || []).some((item) => item.toLowerCase().includes('insurance'))
        );
        break;
      default:
        break;
    }

    return data;
  }, [clinics, searchQuery, selectedFilter]);

  const stats = useMemo(() => {
    const total = clinics.length;
    const nearby = clinics.filter((clinic) => (clinic.distanceKm || 0) <= 10).length;
    const avgRating = total
      ? (clinics.reduce((sum, clinic) => sum + (clinic.rating || 0), 0) / total).toFixed(1)
      : '0.0';
    return { total, nearby, avgRating };
  }, [clinics]);

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle='light-content' backgroundColor='#7C3AED' />

      <View
        onLayout={handleHeaderLayout}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}
      >
        <LinearGradient
          colors={['#7C3AED', '#9D5DF5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroHeader}>
            <TouchableOpacity style={styles.heroBack} onPress={() => navigation.goBack()}>
              <MaterialCommunityIcons name='arrow-left' size={22} color='white' />
            </TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Penjelajah</Text>
              <Text style={styles.heroTitle}>Temukan klinik terbaik</Text>
            </View>
            <TouchableOpacity
              style={styles.heroBack}
              onPress={() => navigation.navigate('NearbyDentists', { maxDistanceKm: 5 })}
            >
              <MaterialCommunityIcons name='map-search' size={22} color='white' />
            </TouchableOpacity>
          </View>
          <Text style={styles.heroSubtitle}>
            {usedDefaultLocation
              ? 'Menampilkan klinik populer karena lokasi perangkat belum aktif.'
              : 'Kurasi klinik dengan teknologi modern & dokter pilihan Serene.'}
          </Text>

          <View style={styles.heroStats}>
            <StatPill icon='map-marker' label='Dekat Anda' value={`${stats.nearby} klinik`} />
            <StatPill icon='star' label='Rating rata-rata' value={`${stats.avgRating}/5`} />
          </View>

          <Searchbar
            placeholder='Cari nama klinik atau lokasi'
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.heroSearch}
            inputStyle={{ color: '#0F172A' }}
            iconColor='#94A3B8'
          />
        </LinearGradient>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingTop: headerHeight + 16, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 20, marginTop: 8 }}>
          {filters.map((filter) => {
            const active = selectedFilter === filter.key;
            return (
              <Chip
                key={filter.key}
                selected={active}
                onPress={() => setSelectedFilter(filter.key)}
                style={{
                  marginRight: 10,
                  height: 38,
                  backgroundColor: active ? '#EEF2FF' : 'white',
                  borderColor: active ? '#7C3AED' : '#E2E8F0',
                  borderWidth: 1,
                }}
                textStyle={{ color: active ? '#7C3AED' : '#475569', fontWeight: '600' }}
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
                backgroundColor: '#FEE2E2',
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: '#FECACA',
              }}
            >
              <Text style={{ color: '#B91C1C', fontWeight: '700' }}>Tidak dapat memuat klinik</Text>
              <Text style={{ color: '#B91C1C', marginTop: 4 }}>Ketuk untuk coba lagi</Text>
            </TouchableOpacity>
          ) : null}

          {!filteredClinics.length && !loading ? (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <MaterialCommunityIcons name='hospital-box-outline' size={56} color='#CBD5F5' />
              <Text style={{ fontWeight: '700', color: '#0F172A', marginTop: 12 }}>
                Klinik tidak ditemukan
              </Text>
              <Text style={{ color: '#475569', textAlign: 'center', marginTop: 4 }}>
                Coba ubah kata kunci atau filter pencarian Anda.
              </Text>
            </View>
          ) : null}

          {loading && !clinics.length ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <ActivityIndicator animating color={theme.colors.primary} />
              <Text style={{ marginTop: 12, color: '#475569' }}>Memuat klinik terdekat...</Text>
            </View>
          ) : null}

          {filteredClinics.map((clinic) => (
            <TouchableOpacity
              key={clinic.id}
              onPress={() =>
                navigation.navigate('ClinicDetail', {
                  clinicId: clinic.id,
                  clinic,
                  coords: location,
                })
              }
              style={{ marginBottom: 20 }}
              activeOpacity={0.9}
            >
              <ImageBackground
                source={{
                  uri:
                    clinic.coverImage ||
                    clinic.heroImage ||
                    'https://images.unsplash.com/photo-1629909613654-28e377c37b09',
                }}
                style={{
                  width: '100%',
                  height: 240,
                  borderRadius: 24,
                  overflow: 'hidden',
                }}
                imageStyle={{ borderRadius: 24 }}
              >
                <LinearGradient
                  colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.75)']}
                  style={{
                    flex: 1,
                    padding: 20,
                    justifyContent: 'space-between',
                  }}
                >
                  {/* Top Row: Distance Badge + Rating */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.95)',
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 999,
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}
                    >
                      <MaterialCommunityIcons name='map-marker-distance' size={16} color='#7C3AED' />
                      <Text style={{ color: '#1D1B20', fontWeight: '700', marginLeft: 6, fontSize: 13 }}>
                        {formatDistance(clinic)}
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.95)',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 999,
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}
                    >
                      <MaterialCommunityIcons name='star' size={14} color='#F59E0B' />
                      <Text style={{ color: '#1D1B20', fontWeight: '700', marginLeft: 4, fontSize: 13 }}>
                        {(clinic.rating || 4.8).toFixed(1)}
                      </Text>
                    </View>
                  </View>

                  {/* Bottom Section: Clinic Info + Actions */}
                  <View>
                    <Text style={{ color: 'white', fontSize: 20, fontWeight: '800', marginBottom: 6 }}>
                      {clinic.name}
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, marginBottom: 14 }}>
                      {clinic.tagline || clinic.address}
                    </Text>

                    {/* Stats Chips */}
                    <View style={{ flexDirection: 'row', marginBottom: 14 }}>
                      <StatChip icon='doctor' label={`${clinic.dentistCount || 0} Dokter`} />
                      <StatChip
                        icon='clock-outline'
                        label={clinic.isOpenNow ? 'Buka' : clinic.openStatus || 'Jadwal Fleksibel'}
                      />
                    </View>

                    {/* Action Buttons */}
                    <View style={{ flexDirection: 'row' }}>
                      <ActionButton
                        label='Info'
                        icon='information-outline'
                        onPress={() =>
                          navigation.navigate('ClinicDetail', {
                            clinicId: clinic.id,
                            clinic,
                            coords: location,
                          })
                        }
                        variant='outline'
                      />
                      <ActionButton
                        label='Booking'
                        icon='calendar-check'
                        onPress={() =>
                          navigation.navigate('ClinicDetail', {
                            clinicId: clinic.id,
                            clinic,
                            coords: location,
                          })
                        }
                        variant='filled'
                      />
                    </View>
                  </View>
                </LinearGradient>
              </ImageBackground>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const StatPill = ({ icon, label, value }) => (
  <View style={styles.statPill}>
    <MaterialCommunityIcons name={icon} size={18} color='white' />
    <View style={{ marginLeft: 8 }}>
      <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{label}</Text>
      <Text style={{ color: 'white', fontWeight: '700', marginTop: 2 }}>{value}</Text>
    </View>
  </View>
);

const InfoChip = ({ icon, label }) => (
  <View style={styles.infoChip}>
    <MaterialCommunityIcons name={icon} size={14} color='#4C1D95' />
    <Text style={{ marginLeft: 6, color: '#4C1D95', fontWeight: '600', fontSize: 12 }}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  hero: {
    paddingTop: 52,
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
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { color: 'white', fontSize: 20, fontWeight: '700' },
  heroSubtitle: { color: 'rgba(255,255,255,0.85)', marginTop: 10, lineHeight: 20 },
  heroStats: { flexDirection: 'row', marginTop: 18 },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginRight: 12,
  },
  heroSearch: {
    marginTop: 18,
    backgroundColor: 'white',
    borderRadius: 18,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#EEF2FF',
    shadowColor: '#4C1D95',
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
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  cardSubtitle: { color: '#94A3B8', fontSize: 13, marginBottom: 4 },
  ratingBadge: {
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  metaText: { color: '#94A3B8', marginLeft: 6, fontSize: 12, flex: 1 },
  infoChips: { flexDirection: 'row', marginTop: 14 },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F5F3FF',
    marginRight: 10,
  },
  facilityChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    marginRight: 10,
  },
  cardActions: {
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#EEF2FF',
    paddingTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
});

export default ClinicSearchScreen;
