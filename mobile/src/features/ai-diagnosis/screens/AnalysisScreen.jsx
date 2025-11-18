import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { Text, ProgressBar, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const AnalysisScreen = ({ route, navigation }) => {
  const theme = useTheme();
  const { images } = route.params;
  const [progress, setProgress] = React.useState(0);
  const [status, setStatus] = React.useState('Memproses gambar...');

  React.useEffect(() => {
    const steps = [
      { progress: 0.2, status: 'Memproses gambar...' },
      { progress: 0.4, status: 'Mendeteksi area gigi...' },
      { progress: 0.6, status: 'Menganalisis kondisi...' },
      { progress: 0.8, status: 'Menghitung tingkat risiko...' },
      { progress: 1.0, status: 'Selesai!' },
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setProgress(steps[currentStep].progress);
        setStatus(steps[currentStep].status);
        currentStep++;
      } else {
        clearInterval(interval);
        // Navigate to result after a short delay
        setTimeout(() => {
          navigation.replace('Result', {
            result: {
              riskLevel: 'medium',
              confidence: 0.85,
              affectedTeeth: [14, 15],
              conditions: [
                { name: 'Plak', severity: 'medium', confidence: 0.88 },
                { name: 'Karies Awal', severity: 'low', confidence: 0.72 },
              ],
            },
          });
        }, 500);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [navigation]);

  const gradient = theme.gradients?.primary || [theme.colors.primary, '#7F1DFF'];

  return (
    <LinearGradient colors={gradient} style={styles.container} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor={gradient[0]} />
      <View style={styles.content}>
        <MaterialCommunityIcons name="brain" size={80} color="#FFFFFF" />
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
    paddingHorizontal: 32,
    gap: 16,
  },
  title: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  status: {
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progressText: {
    color: 'rgba(255,255,255,0.8)',
  },
});

export default AnalysisScreen;
