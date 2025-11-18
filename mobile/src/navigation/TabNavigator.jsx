import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { BlurView } from 'expo-blur';

import DashboardNavigator from './DashboardNavigator';
import AppointmentNavigator from './AppointmentNavigator';
import AINavigator from './AINavigator';
import ShopNavigator from './ShopNavigator';
import SettingsNavigator from './SettingsNavigator';

const Tab = createBottomTabNavigator();

const HIDDEN_TAB_ROUTES = new Set([
  'ClinicSearch',
  'ClinicDetail',
  'ClinicDetailScreen',
  'DentistDetail',
  'DentistDetailScreen',
  'BookingSlot',
  'BookingSlotScreen',
  'BookingConfirm',
  'BookingConfirmScreen',
  'ArticleList',
  'Notifications',
  'NotificationAppointmentDetail',
  'NotificationPaymentDetail',
  'NotificationShopDetail',
  'NotificationAIDetail',
  'NotificationSystemDetail',
  'NearbyDentists',
  'ProductDetail',
  'Cart',
  'Checkout',
  'HelpCenter',
  'HelpCenterScreen',
  'FAQCategories',
  'FAQCategoriesScreen',
  'FAQCategory',
  'FAQCategoryScreen',
  'Profile',
  'ProfileScreen',
  'Login',
  'LoginScreen',
  'Register',
  'RegisterScreen',
  'OTP',
  'OTPScreen',
  'PrivacyPolicy',
  'PrivacyPolicyScreen',
  'Terms',
  'TermsScreen',
  'DataManagement',
  'DataManagementScreen',
  'ContactSupport',
  'ContactSupportScreen',
  'Camera',
  'ImagePreview',
  'Analysis',
  'Result',
  'History',
]);

const TabNavigator = () => {
  const theme = useTheme();
  const isDark = theme.dark;

  const cartItems = useSelector((state) => state.cart?.items || []);

  // Liquid glass effect - white frosted glass
  const baseTabBarStyle = {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: Platform.OS === 'ios' ? 24 : 16,
    backgroundColor: 'transparent',
    borderRadius: 32,
    height: Platform.OS === 'ios' ? 80 : 70,
    paddingBottom: Platform.OS === 'ios' ? 20 : 12,
    paddingTop: 10,
    paddingHorizontal: 24,
    borderTopWidth: 0,
    elevation: 0,
    overflow: 'hidden',
  };

  const getTabBarStyle = (route, defaultRouteName) => {
    const routeName = getFocusedRouteNameFromRoute(route) ?? defaultRouteName;
    if (HIDDEN_TAB_ROUTES.has(routeName)) {
      return { display: 'none' };
    }
    return { ...baseTabBarStyle };
  };

  // Custom tab bar background with BlurView
  const tabBarBackground = () => (
    <BlurView
      intensity={Platform.OS === 'ios' ? 80 : 100}
      tint="light"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 32,
        backgroundColor: Platform.OS === 'ios' 
          ? 'rgba(255, 255, 255, 0.7)' 
          : 'rgba(255, 255, 255, 0.95)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 25,
      }}
    />
  );

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: '#64748B',
        tabBarShowLabel: true,
        tabBarStyle: baseTabBarStyle,
        tabBarBackground: tabBarBackground,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardNavigator}
        options={({ route }) => ({
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons
                name={focused ? 'home' : 'home-outline'}
                size={24}
                color={color}
              />
            </View>
          ),
          tabBarStyle: getTabBarStyle(route, 'Dashboard'),
        })}
      />

      <Tab.Screen
        name="AppointmentTab"
        component={AppointmentNavigator}
        options={({ route }) => ({
          tabBarLabel: 'My Appointments',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons
                name={focused ? 'calendar-check' : 'calendar-check-outline'}
                size={24}
                color={color}
              />
            </View>
          ),
          tabBarStyle: getTabBarStyle(route, 'AppointmentList'),
        })}
      />

      <Tab.Screen
        name="AITab"
        component={AINavigator}
        options={({ route }) => ({
          tabBarLabel: 'AI Scan',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons
                name={focused ? 'camera' : 'camera-outline'}
                size={24}
                color={color}
              />
            </View>
          ),
          tabBarStyle: getTabBarStyle(route, 'AIHome'),
        })}
      />

      <Tab.Screen
        name="ShopTab"
        component={ShopNavigator}
        options={({ route }) => ({
          tabBarLabel: 'Shop',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons
                name={focused ? 'cart' : 'cart-outline'}
                size={24}
                color={color}
              />
              {cartItems.length > 0 && (
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: theme.colors.error || '#FF3B30' },
                  ]}
                >
                  <View style={styles.badgeDot} />
                </View>
              )}
            </View>
          ),
          tabBarStyle: getTabBarStyle(route, 'ShopHome'),
        })}
      />

      <Tab.Screen
        name="SettingsTab"
        component={SettingsNavigator}
        options={({ route }) => ({
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons
                name={focused ? 'account' : 'account-outline'}
                size={24}
                color={color}
              />
            </View>
          ),
          tabBarStyle: getTabBarStyle(route, 'Settings'),
        })}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -6,
    borderRadius: 6,
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF',
  },
});

export default TabNavigator;
