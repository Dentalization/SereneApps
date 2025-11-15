import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Image, Animated } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const FALLBACK_DENTISTS = [
  { id:'1', name:'Dr. Thomas Mitchell', specialty:'Orthodontic Specialist', rating:5.0, reviews:412, price:350000, image:'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop', distanceKm:2.5, clinic:'Glow Dental Studio' },
  { id:'2', name:'Dr. Sarah Johnson', specialty:'Pediatric Dentist', rating:4.8, reviews:328, price:280000, image:'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop', distanceKm:1.8, clinic:'Little Smiles' },
];

const formatRupiah = (value = 0) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
const formatDistance = (dentist) => dentist.distance || (dentist.distanceKm != null ? `${dentist.distanceKm.toFixed(1)} km` : '—');

export default function NearbyDentists({
  dentists = [],
  title = 'Nearby Dentist',
  subtitle = 'Best dental specialists near you',
  onDoctorPress,
  onMessage,
  onBook,
  onSeeAll,
}) {
  const theme = useTheme();
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [fade]);

  const data = (dentists.length ? dentists : FALLBACK_DENTISTS).map((d) => ({
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
            <Text style={{ marginLeft:6, fontWeight:'600', color:theme.colors.primary, fontSize:13 }}>See all</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width:32 }} />
        )}
      </View>
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
                    <Text style={{ fontSize:13, color:'#6B7280', marginLeft:8, fontWeight:'500' }}>{d.rating} ({d.reviews})</Text>
                  </View>
                  <View style={{ flexDirection:'row', alignItems:'center' }}><MaterialCommunityIcons name="map-marker" size={14} color="#9CA3AF" /><Text style={{ fontSize:12, color:'#9CA3AF', marginLeft:4 }}>{d.distanceText}</Text></View>
                </View>
              </View>
            </View>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingTop:16, borderTopWidth:1, borderTopColor:'#F3F4F6' }}>
              <View>{d.clinic ? <Text style={{ fontSize:12, color:'#9CA3AF', marginBottom:4 }}>{d.clinic}</Text> : null}<Text style={{ fontSize:20, fontWeight:'bold', color:'#1F2937' }}>{formatRupiah(d.price)}</Text></View>
              <View style={{ flexDirection:'row' }}>
                <TouchableOpacity onPress={()=>onMessage?.(d)} style={{ backgroundColor:'#F3F4F6', borderRadius:15, paddingHorizontal:16, paddingVertical:10, marginRight:10 }}><MaterialCommunityIcons name="message-text" size={18} color={theme.colors.primary} /></TouchableOpacity>
                <TouchableOpacity onPress={()=>onBook?.(d)} style={{ borderRadius:15, paddingHorizontal:20, paddingVertical:10, flexDirection:'row', alignItems:'center', shadowColor:theme.colors.primary, shadowOffset:{ width:0, height:4 }, shadowOpacity:0.3, shadowRadius:8, elevation:5, backgroundColor:theme.colors.primary }}><MaterialCommunityIcons name="calendar-check" size={16} color="white" /><Text style={{ color:'white', fontWeight:'bold', marginLeft:8, fontSize:14 }}>Book</Text></TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      ))}
    </Animated.View>
  );
}
