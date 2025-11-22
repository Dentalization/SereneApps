import React, { useMemo } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NEARBY_CLINICS, formatClinicDistance } from '../data/clinics';
import useNearbyClinics from '../../../hooks/useNearbyClinics';

const NearbyClinicsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();

  const radius = route.params?.maxDistanceKm ?? 8;
  const {
    clinics: fetchedClinics,
    loading,
    error,
    refresh,
    requestLocation,
    usedMockData,
    usedDefaultLocation,
  } = useNearbyClinics({ radius, limit: 40 });

  const clinics = useMemo(() => {
    const list = fetchedClinics.length ? fetchedClinics : NEARBY_CLINICS;
    return list
      .filter((clinic) => (clinic.distanceKm ?? Number.MAX_SAFE_INTEGER) <= radius)
      .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
  }, [fetchedClinics, radius]);

  const handleClinicPress = (clinic) => navigation.navigate('ClinicDetail', { clinicId: clinic.id || clinic.branchId });
  const handleBook = (clinic) =>
    navigation.navigate('AppointmentTab', {
      screen: 'ClinicDetail',
      params: { clinicId: clinic.id || clinic.branchId },
    });

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

      <LinearGradient
        colors={[theme.colors.primary, '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingHorizontal: 20,
          paddingTop: 52,
          paddingBottom: 32,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>Eksplor Klinik</Text>
            <Text style={{ color: 'white', fontSize: 26, fontWeight: '700', marginTop: 6 }}>
              Klinik Terdekat
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', marginTop: 6 }}>
              {clinics.length} klinik dalam radius {radius} km
            </Text>
          </View>
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
            <MaterialCommunityIcons name="close" size={22} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: 16, paddingBottom: 160 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
      >
        <View
          style={{
            borderRadius: 18,
            padding: 16,
            backgroundColor: '#EEF2FF',
            borderWidth: 1,
            borderColor: '#CBD5F5',
            marginBottom: 20,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <MaterialCommunityIcons name="crosshairs-gps" size={18} color={theme.colors.primary} />
            <Text style={{ marginLeft: 8, fontWeight: '600', color: '#0F172A' }}>
              {usedDefaultLocation
                ? 'Lokasi mati — menampilkan cabang populer'
                : 'Menampilkan klinik sesuai lokasi Anda'}
            </Text>
          </View>
          {error ? (
            <TouchableOpacity onPress={requestLocation} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="alert-circle" size={18} color="#DC2626" />
              <Text style={{ marginLeft: 8, color: '#DC2626', fontWeight: '600' }}>
                {error} · Ketuk untuk coba lagi
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={{ color: '#475569' }}>
              Radius {radius} km · {usedMockData ? 'data contoh' : 'data real-time'}
            </Text>
          )}
        </View>

        {loading && !clinics.length && (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <ActivityIndicator animating size="large" color={theme.colors.primary} />
            <Text style={{ marginTop: 12, color: '#475569' }}>Memuat klinik terdekat...</Text>
          </View>
        )}

        {clinics.map((clinic) => (
          <TouchableOpacity
            key={clinic.id}
            activeOpacity={0.92}
            onPress={() => handleClinicPress(clinic)}
            style={{
              borderRadius: 28,
              overflow: 'hidden',
              marginBottom: 20,
              backgroundColor: 'white',
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: 16 },
              shadowOpacity: 0.1,
              shadowRadius: 20,
              elevation: 6,
            }}
          >
            <ImageBackground
              source={{ 
                uri: clinic.coverImage || clinic.heroImage || 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800'
              }}
              style={{ height: 180, backgroundColor: '#E2E8F0' }}
              imageStyle={{ resizeMode: 'cover' }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 16,
                }}
              >
                <View
                  style={{
                    backgroundColor: 'rgba(15,23,42,0.45)',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 999,
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>
                    {formatClinicDistance(clinic.distanceKm)}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: 'rgba(15,23,42,0.45)',
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: 12,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: '700' }}>
                    {clinic.rating ? clinic.rating.toFixed(1) : '4.8'}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
                    {(clinic.reviews || 0).toLocaleString('id-ID')} ulasan
                  </Text>
                </View>
              </View>
            </ImageBackground>
            <View style={{ padding: 20 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#0F172A' }}>{clinic.name}</Text>
              <Text style={{ color: '#94A3B8', marginTop: 4 }}>{clinic.address}</Text>
              <View
                style={{
                  flexDirection: 'row',
                  marginTop: 12,
                  flexWrap: 'wrap',
                }}
              >
                {(clinic.highlights || []).slice(0, 3).map((item) => (
                  <View
                    key={item}
                    style={{
                      backgroundColor: clinic.badgeColor || '#EEF2FF',
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 999,
                      marginRight: 8,
                      marginBottom: 8,
                    }}
                  >
                    <Text style={{ color: theme.colors.primary, fontWeight: '600', fontSize: 12 }}>
                      {item}
                    </Text>
                  </View>
                ))}
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 16,
                }}
              >
                <View>
                  <Text style={{ color: '#94A3B8', fontSize: 12 }}>Jam Operasional</Text>
                  <Text style={{ fontWeight: '700', color: '#0F172A' }}>{clinic.openStatus}</Text>
                  <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 4 }}>
                    Estimasi antrian {clinic.queue}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row' }}>
                  <TouchableOpacity
                    onPress={() => handleBook(clinic)}
                    style={{
                      borderRadius: 16,
                      backgroundColor: '#EEF2FF',
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      marginRight: 10,
                    }}
                  >
                    <MaterialCommunityIcons name="calendar-edit" size={18} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleClinicPress(clinic)}
                    style={{
                      borderRadius: 16,
                      backgroundColor: theme.colors.primary,
                      paddingHorizontal: 18,
                      paddingVertical: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <MaterialCommunityIcons name="information-outline" size={18} color="white" />
                    <Text style={{ color: 'white', fontWeight: '700', marginLeft: 8 }}>Detail</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {!loading && !clinics.length && (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <MaterialCommunityIcons name="hospital-box-outline" size={58} color="#CBD5F5" />
            <Text style={{ marginTop: 12, fontWeight: '700', color: '#0F172A', fontSize: 16 }}>
              Belum ada klinik di area ini
            </Text>
            <Text style={{ color: '#94A3B8', textAlign: 'center', marginTop: 6 }}>
              Coba perbesar radius pencarian atau ubah lokasi Anda
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default NearbyClinicsScreen;
