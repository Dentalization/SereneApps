import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import SettingsScreen from '../features/settings/screens/SettingsScreen';
import ProfileScreen from '../features/settings/screens/ProfileScreen';
import EditProfileScreen from '../features/settings/screens/EditProfileScreen';
import LoginScreen from '../features/settings/screens/LoginScreen';
import RegisterScreen from '../features/settings/screens/RegisterScreen';
import OTPScreen from '../features/settings/screens/OTPScreen';
import PrivacyPolicyScreen from '../features/settings/screens/PrivacyPolicyScreen';
import TermsScreen from '../features/settings/screens/TermsScreen';
import DataManagementScreen from '../features/settings/screens/DataManagementScreen';
import HelpCenterScreen from '../features/settings/screens/HelpCenterScreen';
import ContactSupportScreen from '../features/settings/screens/ContactSupportScreen';
import FAQCategoriesScreen from '../features/settings/screens/FAQCategoriesScreen';
import FAQCategoryScreen from '../features/settings/screens/FAQCategoryScreen';

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
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: 'Edit Profil' }}
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
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{ title: 'Kebijakan Privasi' }}
      />
      <Stack.Screen
        name="Terms"
        component={TermsScreen}
        options={{ title: 'Syarat & Ketentuan' }}
      />
      <Stack.Screen
        name="DataManagement"
        component={DataManagementScreen}
        options={{ title: 'Kelola Data' }}
      />
      <Stack.Screen
        name="HelpCenter"
        component={HelpCenterScreen}
        options={{ title: 'Pusat Bantuan' }}
      />
      <Stack.Screen
        name="FAQCategories"
        component={FAQCategoriesScreen}
        options={{ title: 'Semua Kategori FAQ' }}
      />
      <Stack.Screen
        name="FAQCategory"
        component={FAQCategoryScreen}
        options={{ title: 'Detail Kategori FAQ' }}
      />
      <Stack.Screen
        name="ContactSupport"
        component={ContactSupportScreen}
        options={{ title: 'Hubungi Care' }}
      />
    </Stack.Navigator>
  );
};

export default SettingsNavigator;
