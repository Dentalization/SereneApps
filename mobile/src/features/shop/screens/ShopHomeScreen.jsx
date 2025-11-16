import React, { useMemo, useState } from 'react';
import { View, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { Text, Chip, FAB, useTheme, Searchbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { SHOP_CATEGORIES, SHOP_PRODUCTS, FEATURED_BUNDLES } from '../data/products';
import ProductCard from '../components/ProductCard';
import PromoBanner from '../components/PromoBanner';
import { formatCurrency } from '../../../utils/formatters';
import useAnchoredHeaderHeight from '../../../hooks/useAnchoredHeaderHeight';

const ShopHomeScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const cartItems = useSelector((state) => state.cart.items);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [query, setQuery] = useState('');

  const filteredProducts = useMemo(() => {
    return SHOP_PRODUCTS.filter((product) => {
      const matchCategory =
        selectedCategory === 'all' || product.category === selectedCategory;
      const matchQuery = product.name.toLowerCase().includes(query.toLowerCase());
      return matchCategory && matchQuery;
    });
  }, [selectedCategory, query]);

  const essentialCare = filteredProducts.filter((p) =>
    ['sensitive', 'mouthwash', 'dental_floss'].includes(p.category)
  );
  const smartDevices = filteredProducts.filter((p) => ['electric', 'whitening'].includes(p.category));
  const { headerHeight, handleHeaderLayout } = useAnchoredHeaderHeight(320);

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
      <View
        onLayout={handleHeaderLayout}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}
      >
        <LinearGradient
          colors={[theme.colors.primary, '#7F1DFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 32, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Dental Marketplace</Text>
              <Text style={{ color: 'white', fontSize: 24, fontWeight: '700', marginTop: 4 }}>
                Produk perawatan modern
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Cart')}
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' }}
            >
              <MaterialCommunityIcons name='cart-outline' size={22} color='white' />
              {cartItems.length > 0 && (
                <View style={{ position: 'absolute', top: 4, right: 4, backgroundColor: '#F59E0B', paddingHorizontal: 6, borderRadius: 999 }}>
                  <Text style={{ color: 'white', fontSize: 10, fontWeight: '700' }}>{cartItems.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <Searchbar
            placeholder='Cari alat kesehatan gigi...'
            value={query}
            onChangeText={setQuery}
            style={{ marginTop: 20, backgroundColor: 'rgba(255,255,255,0.15)', elevation: 0 }}
            inputStyle={{ color: 'white' }}
            iconColor='rgba(255,255,255,0.6)'
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 18 }}>
            {SHOP_CATEGORIES.map((category) => {
              const isActive = selectedCategory === category.id;
              return (
                <Chip
                  key={category.id}
                  selected={isActive}
                  onPress={() => setSelectedCategory(category.id)}
                  style={{
                    marginRight: 10,
                    backgroundColor: isActive ? 'white' : 'rgba(255,255,255,0.15)',
                  }}
                  textStyle={{ color: isActive ? theme.colors.primary : 'white', fontWeight: '600' }}
                >
                  {category.label}
                </Chip>
              );
            })}
          </ScrollView>
        </LinearGradient>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingTop: headerHeight + 16, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 12 }}>
            Katalog Pilihan
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {FEATURED_BUNDLES.map((bundle) => (
              <PromoBanner key={bundle.id} banner={bundle} onPress={() => {}} />
            ))}
          </ScrollView>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <SectionHeader title='Essential care' subtitle='Untuk kebersihan harian yang lembut' />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {essentialCare.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onPress={() => navigation.navigate('ProductDetail', { productId: product.id })}
              />
            ))}
          </ScrollView>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 32 }}>
          <SectionHeader title='Smart devices' subtitle='Teknologi terbaru untuk hasil klinis' />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {smartDevices.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onPress={() => navigation.navigate('ProductDetail', { productId: product.id })}
              />
            ))}
          </ScrollView>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 32 }}>
          <SectionHeader
            title='Semua produk'
            subtitle={`${filteredProducts.length} produk ditemukan`}
            actionText='Lihat semua'
          />
          {filteredProducts.map((product) => (
            <TouchableOpacity
              key={product.id}
              onPress={() => navigation.navigate('ProductDetail', { productId: product.id })}
              style={{
                flexDirection: 'row',
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: '#E2E8F0',
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  backgroundColor: '#EEF2FF',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 16,
                }}
              >
                <MaterialCommunityIcons name='tooth-outline' color={theme.colors.primary} size={24} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: '#0F172A' }}>{product.name}</Text>
                <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>{product.description}</Text>
              </View>
              <Text style={{ fontWeight: '700', color: '#0F172A' }}>{formatCurrency(product.price)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {cartItems.length > 0 && (
        <FAB
          icon='cart'
          label={`${cartItems.length} Item`}
          onPress={() => navigation.navigate('Cart')}
          style={{ position: 'absolute', right: 16, bottom: 24, backgroundColor: theme.colors.primary }}
        />
      )}
    </View>
  );
};

const SectionHeader = ({ title, subtitle, actionText }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
    <View>
      <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A' }}>{title}</Text>
      {subtitle ? <Text style={{ color: '#94A3B8', marginTop: 2 }}>{subtitle}</Text> : null}
    </View>
    {actionText ? (
      <TouchableOpacity>
        <Text style={{ color: '#6366F1', fontWeight: '700' }}>{actionText}</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

export default ShopHomeScreen;
