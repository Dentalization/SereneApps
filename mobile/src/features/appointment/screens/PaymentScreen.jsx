import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, StatusBar, Image } from 'react-native';
import { Text, Button, RadioButton, useTheme, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { formatCurrency } from '../../../utils/formatters';
import useAnchoredHeaderHeight from '../../../hooks/useAnchoredHeaderHeight';
import ValidationToast from '../../settings/components/ValidationToast';
import useToast from '../../../hooks/useToast';
import { createAppointment } from '../../../services/appointmentService';
import { syncAIAnalysisHistory } from '../../../services/aiAnalysisSyncService';

const PAYMENT_METHODS = [
  {
    id: 'card',
    category: 'Kartu',
    icon: 'credit-card',
    options: [
      { id: 'visa', name: 'Visa / Mastercard', icon: 'credit-card-outline' },
      { id: 'jcb', name: 'JCB', icon: 'credit-card' },
    ],
  },
  {
    id: 'ewallet',
    category: 'E-Wallet',
    icon: 'wallet',
    options: [
      { id: 'gopay', name: 'GoPay', color: '#00AED6' },
      { id: 'ovo', name: 'OVO', color: '#4C3494' },
      { id: 'dana', name: 'DANA', color: '#108EE9' },
      { id: 'shopeepay', name: 'ShopeePay', color: '#EE4D2D' },
    ],
  },
  {
    id: 'va',
    category: 'Virtual Account',
    icon: 'bank',
    options: [
      { id: 'bca', name: 'BCA Virtual Account' },
      { id: 'bni', name: 'BNI Virtual Account' },
      { id: 'bri', name: 'BRI Virtual Account' },
      { id: 'mandiri', name: 'Mandiri Virtual Account' },
    ],
  },
  {
    id: 'cash',
    category: 'Bayar di Klinik',
    icon: 'cash',
    options: [
      { id: 'cash', name: 'Bayar langsung di klinik' },
    ],
  },
];

const PaymentScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  // Get AI analysis history from Redux store
  const aiHistory = useSelector(state => state.ai?.history || []);

  const { toast, showToast, hideToast } = useToast();

  // Data from BookingConfirmScreen
  const dentist = route.params?.dentist;
  const slot = route.params?.slot;
  const selectedDate = route.params?.date;
  const type = route.params?.type || 'onsite';
  const service = route.params?.service || null;
  const notes = route.params?.notes || '';
  const reminder = route.params?.reminder || 30;
  const fee = (service?.price != null ? service.price : null)
    ?? route.params?.fee
    ?? slot?.raw?.fee
    ?? dentist?.consultationFee
    ?? 350000;
  const paymentMethodFromConfirm = route.params?.paymentMethod || 'card';

  const [selectedCategory, setSelectedCategory] = useState(paymentMethodFromConfirm);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [countdown, setCountdown] = useState(null);

  const { headerHeight, handleHeaderLayout } = useAnchoredHeaderHeight(200);

  const summaryDate = new Date(selectedDate);
  const dateLabel = summaryDate.toLocaleDateString('id-ID', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long',
    year: 'numeric'
  });
  const slotTime = slot?.time || summaryDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  // Admin/service fee
  const adminFee = 5000;
  const totalFee = fee + adminFee;

  const handlePayment = async () => {
    if (!selectedPayment) {
      showToast('Silakan pilih metode pembayaran', 'error');
      return;
    }

    setProcessing(true);

    try {
      // Extract date and time for API
      const bookingDate = new Date(selectedDate);
      const dateStr = bookingDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const timeStr = slot?.time || bookingDate.toTimeString().slice(0, 5); // HH:mm

      // Get IDs from dentist object
      // dentist.id is the user_id from dentist_profiles
      // clinicContext.profileId is the clinic_profile_id
      const dentistId = dentist?.id || dentist?.userId;
      const clinicId = dentist?.clinicContext?.profileId || 
                       dentist?.clinicContext?.branchId || 
                       dentist?.clinicId || 
                       dentist?.clinic?.id;

      // Check if this is an independent dentist (no clinic)
      const isIndependentDentist = !clinicId;

      if (!dentistId) {
        throw new Error('Informasi dokter tidak lengkap');
      }

      // Only require clinic_id for non-independent dentists
      // Independent dentists can book without a clinic
      if (!isIndependentDentist && !clinicId) {
        throw new Error('Informasi klinik tidak lengkap');
      }

      console.log('[Payment] Creating appointment:', {
        dentist_id: dentistId,
        clinic_id: clinicId,
        is_independent: isIndependentDentist,
        date: dateStr,
        time: timeStr,
        dentist_name: dentist?.name,
        clinic_name: dentist?.clinicContext?.name || dentist?.clinic,
      });

      // Call backend API to create appointment
      // clinic_id can be null for independent dentists
      const response = await createAppointment({
        dentist_id: dentistId,
        clinic_id: clinicId || null, // null for independent dentists
        date: dateStr,
        time: timeStr,
        duration: service?.durationMinutes || service?.duration || 60,
        type: type, // 'virtual' or 'onsite'
        reason: service?.name || notes || 'Konsultasi Gigi',
        notes: notes,
        metadata: {
          serviceId: service?.id || null,
          serviceName: service?.name || null,
          servicePrice: service?.price ?? null,
          serviceDurationMinutes: service?.durationMinutes || service?.duration || null,
          paymentMethod: selectedPayment,
        },
      });

      console.log('[Payment] Appointment created:', response);

      // Sync AI analysis history to backend (if any)
      // This ensures dentist can see patient's AI diagnosis results
      if (aiHistory.length > 0) {
        try {
          console.log('[Payment] Syncing AI analysis to backend...');
          const syncResult = await syncAIAnalysisHistory(aiHistory.slice(0, 5)); // Sync last 5 results
          console.log('[Payment] AI analysis synced:', syncResult);
        } catch (syncError) {
          // Don't fail the booking if sync fails, just log it
          console.warn('[Payment] Failed to sync AI analysis:', syncError.message);
        }
      }

      setProcessing(false);
      
      // Generate booking code from appointment ID
      const appointmentId = response.data?.id || Date.now();
      const bookingCode = `SRN-${String(appointmentId).padStart(6, '0')}`;

      // Navigate to success screen
      navigation.navigate('BookingSuccess', {
        dentist,
        slot,
        date: selectedDate,
        type,
        service,
        notes,
        reminder,
        fee: totalFee,
        paymentMethod: selectedPayment,
        bookingId: bookingCode,
        appointmentData: response.data, // Pass full appointment data
      });
    } catch (error) {
      setProcessing(false);
      
      // Map backend error codes to user-friendly error types
      const backendCode = error.code || '';
      let errorType = 'payment_failed';
      let errorCode = 'PAY_001';
      let friendlyMessage = error.message;
      
      if (backendCode === 'cannot_book_past') {
        errorType = 'slot_unavailable';
        errorCode = 'SLT_002';
        friendlyMessage = error.message; // Already localized from backend
      } else if (backendCode === 'slot_taken') {
        errorType = 'slot_unavailable';
        errorCode = 'SLT_001';
      } else if (backendCode === 'invalid_time' || backendCode === 'invalid_duration') {
        errorType = 'slot_unavailable';
        errorCode = 'SLT_003';
      } else if (error.message?.includes('network') || error.message?.includes('Network')) {
        errorType = 'network_error';
        errorCode = 'NET_001';
      } else if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
        errorType = 'timeout';
        errorCode = 'TMO_001';
      } else if (error.message?.includes('slot') || error.message?.includes('unavailable')) {
        errorType = 'slot_unavailable';
        errorCode = 'SLT_001';
      }
      
      // Navigate to failed screen — no raw error shown, handled by BookingFailedScreen
      navigation.navigate('BookingFailed', {
        dentist,
        slot,
        date: selectedDate,
        type,
        fee: totalFee,
        errorType,
        errorCode,
        errorMessage: friendlyMessage,
      });
    }
  };

  const selectedCategoryData = PAYMENT_METHODS.find(m => m.id === selectedCategory);

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Toast */}
      <ValidationToast toast={toast} onDismiss={hideToast} />

      {/* Header */}
      <View
        onLayout={handleHeaderLayout}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, elevation: 10 }}
      >
        <LinearGradient
          colors={['#7C3AED', '#A855F7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: insets.top + 10,
            paddingHorizontal: 20,
            paddingBottom: 28,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
            </TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Langkah 3/3</Text>
              <Text style={{ color: 'white', fontSize: 18, fontWeight: '700', marginTop: 4 }}>
                Pembayaran
              </Text>
            </View>
            <View style={{ width: 44 }} />
          </View>

          {/* Progress Indicator */}
          <View style={{ marginTop: 20 }}>
            <ProgressIndicator current={3} />
          </View>
        </LinearGradient>
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={{ paddingTop: headerHeight + 16, paddingBottom: 180 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 20 }}>
          {/* Order Summary Card */}
          <View
            style={{
              backgroundColor: 'white',
              borderRadius: 20,
              padding: 16,
              marginBottom: 20,
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.06,
              shadowRadius: 12,
              elevation: 3,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 12 }}>
              Ringkasan Pesanan
            </Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 16,
                  backgroundColor: '#EEF2FF',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <MaterialCommunityIcons name="doctor" size={24} color="#7C3AED" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600', color: '#0F172A' }}>{dentist?.name}</Text>
                <Text style={{ color: '#64748B', fontSize: 13 }}>{dentist?.specialty}</Text>
              </View>
            </View>

            <View style={{ borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 }}>
              <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                <MaterialCommunityIcons name="calendar" size={16} color="#64748B" />
                <Text style={{ marginLeft: 8, color: '#475569', flex: 1 }}>{dateLabel}</Text>
              </View>
              <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                <MaterialCommunityIcons name="clock-outline" size={16} color="#64748B" />
                <Text style={{ marginLeft: 8, color: '#475569', flex: 1 }}>{slotTime} WIB</Text>
              </View>
              <View style={{ flexDirection: 'row' }}>
                <MaterialCommunityIcons 
                  name={type === 'virtual' ? 'video' : 'map-marker'} 
                  size={16} 
                  color="#64748B" 
                />
                <Text style={{ marginLeft: 8, color: '#475569', flex: 1 }}>
                  {type === 'virtual' ? 'Konsultasi Virtual' : 'Kunjungan Tatap Muka'}
                </Text>
              </View>
            </View>
          </View>

          {/* Payment Method Selection */}
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 16 }}>
            Pilih Metode Pembayaran
          </Text>

          {/* Category Tabs */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 16 }}
          >
            {PAYMENT_METHODS.map((method) => (
              <TouchableOpacity
                key={method.id}
                onPress={() => {
                  setSelectedCategory(method.id);
                  setSelectedPayment(null);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 20,
                  backgroundColor: selectedCategory === method.id ? '#7C3AED' : 'white',
                  marginRight: 10,
                  borderWidth: 1,
                  borderColor: selectedCategory === method.id ? '#7C3AED' : '#E2E8F0',
                }}
              >
                <MaterialCommunityIcons
                  name={method.icon}
                  size={18}
                  color={selectedCategory === method.id ? 'white' : '#64748B'}
                />
                <Text
                  style={{
                    marginLeft: 8,
                    fontWeight: '600',
                    color: selectedCategory === method.id ? 'white' : '#475569',
                  }}
                >
                  {method.category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Payment Options */}
          <View
            style={{
              backgroundColor: 'white',
              borderRadius: 20,
              padding: 4,
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.06,
              shadowRadius: 12,
              elevation: 3,
            }}
          >
            {selectedCategoryData?.options.map((option, index) => (
              <TouchableOpacity
                key={option.id}
                onPress={() => setSelectedPayment(option.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 16,
                  borderBottomWidth: index < selectedCategoryData.options.length - 1 ? 1 : 0,
                  borderBottomColor: '#F1F5F9',
                  backgroundColor: selectedPayment === option.id ? '#F5F3FF' : 'transparent',
                  borderRadius: 16,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: option.color ? option.color + '20' : '#F1F5F9',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  <MaterialCommunityIcons
                    name={option.icon || selectedCategoryData.icon}
                    size={20}
                    color={option.color || '#64748B'}
                  />
                </View>
                <Text style={{ flex: 1, fontWeight: '500', color: '#0F172A' }}>
                  {option.name}
                </Text>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    borderWidth: 2,
                    borderColor: selectedPayment === option.id ? '#7C3AED' : '#CBD5E1',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {selectedPayment === option.id && (
                    <View
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: '#7C3AED',
                      }}
                    />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Fee Breakdown */}
          <View
            style={{
              backgroundColor: 'white',
              borderRadius: 20,
              padding: 16,
              marginTop: 20,
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.06,
              shadowRadius: 12,
              elevation: 3,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 12 }}>
              Rincian Biaya
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: '#64748B' }}>Biaya konsultasi</Text>
              <Text style={{ fontWeight: '500', color: '#0F172A' }}>{formatCurrency(fee)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ color: '#64748B' }}>Biaya layanan</Text>
              <Text style={{ fontWeight: '500', color: '#0F172A' }}>{formatCurrency(adminFee)}</Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                borderTopWidth: 1,
                borderTopColor: '#F1F5F9',
                paddingTop: 12,
              }}
            >
              <Text style={{ fontWeight: '700', color: '#0F172A' }}>Total Pembayaran</Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#7C3AED' }}>
                {formatCurrency(totalFee)}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Payment Button */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: 20,
          paddingBottom: insets.bottom + 20,
          backgroundColor: 'white',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 10,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={{ color: '#64748B' }}>Total Pembayaran</Text>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#0F172A' }}>
            {formatCurrency(totalFee)}
          </Text>
        </View>
        <Button
          mode="contained"
          icon={processing ? undefined : 'lock'}
          onPress={handlePayment}
          disabled={!selectedPayment || processing}
          loading={processing}
          style={{ borderRadius: 16 }}
          contentStyle={{ paddingVertical: 6 }}
          labelStyle={{ fontWeight: '700', fontSize: 16 }}
        >
          {processing ? 'Memproses...' : 'Bayar Sekarang'}
        </Button>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 }}>
          <MaterialCommunityIcons name="shield-check" size={14} color="#22C55E" />
          <Text style={{ marginLeft: 6, fontSize: 12, color: '#64748B' }}>
            Pembayaran aman & terenkripsi
          </Text>
        </View>
      </View>
    </View>
  );
};

const ProgressIndicator = ({ current }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
    {['Pilih slot', 'Konfirmasi', 'Bayar'].map((label, index) => {
      const step = index + 1;
      const active = step <= current;
      const completed = step < current;
      return (
        <View key={label} style={{ alignItems: 'center', flex: 1 }}>
          <LinearGradient
            colors={active ? ['#FDE68A', '#FBBF24'] : ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {completed ? (
              <MaterialCommunityIcons name="check" size={18} color="#78350F" />
            ) : (
              <Text style={{ color: active ? '#78350F' : '#E5E7EB', fontWeight: '700' }}>{step}</Text>
            )}
          </LinearGradient>
          <Text style={{ marginTop: 6, fontSize: 12, color: active ? 'white' : 'rgba(255,255,255,0.7)' }}>
            {label}
          </Text>
        </View>
      );
    })}
  </View>
);

export default PaymentScreen;
