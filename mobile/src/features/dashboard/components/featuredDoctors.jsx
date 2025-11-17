import React, { useRef, useState, useEffect } from 'react';
import { View, TouchableOpacity, Image, Dimensions, Animated } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
// layout constants — bikin kartu center & scroll enak
const SIDE_INSET = 20;              // padding kiri/kanan container
const GAP = 16;                     // jarak antar kartu
const CARD_W = width - SIDE_INSET * 2;
const PAGE_W = CARD_W + GAP;        // << ini dipakai utk snapToInterval & perhitungan index

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

const FeaturedDoctors = ({ appointments = [], onDoctorPress, onJoinCall }) => {
  const theme = useTheme();
  const scrollRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);

  const featuredDoctors = appointments.length > 0
    ? appointments.map(a => ({ id:a.id, name:a.dentist?.name || a.dentistName || 'Dr. Tanpa Nama', specialty:a.dentist?.specialty || a.specialty || 'Dokter Gigi', experience:a.dentist?.experience || '5 tahun', rating:a.dentist?.rating || 4.8, reviews:a.dentist?.reviews || 100, price:a.price || a.dentist?.price || 0, status:getAppointmentStatus(a), nextSlot:formatAppointmentTime(a.startsAt), image:a.dentist?.image || a.dentist?.profilePicture || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop', verified:a.dentist?.verified || true, appointmentId:a.id, startsAt:a.startsAt, clinicName:a.clinic?.name || a.clinicName }))
    : [
        { id:'default-1', name:'Dr. Kriss Hemsworth', specialty:'Spesialis Periodonti', experience:'6 tahun', rating:4.9, reviews:234, price:450000, status:'Tersedia sekarang', nextSlot:'14:30', image:'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop', verified:true },
        { id:'default-2', name:'Dr. Amanda Hemsworth', specialty:'Spesialis Ortodonti', experience:'8 tahun', rating:4.9, reviews:234, price:520000, status:'Tersedia sekarang', nextSlot:'15:00', image:'https://images.unsplash.com/photo-1594824846003-5cee7a0e0f85?w=400&h=400&fit=crop', verified:true },
        { id:'default-3', name:'Dr. Sarah Mitchell', specialty:'Dokter Gigi Anak', experience:'5 tahun', rating:4.8, reviews:189, price:390000, status:'Tersedia hari ini', nextSlot:'16:15', image:'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop', verified:true },
      ];

  function getAppointmentStatus(a){
    if (!a?.startsAt) return 'Terjadwal';
    const now = new Date();
    const t = new Date(a.startsAt);
    const diffM = Math.floor((t - now) / 60000);
    if (diffM < 0) return 'Selesai';
    if (diffM <= 30) return `Mulai dalam ${diffM} menit`;
    if (diffM <= 60) return 'Mulai dalam 1 jam';
    const h = Math.floor(diffM / 60);
    if (h < 24) return `Mulai dalam ${h} jam`;
    const d = Math.floor(h / 24);
    return d === 1 ? 'Besok' : `Dalam ${d} hari`;
  }
  function formatAppointmentTime(s){
    if (!s) return 'Belum ditentukan';
    const d = new Date(s);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  // siapkan infinite scroll: start dari batch tengah agar bisa swipe kiri/kanan langsung
  useEffect(()=>{ const x = featuredDoctors.length * PAGE_W; setTimeout(()=>{ scrollRef.current?.scrollTo({ x, animated:false }); }, 0); }, [featuredDoctors.length]);

  const handleScroll = Animated.event([{ nativeEvent:{ contentOffset:{ x: scrollX } } }], {
    useNativeDriver: false,
    listener: (e) => { const page = Math.round(e.nativeEvent.contentOffset.x / PAGE_W); const idx = page % featuredDoctors.length; setCurrentIndex(((idx%featuredDoctors.length)+featuredDoctors.length)%featuredDoctors.length); }
  });

  const onEnd = (e) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / PAGE_W);
    if (page >= featuredDoctors.length * 2 || page < featuredDoctors.length) {
      const target = (featuredDoctors.length + (page % featuredDoctors.length)) * PAGE_W;
      requestAnimationFrame(()=>{ scrollRef.current?.scrollTo({ x: target, animated:false }); });
    }
  };

  const data = [...featuredDoctors, ...featuredDoctors, ...featuredDoctors];
  const _onJoin = (d)=> onJoinCall?.(d);
  const _onPress= (d)=> onDoctorPress?.(d);

  return (
    <View style={{ marginVertical:16 }}>
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"                 // << lebih responsif/smooth
        snapToInterval={PAGE_W}                 // << cocok dengan lebar “halaman” sebenarnya
        snapToAlignment="start"
        contentContainerStyle={{ paddingHorizontal:SIDE_INSET }}
        onScroll={handleScroll}
        onMomentumScrollEnd={onEnd}
        scrollEventThrottle={16}
        bounces
      >
        {data.map((doctor, i) => {
          const inputRange = [ (i-1)*PAGE_W, i*PAGE_W, (i+1)*PAGE_W ];
          return (
            <Animated.View key={`${doctor.id}-${Math.floor(i/featuredDoctors.length)}`} style={{ width:CARD_W, marginRight:GAP, transform:[{ scale:scrollX.interpolate({ inputRange, outputRange:[0.94,1,0.94], extrapolate:'clamp' }) }], opacity:scrollX.interpolate({ inputRange, outputRange:[0.7,1,0.7], extrapolate:'clamp' }) }}>
              <TouchableOpacity activeOpacity={0.95} onPress={()=>_onPress(doctor)}>
                <LinearGradient colors={theme.gradients?.primary || ['#62109F','#982BEA']} style={{ borderRadius:24, padding:20, overflow:'hidden', shadowColor:'#667eea', shadowOffset:{ width:0, height:12 }, shadowOpacity:0.25, shadowRadius:20, elevation:12, minHeight:220 }} start={{ x:0, y:0 }} end={{ x:1, y:1 }}>
                  <View style={{ position:'absolute', top:-10, right:-10, width:100, height:100, borderRadius:50, backgroundColor:'rgba(255,255,255,0.1)' }} />
                  <View style={{ position:'absolute', bottom:-20, left:-20, width:80, height:80, borderRadius:40, backgroundColor:'rgba(255,255,255,0.06)' }} />
                  <View style={{ flex:1, justifyContent:'space-between' }}>
                    <View style={{ flexDirection:'row', alignItems:'center', marginBottom:16 }}>
                      <View style={{ position:'relative', width:80, height:80, borderRadius:40, overflow:'hidden', borderWidth:3, borderColor:'rgba(255,255,255,0.3)', shadowColor:'#000', shadowOffset:{ width:0, height:6 }, shadowOpacity:0.18, shadowRadius:12, elevation:8, alignItems:'center', justifyContent:'center' }}>
                        <Image source={{ uri: doctor.image }} style={{ width:74, height:74, borderRadius:37 }} />
                        {doctor.verified && (<View style={{ position:'absolute', bottom:2, right:2, backgroundColor:'white', borderRadius:10, padding:2 }}><MaterialCommunityIcons name="check-circle" size={16} color="#4ECDC4" /></View>)}
                      </View>
                      <View style={{ flex:1, marginLeft:16 }}>
                        <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                          <Text numberOfLines={1} style={{ fontSize:18, fontWeight:'bold', color:'white', flex:1, marginRight:8, textShadowColor:'rgba(0,0,0,0.1)', textShadowOffset:{ width:0, height:1 }, textShadowRadius:2 }}>{doctor.name}</Text>
                          <Text style={{ fontSize:16, fontWeight:'bold', color:'white', textShadowColor:'rgba(0,0,0,0.1)', textShadowOffset:{ width:0, height:1 }, textShadowRadius:2 }}>{currencyFormatter.format(doctor.price)}</Text>
                        </View>
                        <View style={{ marginBottom:8 }}>
                          <View style={{ flexDirection:'row', alignItems:'center', marginBottom:4 }}><MaterialCommunityIcons name="stethoscope" size={14} color="rgba(255,255,255,0.9)" /><Text numberOfLines={1} style={{ fontSize:13, color:'rgba(255,255,255,0.9)', marginLeft:6, fontWeight:'500', flex:1 }}>{doctor.specialty}</Text></View>
                          <View style={{ flexDirection:'row', alignItems:'center', marginBottom:4 }}><MaterialCommunityIcons name="clock-outline" size={14} color="rgba(255,255,255,0.9)" /><Text style={{ fontSize:13, color:'rgba(255,255,255,0.9)', marginLeft:6, fontWeight:'500', flex:1 }}>{doctor.experience}</Text></View>
                        </View>
                        {doctor.clinicName && (<View style={{ flexDirection:'row', alignItems:'center', marginBottom:4 }}><MaterialCommunityIcons name="hospital-building" size={12} color="rgba(255,255,255,0.8)" /><Text numberOfLines={1} style={{ fontSize:11, color:'rgba(255,255,255,0.9)', marginLeft:6, fontWeight:'500', flex:1 }}>{doctor.clinicName}</Text></View>)}
                        <View style={{ flexDirection:'row', alignItems:'center', backgroundColor:'rgba(255,255,255,0.2)', borderRadius:15, paddingHorizontal:10, paddingVertical:6, alignSelf:'flex-start', marginTop:4 }}>
                          <MaterialCommunityIcons name="clock-outline" size={14} color="white" />
                          <Text style={{ fontSize:12, color:'white', marginLeft:6, fontWeight:'500' }}>{doctor.status}</Text>
                          <View style={{ width:6, height:6, borderRadius:3, marginLeft:8, backgroundColor: doctor.status.includes('menit') || doctor.status.includes('jam') ? '#FF6B6B' : '#4ECDC4' }} />
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity onPress={()=>_onJoin(doctor)} style={{ backgroundColor:'white', borderRadius:25, paddingVertical:12, flexDirection:'row', alignItems:'center', justifyContent:'center', shadowColor:'#000', shadowOffset:{ width:0, height:4 }, shadowOpacity:0.2, shadowRadius:8, elevation:5 }}>
                      <MaterialCommunityIcons name={doctor.appointmentId ? 'video' : 'phone'} size={18} color={theme.colors.primary} />
                      <Text style={{ fontWeight:'bold', marginLeft:8, fontSize:15, color:theme.colors.primary }}>{doctor.appointmentId ? 'Gabung panggilan' : 'Hubungi sekarang'}</Text>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </Animated.ScrollView>

      <View style={{ flexDirection:'row', justifyContent:'center', marginTop:12 }}>
        {featuredDoctors.map((_, i)=>(<View key={i} style={{ width:i===currentIndex?20:8, height:8, borderRadius:4, backgroundColor:i===currentIndex?'#62109F':'#E5E7EB', marginHorizontal:3 }} />))}
      </View>
    </View>
  );
};

export default FeaturedDoctors;
