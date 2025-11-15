import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { useSelector } from 'react-redux';

import DashboardNavigator from './DashboardNavigator';
import AppointmentNavigator from './AppointmentNavigator';
import AINavigator from './AINavigator';
import ShopNavigator from './ShopNavigator';
import SettingsNavigator from './SettingsNavigator';

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const theme = useTheme();
  const isDark = theme.dark;

  // Warna yang mengikuti Paper MD3 + fallback aman
  const surface = isDark
    ? theme.colors.elevation?.level2 || '#121212'
    : theme.colors.surface || '#FFFFFF';
  const borderTop = isDark
    ? 'rgba(255,255,255,0.06)'
    : theme.colors.outlineVariant || 'rgba(0,0,0,0.06)';
  const inactive = isDark
    ? theme.colors.onSurfaceVariant || '#9E9E9E'
    : '#666666';

  const cartItems = useSelector((state) => state.cart?.items || []); // pastikan selector sesuai slice kamu

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,   // pakai #62109F dari theme kamu
        tabBarInactiveTintColor: inactive,
        tabBarShowLabel: true,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: surface,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 24 : 12,
          paddingTop: 12,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: borderTop,
          // Elevation/shadow adaptif
          elevation: isDark ? 0 : 12,
          shadowColor: isDark ? 'transparent' : '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDark ? 0 : 0.06,
          shadowRadius: isDark ? 0 : 12,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardNavigator}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'home' : 'home-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />

      <Tab.Screen
        name="AppointmentTab"
        component={AppointmentNavigator}
        options={{
          tabBarLabel: 'My Appointments',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'calendar-check' : 'calendar-check-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />

      <Tab.Screen
        name="AITab"
        component={AINavigator}
        options={{
          tabBarLabel: '',
          tabBarIcon: ({ focused }) => (
            <View style={styles.centerButtonContainer}>
              <View
                style={[
                  styles.centerButton,
                  { backgroundColor: theme.colors.primary }, // #62109F
                ]}
              >
                <MaterialCommunityIcons name="camera" size={32} color="#FFF" />
              </View>
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="ShopTab"
        component={ShopNavigator}
        options={{
          tabBarLabel: 'Shop',
          tabBarIcon: ({ color, focused }) => (
            <View>
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
        }}
      />

      <Tab.Screen
        name="SettingsTab"
        component={SettingsNavigator}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'account' : 'account-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  centerButtonContainer: {
    position: 'absolute',
    top: -28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
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
