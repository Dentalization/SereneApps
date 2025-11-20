import React, { useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NEARBY_DENTISTS } from '../data/dentists';

const slugify = (value = '') =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const DentistDirectoryScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();

  const groups = useMemo(() => {
    const map = NEARBY_DENTISTS.reduce((acc, dentist) => {
      const id = slugify(dentist.specialty || 'lainnya');
      if (!acc[id]) {
        acc[id] = {
          id,
          label: dentist.specialty || 'Spesialis Lainnya',
          dentists: [],
        };
      }
      acc[id].dentists.push(dentist);
      return acc;
    }, {});

    return Object.values(map)
      .map((group) => {
        const totalRating = group.dentists.reduce((sum, doc) => sum + (doc.rating || 0), 0);
        return {
          ...group,
          count: group.dentists.length,
          avgRating: group.dentists.length ? (totalRating / group.dentists.length).toFixed(1) : '0.0',
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  const colorPresets = [
    ['#C084FC', '#9333EA'],
    ['#60A5FA', '#2563EB'],
    ['#34D399', '#059669'],
    ['#FBBF24', '#F97316'],
    ['#F472B6', '#DB2777'],
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

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
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: 'rgba(255,255,255,0.2)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <MaterialCommunityIcons name="arrow-left" size={20} color="white" />
          </TouchableOpacity>
          <View style={{ flex: 1, paddingHorizontal: 12 }}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Direktori dokter</Text>
            <Text style={{ color: 'white', fontSize: 24, fontWeight: '800', marginTop: 4 }}>
              Pilih spesialis
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.75)', marginTop: 6 }}>
              {NEARBY_DENTISTS.length} dokter tepercaya · {groups.length} spesialisasi
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('AppointmentTab', { screen: 'ClinicSearch' })}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: 'rgba(255,255,255,0.2)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <MaterialCommunityIcons name="calendar-plus" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 16 }}>
            Spesialis tersedia
          </Text>

          {groups.map((group, index) => {
            const colors = colorPresets[index % colorPresets.length];
            return (
              <TouchableOpacity
                key={group.id}
                activeOpacity={0.92}
                onPress={() =>
                  navigation.navigate('DentistSpecialty', {
                    specialtyId: group.id,
                    specialtyLabel: group.label,
                    dentists: group.dentists,
                    avgRating: group.avgRating,
                  })
                }
                style={{ marginBottom: 18 }}
              >
                <LinearGradient
                  colors={colors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    borderRadius: 28,
                    padding: 20,
                    minHeight: 150,
                    shadowColor: colors[1],
                    shadowOffset: { width: 0, height: 16 },
                    shadowOpacity: 0.35,
                    shadowRadius: 20,
                    elevation: 6,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <View
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 24,
                          backgroundColor: 'rgba(255,255,255,0.18)',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: 14,
                        }}
                      >
                        <MaterialCommunityIcons name="tooth" size={24} color="white" />
                      </View>
                      <Text style={{ color: 'white', fontSize: 22, fontWeight: '800' }}>{group.label}</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.85)', marginTop: 6, fontSize: 13 }}>
                        {group.count} dokter · rating rata-rata {group.avgRating}
                      </Text>
                    </View>
                    <View
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 18,
                        backgroundColor: 'rgba(255,255,255,0.15)',
                      }}
                    >
                      <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>Lihat dokter</Text>
                    </View>
                  </View>
                  <View
                    style={{
                      flexDirection: 'row',
                      marginTop: 18,
                      justifyContent: 'space-between',
                    }}
                  >
                    <InfoChip icon="map-marker-distance" label="Radius" value="≤ 5 km" />
                    <InfoChip icon="account-multiple" label="Ketersediaan" value="Slot hari ini" />
                    <InfoChip icon="star" label="Rating" value={`${group.avgRating}/5`} />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const InfoChip = ({ icon, label, value }) => (
  <View
    style={{
      flex: 1,
      marginRight: 8,
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    }}
  >
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <MaterialCommunityIcons name={icon} size={14} color="white" />
      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, marginLeft: 6 }}>{label}</Text>
    </View>
    <Text style={{ color: 'white', fontWeight: '700', marginTop: 4, fontSize: 13 }}>{value}</Text>
  </View>
);

export default DentistDirectoryScreen;
