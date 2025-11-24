import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native'; // Hapus SafeAreaView
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Button,
  Card,
  Chip,
  HelperText,
  ProgressBar,
  SegmentedButtons,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { useDispatch } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AuthHero from '../components/AuthHero';
import ValidationToast from '../components/ValidationToast';
import { emailSchema, passwordSchema, phoneSchema } from '../../../utils/validation';
import { loginSuccess } from '../../../store/slices/authSlice';
import { registerPatient } from '../../../services/authService';

const REQUIRED_FIELDS = ['name', 'email', 'phoneNumber', 'password', 'confirmPassword'];

const interestOptions = [
  { label: 'Kontrol rutin', icon: 'calendar-check' },
  { label: 'Perawatan estetik', icon: 'tooth-outline' },
  { label: 'Ortodonti', icon: 'toothbrush' },
];

const RegisterScreen = ({ navigation }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  
  const [form, setForm] = useState({
    name: '',
    email: '',
    phoneNumber: '+62',
    dateOfBirth: '',
    password: '',
    confirmPassword: '',
    gender: 'female',
    city: '',
    interests: ['Kontrol rutin'],
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (field, value) => {
    // Auto-format date of birth input
    if (field === 'dateOfBirth') {
      // Remove all non-digit characters
      const digits = value.replace(/\D/g, '');
      
      // Auto-format as DD/MM/YYYY
      let formatted = digits;
      if (digits.length >= 2) {
        formatted = digits.slice(0, 2);
        if (digits.length >= 4) {
          formatted += '/' + digits.slice(2, 4);
          if (digits.length >= 5) {
            formatted += '/' + digits.slice(4, 8);
          }
        } else if (digits.length > 2) {
          formatted += '/' + digits.slice(2);
        }
      }
      
      setForm((prev) => ({ ...prev, [field]: formatted }));
      return;
    }
    
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleInterest = (label) => {
    setForm((prev) => {
      const exists = prev.interests.includes(label);
      return {
        ...prev,
        interests: exists
          ? prev.interests.filter((item) => item !== label)
          : [...prev.interests, label],
      };
    });
  };

  const completion = useMemo(() => {
    const filled = REQUIRED_FIELDS.filter((field) => form[field]?.trim().length > 2).length;
    return filled / REQUIRED_FIELDS.length;
  }, [form]);

  const validateForm = () => {
    const nextErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = 'Nama lengkap wajib diisi';
    }

    const emailCheck = emailSchema.safeParse(form.email.trim());
    if (!emailCheck.success) {
      nextErrors.email = emailCheck.error.issues?.[0]?.message || 'Email tidak valid';
    }

    const phoneCheck = phoneSchema.safeParse(form.phoneNumber.trim());
    if (!phoneCheck.success) {
      nextErrors.phoneNumber = phoneCheck.error.issues?.[0]?.message || 'Nomor telepon tidak valid';
    }

    // Validate dateOfBirth if provided (optional field)
    if (form.dateOfBirth.trim()) {
      // Expected format: DD/MM/YYYY
      const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
      if (!dateRegex.test(form.dateOfBirth.trim())) {
        nextErrors.dateOfBirth = 'Format tanggal tidak valid. Gunakan DD/MM/YYYY';
      } else {
        // Parse DD/MM/YYYY to Date object
        const parts = form.dateOfBirth.trim().split('/');
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
        const year = parseInt(parts[2], 10);
        
        const date = new Date(year, month, day);
        
        // Validate the date is valid (handles invalid dates like 31/02/2020)
        if (
          isNaN(date.getTime()) ||
          date.getDate() !== day ||
          date.getMonth() !== month ||
          date.getFullYear() !== year
        ) {
          nextErrors.dateOfBirth = 'Tanggal tidak valid';
        } else {
          // Check if date is in the future
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (date > today) {
            nextErrors.dateOfBirth = 'Tanggal lahir tidak boleh di masa depan';
          }
          // Check if age is reasonable (e.g., max 150 years old)
          const age = (today - date) / (1000 * 60 * 60 * 24 * 365.25);
          if (age > 150) {
            nextErrors.dateOfBirth = 'Tanggal lahir tidak valid';
          }
        }
      }
    }

    const passwordCheck = passwordSchema.safeParse(form.password);
    if (!passwordCheck.success) {
      nextErrors.password = passwordCheck.error.issues?.[0]?.message || 'Password lemah';
    }

    if (form.confirmPassword !== form.password) {
      nextErrors.confirmPassword = 'Konfirmasi password tidak sama';
    }

    return nextErrors;
  };

  const handleRegister = async () => {
    const validationResult = validateForm();
    setErrors(validationResult);

    if (Object.keys(validationResult).length > 0) {
      setSnackbar({ 
        visible: true, 
        message: 'Mohon perbaiki kesalahan pada form' 
      });
      return;
    }

    setLoading(true);

    try {
      // Prepare registration data sesuai dengan backend API
      const registrationData = {
        // Required fields
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        phoneNumber: form.phoneNumber.trim(),
        // Optional fields - sesuai dokumentasi backend
        gender: form.gender.toLowerCase(),
      };

      // Add optional fields if filled
      if (form.dateOfBirth.trim()) {
        // Convert DD/MM/YYYY to YYYY-MM-DD for backend
        const parts = form.dateOfBirth.trim().split('/');
        const day = parts[0];
        const month = parts[1];
        const year = parts[2];
        registrationData.dateOfBirth = `${year}-${month}-${day}`;
      }
      
      if (form.city.trim()) {
        registrationData.city = form.city.trim();
      }

      console.log('📤 Sending registration data:', {
        ...registrationData,
        password: '***hidden***'
      });

      // Call registration API
      const result = await registerPatient(registrationData);

      if (result.success) {
        // Registration successful!
        console.log('✅ Registration successful!', result.data.user);

        // Update Redux store with user data
        dispatch(
          loginSuccess({
            user: result.data.user,
            patientProfile: result.data.user.patientProfile,
            accessToken: result.data.accessToken,
            refreshToken: result.data.refreshToken,
          })
        );

        setSnackbar({ 
          visible: true, 
          message: `Selamat datang, ${result.data.user.name}! Akun berhasil dibuat.` 
        });

        // Navigate to dashboard after 1 second
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'DashboardTab' }],
          });
        }, 1500);
      } else {
        // Registration failed
        console.error('❌ Registration failed:', result);
        
        let errorMessage = result.message || 'Pendaftaran gagal. Silakan coba lagi.';
        
        // Handle specific error codes
        if (result.status === 409) {
          if (result.error === 'DUPLICATE_EMAIL') {
            errorMessage = result.details || 'Email sudah terdaftar. Silakan gunakan email lain atau login dengan akun yang sudah ada.';
            setErrors({ email: errorMessage });
          } else {
            errorMessage = result.details || 'Email sudah terdaftar. Silakan gunakan email yang berbeda.';
          }
        }
        // Show validation errors if any
        else if (result.errors && result.errors.length > 0) {
          const errorFields = {};
          result.errors.forEach(err => {
            if (err.field) {
              errorFields[err.field] = err.message;
            }
          });
          setErrors(errorFields);
          errorMessage = 'Mohon perbaiki kesalahan pada form';
        }
        // Show details if available
        else if (result.details) {
          errorMessage = result.details;
        }

        setSnackbar({ 
          visible: true, 
          message: errorMessage
        });
      }
    } catch (error) {
      console.error('❌ Unexpected error during registration:', error);
      setSnackbar({ 
        visible: true, 
        message: 'Terjadi kesalahan tidak terduga. Silakan coba lagi.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    // PERBAIKAN: Ganti SafeAreaView dengan View biasa + paddingTop manual
    <View style={[styles.safeArea, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 48 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <AuthHero
          title="Buat akun Serene"
          subtitle="Personalisasikan rencana perawatan gigi dan nikmati pemantauan cerdas berbasis AI."
          badgeLabel="Gratis & terenkripsi"
          highlights={[
            { icon: 'shield-check', label: 'Perlindungan', value: 'HIPAA' },
            { icon: 'gift-outline', label: 'Benefit', value: 'Voucher 150k' },
          ]}
        />

        <Card style={[styles.formCard, theme?.shadows?.lg]}>
          <Card.Content>
            <View style={styles.progressRow}>
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium" style={styles.cardTitle}>
                  Informasi dasar
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Isi data utama untuk membuat kartu pasien digital Anda
                </Text>
              </View>
              <Text variant="labelMedium" style={styles.progressLabel}>
                {Math.round(completion * 100)}%
              </Text>
            </View>
            <ProgressBar progress={completion} color={theme.colors.primary} style={styles.progressBar} />

            <Text variant="labelLarge" style={styles.sectionTitle}>
              Data akun
            </Text>
            <View style={styles.fieldSpacing}>
              <TextInput
                mode="outlined"
                label="Nama lengkap"
                value={form.name}
                onChangeText={(text) => handleChange('name', text)}
                left={<TextInput.Icon icon="account-outline" />}
                error={Boolean(errors.name)}
              />
              <HelperText type="error" visible={Boolean(errors.name)}>
                {errors.name}
              </HelperText>
            </View>

            <View style={styles.fieldSpacing}>
              <TextInput
                mode="outlined"
                label="Email aktif"
                value={form.email}
                onChangeText={(text) => handleChange('email', text)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="off"
                textContentType="none"
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
                label="Nomor telepon"
                value={form.phoneNumber}
                onChangeText={(text) => handleChange('phoneNumber', text)}
                keyboardType="phone-pad"
                autoComplete="off"
                textContentType="none"
                left={<TextInput.Icon icon="cellphone" />}
                error={Boolean(errors.phoneNumber)}
              />
              <HelperText type="error" visible={Boolean(errors.phoneNumber)}>
                {errors.phoneNumber}
              </HelperText>
            </View>

            <View style={styles.fieldSpacing}>
              <TextInput
                mode="outlined"
                label="Tanggal lahir (opsional)"
                placeholder="15/08/1995"
                value={form.dateOfBirth}
                onChangeText={(text) => handleChange('dateOfBirth', text)}
                keyboardType="number-pad"
                maxLength={10}
                autoComplete="off"
                textContentType="none"
                left={<TextInput.Icon icon="calendar" />}
                error={Boolean(errors.dateOfBirth)}
              />
              <HelperText type="info" visible={!errors.dateOfBirth && !form.dateOfBirth}>
                Format: DD/MM/YYYY (contoh: 15/08/1995)
              </HelperText>
              <HelperText type="error" visible={Boolean(errors.dateOfBirth)}>
                {errors.dateOfBirth}
              </HelperText>
            </View>

            <View style={styles.fieldSpacing}>
              <TextInput
                mode="outlined"
                label="Kota tempat tinggal (opsional)"
                placeholder="Jakarta, Surabaya, Bandung, dll"
                value={form.city}
                onChangeText={(text) => handleChange('city', text)}
                autoComplete="off"
                textContentType="none"
                left={<TextInput.Icon icon="map-marker" />}
                error={Boolean(errors.city)}
              />
              <HelperText type="info" visible={!errors.city && !form.city}>
                Membantu kami merekomendasikan klinik terdekat
              </HelperText>
              <HelperText type="error" visible={Boolean(errors.city)}>
                {errors.city}
              </HelperText>
            </View>

            <Text variant="labelLarge" style={styles.sectionTitle}>
              Preferensi layanan
            </Text>
            <SegmentedButtons
              value={form.gender}
              onValueChange={(value) => handleChange('gender', value)}
              buttons={[
                { value: 'female', label: 'Perempuan', icon: 'gender-female' },
                { value: 'male', label: 'Laki-laki', icon: 'gender-male' },
                { value: 'other', label: 'Lainnya', icon: 'gender-transgender' },
              ]}
              style={styles.segmented}
            />

            <View style={styles.interestRow}>
              {interestOptions.map((item) => (
                <Chip
                  key={item.label}
                  icon={item.icon}
                  selected={form.interests.includes(item.label)}
                  onPress={() => toggleInterest(item.label)}
                  style={styles.interestChip}
                >
                  {item.label}
                </Chip>
              ))}
            </View>

            <Text variant="labelLarge" style={styles.sectionTitle}>
              Keamanan akun
            </Text>
            <View style={styles.fieldSpacing}>
              <TextInput
                mode="outlined"
                label="Password"
                value={form.password}
                onChangeText={(text) => handleChange('password', text)}
                secureTextEntry={!showPassword}
                autoComplete="new-password"
                textContentType="newPassword"
                importantForAutofill="no"
                left={<TextInput.Icon icon="lock-outline" />}
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
                error={Boolean(errors.password)}
              />
              <HelperText type="error" visible={Boolean(errors.password)}>
                {errors.password}
              </HelperText>
            </View>

            <View style={styles.fieldSpacing}>
              <TextInput
                mode="outlined"
                label="Konfirmasi password"
                value={form.confirmPassword}
                onChangeText={(text) => handleChange('confirmPassword', text)}
                secureTextEntry={!showConfirmPassword}
                autoComplete="new-password"
                textContentType="newPassword"
                importantForAutofill="no"
                left={<TextInput.Icon icon="lock-check-outline" />}
                right={
                  <TextInput.Icon
                    icon={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  />
                }
                error={Boolean(errors.confirmPassword)}
              />
              <HelperText type="error" visible={Boolean(errors.confirmPassword)}>
                {errors.confirmPassword}
              </HelperText>
            </View>

            <View style={styles.benefitCard}>
              <MaterialCommunityIcons name="gift" size={24} color={theme.colors.primary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text variant="titleSmall">Bonus kartu pasien digital</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Simpan riwayat dan rekomendasi dokter favorit otomatis setelah akun aktif.
                </Text>
              </View>
            </View>

            <Button
              mode="contained"
              onPress={handleRegister}
              loading={loading}
              disabled={loading}
              style={styles.primaryButton}
            >
              Daftar Sekarang
            </Button>

            <Button mode="text" onPress={() => navigation.navigate('Login')}>
              Sudah punya akun? Masuk
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
  formCard: {
    marginHorizontal: 16,
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  // input modern: rounded + dim background
  input: {
    borderRadius: 16,
    backgroundColor: 'rgba(15,23,42,0.02)',
  },
  inputOutline: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitle: {
    fontWeight: '700',
    marginBottom: 4,
  },
  progressLabel: {
    fontWeight: '600',
  },
  progressBar: {
    marginBottom: 24,
    borderRadius: 999,
  },
  sectionTitle: {
    marginTop: 16,
    marginBottom: 12,
  },
  fieldSpacing: {
    marginBottom: 8,
  },
  segmented: {
    marginBottom: 16,
  },
  interestRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: 12,
  },
  interestChip: {
    marginHorizontal: 4,
    marginBottom: 8,
  },
  benefitCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(98, 16, 159, 0.08)',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  primaryButton: {
    marginBottom: 12,
  },
});

export default RegisterScreen;