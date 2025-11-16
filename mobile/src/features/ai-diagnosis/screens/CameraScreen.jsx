import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, IconButton, useTheme } from 'react-native-paper';
import { Camera } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import useHideTabBar from '../../../hooks/useHideTabBar';

const CameraScreen = ({ navigation }) => {
  const theme = useTheme();
  const [hasPermission, setHasPermission] = React.useState(null);
  const [type, setType] = React.useState(null); // mulai null, di-set setelah permission OK
  const [flash, setFlash] = React.useState(Camera.Constants?.FlashMode?.off ?? 0);
  const cameraRef = React.useRef(null);

  useHideTabBar(navigation);

  React.useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      if (status === 'granted') {
        setHasPermission(true);
        const backType = Camera.Constants?.Type?.back;
        setType(backType); // set type di sini supaya nggak undefined
      } else {
        setHasPermission(false);
      }
    })();
  }, []);

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          skipProcessing: false,
        });
        navigation.navigate('ImagePreview', { images: [photo] });
      } catch (e) {
        console.warn('Failed to take picture', e);
      }
    }
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 5, // lebih aman di versi baru expo-image-picker
    });

    if (!result.canceled) {
      navigation.navigate('ImagePreview', { images: result.assets });
    }
  };

  const toggleFlash = () => {
    const off = Camera.Constants?.FlashMode?.off;
    const on = Camera.Constants?.FlashMode?.on;
    setFlash((prev) => (prev === off ? on : off));
  };

  const toggleCamera = () => {
    const back = Camera.Constants?.Type?.back;
    const front = Camera.Constants?.Type?.front;
    setType((prev) => (prev === back ? front : back));
  };

  // Masih loading permission atau type belum siap -> jangan render Camera dulu
  if (hasPermission === null || type == null) {
    return <View style={styles.container} />;
  }

  if (hasPermission === false) {
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
          size={64}
          color={theme.colors.outline}
        />
        <Text
          variant="titleMedium"
          style={{ marginTop: 16, marginBottom: 8 }}
        >
          Akses Kamera Diperlukan
        </Text>
        <Text
          variant="bodyMedium"
          style={{
            color: theme.colors.onSurfaceVariant,
            textAlign: 'center',
          }}
        >
          SereneAI membutuhkan akses kamera untuk mengambil foto gigi Anda
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={styles.camera}
        type={type}
        flashMode={flash}
        ref={cameraRef}
      >
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
  },
  guideBox: {
    width: 280,
    height: 200,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    borderRadius: 16,
    borderStyle: 'dashed',
    marginBottom: 16,
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
