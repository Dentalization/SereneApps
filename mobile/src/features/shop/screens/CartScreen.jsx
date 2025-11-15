import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import EmptyState from '../../../components/shared/EmptyState';

const CartScreen = ({ navigation }) => {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <EmptyState
        icon="cart-outline"
        title="Keranjang Kosong"
        description="Belanja produk kesehatan gigi untuk senyum yang lebih cerah"
        action={
          <Button
            mode="contained"
            onPress={() => navigation.navigate('ShopHome')}
            icon="shopping"
          >
            Mulai Belanja
          </Button>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default CartScreen;
