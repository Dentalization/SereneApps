import React, { useMemo, useState } from 'react';
import { View, ScrollView, Image, TouchableOpacity, StatusBar, Dimensions } from 'react-native';
import { Text, Chip, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SHOP_PRODUCTS, SHOP_CATEGORIES, findProductById } from '../data/products';
import { formatCurrency } from '../../../utils/formatters';

const { width } = Dimensions.get('window');

const ProductDetailScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  
  const insets = useSafeAreaInsets();
  
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  const product = useMemo(() => {
    const fromParam = route.params?.product || findProductById(route.params?.productId);
    return fromParam || SHOP_PRODUCTS[0];
  }, [route.params]);

  const images = product.images?.length ? product.images : [product.image];
  const categoryLabel =
    SHOP_CATEGORIES.find((category) => category.id === product.category)?.label ||
    'Kategori lainnya';

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* TOMBOL BACK FLOATING (Agar tetap bisa ditekan saat scroll) 
        Kita taruh di luar ScrollView agar tetap di atas (z-index)
      */}
      <View 
        style={{ 
          position: 'absolute', 
          top: insets.top + 10, 
          left: 20, 
          zIndex: 10,
          right: 20,
          flexDirection: 'row',
          justifyContent: 'space-between',
          // Pointer events box-none agar area kosong tidak menghalangi sentuhan ke bawah
          pointerEvents: 'box-none' 
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: 'rgba(255,255,255,0.9)',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3
          }}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color="#0F172A" />
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: 'rgba(255,255,255,0.9)',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3
          }}
        >
          <MaterialCommunityIcons name="share-variant" size={20} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {/* SCROLLVIEW UTAMA DIMULAI DARI SINI */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER + IMAGES (SEKARANG MASUK SCROLLVIEW) */}
        <LinearGradient
          colors={['#EEF2FF', '#FFFFFF']}
          style={{
            paddingTop: insets.top + 60, // Tambah padding atas agar gambar tidak tertutup tombol back
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
            paddingBottom: 24,
          }}
        >
          <View style={{ alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '600' }}>
              Serene Shop
            </Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>
              Detail Produk
            </Text>
          </View>

          {/* Image Carousel */}
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / width);
              setActiveImage(index);
            }}
            style={{ marginTop: 10 }}
          >
            {images.map((img, index) => (
              <View
                key={`${img}-${index}`}
                style={{
                  width,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 10,
                }}
              >
                <View
                  style={{
                    width: width * 0.82,
                    height: 320,
                    borderRadius: 32,
                    shadowColor: '#4F46E5',
                    shadowOpacity: 0.18,
                    shadowRadius: 18,
                    shadowOffset: { width: 0, height: 10 },
                    elevation: 10,
                  }}
                >
                  <LinearGradient
                    colors={['#EEF2FF', '#C4B5FD']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      flex: 1,
                      borderRadius: 32,
                      padding: 10,
                    }}
                  >
                    <View style={{ flex: 1, borderRadius: 26, overflow: 'hidden' }}>
                      <Image
                        source={{ uri: img }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />

                      {/* Badge kategori */}
                      <View
                        style={{
                          position: 'absolute',
                          top: 12,
                          left: 12,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 999,
                          backgroundColor: 'rgba(15,23,42,0.72)',
                          flexDirection: 'row',
                          alignItems: 'center',
                        }}
                      >
                        <MaterialCommunityIcons
                          name="tag-outline"
                          size={14}
                          color="#E5E7EB"
                        />
                        <Text
                          style={{
                            marginLeft: 4,
                            fontSize: 12,
                            fontWeight: '600',
                            color: '#F9FAFB',
                          }}
                          numberOfLines={1}
                        >
                          {categoryLabel}
                        </Text>
                      </View>

                      {/* Badge rating */}
                      <View
                        style={{
                          position: 'absolute',
                          top: 12,
                          right: 12,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 999,
                          backgroundColor: 'rgba(15,23,42,0.72)',
                          flexDirection: 'row',
                          alignItems: 'center',
                        }}
                      >
                        <MaterialCommunityIcons
                          name="star"
                          size={14}
                          color="#FACC15"
                        />
                        <Text
                          style={{
                            marginLeft: 4,
                            fontSize: 12,
                            fontWeight: '700',
                            color: '#F9FAFB',
                          }}
                        >
                          {product.rating}
                        </Text>
                      </View>
                    </View>

                    {/* Favorite button */}
                    <TouchableOpacity
                      onPress={() => setIsFavorite((prev) => !prev)}
                      style={{
                        position: 'absolute',
                        right: 18,
                        bottom: 18,
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: '#FFFFFF',
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: '#0F172A',
                        shadowOpacity: 0.16,
                        shadowRadius: 10,
                        shadowOffset: { width: 0, height: 6 },
                        elevation: 8,
                      }}
                    >
                      <MaterialCommunityIcons
                        name={isFavorite ? 'heart' : 'heart-outline'}
                        size={22}
                        color={isFavorite ? '#F43F5E' : '#0F172A'}
                      />
                    </TouchableOpacity>
                  </LinearGradient>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Dot indicator */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 14 }}>
            {images.map((_, idx) => (
              <View
                key={idx}
                style={{
                  width: idx === activeImage ? 18 : 8,
                  height: 8,
                  borderRadius: 999,
                  backgroundColor: idx === activeImage ? '#7C3AED' : '#E2E8F0',
                  marginHorizontal: 4,
                }}
              />
            ))}
          </View>
        </LinearGradient>

        {/* INFO PRODUK */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <Text style={{ fontSize: 14, color: '#94A3B8', fontWeight: '600' }}>
            {product.brand}
          </Text>
          <Text
            style={{
              fontSize: 24,
              fontWeight: '700',
              color: '#0F172A',
              marginTop: 4,
            }}
          >
            {product.name}
          </Text>
          <View
            style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}
          >
            <MaterialCommunityIcons name="star" size={18} color="#FACC15" />
            <Text
              style={{ marginLeft: 6, fontWeight: '600', color: '#475569' }}
            >
              {product.rating}
            </Text>
            <Text style={{ marginLeft: 4, color: '#94A3B8' }}>
              ({product.reviews} ulasan)
            </Text>
          </View>

          <View style={{ marginTop: 16 }}>
            {product.originalPrice ? (
              <Text
                style={{
                  fontSize: 14,
                  color: '#94A3B8',
                  textDecorationLine: 'line-through',
                }}
              >
                {formatCurrency(product.originalPrice)}
              </Text>
            ) : null}
            <Text
              style={{
                fontSize: 28,
                fontWeight: '700',
                color: theme.colors.primary,
              }}
            >
              {formatCurrency(product.price)}
            </Text>
          </View>

          <View style={{ marginTop: 16 }}>
            <Text
              style={{
                fontWeight: '700',
                color: '#0F172A',
                marginBottom: 8,
              }}
            >
              Deskripsi
            </Text>
            <Text style={{ color: '#475569', lineHeight: 22 }}>
              {product.description}
            </Text>
          </View>

          <Text
            style={{
              fontWeight: '700',
              color: '#0F172A',
              marginTop: 20,
              marginBottom: 10,
            }}
          >
            Keunggulan utama
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {product.highlights?.map((item) => (
              <Chip
                key={item}
                style={{ marginRight: 8, marginBottom: 8 }}
                textStyle={{ fontWeight: '600' }}
              >
                {item}
              </Chip>
            ))}
          </View>

          <View
            style={{
              marginTop: 24,
              backgroundColor: 'white',
              borderRadius: 20,
              padding: 16,
              shadowColor: '#4C1D95',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.08,
              shadowRadius: 18,
              elevation: 4,
            }}
          >
            <Text style={{ fontWeight: '700', color: '#0F172A' }}>Info tambahan</Text>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginTop: 12,
              }}
            >
              <Text style={{ color: '#94A3B8' }}>Stok tersedia</Text>
              <Text style={{ fontWeight: '600', color: '#0F172A' }}>
                {product.stock} pcs
              </Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginTop: 8,
              }}
            >
              <Text style={{ color: '#94A3B8' }}>Kategori</Text>
              <Text style={{ fontWeight: '600', color: '#0F172A' }}>
                {categoryLabel}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom bar */}
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
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <View>
            <Text style={{ color: '#94A3B8', fontSize: 12 }}>Harga</Text>
            <Text
              style={{
                fontSize: 20,
                fontWeight: '700',
                color: '#0F172A',
              }}
            >
              {formatCurrency(product.price)}
            </Text>
          </View>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#0F172A',
              paddingHorizontal: 28,
              paddingVertical: 12,
              borderRadius: 26,
            }}
          >
            <MaterialCommunityIcons name="cart-plus" size={20} color="white" />
            <Text
              style={{
                color: 'white',
                fontWeight: '700',
                marginLeft: 8,
              }}
            >
              Tambah ke keranjang
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default ProductDetailScreen;