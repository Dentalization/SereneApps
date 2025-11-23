import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, Image, StatusBar, Linking } from 'react-native';
import { Text, useTheme, Chip, ActivityIndicator } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getDentistById } from '../../../services/dentistService';
import { API_BASE_URL } from '../../../services/api';
import useAnchoredHeaderHeight from '../../../hooks/useAnchoredHeaderHeight';
import ValidationToast from '../../settings/components/ValidationToast';
import useToast from '../../../hooks/useToast';

const formatRupiah = (value = 0) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`;

const Section = ({ title, children, action, style }) => (
  <View
    style={[
      {
        marginBottom: 24,
      },
      style,
    ]}
  >
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A' }}>{title}</Text>
      {action || null}
    </View>
    {children}
  </View>
);

const DICEBEAR_BG = encodeURIComponent('8B5CF6,A78BFA,C4B5FD,DDD6FE');
const API_BASE = API_BASE_URL.replace(/\/$/, '');

const normalizeDicebear = (url = '', fallbackSeed) => {
  if (!url.includes('dicebear.com')) {
    return url;
  }

  if (!url) {
    return `https://api.dicebear.com/7.x/avataaars/png?seed=${fallbackSeed || 'dentist'}&backgroundColor=${DICEBEAR_BG}&size=256`;
  }

  return url.replace('/svg', '/png').replace('format=svg', 'format=png');
};

const resolveAvatar = (path, fallbackSeed) => {
  if (!path) {
    return `https://api.dicebear.com/7.x/avataaars/png?seed=${fallbackSeed || 'dentist'}&backgroundColor=${DICEBEAR_BG}&size=256`;
  }
  if (/^https?:\/\//i.test(path)) {
    return normalizeDicebear(path, fallbackSeed);
  }
  const normalized = path.startsWith('/') ? path.slice(1) : path;
  return `${API_BASE}/${normalized}`;
};

const DentistDetailScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  
  const [dentist, setDentist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { toast, showToast, hideToast } = useToast();

  const dentistId = route.params?.dentistId || route.params?.dentist?.id;

  useEffect(() => {
    const fetchDentistDetail = async () => {
      if (!dentistId) {
        setError('ID dokter tidak ditemukan');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log('🦷 [DentistDetail] Fetching dentist:', dentistId);
        const response = await getDentistById(dentistId);
        console.log('🦷 [DentistDetail] Response:', response);
        
        // Backend returns { success: true, data: {...} }
        const dentistData = response?.data || response;
        
        if (!dentistData) {
          throw new Error('Data dokter tidak ditemukan');
        }

        // Parse working hours if it's a string
        let workingHours = dentistData.clinic_working_hours;
        if (typeof workingHours === 'string') {
          try {
            workingHours = JSON.parse(workingHours);
          } catch (e) {
            workingHours = null;
          }
        }

        // Map backend data to component format
        const mappedDentist = {
          id: dentistData.id || dentistData.user_id,
          name: dentistData.name,
          specialty: dentistData.specialization,
          title: dentistData.title,
          image: resolveAvatar(dentistData.avatar_url, dentistData.id),
          rating: 4.8, // TODO: Get from reviews table
          reviews: 0, // TODO: Get from reviews table
          experience: `${dentistData.years_of_experience || 0} tahun`,
          languages: ['Bahasa Indonesia', 'English'], // TODO: Add to backend
          bio: `Dokter gigi profesional dengan spesialisasi ${dentistData.specialization}. Berpengalaman ${dentistData.years_of_experience || 0} tahun dalam memberikan perawatan gigi berkualitas.`,
          specialties: dentistData.services_offered || [],
          services: (dentistData.services_offered || []).map(service => ({
            name: service,
            price: dentistData.consultation_fee,
          })),
          availability: workingHours ? Object.entries(workingHours).map(([day, hours]) => ({
            day: day.charAt(0).toUpperCase() + day.slice(1),
            slots: hours === 'Tutup' ? [] : [hours.split('-')[0]],
          })) : [],
          achievements: dentistData.is_verified ? [
            { title: 'Dokter Terverifikasi', year: new Date(dentistData.verification_date || dentistData.created_at).getFullYear() }
          ] : [],
          stories: [], // TODO: Get from reviews
          gallery: [], // TODO: Add to backend
          contact: {
            phone: dentistData.phone_number,
            email: dentistData.email,
            address: dentistData.clinic_address,
          },
          clinic: dentistData.clinic_name,
          clinicAddress: dentistData.clinic_address,
          price: dentistData.consultation_fee,
          consultationTypes: dentistData.consultation_types || [],
          acceptsInsurance: dentistData.accepts_insurance,
          acceptsBpjs: dentistData.accepts_bpjs,
          emergencyAvailable: dentistData.emergency_availability,
          isVerified: dentistData.is_verified,
          licenseNumber: dentistData.license_number,
          registrationNumber: dentistData.registration_number,
          patientsHelped: Math.floor(Math.random() * 1000) + 500, // TODO: Add to backend
          responseTime: '2 jam', // TODO: Add to backend
        };

        setDentist(mappedDentist);
        setError(null);
      } catch (err) {
        console.log('🔍 [DentistDetail] Error fetching dentist:', err.message);
        setError(err.message || 'Gagal memuat detail dokter');
        showToast('Gagal memuat data dokter', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchDentistDetail();
  }, [dentistId]);

  const distanceText =
    route.params?.dentist?.distance ??
    (typeof route.params?.dentist?.distanceKm === 'number' ? `${route.params.dentist.distanceKm.toFixed(1)} km` : null);

  const { headerHeight, handleHeaderLayout } = useAnchoredHeaderHeight(360);

  const handleBook = () =>
    navigation.navigate('AppointmentTab', {
      screen: 'BookingSlot',
      params: { dentistId: dentist?.id },
    });

  const handleMessage = () =>
    navigation.navigate('AppointmentTab', {
      screen: 'BookingSlot',
      params: { dentistId: dentist?.id },
    });

  const handleCall = () => {
    if (dentist?.contact?.phone) {
      Linking.openURL(`tel:${dentist.contact.phone}`);
    }
  };

  const handleEmail = () => {
    if (dentist?.contact?.email) {
      Linking.openURL(`mailto:${dentist.contact.email}`);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 12, color: '#475569' }}>Memuat detail dokter...</Text>
      </View>
    );
  }

  if (error || !dentist) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <MaterialCommunityIcons name="alert-circle" size={64} color="#EF4444" />
        <Text style={{ marginTop: 16, fontSize: 18, fontWeight: '700', color: '#0F172A' }}>
          Gagal Memuat Data
        </Text>
        <Text style={{ marginTop: 8, color: '#64748B', textAlign: 'center' }}>
          {error || 'Data dokter tidak ditemukan'}
        </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            marginTop: 20,
            backgroundColor: theme.colors.primary,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statCard = (label, value, icon) => (
    <View
      key={label}
      style={{
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 18,
        padding: 14,
        marginRight: 12,
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 14,
        elevation: 4,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: 'rgba(99,102,241,0.1)',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 10,
          }}
        >
          <MaterialCommunityIcons name={icon} size={20} color={theme.colors.primary} />
        </View>
        <Text style={{ fontSize: 13, color: '#94A3B8', fontWeight: '600' }}>{label}</Text>
      </View>
      <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A' }}>{value}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle='light-content' backgroundColor={theme.colors.primary} />

      <View
        onLayout={handleHeaderLayout}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}
      >
        <LinearGradient
          colors={[theme.colors.primary, '#7F1DFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: 48,
            paddingBottom: 32,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
            paddingHorizontal: 20,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 24,
            }}
          >
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
              <MaterialCommunityIcons name='arrow-left' size={22} color='white' />
            </TouchableOpacity>
            <Text style={{ color: 'white', fontSize: 20, fontWeight: '700' }}>Profil Dokter</Text>
            <TouchableOpacity
              onPress={handleMessage}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: 'rgba(255,255,255,0.25)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialCommunityIcons name='message-text' size={20} color='white' />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image
              source={{ uri: dentist.image }}
              style={{ width: 96, height: 96, borderRadius: 28, marginRight: 16 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ color: 'white', fontSize: 22, fontWeight: '700' }}>{dentist.name}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, marginTop: 4 }}>
                {dentist.specialty}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                <MaterialCommunityIcons name='star' color='#FACC15' size={18} />
                <Text style={{ color: 'white', marginLeft: 6, fontWeight: '600' }}>
                  {(dentist.rating || 0).toFixed(1)} · {dentist.reviews || 0} ulasan
                </Text>
              </View>
              {distanceText ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <MaterialCommunityIcons name='map-marker-distance' color='white' size={16} />
                  <Text style={{ color: 'white', marginLeft: 4 }}>
                    {distanceText} • {dentist.clinic}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={{ flexDirection: 'row', marginTop: 20 }}>
            <TouchableOpacity
              onPress={handleBook}
              style={{
                flex: 1,
                backgroundColor: 'white',
                paddingVertical: 12,
                borderRadius: 20,
                alignItems: 'center',
                marginRight: 10,
                flexDirection: 'row',
                justifyContent: 'center',
              }}
            >
              <MaterialCommunityIcons name='calendar-check' size={20} color={theme.colors.primary} />
              <Text style={{ marginLeft: 8, fontWeight: '700', color: theme.colors.primary }}>Pesan Jadwal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleMessage}
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: 'rgba(255,255,255,0.25)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialCommunityIcons name='phone' size={22} color='white' />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingTop: headerHeight + 16, paddingBottom: 220 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
            {[
              statCard('Pengalaman', dentist.experience || '—', 'medal-outline'),
              statCard('Pasien terbantu', dentist.patientsHelped || '1.200+', 'account-group'),
              statCard('Respon rata-rata', dentist.responseTime || '<2 jam', 'clock-fast'),
            ]}
          </ScrollView>

          <Section title='Tentang Dokter' style={{ marginTop: 24 }}>
            <Text style={{ fontSize: 14, color: '#475569', lineHeight: 22 }}>{dentist.bio}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 14 }}>
              {dentist.languages?.map((lang) => (
                <Chip key={lang} style={{ marginRight: 8, marginBottom: 8 }} textStyle={{ fontWeight: '600' }}>
                  {lang}
                </Chip>
              ))}
            </View>
          </Section>

          <Section title='Spesialisasi'>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {dentist.specialties?.map((item) => (
                <View
                  key={item}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 16,
                    backgroundColor: '#EEF2FF',
                    marginRight: 8,
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>{item}</Text>
                </View>
              ))}
            </View>
          </Section>

          <Section title='Layanan'>
            {dentist.services?.map((service) => (
              <View
                key={service.name}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: '#E2E8F0',
                }}
              >
                <Text style={{ fontWeight: '600', color: '#0F172A' }}>{service.name}</Text>
                <Text style={{ color: '#475569' }}>{formatRupiah(service.price)}</Text>
              </View>
            ))}
          </Section>

          <Section title='Ketersediaan Jadwal'>
            {dentist.availability?.map((slot) => (
              <View
                key={slot.day}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingVertical: 10,
                }}
              >
                <Text style={{ fontWeight: '600', color: '#0F172A' }}>{slot.day}</Text>
                <Text style={{ color: '#475569' }}>{slot.slots.join(' • ')}</Text>
              </View>
            ))}
          </Section>

          <Section title='Pencapaian'>
            {dentist.achievements?.map((ach) => (
              <View key={ach.title} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <MaterialCommunityIcons name='trophy' size={18} color='#FACC15' />
                <Text style={{ marginLeft: 10, fontWeight: '600', color: '#0F172A' }}>{ach.title}</Text>
                <Text style={{ marginLeft: 6, color: '#94A3B8' }}>{ach.year}</Text>
              </View>
            ))}
          </Section>

          <Section title='Cerita Pasien'>
            {dentist.stories?.map((story) => (
              <View
                key={story.patient}
                style={{
                  backgroundColor: 'white',
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 12,
                  shadowColor: '#94A3B8',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.08,
                  shadowRadius: 12,
                  elevation: 4,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <MaterialCommunityIcons name='account-circle' size={26} color='#94A3B8' />
                  <View style={{ marginLeft: 10 }}>
                    <Text style={{ fontWeight: '600', color: '#0F172A' }}>{story.patient}</Text>
                    <Text style={{ color: '#F59E0B', fontWeight: '600' }}>{story.rating} ★</Text>
                  </View>
                </View>
                <Text style={{ color: '#475569' }}>{story.summary}</Text>
              </View>
            ))}
          </Section>

          <Section title='Galeri'>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {dentist.gallery?.map((url, index) => (
                <Image
                  key={`${url}-${index}`}
                  source={{ uri: url }}
                  style={{ width: 160, height: 120, borderRadius: 16, marginRight: 12 }}
                />
              ))}
            </ScrollView>
          </Section>

          <Section title='Kontak'>
            <View style={{ backgroundColor: 'white', borderRadius: 18, padding: 16 }}>
              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                <MaterialCommunityIcons name='phone' size={18} color={theme.colors.primary} />
                <Text style={{ marginLeft: 8, color: '#475569' }}>{dentist.contact?.phone}</Text>
              </View>
              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                <MaterialCommunityIcons name='email' size={18} color={theme.colors.primary} />
                <Text style={{ marginLeft: 8, color: '#475569' }}>{dentist.contact?.email}</Text>
              </View>
              <View style={{ flexDirection: 'row' }}>
                <MaterialCommunityIcons name='map-marker' size={18} color={theme.colors.primary} />
                <Text style={{ marginLeft: 8, color: '#475569', flex: 1 }}>{dentist.contact?.address}</Text>
              </View>
            </View>
          </Section>
        </View>
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: 20,
          backgroundColor: 'rgba(248,250,252,0.95)',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 12,
          elevation: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#94A3B8', fontSize: 12 }}>Konsultasi mulai dari</Text>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#0F172A' }}>
              {formatRupiah(dentist.price)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleBook}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.colors.primary,
              paddingHorizontal: 28,
              paddingVertical: 12,
              borderRadius: 24,
            }}
          >
            <MaterialCommunityIcons name='calendar-plus' size={20} color='white' />
            <Text style={{ color: 'white', fontWeight: '700', marginLeft: 8 }}>Pesan sekarang</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ValidationToast
        visible={toast.visible}
        message={toast.message}
        status={toast.status}
        onDismiss={hideToast}
      />
    </View>
  );
};

export default DentistDetailScreen;
