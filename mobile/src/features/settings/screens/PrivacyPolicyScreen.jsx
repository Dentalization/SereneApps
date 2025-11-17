import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, List, Text, useTheme } from 'react-native-paper';
import InfoScreenLayout from '../components/InfoScreenLayout';
import SettingsSection from '../components/SettingsSection';

const PrivacyPolicyScreen = () => {
  const theme = useTheme();

  const dataCategories = [
    'Profil pasien & rekam medis',
    'Riwayat janji temu & pembayaran',
    'Data sensor kamera AI diagnosis',
    'Preferensi aplikasi & perangkat',
  ];

  const rights = [
    'Mengunduh salinan data kapan saja',
    'Memperbarui atau memperbaiki informasi',
    'Meminta penghapusan permanen',
    'Menarik persetujuan untuk komunikasi marketing',
  ];

  return (
    <InfoScreenLayout
      heroProps={{
        title: 'Kebijakan Privasi',
        subtitle: 'Kami menjaga kerahasiaan rekam medis Anda dengan standar keamanan klinis dan regulasi HIPAA.',
        badgeLabel: 'Diperbarui 1 Juli 2024',
        badgeIcon: 'shield-account',
        highlights: [
          { icon: 'lock-check', label: 'Enkripsi', value: 'AES-256' },
          { icon: 'shield-key', label: 'Audit', value: '24/7' },
        ],
      }}
      footerText="Pertanyaan privasi? Hubungi legal@serene.id kapan saja."
    >
      <SettingsSection title="DATA YANG KAMI KUMPULKAN" description="Hanya data relevan untuk perawatan gigi.">
        <View style={styles.paragraph}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Kami mengumpulkan data personal dan medis untuk menyediakan layanan SereneApps. Data disimpan di
            pusat data berlokasi di Jakarta dan Singapura.
          </Text>
        </View>
        <View style={styles.chipRow}>
          {dataCategories.map((item) => (
            <Chip key={item} icon="check-circle" style={styles.chip}>
              {item}
            </Chip>
          ))}
        </View>
      </SettingsSection>

      <SettingsSection title="PENGGUNAAN & BERBAGI" description="Kami tidak menjual data Anda.">
        <List.Item
          title="Perawatan klinik"
          description="Dokter gigi mitra Serene menggunakan data untuk menyusun rencana tindakan."
          left={(props) => <List.Icon {...props} icon="hospital-box" />}
        />
        <List.Item
          title="AI diagnosis"
          description="Model kami memproses foto secara anonim dan hanya menyimpan insight klinis."
          left={(props) => <List.Icon {...props} icon="robot" />}
        />
        <List.Item
          title="Komunikasi pasien"
          description="Pengingat janji, tagihan digital, dan edukasi kesehatan dikirim sesuai preferensi."
          left={(props) => <List.Icon {...props} icon="email-fast" />}
        />
      </SettingsSection>

      <SettingsSection title="HAK PENGGUNA" description="Anda memegang kendali penuh.">
        {rights.map((item) => (
          <View key={item} style={styles.rightRow}>
            <Text style={[styles.bullet, { color: theme.colors.primary }]}>•</Text>
            <Text style={[styles.rightText, { color: theme.colors.onSurface }]}>{item}</Text>
          </View>
        ))}
      </SettingsSection>
    </InfoScreenLayout>
  );
};

const styles = StyleSheet.create({
  paragraph: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  chip: {
    marginHorizontal: 4,
    marginBottom: 8,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  bullet: {
    fontSize: 18,
    marginRight: 8,
  },
  rightText: {
    flex: 1,
    fontSize: 14,
  },
});

export default PrivacyPolicyScreen;
