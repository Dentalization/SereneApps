import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AppointmentListScreen from '../features/appointment/screens/AppointmentListScreen';
import ClinicSearchScreen from '../features/appointment/screens/ClinicSearchScreen';
import ClinicDetailScreen from '../features/appointment/screens/ClinicDetailScreen';
import DentistDetailScreen from '../features/appointment/screens/DentistDetailScreen';
import BookingSlotScreen from '../features/appointment/screens/BookingSlotScreen';
import BookingConfirmScreen from '../features/appointment/screens/BookingConfirmScreen';

const Stack = createStackNavigator();

const AppointmentNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        headerStyle: { elevation: 0, shadowOpacity: 0 },
      }}
    >
      <Stack.Screen
        name="AppointmentList"
        component={AppointmentListScreen}
        options={{ title: 'Janji Temu' }}
      />
      <Stack.Screen
        name="ClinicSearch"
        component={ClinicSearchScreen}
        options={{ title: 'Cari Klinik' }}
      />
      <Stack.Screen
        name="ClinicDetail"
        component={ClinicDetailScreen}
        options={{ title: 'Detail Klinik' }}
      />
      <Stack.Screen
        name="DentistDetail"
        component={DentistDetailScreen}
        options={{ title: 'Detail Dokter' }}
      />
      <Stack.Screen
        name="BookingSlot"
        component={BookingSlotScreen}
        options={{ title: 'Pilih Jadwal' }}
      />
      <Stack.Screen
        name="BookingConfirm"
        component={BookingConfirmScreen}
        options={{ title: 'Konfirmasi Booking' }}
      />
    </Stack.Navigator>
  );
};

export default AppointmentNavigator;
