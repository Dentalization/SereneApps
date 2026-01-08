import React, { useRef, useState, useEffect, useMemo } from 'react';
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

function getAppointmentStatus(a) {
  if (!a?.startsAt) return { text: 'Terjadwal', canJoin: false, minutesUntil: null };
  const now = new Date();
  const t = new Date(a.startsAt);
  const diffM = Math.floor((t - now) / 60000);
  
  if (diffM < 0) return { text: 'Selesai', canJoin: false, minutesUntil: diffM };
  if (diffM <= 30) return { text: `Mulai dalam ${diffM} menit`, canJoin: true, minutesUntil: diffM };
  if (diffM <= 60) return { text: 'Mulai dalam 1 jam', canJoin: false, minutesUntil: diffM };
  const h = Math.floor(diffM / 60);
  if (h < 24) return { text: `Mulai dalam ${h} jam`, canJoin: false, minutesUntil: diffM };
  const d = Math.floor(h / 24);
  return { text: d === 1 ? 'Besok' : `Dalam ${d} hari`, canJoin: false, minutesUntil: diffM };
}

function formatAppointmentTime(s) {
  if (!s) return 'Belum ditentukan';
  const d = new Date(s);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

const FeaturedDoctors = ({ appointments = [], onDoctorPress, onJoinCall }) => {
  const theme = useTheme();
  const scrollRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);

  // Map appointments to card data format using useMemo
  const featuredDoctors = useMemo(() => {
    if (!appointments || appointments.length === 0) return [];
    
    return appointments.map(a => {
      const statusInfo = getAppointmentStatus(a);
      return {
        id: a.id,
        bookingCode: a.bookingCode || `SRN-${String(a.id).padStart(6, '0')}`,
        name: a.dentist?.title 
          ? `${a.dentist.title} ${a.dentist.name}` 
          : (a.dentist?.name || 'Dokter Gigi'),
        specialty: a.dentist?.specialty || 'Dokter Gigi Umum',
        dentistType: a.dentist?.dentistType || 'clinic',
        experience: a.dentist?.experience || '',
        rating: a.dentist?.rating || 4.8,
        reviews: a.dentist?.reviews || 0,
        price: a.payment?.amount || 0,
        paymentStatus: a.payment?.status || null,
        statusText: statusInfo.text,
        canJoin: statusInfo.canJoin && (a.metadata?.appointmentType === 'virtual' || a.type === 'virtual'),
        nextSlot: formatAppointmentTime(a.startsAt),
        image: a.dentist?.avatar || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop',
        verified: true,
        appointmentId: a.id,
        startsAt: a.startsAt,
        clinicName: a.clinic?.name || (a.dentist?.dentistType === 'independent' ? 'Praktik Mandiri' : ''),
        reason: a.reason || 'Konsultasi gigi',
        type: a.metadata?.appointmentType || a.type || 'onsite',
        // Pass full appointment for navigation
        fullAppointment: a,
      };
    });
  }, [appointments]);

  // siapkan infinite scroll: start dari batch tengah agar bisa swipe kiri/kanan langsung
  useEffect(() => {
    if (featuredDoctors.length > 0) {
      const x = featuredDoctors.length * PAGE_W;
      setTimeout(() => {
        scrollRef.current?.scrollTo({ x, animated: false });
      }, 0);
    }
  }, [featuredDoctors.length]);

  const handleScroll = useMemo(() => Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (e) => {
        if (featuredDoctors.length === 0) return;
        const page = Math.round(e.nativeEvent.contentOffset.x / PAGE_W);
        const idx = page % featuredDoctors.length;
        setCurrentIndex(((idx % featuredDoctors.length) + featuredDoctors.length) % featuredDoctors.length);
      }
    }
  ), [scrollX, featuredDoctors.length]);

  const onEnd = (e) => {
    if (featuredDoctors.length === 0) return;
    const page = Math.round(e.nativeEvent.contentOffset.x / PAGE_W);
    if (page >= featuredDoctors.length * 2 || page < featuredDoctors.length) {
      const target = (featuredDoctors.length + (page % featuredDoctors.length)) * PAGE_W;
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ x: target, animated: false });
      });
    }
  };

  const _onJoin = (d) => onJoinCall?.(d);
  const _onPress = (d) => onDoctorPress?.(d);

  // Return null AFTER all hooks are called (React rules of hooks)
  if (featuredDoctors.length === 0) {
    return null;
  }

  const data = [...featuredDoctors, ...featuredDoctors, ...featuredDoctors];

  return (
    <View style={{ marginVertical: 16 }}>
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={PAGE_W}
        snapToAlignment="start"
        contentContainerStyle={{ paddingHorizontal: SIDE_INSET }}
        onScroll={handleScroll}
        onMomentumScrollEnd={onEnd}
        scrollEventThrottle={16}
        bounces
      >
        {data.map((doctor, i) => {
          const inputRange = [(i - 1) * PAGE_W, i * PAGE_W, (i + 1) * PAGE_W];
          return (
            <Animated.View
              key={`${doctor.id}-${Math.floor(i / featuredDoctors.length)}`}
              style={{
                width: CARD_W,
                marginRight: GAP,
                transform: [{
                  scale: scrollX.interpolate({
                    inputRange,
                    outputRange: [0.94, 1, 0.94],
                    extrapolate: 'clamp'
                  })
                }],
                opacity: scrollX.interpolate({
                  inputRange,
                  outputRange: [0.7, 1, 0.7],
                  extrapolate: 'clamp'
                })
              }}
            >
              <TouchableOpacity activeOpacity={0.95} onPress={() => _onPress(doctor)}>
                <LinearGradient
                  colors={theme.gradients?.primary || ['#62109F', '#982BEA']}
                  style={{
                    borderRadius: 24,
                    padding: 20,
                    overflow: 'hidden',
                    shadowColor: '#667eea',
                    shadowOffset: { width: 0, height: 12 },
                    shadowOpacity: 0.25,
                    shadowRadius: 20,
                    elevation: 12,
                    minHeight: 220
                  }}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {/* Decorative circles */}
                  <View style={{ position: 'absolute', top: -10, right: -10, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.1)' }} />
                  <View style={{ position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.06)' }} />

                  <View style={{ flex: 1, justifyContent: 'space-between' }}>
                    {/* Booking Code Header */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <MaterialCommunityIcons name="ticket-confirmation-outline" size={14} color="rgba(255,255,255,0.8)" />
                      <Text style={{ marginLeft: 6, fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.9)', letterSpacing: 0.5 }}>
                        {doctor.bookingCode}
                      </Text>
                      {doctor.dentistType === 'independent' && (
                        <View style={{ marginLeft: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 10, color: 'white', fontWeight: '600' }}>Mandiri</Text>
                        </View>
                      )}
                    </View>

                    {/* Doctor Info */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                      <View style={{
                        position: 'relative',
                        width: 70,
                        height: 70,
                        borderRadius: 35,
                        overflow: 'hidden',
                        borderWidth: 3,
                        borderColor: 'rgba(255,255,255,0.3)',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Image source={{ uri: doctor.image }} style={{ width: 64, height: 64, borderRadius: 32 }} />
                        {doctor.verified && (
                          <View style={{ position: 'absolute', bottom: 2, right: 2, backgroundColor: 'white', borderRadius: 10, padding: 2 }}>
                            <MaterialCommunityIcons name="check-circle" size={14} color="#4ECDC4" />
                          </View>
                        )}
                      </View>
                      <View style={{ flex: 1, marginLeft: 14 }}>
                        <Text numberOfLines={1} style={{ fontSize: 17, fontWeight: 'bold', color: 'white', marginBottom: 4 }}>
                          {doctor.name}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                          <MaterialCommunityIcons name="stethoscope" size={13} color="rgba(255,255,255,0.85)" />
                          <Text numberOfLines={1} style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginLeft: 5, flex: 1 }}>
                            {doctor.specialty}
                          </Text>
                        </View>
                        {doctor.clinicName ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <MaterialCommunityIcons name="hospital-building" size={12} color="rgba(255,255,255,0.75)" />
                            <Text numberOfLines={1} style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', marginLeft: 5, flex: 1 }}>
                              {doctor.clinicName}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>

                    {/* Appointment Info */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        borderRadius: 12,
                        paddingHorizontal: 10,
                        paddingVertical: 6
                      }}>
                        <MaterialCommunityIcons name="clock-outline" size={14} color="white" />
                        <Text style={{ fontSize: 12, color: 'white', marginLeft: 6, fontWeight: '500' }}>{doctor.statusText}</Text>
                        <View style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          marginLeft: 8,
                          backgroundColor: doctor.statusText.includes('menit') || doctor.statusText.includes('jam') ? '#FF6B6B' : '#4ECDC4'
                        }} />
                      </View>
                      {doctor.price > 0 && (
                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: 'white' }}>
                          {currencyFormatter.format(doctor.price)}
                        </Text>
                      )}
                    </View>

                    {/* Action Button */}
                    <TouchableOpacity
                      onPress={() => doctor.canJoin ? _onJoin(doctor) : _onPress(doctor)}
                      style={{
                        backgroundColor: 'white',
                        borderRadius: 20,
                        paddingVertical: 10,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.15,
                        shadowRadius: 6,
                        elevation: 4
                      }}
                    >
                      <MaterialCommunityIcons
                        name={doctor.canJoin ? 'video' : 'calendar-check'}
                        size={16}
                        color={theme.colors.primary}
                      />
                      <Text style={{ fontWeight: 'bold', marginLeft: 8, fontSize: 14, color: theme.colors.primary }}>
                        {doctor.canJoin ? 'Gabung panggilan' : 'Lihat detail'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </Animated.ScrollView>

      {/* Pagination dots */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 12 }}>
        {featuredDoctors.map((_, i) => (
          <View
            key={i}
            style={{
              width: i === currentIndex ? 20 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: i === currentIndex ? '#62109F' : '#E5E7EB',
              marginHorizontal: 3
            }}
          />
        ))}
      </View>
    </View>
  );
};

export default FeaturedDoctors;
