import React, { useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, Image, StatusBar, RefreshControl, Dimensions, Platform, PixelRatio } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import useNearbyDentists from '../../../hooks/useNearbyDentists';

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

const formatRupiah = (value = 0) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
const formatDistance = (km) =>
  typeof km === 'number' ? `${Number(km).toFixed(1)} km` : km || '—';
const formatCoords = (coords) =>
  coords ? `${coords.latitude?.toFixed?.(3)}, ${coords.longitude?.toFixed?.(3)}` : 'Tidak tersedia';

const NearbyDentistsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  
  // 2. DEFINISI INSETS (WAJIB ADA)
  const insets = useSafeAreaInsets();

  const radius = route.params?.maxDistanceKm ?? 8;
  const dentistType = route.params?.dentistType || 'clinic';
  const {
    dentists: fetchedDentists,
    loading,
    error,
    refresh,
    requestLocation,
    usedMockData,
    usedDefaultLocation,
    searchMeta,
  } = useNearbyDentists({ radius, limit: 40, type: dentistType });

  const dentists = useMemo(() => {
    return fetchedDentists
      .filter((d) => (d.distanceKm ?? Number.MAX_SAFE_INTEGER) <= radius)
      .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
  }, [fetchedDentists, radius]);

  const distanceSummary = useMemo(() => {
    const deltas = dentists
      .map((d) => d.distanceDiagnostics?.delta)
      .filter((delta) => typeof delta === 'number');
    if (!deltas.length) return null;
    const avg = deltas.reduce((sum, delta) => sum + delta, 0) / deltas.length;
    const max = Math.max(...deltas);
    return { avg, max };
  }, [dentists]);

  const coordsLabel = formatCoords(searchMeta?.coordsUsed);
  const backendRadius = searchMeta?.backendSearch?.radius ?? radius;
  const backendCenterLabel =
    searchMeta?.backendSearch?.latitude !== undefined
      ? formatCoords({
          latitude: Number(searchMeta.backendSearch.latitude),
          longitude: Number(searchMeta.backendSearch.longitude),
        })
      : null;

  const buildParams = (dentist) => ({
    clinicContext: dentist?.clinicContext,
    clinicId: dentist?.clinicContext?.profileId,
    clinicBranchId: dentist?.clinicContext?.branchId,
  });

  const handleDoctorPress = (dentist) =>
    navigation.navigate('DentistDetail', {
      dentistId: dentist.id,
      dentist,
      ...buildParams(dentist),
    });
  const handleBook = (dentist) =>
    navigation.navigate('AppointmentTab', {
      screen: 'BookingSlot',
      params: { dentistId: dentist.id, dentist, ...buildParams(dentist) },
    });
  const handleMessage = (dentist) =>
    navigation.navigate('AppointmentTab', {
      screen: 'BookingSlot',
      params: { dentistId: dentist.id, dentist, ...buildParams(dentist) },
    });

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
      
      <View
        style={{
          backgroundColor: theme.colors.primary,
          // 3. PENGGUNAAN INSETS (Sekarang Aman)
          paddingTop: insets.top + 10,
          paddingBottom: 24,
          paddingHorizontal: 20,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              width: normalize(40),
              height: normalize(40),
              borderRadius: normalize(20),
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
          >
            <MaterialCommunityIcons name='arrow-left' size={normalize(22)} color='white' />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: 'white', fontSize: normalize(20), fontWeight: '700' }}>Dokter gigi terdekat</Text>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: normalize(13) }}>
              Menampilkan spesialis dalam radius {radius} km
            </Text>
          </View>
          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.18)',
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 16,
            }}
          >
            <Text style={{ color: 'white', fontSize: normalize(11), fontWeight: '600' }}>{dentists.length} dokter</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
      >
        {/* STATUS BAR */}
        <View
          style={{
            borderRadius: 18,
            padding: 16,
            backgroundColor: '#ECFEFF',
            borderWidth: 1,
            borderColor: '#A5F3FC',
            marginBottom: 18,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <MaterialCommunityIcons name='crosshairs-gps' size={normalize(16)} color={theme.colors.primary} />
            <Text style={{ marginLeft: 8, fontWeight: '600', color: '#0F172A', fontSize: normalize(12), flex: 1 }}>
              {(usedDefaultLocation || searchMeta?.locationSource === 'default')
                ? 'Menampilkan dokter populer di area default'
                : 'Menampilkan dokter sesuai lokasi Anda'}
            </Text>
          </View>
          {error ? (
            <TouchableOpacity onPress={requestLocation} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name='alert-circle' size={normalize(16)} color='#DC2626' />
              <Text style={{ marginLeft: 8, color: '#DC2626', fontWeight: '600', fontSize: normalize(12) }}>
                {error} · Ketuk untuk coba lagi
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              <Text style={{ color: '#475569', fontSize: normalize(11) }}>
                Radius perangkat {radius} km · radius server {backendRadius} km
              </Text>
              <Text style={{ color: '#64748B', fontSize: normalize(11) }}>
                Koordinat dipakai: {coordsLabel}
                {backendCenterLabel ? ` · pusat server ${backendCenterLabel}` : ''}
              </Text>
              {distanceSummary ? (
                <Text style={{ color: '#059669', fontSize: normalize(11) }}>
                  Akurasi jarak Δ rata-rata {distanceSummary.avg.toFixed(2)} km · maks {distanceSummary.max.toFixed(2)} km
                </Text>
              ) : null}
            </>
          )}
        </View>

        {loading && !dentists.length && (
          <View style={{ alignItems: 'center', paddingVertical: 32 }}>
            <ActivityIndicator animating size='large' color={theme.colors.primary} />
            <Text style={{ marginTop: 12, color: '#475569' }}>Memuat dokter terdekat...</Text>
          </View>
        )}

        {dentists.map((dentist) => (
          <TouchableOpacity
            key={dentist.id}
            activeOpacity={0.92}
            onPress={() => handleDoctorPress(dentist)}
            style={{
              backgroundColor: 'white',
              borderRadius: 24,
              padding: normalize(16),
              marginBottom: 18,
              shadowColor: '#4C1D95',
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.08,
              shadowRadius: 20,
              elevation: 6,
              borderWidth: 1,
              borderColor: 'rgba(76,29,149,0.08)',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image 
                source={{ uri: dentist.image }} 
                style={{ width: normalize(80), height: normalize(80), borderRadius: 20 }} 
              />
              <View style={{ flex: 1, marginLeft: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, alignItems: 'flex-start' }}>
                  <Text style={{ fontSize: normalize(16), fontWeight: '700', color: '#0F172A', flex: 1, marginRight: 8 }} numberOfLines={2}>
                    {dentist.name}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                    <MaterialCommunityIcons name='map-marker-distance' size={normalize(12)} color='#6366F1' />
                    <Text style={{ marginLeft: 4, color: '#6366F1', fontWeight: '600', fontSize: normalize(10) }}>
                      {formatDistance(dentist.distanceKm || 0)}
                    </Text>
                  </View>
                </View>
                {dentist.distanceDiagnostics?.localDistance ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <MaterialCommunityIcons name='radar' size={normalize(12)} color='#2563EB' />
                    <Text style={{ marginLeft: 6, color: '#2563EB', fontSize: normalize(11), fontWeight: '600' }}>
                      Lokal {dentist.distanceDiagnostics.localDistance.toFixed(1)} km
                      {typeof dentist.distanceDiagnostics.delta === 'number'
                        ? ` · Δ ${dentist.distanceDiagnostics.delta.toFixed(2)} km`
                        : ''}
                    </Text>
                  </View>
                ) : null}
                <Text style={{ fontSize: normalize(12), fontWeight: '600', color: theme.colors.primary }}>{dentist.specialty}</Text>
                <Text style={{ fontSize: normalize(11), color: '#64748B', marginTop: 2 }} numberOfLines={1}>{dentist.clinic}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                  <MaterialCommunityIcons name='star' size={14} color='#FBBF24' />
                  <Text style={{ marginLeft: 6, color: '#475569', fontWeight: '600', fontSize: normalize(11) }}>
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
                borderTopColor: '#EEF2FF',
                paddingTop: 12,
              }}
            >
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ fontSize: normalize(10), color: '#94A3B8' }}>Konsultasi mulai dari</Text>
                <Text style={{ fontSize: normalize(16), fontWeight: '700', color: '#0F172A', marginTop: 2 }}>
                  {formatRupiah(dentist.price)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity
                  onPress={() => handleMessage(dentist)}
                  style={{
                    backgroundColor: '#F3F4F6',
                    borderRadius: 14,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    marginRight: 8,
                    height: normalize(36),
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                >
                  <MaterialCommunityIcons name='message-text' size={normalize(18)} color={theme.colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleBook(dentist)}
                  style={{
                    borderRadius: 14,
                    paddingHorizontal: 16,
                    height: normalize(36),
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.colors.primary,
                    shadowColor: theme.colors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                >
                  <MaterialCommunityIcons name='calendar-check' size={normalize(16)} color='white' />
                  <Text style={{ color: 'white', fontWeight: '700', marginLeft: 6, fontSize: normalize(12) }}>Pesan</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        ))}
        
        {!dentists.length && (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <MaterialCommunityIcons name='map-marker-off' size={52} color='#CBD5F5' />
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', marginTop: 12 }}>Belum ada dokter di area ini</Text>
            <Text style={{ color: '#475569', marginTop: 4, textAlign: 'center' }}>
              Kami tidak menemukan spesialis dalam radius {radius} km. Coba perluas jangkauan pencarian.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default NearbyDentistsScreen;
