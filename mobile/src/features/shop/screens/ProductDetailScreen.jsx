import React, { useMemo } from 'react';
import { View, ScrollView, Image, TouchableOpacity, StatusBar } from 'react-native';
import { Text, Chip, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { SHOP_PRODUCTS, findProductById } from '../data/products';
import { formatCurrency } from '../../../utils/formatters';

const ProductDetailScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();

  const product = useMemo(() => {
    const fromParam = route.params?.product || findProductById(route.params?.productId);
    return fromParam || SHOP_PRODUCTS[0];
  }, [route.params]);

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />
      <ScrollView contentContainerStyle={{ paddingBottom: 160 }}>
        <LinearGradient
          colors={['#F5F5F5', '#FFFFFF']}
          style={{ borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingBottom: 32 }}
        >
          <View style={{ paddingHorizontal: 20, paddingTop: 48, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(15,23,42,0.08)', alignItems: 'center', justifyContent: 'center' }}
            >
              <MaterialCommunityIcons name='arrow-left' size={22} color='#0F172A' />
            </TouchableOpacity>
            <TouchableOpacity
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(15,23,42,0.08)', alignItems: 'center', justifyContent: 'center' }}
            >
              <MaterialCommunityIcons name='heart-outline' size={22} color='#0F172A' />
            </TouchableOpacity>
          </View>
          <Image
            source={{ uri: product.image }}
            style={{ width: '100%', height: 320, marginTop: 12 }}
            resizeMode='contain'
          />
        </LinearGradient>

        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <Text style={{ fontSize: 14, color: '#94A3B8', fontWeight: '600' }}>{product.brand}</Text>
          <Text style={{ fontSize: 24, fontWeight: '700', color: '#0F172A', marginTop: 4 }}>{product.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
            <MaterialCommunityIcons name='star' size={18} color='#FACC15' />
            <Text style={{ marginLeft: 6, fontWeight: '600', color: '#475569' }}>{product.rating}</Text>
            <Text style={{ marginLeft: 4, color: '#94A3B8' }}>({product.reviews} ulasan)</Text>
          </View>

          <View style={{ marginTop: 16 }}>
            {product.originalPrice ? (
              <Text style={{ fontSize: 14, color: '#94A3B8', textDecorationLine: 'line-through' }}>
                {formatCurrency(product.originalPrice)}
              </Text>
            ) : null}
            <Text style={{ fontSize: 28, fontWeight: '700', color: theme.colors.primary }}>
              {formatCurrency(product.price)}
            </Text>
          </View>

          <View style={{ marginTop: 16 }}>
            <Text style={{ fontWeight: '700', color: '#0F172A', marginBottom: 8 }}>Deskripsi</Text>
            <Text style={{ color: '#475569', lineHeight: 22 }}>{product.description}</Text>
          </View>

          <Text style={{ fontWeight: '700', color: '#0F172A', marginTop: 20, marginBottom: 10 }}>Keunggulan utama</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {product.highlights?.map((item) => (
              <Chip key={item} style={{ marginRight: 8, marginBottom: 8 }} textStyle={{ fontWeight: '600' }}>
                {item}
              </Chip>
            ))}
          </View>

          <View style={{ marginTop: 24, backgroundColor: 'white', borderRadius: 20, padding: 16, shadowColor: '#4C1D95', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 4 }}>
            <Text style={{ fontWeight: '700', color: '#0F172A' }}>Info tambahan</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
              <Text style={{ color: '#94A3B8' }}>Stok tersedia</Text>
              <Text style={{ fontWeight: '600', color: '#0F172A' }}>{product.stock} pcs</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              <Text style={{ color: '#94A3B8' }}>Kategori</Text>
              <Text style={{ fontWeight: '600', color: '#0F172A' }}>{product.category}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: 20,
          backgroundColor: 'rgba(248,250,252,0.95)',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 12,
          elevation: 10,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
          <View>
            <Text style={{ color: '#94A3B8', fontSize: 12 }}>Harga</Text>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#0F172A' }}>{formatCurrency(product.price)}</Text>
          </View>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primary, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 26 }}
          >
            <MaterialCommunityIcons name='cart-plus' size={20} color='white' />
            <Text style={{ color: 'white', fontWeight: '700', marginLeft: 8 }}>Tambah ke keranjang</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default ProductDetailScreen;
