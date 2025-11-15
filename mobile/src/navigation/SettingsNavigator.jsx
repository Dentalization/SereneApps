import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import SettingsScreen from '../features/settings/screens/SettingsScreen';
import ProfileScreen from '../features/settings/screens/ProfileScreen';
import LoginScreen from '../features/settings/screens/LoginScreen';
import RegisterScreen from '../features/settings/screens/RegisterScreen';
import OTPScreen from '../features/settings/screens/OTPScreen';

const Stack = createStackNavigator();

const SettingsNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        headerStyle: { elevation: 0, shadowOpacity: 0 },
      }}
    >
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Pengaturan' }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profil Saya' }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: 'Masuk' }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: 'Daftar' }}
      />
      <Stack.Screen
        name="OTP"
        component={OTPScreen}
        options={{ title: 'Verifikasi OTP' }}
      />
    </Stack.Navigator>
  );
};

export default SettingsNavigator;
