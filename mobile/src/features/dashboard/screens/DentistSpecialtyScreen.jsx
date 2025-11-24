import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, Image, StatusBar } from 'react-native';
import { Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getDentistDirectory, getNearbyDentists } from '../../../services/dentistService';
import { API_BASE_URL } from '../../../services/api';
import ValidationToast from '../../settings/components/ValidationToast';
import useToast from '../../../hooks/useToast';

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
    clinic: dentist.clinicName || dentist.clinicAddress,
    rating: Number(baseRating.toFixed(1)),
    reviews: dentist.reviewCount || 0,
    price: dentist.consultationFee || 0,
    image: resolveAvatar(dentist.avatarUrl || dentist.image, dentist.id),
    consultationTypes: dentist.consultationTypes,
    raw: dentist,
  };
};

const DentistSpecialtyScreen = () => {
  const theme = useTheme();
  const route = useRoute();
  const navigation = useNavigation();

  const specialtyId = route.params?.specialtyId;
  const specialtyLabel = route.params?.specialtyLabel || 'Spesialis';
  const initialDentists = route.params?.dentists;
  const avgRating = route.params?.avgRating;
  const [dentists, setDentists] = useState(initialDentists || []);
  const [loading, setLoading] = useState(!initialDentists?.length);
  const [error, setError] = useState(null);

  const { toast, showToast, hideToast } = useToast();

  const fetchDentists = useCallback(async () => {
    if (!specialtyLabel) return;
    try {
      setLoading(true);
      setError(null);
      let apiDentists = [];
      try {
        const directoryResponse = await getDentistDirectory({
          specialization: specialtyLabel,
          verifiedOnly: true,
          limit: 50,
        });
        apiDentists = directoryResponse?.dentists || [];
      } catch (dirError) {
        console.log('ℹ️ [DentistSpecialty] Using nearby fallback:', dirError.message);
        const nearbyResponse = await getNearbyDentists({
          latitude: DEFAULT_COORDS.latitude,
          longitude: DEFAULT_COORDS.longitude,
          radius: 50,
          specialization: specialtyLabel,
          limit: 50,
        });
        apiDentists = nearbyResponse?.dentists || [];
      }
      setDentists(apiDentists.map(mapDentist));
    } catch (err) {
      console.log('🔍 [DentistSpecialty] Failed to load:', err.message);
      setError('Tidak dapat memuat daftar dokter untuk spesialisasi ini.');
      showToast('Gagal memuat daftar dokter', 'error');
      setDentists([]);
    } finally {
      setLoading(false);
    }
  }, [specialtyLabel]);

  useEffect(() => {
    if (!initialDentists?.length) {
      fetchDentists();
    }
  }, [initialDentists, fetchDentists]);

  const computedRating =
    avgRating ||
    (dentists.length
      ? (dentists.reduce((sum, doc) => sum + (doc.rating || 0), 0) / dentists.length).toFixed(1)
      : '0.0');

  const handleBook = (dentist) => {
    navigation.navigate('AppointmentTab', {
      screen: 'BookingSlot',
      params: { dentistId: dentist.id },
    });
  };

  const handleProfile = (dentist) => {
    navigation.navigate('DentistDetail', { dentistId: dentist.id, dentist });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

      <LinearGradient
        colors={[theme.colors.primary, '#9333EA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: 52,
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
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
          </TouchableOpacity>
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Daftar dokter</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('AppointmentTab', { screen: 'ClinicSearch' })}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialCommunityIcons name="magnify" size={20} color="white" />
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 24 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              <MaterialCommunityIcons name="tooth" size={22} color="white" />
            </View>
            <View>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Spesialis</Text>
              <Text style={{ color: 'white', fontSize: 24, fontWeight: '800' }}>{specialtyLabel}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', marginTop: 12 }}>
            <HeroChip label="Jumlah dokter" value={`${dentists.length} dokter`} />
            <HeroChip label="Rating rata-rata" value={`${computedRating}/5`} />
            <HeroChip label="Slot terdekat" value="Hari ini" />
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
      >
        {loading && (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator animating size="large" color={theme.colors.primary} />
            <Text style={{ marginTop: 12, color: '#475569' }}>Memuat daftar dokter...</Text>
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

        {!loading && !error && dentists.length === 0 && (
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
              Belum ada dokter dengan spesialisasi ini di area Anda.
            </Text>
          </View>
        )}

        {dentists.map((dentist) => {
          return (
          <View
            key={dentist.id}
            style={{
              backgroundColor: 'white',
              borderRadius: 24,
              padding: 18,
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
              <View style={{ flexDirection: 'row' }}>
                <Image
                  source={{ uri: dentist.image }}
                  style={{ width: 80, height: 80, borderRadius: 22, marginRight: 16 }}
                />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', fontSize: 17, color: '#0F172A' }}>{dentist.name}</Text>
                <Text style={{ color: theme.colors.primary, fontWeight: '600', marginTop: 4 }}>
                  {dentist.specialty}
                </Text>
                <Text style={{ color: '#94A3B8', marginTop: 2 }}>{dentist.clinic}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                  <MaterialCommunityIcons name="star" size={16} color="#FACC15" />
                  <Text style={{ marginLeft: 6, color: '#475569', fontWeight: '600' }}>
                    {dentist.rating} · {dentist.reviews} ulasan
                  </Text>
                </View>
              </View>
            </View>

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
              <View>
                <Text style={{ color: '#94A3B8', fontSize: 12 }}>Mulai dari</Text>
                <Text style={{ fontWeight: '700', color: '#0F172A', marginTop: 2 }}>
                  Rp {Number(dentist.price || 0).toLocaleString('id-ID')}
                </Text>
              </View>
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity
                  onPress={() => handleProfile(dentist)}
                  style={{
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    marginRight: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <MaterialCommunityIcons name="account-details" size={16} color="#475569" />
                  <Text style={{ marginLeft: 6, color: '#475569', fontWeight: '600' }}>Profil</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleBook(dentist)}
                  style={{
                    borderRadius: 18,
                    paddingHorizontal: 18,
                    paddingVertical: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: theme.colors.primary,
                  }}
                >
                  <MaterialCommunityIcons name="calendar-check" size={16} color="white" />
                  <Text style={{ marginLeft: 6, color: 'white', fontWeight: '700' }}>Buat Janji</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          );
        })}

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

const HeroChip = ({ label, value }) => (
  <View
    style={{
      flex: 1,
      marginRight: 10,
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
    }}
  >
    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>{label}</Text>
    <Text style={{ color: 'white', fontWeight: '700', marginTop: 4 }}>{value}</Text>
  </View>
);

export default DentistSpecialtyScreen;
