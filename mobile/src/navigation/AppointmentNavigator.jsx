import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Screens
import AppointmentListScreen from '../features/appointment/screens/AppointmentListScreen';
import ClinicSearchScreen from '../features/appointment/screens/ClinicSearchScreen';
import ClinicDetailScreen from '../features/appointment/screens/ClinicDetailScreen';
import DentistSearchScreen from '../features/appointment/screens/DentistSearchScreen';
import DentistDetailScreen from '../features/appointment/screens/DentistDetailScreen';
import BookingSlotScreen from '../features/appointment/screens/BookingSlotScreen';
import BookingConfirmScreen from '../features/appointment/screens/BookingConfirmScreen';
import PaymentScreen from '../features/appointment/screens/PaymentScreen';
import BookingSuccessScreen from '../features/appointment/screens/BookingSuccessScreen';
import BookingFailedScreen from '../features/appointment/screens/BookingFailedScreen';
import DetailAppointmentScreen from '../features/appointment/screens/DetailAppointmentScreen';
import PatientTeledentistryScreen from '../features/appointment/screens/PatientTeledentistryScreen';
import ReviewScreen from '../features/appointment/screens/ReviewScreen';

const Stack = createStackNavigator();

const AppointmentNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="AppointmentList"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#F8FAFC' },
      }}
    >
      <Stack.Screen name="AppointmentList" component={AppointmentListScreen} />
      <Stack.Screen name="ClinicSearch" component={ClinicSearchScreen} />
      <Stack.Screen name="DentistSearch" component={DentistSearchScreen} />
      <Stack.Screen name="ClinicDetail" component={ClinicDetailScreen} />
      <Stack.Screen name="DentistDetail" component={DentistDetailScreen} />
      <Stack.Screen name="BookingSlot" component={BookingSlotScreen} />
      <Stack.Screen name="BookingConfirm" component={BookingConfirmScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="BookingSuccess" component={BookingSuccessScreen} />
      <Stack.Screen name="BookingFailed" component={BookingFailedScreen} />
      <Stack.Screen name="DetailAppointment" component={DetailAppointmentScreen} />
      <Stack.Screen name="PatientTeledentistry" component={PatientTeledentistryScreen} />
      <Stack.Screen name="Review" component={ReviewScreen} />
    </Stack.Navigator>
  );
};

export default AppointmentNavigator;
