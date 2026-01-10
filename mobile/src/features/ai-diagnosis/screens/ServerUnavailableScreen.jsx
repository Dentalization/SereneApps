import React from 'react';
import { View, StyleSheet, StatusBar, Dimensions, Platform, PixelRatio } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

const ServerUnavailableScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const params = route?.params || {};
  const origin = params.origin || 'analysis';
  const retryParams = params.retryParams || {};
  const errorDetail = params.errorDetail || '';

  const primaryLabel = origin === 'analysis' ? 'Coba lagi analisis' : 'Kembali ke chat';

  const handlePrimary = () => {
    if (origin === 'analysis') {
      // Relaunch analysis with same payload
      navigation.replace('Analysis', retryParams);
    } else {
      // Return to chat screen to retry send
      navigation.goBack();
    }
  };

  const handleSecondary = () => {
    navigation.navigate('AIHome');
  };

  const detailText = 'Server AI sedang dalam maintenance. Kami akan membuatnya kembali online dalam beberapa menit lagi.';

  return (
    <LinearGradient
      colors={['#5B21B6', '#7C3AED']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.cardWrapper}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="alert" size={normalize(32)} color="#F59E0B" />
          </View>
          <Text style={styles.title}>Server Sedang Bermasalah</Text>
          <Text style={styles.subtitle}>
            Server AI diagnosis sedang tidak tersedia. Kami sudah menerima log ini dan sedang memperbaikinya.
          </Text>

          <View style={styles.detailBox}>
            <Text style={styles.detailText}>{detailText}</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bullet}>• Server sedang dalam proses perbaikan</Text>
              <Text style={styles.bullet}>• Fitur AI akan kembali dalam beberapa menit</Text>
              <Text style={styles.bullet}>• Terima kasih atas kesabarannya</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <Button
              mode="contained"
              onPress={handlePrimary}
              style={styles.primaryButton}
              labelStyle={styles.primaryLabel}
            >
              {primaryLabel}
            </Button>
            <Button
              mode="text"
              onPress={handleSecondary}
              labelStyle={styles.secondaryLabel}
            >
              Kembali ke Home
            </Button>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardWrapper: {
    width: '100%',
    paddingHorizontal: normalize(20),
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: normalize(24),
    padding: normalize(20),
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  iconCircle: {
    width: normalize(56),
    height: normalize(56),
    borderRadius: normalize(28),
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: normalize(12),
  },
  title: {
    textAlign: 'center',
    fontSize: normalize(18),
    fontWeight: '700',
    color: '#111827',
    marginBottom: normalize(8),
  },
  subtitle: {
    textAlign: 'center',
    fontSize: normalize(14),
    color: '#4B5563',
    lineHeight: normalize(20),
    marginBottom: normalize(16),
  },
  detailBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: normalize(16),
    padding: normalize(14),
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailTitle: {
    fontSize: normalize(13),
    fontWeight: '700',
    color: '#374151',
    marginBottom: normalize(6),
  },
  detailText: {
    fontSize: normalize(13),
    color: '#4B5563',
    lineHeight: normalize(18),
    marginBottom: normalize(8),
  },
  bulletList: {
    gap: normalize(4),
  },
  bullet: {
    fontSize: normalize(13),
    color: '#4B5563',
  },
  actions: {
    marginTop: normalize(18),
    gap: normalize(6),
  },
  primaryButton: {
    backgroundColor: '#7C3AED',
  },
  primaryLabel: {
    fontSize: normalize(14),
    fontWeight: '700',
  },
  secondaryLabel: {
    fontSize: normalize(14),
    color: '#1F2937',
  },
});

export default ServerUnavailableScreen;
