import React from 'react';
import { View, ScrollView, StatusBar, StyleSheet, Dimensions, Platform, PixelRatio } from 'react-native';
import { Text, Card, Button, useTheme, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import RiskBadge from '../../../components/shared/RiskBadge';
import AuthGuard from '../../../components/shared/AuthGuard';
import { AUTH_LEVELS } from '../../../store/slices/authSlice';
import useAnchoredHeaderHeight from '../../../hooks/useAnchoredHeaderHeight';

// --- UTILS RESPONSIVE ---
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 375; // Base width iPhone 11/Pro

const normalize = (size) => {
  const newSize = size * scale;
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  } else {
    return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 1;
  }
};
// -------------------------

const RISK_GRADIENTS = {
  low: ['#0F9D58', '#34A853'],
  medium: ['#F97316', '#FB923C'],
  high: ['#DC2626', '#EF4444'],
};

const ResultScreen = ({ route, navigation }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
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
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <View onLayout={handleHeaderLayout} style={styles.anchorWrapper}>
        <LinearGradient 
          colors={gradient} 
          start={{ x: 0, y: 0 }} 
          end={{ x: 1, y: 1 }} 
          style={[styles.hero, { paddingTop: insets.top + normalize(10) }]}
        >
          <View style={styles.heroTopRow}>
            <Button mode="text" textColor="#FFFFFF" icon="arrow-left" onPress={() => navigation.goBack()} labelStyle={{ fontSize: normalize(14) }}>
              Kembali
            </Button>
            <IconButtonGhost icon="share-variant" onPress={() => {}} />
          </View>
          <View style={{ alignItems: 'flex-start', marginTop: normalize(10) }}>
            <Text style={styles.heroLabel}>Hasil Diagnosis AI</Text>
            <Text style={styles.heroTitle}>Tingkat risiko terdeteksi</Text>
          </View>
          <View style={styles.heroResultRow}>
            <RiskBadge level={result.riskLevel} style={{ transform: [{ scale: 1.05 }] }} />
            <View style={{ marginLeft: normalize(16), flex: 1 }}>
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
        contentContainerStyle={{ 
          paddingTop: headerHeight + normalize(12), 
          paddingBottom: normalize(180), 
          paddingHorizontal: normalize(20) 
        }}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Gigi terdampak</Text>
            <View style={styles.chipGroup}>
              {result.affectedTeeth.map((tooth) => (
                <Chip key={tooth} style={styles.chip} textStyle={{ fontSize: normalize(12) }}>
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
                  <Text style={{ fontWeight: '700', color: '#0F172A', fontSize: normalize(14) }}>{condition.name}</Text>
                  <RiskBadge level={condition.severity} size="small" />
                </View>
                <Text style={{ color: '#475569', marginTop: normalize(4), fontSize: normalize(12) }}>Keyakinan {Math.round(condition.confidence * 100)}%</Text>
              </View>
            ))}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Rekomendasi</Text>
            <Text style={{ color: '#475569', lineHeight: normalize(22), fontSize: normalize(14) }}>
              Mohon jadwalkan konsultasi dalam 7 hari untuk pemeriksaan manual. Dokter dapat
              mengevaluasi kondisi gusi, melakukan scaling, ataupun tindakan lanjutan sesuai hasil
              fisik.
            </Text>
            <View style={styles.recommendationChips}>
              <Chip icon="calendar-clock" style={styles.recommendationChip} textStyle={{ fontSize: normalize(12) }}>
                Kontrol berkala
              </Chip>
              <Chip icon="tooth-outline" style={styles.recommendationChip} textStyle={{ fontSize: normalize(12) }}>
                Pembersihan profesional
              </Chip>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + normalize(20) }]}>
        <Button
          mode="contained"
          icon="calendar-plus"
          style={{ flex: 1 }}
          onPress={handleBookAppointment}
          labelStyle={{ fontSize: normalize(14) }}
        >
          Buat janji konsultasi
        </Button>
        <Button
          mode="outlined"
          style={{ flex: 1, marginLeft: normalize(12) }}
          onPress={() => navigation.navigate('AIHome')}
          labelStyle={{ fontSize: normalize(14) }}
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
    style={{ borderRadius: 999, minWidth: 0, paddingHorizontal: normalize(8) }}
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
    // paddingTop handled inline
    paddingHorizontal: normalize(20),
    paddingBottom: normalize(32),
    borderBottomLeftRadius: normalize(32),
    borderBottomRightRadius: normalize(32),
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
    fontSize: normalize(12),
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: normalize(24),
    fontWeight: '700',
    marginTop: normalize(4),
  },
  heroResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: normalize(24),
  },
  heroConfidence: {
    color: '#FFFFFF',
    fontSize: normalize(18),
    fontWeight: '700',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    marginTop: normalize(8),
    marginRight: normalize(32),
    fontSize: normalize(14),
  },
  heroStats: {
    flexDirection: 'row',
    marginTop: normalize(24),
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: normalize(20),
    padding: normalize(16),
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: normalize(18),
    fontWeight: '700',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: normalize(12),
    marginTop: normalize(6),
  },
  card: {
    borderRadius: normalize(20),
    marginBottom: normalize(18),
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: normalize(16),
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: normalize(12),
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: normalize(10),
  },
  chip: {
    backgroundColor: '#EEF2FF',
  },
  conditionItem: {
    paddingVertical: normalize(10),
  },
  conditionDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  recommendationChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: normalize(8),
    marginTop: normalize(16),
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
    padding: normalize(20),
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: normalize(24),
    borderTopRightRadius: normalize(24),
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
});

export default ResultScreen;