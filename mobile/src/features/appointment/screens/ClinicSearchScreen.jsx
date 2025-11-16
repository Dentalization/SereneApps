import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { Text, Searchbar, Chip, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import useHideTabBar from '../../../hooks/useHideTabBar';
import useAnchoredHeaderHeight from '../../../hooks/useAnchoredHeaderHeight';

const filters = [
  { key: 'all', label: 'Semua' },
  { key: 'nearby', label: 'Terdekat' },
  { key: 'highest_rated', label: 'Rating Tertinggi' },
  { key: 'available', label: 'Tersedia Hari Ini' },
  { key: 'insurance', label: 'BPJS / Asuransi' },
];

const clinics = [
  {
    id: 1,
    name: 'SereneAI Dental Sudirman',
    address: 'Jl. Sudirman No. 123, Jakarta Pusat',
    distance: '1.2 km',
    rating: 4.9,
    reviews: 276,
    dentists: 6,
    status: 'Tersedia hari ini',
    chips: ['Digital X-ray', 'Aligner center'],
  },
  {
    id: 2,
    name: 'Glow Dental Menteng',
    address: 'Jl. Menteng Raya No. 45, Jakarta Pusat',
    distance: '2.4 km',
    rating: 4.7,
    reviews: 198,
    dentists: 4,
    status: 'Virtual ready',
    chips: ['Teledentistry', 'Anak & Dewasa'],
  },
  {
    id: 3,
    name: 'Smiles Lab Kemang',
    address: 'Jl. Kemang Raya No. 9, Jakarta Selatan',
    distance: '4.1 km',
    rating: 4.8,
    reviews: 165,
    dentists: 5,
    status: 'Booking 2 jam lagi',
    chips: ['Whitening suite', 'Sedation'],
  },
];

const ClinicSearchScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  useHideTabBar(navigation);
  const { headerHeight, handleHeaderLayout } = useAnchoredHeaderHeight(300);

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
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Explorer</Text>
              <Text style={styles.heroTitle}>Temukan klinik terbaik</Text>
            </View>
            <TouchableOpacity
              style={styles.heroBack}
              onPress={() => navigation.navigate('NearbyDentists', { maxDistanceKm: 5 })}
            >
              <MaterialCommunityIcons name='map-search' size={22} color='white' />
            </TouchableOpacity>
          </View>
          <Text style={styles.heroSubtitle}>Kurasi klinik dengan teknologi modern & dokter pilihan Serene.</Text>

          <View style={styles.heroStats}>
            <StatPill icon='map-marker' label='Dekat Anda' value='8 klinik' />
            <StatPill icon='star' label='Rating rata-rata' value='4.8/5' />
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
          {clinics.map((clinic) => (
            <TouchableOpacity
              key={clinic.id}
              onPress={() => navigation.navigate('ClinicDetail', { clinicId: clinic.id })}
              style={styles.card}
              activeOpacity={0.9}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A' }}>{clinic.name}</Text>
                  <View style={styles.metaRow}>
                    <MaterialCommunityIcons name='map-marker' size={16} color='#CBD5F5' />
                    <Text style={styles.metaText}>{clinic.address}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <MaterialCommunityIcons name='map-marker-distance' size={16} color='#CBD5F5' />
                    <Text style={styles.metaText}>{clinic.distance}</Text>
                  </View>
                </View>
                <View style={styles.ratingBadge}>
                  <Text style={{ color: '#0F172A', fontWeight: '700', fontSize: 16 }}>{clinic.rating}</Text>
                  <Text style={{ color: '#94A3B8', fontSize: 11 }}>{clinic.reviews} ulasan</Text>
                </View>
              </View>

              <View style={styles.infoChips}>
                <InfoChip icon='doctor' label={`${clinic.dentists} dokter`} />
                <InfoChip icon='calendar-clock' label={clinic.status} />
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                {clinic.chips.map((chip) => (
                  <View key={chip} style={styles.facilityChip}>
                    <Text style={{ color: '#7C3AED', fontWeight: '600', fontSize: 12 }}>{chip}</Text>
                  </View>
                ))}
              </ScrollView>
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
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#EEF2FF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
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
});

export default ClinicSearchScreen;
