import React, { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  Chip,
  Divider,
  HelperText,
  IconButton,
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { useDispatch } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AuthHero from '../components/AuthHero';
import { emailSchema, passwordSchema } from '../../../utils/validation';
import { loginSuccess } from '../../../store/slices/authSlice';

const LoginScreen = ({ navigation }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const nextErrors = {};
    const emailCheck = emailSchema.safeParse(form.email.trim());
    if (!emailCheck.success) {
      nextErrors.email = emailCheck.error.issues?.[0]?.message || 'Email tidak valid';
    }

    const passwordCheck = passwordSchema.safeParse(form.password);
    if (!passwordCheck.success) {
      nextErrors.password = passwordCheck.error.issues?.[0]?.message || 'Password tidak valid';
    }

    return nextErrors;
  };

  const handleLogin = () => {
    const validationResult = validateForm();
    setErrors(validationResult);

    if (Object.keys(validationResult).length > 0) {
      return;
    }

    setLoading(true);
    setTimeout(() => {
      dispatch(
        loginSuccess({
          user: {
            name: 'Serene Patient',
            email: form.email.trim(),
            phone_number: '+628123400000',
          },
          patientProfile: {
            membershipTier: 'Platinum',
            lastVisit: '2024-06-12',
            loyaltyPoints: 820,
            phoneNumber: '+628123400000',
            gender: 'female',
            dateOfBirth: '1993-08-22',
            medicalDetails: {
              allergies: ['Penisilin', 'Latex'],
              chronicConditions: ['Diabetes Tipe 2'],
              medications: ['Metformin 500mg', 'Vitamin D'],
              notes: 'Riwayat perawatan ortho selesai 2022',
            },
            emergencyContact: {
              name: 'Sarah Putri',
              phone: '+628987654321',
              relationship: 'Suami/Istri',
            },
            insurance: {
              provider: 'BPJS Kesehatan',
              number: '00011223344',
              memberId: 'PLAT-9912',
            },
            address: {
              line1: 'Jl. Kemang Raya No. 12',
              city: 'Jakarta Selatan',
              province: 'DKI Jakarta',
              postalCode: '12720',
            },
          },
          accessToken: 'demo-token',
          refreshToken: 'demo-refresh',
        })
      );
      setLoading(false);
      setSnackbar({ visible: true, message: 'Selamat datang kembali di SereneApps!' });
      navigation.goBack();
    }, 650);
  };

  const quickActions = useMemo(
    () => [
      {
        icon: 'cellphone-lock',
        label: 'OTP',
        onPress: () => navigation.navigate('OTP', { phoneNumber: '+628' }),
      },
      {
        icon: 'face-recognition',
        label: 'Face ID',
        onPress: () => setSnackbar({ visible: true, message: 'Aktifkan Face ID di perangkat Anda' }),
      },
      {
        icon: 'fingerprint',
        label: 'Sidik Jari',
        onPress: () => setSnackbar({ visible: true, message: 'Gunakan sensor fingerprint perangkat Anda' }),
      },
    ],
    [navigation]
  );

  const isDisabled = useMemo(
    () => !form.email.trim() || !form.password.trim() || loading,
    [form.email, form.password, loading]
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <AuthHero
          title="Masuk ke akun Anda"
          subtitle="Kelola janji temu, riwayat AI diagnosis, dan preferensi kesehatan gigi dari satu tempat."
          badgeLabel="Enkripsi kelas medis"
          highlights={[
            {
              icon: 'shield-key',
              label: 'Keamanan',
              value: 'SSL 256-bit',
            },
            {
              icon: 'clock-fast',
              label: 'Durasi',
              value: '< 60 detik',
            },
          ]}
        />

        <Card style={[styles.formCard, theme?.shadows?.lg]}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <View>
                <Text variant="titleLarge" style={styles.cardTitle}>
                  Selamat datang kembali
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  Masuk untuk melanjutkan progres kesehatan gigi Anda
                </Text>
              </View>
              <IconButton
                icon="help-circle-outline"
                size={20}
                onPress={() => setSnackbar({ visible: true, message: 'Hubungi care@serene.id untuk bantuan.' })}
              />
            </View>

            <View style={styles.fieldSpacing}>
              <TextInput
                mode="outlined"
                label="Email klinik"
                value={form.email}
                onChangeText={(text) => handleChange('email', text)}
                keyboardType="email-address"
                autoCapitalize="none"
                left={<TextInput.Icon icon="email-outline" />}
                error={Boolean(errors.email)}
              />
              <HelperText type="error" visible={Boolean(errors.email)}>
                {errors.email}
              </HelperText>
            </View>

            <View style={styles.fieldSpacing}>
              <TextInput
                mode="outlined"
                label="Password"
                value={form.password}
                onChangeText={(text) => handleChange('password', text)}
                secureTextEntry={!showPassword}
                left={<TextInput.Icon icon="lock-outline" />}
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    onPress={() => setShowPassword((prev) => !prev)}
                  />
                }
                error={Boolean(errors.password)}
              />
              <HelperText type="error" visible={Boolean(errors.password)}>
                {errors.password}
              </HelperText>
            </View>

            <View style={styles.metaRow}>
              <Chip
                mode={rememberMe ? 'flat' : 'outlined'}
                icon={rememberMe ? 'check-circle' : 'checkbox-blank-outline'}
                onPress={() => setRememberMe((prev) => !prev)}
              >
                Tetap masuk
              </Chip>
              <Button
                compact
                mode="text"
                onPress={() => setSnackbar({ visible: true, message: 'Link reset dikirim ke email Anda.' })}
              >
                Lupa password?
              </Button>
            </View>

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={isDisabled}
              style={styles.primaryButton}
            >
              Masuk Sekarang
            </Button>

            <Button
              mode="outlined"
              icon="account-plus"
              onPress={() => navigation.navigate('Register')}
            >
              Buat akun baru
            </Button>

            <Divider style={styles.divider} />

            <Text variant="labelLarge" style={styles.quickTitle}>
              Akses cepat
            </Text>
            <View style={styles.quickActions}>
              {quickActions.map((action) => (
                <Chip key={action.label} icon={action.icon} onPress={action.onPress} style={styles.actionChip}>
                  {action.label}
                </Chip>
              ))}
            </View>

            <View style={styles.assuranceBox}>
              <View style={{ marginRight: 12 }}>
                <MaterialCommunityIcons
                  name="shield-check"
                  size={20}
                  color={theme.colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="labelMedium">Keamanan kelas medis</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Data Anda dilindungi oleh enkripsi AES-256 dan dipantau oleh tim compliance Serene.
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ visible: false, message: '' })}
        duration={3500}
        action={{ label: 'Tutup' }}
      >
        {snackbar.message}
      </Snackbar>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    paddingVertical: 24,
  },
  formCard: {
    marginHorizontal: 16,
    borderRadius: 28,
    paddingVertical: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  cardTitle: {
    fontWeight: '700',
    marginBottom: 4,
  },
  fieldSpacing: {
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  primaryButton: {
    marginBottom: 12,
  },
  divider: {
    marginVertical: 20,
  },
  quickTitle: {
    marginBottom: 8,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: 16,
  },
  actionChip: {
    marginHorizontal: 4,
    marginBottom: 8,
  },
  assuranceBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.02)',
    padding: 16,
    borderRadius: 16,
    alignItems: 'flex-start',
  },
});

export default LoginScreen;
