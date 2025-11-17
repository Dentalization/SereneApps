import React, { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Avatar,
  Button,
  Chip,
  Divider,
  List,
  Switch,
  Text,
  useTheme,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { AUTH_LEVELS, logout } from '../../../store/slices/authSlice';
import { toggleTheme } from '../../../store/slices/settingsSlice';
import { getInitials } from '../../../utils/formatters';
import SettingsSection from '../components/SettingsSection';
import ValidationToast from '../components/ValidationToast';

const SettingsScreen = ({ navigation }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { user, authLevel } = useSelector((state) => state.auth);
  const { isDarkMode, language } = useSelector((state) => state.settings);
  const [notificationPrefs, setNotificationPrefs] = useState({
    appointment: true,
    reminders: true,
    aiDigest: false,
  });
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  const isGuest = authLevel === AUTH_LEVELS.GUEST;
  const statusLabel = useMemo(() => {
    if (isGuest) return 'Mode tamu aktif';
    if (authLevel === AUTH_LEVELS.OTP_VERIFIED) return 'Lengkapi profil untuk akses penuh';
    return 'Akun terverifikasi';
  }, [authLevel, isGuest]);

  const toggleNotification = (key) => {
    setNotificationPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLogout = () => {
    dispatch(logout());
    setSnackbar({ visible: true, message: 'Anda keluar dari SereneApps.' });
  };

  const quickActions = [
    {
      label: 'Profil medis',
      icon: 'clipboard-text-outline',
      onPress: () => navigation.navigate('Profile'),
      visible: !isGuest,
    },
    {
      label: 'Pengingat janji',
      icon: 'calendar-clock',
      onPress: () => setSnackbar({ visible: true, message: 'Pengingat janji aktif secara default.' }),
      visible: true,
    },
    {
      label: 'Pusat bantuan',
      icon: 'headset',
      onPress: () => navigation.navigate('HelpCenter'),
      visible: true,
    },
  ].filter((item) => item.visible);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 48 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroWrapper}>
          <LinearGradient
            colors={theme?.gradients?.primary || [theme.colors.primary, theme.colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.heroCard, theme?.shadows?.lg]}
          >
            <View style={styles.heroHeader}>
              <Avatar.Text
                size={64}
                label={getInitials(user?.name || 'Tamu')}
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              />
              <View style={styles.heroInfo}>
                <Text variant="titleLarge" style={styles.heroName}>
                  {isGuest ? 'Selamat datang' : user?.name}
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onPrimary }}>
                  {statusLabel}
                </Text>
              </View>
              {isGuest ? (
                <Button mode="contained" onPress={() => navigation.navigate('Login')}>
                  Masuk
                </Button>
              ) : (
                <Button mode="contained-tonal" onPress={() => navigation.navigate('Profile')}>
                  Profil
                </Button>
              )}
            </View>

            <View style={styles.chipRow}>
              {quickActions.map((action) => (
                <Chip
                  key={action.label}
                  icon={action.icon}
                  onPress={action.onPress}
                  style={styles.actionChip}
                >
                  {action.label}
                </Chip>
              ))}
            </View>

            <View style={styles.heroStats}>
              {[
                { label: 'Tema', value: isDarkMode ? 'Gelap' : 'Terang' },
                { label: 'Bahasa', value: language === 'id' ? 'Indonesia' : 'English' },
                { label: 'Status', value: authLevel === AUTH_LEVELS.FULL_ACCOUNT ? 'Aktif' : 'Terbatas' },
              ].map((item, index, array) => (
                <View
                  key={item.label}
                  style={[styles.statItem, index !== array.length - 1 && styles.statSpacing]}
                >
                  <Text variant="labelSmall" style={styles.statLabel}>
                    {item.label}
                  </Text>
                  <Text variant="titleMedium" style={styles.statValue}>
                    {item.value}
                  </Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </View>

        <SettingsSection title="PREFERENSI APLIKASI" description="Sesuaikan tampilan dan bahasa.">
          <List.Item
            title="Mode gelap"
            description="Gunakan palet bernuansa malam"
            left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
            right={() => <Switch value={isDarkMode} onValueChange={() => dispatch(toggleTheme())} />}
          />
          <Divider />
          <List.Item
            title="Bahasa"
            description={language === 'id' ? 'Indonesia' : 'English'}
            left={(props) => <List.Icon {...props} icon="translate" />}
            onPress={() => setSnackbar({ visible: true, message: 'Pilihan bahasa tambahan segera hadir.' })}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
        </SettingsSection>

        <SettingsSection title="NOTIFIKASI" description="Atur pengingat kesehatan dan insight.">
          <List.Item
            title="Pengingat janji temu"
            description="H-3 dan H-1 sebelum jadwal"
            left={(props) => <List.Icon {...props} icon="calendar-check" />}
            right={() => (
              <Switch
                value={notificationPrefs.appointment}
                onValueChange={() => toggleNotification('appointment')}
              />
            )}
          />
          <Divider />
          <List.Item
            title="Reminder kebiasaan"
            description="Tips flossing mingguan"
            left={(props) => <List.Icon {...props} icon="toothbrush" />}
            right={() => (
              <Switch
                value={notificationPrefs.reminders}
                onValueChange={() => toggleNotification('reminders')}
              />
            )}
          />
          <Divider />
          <List.Item
            title="Digest AI mingguan"
            description="Rangkuman insight terbaru"
            left={(props) => <List.Icon {...props} icon="robot-happy" />}
            right={() => (
              <Switch
                value={notificationPrefs.aiDigest}
                onValueChange={() => toggleNotification('aiDigest')}
              />
            )}
          />
        </SettingsSection>

        <SettingsSection title="PRIVASI & KEAMANAN" description="Kendali penuh atas data Anda.">
          <List.Item
            title="Kebijakan Privasi"
            left={(props) => <List.Icon {...props} icon="shield-check" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('PrivacyPolicy')}
          />
          <Divider />
          <List.Item
            title="Syarat & Ketentuan"
            left={(props) => <List.Icon {...props} icon="file-document" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('Terms')}
          />
          <Divider />
          <List.Item
            title="Kelola data"
            description="Unduh atau hapus riwayat"
            left={(props) => <List.Icon {...props} icon="database" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('DataManagement')}
          />
        </SettingsSection>

        <SettingsSection title="BANTUAN" description="Terhubung dengan tim Serene.">
          <List.Item
            title="Pusat bantuan"
            description="FAQ, panduan, dan troubleshooting"
            left={(props) => <List.Icon {...props} icon="help-circle" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('HelpCenter')}
          />
          <Divider />
          <List.Item
            title="Hubungi care@serene.id"
            description="Balasan rata-rata < 5 menit"
            left={(props) => <List.Icon {...props} icon="email" />}
            onPress={() => navigation.navigate('ContactSupport')}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
          <Divider />
          <List.Item
            title="Versi aplikasi"
            description="SereneApps v1.0.0"
            left={(props) => <List.Icon {...props} icon="information" />}
            right={() => <Text style={styles.versionText}>Terbaru</Text>}
          />
        </SettingsSection>

        {!isGuest && (
          <Button
            mode="outlined"
            icon="logout"
            textColor={theme.colors.error}
            style={[styles.logoutButton, { borderColor: theme.colors.error }]}
            onPress={handleLogout}
          >
            Keluar dari akun
          </Button>
        )}

        {isGuest && (
          <View style={styles.guestBanner}>
            <MaterialCommunityIcons name="shield-alert" size={22} color={theme.colors.primary} />
            <View style={styles.bannerTextWrapper}>
              <Text variant="titleSmall">Simpan riwayat secara aman</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Masuk atau daftar untuk backup otomatis janji dan hasil AI.
              </Text>
            </View>
            <Button mode="contained" compact onPress={() => navigation.navigate('Register')}>
              Daftar
            </Button>
          </View>
        )}
      </ScrollView>

      <ValidationToast
        visible={snackbar.visible}
        message={snackbar.message}
        onDismiss={() => setSnackbar({ visible: false, message: '' })}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
    paddingTop: 24,
  },
  heroWrapper: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  heroCard: {
    borderRadius: 28,
    padding: 20,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroInfo: {
    flex: 1,
    marginLeft: 16,
  },
  heroName: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: 16,
  },
  actionChip: {
    marginHorizontal: 4,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  heroStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
  },
  statSpacing: {
    marginRight: 12,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 8,
  },
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(98,16,159,0.08)',
  },
  bannerTextWrapper: {
    flex: 1,
    marginLeft: 12,
  },
  versionText: {
    marginRight: 16,
    fontWeight: '600',
  },
});

export default SettingsScreen;
