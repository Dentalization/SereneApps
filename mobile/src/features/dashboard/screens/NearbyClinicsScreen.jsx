import React, { useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, ImageBackground, StatusBar } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NEARBY_CLINICS, formatClinicDistance } from '../data/clinics';

const NearbyClinicsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();

  const radius = route.params?.maxDistanceKm ?? 5;
  const source = route.params?.clinics?.length ? route.params.clinics : NEARBY_CLINICS;

  const clinics = useMemo(
    () =>
      source
        .filter((clinic) => (clinic.distanceKm ?? Number.MAX_SAFE_INTEGER) <= radius)
        .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0)),
    [source, radius]
  );

  const handleClinicPress = (clinic) => navigation.navigate('ClinicDetail', { clinicId: clinic.id });
  const handleBook = (clinic) =>
    navigation.navigate('AppointmentTab', {
      screen: 'ClinicDetail',
      params: { clinicId: clinic.id },
    });

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

      <LinearGradient
        colors={[theme.colors.primary, '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingHorizontal: 20,
          paddingTop: 52,
          paddingBottom: 32,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>Eksplor Klinik</Text>
            <Text style={{ color: 'white', fontSize: 26, fontWeight: '700', marginTop: 6 }}>
              Klinik Terdekat
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', marginTop: 6 }}>
              {clinics.length} klinik dalam radius {radius} km
            </Text>
          </View>
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
            <MaterialCommunityIcons name="close" size={22} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 16, paddingBottom: 160 }}>
        {clinics.map((clinic) => (
          <TouchableOpacity
            key={clinic.id}
            activeOpacity={0.92}
            onPress={() => handleClinicPress(clinic)}
            style={{
              borderRadius: 28,
              overflow: 'hidden',
              marginBottom: 20,
              backgroundColor: 'white',
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: 16 },
              shadowOpacity: 0.1,
              shadowRadius: 20,
              elevation: 6,
            }}
          >
            <ImageBackground
              source={{ uri: clinic.coverImage || clinic.heroImage }}
              style={{ height: 180 }}
              imageStyle={{ resizeMode: 'cover' }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 16,
                }}
              >
                <View
                  style={{
                    backgroundColor: 'rgba(15,23,42,0.45)',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 999,
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>
                    {formatClinicDistance(clinic.distanceKm)}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: 'rgba(15,23,42,0.45)',
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: 12,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: '700' }}>{clinic.rating?.toFixed(1)}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
                    {clinic.reviews} ulasan
                  </Text>
                </View>
              </View>
            </ImageBackground>
            <View style={{ padding: 20 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#0F172A' }}>{clinic.name}</Text>
              <Text style={{ color: '#94A3B8', marginTop: 4 }}>{clinic.address}</Text>
              <View
                style={{
                  flexDirection: 'row',
                  marginTop: 12,
                  flexWrap: 'wrap',
                }}
              >
                {(clinic.highlights || []).slice(0, 3).map((item) => (
                  <View
                    key={item}
                    style={{
                      backgroundColor: clinic.badgeColor || '#EEF2FF',
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 999,
                      marginRight: 8,
                      marginBottom: 8,
                    }}
                  >
                    <Text style={{ color: theme.colors.primary, fontWeight: '600', fontSize: 12 }}>
                      {item}
                    </Text>
                  </View>
                ))}
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 16,
                }}
              >
                <View>
                  <Text style={{ color: '#94A3B8', fontSize: 12 }}>Jam Operasional</Text>
                  <Text style={{ fontWeight: '700', color: '#0F172A' }}>{clinic.openStatus}</Text>
                  <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 4 }}>
                    Estimasi antrian {clinic.queue}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row' }}>
                  <TouchableOpacity
                    onPress={() => handleBook(clinic)}
                    style={{
                      borderRadius: 16,
                      backgroundColor: '#EEF2FF',
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      marginRight: 10,
                    }}
                  >
                    <MaterialCommunityIcons name="calendar-edit" size={18} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleClinicPress(clinic)}
                    style={{
                      borderRadius: 16,
                      backgroundColor: theme.colors.primary,
                      paddingHorizontal: 18,
                      paddingVertical: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <MaterialCommunityIcons name="information-outline" size={18} color="white" />
                    <Text style={{ color: 'white', fontWeight: '700', marginLeft: 8 }}>Detail</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {!clinics.length && (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <MaterialCommunityIcons name="hospital-box-outline" size={58} color="#CBD5F5" />
            <Text style={{ marginTop: 12, fontWeight: '700', color: '#0F172A', fontSize: 16 }}>
              Belum ada klinik di area ini
            </Text>
            <Text style={{ color: '#94A3B8', textAlign: 'center', marginTop: 6 }}>
              Coba perbesar radius pencarian atau ubah lokasi Anda
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default NearbyClinicsScreen;
