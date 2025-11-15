import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Button, IconButton, useTheme } from 'react-native-paper';
import { Camera } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const CameraScreen = ({ navigation }) => {
  const theme = useTheme();
  const [hasPermission, setHasPermission] = React.useState(null);
  const [type, setType] = React.useState(Camera.Constants.Type.back);
  const [flash, setFlash] = React.useState(Camera.Constants.FlashMode.off);
  const cameraRef = React.useRef(null);

  React.useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });
      navigation.navigate('ImagePreview', { images: [photo] });
    }
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      maxSelected: 5,
    });

    if (!result.canceled) {
      navigation.navigate('ImagePreview', { images: result.assets });
    }
  };

  const toggleFlash = () => {
    setFlash(
      flash === Camera.Constants.FlashMode.off
        ? Camera.Constants.FlashMode.on
        : Camera.Constants.FlashMode.off
    );
  };

  const toggleCamera = () => {
    setType(
      type === Camera.Constants.Type.back
        ? Camera.Constants.Type.front
        : Camera.Constants.Type.back
    );
  };

  if (hasPermission === null) {
    return <View style={styles.container} />;
  }

  if (hasPermission === false) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <MaterialCommunityIcons name="camera-off" size={64} color={theme.colors.outline} />
        <Text variant="titleMedium" style={{ marginTop: 16, marginBottom: 8 }}>
          Akses Kamera Diperlukan
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
          SereneAI membutuhkan akses kamera untuk mengambil foto gigi Anda
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera style={styles.camera} type={type} flashMode={flash} ref={cameraRef}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <IconButton
            icon="close"
            iconColor="#FFFFFF"
            size={28}
            onPress={() => navigation.goBack()}
          />
          <IconButton
            icon={flash === Camera.Constants.FlashMode.off ? 'flash-off' : 'flash'}
            iconColor="#FFFFFF"
            size={28}
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

        {/* Bottom Controls */}
        <View style={styles.bottomBar}>
          <IconButton
            icon="image"
            iconColor="#FFFFFF"
            size={32}
            onPress={pickFromGallery}
          />
          <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>
          <IconButton
            icon="camera-flip"
            iconColor="#FFFFFF"
            size={32}
            onPress={toggleCamera}
          />
        </View>
      </Camera>
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
    padding: 24,
  },
  camera: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingHorizontal: 8,
  },
  guideOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  guideBox: {
    width: 280,
    height: 200,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    borderRadius: 16,
    borderStyle: 'dashed',
  },
  guideText: {
    color: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 32,
    paddingTop: 16,
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
  },
});

export default CameraScreen;
