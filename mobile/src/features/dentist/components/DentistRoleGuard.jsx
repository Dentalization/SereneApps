import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, useTheme, Card } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { isDentistUser } from '../../../utils/authUtils';

/**
 * DentistRoleGuard protects screens and components that are restricted to Dentist users.
 * If the current user does not have the Dentist role, an unauthorized access screen is rendered.
 */
const DentistRoleGuard = ({ children, navigation, fallback = null }) => {
  const theme = useTheme();
  const user = useSelector((state) => state?.auth?.user);
  const isDentist = isDentistUser(user);

  if (isDentist) {
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
            Akses Dibatasi
          </Text>

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
