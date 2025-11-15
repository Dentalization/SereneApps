import React, { useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, Image, StatusBar } from 'react-native';
import { Text, useTheme, Chip } from 'react-native-paper';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getDentistDetail } from '../data/dentistDetails';

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

const DentistDetailScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();

  const fallbackDetail = useMemo(
    () => getDentistDetail(route.params?.dentistId || route.params?.dentist?.id),
    [route.params?.dentistId, route.params?.dentist?.id]
  );

  const dentist = useMemo(
    () => ({
      ...fallbackDetail,
      ...(route.params?.dentist || {}),
    }),
    [fallbackDetail, route.params?.dentist]
  );

  const distanceText =
    dentist.distance ??
    (typeof dentist.distanceKm === 'number' ? `${dentist.distanceKm.toFixed(1)} km` : null);

  useFocusEffect(
    React.useCallback(() => {
      const parent = navigation.getParent?.();
      parent?.setOptions({ tabBarStyle: { display: 'none' } });
      return () => parent?.setOptions({ tabBarStyle: undefined });
    }, [navigation])
  );

  const handleBook = () =>
    navigation.navigate('AppointmentTab', {
      screen: 'BookingSlot',
      params: { dentistId: dentist.id },
    });

  const handleMessage = () =>
    navigation.navigate('AppointmentTab', {
      screen: 'BookingSlot',
      params: { dentistId: dentist.id },
    });

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
      <ScrollView contentContainerStyle={{ paddingBottom: 200 }}>
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
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              <MaterialCommunityIcons name='arrow-left' size={22} color='white' />
            </TouchableOpacity>
            <Text style={{ color: 'white', fontSize: 22, fontWeight: '700' }}>Dentist Profile</Text>
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
                  {dentist.rating?.toFixed(1)} · {dentist.reviews} reviews
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
              <Text style={{ marginLeft: 8, fontWeight: '700', color: theme.colors.primary }}>Book</Text>
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
              <MaterialCommunityIcons name='message-text' size={22} color='white' />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
            {[
              statCard('Experience', dentist.experience || '—', 'medal-outline'),
              statCard('Patients helped', dentist.patientsHelped || '1,200+', 'account-group'),
              statCard('Response time', dentist.responseTime || '<2h', 'clock-fast'),
            ]}
          </ScrollView>

          {/* Tambah marginTop di Section About supaya jaraknya sama seperti About -> Specialties */}
          <Section title='About' style={{ marginTop: 24 }}>
            <Text style={{ fontSize: 14, color: '#475569', lineHeight: 22 }}>{dentist.bio}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 14 }}>
              {dentist.languages?.map((lang) => (
                <Chip key={lang} style={{ marginRight: 8, marginBottom: 8 }} textStyle={{ fontWeight: '600' }}>
                  {lang}
                </Chip>
              ))}
            </View>
          </Section>

          <Section title='Specialties'>
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

          <Section title='Services'>
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

          <Section title='Availability'>
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

          <Section title='Achievements'>
            {dentist.achievements?.map((ach) => (
              <View key={ach.title} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <MaterialCommunityIcons name='trophy' size={18} color='#FACC15' />
                <Text style={{ marginLeft: 10, fontWeight: '600', color: '#0F172A' }}>{ach.title}</Text>
                <Text style={{ marginLeft: 6, color: '#94A3B8' }}>{ach.year}</Text>
              </View>
            ))}
          </Section>

          <Section title='Patient Stories'>
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

          <Section title='Gallery'>
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

          <Section title='Contact'>
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
            <Text style={{ color: '#94A3B8', fontSize: 12 }}>Consultation starts from</Text>
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
            <Text style={{ color: 'white', fontWeight: '700', marginLeft: 8 }}>Book Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default DentistDetailScreen;
