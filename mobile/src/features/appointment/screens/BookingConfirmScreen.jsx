import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { Text, Button, Chip, TextInput, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { formatCurrency } from '../../../utils/formatters';
import useAnchoredHeaderHeight from '../../../hooks/useAnchoredHeaderHeight';
import { getAppointmentById, getDentistById, REMINDER_MINUTES } from '../data/appointments';

const BookingConfirmScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();

  const appointmentFromList = route.params?.appointmentId ? getAppointmentById(route.params.appointmentId) : null;
  const dentist = route.params?.dentist || appointmentFromList?.dentist || getDentistById('dentist-001');
  const selectedDate = route.params?.date || appointmentFromList?.startsAt;
  const type = route.params?.type || appointmentFromList?.type || 'onsite';
  const slot = route.params?.slot || appointmentFromList?.slot;
  const slotTime = slot?.time || new Date(selectedDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const fee = slot?.raw?.fee || appointmentFromList?.billing?.fee || dentist?.consultationFee || 350000;

  const [notes, setNotes] = useState('');
  const [reminder, setReminder] = useState(30);
  const [payment, setPayment] = useState('card');

  const summaryDate = new Date(selectedDate);
  const dateLabel = summaryDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });

  const handleConfirm = () => {
    navigation.navigate('AppointmentList');
  };

  const { headerHeight, handleHeaderLayout } = useAnchoredHeaderHeight(240);

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle='light-content' backgroundColor='#7C3AED' />

      <View
        onLayout={handleHeaderLayout}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, elevation: 10 }}
      >
        <LinearGradient
          colors={['#7C3AED', '#A855F7']}
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
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Langkah 2/2</Text>
              <Text style={{ color: 'white', fontSize: 18, fontWeight: '700', marginTop: 4 }}>Konfirmasi jadwal</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                if (dentist?.clinic?.id) {
                  navigation.navigate('ClinicDetail', { clinicId: dentist.clinic.id });
                }
              }}
              style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}
            >
              <MaterialCommunityIcons name='information-outline' size={22} color='white' />
            </TouchableOpacity>
          </View>
          <View style={{ marginTop: 20 }}>
            <Text style={{ color: 'rgba(255,255,255,0.8)' }}>Periksa kembali detail pemesanan sebelum konfirmasi.</Text>
            <View style={{ marginTop: 20 }}>
              <ProgressIndicator current={2} />
            </View>
          </View>
        </LinearGradient>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingTop: headerHeight + 16, paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
          <Text style={{ fontSize: 24, fontWeight: '700', color: '#0F172A' }}>Konfirmasi janji</Text>
          <Text style={{ color: '#94A3B8', marginBottom: 20 }}>
            Periksa kembali detail sebelum kamu menyelesaikan pemesanan.
          </Text>

          <SummaryCard
            dentist={dentist}
            type={type}
            dateLabel={dateLabel}
            timeLabel={slotTime}
            clinic={dentist?.clinic}
          />

          <Section title='Catatan untuk dokter'>
            <TextInput
              mode='outlined'
              placeholder='Tambahkan detail keluhan, alergi, dll'
              value={notes}
              onChangeText={setNotes}
              multiline
            />
          </Section>

          <Section title='Pengingat'>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {REMINDER_MINUTES.map((value) => (
                <Chip
                  key={value}
                  selected={reminder === value}
                  onPress={() => setReminder(value)}
                  style={{ marginRight: 8, marginBottom: 8, backgroundColor: reminder === value ? theme.colors.primary : '#E2E8F0' }}
                  textStyle={{ color: reminder === value ? 'white' : '#475569' }}
                >
                  {value} menit sebelumnya
                </Chip>
              ))}
            </View>
          </Section>

          <Section title='Metode pembayaran'>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {[
                { key: 'card', label: 'Kartu' },
                { key: 'va', label: 'Virtual Account (VA)' },
                { key: 'cash', label: 'Bayar di klinik' },
              ].map((option) => (
                <Chip
                  key={option.key}
                  selected={payment === option.key}
                  onPress={() => setPayment(option.key)}
                  style={{ marginRight: 8, marginBottom: 8, backgroundColor: payment === option.key ? theme.colors.primary : '#E2E8F0' }}
                  textStyle={{ color: payment === option.key ? 'white' : '#475569' }}
                >
                  {option.label}
                </Chip>
              ))}
            </View>
          </Section>

          <Section title='Ringkasan biaya'>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: '#475569' }}>Biaya konsultasi</Text>
              <Text style={{ fontWeight: '600', color: '#0F172A' }}>{formatCurrency(fee)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: '#475569' }}>Total dibayar</Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#0F172A' }}>{formatCurrency(fee)}</Text>
            </View>
          </Section>
        </View>
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 20, backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#0F172A', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 10 }}>
        <Button mode='contained' icon='check' onPress={handleConfirm}>
          Konfirmasi Janji Temu
        </Button>
      </View>
    </View>
  );
};

const ProgressIndicator = ({ current }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
    {['Pilih slot', 'Konfirmasi', 'Selesai'].map((label, index) => {
      const step = index + 1;
      const active = step <= current;
      return (
        <View key={label} style={{ alignItems: 'center', flex: 1 }}>
          <LinearGradient
            colors={active ? ['#FDE68A', '#FBBF24'] : ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: active ? '#78350F' : '#E5E7EB', fontWeight: '700' }}>{step}</Text>
          </LinearGradient>
          <Text style={{ marginTop: 6, fontSize: 12, color: active ? 'white' : 'rgba(255,255,255,0.7)' }}>{label}</Text>
        </View>
      );
    })}
  </View>
);

const SummaryCard = ({ dentist, clinic, type, dateLabel, timeLabel }) => (
  <LinearGradient
    colors={['#EEF2FF', '#FFFFFF']}
    style={{ borderRadius: 24, padding: 18, marginBottom: 22, shadowColor: '#4C1D95', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 4 }}
  >
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
      <View>
        <Text style={{ fontWeight: '700', color: '#0F172A' }}>{dateLabel}</Text>
        <Text style={{ color: '#5F6B7C' }}>{timeLabel} WIB</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ color: '#94A3B8' }}>{type === 'virtual' ? 'Virtual visit' : 'Tatap muka'}</Text>
        <Text style={{ marginTop: 4, fontWeight: '700', color: '#0F172A' }}>{clinic?.name}</Text>
      </View>
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: 52, height: 52, borderRadius: 20, backgroundColor: 'rgba(124,58,237,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
        <MaterialCommunityIcons name='account-heart' size={26} color='#7C3AED' />
      </View>
      <View>
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>{dentist?.name}</Text>
        <Text style={{ color: '#5F6B7C' }}>{dentist?.specialty}</Text>
      </View>
    </View>
  </LinearGradient>
);

const Section = ({ title, children }) => (
  <View style={{ marginBottom: 24 }}>
    <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 12 }}>{title}</Text>
    {children}
  </View>
);

export default BookingConfirmScreen;
