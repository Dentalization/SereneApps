import React from 'react';
import { View, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { Text, Button, useTheme, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
// 1. IMPORT DITAMBAHKAN
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CheckoutSummary from '../components/CheckoutSummary';
import { SHOP_PRODUCTS } from '../data/products';
import { formatCurrency } from '../../../utils/formatters';

const CheckoutScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  
  // 2. DEFINISI INSETS DITAMBAHKAN
  const insets = useSafeAreaInsets();

  const items = [
    { name: SHOP_PRODUCTS[0].name, qty: 2, price: SHOP_PRODUCTS[0].price },
    { name: SHOP_PRODUCTS[1].name, qty: 1, price: SHOP_PRODUCTS[1].price },
  ];

  const subtotal = items.reduce((acc, item) => acc + item.qty * item.price, 0);
  const shipping = 25000;
  const total = subtotal + shipping;

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      
      <View style={{ 
        // 3. KODE INI SEKARANG AMAN
        paddingTop: insets.top + 2, 
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
        <Text style={{ fontSize: 24, fontWeight: '700', color: '#0F172A', marginBottom: 20 }}>Pembayaran</Text>

        <CardBlock title='Alamat pengiriman'>
          <Text style={{ fontWeight: '700', color: '#0F172A' }}>Adrian Halim</Text>
          <Text style={{ color: '#475569', marginTop: 4 }}>
            Jl. Kemang Timur No. 33, Jakarta Selatan, DKI Jakarta 12730
          </Text>
        </CardBlock>

        <CardBlock title='Metode pembayaran'>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontWeight: '700', color: '#0F172A' }}>Kartu Kredit</Text>
              <Text style={{ color: '#94A3B8', marginTop: 2 }}>Visa ••4123</Text>
            </View>
            <Button mode='outlined' compact>Ubah</Button>
          </View>
        </CardBlock>

        <CardBlock title='Ringkasan pesanan'>
          {items.map((item) => (
            <View key={item.name} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <View>
                <Text style={{ fontWeight: '600', color: '#0F172A' }}>{item.name}</Text>
                <Text style={{ color: '#94A3B8' }}>{item.qty} barang</Text>
              </View>
              <Text style={{ fontWeight: '600', color: '#0F172A' }}>{formatCurrency(item.price * item.qty)}</Text>
            </View>
          ))}
          <Divider style={{ marginVertical: 12 }} />
          <CheckoutSummary
            rows={[
              { label: 'Subtotal', valueCurrency: subtotal },
              { label: 'Pengiriman ekspres', valueCurrency: shipping },
            ]}
            total={total}
          />
        </CardBlock>
      </ScrollView>

      <View
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 20, backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#0F172A', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 10 }}
      >
        <Button mode='contained' icon='check-circle' onPress={() => navigation.navigate('ShopHome')}>
          Konfirmasi & bayar
        </Button>
      </View>
    </View>
  );
};

const CardBlock = ({ title, children }) => (
  <View style={{ backgroundColor: 'white', borderRadius: 20, padding: 16, marginBottom: 20, shadowColor: '#4C1D95', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 4 }}>
    <Text style={{ fontWeight: '700', color: '#0F172A', marginBottom: 12 }}>{title}</Text>
    {children}
  </View>
);

export default CheckoutScreen;