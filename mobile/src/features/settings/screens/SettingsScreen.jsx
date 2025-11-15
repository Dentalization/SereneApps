import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, Avatar, List, Switch, Button, useTheme, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { AUTH_LEVELS, logout } from '../../../store/slices/authSlice';
import { toggleTheme } from '../../../store/slices/settingsSlice';
import { getInitials } from '../../../utils/formatters';

const SettingsScreen = ({ navigation }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { user, authLevel } = useSelector((state) => state.auth);
  const { isDarkMode } = useSelector((state) => state.settings);

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Account Card */}
      <Card style={[styles.accountCard, theme.shadows.md]}>
        <Card.Content>
          {authLevel === AUTH_LEVELS.GUEST ? (
            <View style={styles.guestCard}>
              <Avatar.Icon
                size={64}
                icon="account"
                style={{ backgroundColor: theme.colors.surfaceVariant }}
              />
              <View style={styles.guestInfo}>
                <Text variant="titleMedium">Mode Tamu</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Daftar untuk menyimpan data Anda
                </Text>
              </View>
              <Button
                mode="contained"
                onPress={() => navigation.navigate('Login')}
                style={styles.loginButton}
              >
                Masuk
              </Button>
            </View>
          ) : (
            <View style={styles.accountInfo}>
              <Avatar.Text
                size={64}
                label={getInitials(user?.name || 'U')}
                style={{ backgroundColor: theme.colors.primary }}
              />
              <View style={styles.userInfo}>
                <Text variant="titleLarge">{user?.name || 'User'}</Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  {user?.email || ''}
                </Text>
                {authLevel === AUTH_LEVELS.OTP_VERIFIED && (
                  <Text variant="bodySmall" style={{ color: theme.colors.warning }}>
                    Verifikasi OTP • Lengkapi profil
                  </Text>
                )}
              </View>
              {authLevel === AUTH_LEVELS.FULL_ACCOUNT && (
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color={theme.colors.onSurfaceVariant}
                  onPress={() => navigation.navigate('Profile')}
                />
              )}
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Settings */}
      <View style={styles.section}>
        <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
          PENGATURAN
        </Text>

        <Card style={[styles.card, theme.shadows.sm]}>
          <List.Item
            title="Mode Gelap"
            description="Gunakan tema gelap"
            left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
            right={() => (
              <Switch value={isDarkMode} onValueChange={() => dispatch(toggleTheme())} />
            )}
          />
          <Divider />
          <List.Item
            title="Bahasa"
            description="Indonesia"
            left={(props) => <List.Icon {...props} icon="translate" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
          <Divider />
          <List.Item
            title="Notifikasi"
            description="Kelola notifikasi"
            left={(props) => <List.Icon {...props} icon="bell" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
        </Card>
      </View>

      {/* Privacy */}
      <View style={styles.section}>
        <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
          PRIVASI & KEAMANAN
        </Text>

        <Card style={[styles.card, theme.shadows.sm]}>
          <List.Item
            title="Kebijakan Privasi"
            left={(props) => <List.Icon {...props} icon="shield-check" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
          <Divider />
          <List.Item
            title="Syarat & Ketentuan"
            left={(props) => <List.Icon {...props} icon="file-document" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
          <Divider />
          <List.Item
            title="Kelola Data"
            description="Hapus atau unduh data Anda"
            left={(props) => <List.Icon {...props} icon="database" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
        </Card>
      </View>

      {/* Support */}
      <View style={styles.section}>
        <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
          BANTUAN
        </Text>

        <Card style={[styles.card, theme.shadows.sm]}>
          <List.Item
            title="Pusat Bantuan"
            left={(props) => <List.Icon {...props} icon="help-circle" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
          <Divider />
          <List.Item
            title="Hubungi Kami"
            left={(props) => <List.Icon {...props} icon="email" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
          <Divider />
          <List.Item
            title="Tentang SereneAI"
            description="Versi 1.0.0"
            left={(props) => <List.Icon {...props} icon="information" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
        </Card>
      </View>

      {/* Logout */}
      {authLevel !== AUTH_LEVELS.GUEST && (
        <View style={styles.section}>
          <Button
            mode="outlined"
            onPress={handleLogout}
            icon="logout"
            textColor={theme.colors.error}
            style={[styles.logoutButton, { borderColor: theme.colors.error }]}
          >
            Keluar
          </Button>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  accountCard: {
    margin: 16,
    borderRadius: 12,
  },
  guestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  guestInfo: {
    flex: 1,
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userInfo: {
    flex: 1,
  },
  loginButton: {
    marginLeft: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    paddingHorizontal: 16,
    marginBottom: 8,
    fontWeight: '600',
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  logoutButton: {
    marginHorizontal: 16,
  },
});

export default SettingsScreen;
