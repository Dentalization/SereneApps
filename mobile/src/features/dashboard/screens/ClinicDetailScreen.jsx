import React, { useRef, useState } from 'react';
import { View, ScrollView, Image, TouchableOpacity, StatusBar, Linking } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getClinicById, formatClinicDistance } from '../data/clinics';
import { formatCurrency } from '../../../utils/formatters';
import useAnchoredHeaderHeight from '../../../hooks/useAnchoredHeaderHeight';

const StatPill = ({ icon, label, value }) => (
  <View
    style={{
      flex: 1,
      marginHorizontal: 6,
      padding: 12,
      borderRadius: 16,
      backgroundColor: 'rgba(15,23,42,0.2)',
      alignItems: 'center',
    }}
  >
    <MaterialCommunityIcons name={icon} size={20} color="white" />
    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4 }}>{label}</Text>
    <Text style={{ color: 'white', fontWeight: '700', marginTop: 2 }}>{value}</Text>
  </View>
);

const Section = ({ title, description, children, onLayout }) => (
  <View style={{ marginBottom: 24 }} onLayout={onLayout}>
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A' }}>{title}</Text>
      {description ? (
        <Text style={{ color: '#94A3B8', marginTop: 4 }}>{description}</Text>
      ) : null}
    </View>
    {children}
  </View>
);

const ClinicDetailScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const scrollViewRef = useRef(null);
  const [activeSection, setActiveSection] = useState('kontak');
  const [anchorHeight, setAnchorHeight] = useState(64);

  // Store section positions
  const sectionPositions = useRef({
    kontak: 0,
    keunggulan: 0,
    layanan: 0,
    dokter: 0,
    fasilitas: 0,
    galeri: 0,
  });

  const clinic = getClinicById(route.params?.clinicId);
  const { headerHeight, handleHeaderLayout } = useAnchoredHeaderHeight(360);

  const sections = [
    { id: 'kontak', label: 'Kontak', icon: 'map-marker' },
    { id: 'keunggulan', label: 'Keunggulan', icon: 'star' },
    { id: 'layanan', label: 'Layanan', icon: 'medical-bag' },
    { id: 'dokter', label: 'Dokter', icon: 'doctor' },
    { id: 'fasilitas', label: 'Fasilitas', icon: 'hospital-building' },
    { id: 'galeri', label: 'Galeri', icon: 'image-multiple' },
  ];

  const scrollToSection = (sectionId) => {
    const position = sectionPositions.current[sectionId];
    if (scrollViewRef.current && position !== undefined) {
      scrollViewRef.current.scrollTo({
        y: Math.max(position - anchorHeight, 0),
        animated: true,
      });
      setActiveSection(sectionId);
    }
  };

  const handleSectionLayout = (sectionId, event) => {
    const { y } = event.nativeEvent.layout;
    sectionPositions.current[sectionId] = y;
  };

  const handleScroll = (event) => {
    const offsetY = event.nativeEvent.contentOffset.y + anchorHeight + 16;
    let currentSection = sections[0].id;
    for (const section of sections) {
      const position = sectionPositions.current[section.id];
      if (position !== undefined && offsetY >= position) {
        currentSection = section.id;
      } else {
        break;
      }
    }
    if (currentSection !== activeSection) {
      setActiveSection(currentSection);
    }
  };

  const handleBook = () =>
    navigation.navigate('AppointmentTab', {
      screen: 'ClinicDetail',
      params: { clinicId: clinic.id },
    });

  const handleCall = () => {
    if (clinic.phone) {
      Linking.openURL(`tel:${clinic.phone}`).catch(() => {});
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

      <View
        onLayout={handleHeaderLayout}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, zIndex: 20, elevation: 20 }}
      >
        <LinearGradient
          colors={[theme.colors.primary, '#7C3AED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: 52,
            paddingHorizontal: 20,
            paddingBottom: 32,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
            </TouchableOpacity>
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Detail Klinik</Text>
            <TouchableOpacity
              onPress={handleBook}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialCommunityIcons name="calendar" size={22} color="white" />
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: 24 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  backgroundColor: 'rgba(15,23,42,0.25)',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 999,
                  marginRight: 8,
                }}
              >
                <Text style={{ color: 'white', fontWeight: '600' }}>
                  {formatClinicDistance(clinic.distanceKm)}
                </Text>
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.8)' }}>{clinic.city}</Text>
            </View>
            <Text style={{ color: 'white', fontSize: 28, fontWeight: '800' }}>{clinic.name}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.85)', marginTop: 6 }}>{clinic.tagline}</Text>
            <View style={{ flexDirection: 'row', marginTop: 18 }}>
              <StatPill icon="star" label="Rating" value={`${clinic.rating?.toFixed(1)} (${clinic.reviews})`} />
              <StatPill icon="clock-outline" label="Jam" value={clinic.openStatus} />
              <StatPill icon="account-group" label="Antrian" value={clinic.queue} />
            </View>
          </View>
        </LinearGradient>
      </View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{ paddingTop: headerHeight + 16, paddingBottom: 220 }}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* ANCHOR HEADER STICKY */}
        <View
          onLayout={(event) => setAnchorHeight(event.nativeEvent.layout.height)}
          style={{
            marginHorizontal: 16,
            backgroundColor: 'white',
            borderRadius: 28,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            paddingVertical: 12,
            paddingHorizontal: 8,
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
            elevation: 6,
          }}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 8 }}
          >
            {sections.map((section) => (
              <TouchableOpacity
                key={section.id}
                onPress={() => scrollToSection(section.id)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  marginRight: 8,
                  borderRadius: 20,
                  backgroundColor:
                    activeSection === section.id ? theme.colors.primary : '#F1F5F9',
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <MaterialCommunityIcons
                  name={section.icon}
                  size={16}
                  color={activeSection === section.id ? 'white' : '#64748B'}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={{
                    color: activeSection === section.id ? 'white' : '#64748B',
                    fontWeight: activeSection === section.id ? '700' : '600',
                    fontSize: 13,
                  }}
                >
                  {section.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* CONTENT */}
        <View style={{ padding: 20 }}>
          <Section
            title="Alamat & kontak"
            onLayout={(e) => handleSectionLayout('kontak', e)}
          >
            <View
              style={{
                backgroundColor: 'white',
                borderRadius: 20,
                padding: 16,
                borderWidth: 1,
                borderColor: '#E2E8F0',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <MaterialCommunityIcons name="map-marker" size={18} color={theme.colors.primary} />
                <Text style={{ marginLeft: 8, color: '#0F172A', flex: 1 }}>{clinic.address}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <MaterialCommunityIcons name="phone" size={18} color={theme.colors.primary} />
                <Text style={{ marginLeft: 8, color: '#0F172A' }}>{clinic.phone}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons name="email" size={18} color={theme.colors.primary} />
                <Text style={{ marginLeft: 8, color: '#0F172A' }}>{clinic.email}</Text>
              </View>
            </View>
          </Section>

          <Section
            title="Keunggulan klinik"
            description="Kurasi layanan dan fasilitas premium untuk pasien modern."
            onLayout={(e) => handleSectionLayout('keunggulan', e)}
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {(clinic.highlights || []).map((item) => (
                <View
                  key={item}
                  style={{
                    backgroundColor: clinic.badgeColor || '#EEF2FF',
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 18,
                    marginRight: 12,
                  }}
                >
                  <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>{item}</Text>
                </View>
              ))}
            </ScrollView>
          </Section>

          <Section
            title="Layanan populer"
            onLayout={(e) => handleSectionLayout('layanan', e)}
          >
            {(clinic.services || []).map((service) => (
              <View
                key={service.name}
                style={{
                  backgroundColor: 'white',
                  borderRadius: 20,
                  padding: 16,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <View style={{ flex: 1, paddingRight: 16 }}>
                    <Text style={{ fontWeight: '700', color: '#0F172A' }}>{service.name}</Text>
                    <Text style={{ color: '#94A3B8', marginTop: 4 }}>{service.description}</Text>
                  </View>
                  <Text style={{ fontWeight: '700', color: theme.colors.primary }}>
                    {formatCurrency(service.price)}
                  </Text>
                </View>
              </View>
            ))}
          </Section>

          <Section
            title="Tim dokter"
            onLayout={(e) => handleSectionLayout('dokter', e)}
          >
            {(clinic.doctors || []).map((doctor) => (
              <View
                key={doctor.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: 20,
                  padding: 16,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Image
                    source={{ uri: doctor.avatar }}
                    style={{ width: 64, height: 64, borderRadius: 16, marginRight: 16 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', color: '#0F172A' }}>{doctor.name}</Text>
                    <Text style={{ color: '#94A3B8', marginTop: 2 }}>{doctor.specialty}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                      <MaterialCommunityIcons name="star" size={16} color="#FACC15" />
                      <Text style={{ marginLeft: 6, fontWeight: '600', color: '#475569' }}>
                        {doctor.rating} · {doctor.experience}
                      </Text>
                    </View>
                    <Text style={{ color: '#94A3B8', marginTop: 4 }}>
                      Slot terdekat: {(doctor.slots || []).join(', ')}
                    </Text>
                  </View>
                </View>
                <Button
                  mode="contained"
                  style={{ marginTop: 12 }}
                  onPress={() =>
                    navigation.navigate('AppointmentTab', {
                      screen: 'BookingSlot',
                      params: { dentistId: doctor.id },
                    })
                  }
                >
                  Pilih jadwal dokter
                </Button>
              </View>
            ))}
          </Section>

          <Section
            title="Fasilitas unggulan"
            onLayout={(e) => handleSectionLayout('fasilitas', e)}
          >
            <View
              style={{
                backgroundColor: 'white',
                borderRadius: 20,
                padding: 16,
                borderWidth: 1,
                borderColor: '#E2E8F0',
              }}
            >
              {(clinic.facilities || []).map((facility) => (
                <View
                  key={facility}
                  style={{
                    flexDirection: 'row',
                    marginBottom: 12,
                    alignItems: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: '#EEF2FF',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 10,
                    }}
                  >
                    <MaterialCommunityIcons
                      name="check"
                      size={16}
                      color={theme.colors.primary}
                    />
                  </View>
                  <Text style={{ flex: 1, color: '#475569' }}>{facility}</Text>
                </View>
              ))}
            </View>
          </Section>

          <Section
            title="Galeri suasana"
            onLayout={(e) => handleSectionLayout('galeri', e)}
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {(clinic.gallery || []).map((image, idx) => (
                <Image
                  key={`${image}-${idx}`}
                  source={{ uri: image }}
                  style={{ width: 220, height: 140, borderRadius: 20, marginRight: 14 }}
                />
              ))}
            </ScrollView>
          </Section>
        </View>
      </ScrollView>

      {/* BOTTOM ACTION BAR */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: 20,
          backgroundColor: 'white',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 12,
        }}
      >
        <View style={{ flexDirection: 'row' }}>
          <Button
            mode="outlined"
            style={{ flex: 1, marginRight: 12 }}
            onPress={handleCall}
            icon="phone"
          >
            Hubungi
          </Button>
          <Button
            mode="contained"
            style={{ flex: 1 }}
            onPress={handleBook}
            icon="calendar"
          >
            Buat janji
          </Button>
        </View>
      </View>
    </View>
  );
};

export default ClinicDetailScreen;
