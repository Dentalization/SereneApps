import React, { useMemo } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useRoute } from '@react-navigation/native';
import NotificationDetailLayout from '../../components/NotificationDetailLayout';

const NotificationShopDetailScreen = () => {
  const route = useRoute();
  const notification = route.params?.notification;
  const meta = notification?.meta || {};

  const heroExtras = (
    <View style={styles.heroStats}>
      <View style={styles.heroStat}>
        <Text style={styles.heroLabel}>Status</Text>
        <Text style={styles.heroValue}>{meta.status || '-'}</Text>
      </View>
      <View style={styles.heroDivider} />
      <View style={styles.heroStat}>
        <Text style={styles.heroLabel}>Kurir</Text>
        <Text style={styles.heroValue}>{meta.courier || meta.paymentMethod || '-'}</Text>
      </View>
    </View>
  );

  const sections = useMemo(() => {
    const orderRows = [
      meta.orderId && { label: 'ID Pesanan', value: meta.orderId },
      meta.status && { label: 'Status', value: meta.status },
      meta.trackingId && { label: 'No. Resi', value: meta.trackingId },
      meta.eta && { label: 'Estimasi', value: meta.eta },
    ];
    const itemsRows =
      meta.items?.map((item) => ({
        label: item.name,
        value: `${item.qty} × ${item.variant}`,
      })) || [];
    const shippingRows = [
      meta.courier && { label: 'Kurir', value: meta.courier },
      meta.shippingAddress && { label: 'Alamat', value: meta.shippingAddress },
      meta.paymentMethod && { label: 'Metode bayar', value: meta.paymentMethod },
    ];
    const timelineRows =
      meta.shippingTimeline?.map((entry) => ({
        label: entry.label,
        value: entry.time
          ? new Date(entry.time).toLocaleString(undefined, {
              day: 'numeric',
              month: 'short',
              hour: 'numeric',
              minute: '2-digit',
            })
          : '',
      })) || [];
    const actionRows =
      meta.nextSteps?.map((step, idx) => ({ label: `Langkah ${idx + 1}`, value: step })) || [];

    return [
      { title: 'Ringkasan Pesanan', rows: orderRows.filter(Boolean) },
      ...(itemsRows.length ? [{ title: 'Barang', rows: itemsRows }] : []),
      { title: 'Pengiriman', rows: shippingRows.filter(Boolean) },
      ...(timelineRows.length ? [{ title: 'Timeline Pengiriman', rows: timelineRows }] : []),
      ...(actionRows.length ? [{ title: 'Tindak Lanjut', rows: actionRows }] : []),
    ];
  }, [meta]);

  const productGallery = meta.items?.length ? (
    <View style={styles.productWrapper}>
      {meta.items.map((item) => (
        <View key={item.id || item.name} style={styles.productCard}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.productImage} />
          ) : null}
          <View style={{ flex: 1 }}>
            <Text style={styles.productName}>{item.name}</Text>
            <Text style={styles.productMeta}>{item.variant}</Text>
          </View>
          <Text style={styles.productPrice}>x{item.qty}</Text>
        </View>
      ))}
    </View>
  ) : null;

  return (
    <NotificationDetailLayout
      notification={notification}
      sections={sections}
      heroExtras={heroExtras}
      footer={productGallery}
    />
  );
};

const styles = StyleSheet.create({
  heroStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    padding: 12,
    marginTop: 18,
  },
  heroStat: {
    flex: 1,
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
  },
  heroValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  heroDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 12,
  },
  productWrapper: {
    marginTop: 8,
    gap: 12,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    padding: 12,
  },
  productImage: {
    width: 48,
    height: 48,
    borderRadius: 12,
    marginRight: 12,
  },
  productName: {
    fontWeight: '600',
  },
  productMeta: {
    color: '#64748B',
    fontSize: 12,
  },
  productPrice: {
    fontWeight: '700',
    color: '#0F172A',
  },
});

export default NotificationShopDetailScreen;
