import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import DashboardScreen from '../features/dashboard/screens/DashboardScreen';
import ArticleListScreen from '../features/dashboard/screens/ArticleListScreen';
import NotificationScreen from '../features/dashboard/screens/NotificationScreen';
import NearbyDentistsScreen from '../features/dashboard/screens/NearbyDentistsScreen';
import DentistDetailScreen from '../features/dashboard/screens/DentistDetailScreen';

const Stack = createStackNavigator();

const DashboardNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="ArticleList" component={ArticleListScreen} />
      <Stack.Screen name="Notifications" component={NotificationScreen} />
      <Stack.Screen name="NearbyDentists" component={NearbyDentistsScreen} />
      <Stack.Screen name="DentistDetail" component={DentistDetailScreen} />
    </Stack.Navigator>
  );
};

export default DashboardNavigator;
