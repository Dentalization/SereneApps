import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Pastikan file-file ini ada dan menggunakan 'export default'
import DashboardNavigator from './DashboardNavigator';
import AppointmentNavigator from './AppointmentNavigator';
import AINavigator from './AINavigator';
import ShopNavigator from './ShopNavigator';
import SettingsNavigator from './SettingsNavigator';

const Tab = createBottomTabNavigator();

// List route yang tabbar-nya disembunyikan
const HIDDEN_TAB_ROUTES = new Set([
  'ClinicSearch', 'ClinicDetail', 'ClinicDetailScreen', 'DentistDetail',
  'DentistDetailScreen', 'BookingSlot', 'BookingSlotScreen', 'BookingConfirm',
  'BookingConfirmScreen', 'Payment', 'PaymentScreen', 'BookingSuccess',
  'BookingSuccessScreen', 'BookingFailed', 'BookingFailedScreen', 'DetailAppointment',
  'DetailAppointmentScreen', 'ArticleList', 'Notifications', 'NotificationAppointmentDetail',
  'NotificationPaymentDetail', 'NotificationShopDetail', 'NotificationAIDetail',
  'NotificationSystemDetail', 'NearbyDentists', 'NearbyClinics', 'DentistDirectory',
  'DentistSpecialty', 'ProductDetail', 'Cart', 'Checkout', 'HelpCenter',
  'HelpCenterScreen', 'FAQCategories', 'FAQCategoriesScreen', 'FAQCategory',
  'FAQCategoryScreen', 'Profile', 'ProfileScreen', 'EditProfile', 'EditProfileScreen',
  'Login', 'LoginScreen', 'Register', 'RegisterScreen', 'OTP', 'OTPScreen',
  'PrivacyPolicy', 'PrivacyPolicyScreen', 'Terms', 'TermsScreen', 'DataManagement',
  'DataManagementScreen', 'ContactSupport', 'ContactSupportScreen', 'Camera',
  'ImagePreview', 'Analysis', 'ServerUnavailable', 'Result', 'History', 'Chat',
  'Search', 'SearchScreen',
]);

const TabNavigator = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  // Safe access redux: tambahkan (state.cart || {}) untuk mencegah error null
  const cartItems = useSelector((state) => (state.cart && state.cart.items) ? state.cart.items : []);

  const bottomPosition = Platform.OS === 'ios' 
    ? 20 
    : (insets.bottom > 0 ? insets.bottom : 10);

  const baseTabBarStyle = {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: bottomPosition,
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

  const tabBarBackground = () => (
    <BlurView
      intensity={Platform.OS === 'ios' ? 80 : 50} // Android blur kadang berat, diturunkan dikit
      tint="light"
      style={StyleSheet.absoluteFill} // Gunakan absoluteFill agar pas
    >
        {/* Hack untuk Android agar blur terlihat lebih putih/glassy */}
        <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.8)' }} />
    </BlurView>
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
              <MaterialCommunityIcons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
            </View>
          ),
          tabBarStyle: getTabBarStyle(route, 'Dashboard'),
        })}
      />

      <Tab.Screen
        name="AppointmentTab"
        component={AppointmentNavigator}
        options={({ route }) => ({
          tabBarLabel: 'Appointments',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name={focused ? 'calendar-check' : 'calendar-check-outline'} size={24} color={color} />
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
              <MaterialCommunityIcons name={focused ? 'camera' : 'camera-outline'} size={24} color={color} />
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
              <MaterialCommunityIcons name={focused ? 'cart' : 'cart-outline'} size={24} color={color} />
              {cartItems.length > 0 && (
                <View style={[styles.badge, { backgroundColor: theme.colors.error || '#FF3B30' }]}>
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
              <MaterialCommunityIcons name={focused ? 'account' : 'account-outline'} size={24} color={color} />
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