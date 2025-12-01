import React from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, Platform, PixelRatio } from 'react-native';
import { Text, IconButton, Button, useTheme } from 'react-native-paper';
import { CameraView, CameraType, FlashMode, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
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

const CameraScreen = ({ navigation }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = React.useState('back');
  const [flash, setFlash] = React.useState('off');
  const cameraRef = React.useRef(null);

  React.useEffect(() => {
    (async () => {
      if (!permission) {
        console.log('🎥 Requesting camera permissions...');
        const result = await requestPermission();
        console.log('🎥 Camera permission status:', result.status);
      } else {
        console.log('🎥 Camera permission already granted');
      }
    })();
  }, [permission, requestPermission]);

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        console.log('📸 Taking picture...');
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
        });
        console.log('✅ Picture taken:', photo.uri);
        navigation.navigate('ImagePreview', { images: [photo] });
      } catch (e) {
        console.error('❌ Failed to take picture:', e);
        alert('Gagal mengambil foto. Silakan coba lagi.');
      }
    } else {
      console.warn('⚠️ Camera ref is null');
    }
  };

  const pickFromGallery = async () => {
    try {
      console.log('🖼️ Opening gallery...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5, 
      });

      console.log('Gallery result:', result);
      
      if (!result.canceled) {
        console.log('✅ Images selected:', result.assets.length);
        navigation.navigate('ImagePreview', { images: result.assets });
      }
    } catch (error) {
      console.error('❌ Gallery picker error:', error);
      alert('Gagal membuka galeri. Silakan coba lagi.');
    }
  };

  const toggleFlash = () => {
    setFlash(current => (current === 'off' ? 'on' : 'off'));
  };

  const toggleCamera = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  if (!permission) {
    // Loading permissions
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <MaterialCommunityIcons
          name="camera"
          size={normalize(64)}
          color={theme.colors.primary}
        />
        <Text
          variant="titleMedium"
          style={{ marginTop: normalize(16), color: theme.colors.onBackground }}
        >
          Memuat kamera...
        </Text>
      </View>
    );
  }

  if (!permission.granted) {
    // Permission not granted
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <MaterialCommunityIcons
          name="camera-off"
          size={normalize(64)}
          color={theme.colors.outline}
        />
        <Text
          variant="titleMedium"
          style={{ marginTop: normalize(16), marginBottom: normalize(8) }}
        >
          Akses Kamera Diperlukan
        </Text>
        <Text
          variant="bodyMedium"
          style={{
            color: theme.colors.onSurfaceVariant,
            textAlign: 'center',
            paddingHorizontal: normalize(24),
          }}
        >
          SereneAI membutuhkan akses kamera untuk mengambil foto gigi Anda
        </Text>
        <Button
          mode="contained"
          onPress={requestPermission}
          style={{ marginTop: normalize(20) }}
        >
          Berikan Akses
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing={facing}
        flash={flash}
        ref={cameraRef}
      >
        {/* Top Bar - Menggunakan Insets untuk padding atas */}
        <View style={[styles.topBar, { paddingTop: insets.top + normalize(12) }]}>
          <IconButton
            icon="close"
            iconColor="#FFFFFF"
            size={normalize(28)}
            onPress={() => navigation.goBack()}
          />
          <IconButton
            icon={flash === 'off' ? 'flash-off' : 'flash'}
            iconColor="#FFFFFF"
            size={normalize(28)}
            onPress={toggleFlash}
          />
        </View>

        {/* Guide Overlay */}
        <View style={styles.guideOverlay}>
          <View style={styles.guideBox} />
          <Text variant="bodyMedium" style={styles.guideText}>
            Posisikan gigi di dalam kotak
          </Text>
        </View>

        {/* Bottom Controls - Menggunakan Insets untuk padding bawah */}
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + normalize(20) }]}>
          <IconButton
            icon="image"
            iconColor="#FFFFFF"
            size={normalize(32)}
            onPress={pickFromGallery}
          />
          <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>
          <IconButton
            icon="camera-flip"
            iconColor="#FFFFFF"
            size={normalize(32)}
            onPress={toggleCamera}
          />
        </View>
      </CameraView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: normalize(24),
  },
  camera: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: normalize(8),
    // paddingTop ditangani via inline style dengan insets
  },
  guideOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideBox: {
    width: normalize(280),
    height: normalize(200),
    borderWidth: 3,
    borderColor: '#FFFFFF',
    borderRadius: normalize(16),
    borderStyle: 'dashed',
    marginBottom: normalize(16),
  },
  guideText: {
    color: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: normalize(16),
    paddingVertical: normalize(8),
    borderRadius: normalize(20),
    fontSize: normalize(14),
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: normalize(16),
    backgroundColor: 'rgba(0,0,0,0.15)', // Sedikit gelap agar kontras
    // paddingBottom ditangani via inline style dengan insets
  },
  captureButton: {
    width: normalize(72),
    height: normalize(72),
    borderRadius: normalize(36),
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  captureButtonInner: {
    width: normalize(56),
    height: normalize(56),
    borderRadius: normalize(28),
    backgroundColor: '#FFFFFF',
  },
});

export default CameraScreen;