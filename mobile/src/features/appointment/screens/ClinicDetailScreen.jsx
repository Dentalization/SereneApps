import React, { useMemo, useLayoutEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Image, StatusBar } from 'react-native';
import { Text, Chip, Button, useTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute, useNavigation } from '@react-navigation/native';
import { CLINICS, getClinicById, getDentistById } from '../data/appointments';
import { formatCurrency } from '../../../utils/formatters';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import useAnchoredHeaderHeight from '../../../hooks/useAnchoredHeaderHeight';

const ClinicDetailScreen = () => {
  const theme = useTheme();
  const route = useRoute();
  const navigation = useNavigation();
  const clinicId = route.params?.clinicId || CLINICS[0].id;
  const clinic = getClinicById(clinicId) || CLINICS[0];
  const dentists = useMemo(
    () => (clinic.dentists || []).map((id) => getDentistById(id)).filter(Boolean),
    [clinic.dentists]
  );

  useLayoutEffect(() => {
    navigation.getParent()?.setOptions({
      tabBarStyle: { display: 'none' }
    });
  }, [navigation]);

  const { headerHeight, handleHeaderLayout } = useAnchoredHeaderHeight(320);

  const handleBook = (dentist) => {
    navigation.navigate('BookingSlot', {
      dentistId: dentist?.id || (clinic.dentists || [])[0],
      type: 'onsite',
    });
  };

  const handleDentist = (dentist) => {
    navigation.navigate('DentistDetail', { dentistId: dentist.id, dentist });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle='light-content' backgroundColor='#7C3AED' />

      <View
        onLayout={handleHeaderLayout}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, elevation: 10 }}
      >
        <LinearGradient
          colors={['#7C3AED', '#9D5DF5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingTop: 52, paddingHorizontal: 20, paddingBottom: 32, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}
            >
              <MaterialCommunityIcons name='arrow-left' size={22} color='white' />
            </TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Serene Klinik</Text>
              <Text style={{ color: 'white', fontSize: 18, fontWeight: '700', marginTop: 4 }}>Detail Klinik</Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('BookingSlot', { dentistId: clinic.dentists?.[0] })}
              style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}
            >
              <MaterialCommunityIcons name='calendar' size={22} color='white' />
            </TouchableOpacity>
          </View>
          <View style={{ marginTop: 18 }}>
            <Text style={{ color: 'white', fontSize: 26, fontWeight: '700' }}>{clinic.name}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.85)', marginTop: 6 }}>{clinic.tagline}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
              <MaterialCommunityIcons name='map-marker' size={16} color='rgba(255,255,255,0.8)' />
              <Text style={{ color: 'rgba(255,255,255,0.85)', marginLeft: 6, flex: 1 }}>{clinic.address}</Text>
            </View>
            <View style={{ flexDirection: 'row', marginTop: 16 }}>
              <HeroStat label='Rating' value={`${clinic.rating} (${clinic.reviews} ulasan)`} icon='star' />
              <HeroStat label='Jarak' value={clinic.distance} icon='map-marker-distance' />
              <HeroStat label='Dokter' value={`${clinic.stats?.dentists || '-'} dokter`} icon='doctor' />
            </View>
          </View>
        </LinearGradient>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingTop: headerHeight + 16, paddingBottom: 220 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
          <Section title='Keunggulan klinik'>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[clinic.tagline, ...(clinic.highlights || [])].map((item, idx) => (
                <View key={`${item}-${idx}`} style={styles.highlightChip}>
                  <Text style={{ color: '#7C3AED', fontWeight: '600' }}>{item}</Text>
                </View>
              ))}
            </ScrollView>
          </Section>

          <Section title='Layanan populer'>
            {clinic.services?.map((service) => (
              <View key={service.name} style={styles.serviceCard}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: '#0F172A' }}>{service.name}</Text>
                  <Text style={{ color: '#94A3B8', marginTop: 4 }}>{service.description}</Text>
                </View>
                <Text style={{ fontWeight: '700', color: '#7C3AED' }}>{formatCurrency(service.price)}</Text>
              </View>
            ))}
          </Section>

          <Section title='Fasilitas & galeri'>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {clinic.gallery?.map((image, idx) => (
                <Image key={idx} source={{ uri: image }} style={styles.galleryImage} />
              ))}
            </ScrollView>
          </Section>

          <Section title='Tim dokter'>
            {dentists.map((dentist) => (
              <View key={dentist.id} style={styles.dentistCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Image source={{ uri: dentist.avatar }} style={styles.dentistAvatar} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', color: '#0F172A' }}>{dentist.name}</Text>
                    <Text style={{ color: '#94A3B8', fontSize: 12 }}>{dentist.specialty}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                      <MaterialCommunityIcons name='star' size={16} color='#FACC15' />
                      <Text style={{ marginLeft: 4, fontWeight: '600', color: '#475569' }}>{dentist.rating}</Text>
                    </View>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', marginTop: 14 }}>
                  <Button mode='outlined' style={{ flex: 1, marginRight: 10 }} onPress={() => handleDentist(dentist)}>
                    Lihat profil
                  </Button>
                  <Button mode='contained' style={{ flex: 1 }} onPress={() => handleBook(dentist)}>
                    Pilih jadwal
                  </Button>
                </View>
              </View>
            ))}
          </Section>

          <Section title='Kontak & lokasi'>
            <View style={styles.contactCard}>
              <ContactRow icon='phone' value={clinic.phone} />
              <ContactRow icon='email' value={clinic.email} />
              <ContactRow icon='clock-outline' value={clinic.operationalHours} />
            </View>
          </Section>
        </View>
      </ScrollView>

      <View style={styles.ctaBar}>
        <View>
          <Text style={{ color: '#94A3B8', fontSize: 12 }}>Butuh bantuan?</Text>
          <Text style={{ fontWeight: '700', color: '#0F172A' }}>{clinic.phone}</Text>
        </View>
        <Button mode='contained' onPress={() => handleBook(dentists[0])}>
          Pesan di klinik
        </Button>
      </View>
    </View>
  );
};

const Section = ({ title, children }) => (
  <View style={{ marginBottom: 24 }}>
    <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 12 }}>{title}</Text>
    {children}
  </View>
);

const HeroStat = ({ icon, label, value }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', marginRight: 12 }}>
    <MaterialCommunityIcons name={icon} size={16} color='white' />
    <View style={{ marginLeft: 8 }}>
      <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{label}</Text>
      <Text style={{ color: 'white', fontWeight: '700' }}>{value}</Text>
    </View>
  </View>
);

const ContactRow = ({ icon, value }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
    <MaterialCommunityIcons name={icon} size={18} color='#7C3AED' />
    <Text style={{ marginLeft: 8, color: '#475569', flex: 1 }}>{value}</Text>
  </View>
);

const styles = {
  highlightChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    marginRight: 10,
  },
  serviceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 18,
    backgroundColor: 'white',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  galleryImage: {
    width: 200,
    height: 140,
    borderRadius: 18,
    marginRight: 14,
  },
  dentistCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EEF2FF',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  dentistAvatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    marginRight: 14,
  },
  contactCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEF2FF',
  },
  ctaBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: 'white',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
  },
};

export default ClinicDetailScreen;
