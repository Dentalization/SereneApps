import React, { useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // Pastikan import ini ada

import CartItemCard from '../components/CartItemCard';
import CheckoutSummary from '../components/CheckoutSummary';
import { SHOP_PRODUCTS } from '../data/products';

const CartScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  
  // Panggil hook di sini
  const insets = useSafeAreaInsets();

  const cartItems = useMemo(() => [
    { ...SHOP_PRODUCTS[0], qty: 2, variant: '100gr' },
    { ...SHOP_PRODUCTS[1], qty: 1, variant: 'Hitam Grafit' },
  ], []);

  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.qty, 0);
  const shipping = 25000;
  const total = subtotal + shipping;

  // Gunakan nilai default (0) jika insets belum siap
  const safePaddingTop = (insets?.top || 0) + 2;

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      
      <View style={{ 
        paddingTop: safePaddingTop, // Gunakan variabel aman tadi
        paddingHorizontal: 20, 
        paddingBottom: 16, 
        backgroundColor: '#F8FAFC' 
      }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }}
        >
          <MaterialCommunityIcons name='arrow-left' size={24} color='#0F172A' />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0, paddingBottom: 160 }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: '#0F172A', marginBottom: 16 }}>Keranjang</Text>
        {cartItems.map((item) => (
          <CartItemCard
            key={item.id}
            item={item}
            onIncrement={() => {}}
            onDecrement={() => {}}
          />
        ))}

        <View style={{ marginTop: 20 }}>
          <CheckoutSummary
            rows={[
              { label: 'Subtotal', valueCurrency: subtotal },
              { label: 'Pengiriman ekspres', valueCurrency: shipping },
            ]}
            total={total}
          />
        </View>
      </ScrollView>

      <View
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 20, backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#0F172A', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 10 }}
      >
        <Button mode='contained' icon='credit-card' onPress={() => navigation.navigate('Checkout')} contentStyle={{ paddingVertical: 6 }}>
          Lanjut ke pembayaran
        </Button>
      </View>
    </View>
  );
};

export default CartScreen;