import React, { useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, Image, StatusBar } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { NEARBY_DENTISTS } from '../data/dentists';

const formatRupiah = (value = 0) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
const formatDistance = (km) => `${Number(km || 0).toFixed(1)} km`;

const NearbyDentistsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();

  const radius = route.params?.maxDistanceKm ?? 5;
  const source = route.params?.dentists?.length ? route.params.dentists : NEARBY_DENTISTS;

  const dentists = useMemo(
    () =>
      source
        .filter((d) => (d.distanceKm ?? Number.MAX_SAFE_INTEGER) <= radius)
        .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0)),
    [source, radius]
  );

  useFocusEffect(
    React.useCallback(() => {
      const parent = navigation.getParent?.();
      parent?.setOptions({ tabBarStyle: { display: 'none' } });
      return () => parent?.setOptions({ tabBarStyle: undefined });
    }, [navigation])
  );

  const handleDoctorPress = (dentist) =>
    navigation.navigate('DentistDetail', { dentistId: dentist.id, dentist });
  const handleBook = (dentist) =>
    navigation.navigate('AppointmentTab', { screen: 'BookingSlot', params: { dentistId: dentist.id } });
  const handleMessage = (dentist) =>
    navigation.navigate('AppointmentTab', { screen: 'BookingSlot', params: { dentistId: dentist.id } });

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
      <View
        style={{
          backgroundColor: theme.colors.primary,
          paddingTop: 48,
          paddingBottom: 24,
          paddingHorizontal: 20,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
          >
            <MaterialCommunityIcons name='arrow-left' size={22} color='white' />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: 'white', fontSize: 22, fontWeight: '700' }}>Dentists nearby</Text>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>
              Showing specialists within {radius} km radius
            </Text>
          </View>
          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.18)',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 16,
            }}
          >
            <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>{dentists.length} doctors</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {dentists.map((dentist) => (
          <TouchableOpacity
            key={dentist.id}
            activeOpacity={0.92}
            onPress={() => handleDoctorPress(dentist)}
            style={{
              backgroundColor: 'white',
              borderRadius: 24,
              padding: 20,
              marginBottom: 18,
              shadowColor: '#4C1D95',
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.08,
              shadowRadius: 20,
              elevation: 6,
              borderWidth: 1,
              borderColor: 'rgba(76,29,149,0.08)',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image source={{ uri: dentist.image }} style={{ width: 88, height: 88, borderRadius: 20 }} />
              <View style={{ flex: 1, marginLeft: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A', flex: 1, marginRight: 12 }}>
                    {dentist.name}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialCommunityIcons name='map-marker-distance' size={16} color='#6366F1' />
                    <Text style={{ marginLeft: 4, color: '#6366F1', fontWeight: '600' }}>
                      {formatDistance(dentist.distanceKm || 0)}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.primary }}>{dentist.specialty}</Text>
                <Text style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>{dentist.clinic}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                  <MaterialCommunityIcons name='star' size={16} color='#FBBF24' />
                  <Text style={{ marginLeft: 6, color: '#475569', fontWeight: '600' }}>
                    {dentist.rating} · {dentist.reviews} reviews
                  </Text>
                </View>
              </View>
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 18,
                borderTopWidth: 1,
                borderTopColor: '#EEF2FF',
                paddingTop: 16,
              }}
            >
              <View>
                <Text style={{ fontSize: 12, color: '#94A3B8' }}>Consultation starts from</Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#0F172A', marginTop: 4 }}>
                  {formatRupiah(dentist.price)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity
                  onPress={() => handleMessage(dentist)}
                  style={{
                    backgroundColor: '#F3F4F6',
                    borderRadius: 18,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    marginRight: 10,
                  }}
                >
                  <MaterialCommunityIcons name='message-text' size={18} color={theme.colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleBook(dentist)}
                  style={{
                    borderRadius: 18,
                    paddingHorizontal: 24,
                    paddingVertical: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: theme.colors.primary,
                    shadowColor: theme.colors.primary,
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.3,
                    shadowRadius: 12,
                    elevation: 5,
                  }}
                >
                  <MaterialCommunityIcons name='calendar-check' size={18} color='white' />
                  <Text style={{ color: 'white', fontWeight: '700', marginLeft: 8 }}>Book</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        ))}
        {!dentists.length && (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <MaterialCommunityIcons name='map-marker-off' size={52} color='#CBD5F5' />
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', marginTop: 12 }}>No dentists nearby</Text>
            <Text style={{ color: '#475569', marginTop: 4, textAlign: 'center' }}>
              We could not find specialists within {radius} km. Try expanding your search radius soon.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default NearbyDentistsScreen;
