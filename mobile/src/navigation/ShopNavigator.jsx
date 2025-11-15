import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ShopHomeScreen from '../features/shop/screens/ShopHomeScreen';
import ProductDetailScreen from '../features/shop/screens/ProductDetailScreen';
import CartScreen from '../features/shop/screens/CartScreen';
import CheckoutScreen from '../features/shop/screens/CheckoutScreen';

const Stack = createStackNavigator();

const ShopNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { elevation: 0, shadowOpacity: 0 },
      }}
    >
      <Stack.Screen
        name="ShopHome"
        component={ShopHomeScreen}
        options={{ title: 'Produk Kesehatan Gigi' }}
      />
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ title: 'Detail Produk' }}
      />
      <Stack.Screen
        name="Cart"
        component={CartScreen}
        options={{ title: 'Keranjang Belanja' }}
      />
      <Stack.Screen
        name="Checkout"
        component={CheckoutScreen}
        options={{ title: 'Checkout' }}
      />
    </Stack.Navigator>
  );
};

export default ShopNavigator;
