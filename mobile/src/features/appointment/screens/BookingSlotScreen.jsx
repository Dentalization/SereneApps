import React, { useMemo, useState } from 'react';
import { View, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { Text, Chip, Button, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { DENTISTS, SLOT_AVAILABILITY, getDentistById, getSlotsForDate } from '../data/appointments';
import useAnchoredHeaderHeight from '../../../hooks/useAnchoredHeaderHeight';

const BookingSlotScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const dentistId = route.params?.dentistId || DENTISTS[0].id;
  const dentist = getDentistById(dentistId) || DENTISTS[0];
  const clinicIdForInfo = route.params?.clinicId || dentist?.clinic?.id;

  const dateOptions = useMemo(
    () => SLOT_AVAILABILITY.filter((entry) => entry.dentistId === dentist.id).map((entry) => entry.date),
    [dentist.id]
  );
  const [selectedDate, setSelectedDate] = useState(dateOptions[0]);
  const [slotType, setSlotType] = useState(route.params?.type || 'onsite');
  const [selectedSlot, setSelectedSlot] = useState(null);

  const slots = getSlotsForDate(dentist.id, selectedDate)?.slots || [];
  const filteredSlots = slots.filter((slot) => slot.type === slotType && slot.isAvailable);

  const { headerHeight, handleHeaderLayout } = useAnchoredHeaderHeight(300);

  const groupedSlots = useMemo(() => {
    const buckets = {
      morning: [],
      afternoon: [],
      evening: [],
    };
    filteredSlots.forEach((slot) => {
      const hour = parseInt(slot.time.split(':')[0], 10);
      if (hour < 12) buckets.morning.push(slot);
      else if (hour < 17) buckets.afternoon.push(slot);
      else buckets.evening.push(slot);
    });
    return [
      { key: 'morning', label: 'Sesi pagi', data: buckets.morning },
      { key: 'afternoon', label: 'Sesi siang', data: buckets.afternoon },
      { key: 'evening', label: 'Sesi malam', data: buckets.evening },
    ].filter((group) => group.data.length > 0);
  }, [filteredSlots]);

  const handleContinue = () => {
    if (!selectedSlot) return;
    navigation.navigate('BookingConfirm', {
      dentistId: dentist.id,
      dentist,
      slot: selectedSlot,
      date: selectedDate,
      type: slotType,
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle='light-content' backgroundColor='#7C3AED' />

      <View
        onLayout={handleHeaderLayout}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          elevation: 10,
        }}
      >
        <LinearGradient
          colors={['#7C3AED', '#A855F7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: 52,
            paddingHorizontal: 20,
            paddingBottom: 32,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.12,
            shadowRadius: 16,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
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
              <MaterialCommunityIcons name='arrow-left' size={22} color='white' />
            </TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>Langkah 1/2</Text>
              <Text style={{ color: 'white', fontSize: 18, fontWeight: '700', marginTop: 4 }}>
                Pilih Jadwal
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => clinicIdForInfo && navigation.navigate('ClinicDetail', { clinicId: clinicIdForInfo })}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialCommunityIcons name='share-variant' size={20} color='white' />
            </TouchableOpacity>
          </View>

          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              borderRadius: 24,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                backgroundColor: 'white',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 16,
              }}
            >
              <MaterialCommunityIcons name='account-heart' size={30} color='#6366F1' />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: 'white' }}>{dentist.name}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginTop: 2 }}>
                {dentist.specialty}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                <MaterialCommunityIcons name='map-marker' size={14} color='rgba(255,255,255,0.7)' />
                <Text style={{ color: 'rgba(255,255,255,0.7)', marginLeft: 4 }}>
                  {dentist.clinic.address}
                </Text>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: 'row', marginTop: 16 }}>
            <InfoPill icon='star' label={`Rating ${dentist.rating}`} />
            <InfoPill icon='map-marker-distance' label={dentist.clinic.distance} />
            <InfoPill icon='calendar' label={`${filteredSlots.length} jadwal tersedia`} />
          </View>
        </LinearGradient>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingTop: headerHeight + 16, paddingBottom: 200 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginTop: 8 }}>
          <Text
            style={{
              marginLeft: 20,
              fontSize: 16,
              fontWeight: '700',
              color: '#0F172A',
              marginBottom: 10,
            }}
          >
            Pilih tanggal
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 20 }}>
            {dateOptions.map((date) => (
              <TouchableOpacity
                key={date}
                onPress={() => {
                  setSelectedDate(date);
                  setSelectedSlot(null);
                }}
                style={{
                  marginRight: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 16,
                  backgroundColor: selectedDate === date ? theme.colors.primary : 'white',
                  borderWidth: 1,
                  borderColor: selectedDate === date ? theme.colors.primary : '#E2E8F0',
                }}
              >
                <Text
                  style={{
                    color: selectedDate === date ? 'white' : '#475569',
                    fontWeight: '600',
                  }}
                >
                  {new Date(date).toLocaleDateString('id-ID', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={{ marginTop: 24, paddingHorizontal: 20 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: '#0F172A',
              marginBottom: 12,
            }}
          >
            Tipe sesi
          </Text>
          <View style={{ flexDirection: 'row', marginBottom: 12 }}>
            {[
              { key: 'onsite', label: 'Di klinik' },
              { key: 'virtual', label: 'Online' },
            ].map((item) => (
              <Chip
                key={item.key}
                selected={slotType === item.key}
                onPress={() => {
                  setSlotType(item.key);
                  setSelectedSlot(null);
                }}
                style={{
                  marginRight: 10,
                  backgroundColor:
                    slotType === item.key ? theme.colors.primary : '#E2E8F0',
                }}
                textStyle={{
                  color: slotType === item.key ? 'white' : '#475569',
                  fontWeight: '600',
                }}
              >
                {item.label}
              </Chip>
            ))}
          </View>

          <Text style={{ color: '#94A3B8', marginBottom: 4 }}>Pilih waktu tersedia</Text>
          {groupedSlots.length === 0 ? (
            <Text style={{ color: '#94A3B8' }}>Tidak ada slot untuk tipe ini.</Text>
          ) : (
            groupedSlots.map((group) => (
              <View key={group.key} style={{ marginBottom: 18 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: '#94A3B8',
                    marginBottom: 8,
                  }}
                >
                  {group.label}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {group.data.map((slot) => (
                    <TouchableOpacity
                      key={slot.time}
                      onPress={() => setSelectedSlot(slot)}
                      style={{
                        paddingVertical: 12,
                        paddingHorizontal: 18,
                        borderRadius: 16,
                        marginRight: 10,
                        marginBottom: 10,
                        backgroundColor:
                          selectedSlot?.time === slot.time
                            ? theme.colors.primary
                            : 'white',
                        borderWidth: 1,
                        borderColor:
                          selectedSlot?.time === slot.time
                            ? theme.colors.primary
                            : '#E2E8F0',
                      }}
                    >
                      <Text
                        style={{
                          color:
                            selectedSlot?.time === slot.time ? 'white' : '#0F172A',
                          fontWeight: '600',
                        }}
                      >
                        {slot.time}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

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
          elevation: 10,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}
        >
          <View>
            <Text style={{ color: '#94A3B8', fontSize: 12 }}>Slot terpilih</Text>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: '#0F172A',
              }}
            >
              {selectedSlot
                ? `${selectedSlot.time} · ${slotType === 'virtual' ? 'Online' : 'Di klinik'}`
                : 'Belum dipilih'}
            </Text>
          </View>
          <Button mode='contained' disabled={!selectedSlot} onPress={handleContinue}>
            Lanjutkan
          </Button>
        </View>
      </View>
    </View>
  );
};

export default BookingSlotScreen;

const InfoPill = ({ icon, label }) => (
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.25)',
      marginRight: 10,
    }}
  >
    <MaterialCommunityIcons name={icon} size={16} color='white' />
    <Text style={{ marginLeft: 6, fontWeight: '600', color: 'white' }}>{label}</Text>
  </View>
);
