import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, ImageBackground, Animated } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NEARBY_CLINICS, formatClinicDistance } from '../data/clinics';
import useNearbyClinics from '../../../hooks/useNearbyClinics';

const FALLBACK_CLINICS = NEARBY_CLINICS.slice(0, 2);

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
  } = useNearbyClinics({ radius: 8, limit: 4, autoFetch: shouldAutoload });

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [fade]);

  const dataSource = clinics.length ? clinics : fetchedClinics;
  const data = (dataSource.length ? dataSource : FALLBACK_CLINICS).map((clinic) => ({
    ...clinic,
    distanceLabel: formatClinicDistance(clinic.distanceKm),
  }));

  // Debug: Log image URLs
  useEffect(() => {
    if (data.length > 0) {
      console.log('🖼️ [NearbyClinics] First clinic images:', {
        name: data[0].name,
        heroImage: data[0].heroImage,
        coverImage: data[0].coverImage,
        hasHero: !!data[0].heroImage,
        hasCover: !!data[0].coverImage,
      });
    }
  }, [data]);

  return (
    <Animated.View style={{ paddingHorizontal: 20, marginBottom: 24, opacity: fade }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <View>
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#0F172A', marginBottom: 4 }}>
            {title}
          </Text>
          <Text style={{ color: '#64748B', fontWeight: '500' }}>{subtitle}</Text>
      </View>
        {onSeeAll ? (
          <TouchableOpacity
            onPress={onSeeAll}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 16,
              backgroundColor: '#EEF2FF',
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <MaterialCommunityIcons name="hospital-building" size={18} color={theme.colors.primary} />
            <Text style={{ marginLeft: 6, color: theme.colors.primary, fontWeight: '700', fontSize: 12 }}>
              Lihat semua
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

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
            <Text style={{ marginLeft: 8, color: '#1F2937', fontWeight: '600' }}>
              {usedDefaultLocation
                ? 'Menampilkan klinik populer di area default'
                : 'Menyesuaikan dengan lokasi Anda'}
            </Text>
          </View>
          {loading && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={{ marginLeft: 8, color: '#475569' }}>Memuat data klinik...</Text>
            </View>
          )}
          {error && !loading && (
            <TouchableOpacity
              onPress={refresh}
              style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center' }}
            >
              <MaterialCommunityIcons name="refresh" size={16} color="#DC2626" />
              <Text style={{ marginLeft: 6, color: '#DC2626', fontWeight: '600' }}>
                Tidak dapat memuat lokasi, ketuk untuk coba lagi
              </Text>
            </TouchableOpacity>
          )}
          {usedMockData && !loading && !error && (
            <Text style={{ marginTop: 8, color: '#475569' }}>
              Menampilkan data contoh sementara jaringan bermasalah.
            </Text>
          )}
        </View>
      )}

      {data.map((clinic) => {
        // Use fallback if Unsplash URL is invalid (404)
        let imageUri = clinic.heroImage || clinic.coverImage;
        
        // Check if URL looks invalid (photo-XXXXXXX format with low numbers are usually invalid)
        if (imageUri && imageUri.includes('photo-160000')) {
          imageUri = 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop';
        }
        
        // Final fallback
        if (!imageUri) {
          imageUri = 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop';
        }
        
        console.log('🖼️ Loading image for', clinic.name, ':', imageUri);
        
        return (
          <TouchableOpacity
            key={clinic.id}
            activeOpacity={0.92}
            onPress={() => onClinicPress?.(clinic)}
            style={{
              borderRadius: 28,
              overflow: 'hidden',
              marginBottom: 18,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 18 },
              shadowOpacity: 0.15,
              shadowRadius: 24,
              elevation: 7,
            }}
          >
            <ImageBackground
              source={{ uri: imageUri }}
              style={{ padding: 20, minHeight: 240, justifyContent: 'space-between', backgroundColor: '#E2E8F0' }}
              imageStyle={{ resizeMode: 'cover' }}
              onError={(error) => console.error('❌ Image load error:', clinic.name, error.nativeEvent)}
              onLoad={() => console.log('✅ Image loaded:', clinic.name)}
            >
            <View>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View>
                  <View
                    style={{
                      alignSelf: 'flex-start',
                      backgroundColor: 'rgba(15,23,42,0.25)',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 999,
                      marginBottom: 10,
                    }}
                  >
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
                      {clinic.distanceLabel}
                    </Text>
                  </View>
                  <Text style={{ color: 'white', fontSize: 24, fontWeight: '800' }}>
                    {clinic.name}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', marginTop: 4, fontWeight: '600' }}>
                    {clinic.tagline}
                  </Text>
                </View>
                <View
                  style={{
                    alignItems: 'flex-end',
                    padding: 10,
                    borderRadius: 16,
                    backgroundColor: 'rgba(15,23,42,0.4)',
                  }}
                >
                  <Text style={{ color: 'white', fontSize: 22, fontWeight: '800' }}>
                    {clinic.rating?.toFixed(1)}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' }}>
                    {clinic.reviews} ulasan
                  </Text>
                </View>
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.8)', marginTop: 10 }}>
                {clinic.address}
              </Text>
            </View>

            <View>
              <View style={{ flexDirection: 'row', marginBottom: 14 }}>
                <StatChip icon="map-marker-distance" label={clinic.distanceLabel} />
                <StatChip icon="clock-outline" label={clinic.openStatus || 'Jam fleksibel'} />
                {clinic.queue ? <StatChip icon="account-group" label={clinic.queue} /> : null}
              </View>
              <View style={{ flexDirection: 'row' }}>
                <ActionButton
                  label="Detail klinik"
                  icon="information-outline"
                  onPress={() => onClinicPress?.(clinic)}
                />
                <ActionButton
                  label="Buat janji"
                  icon="calendar-plus"
                  variant="filled"
                  onPress={() => onBook?.(clinic)}
                />
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
