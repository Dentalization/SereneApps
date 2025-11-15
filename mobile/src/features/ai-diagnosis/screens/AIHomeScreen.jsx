import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Button, Card, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const AIHomeScreen = ({ navigation }) => {
  const theme = useTheme();

  const features = [
    {
      icon: 'tooth',
      title: 'Deteksi Gigi Berlubang',
      description: 'AI dapat mendeteksi karies dan kerusakan gigi',
    },
    {
      icon: 'tooth-outline',
      title: 'Analisis Plak',
      description: 'Identifikasi penumpukan plak dan karang gigi',
    },
    {
      icon: 'alert-circle',
      title: 'Risiko Penyakit Gusi',
      description: 'Evaluasi kesehatan gusi dan radang',
    },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Hero */}
      <LinearGradient
        colors={theme.gradients.primary}
        style={styles.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <MaterialCommunityIcons name="tooth" size={64} color="#FFFFFF" />
        <Text variant="headlineSmall" style={styles.heroTitle}>
          First Diagnosis AI
        </Text>
        <Text variant="bodyMedium" style={styles.heroSubtitle}>
          Cek kesehatan gigi Anda dengan teknologi AI
        </Text>
      </LinearGradient>

      {/* CTA */}
      <View style={styles.section}>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('Camera')}
          icon="camera"
          style={styles.ctaButton}
          contentStyle={styles.ctaButtonContent}
        >
          Mulai Scan Gigi
        </Button>
        <Button
          mode="outlined"
          onPress={() => navigation.navigate('History')}
          icon="history"
          style={styles.secondaryButton}
        >
          Lihat Riwayat
        </Button>
      </View>

      {/* Features */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          Apa yang Bisa Dideteksi?
        </Text>
        {features.map((feature, index) => (
          <Card key={index} style={[styles.featureCard, theme.shadows.sm]}>
            <Card.Content style={styles.featureContent}>
              <View style={[styles.featureIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                <MaterialCommunityIcons
                  name={feature.icon}
                  size={28}
                  color={theme.colors.primary}
                />
              </View>
              <View style={styles.featureText}>
                <Text variant="titleSmall">{feature.title}</Text>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
                >
                  {feature.description}
                </Text>
              </View>
            </Card.Content>
          </Card>
        ))}
      </View>

      {/* Disclaimer */}
      <View style={[styles.disclaimer, { backgroundColor: theme.colors.warningContainer }]}>
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={20}
          color={theme.colors.warning}
        />
        <Text variant="bodySmall" style={[styles.disclaimerText, { color: theme.colors.warning }]}>
          Hasil diagnosis AI bukan pengganti konsultasi profesional. Silakan berkonsultasi dengan
          dokter gigi untuk diagnosis dan perawatan yang akurat.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  hero: {
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: '600',
  },
  ctaButton: {
    marginBottom: 12,
  },
  ctaButtonContent: {
    paddingVertical: 8,
  },
  secondaryButton: {
    marginBottom: 8,
  },
  featureCard: {
    marginBottom: 12,
    borderRadius: 12,
  },
  featureContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    flex: 1,
  },
  disclaimer: {
    margin: 16,
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
  },
  disclaimerText: {
    flex: 1,
    lineHeight: 18,
  },
});

export default AIHomeScreen;
