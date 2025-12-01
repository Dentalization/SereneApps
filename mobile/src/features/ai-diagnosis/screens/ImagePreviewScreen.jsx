import React from 'react';
import {
  View,
  ScrollView,
  StatusBar,
  Image,
  Dimensions,
  StyleSheet,
  Platform,
  PixelRatio,
  Alert,
} from 'react-native';
import { Text, Button, IconButton, useTheme, Chip } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import useAnchoredHeaderHeight from '../../../hooks/useAnchoredHeaderHeight';
import useToast from '../../../hooks/useToast';
import ValidationToast from '../../settings/components/ValidationToast';
import { createSession } from '../../../services/aiDiagnosisService';

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

const ImagePreviewScreen = ({ route, navigation }) => {
  const initialImages = (route && route.params && route.params.images) || [];
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { toast, showToast, hideToast } = useToast();
  const [images, setImages] = React.useState(initialImages);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [isCreatingSession, setIsCreatingSession] = React.useState(false);
  const { headerHeight, handleHeaderLayout } = useAnchoredHeaderHeight(260);

  React.useEffect(() => {
    if (!images.length) {
      navigation.goBack();
    }
  }, [images, navigation]);

  const removeImage = (index) => {
    setImages((prev) => {
      const next = prev.filter((_, idx) => idx !== index);
      if (selectedIndex >= next.length) {
        setSelectedIndex(Math.max(next.length - 1, 0));
      }
      return next;
    });
  };

  const handleAnalyze = async () => {
    if (!images.length || isCreatingSession) return;

    setIsCreatingSession(true);
    try {
      // Create analysis session
      const sessionResponse = await createSession({
        imageCount: images.length,
        timestamp: new Date().toISOString(),
      });

      // console.log('createSession response:', sessionResponse);

      const newSessionId =
        (sessionResponse && sessionResponse.sessionId) ||
        (sessionResponse && sessionResponse.data && sessionResponse.data.id) ||
        (sessionResponse &&
          sessionResponse.data &&
          sessionResponse.data.session_id);

      if (sessionResponse && sessionResponse.success && newSessionId) {
        // Navigate to analysis with session and images
        navigation.navigate('Analysis', {
          images,
          sessionId: newSessionId,
        });
        return;
      }

      // --- Pastikan errorMsg selalu string ---
      var rawError =
        (sessionResponse &&
          sessionResponse.error &&
          sessionResponse.error.message) ||
        (sessionResponse && sessionResponse.error) ||
        '';

      var errorMsg =
        typeof rawError === 'string' ? rawError : JSON.stringify(rawError);

      var lowerMsg = String(errorMsg || '').toLowerCase();

      var isServerError =
        lowerMsg.indexOf('504') !== -1 ||
        lowerMsg.indexOf('500') !== -1 ||
        lowerMsg.indexOf('timeout') !== -1 ||
        lowerMsg.indexOf('gateway') !== -1;

      if (isServerError) {
        showToast(
          'Server sedang bermasalah. Tim kami sedang memperbaikinya. Silakan coba lagi nanti.',
          'error',
        );
        setTimeout(() => {
          Alert.alert(
            '⚠️ Server Sedang Bermasalah',
            'Sistem AI diagnosis sedang mengalami gangguan teknis. Tim kami sedang memperbaikinya.\n\nSilakan coba lagi dalam beberapa saat.',
            [
              { text: 'Kembali', style: 'cancel', onPress: () => navigation.goBack() },
              { text: 'Coba Lagi', onPress: () => handleAnalyze() },
            ],
          );
        }, 500);
      } else {
        showToast(
          'Tidak dapat memulai analisis. Periksa koneksi internet Anda.',
          'error',
        );
      }
    } catch (error) {
      // console.log('createSession error:', error);

      var msg =
        typeof (error && error.message) === 'string'
          ? error.message
          : JSON.stringify(error || '');

      var lowerMsg = String(msg || '').toLowerCase();

      var isServerError =
        lowerMsg.indexOf('504') !== -1 ||
        lowerMsg.indexOf('500') !== -1 ||
        lowerMsg.indexOf('timeout') !== -1 ||
        (error && error.code === 'ECONNABORTED');

      if (isServerError) {
        showToast('Server sedang bermasalah. Silakan coba lagi nanti.', 'error');
        setTimeout(() => {
          Alert.alert(
            '⚠️ Server Sedang Bermasalah',
            'Sistem AI diagnosis sedang mengalami gangguan teknis. Tim kami sedang memperbaikinya.\n\nSilakan coba lagi dalam beberapa saat.',
            [
              { text: 'Kembali', style: 'cancel', onPress: () => navigation.goBack() },
              { text: 'Coba Lagi', onPress: () => handleAnalyze() },
            ],
          );
        }, 500);
      } else {
        showToast(
          'Gagal memulai analisis. Periksa koneksi internet Anda.',
          'error',
        );
      }
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleRetake = () => {
    navigation.replace('Camera');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      <View onLayout={handleHeaderLayout} style={styles.anchorWrapper}>
        <LinearGradient
          colors={['#FFFFFF', '#F0F4FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + normalize(10) }]}
        >
          <View style={styles.heroTopRow}>
            <IconButton
              icon="arrow-left"
              size={normalize(24)}
              iconColor="#1F2937"
              onPress={() => navigation.goBack()}
            />
            <Text style={styles.heroTitle}>Tinjau Foto</Text>
            <IconButton
              icon="information-outline"
              size={normalize(24)}
              iconColor="#1F2937"
              onPress={() => {}}
            />
          </View>
          <Text style={styles.heroSubtitle}>
            Pastikan foto tajam dan area gigi terlihat jelas sebelum analisis.
          </Text>
          <View style={styles.heroMeta}>
            <View style={styles.metaItem}>
              <Text style={styles.metaValue}>{images.length}</Text>
              <Text style={styles.metaLabel}>Foto dipilih</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <MaterialCommunityIcons
                name="shield-check"
                size={normalize(20)}
                color="#10B981"
              />
              <Text style={[styles.metaLabel, { marginTop: normalize(6) }]}>
                Data terenkripsi
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight + normalize(10),
          paddingBottom: normalize(140),
        }}
        showsVerticalScrollIndicator={false}
      >
        {images[selectedIndex] && (
          <View style={styles.imageCard}>
            <Image
              source={{ uri: images[selectedIndex].uri }}
              style={styles.mainImage}
              resizeMode="cover"
            />
            <View style={styles.imageOverlay}>
              <View style={styles.overlayBadge}>
                <MaterialCommunityIcons
                  name="brightness-6"
                  size={normalize(16)}
                  color="#FFFFFF"
                />
                <Text style={styles.overlayText}>Pencahayaan baik</Text>
              </View>
              <Text style={styles.overlayFilename} numberOfLines={1}>
                {images[selectedIndex].fileName || 'Foto yang diambil'}
              </Text>
            </View>
          </View>
        )}

        {images.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbnailList}
          >
            {images.map((image, index) => (
              <View key={image.uri + '-' + index} style={styles.thumbnailWrapper}>
                <Image
                  source={{ uri: image.uri }}
                  style={[
                    styles.thumbnail,
                    selectedIndex === index && styles.thumbnailActive,
                  ]}
                  onTouchEnd={() => setSelectedIndex(index)}
                />
                <IconButton
                  icon="close-circle"
                  size={normalize(18)}
                  iconColor={theme.colors.error}
                  style={styles.thumbnailRemove}
                  onPress={() => removeImage(index)}
                />
              </View>
            ))}
          </ScrollView>
        )}

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Checklist sebelum analisis</Text>
          <Chip
            icon="check"
            style={styles.infoChip}
            textStyle={{ fontSize: normalize(12) }}
          >
            Area gigi depan dan samping terlihat
          </Chip>
          <Chip
            icon="check"
            style={styles.infoChip}
            textStyle={{ fontSize: normalize(12) }}
          >
            Minimal 3 foto dengan sudut berbeda
          </Chip>
          <Chip
            icon="check"
            style={styles.infoChip}
            textStyle={{ fontSize: normalize(12) }}
          >
            Tidak ada filter atau efek
          </Chip>
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          { paddingBottom: insets.bottom + normalize(20) },
        ]}
      >
        <Button
          mode="outlined"
          style={{ flex: 1, marginRight: normalize(12) }}
          onPress={handleRetake}
          labelStyle={{ fontSize: normalize(14) }}
          disabled={isCreatingSession}
        >
          Ambil ulang
        </Button>
        <Button
          mode="contained"
          icon="brain"
          style={{ flex: 1 }}
          onPress={handleAnalyze}
          disabled={!images.length || isCreatingSession}
          loading={isCreatingSession}
          labelStyle={{ fontSize: normalize(14) }}
        >
          {isCreatingSession ? 'Memulai...' : 'Analisis sekarang'}
        </Button>
      </View>

      <ValidationToast
        visible={toast.visible}
        message={toast.message}
        status={toast.status}
        onDismiss={hideToast}
      />
    </View>
  );
};

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
    paddingBottom: normalize(24),
    borderBottomLeftRadius: normalize(32),
    borderBottomRightRadius: normalize(32),
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTitle: {
    color: '#1F2937',
    fontSize: normalize(18),
    fontWeight: '700',
  },
  heroSubtitle: {
    color: '#6B7280',
    marginTop: normalize(12),
    lineHeight: normalize(20),
    fontSize: normalize(14),
  },
  heroMeta: {
    flexDirection: 'row',
    marginTop: normalize(20),
    backgroundColor: '#FFFFFF',
    borderRadius: normalize(16),
    padding: normalize(16),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  metaItem: {
    flex: 1,
  },
  metaValue: {
    color: '#7C3AED',
    fontSize: normalize(20),
    fontWeight: '700',
  },
  metaLabel: {
    color: '#6B7280',
    fontSize: normalize(12),
  },
  metaDivider: {
    width: 1,
    height: normalize(32),
    backgroundColor: '#E5E7EB',
    marginHorizontal: normalize(12),
  },
  imageCard: {
    marginHorizontal: normalize(20),
    borderRadius: normalize(28),
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  mainImage: {
    width: SCREEN_WIDTH - normalize(40),
    height: (SCREEN_WIDTH - normalize(40)) * 1.2,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: normalize(16),
    left: normalize(16),
    right: normalize(16),
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: normalize(20),
    padding: normalize(12),
  },
  overlayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(52,211,153,0.2)',
    paddingHorizontal: normalize(10),
    paddingVertical: normalize(4),
    borderRadius: normalize(12),
  },
  overlayText: {
    color: '#FFFFFF',
    marginLeft: normalize(6),
    fontSize: normalize(12),
  },
  overlayFilename: {
    color: '#FFFFFF',
    marginTop: normalize(8),
    fontSize: normalize(14),
  },
  thumbnailList: {
    paddingHorizontal: normalize(20),
    paddingTop: normalize(16),
  },
  thumbnailWrapper: {
    marginRight: normalize(12),
    position: 'relative',
  },
  thumbnail: {
    width: normalize(68),
    height: normalize(68),
    borderRadius: normalize(16),
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailActive: {
    borderColor: '#7C3AED',
  },
  thumbnailRemove: {
    position: 'absolute',
    top: normalize(-10),
    right: normalize(-10),
    margin: 0,
  },
  infoSection: {
    paddingHorizontal: normalize(20),
    paddingTop: normalize(12),
  },
  infoTitle: {
    color: '#1F2937',
    fontWeight: '700',
    marginBottom: normalize(10),
    fontSize: normalize(14),
  },
  infoChip: {
    marginBottom: normalize(10),
    backgroundColor: '#F0F4FF',
    borderColor: '#E0E7FF',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    padding: normalize(20),
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 8,
    elevation: 4,
  },
});

export default ImagePreviewScreen;
