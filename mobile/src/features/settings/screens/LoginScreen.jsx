import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Button,
  Card,
  Chip,
  Divider,
  HelperText,
  IconButton,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { useDispatch } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AuthHero from '../components/AuthHero';
import ValidationToast from '../components/ValidationToast';
import { emailSchema, passwordSchema } from '../../../utils/validation';
import { loginSuccess } from '../../../store/slices/authSlice';
import { loginPatient } from '../../../services/authService';
import { getPatientProfile } from '../../../services/patientService';

const HAS_LOGGED_IN_KEY = 'serene_has_logged_in_before';

const LoginScreen = ({ navigation }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', status: 'info' });

  // flag untuk tahu apakah smartphone ini sudah pernah login
  const [hasLoggedInBefore, setHasLoggedInBefore] = useState(false);

  useEffect(() => {
    const loadLoginFlag = async () => {
      try {
        const value = await AsyncStorage.getItem(HAS_LOGGED_IN_KEY);
        if (value === 'true') {
          setHasLoggedInBefore(true);
        }
      } catch (error) {
        // kalau gagal baca, diamkan saja, default-nya dianggap belum pernah login
        console.log('Failed to load login flag', error);
      }
    };

    loadLoginFlag();
  }, []);

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

  const handleLogin = async () => {
    const validationResult = validateForm();
    setErrors(validationResult);

    if (Object.keys(validationResult).length > 0) {
      setSnackbar({ 
        visible: true, 
        message: 'Mohon perbaiki kesalahan pada form',
        status: 'warning'
      });
      return;
    }

    setLoading(true);

    try {
      console.log('📤 Attempting login for:', form.email.trim());

      // Call login API
      const result = await loginPatient(form.email.trim(), form.password);

      if (result.success) {
        // Login successful!
        console.log('✅ Login successful!', result.data.user);

        // Fetch patient profile after login
        let patientProfile = null;
        
        if (__DEV__) {
          console.log('📥 Fetching patient profile after login...');
        }

        const profileResult = await getPatientProfile();
        
        if (profileResult.success) {
          patientProfile = profileResult.data;
          if (__DEV__) {
            console.log('✅ Patient profile loaded:', patientProfile);
          }
        } else {
          if (__DEV__) {
            console.log('⚠️ Patient profile not loaded:', profileResult.message);
          }
          // Don't block login if profile fetch fails - profile might not exist yet
        }

        // Update Redux store with user data and patient profile
        dispatch(
          loginSuccess({
            user: result.data.user,
            patientProfile: patientProfile,
            accessToken: result.data.accessToken,
            refreshToken: result.data.refreshToken,
          })
        );

        // Mark that device has logged in before
        try {
          await AsyncStorage.setItem(HAS_LOGGED_IN_KEY, 'true');
          setHasLoggedInBefore(true);
        } catch (error) {
          console.log('Failed to save login flag', error);
        }

        setSnackbar({ 
          visible: true, 
          message: `Selamat datang kembali, ${result.data.user.name}!`,
          status: 'success'
        });

        // Navigate to dashboard after 1 second
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'DashboardTab' }],
          });
        }, 1500);
      } else {
        // Login failed
        if (__DEV__) {
          console.log('⚠️ Login unsuccessful:', result.message);
        }
        
        setSnackbar({ 
          visible: true, 
          message: result.message || 'Login gagal. Silakan coba lagi.',
          status: 'error'
        });
      }
    } catch (error) {
      if (__DEV__) {
        console.log('⚠️ Unexpected error:', error.message);
      }
      setSnackbar({ 
        visible: true, 
        message: 'Terjadi kesalahan tidak terduga. Silakan coba lagi.',
        status: 'error'
      });
    } finally {
      setLoading(false);
    }
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
        onPress: () => setSnackbar({ 
          visible: true, 
          message: 'Aktifkan Face ID di perangkat Anda',
          status: 'info'
        }),
      },
      {
        icon: 'fingerprint',
        label: 'Sidik Jari',
        onPress: () => setSnackbar({ 
          visible: true, 
          message: 'Gunakan sensor fingerprint perangkat Anda',
          status: 'info'
        }),
      },
    ],
    [navigation]
  );

  const isDisabled = useMemo(
    () => !form.email.trim() || !form.password.trim() || loading,
    [form.email, form.password, loading]
  );

  const welcomeTitle = hasLoggedInBefore ? 'Selamat datang kembali' : 'Selamat datang';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 48 + insets.bottom }]}
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
              {/* Baris judul + ikon "?" di satu line */}
              <View style={styles.titleRow}>
                <Text variant="titleLarge" style={styles.cardTitle}>
                  {welcomeTitle}
                </Text>
                <IconButton
                  icon="help-circle-outline"
                  size={20}
                  onPress={() =>
                    setSnackbar({
                      visible: true,
                      message: 'Hubungi care@serene.id untuk bantuan.',
                      status: 'info'
                    })
                  }
                  style={styles.helpIcon}
                />
              </View>

              {/* Subtitle di bawah judul */}
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Masuk untuk melanjutkan progres kesehatan gigi Anda
              </Text>
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
                onPress={() =>
                  setSnackbar({ 
                    visible: true, 
                    message: 'Link reset dikirim ke email Anda.',
                    status: 'info'
                  })
                }
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

      <ValidationToast
        visible={snackbar.visible}
        message={snackbar.message}
        onDismiss={() => setSnackbar({ visible: false, message: '', status: 'info' })}
        status={snackbar.status}
      />
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
    marginBottom: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // title kiri, icon kanan dalam satu baris
    marginBottom: 4,
  },
  cardTitle: {
    fontWeight: '700',
  },
  helpIcon: {
    margin: 0,
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
