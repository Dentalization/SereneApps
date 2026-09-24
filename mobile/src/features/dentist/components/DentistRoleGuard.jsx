import React, { useEffect, useState } from 'react';
import { View, StyleSheet, AppState } from 'react-native';
import { Text, Button, useTheme, Card } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { isDentistUser } from '../../../utils/authUtils';
import api from '../../../services/api';

/**
 * DentistRoleGuard protects screens and components that are restricted to Dentist users.
 * If the current user does not have the Dentist role, an unauthorized access screen is rendered.
 */
const DentistRoleGuard = ({ children, navigation, fallback = null }) => {
  const theme = useTheme();
  const auth = useSelector((state) => state?.auth);
  const isDentist = isDentistUser(auth?.user);
  const sessionKey = `${auth?.user?.id || ''}:${auth?.accessToken || ''}`;
  const [verifiedSession, setVerifiedSession] = useState(null);
  const [checking, setChecking] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let mounted = true;
    let generation = 0;
    const verify = async () => {
      const current = ++generation;
      setVerifiedSession(null);
      if (!isDentist || auth?.authLevel !== 'full_account' || !auth?.accessToken) return;
      setChecking(true);
      try {
        // Persisted roles and restored navigation are not authentication evidence.
        const { data } = await api.get('/auth/me');
        const user = data?.user || data;
        if (mounted && current === generation && isDentistUser(user)
          && String(user?.id) === String(auth.user.id)) setVerifiedSession(sessionKey);
      } catch (_) {
        // Fail closed; HTTP client handles token refresh/session invalidation.
      } finally {
        if (mounted && current === generation) setChecking(false);
      }
    };
    verify();
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') verify();
      else { generation += 1; setVerifiedSession(null); }
    });
    return () => { mounted = false; generation += 1; listener.remove(); };
  }, [sessionKey, isDentist, auth?.authLevel, attempt]);

  if (isDentist && verifiedSession === sessionKey && auth?.accessToken) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  const handleGoHome = () => {
    if (navigation?.navigate) {
      navigation.navigate('DashboardTab');
    } else if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background || '#F8FAFC' }]}>
      <Card style={[styles.card, { backgroundColor: theme.colors.surface || '#FFFFFF' }]} elevation={2}>
        <Card.Content style={styles.cardContent}>
          <View style={[styles.iconWrapper, { backgroundColor: '#FEE2E2' }]}>
            <MaterialCommunityIcons name="shield-lock-outline" size={48} color="#EF4444" />
          </View>

          <Text variant="titleMedium" style={styles.title}>
            {checking ? 'Memverifikasi Sesi Dokter' : 'Akses Dibatasi'}
          </Text>

          {isDentist && !checking && (
            <Button onPress={() => setAttempt((value) => value + 1)}>Coba Verifikasi Ulang</Button>
          )}

          <Text variant="bodyMedium" style={styles.description}>
            Fitur 3D Dental Scan dan modul klinis dokter gigi hanya dapat diakses oleh akun Dokter Gigi yang terverifikasi di Serene.
          </Text>

          <Button
            mode="contained"
            onPress={handleGoHome}
            style={styles.button}
            buttonColor={theme.colors.primary}
          >
            Kembali ke Beranda
          </Button>
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
  },
  cardContent: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  button: {
    borderRadius: 12,
    width: '100%',
    paddingVertical: 4,
  },
});

export default DentistRoleGuard;
