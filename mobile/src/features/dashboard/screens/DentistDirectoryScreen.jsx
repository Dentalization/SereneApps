import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, StatusBar, Image } from 'react-native';
import { Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
// 1. Import ditambahkan di sini
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getDentistDirectory, getNearbyDentists } from '../../../services/dentistService';
import { API_BASE_URL } from '../../../services/api';
import ValidationToast from '../../settings/components/ValidationToast';
import useToast from '../../../hooks/useToast';

const slugify = (value = '') =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const DEFAULT_COORDS = {
  latitude: -6.2088,
  longitude: 106.8456,
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

const mapDentist = (dentist) => {
  const years = dentist.yearsOfExperience || 0;
  const baseRating = 4 + Math.min(1, years / 15);

  return {
    id: dentist.id?.toString() || dentist.userId?.toString(),
    name: dentist.name || dentist.clinicName || 'Dokter Gigi',
    specialty: dentist.specialization || 'Dentist',
    clinic: dentist.clinicName || dentist.clinicAddress || 'Alamat Klinik',
    rating: Number(baseRating.toFixed(1)),
    reviews: dentist.reviewCount || 0,
    price: dentist.consultationFee || 0,
    image: resolveAvatar(dentist.avatarUrl || dentist.image, dentist.id),
    consultationTypes: dentist.consultationTypes,
    raw: dentist,
  };
};

const DentistDirectoryScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  
  // 2. Definisi insets ditambahkan di sini
  const insets = useSafeAreaInsets();

  const [dentists, setDentists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usedFallback, setUsedFallback] = useState(false);

  const { toast, showToast, hideToast } = useToast();

  const fetchDentists = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let apiDentists = [];
      try {
        const directoryResponse = await getDentistDirectory({
          verifiedOnly: true,
          limit: 200,
        });
        apiDentists = directoryResponse.data?.dentists || [];
        setUsedFallback(false);
      } catch (dirError) {
        console.log('ℹ️ [DentistDirectory] Using nearby fallback:', dirError.message);
        const nearbyResponse = await getNearbyDentists({
          latitude: DEFAULT_COORDS.latitude,
          longitude: DEFAULT_COORDS.longitude,
          radius: 50,
          limit: 200,
        });
        apiDentists = nearbyResponse.data?.dentists || [];
        setUsedFallback(true);
      }

      console.log('📸 First 3 dentists with avatars:', apiDentists.slice(0, 3).map(d => ({
        id: d.id,
        name: d.name,
        avatarUrl: d.avatarUrl
      })));

      setDentists(apiDentists.map(mapDentist));
    } catch (err) {
      console.log('🔍 [DentistDirectory] Failed to load:', err.message);
      setError('Gagal memuat data dokter. Tarik untuk menyegarkan atau coba lagi nanti.');
      showToast('Gagal memuat daftar dokter', 'error');
      setDentists([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDentists();
  }, [fetchDentists]);

  const groups = useMemo(() => {
    const map = dentists.reduce((acc, dentist) => {
      const id = slugify(dentist.specialty || 'lainnya');
      if (!acc[id]) {
        acc[id] = {
          id,
          label: dentist.specialty || 'Spesialis Lainnya',
          dentists: [],
        };
      }
      acc[id].dentists.push(dentist);
      return acc;
    }, {});

    return Object.values(map)
      .map((group) => {
        const totalRating = group.dentists.reduce((sum, doc) => sum + (doc.rating || 0), 0);
        return {
          ...group,
          count: group.dentists.length,
          avgRating: group.dentists.length ? (totalRating / group.dentists.length).toFixed(1) : '0.0',
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [dentists]);

  const colorPresets = [
    ['#C084FC', '#9333EA'],
    ['#60A5FA', '#2563EB'],
    ['#34D399', '#059669'],
    ['#FBBF24', '#F97316'],
    ['#F472B6', '#DB2777'],
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

      <LinearGradient
        colors={[theme.colors.primary, '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          // 3. Sekarang insets.top sudah terbaca dengan benar
          paddingTop: insets.top + 2,
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
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: 'rgba(255,255,255,0.2)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <MaterialCommunityIcons name="arrow-left" size={20} color="white" />
          </TouchableOpacity>
          <View style={{ flex: 1, paddingHorizontal: 12 }}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Direktori dokter</Text>
            <Text style={{ color: 'white', fontSize: 24, fontWeight: '800', marginTop: 4 }}>
              Pilih spesialis
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.75)', marginTop: 6 }}>
              {dentists.length} dokter tepercaya · {groups.length} spesialisasi
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('AppointmentTab', { screen: 'ClinicSearch' })}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: 'rgba(255,255,255,0.2)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <MaterialCommunityIcons name="calendar-plus" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
      >
        <View>
          {loading && (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <ActivityIndicator animating size="large" color={theme.colors.primary} />
              <Text style={{ marginTop: 12, color: '#475569' }}>Memuat data dokter...</Text>
            </View>
          )}

          {error && !loading && (
            <TouchableOpacity
              onPress={fetchDentists}
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
              <Text style={{ color: '#9F1239' }}>{error}</Text>
              <Text style={{ color: '#9F1239', marginTop: 8, fontWeight: '600' }}>Ketuk untuk coba lagi</Text>
            </TouchableOpacity>
          )}

          {!loading && !error && groups.length === 0 && (
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
              <MaterialCommunityIcons name="database-off" size={36} color="#94A3B8" />
              <Text style={{ marginTop: 12, fontWeight: '600', color: '#0F172A', fontSize: 16 }}>
                Data belum tersedia
              </Text>
              <Text style={{ color: '#94A3B8', marginTop: 4, textAlign: 'center' }}>
                Kami belum menemukan dokter di area Anda. Silakan coba lagi nanti.
              </Text>
            </View>
          )}

          <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 16 }}>
            Spesialis tersedia
          </Text>

          {groups.map((group, index) => {
            const colors = colorPresets[index % colorPresets.length];
            return (
              <TouchableOpacity
                key={group.id}
                activeOpacity={0.92}
                onPress={() =>
                  navigation.navigate('DentistSpecialty', {
                    specialtyId: group.id,
                    specialtyLabel: group.label,
                    dentists: group.dentists,
                    avgRating: group.avgRating,
                  })
                }
                style={{ marginBottom: 18 }}
              >
                <LinearGradient
                  colors={colors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    borderRadius: 28,
                    padding: 20,
                    minHeight: 150,
                    shadowColor: colors[1],
                    shadowOffset: { width: 0, height: 16 },
                    shadowOpacity: 0.35,
                    shadowRadius: 20,
                    elevation: 6,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <View
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 24,
                          backgroundColor: 'rgba(255,255,255,0.18)',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: 14,
                        }}
                      >
                        <MaterialCommunityIcons name="tooth" size={24} color="white" />
                      </View>
                      <Text style={{ color: 'white', fontSize: 22, fontWeight: '800' }}>{group.label}</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.85)', marginTop: 6, fontSize: 13 }}>
                        {group.count} dokter · rating rata-rata {group.avgRating}
                      </Text>
                    </View>
                    <View
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 18,
                        backgroundColor: 'rgba(255,255,255,0.15)',
                      }}
                    >
                      <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>Lihat dokter</Text>
                    </View>
                  </View>
                  <View
                    style={{
                      flexDirection: 'row',
                      marginTop: 18,
                      justifyContent: 'space-between',
                    }}
                  >
                    <InfoChip icon="account-multiple" label="Dokter" value={`${group.count}`} />
                    <InfoChip icon="crown" label="Terverifikasi" value="Prioritas" />
                    <InfoChip icon="star" label="Rating" value={`${group.avgRating}/5`} />
                  </View>

                  {/* Show dentist avatars preview */}
                  <View style={{ flexDirection: 'row', marginTop: 16, alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', marginRight: 8 }}>
                      {group.dentists.slice(0, 4).map((dentist, idx) => (
                        <Image
                          key={dentist.id}
                          source={{ uri: dentist.image }}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            borderWidth: 2,
                            borderColor: 'white',
                            marginLeft: idx > 0 ? -12 : 0,
                          }}
                        />
                      ))}
                    </View>
                    <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' }}>
                      {group.count > 4 ? `+${group.count - 4} dokter lainnya` : `${group.count} dokter tersedia`}
                    </Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>
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

const InfoChip = ({ icon, label, value }) => (
  <View
    style={{
      flex: 1,
      marginRight: 8,
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    }}
  >
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <MaterialCommunityIcons name={icon} size={14} color="white" />
      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, marginLeft: 6 }}>{label}</Text>
    </View>
    <Text style={{ color: 'white', fontWeight: '700', marginTop: 4, fontSize: 13 }}>{value}</Text>
  </View>
);

export default DentistDirectoryScreen;