import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, ImageBackground, Animated, Dimensions, Platform, PixelRatio } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import useNearbyClinics from '../../../hooks/useNearbyClinics';
import resolveMediaUrl from '../../../utils/media';

// --- UTILS UNTUK RESPONSIVE ---
const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Base width standard (iPhone 11 / Pro size), menyesuaikan dari sini
const scale = SCREEN_WIDTH / 375;

const normalize = (size) => {
  const newSize = size * scale;
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  } else {
    return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2;
  }
};
// -----------------------------

const StatChip = ({ icon, label }) => (
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.25)', // Sedikit lebih terang
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      marginRight: 6,
      marginBottom: 6, // Tambah margin bottom untuk wrap
    }}
  >
    <MaterialCommunityIcons name={icon} size={12} color="white" />
    <Text style={{ color: 'white', marginLeft: 4, fontSize: 11, fontWeight: '600' }}>{label}</Text>
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
        paddingVertical: normalize(10), // Padding vertikal responsif
        borderRadius: 999,
        backgroundColor: isFilled ? 'white' : 'rgba(255,255,255,0.2)',
        borderWidth: isFilled ? 0 : 1.5, // Border sedikit lebih tebal
        borderColor: 'rgba(255,255,255,0.6)',
        marginLeft: isFilled ? 10 : 0,
      }}
    >
      <MaterialCommunityIcons name={icon} size={16} color={isFilled ? '#1D1B20' : 'white'} />
      <Text
        style={{
          color: isFilled ? '#1D1B20' : 'white',
          fontWeight: '700',
          marginLeft: 6,
          fontSize: normalize(12), // Font tombol responsif
        }}
        numberOfLines={1} // Mencegah teks tombol turun baris
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const NearbyClinics = ({
  clinics = [],
  title = 'Klinik terdekat',
  subtitle = 'Studio gigi modern dalam radius 5 km',
  onClinicPress,
  onBook,
  onSeeAll,
}) => {
  const theme = useTheme();
  const fade = useRef(new Animated.Value(0)).current;
  const shouldAutoload = !clinics?.length;
  const {
    clinics: fetchedClinics,
    loading,
    error,
    refresh,
    usedMockData,
    usedDefaultLocation,
  } = useNearbyClinics({
    radius: 8,
    limit: 4,
    autoFetch: shouldAutoload,
    allowRadiusExpansion: false,
    strictRadius: true,
  });

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [fade]);

  const formatDistanceLabel = (clinic) => {
    if (typeof clinic.distanceKm === 'number') {
      return `${clinic.distanceKm.toFixed(1)} km`;
    }
    if (typeof clinic.distance === 'number') {
      return `${clinic.distance.toFixed(1)} km`;
    }
    return clinic.distance || '—';
  };

  const dataSource = clinics.length ? clinics : fetchedClinics;
  const data = dataSource.map((clinic) => ({
    ...clinic,
    distanceLabel: formatDistanceLabel(clinic),
  }));

  return (
    <Animated.View style={{ paddingHorizontal: 20, marginBottom: 24, opacity: fade }}>
      {/* HEADER SECTION */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <View style={{ flex: 1, paddingRight: 10 }}> 
          <Text style={{ fontSize: normalize(20), fontWeight: '700', color: '#0F172A', marginBottom: 4 }}>
            {title}
          </Text>
          <Text style={{ color: '#64748B', fontWeight: '500', fontSize: normalize(13) }}>{subtitle}</Text>
        </View>
        {onSeeAll ? (
          <TouchableOpacity
            onPress={onSeeAll}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 16,
              backgroundColor: '#EEF2FF',
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <MaterialCommunityIcons name="hospital-building" size={16} color={theme.colors.primary} />
            <Text style={{ marginLeft: 6, color: theme.colors.primary, fontWeight: '700', fontSize: 11 }}>
              Lihat semua
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* STATUS LOADING / ERROR */}
      {shouldAutoload && (
        <View
          style={{
            borderRadius: 18,
            padding: 14,
            backgroundColor: '#EEF2FF',
            borderWidth: 1,
            borderColor: '#C7D2FE',
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons
              name="crosshairs-gps"
              size={18}
              color={theme.colors.primary}
            />
            <Text style={{ marginLeft: 8, color: '#1F2937', fontWeight: '600', flex: 1, fontSize: 13 }}>
              {usedDefaultLocation
                ? 'Menampilkan klinik populer di area default'
                : 'Menyesuaikan dengan lokasi Anda'}
            </Text>
          </View>
          {loading && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={{ marginLeft: 8, color: '#475569', fontSize: 12 }}>Memuat data klinik...</Text>
            </View>
          )}
          {error && !loading && (
            <TouchableOpacity
              onPress={refresh}
              style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center' }}
            >
              <MaterialCommunityIcons name="refresh" size={16} color="#DC2626" />
              <Text style={{ marginLeft: 6, color: '#DC2626', fontWeight: '600', fontSize: 12 }}>
                Gagal memuat. Ketuk ulang.
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* CLINIC LIST */}
      {data.map((clinic) => {
        let imageUri =
          resolveMediaUrl(clinic.heroImage) ||
          resolveMediaUrl(clinic.coverImage) ||
          clinic.heroImage ||
          clinic.coverImage;

        if (!imageUri || imageUri.includes('photo-160000')) {
          imageUri =
            'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop';
        }

        return (
          <TouchableOpacity
            key={clinic.id}
            activeOpacity={0.92}
            onPress={() => onClinicPress?.(clinic)}
            style={{
              borderRadius: 24, // Radius sedikit dikurangi agar tidak terlalu bulat di HP kecil
              overflow: 'hidden',
              marginBottom: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.12,
              shadowRadius: 16,
              elevation: 6,
              backgroundColor: '#fff',
            }}
          >
            <ImageBackground
              source={{ uri: imageUri }}
              style={{ 
                minHeight: normalize(220), // Height responsive
                width: '100%' 
              }}
              imageStyle={{ resizeMode: 'cover' }}
            >
              {/* Overlay Gradient/Darken agar text terbaca di gambar terang */}
              <View style={{ 
                flex: 1, 
                backgroundColor: 'rgba(0,0,0,0.35)', // Dark Overlay penting!
                padding: 16, 
                justifyContent: 'space-between' 
              }}>
                
                {/* TOP SECTION */}
                <View>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start', // Align start agar jika nama panjang tidak nabrak
                    }}
                  >
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <View
                        style={{
                          alignSelf: 'flex-start',
                          backgroundColor: 'rgba(0,0,0,0.6)',
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 999,
                          marginBottom: 8,
                        }}
                      >
                        <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>
                          {clinic.distanceLabel}
                        </Text>
                      </View>
                      <Text 
                        style={{ color: 'white', fontSize: normalize(20), fontWeight: '800', lineHeight: normalize(26) }}
                        numberOfLines={2} // Limit 2 baris agar layout tidak pecah
                      >
                        {clinic.name}
                      </Text>
                      <Text 
                        style={{ color: 'rgba(255,255,255,0.9)', marginTop: 4, fontWeight: '500', fontSize: normalize(13) }}
                        numberOfLines={1}
                      >
                        {clinic.tagline}
                      </Text>
                    </View>
                    
                    <View
                      style={{
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        borderRadius: 12,
                        backgroundColor: 'rgba(255,255,255,0.95)', // Background putih solid agar rating menonjol
                      }}
                    >
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                         <MaterialCommunityIcons name="star" size={14} color="#F59E0B" style={{marginRight: 2}} />
                         <Text style={{ color: '#0F172A', fontSize: 16, fontWeight: '800' }}>
                           {clinic.rating?.toFixed(1)}
                         </Text>
                      </View>
                      <Text style={{ color: '#64748B', fontSize: 10, fontWeight: '600' }}>
                        {clinic.reviews} ulasan
                      </Text>
                    </View>
                  </View>
                  
                  <Text 
                    style={{ color: 'rgba(255,255,255,0.85)', marginTop: 8, fontSize: 12 }} 
                    numberOfLines={1}
                  >
                    {clinic.address}
                  </Text>
                </View>

                {/* BOTTOM SECTION */}
                <View style={{ marginTop: 20 }}>
                  <View style={{ 
                    flexDirection: 'row', 
                    flexWrap: 'wrap', // KUNCI: Wrap agar tidak overflow
                    marginBottom: 12 
                  }}>
                    <StatChip icon="map-marker-distance" label={clinic.distanceLabel} />
                    <StatChip icon="clock-outline" label={clinic.openStatus || 'Jam fleksibel'} />
                    {clinic.queue ? <StatChip icon="account-group" label={`Antri: ${clinic.queue}`} /> : null}
                  </View>
                  {clinic.distanceDiagnostics?.localDistance ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                      <MaterialCommunityIcons name="radar" size={12} color="white" />
                      <Text style={{ color: 'white', marginLeft: 6, fontSize: normalize(11), fontWeight: '600' }}>
                        Lokal {clinic.distanceDiagnostics.localDistance.toFixed(1)} km
                        {typeof clinic.distanceDiagnostics.delta === 'number'
                          ? ` · Δ ${clinic.distanceDiagnostics.delta.toFixed(2)} km`
                          : ''}
                      </Text>
                    </View>
                  ) : null}
                  
                  <View style={{ flexDirection: 'row' }}>
                    <ActionButton
                      label="Detail" // Label dipendekkan sedikit
                      icon="information-outline"
                      onPress={() => onClinicPress?.(clinic)}
                    />
                    <ActionButton
                      label="Booking" // Label dipendekkan
                      icon="calendar-plus"
                      variant="filled"
                      onPress={() => onBook?.(clinic)}
                    />
                  </View>
                </View>

              </View>
            </ImageBackground>
          </TouchableOpacity>
        );
      })}
    </Animated.View>
  );
};

export default NearbyClinics;
