import React, { useMemo } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  StatusBar,
  RefreshControl,
  Dimensions,
  Platform,
  PixelRatio,
} from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // Pastikan import ini ada

import useNearbyClinics from '../../../hooks/useNearbyClinics';
import NearbyClinics from '../components/nearbyClinics';

const formatCoords = (coords) =>
  coords ? `${coords.latitude?.toFixed?.(3)}, ${coords.longitude?.toFixed?.(3)}` : 'Tidak tersedia';

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
    searchMeta,
  } = useNearbyClinics({ radius, limit: 40 });

  const clinics = useMemo(() => {
    return fetchedClinics.filter((clinic) => (clinic.distanceKm ?? Number.MAX_SAFE_INTEGER) <= radius);
  }, [fetchedClinics, radius]);

  const distanceSummary = useMemo(() => {
    const deltas = clinics
      .map((clinic) => clinic.distanceDiagnostics?.delta)
      .filter((delta) => typeof delta === 'number');
    if (!deltas.length) return null;
    const avg = deltas.reduce((sum, delta) => sum + delta, 0) / deltas.length;
    const max = Math.max(...deltas);
    return { avg, max };
  }, [clinics]);

  const coordsLabel = formatCoords(searchMeta?.coordsUsed);
  const backendRadius = searchMeta?.backendSearch?.radius ?? radius;
  const backendCenterLabel =
    searchMeta?.backendSearch?.latitude !== undefined
      ? formatCoords({
          latitude: Number(searchMeta.backendSearch.latitude),
          longitude: Number(searchMeta.backendSearch.longitude),
        })
      : null;

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
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
      >
        <View
          style={{
            borderRadius: 18,
            padding: 16,
            borderWidth: 1,
            borderColor: '#BFDBFE',
            backgroundColor: '#EFF6FF',
            marginBottom: 18,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <MaterialCommunityIcons name="crosshairs-gps" size={16} color={theme.colors.primary} />
            <Text style={{ marginLeft: 8, color: '#0F172A', fontWeight: '600', fontSize: 12, flex: 1 }}>
              {(usedDefaultLocation || searchMeta?.locationSource === 'default')
                ? 'Menampilkan klinik populer di area default'
                : 'Menampilkan klinik sesuai lokasi Anda'}
            </Text>
          </View>
          <Text style={{ color: '#475569', fontSize: 11 }}>
            Radius perangkat {radius} km · radius server {backendRadius} km
          </Text>
          <Text style={{ color: '#475569', fontSize: 11 }}>
            Koordinat dipakai: {coordsLabel}
            {backendCenterLabel ? ` · pusat server ${backendCenterLabel}` : ''}
          </Text>
          {distanceSummary ? (
            <Text style={{ color: '#059669', fontSize: 11 }}>
              Akurasi jarak Δ rata-rata {distanceSummary.avg.toFixed(2)} km · maks {distanceSummary.max.toFixed(2)} km
            </Text>
          ) : null}
          {error ? (
            <TouchableOpacity
              onPress={requestLocation}
              style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}
            >
              <MaterialCommunityIcons name="alert-circle" size={16} color="#DC2626" />
              <Text style={{ marginLeft: 6, color: '#DC2626', fontWeight: '600', fontSize: 12 }}>
                {error} · Ketuk untuk coba ulang
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <NearbyClinics
          clinics={clinics}
          title={`Klinik Terdekat`}
          subtitle={`${clinics.length} klinik dalam radius ${radius} km`}
          onClinicPress={handleClinicPress}
      onBook={handleBook}
      onSeeAll={() => {}}
      loading={loading}
      theme={theme}
    />
      </ScrollView>
    </View>
  );
};

export default NearbyClinicsScreen;
