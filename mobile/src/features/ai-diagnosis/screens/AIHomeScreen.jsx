import React from 'react';
import { View, ScrollView, StatusBar } from 'react-native';
import { Text, Button, Chip, useTheme, Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import useAnchoredHeaderHeight from '../../../hooks/useAnchoredHeaderHeight';

const FEATURES = [
  {
    icon: 'tooth',
    title: 'Deteksi karies',
    description: 'Model AI membaca perubahan warna dan pola enamel untuk mendeteksi gigi berlubang lebih dini.',
  },
  {
    icon: 'shield-alert',
    title: 'Risiko radang gusi',
    description: 'Segmentasi jaringan lunak membantu menilai inflamasi dan potensi periodontitis.',
  },
  {
    icon: 'brain',
    title: 'Insight cepat',
    description: 'Ringkasan kondisi, rekomendasi tindakan, serta confidence score dalam hitungan detik.',
  },
];

const SCAN_STEPS = [
  'Ambil 3-5 foto dengan pencahayaan terang',
  'Pastikan bibir terbuka lebar agar gigi depan dan samping terlihat',
  'Unggah foto atau gunakan kamera langsung untuk mulai analisis',
];

const TRUST_POINTS = [
  {
    icon: 'shield-check',
    title: 'Keamanan data',
    caption: 'Foto terenkripsi saat pengunggahan dan otomatis terhapus setelah analisis',
  },
  {
    icon: 'cloud-sync',
    title: 'Model terkini',
    caption: 'Model diagnosa diperbarui secara berkala dari dataset klinik mitra',
  },
];

const AIHomeScreen = ({ navigation }) => {
  const theme = useTheme();
  const gradient = theme.gradients?.primary || [theme.colors.primary, '#7F1DFF'];
  const { headerHeight, handleHeaderLayout } = useAnchoredHeaderHeight(260);

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle="light-content" backgroundColor={gradient[0]} />

      {/* Header anchored */}
      <View onLayout={handleHeaderLayout} style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingTop: 64, paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}
        >
          {/* Top row: title + history icon */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 4 }}>First Diagnosis AI</Text>
              <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '700' }}>Analisis gigi modern</Text>
            </View>
            <Button
              mode="text"
              onPress={() => navigation.navigate('History')}
              compact
              style={{ minWidth: 40, paddingHorizontal: 0 }}
              contentStyle={{ margin: 0 }}
            >
              <MaterialCommunityIcons name="history" size={24} color="#FFFFFF" />
            </Button>
          </View>

          {/* Subtitle */}
          <Text style={{ color: 'rgba(255,255,255,0.85)', marginTop: 8 }}>
            Scan kondisi gigi Anda kapan saja dengan dukungan AI Serene.
          </Text>

          {/* Primary action */}
          <Button
            mode="contained"
            icon="camera"
            onPress={() => navigation.navigate('Camera')}
            style={{ marginTop: 20, borderRadius: 18 }}
            contentStyle={{ paddingVertical: 6 }}
            labelStyle={{ fontWeight: '700' }}
          >
            Mulai Scan
          </Button>

          {/* Compact stats */}
          <View style={{ flexDirection: 'row', marginTop: 16, backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12, justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>Scan bulan ini</Text>
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginTop: 4 }}>12</Text>
            </View>
            <View style={{ width: 1, height: '100%', backgroundColor: 'rgba(255,255,255,0.12)', marginHorizontal: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>Akurasi rata-rata</Text>
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginTop: 4 }}>92%</Text>
            </View>
            <View style={{ width: 1, height: '100%', backgroundColor: 'rgba(255,255,255,0.12)', marginHorizontal: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>Terhubung ke dokter</Text>
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginTop: 4 }}>18+</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Scroll content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: headerHeight + 12, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Features */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 14 }}>Apa saja yang bisa dianalisis?</Text>
          {FEATURES.map((feature, index) => (
            <Card
              key={feature.title}
              style={{
                marginBottom: 14,
                borderRadius: 18,
                shadowColor: '#0F172A',
                shadowOpacity: 0.05,
                shadowRadius: 10,
                elevation: 3,
                marginTop: index === 0 ? 4 : 0,
              }}
            >
              <Card.Content style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(76,29,149,0.08)', alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialCommunityIcons name={feature.icon} size={28} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="titleSmall" style={{ fontWeight: '700', color: '#0F172A' }}>
                    {feature.title}
                  </Text>
                  <Text variant="bodySmall" style={{ color: '#475569', marginTop: 6 }}>
                    {feature.description}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          ))}
        </View>

        {/* Scan steps */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 14 }}>Cara scan yang ideal</Text>
          {SCAN_STEPS.map((step, index) => (
            <View key={step} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Text style={{ color: '#4C1D95', fontWeight: '700' }}>{index + 1}</Text>
              </View>
              <Text style={{ flex: 1, color: '#475569', lineHeight: 21 }}>{step}</Text>
            </View>
          ))}
        </View>

        {/* Trust points */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 14 }}>Keamanan & akurasi</Text>
          <View style={{ gap: 12 }}>
            {TRUST_POINTS.map((point) => (
              <View
                key={point.title}
                style={{
                  flexDirection: 'row',
                  padding: 14,
                  borderRadius: 18,
                  backgroundColor: '#FFFFFF',
                  shadowColor: '#0F172A',
                  shadowOpacity: 0.04,
                  shadowRadius: 10,
                  elevation: 2,
                }}
              >
                <MaterialCommunityIcons name={point.icon} size={24} color={theme.colors.primary} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontWeight: '700', color: '#0F172A' }}>{point.title}</Text>
                  <Text style={{ color: '#475569', marginTop: 4 }}>{point.caption}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Tips chips */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 14 }}>Tips sebelum scan</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <Chip icon="white-balance-sunny" style={{ backgroundColor: '#EEF2FF' }}>
              Gunakan cahaya alami
            </Chip>
            <Chip icon="gesture-tap" style={{ backgroundColor: '#EEF2FF' }}>
              Pegang ponsel stabil
            </Chip>
            <Chip icon="account" style={{ backgroundColor: '#EEF2FF' }}>
              Buka mulut selebar mungkin
            </Chip>
          </View>
        </View>

        {/* Disclaimer */}
        <View style={{ paddingHorizontal: 20, marginBottom: 0 }}>
          <View style={{ borderRadius: 18, padding: 16, backgroundColor: '#FEF3C7', flexDirection: 'row', alignItems: 'flex-start' }}>
            <MaterialCommunityIcons name="alert-circle-outline" size={22} color="#F97316" />
            <Text style={{ flex: 1, marginLeft: 10, color: '#78350F' }}>
              Hasil AI bukan pengganti diagnosis dokter. Bagikan hasil kepada dokter gigi untuk rencana perawatan yang tepat.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default AIHomeScreen;
