import React from 'react';
import { View } from 'react-native';
import { Text, Divider } from 'react-native-paper';
import { formatCurrency } from '../../../utils/formatters';

const CheckoutSummary = ({ rows = [], totalLabel = 'Total', total }) => {
  return (
    <View
      style={{
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
      {rows.map((row) => (
        <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={{ color: '#475569' }}>{row.label}</Text>
          <Text style={{ fontWeight: '600', color: '#0F172A' }}>
            {row.valueCurrency ? formatCurrency(row.valueCurrency) : row.value}
          </Text>
        </View>
      ))}
      <Divider style={{ marginVertical: 12 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontWeight: '700', color: '#0F172A' }}>{totalLabel}</Text>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A' }}>
          {formatCurrency(total)}
        </Text>
      </View>
    </View>
  );
};

export default CheckoutSummary;
