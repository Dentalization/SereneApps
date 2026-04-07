import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  TextInput as RNTextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, ProgressBar, Text, TextInput, useTheme } from 'react-native-paper';
import ValidationToast from '../components/ValidationToast';
import { useDispatch, useSelector } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AuthHero from '../components/AuthHero';
import { otpSchema, phoneSchema } from '../../../utils/validation';
import { otpVerified, setPhoneNumber } from '../../../store/slices/authSlice';
import { requestSmsOtp, resendSmsOtp, verifySmsOtp } from '../../../services/authService';

const DEFAULT_PHONE_PREFIX = '+628';

const OTP_STATUS_BY_CODE = {
  OTP_COOLDOWN_ACTIVE: 'warning',
  OTP_RATE_LIMITED: 'warning',
  OTP_EXPIRED: 'warning',
  OTP_LOCKED: 'error',
  OTP_INVALID: 'error',
};

const secondsUntil = (target) => {
  if (!target) return 0;
  const parsedTime = new Date(target).getTime();
  if (Number.isNaN(parsedTime)) return 0;
  return Math.max(0, Math.ceil((parsedTime - Date.now()) / 1000));
};

const OTPScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const storedPhone = useSelector((state) => state.auth.phoneNumber);
  const initialPhone = route?.params?.phoneNumber || storedPhone || DEFAULT_PHONE_PREFIX;
  const purpose = route?.params?.purpose || 'login';
  const autoSend = route?.params?.autoSend !== false;

  const [phoneNumber, setPhoneNumberValue] = useState(initialPhone);
  const [otp, setOtp] = useState('');
  const [errors, setErrors] = useState({});
  const [challengeId, setChallengeId] = useState(route?.params?.challengeId || null);
  const [cooldownUntil, setCooldownUntil] = useState(route?.params?.cooldownUntil || null);
  const [timer, setTimer] = useState(secondsUntil(route?.params?.cooldownUntil));
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', status: 'info' });
  const [loading, setLoading] = useState(false);

  const inputRef = useRef(null);
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    if (!cooldownUntil) {
      setTimer(0);
      return undefined;
    }

    setTimer(secondsUntil(cooldownUntil));
    const interval = setInterval(() => {
      setTimer(secondsUntil(cooldownUntil));
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldownUntil]);

  useEffect(() => {
    if (bootstrappedRef.current || !autoSend || challengeId) {
      return;
    }

    bootstrappedRef.current = true;
    if (phoneSchema.safeParse(phoneNumber.trim()).success) {
      void requestCode();
    }
  }, [autoSend, challengeId, phoneNumber]);

  const formattedTimer = useMemo(() => `00:${timer.toString().padStart(2, '0')}`, [timer]);
  const progress = useMemo(() => Math.min(1, timer / 60), [timer]);

  const showSnackbar = (message, status = 'info') => {
    setSnackbar({ visible: true, message, status });
  };

  const validatePhoneNumber = () => {
    const normalizedPhone = phoneNumber.trim();
    const result = phoneSchema.safeParse(normalizedPhone);

    if (!result.success) {
      setErrors((prev) => ({
        ...prev,
        phoneNumber: result.error.issues?.[0]?.message || 'Nomor telepon tidak valid',
      }));
      return null;
    }

    return normalizedPhone;
  };

  const applyOtpChallenge = (responseData, normalizedPhone) => {
    setChallengeId(responseData.challengeId);
    setCooldownUntil(responseData.cooldownUntil || null);
    dispatch(setPhoneNumber(normalizedPhone));
  };

  const requestCode = async ({ isResend = false } = {}) => {
    const normalizedPhone = validatePhoneNumber();
    if (!normalizedPhone) {
      showSnackbar('Masukkan nomor telepon aktif untuk menerima OTP via SMS.', 'warning');
      return;
    }

    setLoading(true);

    try {
      let result = null;

      if (isResend && challengeId) {
        result = await resendSmsOtp({ challengeId });
        if (!result.success && result.code === 'OTP_CHALLENGE_NOT_FOUND') {
          result = await requestSmsOtp({ phoneNumber: normalizedPhone, purpose });
        }
      } else {
        result = await requestSmsOtp({ phoneNumber: normalizedPhone, purpose });
      }

      if (result.success) {
        applyOtpChallenge(result.data, normalizedPhone);
        showSnackbar(
          isResend
            ? `Kode OTP baru dikirim ke ${normalizedPhone}`
            : `Kode OTP dikirim ke ${normalizedPhone}`,
          'success'
        );
        return;
      }

      setCooldownUntil(result.details?.cooldownUntil || result.details?.lockedUntil || null);
      showSnackbar(result.message, OTP_STATUS_BY_CODE[result.code] || 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value) => {
    const sanitized = value.replace(/[^0-9]/g, '').slice(0, 6);
    setOtp(sanitized);
    if (errors.otp) {
      setErrors((prev) => ({ ...prev, otp: undefined }));
    }
  };

  const handleVerify = async () => {
    const normalizedPhone = validatePhoneNumber();
    if (!normalizedPhone) {
      showSnackbar('Nomor telepon tidak valid.', 'warning');
      return;
    }

    const otpCheck = otpSchema.safeParse(otp);
    if (!otpCheck.success) {
      setErrors((prev) => ({
        ...prev,
        otp: otpCheck.error.issues?.[0]?.message || 'Kode OTP tidak valid',
      }));
      return;
    }

    if (!challengeId) {
      showSnackbar('Minta kode OTP terlebih dahulu sebelum verifikasi.', 'warning');
      return;
    }

    setLoading(true);

    try {
      const result = await verifySmsOtp({
        phoneNumber: normalizedPhone,
        otp,
      });

      if (result.success) {
        dispatch(setPhoneNumber(normalizedPhone));
        dispatch(otpVerified({ phoneNumber: normalizedPhone }));
        setOtp('');
        showSnackbar('Verifikasi berhasil. Anda bisa melanjutkan ke login.', 'success');
        setTimeout(() => {
          navigation.navigate('Login');
        }, 500);
        return;
      }

      if (result.code === 'OTP_EXPIRED') {
        setChallengeId(null);
      }

      setCooldownUntil(result.details?.cooldownUntil || result.details?.lockedUntil || null);
      if (result.code === 'OTP_INVALID') {
        setErrors((prev) => ({ ...prev, otp: result.message }));
      }
      showSnackbar(result.message, OTP_STATUS_BY_CODE[result.code] || 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 48 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <AuthHero
          title="Konfirmasi nomor Anda"
          subtitle="OTP publik hanya dikirim lewat SMS. Pastikan nomor yang Anda masukkan aktif."
          badgeLabel="Verifikasi keamanan"
          highlights={[
            { icon: 'clock-outline', label: 'Cooldown', value: formattedTimer },
            { icon: 'shield-key', label: 'Channel', value: 'SMS only' },
          ]}
        />

        <Card style={[styles.card, theme?.shadows?.lg]}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.cardTitle}>
              Masukkan nomor dan kode OTP
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Endpoint mobile sudah dipindahkan ke `/v1/otp/*`. Gunakan nomor aktif untuk menerima kode 6 digit.
            </Text>

            <TextInput
              mode="outlined"
              label="Nomor telepon"
              value={phoneNumber}
              onChangeText={(value) => {
                setPhoneNumberValue(value);
                if (errors.phoneNumber) {
                  setErrors((prev) => ({ ...prev, phoneNumber: undefined }));
                }
              }}
              keyboardType="phone-pad"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={DEFAULT_PHONE_PREFIX}
              style={styles.phoneInput}
              error={Boolean(errors.phoneNumber)}
              disabled={loading}
            />
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              {errors.phoneNumber || ' '}
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
              onChangeText={handleOtpChange}
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
                <Text variant="titleSmall">Kebijakan keamanan OTP</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Cooldown, rate limit, dan lockout diterapkan penuh oleh backend.
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
              disabled={loading || otp.length !== 6}
            >
              Verifikasi kode
            </Button>

            <Button
              mode="outlined"
              icon="refresh"
              disabled={timer > 0 || loading}
              onPress={() => requestCode({ isResend: true })}
            >
              {challengeId ? 'Kirim ulang kode' : 'Kirim kode'}
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
        onDismiss={() => setSnackbar({ visible: false, message: '', status: 'info' })}
        status={snackbar.status}
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
  phoneInput: {
    marginTop: 20,
  },
  progressBar: {
    marginBottom: 20,
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
