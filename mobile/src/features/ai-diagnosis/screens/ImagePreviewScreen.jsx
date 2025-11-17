import React from 'react';
import { View, ScrollView, StatusBar, Image, Dimensions, StyleSheet } from 'react-native';
import { Text, Button, IconButton, useTheme, Chip } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import useHideTabBar from '../../../hooks/useHideTabBar';
import useAnchoredHeaderHeight from '../../../hooks/useAnchoredHeaderHeight';

const { width } = Dimensions.get('window');

const ImagePreviewScreen = ({ route, navigation }) => {
  const initialImages = route.params?.images || [];
  const theme = useTheme();
  const [images, setImages] = React.useState(initialImages);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const { headerHeight, handleHeaderLayout } = useAnchoredHeaderHeight(260);

  useHideTabBar(navigation);

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
      <StatusBar barStyle="light-content" backgroundColor="#050914" />

      <View onLayout={handleHeaderLayout} style={styles.anchorWrapper}>
        <LinearGradient colors={['#0B1121', '#1D1B3A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroTopRow}>
            <IconButton icon="arrow-left" size={24} iconColor="#FFFFFF" onPress={() => navigation.goBack()} />
            <Text style={styles.heroTitle}>Tinjau Foto</Text>
            <IconButton icon="information-outline" size={24} iconColor="#FFFFFF" onPress={() => {}} />
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
                <MaterialCommunityIcons name="shield-check" size={20} color="#34D399" />
                <Text style={[styles.metaLabel, { marginTop: 6 }]}>Data terenkripsi</Text>
              </View>
          </View>
        </LinearGradient>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingTop: headerHeight + 10, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {images[selectedIndex] && (
          <View style={styles.imageCard}>
            <Image source={{ uri: images[selectedIndex].uri }} style={styles.mainImage} resizeMode="cover" />
            <View style={styles.imageOverlay}>
              <View style={styles.overlayBadge}>
                <MaterialCommunityIcons name="brightness-6" size={16} color="#FFFFFF" />
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
                  size={18}
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
          <Chip icon="check" style={styles.infoChip}>
            Area gigi depan dan samping terlihat
          </Chip>
          <Chip icon="check" style={styles.infoChip}>
            Minimal 3 foto dengan sudut berbeda
          </Chip>
          <Chip icon="check" style={styles.infoChip}>
            Tidak ada filter atau efek
          </Chip>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button mode="outlined" style={{ flex: 1, marginRight: 12 }} onPress={handleRetake}>
          Ambil ulang
        </Button>
        <Button mode="contained" icon="brain" style={{ flex: 1 }} onPress={handleAnalyze} disabled={!images.length}>
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
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    marginTop: 12,
    lineHeight: 20,
  },
  heroMeta: {
    flexDirection: 'row',
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  metaItem: {
    flex: 1,
  },
  metaValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  metaLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  metaDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 12,
  },
  imageCard: {
    marginHorizontal: 20,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 24,
    elevation: 12,
  },
  mainImage: {
    width: width - 40,
    height: (width - 40) * 1.2,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 20,
    padding: 12,
  },
  overlayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(52,211,153,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  overlayText: {
    color: '#FFFFFF',
    marginLeft: 6,
    fontSize: 12,
  },
  overlayFilename: {
    color: '#FFFFFF',
    marginTop: 8,
  },
  thumbnailList: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  thumbnailWrapper: {
    marginRight: 12,
    position: 'relative',
  },
  thumbnail: {
    width: 68,
    height: 68,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailActive: {
    borderColor: '#7C3AED',
  },
  thumbnailRemove: {
    position: 'absolute',
    top: -10,
    right: -10,
    margin: 0,
  },
  infoSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  infoTitle: {
    color: '#E2E8F0',
    fontWeight: '700',
    marginBottom: 10,
  },
  infoChip: {
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.15)',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    padding: 20,
    backgroundColor: 'rgba(5,9,20,0.95)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
});

export default ImagePreviewScreen;
