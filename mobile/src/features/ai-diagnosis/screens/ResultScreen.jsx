import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, useTheme, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import RiskBadge from '../../../components/shared/RiskBadge';
import AuthGuard from '../../../components/shared/AuthGuard';
import { useSelector } from 'react-redux';
import { AUTH_LEVELS } from '../../../store/slices/authSlice';

const ResultScreen = ({ route, navigation }) => {
  const theme = useTheme();
  const { result } = route.params;
  const { authLevel } = useSelector((state) => state.auth);
  const [showAuthGuard, setShowAuthGuard] = React.useState(false);

  const handleBookAppointment = () => {
    if (authLevel === AUTH_LEVELS.GUEST) {
      setShowAuthGuard(true);
    } else {
      navigation.navigate('AppointmentTab', { screen: 'ClinicSearch' });
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Risk Summary */}
      <Card style={[styles.card, theme.shadows.md]}>
        <Card.Content>
          <View style={styles.header}>
            <MaterialCommunityIcons
              name="check-decagram"
              size={48}
              color={theme.medicalAlert[result.riskLevel].icon}
            />
            <View style={styles.headerText}>
              <Text variant="headlineSmall">Hasil Diagnosis</Text>
              <RiskBadge level={result.riskLevel} />
            </View>
          </View>
          <Text variant="bodyMedium" style={styles.confidence}>
            Tingkat Kepercayaan: {Math.round(result.confidence * 100)}%
          </Text>
        </Card.Content>
      </Card>

      {/* Affected Teeth */}
      <Card style={[styles.card, theme.shadows.sm]}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Gigi yang Terdeteksi
          </Text>
          <View style={styles.teethContainer}>
            {result.affectedTeeth.map((tooth) => (
              <Chip key={tooth} style={styles.toothChip}>
                #{tooth}
              </Chip>
            ))}
          </View>
        </Card.Content>
      </Card>

      {/* Conditions */}
      <Card style={[styles.card, theme.shadows.sm]}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Kondisi Terdeteksi
          </Text>
          {result.conditions.map((condition, index) => (
            <View key={index} style={styles.conditionItem}>
              <View style={styles.conditionHeader}>
                <Text variant="titleSmall">{condition.name}</Text>
                <RiskBadge level={condition.severity} size="small" />
              </View>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Kepercayaan: {Math.round(condition.confidence * 100)}%
              </Text>
            </View>
          ))}
        </Card.Content>
      </Card>

      {/* Recommendations */}
      <Card style={[styles.card, theme.shadows.sm]}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Rekomendasi
          </Text>
          <Text variant="bodyMedium" style={styles.recommendation}>
            Berdasarkan hasil analisis, kami merekomendasikan Anda untuk berkonsultasi dengan dokter
            gigi untuk pemeriksaan lebih lanjut.
          </Text>
        </Card.Content>
      </Card>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          mode="contained"
          onPress={handleBookAppointment}
          icon="calendar-plus"
          style={styles.button}
        >
          Buat Janji Konsultasi
        </Button>
        <Button
          mode="outlined"
          onPress={() => navigation.navigate('AIHome')}
          style={styles.button}
        >
          Scan Lagi
        </Button>
      </View>

      {/* Auth Guard */}
      <AuthGuard
        visible={showAuthGuard}
        onDismiss={() => setShowAuthGuard(false)}
        onOTPLogin={() => {
          setShowAuthGuard(false);
          navigation.navigate('SettingsTab', { screen: 'OTP' });
        }}
        onFullLogin={() => {
          setShowAuthGuard(false);
          navigation.navigate('SettingsTab', { screen: 'Login' });
        }}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  headerText: {
    flex: 1,
    gap: 8,
  },
  confidence: {
    marginTop: 8,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  teethContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  toothChip: {
    backgroundColor: '#E0F2F1',
  },
  conditionItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  conditionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  recommendation: {
    lineHeight: 22,
  },
  actions: {
    padding: 16,
    gap: 12,
  },
  button: {
    width: '100%',
  },
});

export default ResultScreen;
