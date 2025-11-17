import React, { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
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
import { setPhoneNumber } from '../../../store/slices/authSlice';

const REQUIRED_FIELDS = ['name', 'email', 'phoneNumber', 'password', 'confirmPassword'];

const interestOptions = [
  { label: 'Kontrol rutin', icon: 'calendar-check' },
  { label: 'Perawatan estetik', icon: 'tooth-outline' },
  { label: 'Orthodontic', icon: 'toothbrush' },
];

const RegisterScreen = ({ navigation }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phoneNumber: '+62',
    password: '',
    confirmPassword: '',
    gender: 'female',
    interests: ['Kontrol rutin'],
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  const handleChange = (field, value) => {
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

    const passwordCheck = passwordSchema.safeParse(form.password);
    if (!passwordCheck.success) {
      nextErrors.password = passwordCheck.error.issues?.[0]?.message || 'Password lemah';
    }

    if (form.confirmPassword !== form.password) {
      nextErrors.confirmPassword = 'Konfirmasi password tidak sama';
    }

    return nextErrors;
  };

  const handleRegister = () => {
    const validationResult = validateForm();
    setErrors(validationResult);

    if (Object.keys(validationResult).length > 0) {
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const phone = form.phoneNumber.trim();
      dispatch(setPhoneNumber(phone));
      setLoading(false);
      setSnackbar({ visible: true, message: `Kode OTP dikirim ke ${phone}` });
      navigation.navigate('OTP', { phoneNumber: phone });
    }, 700);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
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
                left={<TextInput.Icon icon="cellphone" />}
                error={Boolean(errors.phoneNumber)}
              />
              <HelperText type="error" visible={Boolean(errors.phoneNumber)}>
                {errors.phoneNumber}
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
                secureTextEntry
                left={<TextInput.Icon icon="lock-outline" />}
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
                secureTextEntry
                left={<TextInput.Icon icon="lock-check-outline" />}
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
              style={styles.primaryButton}
            >
              Kirim kode OTP
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
    paddingVertical: 16,
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
