import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import DashboardScreen from '../features/dashboard/screens/DashboardScreen';
import ArticleListScreen from '../features/dashboard/screens/ArticleListScreen';
import NotificationScreen from '../features/dashboard/screens/NotificationScreen';
import NotificationAppointmentDetailScreen from '../features/dashboard/screens/notification/NotificationAppointmentDetailScreen';
import NotificationPaymentDetailScreen from '../features/dashboard/screens/notification/NotificationPaymentDetailScreen';
import NotificationShopDetailScreen from '../features/dashboard/screens/notification/NotificationShopDetailScreen';
import NotificationAIDetailScreen from '../features/dashboard/screens/notification/NotificationAIDetailScreen';
import NotificationSystemDetailScreen from '../features/dashboard/screens/notification/NotificationSystemDetailScreen';
import NearbyDentistsScreen from '../features/dashboard/screens/NearbyDentistsScreen';
import NearbyClinicsScreen from '../features/dashboard/screens/NearbyClinicsScreen';
import ClinicDetailScreen from '../features/dashboard/screens/ClinicDetailScreen';
import DentistDetailScreen from '../features/dashboard/screens/DentistDetailScreen';

const Stack = createStackNavigator();

const DashboardNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="ArticleList" component={ArticleListScreen} />
      <Stack.Screen name="Notifications" component={NotificationScreen} />
      <Stack.Screen name="NotificationAppointmentDetail" component={NotificationAppointmentDetailScreen} />
      <Stack.Screen name="NotificationPaymentDetail" component={NotificationPaymentDetailScreen} />
      <Stack.Screen name="NotificationShopDetail" component={NotificationShopDetailScreen} />
      <Stack.Screen name="NotificationAIDetail" component={NotificationAIDetailScreen} />
      <Stack.Screen name="NotificationSystemDetail" component={NotificationSystemDetailScreen} />
      <Stack.Screen name="NearbyDentists" component={NearbyDentistsScreen} />
      <Stack.Screen name="NearbyClinics" component={NearbyClinicsScreen} />
      <Stack.Screen name="ClinicDetail" component={ClinicDetailScreen} />
      <Stack.Screen name="DentistDetail" component={DentistDetailScreen} />
    </Stack.Navigator>
  );
};

export default DashboardNavigator;
