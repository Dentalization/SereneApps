import React from 'react';
import { TouchableOpacity, Image, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatCurrency } from '../../../utils/formatters';

const badgeMeta = {
  sale: { label: 'SALE', color: '#F97316' },
  recommended: { label: 'RECOMMENDED', color: '#10B981' },
  new: { label: 'NEW', color: '#3B82F6' },
};

const ProductCard = ({ product, onPress }) => {
  const theme = useTheme();
  const mainBadge = product.badges?.[0];
  const badge = badgeMeta[mainBadge];
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={{
        width: 180,
        borderRadius: 20,
        backgroundColor: 'white',
        padding: 14,
        marginRight: 16,
        shadowColor: '#4C1D95',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 18,
        elevation: 4,
      }}
    >
      <View
        style={{
          height: 120,
          borderRadius: 16,
          backgroundColor: '#F5F5F7',
          marginBottom: 12,
          overflow: 'hidden',
        }}
      >
        <Image
          source={{ uri: product.image }}
          style={{ width: '100%', height: '100%' }}
          resizeMode='cover'
        />
        {badge && (
          <View
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 12,
              backgroundColor: badge.color,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '700', color: 'white' }}>{badge.label}</Text>
          </View>
        )}
      </View>

      <Text style={{ fontSize: 13, color: '#94A3B8', fontWeight: '600', marginBottom: 2 }}>
        {product.brand}
      </Text>
      <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A' }} numberOfLines={2}>
        {product.name}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
        <MaterialCommunityIcons name='star' size={16} color='#FACC15' />
        <Text style={{ marginLeft: 4, fontWeight: '600', color: '#475569' }}>{product.rating}</Text>
        <Text style={{ marginLeft: 4, fontSize: 12, color: '#94A3B8' }}>({product.reviews})</Text>
      </View>

      <View style={{ marginTop: 10 }}>
        {product.originalPrice ? (
          <Text style={{ fontSize: 12, color: '#94A3B8', textDecorationLine: 'line-through' }}>
            {formatCurrency(product.originalPrice)}
          </Text>
        ) : null}
        <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.primary }}>
          {formatCurrency(product.price)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default ProductCard;
