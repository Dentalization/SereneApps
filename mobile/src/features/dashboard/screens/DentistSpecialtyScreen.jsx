import React, { useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, Image, StatusBar } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NEARBY_DENTISTS } from '../data/dentists';

const slugify = (value = '') =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const DentistSpecialtyScreen = () => {
  const theme = useTheme();
  const route = useRoute();
  const navigation = useNavigation();

  const specialtyId = route.params?.specialtyId;
  const specialtyLabel = route.params?.specialtyLabel || 'Spesialis';
  const initialDentists = route.params?.dentists;
  const avgRating = route.params?.avgRating;

  const dentists = useMemo(() => {
    if (initialDentists?.length) return initialDentists;
    if (!specialtyId) return [];
    return NEARBY_DENTISTS.filter(
      (dentist) => slugify(dentist.specialty || 'lainnya') === specialtyId
    );
  }, [initialDentists, specialtyId]);

  const computedRating =
    avgRating ||
    (dentists.length
      ? (dentists.reduce((sum, doc) => sum + (doc.rating || 0), 0) / dentists.length).toFixed(1)
      : '0.0');

  const handleBook = (dentist) => {
    navigation.navigate('AppointmentTab', {
      screen: 'BookingSlot',
      params: { dentistId: dentist.id },
    });
  };

  const handleProfile = (dentist) => {
    navigation.navigate('DentistDetail', { dentistId: dentist.id, dentist });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

      <LinearGradient
        colors={[theme.colors.primary, '#9333EA']}
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
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
          </TouchableOpacity>
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Daftar dokter</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('AppointmentTab', { screen: 'ClinicSearch' })}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialCommunityIcons name="magnify" size={20} color="white" />
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 24 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
            <View
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
              <MaterialCommunityIcons name="tooth" size={22} color="white" />
            </View>
            <View>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Spesialis</Text>
              <Text style={{ color: 'white', fontSize: 24, fontWeight: '800' }}>{specialtyLabel}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', marginTop: 12 }}>
            <HeroChip label="Jumlah dokter" value={`${dentists.length} dokter`} />
            <HeroChip label="Rating rata-rata" value={`${computedRating}/5`} />
            <HeroChip label="Slot terdekat" value="Hari ini" />
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
      >
        {dentists.map((dentist) => (
          <View
            key={dentist.id}
            style={{
              backgroundColor: 'white',
              borderRadius: 24,
              padding: 18,
              marginBottom: 16,
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.08,
              shadowRadius: 18,
              elevation: 4,
              borderWidth: 1,
              borderColor: '#E2E8F0',
            }}
          >
            <View style={{ flexDirection: 'row' }}>
              <Image
                source={{ uri: dentist.image }}
                style={{ width: 80, height: 80, borderRadius: 22, marginRight: 16 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', fontSize: 17, color: '#0F172A' }}>{dentist.name}</Text>
                <Text style={{ color: theme.colors.primary, fontWeight: '600', marginTop: 4 }}>
                  {dentist.specialty}
                </Text>
                <Text style={{ color: '#94A3B8', marginTop: 2 }}>{dentist.clinic}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                  <MaterialCommunityIcons name="star" size={16} color="#FACC15" />
                  <Text style={{ marginLeft: 6, color: '#475569', fontWeight: '600' }}>
                    {dentist.rating} · {dentist.reviews} ulasan
                  </Text>
                </View>
              </View>
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 16,
                borderTopWidth: 1,
                borderTopColor: '#F1F5F9',
                paddingTop: 12,
              }}
            >
              <View>
                <Text style={{ color: '#94A3B8', fontSize: 12 }}>Mulai dari</Text>
                <Text style={{ fontWeight: '700', color: '#0F172A', marginTop: 2 }}>
                  Rp {Number(dentist.price).toLocaleString('id-ID')}
                </Text>
              </View>
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity
                  onPress={() => handleProfile(dentist)}
                  style={{
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    marginRight: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <MaterialCommunityIcons name="account-details" size={16} color="#475569" />
                  <Text style={{ marginLeft: 6, color: '#475569', fontWeight: '600' }}>Profil</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleBook(dentist)}
                  style={{
                    borderRadius: 18,
                    paddingHorizontal: 18,
                    paddingVertical: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: theme.colors.primary,
                  }}
                >
                  <MaterialCommunityIcons name="calendar-check" size={16} color="white" />
                  <Text style={{ marginLeft: 6, color: 'white', fontWeight: '700' }}>Buat Janji</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}

        {!dentists.length && (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <MaterialCommunityIcons name="emoticon-sad-outline" size={48} color="#CBD5F5" />
            <Text style={{ fontWeight: '700', color: '#0F172A', fontSize: 16, marginTop: 12 }}>
              Belum ada dokter pada kategori ini
            </Text>
            <Text style={{ color: '#94A3B8', marginTop: 6, textAlign: 'center' }}>
              Kami akan menambahkan spesialis baru segera. Silakan kembali lagi nanti.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const HeroChip = ({ label, value }) => (
  <View
    style={{
      flex: 1,
      marginRight: 10,
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
    }}
  >
    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>{label}</Text>
    <Text style={{ color: 'white', fontWeight: '700', marginTop: 4 }}>{value}</Text>
  </View>
);

export default DentistSpecialtyScreen;
