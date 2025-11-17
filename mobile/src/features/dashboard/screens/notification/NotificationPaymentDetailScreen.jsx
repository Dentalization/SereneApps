import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useRoute } from '@react-navigation/native';
import NotificationDetailLayout from '../../components/NotificationDetailLayout';

const formatCurrency = (value = 0, currency = 'USD') =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value);

const PaymentMethodCard = ({ method, details = {} }) => (
  <View style={styles.methodCard}>
    <Text style={styles.methodLabel}>{method}</Text>
    <Text style={styles.methodValue}>{details.holder || '-'}</Text>
    {details.brand ? (
      <Text style={styles.methodMeta}>
        {details.brand}
        {details.last4 ? ` ••${details.last4}` : ''}
      </Text>
    ) : null}
  </View>
);

const NotificationPaymentDetailScreen = () => {
  const route = useRoute();
  const notification = route.params?.notification;
  const meta = notification?.meta || {};
  const currency = meta.currency || 'USD';

  const normalizedStatus = (meta.status || '').toLowerCase();
  const isFailed = normalizedStatus === 'failed' || normalizedStatus === 'declined';
  const statusColor = isFailed ? '#F87171' : '#22C55E';

  const heroExtras = (
    <View style={[styles.heroStats, { borderColor: statusColor }] }>
      <View style={styles.heroStat}>
        <Text style={styles.heroStatLabel}>Total</Text>
        <Text style={styles.heroStatValue}>{formatCurrency(meta.total || meta.amount || 0, currency)}</Text>
      </View>
      <View style={styles.heroDivider} />
      <View style={styles.heroStat}>
        <Text style={styles.heroStatLabel}>Status</Text>
        <Text style={[styles.heroStatValue, { color: '#FFFFFF' }]}>{meta.status || '-'}</Text>
      </View>
    </View>
  );

  const sections = useMemo(() => {
    const items = meta.items || [];
    const summaryRows = [
      meta.invoiceId && { label: 'Invoice', value: meta.invoiceId },
      meta.transactionId && { label: 'Transaksi', value: meta.transactionId },
      meta.issuedAt && {
        label: 'Diterbitkan',
        value: new Date(meta.issuedAt).toLocaleString(undefined, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }),
      },
    ];

    const totalsRows = [
      meta.subtotal && { label: 'Subtotal', value: formatCurrency(meta.subtotal, currency) },
      meta.tax && { label: 'Pajak', value: formatCurrency(meta.tax, currency) },
      meta.discount && { label: 'Diskon', value: `- ${formatCurrency(meta.discount, currency)}` },
      meta.total && { label: 'Total', value: formatCurrency(meta.total, currency) },
    ];

    const itemsRows = items.map((item) => ({
      label: item.label,
      value: formatCurrency(item.amount, currency),
      meta: item.notes,
    }));

    const methodRows = [
      meta.method && { label: 'Metode', value: meta.method },
      meta.methodDetails?.network && { label: 'Jaringan', value: meta.methodDetails.network },
      meta.methodDetails?.country && { label: 'Negara', value: meta.methodDetails.country },
    ];

    const billingRows = [
      meta.billing?.name && { label: 'Nama', value: meta.billing.name },
      meta.billing?.email && { label: 'Email', value: meta.billing.email },
      meta.billing?.address && { label: 'Alamat', value: meta.billing.address },
    ];

    const attemptRows =
      meta.attempts?.map((attempt) => ({
        label: attempt.label,
        value: attempt.result,
        meta: attempt.time
          ? new Date(attempt.time).toLocaleString(undefined, {
              day: 'numeric',
              month: 'short',
              hour: 'numeric',
              minute: '2-digit',
            })
          : undefined,
      })) || [];

    const nextStepRows = meta.nextSteps?.map((step, idx) => ({
      label: `Langkah ${idx + 1}`,
      value: step,
    }));

    return [
      { title: 'Ringkasan Pembayaran', rows: summaryRows.filter(Boolean) },
      { title: 'Rincian Layanan', rows: itemsRows.filter(Boolean) },
      { title: 'Perincian Total', rows: totalsRows.filter(Boolean) },
      { title: 'Metode & Jaringan', rows: methodRows.filter(Boolean) },
      { title: 'Informasi Billing', rows: billingRows.filter(Boolean) },
      ...(attemptRows.length ? [{ title: 'Riwayat Percobaan', rows: attemptRows }] : []),
      ...(nextStepRows?.length ? [{ title: 'Tindak Lanjut', rows: nextStepRows }] : []),
      ...(meta.reason ? [{ title: 'Alasan Penolakan', rows: [{ label: '', value: meta.reason }] }] : []),
    ].filter((section) => section.rows.length);
  }, [currency, meta]);

  const methodCard = meta.methodDetails ? (
    <PaymentMethodCard method={meta.method} details={meta.methodDetails} />
  ) : null;

  return (
    <NotificationDetailLayout
      notification={notification}
      sections={sections}
      heroExtras={heroExtras}
      footer={methodCard}
      ctaLabel={isFailed ? 'Perbarui metode pembayaran' : notification?.cta?.label}
    />
  );
};

const styles = StyleSheet.create({
  heroStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginTop: 18,
  },
  heroStat: {
    flex: 1,
  },
  heroStatLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    letterSpacing: 0.4,
  },
  heroStatValue: {
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
  methodCard: {
    marginTop: 12,
    marginHorizontal: 4,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
  },
  methodLabel: {
    color: '#4338CA',
    fontWeight: '600',
    marginBottom: 4,
  },
  methodValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  methodMeta: {
    color: '#6366F1',
    marginTop: 4,
  },
});

export default NotificationPaymentDetailScreen;
