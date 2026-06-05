import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Image, Animated, Dimensions, Platform, PixelRatio } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
const formatDistance = (dentist) => dentist.distance || (dentist.distanceKm != null ? `${dentist.distanceKm.toFixed(1)} km` : '—');

export default function NearbyDentists({
  dentists = [],
  title = 'Dokter gigi terdekat',
  subtitle = 'Spesialis tepercaya di sekitar Anda',
  onDoctorPress,
  onMessage,
  onBook,
  onSeeAll,
}) {
  const theme = useTheme();
  const fade = useRef(new Animated.Value(0)).current;
  const shouldAutoload = !dentists?.length;
  const {
    dentists: fetchedDentists,
    loading,
    error,
    refresh,
    usedMockData,
    usedDefaultLocation,
  } = useNearbyDentists({ radius: 8, limit: 4, autoFetch: shouldAutoload, type: 'clinic' });

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [fade]);

  const dataSource = dentists.length ? dentists : fetchedDentists;
  const data = dataSource.map((d) => ({
    ...d,
    distanceText: formatDistance(d),
  }));

  return (
    <Animated.View style={{ paddingHorizontal: 20, marginBottom: 24, opacity: fade }}>
      {/* HEADER */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={{ fontSize: normalize(20), fontWeight: 'bold', color: '#1F2937', marginBottom: 4 }}>{title}</Text>
          <Text style={{ fontSize: normalize(13), color: '#6B7280', fontWeight: '500' }}>{subtitle}</Text>
        </View>
        {onSeeAll ? (
          <TouchableOpacity onPress={onSeeAll} style={{ backgroundColor: '#F3F4F6', borderRadius: 12, padding: 8, flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name="map-marker-distance" size={normalize(18)} color={theme.colors.primary} />
            <Text style={{ marginLeft: 6, fontWeight: '600', color: theme.colors.primary, fontSize: normalize(12) }}>Lihat semua</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 32 }} />
        )}
      </View>

      {/* STATUS BOX (Loading/Error) */}
      {shouldAutoload && (
        <View
          style={{
            borderRadius: 18,
            padding: 14,
            backgroundColor: '#ECFEFF',
            borderWidth: 1,
            borderColor: '#A7F3D0',
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name='crosshairs-gps' size={18} color={theme.colors.primary} />
            <Text style={{ marginLeft: 8, color: '#0F172A', fontWeight: '600', fontSize: normalize(12), flex: 1 }}>
              {usedDefaultLocation
                ? 'Menampilkan dokter populer di area default'
                : 'Menyesuaikan dengan lokasi Anda'}
            </Text>
          </View>
          {loading && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              <ActivityIndicator size='small' color={theme.colors.primary} />
              <Text style={{ marginLeft: 8, color: '#475569', fontSize: normalize(12) }}>Memuat data dokter...</Text>
            </View>
          )}
          {error && !loading && (
            <TouchableOpacity
              onPress={refresh}
              style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center' }}
            >
              <MaterialCommunityIcons name='refresh' size={16} color='#DC2626' />
              <Text style={{ marginLeft: 6, color: '#DC2626', fontWeight: '600', fontSize: normalize(12) }}>
                Gagal memuat. Ketuk untuk coba lagi.
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* DOCTOR LIST */}
      {data.map((d, i) => (
        <Animated.View
          key={d.id}
          style={{
            transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [20 * (i + 1), 0] }) }],
            opacity: fade
          }}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onDoctorPress?.(d)}
            style={{
              backgroundColor: 'white',
              borderRadius: 20,
              padding: normalize(16), // Padding responsif
              marginBottom: 16,
              shadowColor: '#667eea',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.1,
              shadowRadius: 20,
              elevation: 6,
              borderWidth: 1,
              borderColor: 'rgba(102,126,234,0.1)'
            }}
          >
            {/* Top Section: Avatar & Info */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View
                style={{
                  width: normalize(68), // Avatar responsif
                  height: normalize(68),
                  borderRadius: normalize(34),
                  overflow: 'hidden',
                  borderWidth: 2.5,
                  borderColor: theme.colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Image
                  source={{ uri: d.image }}
                  style={{ width: '92%', height: '92%', borderRadius: normalize(34) }}
                  resizeMode="cover"
                />
              </View>

              <View style={{ flex: 1, marginLeft: normalize(14) }}>
                <Text
                  style={{ fontSize: normalize(16), fontWeight: 'bold', color: '#1F2937', marginBottom: 2 }}
                  numberOfLines={1}
                >
                  {d.name}
                </Text>
                <Text
                  style={{ fontSize: normalize(13), marginBottom: 6, fontWeight: '600', color: theme.colors.primary }}
                  numberOfLines={1}
                >
                  {d.specialty}
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="star" size={14} color="#F59E0B" />
                    <Text style={{ fontSize: normalize(12), color: '#6B7280', marginLeft: 4, fontWeight: '500' }}>
                      {d.rating} ({d.reviews})
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                    <MaterialCommunityIcons name="map-marker" size={12} color="#9CA3AF" />
                    <Text style={{ fontSize: normalize(11), color: '#6B7280', marginLeft: 4 }}>{d.distanceText}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Bottom Section: Price & Actions */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                {d.clinic ? <Text style={{ fontSize: normalize(11), color: '#9CA3AF', marginBottom: 2 }} numberOfLines={1}>{d.clinic}</Text> : null}
                <Text style={{ fontSize: normalize(18), fontWeight: 'bold', color: '#1F2937' }}>{formatRupiah(d.price)}</Text>
              </View>

              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity
                  onPress={() => onMessage?.(d)}
                  style={{
                    backgroundColor: '#EFF6FF',
                    borderRadius: 14,
                    width: normalize(42), // Tombol kotak responsif
                    height: normalize(42),
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 8
                  }}
                >
                  <MaterialCommunityIcons name="message-text" size={normalize(20)} color={theme.colors.primary} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => onBook?.(d)}
                  style={{
                    borderRadius: 14,
                    paddingHorizontal: normalize(16),
                    height: normalize(42),
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.colors.primary,
                    shadowColor: theme.colors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 6,
                    elevation: 4
                  }}
                >
                  <MaterialCommunityIcons name="calendar-check" size={normalize(16)} color="white" />
                  <Text style={{ color: 'white', fontWeight: 'bold', marginLeft: 6, fontSize: normalize(13) }}>Pesan</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      ))}
    </Animated.View>
  );
}
