import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Image, Animated } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import useNearbyDentists from '../../../hooks/useNearbyDentists';

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
  } = useNearbyDentists({ radius: 8, limit: 4, autoFetch: shouldAutoload });
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [fade]);

  const dataSource = dentists.length ? dentists : fetchedDentists;
  const data = dataSource.map((d) => ({
    ...d,
    distanceText: formatDistance(d),
  }));
  return (
    <Animated.View style={{ paddingHorizontal:20, marginBottom:24, opacity:fade }}>
      <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <View><Text style={{ fontSize:22, fontWeight:'bold', color:'#1F2937', marginBottom:4 }}>{title}</Text><Text style={{ fontSize:14, color:'#6B7280', fontWeight:'500' }}>{subtitle}</Text></View>
        {onSeeAll ? (
          <TouchableOpacity onPress={onSeeAll} style={{ backgroundColor:'#F3F4F6', borderRadius:12, padding:8, flexDirection:'row', alignItems:'center' }}>
            <MaterialCommunityIcons name="map-marker-distance" size={20} color={theme.colors.primary} />
            <Text style={{ marginLeft:6, fontWeight:'600', color:theme.colors.primary, fontSize:13 }}>Lihat semua</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width:32 }} />
        )}
      </View>
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
            <Text style={{ marginLeft: 8, color: '#0F172A', fontWeight: '600' }}>
              {usedDefaultLocation
                ? 'Menampilkan dokter populer di area default'
                : 'Menyesuaikan dengan lokasi Anda'}
            </Text>
          </View>
          {loading && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              <ActivityIndicator size='small' color={theme.colors.primary} />
              <Text style={{ marginLeft: 8, color: '#475569' }}>Memuat data dokter...</Text>
            </View>
          )}
          {error && !loading && (
            <TouchableOpacity
              onPress={refresh}
              style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center' }}
            >
              <MaterialCommunityIcons name='refresh' size={16} color='#DC2626' />
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

      {data.map((d, i)=>(
        <Animated.View key={d.id} style={{ transform:[{ translateY:fade.interpolate({ inputRange:[0,1], outputRange:[20*(i+1),0] }) }], opacity:fade }}>
          <TouchableOpacity activeOpacity={0.9} onPress={()=>onDoctorPress?.(d)} style={{ backgroundColor:'white', borderRadius:20, padding:20, marginBottom:16, shadowColor:'#667eea', shadowOffset:{ width:0, height:8 }, shadowOpacity:0.1, shadowRadius:20, elevation:8, borderWidth:1, borderColor:'rgba(102,126,234,0.1)' }}>
            <View style={{ flexDirection:'row', alignItems:'center', marginBottom:16 }}>
              <View style={{ width:70, height:70, borderRadius:35, overflow:'hidden', borderWidth:3, borderColor:theme.colors.primary, shadowColor:theme.colors.primary, shadowOffset:{ width:0, height:4 }, shadowOpacity:0.3, shadowRadius:8, elevation:5, alignItems:'center', justifyContent:'center' }}>
                <Image source={{ uri:d.image }} style={{ width:64, height:64, borderRadius:32 }} />
              </View>
              <View style={{ flex:1, marginLeft:16 }}>
                <Text style={{ fontSize:17, fontWeight:'bold', color:'#1F2937', marginBottom:4 }}>{d.name}</Text>
                <Text style={{ fontSize:14, marginBottom:8, fontWeight:'600', color:theme.colors.primary }}>{d.specialty}</Text>
                <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
                  <View style={{ flexDirection:'row', alignItems:'center' }}>
                    {[...Array(5)].map((_,ix)=>(<MaterialCommunityIcons key={ix} name="star" size={14} color={ix<Math.floor(d.rating)?"#FFD700":"#E5E7EB"} />))}
                    <Text style={{ fontSize:13, color:'#6B7280', marginLeft:8, fontWeight:'500' }}>{d.rating} ({d.reviews} ulasan)</Text>
                  </View>
                  <View style={{ flexDirection:'row', alignItems:'center' }}><MaterialCommunityIcons name="map-marker" size={14} color="#9CA3AF" /><Text style={{ fontSize:12, color:'#9CA3AF', marginLeft:4 }}>{d.distanceText}</Text></View>
                </View>
              </View>
            </View>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingTop:16, borderTopWidth:1, borderTopColor:'#F3F4F6' }}>
              <View>{d.clinic ? <Text style={{ fontSize:12, color:'#9CA3AF', marginBottom:4 }}>{d.clinic}</Text> : null}<Text style={{ fontSize:20, fontWeight:'bold', color:'#1F2937' }}>{formatRupiah(d.price)}</Text></View>
              <View style={{ flexDirection:'row' }}>
                <TouchableOpacity onPress={()=>onMessage?.(d)} style={{ backgroundColor:'#F3F4F6', borderRadius:15, paddingHorizontal:16, paddingVertical:10, marginRight:10 }}><MaterialCommunityIcons name="message-text" size={18} color={theme.colors.primary} /></TouchableOpacity>
                <TouchableOpacity onPress={()=>onBook?.(d)} style={{ borderRadius:15, paddingHorizontal:20, paddingVertical:10, flexDirection:'row', alignItems:'center', shadowColor:theme.colors.primary, shadowOffset:{ width:0, height:4 }, shadowOpacity:0.3, shadowRadius:8, elevation:5, backgroundColor:theme.colors.primary }}><MaterialCommunityIcons name="calendar-check" size={16} color="white" /><Text style={{ color:'white', fontWeight:'bold', marginLeft:8, fontSize:14 }}>Pesan</Text></TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      ))}
    </Animated.View>
  );
}
