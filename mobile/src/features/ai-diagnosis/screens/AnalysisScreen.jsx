import React from 'react';
import { View, StyleSheet, StatusBar, Dimensions, Platform, PixelRatio, Alert } from 'react-native';
import { Text, ProgressBar, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { analyzeImage } from '../../../services/aiDiagnosisService';
import useToast from '../../../hooks/useToast';
import ValidationToast from '../../settings/components/ValidationToast';

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

const AnalysisScreen = ({ route, navigation }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { toast, showToast, hideToast } = useToast();
  const { images, sessionId } = route.params || {};
  const [progress, setProgress] = React.useState(0);
  const [status, setStatus] = React.useState('Memproses gambar...');
  const analysisRef = React.useRef(false);

  React.useEffect(() => {
    if (!images || !sessionId || analysisRef.current) return;
    
    analysisRef.current = true;
    performAnalysis();
  }, [images, sessionId]);

  const performAnalysis = async () => {
    try {
      // Stage 1: Prepare images
      setProgress(0.2);
      setStatus('Memproses gambar...');
      await new Promise(resolve => setTimeout(resolve, 800));

      // Stage 2: Upload and detect
      setProgress(0.4);
      setStatus('Mendeteksi area gigi...');
      await new Promise(resolve => setTimeout(resolve, 800));

      // Stage 3: Call AI API
      setProgress(0.6);
      setStatus('Menganalisis kondisi...');

      const analysisResponse = await analyzeImage({
        sessionId,
        imageUris: images.map(img => img.uri),
        language: 'id',
        role: 'patient',
      });

      // Stage 4: Process results
      setProgress(0.8);
      setStatus('Menghitung tingkat risiko...');
      await new Promise(resolve => setTimeout(resolve, 600));

      // Stage 5: Complete
      setProgress(1.0);
      setStatus('Selesai!');

      if (analysisResponse.success && analysisResponse.data) {
        // Navigate to results with API data
        setTimeout(() => {
          navigation.replace('Result', {
            sessionId,
            analysisData: analysisResponse.data,
            images,
          });
        }, 500);
      } else {
        // Handle API error
        const errorMessage = analysisResponse.error?.message || analysisResponse.error || 'Terjadi kesalahan saat menganalisis gambar.';
        const isServerError = 
          errorMessage.includes('504') || 
          errorMessage.includes('500') ||
          errorMessage.includes('timeout') || 
          errorMessage.includes('Gateway') ||
          errorMessage.includes('ECONNABORTED');
        
        if (isServerError) {
          showToast(
            'Server AI sedang bermasalah. Tim kami sedang memperbaikinya.',
            'error'
          );
        }
        
        setTimeout(() => {
          Alert.alert(
            '⚠️ Server Sedang Bermasalah',
            'Server AI diagnosis sedang mengalami gangguan teknis dan tidak dapat diakses saat ini.\n\nKemungkinan penyebab:\n• Server sedang maintenance\n• Server overload atau down\n• Koneksi ke server terputus\n\nTim kami sedang memperbaikinya. Silakan coba lagi nanti.',
            [
              {
                text: 'Kembali',
                onPress: () => navigation.navigate('AIHome'),
                style: 'cancel',
              },
              {
                text: 'Coba lagi',
                onPress: () => {
                  analysisRef.current = false;
                  performAnalysis();
                },
              },
            ]
          );
        }, 500);
      }
    } catch (error) {
      const errorMsg = error?.message || String(error);
      const isServerError = 
        errorMsg.includes('504') || 
        errorMsg.includes('500') ||
        errorMsg.includes('timeout') || 
        errorMsg.includes('ECONNABORTED') ||
        errorMsg.includes('Network Error');
      
      if (isServerError) {
        showToast(
          'Server tidak merespons. Kemungkinan server sedang down.',
          'error'
        );
      }
      
      Alert.alert(
        '⚠️ Server Tidak Dapat Diakses',
        'Server AI diagnosis tidak merespons sama sekali. Server kemungkinan sedang DOWN atau tidak aktif.\n\nSilakan hubungi tim backend/DevOps untuk mengecek status server production di api.dentalization.id',
        [
          {
            text: 'Kembali ke Home',
            onPress: () => navigation.navigate('AIHome'),
            style: 'cancel',
          },
          {
            text: 'Coba lagi',
            onPress: () => {
              analysisRef.current = false;
              performAnalysis();
            },
          },
        ]
      );
    }
  };

  const gradient = theme.gradients?.primary || [theme.colors.primary, '#7F1DFF'];

  return (
    <LinearGradient 
      colors={gradient} 
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]} 
      start={{ x: 0, y: 0 }} 
      end={{ x: 1, y: 1 }}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.content}>
        <MaterialCommunityIcons name="brain" size={normalize(80)} color="#FFFFFF" />
        
        <Text variant="headlineSmall" style={styles.title}>
          Menganalisis...
        </Text>
        
        <Text variant="bodyLarge" style={styles.status}>
          {status}
        </Text>
        
        <ProgressBar
          progress={progress}
          color="#FFFFFF"
          style={styles.progressBar}
        />
        
        <Text variant="bodySmall" style={styles.progressText}>
          {Math.round(progress * 100)}%
        </Text>
      </View>
      
      <ValidationToast
        visible={toast.visible}
        message={toast.message}
        status={toast.status}
        onDismiss={hideToast}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: normalize(32),
    gap: normalize(16),
  },
  title: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: normalize(24),
    marginTop: normalize(8),
  },
  status: {
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    fontSize: normalize(16),
  },
  progressBar: {
    width: '100%',
    height: normalize(8),
    borderRadius: normalize(4),
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginTop: normalize(8),
  },
  progressText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: normalize(12),
  },
});

export default AnalysisScreen;