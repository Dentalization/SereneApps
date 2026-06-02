import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, StatusBar, Linking, BackHandler, AppState, StyleSheet, Alert } from 'react-native';
import { Text, Button, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatCurrency } from '../../../utils/formatters';
import { createSnapTransaction, getPaymentStatus, reconcilePayment } from '../../../services/paymentService';
import ValidationToast from '../../settings/components/ValidationToast';
import useToast from '../../../hooks/useToast';
import { useI18n } from '../../../hooks/useI18n';
import { colors as THEME_COLORS, withOpacity } from '../../../theme/colors';
import { typography as TYPOGRAPHY } from '../../../theme/dimensions';

const COLORS = THEME_COLORS;

const PaymentScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { toast, showToast, hideToast } = useToast();
  const { t } = useI18n();

  // Params from BookingConfirm
  const { appointmentId, dentist, slot, date, fee, paymentMethod, type } = route.params || {};
  const isVirtual = type === 'virtual';

  // State
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState(null);
  const [redirectUrl, setRedirectUrl] = useState(null);
  const [status, setStatus] = useState('pending');
  const [polling, setPolling] = useState(false);
  const [expiresAt, setExpiresAt] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(15 * 60);

  const pollInterval = useRef(null);
  const appState = useRef(AppState.currentState);
  const paymentIntentIdRef = useRef(paymentIntentId);
  const mountedRef = useRef(true);

  // Keep ref in sync
  useEffect(() => { paymentIntentIdRef.current = paymentIntentId; }, [paymentIntentId]);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const stopPolling = useCallback(() => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
    }
    setPolling(false);
  }, []);

  const initPayment = useCallback(async () => {
    if (!appointmentId) return;
    try {
      setLoading(true);
      setStatus('pending');
      const result = await createSnapTransaction(appointmentId);

      setPaymentIntentId(result.paymentIntentId);
      setRedirectUrl(result.redirectUrl);
      const expiry = result.expiresAt || result.expiryTime || result.metadata?.expiresAt;
      const expiryDate = expiry ? new Date(expiry) : new Date(Date.now() + 15 * 60 * 1000);
      setExpiresAt(expiryDate);
      setRemainingSeconds(Math.max(0, Math.floor((expiryDate.getTime() - Date.now()) / 1000)));

      setLoading(false);
      setPolling(true);
    } catch (error) {
      if (error.message === 'Payment already completed or processing for this appointment') {
        setStatus('succeeded');
        handleSuccess();
        return;
      }
      if (__DEV__) console.error('[PaymentScreen] Init error:', error);
      setLoading(false);
      setStatus('error');
      showToast(error.message || 'Gagal menyiapkan pembayaran', 'error');
    }
  }, [appointmentId, showToast]);

  // 1. Initialize Transaction
  useEffect(() => {
    initPayment();
  }, [initPayment]);

  useEffect(() => {
    if (!expiresAt || status !== 'pending') return undefined;
    const timer = setInterval(() => {
      const seconds = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setRemainingSeconds(seconds);
      if (seconds <= 0) {
        clearInterval(timer);
        stopPolling();
        setStatus('expired');
        Alert.alert('Waktu pembayaran habis', 'Ingin mencoba lagi?', [
          { text: 'Batal', style: 'cancel', onPress: () => navigation.navigate('AppointmentList') },
          { text: 'Coba Lagi', onPress: initPayment },
        ]);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt, initPayment, navigation, status, stopPolling]);

  // 2. AppState Listener for Foreground Reconcile (uses ref to avoid stale closure)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        if (__DEV__) console.log('[PaymentScreen] App came to foreground, reconciling...');
        // Use ref to always have latest paymentIntentId
        if (paymentIntentIdRef.current && mountedRef.current) {
          handleSync();
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // 3. Status Polling (10s interval, only when active)
  useEffect(() => {
    if (polling && paymentIntentId) {
      pollInterval.current = setInterval(async () => {
        // Only poll if we are in foreground
        if (AppState.currentState !== 'active') return;

        try {
          const result = await getPaymentStatus(paymentIntentId);
          if (__DEV__) console.log('[PaymentScreen] Polling status:', result.status);
          handleStatusChange(result.status);
        } catch (error) {
          if (__DEV__) console.log('[PaymentScreen] Poll error:', error.message);
        }
      }, 10000); // Increased to 10s
    }

    return () => stopPolling();
  }, [polling, paymentIntentId]);

  const handleStatusChange = (newStatus) => {
    const successStatuses = ['paid', 'settled', 'succeeded', 'settlement', 'capture'];
    const expiredStatuses = ['expired', 'expire'];
    const failureStatuses = ['failed', 'cancelled', 'deny', 'cancel'];

    if (successStatuses.includes(newStatus)) {
      stopPolling();
      setStatus('succeeded');
      handleSuccess();
      return true;
    } else if (expiredStatuses.includes(newStatus)) {
      stopPolling();
      setStatus('expired');
      return true;
    } else if (failureStatuses.includes(newStatus)) {
      stopPolling();
      setStatus('failed');
      handleFailure(newStatus);
      return true;
    }
    return false;
  };

  const handleSync = async () => {
    if (!paymentIntentId || checking) return;
    try {
      setChecking(true);
      // Try reconciliation first (checks with provider)
      if (__DEV__) console.log('[PaymentScreen] Syncing transaction...');
      const result = await reconcilePayment(paymentIntentId);

      const wasFinal = handleStatusChange(result.newStatus);

      if (!wasFinal) {
        // If still pending after sync, start/resume lower-freq polling
        if (!polling) setPolling(true);
        showToast('Pembayaran belum diterima. Silakan cek lagi nanti.', 'warning');
      }
    } catch (error) {
      if (__DEV__) console.error('[PaymentScreen] Sync error:', error);
      // Fallback to simple status check
      try {
        const result = await getPaymentStatus(paymentIntentId);
        handleStatusChange(result.status);
      } catch (e) { }
    } finally {
      setChecking(false);
    }
  };

  const handleSuccess = () => {
    navigation.navigate('BookingSuccess', {
      appointmentId,
      dentist,
      slot,
      date,
      fee,
      bookingId: `SRN-${appointmentId.toString().slice(-6).toUpperCase()}`,
    });
  };

  const handleFailure = (reason) => {
    navigation.navigate('BookingFailed', {
      errorType: 'payment_failed',
      errorCode: reason,
      dentist,
      slot,
      date,
      fee,
    });
  };

  const handleOpenPayment = () => {
    if (redirectUrl) Linking.openURL(redirectUrl);
  };

  const canRetryPayment = ['expired', 'failed', 'deny', 'cancel', 'error'].includes(status);
  const canOpenPayment = Boolean(redirectUrl) && !loading && !['expired', 'failed', 'deny', 'cancel', 'error'].includes(status);
  const timerLabel = `${Math.floor(remainingSeconds / 60).toString().padStart(2, '0')}:${(remainingSeconds % 60).toString().padStart(2, '0')}`;

  // Prevent accidental back navigation during active payment session
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (status === 'pending') {
          Alert.alert(
            'Pembayaran Sedang Berlangsung',
            'Anda yakin ingin kembali? Anda bisa melanjutkan pembayaran nanti melalui menu "Appointments".',
            [
              { text: 'Tetap di Sini', style: 'cancel' },
              {
                text: 'Kembali',
                style: 'destructive',
                onPress: () => {
                  stopPolling();
                  navigation.goBack();
                },
              },
            ]
          );
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [status, navigation, stopPolling])
  );

  if (loading && !paymentIntentId) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surface }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ ...TYPOGRAPHY.bodyLarge, marginTop: 16 }}>
          {t('mobile.payment.preparing', { fallbackText: 'Menyiapkan gerbang pembayaran...' })}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <StatusBar barStyle='light-content' />

      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryLight]}
        style={{ paddingTop: insets.top + 20, paddingBottom: 40, paddingHorizontal: 20, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
          <TouchableOpacity
            onPress={() => {
              if (status === 'pending') {
                Alert.alert(
                  'Pembayaran Sedang Berlangsung',
                  'Anda yakin ingin kembali? Anda bisa melanjutkan pembayaran nanti melalui menu "Appointments".',
                  [
                    { text: 'Tetap di Sini', style: 'cancel' },
                    {
                      text: 'Kembali',
                      style: 'destructive',
                      onPress: () => {
                        stopPolling();
                        navigation.goBack();
                      },
                    },
                  ]
                );
              } else {
                navigation.goBack();
              }
            }}
            accessibilityLabel="Kembali"
            accessibilityRole="button"
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: withOpacity(COLORS.white, 0.2), justifyContent: 'center', alignItems: 'center' }}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.surfaceElevated} />
          </TouchableOpacity>
          <Text style={{ ...TYPOGRAPHY.h3, color: COLORS.surfaceElevated, marginLeft: 16 }}>
            {t('mobile.payment.title', { fallbackText: 'Pembayaran' })}
          </Text>
        </View>

        <View style={{ alignItems: 'center' }}>
          <Text style={{ ...TYPOGRAPHY.caption, color: withOpacity(COLORS.white, 0.8), textTransform: 'uppercase', letterSpacing: 1 }}>TOTAL PEMBAYARAN</Text>
          <Text style={{ ...TYPOGRAPHY.h1, color: COLORS.surfaceElevated, fontSize: 32, marginTop: 4 }}>{formatCurrency(fee)}</Text>
          <View style={{ marginTop: 12, borderRadius: 999, backgroundColor: remainingSeconds <= 5 * 60 ? COLORS.error : COLORS.warning, paddingHorizontal: 14, paddingVertical: 7, flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name="timer-sand" size={16} color={COLORS.white} />
            <Text style={{ marginLeft: 6, color: COLORS.white, fontWeight: '900' }}>{timerLabel}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {/* Status Card */}
        <View style={{ backgroundColor: COLORS.surfaceElevated, borderRadius: 24, padding: 20, marginBottom: 24, shadowColor: COLORS.textPrimary, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: withOpacity(COLORS.primary, 0.1), justifyContent: 'center', alignItems: 'center' }}>
              <MaterialCommunityIcons name="clock-outline" size={24} color={COLORS.primary} />
            </View>
            <View style={{ marginLeft: 16 }}>
              <Text style={{ ...TYPOGRAPHY.bodyLarge, fontWeight: '700', color: COLORS.textPrimary }}>
                {status === 'expired'
                  ? t('mobile.payment.expiredTitle', { fallbackText: 'Pembayaran Kedaluwarsa' })
                  : t('mobile.payment.pendingTitle', { fallbackText: 'Menunggu Pembayaran' })}
              </Text>
              <Text style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary }}>Selesaikan pembayaran sebelum waktu habis</Text>
            </View>
          </View>

          <Text style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, lineHeight: 20 }}>
            Silakan selesaikan pembayaran Anda melalui gerbang pembayaran aman Midtrans menggunakan metode {paymentMethod === 'card' ? 'Kartu Kredit/Debit' : paymentMethod === 'va' ? 'Virtual Account' : 'yang dipilih'}.
          </Text>

          <Button
            mode="contained"
            onPress={handleOpenPayment}
            disabled={!canOpenPayment}
            style={{ marginTop: 20, borderRadius: 12 }}
            buttonColor={COLORS.primary}
            contentStyle={{ height: 48 }}
            accessibilityLabel="Buka Pembayaran Midtrans"
          >
            {t('mobile.payment.openPayment', { fallbackText: 'Buka Pembayaran Midtrans' })}
          </Button>
          {canRetryPayment && (
            <Button
              mode="text"
              onPress={initPayment}
              style={{ marginTop: 8 }}
              textColor={COLORS.primary}
            >
              {t('mobile.payment.retryPayment', { fallbackText: 'Coba buat transaksi baru' })}
            </Button>
          )}
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={{ ...TYPOGRAPHY.bodyLarge, fontWeight: '700', color: COLORS.textPrimary }}>Ringkasan Pesanan</Text>
        </View>

        <LinearGradient
          colors={[withOpacity(COLORS.primary, 0.05), COLORS.surfaceElevated]}
          style={{ borderRadius: 24, padding: 18, marginBottom: 22, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 4 }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <View>
              <Text style={{ ...TYPOGRAPHY.h5, color: COLORS.textPrimary }}>{new Date(date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
              <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 2 }}>{slot?.time || '—'} WIB</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons name={isVirtual ? 'video' : 'map-marker'} size={16} color={COLORS.primary} />
                <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textMuted, marginLeft: 4 }}>{isVirtual ? 'Konsultasi Video Online' : 'Tatap muka'}</Text>
                {isVirtual && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.success, marginLeft: 6 }} />}
              </View>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 52, height: 52, borderRadius: 20, backgroundColor: withOpacity(COLORS.primary, 0.1), alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <MaterialCommunityIcons name='account-heart' size={26} color={COLORS.primary} />
            </View>
            <View>
              <Text style={{ ...TYPOGRAPHY.h5, color: COLORS.textPrimary }}>{isVirtual ? 'Menunggu Pembayaran' : dentist?.name}</Text>
              <Text style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, marginTop: 2 }}>{isVirtual ? 'Dokter akan ditugaskan otomatis' : dentist?.specialty}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Action Controls */}
        <View style={{ marginTop: 32, alignItems: 'center' }}>
          <Button
            mode="outlined"
            onPress={handleSync}
            loading={checking}
            disabled={checking}
            style={{ borderRadius: 12, borderColor: COLORS.primary, borderWidth: 1.5, width: '100%' }}
            labelStyle={{ fontWeight: '700', color: COLORS.primary }}
            accessibilityLabel="Cek Status Pembayaran Manual"
          >
            CEK STATUS PEMBAYARAN
          </Button>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
            <ActivityIndicator animating={polling && !checking} size={12} color={COLORS.textMuted} style={{ marginRight: 8 }} />
            <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textMuted }}>
              {polling ? 'Pengecekan otomatis berjalan (10s)...' : 'Gunakan tombol di atas jika sudah bayar'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {(loading || checking) && (
        <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: withOpacity(COLORS.white, 0.7), justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          {checking && <Text style={{ ...TYPOGRAPHY.bodySmall, marginTop: 12, color: COLORS.primary, fontWeight: '600' }}>Menyinkronkan status...</Text>}
        </View>
      )}

      <ValidationToast
        visible={toast.visible}
        message={toast.message}
        status={toast.status}
        onDismiss={hideToast}
      />
    </View>
  );
};

export default PaymentScreen;
