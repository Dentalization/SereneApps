import React from 'react';
import { View, ScrollView, StatusBar, Image, Dimensions, StyleSheet, Platform, PixelRatio } from 'react-native';
import { Text, Button, IconButton, useTheme, Chip } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

const ImagePreviewScreen = ({ route, navigation }) => {
  const initialImages = route.params?.images || [];
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [images, setImages] = React.useState(initialImages);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
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

  const handleAnalyze = () => {
    if (!images.length) return;
    navigation.navigate('Analysis', { images });
  };

  const handleRetake = () => {
    navigation.replace('Camera');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#050914' }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <View onLayout={handleHeaderLayout} style={styles.anchorWrapper}>
        <LinearGradient 
          colors={['#0B1121', '#1D1B3A']} 
          start={{ x: 0, y: 0 }} 
          end={{ x: 1, y: 1 }} 
          style={[styles.hero, { paddingTop: insets.top + normalize(10) }]}
        >
          <View style={styles.heroTopRow}>
            <IconButton icon="arrow-left" size={normalize(24)} iconColor="#FFFFFF" onPress={() => navigation.goBack()} />
            <Text style={styles.heroTitle}>Tinjau Foto</Text>
            <IconButton icon="information-outline" size={normalize(24)} iconColor="#FFFFFF" onPress={() => {}} />
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
                <MaterialCommunityIcons name="shield-check" size={normalize(20)} color="#34D399" />
                <Text style={[styles.metaLabel, { marginTop: normalize(6) }]}>Data terenkripsi</Text>
              </View>
          </View>
        </LinearGradient>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingTop: headerHeight + normalize(10), paddingBottom: normalize(140) }}
        showsVerticalScrollIndicator={false}
      >
        {images[selectedIndex] && (
          <View style={styles.imageCard}>
            <Image source={{ uri: images[selectedIndex].uri }} style={styles.mainImage} resizeMode="cover" />
            <View style={styles.imageOverlay}>
              <View style={styles.overlayBadge}>
                <MaterialCommunityIcons name="brightness-6" size={normalize(16)} color="#FFFFFF" />
                <Text style={styles.overlayText}>Pencahayaan baik</Text>
              </View>
              <Text style={styles.overlayFilename} numberOfLines={1}>
                {images[selectedIndex]?.fileName || 'Foto yang diambil'}
              </Text>
            </View>
          </View>
        )}

        {images.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnailList}>
            {images.map((image, index) => (
              <View key={`${image.uri}-${index}`} style={styles.thumbnailWrapper}>
                <Image
                  source={{ uri: image.uri }}
                  style={[styles.thumbnail, selectedIndex === index && styles.thumbnailActive]}
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
          <Chip icon="check" style={styles.infoChip} textStyle={{fontSize: normalize(12)}}>
            Area gigi depan dan samping terlihat
          </Chip>
          <Chip icon="check" style={styles.infoChip} textStyle={{fontSize: normalize(12)}}>
            Minimal 3 foto dengan sudut berbeda
          </Chip>
          <Chip icon="check" style={styles.infoChip} textStyle={{fontSize: normalize(12)}}>
            Tidak ada filter atau efek
          </Chip>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + normalize(20) }]}>
        <Button mode="outlined" style={{ flex: 1, marginRight: normalize(12) }} onPress={handleRetake} labelStyle={{fontSize: normalize(14)}}>
          Ambil ulang
        </Button>
        <Button mode="contained" icon="brain" style={{ flex: 1 }} onPress={handleAnalyze} disabled={!images.length} labelStyle={{fontSize: normalize(14)}}>
          Analisis sekarang
        </Button>
      </View>
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
    color: '#FFFFFF',
    fontSize: normalize(18),
    fontWeight: '700',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    marginTop: normalize(12),
    lineHeight: normalize(20),
    fontSize: normalize(14),
  },
  heroMeta: {
    flexDirection: 'row',
    marginTop: normalize(20),
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: normalize(16),
    padding: normalize(16),
    alignItems: 'center',
  },
  metaItem: {
    flex: 1,
  },
  metaValue: {
    color: '#FFFFFF',
    fontSize: normalize(20),
    fontWeight: '700',
  },
  metaLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: normalize(12),
  },
  metaDivider: {
    width: 1,
    height: normalize(32),
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: normalize(12),
  },
  imageCard: {
    marginHorizontal: normalize(20),
    borderRadius: normalize(28),
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: normalize(14) },
    shadowRadius: normalize(24),
    elevation: 12,
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
    color: '#E2E8F0',
    fontWeight: '700',
    marginBottom: normalize(10),
    fontSize: normalize(14),
  },
  infoChip: {
    marginBottom: normalize(10),
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.15)',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    padding: normalize(20),
    backgroundColor: 'rgba(5,9,20,0.95)',
    borderTopLeftRadius: normalize(24),
    borderTopRightRadius: normalize(24),
  },
});

export default ImagePreviewScreen;