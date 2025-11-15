import React from 'react';
import { View, ScrollView, StyleSheet, FlatList } from 'react-native';
import { Text, Card, Chip, IconButton, FAB, useTheme, Badge } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { formatCurrency } from '../../../utils/formatters';

const ShopHomeScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const cartItems = useSelector((state) => state.cart.items);
  const [selectedCategory, setSelectedCategory] = React.useState('all');

  const categories = [
    { key: 'all', label: 'Semua' },
    { key: 'toothpaste', label: 'Pasta Gigi' },
    { key: 'toothbrush', label: 'Sikat Gigi' },
    { key: 'mouthwash', label: 'Mouthwash' },
    { key: 'dental_floss', label: 'Benang Gigi' },
  ];

  const products = [
    {
      id: 1,
      name: 'Sensodyne Repair & Protect',
      price: 45000,
      originalPrice: 55000,
      image: 'tooth',
      rating: 4.8,
      reviews: 245,
      stock: 'inStock',
      badge: 'sale',
    },
    {
      id: 2,
      name: 'Oral-B Electric Toothbrush',
      price: 350000,
      image: 'toothbrush-electric',
      rating: 4.9,
      reviews: 189,
      stock: 'inStock',
      badge: 'recommended',
    },
  ];

  const renderProduct = ({ item }) => (
    <Card
      style={[styles.productCard, theme.shadows.sm]}
      onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
    >
      <View style={styles.productImageContainer}>
        <MaterialCommunityIcons
          name={item.image}
          size={80}
          color={theme.colors.primary}
        />
        {item.badge && (
          <Chip
            style={[
              styles.badge,
              { backgroundColor: theme.ecommerce.badge[item.badge] },
            ]}
            textStyle={styles.badgeText}
          >
            {item.badge === 'sale' ? 'SALE' : 'RECOMMENDED'}
          </Chip>
        )}
      </View>
      <Card.Content style={styles.productContent}>
        <Text variant="titleSmall" numberOfLines={2}>
          {item.name}
        </Text>
        <View style={styles.rating}>
          <MaterialCommunityIcons name="star" size={16} color="#FFB300" />
          <Text variant="bodySmall">{item.rating}</Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            ({item.reviews})
          </Text>
        </View>
        <View style={styles.priceContainer}>
          {item.originalPrice && (
            <Text
              variant="bodySmall"
              style={[
                styles.originalPrice,
                { color: theme.ecommerce.price.original },
              ]}
            >
              {formatCurrency(item.originalPrice)}
            </Text>
          )}
          <Text
            variant="titleMedium"
            style={{ color: theme.ecommerce.price.final, fontWeight: 'bold' }}
          >
            {formatCurrency(item.price)}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Categories */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories}>
        <View style={styles.categoriesContent}>
          {categories.map((cat) => (
            <Chip
              key={cat.key}
              selected={selectedCategory === cat.key}
              onPress={() => setSelectedCategory(cat.key)}
              style={styles.categoryChip}
            >
              {cat.label}
            </Chip>
          ))}
        </View>
      </ScrollView>

      {/* Products Grid */}
      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
      />

      {/* Cart FAB */}
      {cartItems.length > 0 && (
        <FAB
          icon="cart"
          label={`${cartItems.length} Item`}
          onPress={() => navigation.navigate('Cart')}
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  categories: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  categoriesContent: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryChip: {
    height: 36,
  },
  grid: {
    padding: 16,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  productCard: {
    flex: 1,
    maxWidth: '48%',
    borderRadius: 12,
  },
  productImageContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#F5F5F5',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    height: 24,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  productContent: {
    paddingTop: 12,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginVertical: 8,
  },
  priceContainer: {
    marginTop: 4,
  },
  originalPrice: {
    textDecorationLine: 'line-through',
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
});

export default ShopHomeScreen;
