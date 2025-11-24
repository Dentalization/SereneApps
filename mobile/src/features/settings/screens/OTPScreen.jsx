import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  TextInput as RNTextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, ProgressBar, Text, useTheme } from 'react-native-paper';
import ValidationToast from '../components/ValidationToast';
import { useDispatch, useSelector } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AuthHero from '../components/AuthHero';
import { otpSchema } from '../../../utils/validation';
import { otpVerified } from '../../../store/slices/authSlice';

const OTPScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const storedPhone = useSelector((state) => state.auth.phoneNumber);
  const phoneNumber = route?.params?.phoneNumber || storedPhone || '+628';
  const [otp, setOtp] = useState('');
  const [errors, setErrors] = useState({});
  const [timer, setTimer] = useState(60);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (timer === 0) return undefined;
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const formattedTimer = useMemo(() => `00:${timer.toString().padStart(2, '0')}`, [timer]);

  const progress = useMemo(() => timer / 60, [timer]);

  const handleChange = (value) => {
    const sanitized = value.replace(/[^0-9]/g, '').slice(0, 6);
    setOtp(sanitized);
    if (errors.otp) {
      setErrors({});
    }
  };

  const handleVerify = () => {
    const check = otpSchema.safeParse(otp);
    if (!check.success) {
      setErrors({ otp: check.error.issues?.[0]?.message || 'Kode OTP tidak valid' });
      return;
    }

    setLoading(true);
    setTimeout(() => {
      dispatch(otpVerified({ phoneNumber }));
      setLoading(false);
      setSnackbar({ visible: true, message: 'Verifikasi berhasil. Lengkapi profil Anda sekarang.' });
      navigation.navigate('Login');
    }, 500);
  };

  const handleResend = () => {
    setTimer(60);
    setSnackbar({ visible: true, message: `Kode baru dikirim ke ${phoneNumber}` });
  };

  return (
    // PERBAIKAN: Ganti SafeAreaView dengan View + paddingTop manual
    <View style={[styles.safeArea, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 48 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <AuthHero
          title="Konfirmasi nomor Anda"
          subtitle={`Kami mengirim kode verifikasi ke ${phoneNumber}. Pastikan nomor aktif.`}
          badgeLabel="Verifikasi keamanan"
          highlights={[
            { icon: 'clock-outline', label: 'Kedaluwarsa', value: formattedTimer },
            { icon: 'shield-key', label: 'Status', value: 'Terenkripsi' },
          ]}
        />

        <Card style={[styles.card, theme?.shadows?.lg]}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.cardTitle}>
              Masukkan 6 digit kode
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Jika Anda tidak menerima kode dalam 60 detik, ketuk kirim ulang untuk mencoba lagi.
            </Text>

            <ProgressBar
              progress={progress}
              color={theme.colors.primary}
              style={styles.progressBar}
            />

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => inputRef.current?.focus()}
              style={styles.otpTouchArea}
            >
              <View style={styles.otpRow}>
                {[...Array(6)].map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.otpBox,
                      errors.otp && { borderColor: theme.colors.error },
                      index !== 5 && styles.otpSpacing,
                    ]}
                  >
                    <Text variant="titleLarge" style={styles.otpValue}>
                      {otp[index] || '•'}
                    </Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
            <RNTextInput
              ref={inputRef}
              style={styles.hiddenInput}
              keyboardType="number-pad"
              value={otp}
              onChangeText={handleChange}
              maxLength={6}
              autoFocus
            />
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              {errors.otp || ' '}
            </Text>

            <View style={styles.deviceCard}>
              <MaterialCommunityIcons
                name="cellphone-information"
                size={22}
                color={theme.colors.primary}
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text variant="titleSmall">Aktifkan notifikasi SMS</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Supaya verifikasi berikutnya lebih cepat dan tidak tertahan di spam.
                </Text>
              </View>
              <Button compact mode="text" onPress={() => navigation.navigate('Register')}>
                Ubah
              </Button>
            </View>

            <Button
              mode="contained"
              onPress={handleVerify}
              loading={loading}
              style={styles.primaryButton}
            >
              Verifikasi kode
            </Button>

            <Button
              mode="outlined"
              icon="refresh"
              disabled={timer > 0}
              onPress={handleResend}
            >
              Kirim ulang kode
            </Button>

            <Button
              mode="text"
              onPress={() => navigation.navigate('Register')}
              style={styles.secondaryAction}
            >
              Nomor salah? Daftar ulang
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>

      <ValidationToast
        visible={snackbar.visible}
        message={snackbar.message}
        onDismiss={() => setSnackbar({ visible: false, message: '' })}
        status="info"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    paddingVertical: 24,
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 28,
    paddingVertical: 16,
  },
  cardTitle: {
    marginBottom: 8,
    fontWeight: '700',
  },
  progressBar: {
    marginVertical: 20,
    borderRadius: 999,
  },
  otpTouchArea: {
    marginBottom: 8,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  otpBox: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  otpSpacing: {
    marginRight: 8,
  },
  otpValue: {
    letterSpacing: 2,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 0,
    width: 0,
  },
  errorText: {
    minHeight: 20,
    marginBottom: 8,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 191, 166, 0.1)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  primaryButton: {
    marginBottom: 12,
  },
  secondaryAction: {
    marginTop: 4,
  },
});

export default OTPScreen;