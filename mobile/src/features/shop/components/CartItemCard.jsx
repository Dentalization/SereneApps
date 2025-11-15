import React from 'react';
import { View, Image, TouchableOpacity } from 'react-native';
import { Text, IconButton, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatCurrency } from '../../../utils/formatters';

const CartItemCard = ({ item, onPress, onIncrement, onDecrement }) => {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 16,
        marginBottom: 14,
        shadowColor: '#4C1D95',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 18,
        elevation: 4,
      }}
    >
      <Image
        source={{ uri: item.image }}
        style={{ width: 78, height: 78, borderRadius: 16, marginRight: 14 }}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A' }}>{item.name}</Text>
        <Text style={{ fontSize: 13, color: '#94A3B8', marginTop: 2 }}>{item.variant}</Text>
        <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.primary, marginTop: 8 }}>
          {formatCurrency(item.price)}
        </Text>
      </View>
      <View style={{ alignItems: 'center' }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#F1F5F9',
            borderRadius: 999,
            paddingHorizontal: 6,
            paddingVertical: 4,
          }}
        >
          <IconButton icon='minus' size={14} onPress={onDecrement} />
          <Text style={{ fontWeight: '700', color: '#0F172A' }}>{item.qty}</Text>
          <IconButton icon='plus' size={14} onPress={onIncrement} />
        </View>
      </View>
    </View>
  );
};

export default CartItemCard;
