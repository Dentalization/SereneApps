import React from 'react';
import { View, ScrollView, StatusBar, StyleSheet } from 'react-native';
import { Text, Card, Button, useTheme, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import RiskBadge from '../../../components/shared/RiskBadge';
import AuthGuard from '../../../components/shared/AuthGuard';
import { AUTH_LEVELS } from '../../../store/slices/authSlice';
import useAnchoredHeaderHeight from '../../../hooks/useAnchoredHeaderHeight';

const RISK_GRADIENTS = {
  low: ['#0F9D58', '#34A853'],
  medium: ['#F97316', '#FB923C'],
  high: ['#DC2626', '#EF4444'],
};

const ResultScreen = ({ route, navigation }) => {
  const theme = useTheme();
  const { result } = route.params;
  const { authLevel } = useSelector((state) => state.auth);
  const [showAuthGuard, setShowAuthGuard] = React.useState(false);
  const { headerHeight, handleHeaderLayout } = useAnchoredHeaderHeight(320);


  const handleBookAppointment = () => {
    if (authLevel === AUTH_LEVELS.GUEST) {
      setShowAuthGuard(true);
    } else {
      navigation.navigate('AppointmentTab', { screen: 'ClinicSearch' });
    }
  };

  const gradient = RISK_GRADIENTS[result.riskLevel] || [theme.colors.primary, '#7F1DFF'];

  const stats = [
    { label: 'Keyakinan analisis', value: `${Math.round(result.confidence * 100)}%` },
    { label: 'Gigi terdampak', value: result.affectedTeeth.length },
    { label: 'Kondisi terdeteksi', value: result.conditions.length },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle="light-content" backgroundColor={gradient[0]} />

      <View onLayout={handleHeaderLayout} style={styles.anchorWrapper}>
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroTopRow}>
            <Button mode="text" textColor="#FFFFFF" icon="arrow-left" onPress={() => navigation.goBack()}>
              Kembali
            </Button>
            <IconButtonGhost icon="share-variant" />
          </View>
          <View style={{ alignItems: 'flex-start', marginTop: 10 }}>
            <Text style={styles.heroLabel}>Hasil Diagnosis AI</Text>
            <Text style={styles.heroTitle}>Tingkat risiko terdeteksi</Text>
          </View>
          <View style={styles.heroResultRow}>
            <RiskBadge level={result.riskLevel} style={{ transform: [{ scale: 1.05 }] }} />
            <View style={{ marginLeft: 16 }}>
              <Text style={styles.heroConfidence}>Keyakinan {Math.round(result.confidence * 100)}%</Text>
              <Text style={styles.heroSubtitle}>Bagikan hasil ini ke dokter untuk rekomendasi lanjutan.</Text>
            </View>
          </View>
          <View style={styles.heroStats}>
            {stats.map((stat) => (
              <View key={stat.label} style={styles.statItem}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingTop: headerHeight + 12, paddingBottom: 180, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Gigi terdampak</Text>
            <View style={styles.chipGroup}>
              {result.affectedTeeth.map((tooth) => (
                <Chip key={tooth} style={styles.chip}>
                  #{tooth}
                </Chip>
              ))}
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Kondisi yang terdeteksi</Text>
            {result.conditions.map((condition, index) => (
              <View key={condition.name} style={[styles.conditionItem, index < result.conditions.length - 1 && styles.conditionDivider]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontWeight: '700', color: '#0F172A' }}>{condition.name}</Text>
                  <RiskBadge level={condition.severity} size="small" />
                </View>
                <Text style={{ color: '#475569', marginTop: 4 }}>Keyakinan {Math.round(condition.confidence * 100)}%</Text>
              </View>
            ))}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Rekomendasi</Text>
            <Text style={{ color: '#475569', lineHeight: 22 }}>
              Mohon jadwalkan konsultasi dalam 7 hari untuk pemeriksaan manual. Dokter dapat
              mengevaluasi kondisi gusi, melakukan scaling, ataupun tindakan lanjutan sesuai hasil
              fisik.
            </Text>
            <View style={styles.recommendationChips}>
              <Chip icon="calendar-clock" style={styles.recommendationChip}>
                Kontrol berkala
              </Chip>
              <Chip icon="tooth-outline" style={styles.recommendationChip}>
                Pembersihan profesional
              </Chip>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button
          mode="contained"
          icon="calendar-plus"
          style={{ flex: 1 }}
          onPress={handleBookAppointment}
        >
          Buat janji konsultasi
        </Button>
        <Button
          mode="outlined"
          style={{ flex: 1, marginLeft: 12 }}
          onPress={() => navigation.navigate('AIHome')}
        >
          Scan lagi
        </Button>
      </View>

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
    </View>
  );
};

const IconButtonGhost = ({ icon, onPress }) => (
  <Button
    mode="text"
    compact
    icon={icon}
    onPress={onPress}
    textColor="rgba(255,255,255,0.9)"
    style={{ borderRadius: 999 }}
  />
);

const styles = StyleSheet.create({
  anchorWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  hero: {
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 32,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.75)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 12,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 4,
  },
  heroResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
  },
  heroConfidence: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8,
    marginRight: 32,
  },
  heroStats: {
    flexDirection: 'row',
    marginTop: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 6,
  },
  card: {
    borderRadius: 20,
    marginBottom: 18,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    backgroundColor: '#EEF2FF',
  },
  conditionItem: {
    paddingVertical: 10,
  },
  conditionDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  recommendationChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  recommendationChip: {
    backgroundColor: '#F1F5F9',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
});

export default ResultScreen;
