import React from 'react';
import { StyleSheet, View } from 'react-native';
import { List, Text, useTheme } from 'react-native-paper';
import InfoScreenLayout from '../components/InfoScreenLayout';
import SettingsSection from '../components/SettingsSection';

const TermsScreen = () => {
  const theme = useTheme();

  const obligations = [
    {
      title: 'Penggunaan layanan',
      description: 'Anda wajib memberikan data yang akurat untuk diagnosa dan janji temu.',
      icon: 'check-decagram',
    },
    {
      title: 'Kerahasiaan akun',
      description: 'Jaga OTP, PIN, dan perangkat Anda agar akses tidak disalahgunakan.',
      icon: 'shield-lock',
    },
    {
      title: 'Pembatalan janji',
      description: 'Batal minimal 24 jam sebelumnya untuk menghindari biaya no-show.',
      icon: 'calendar-remove',
    },
  ];

  const disclaimers = [
    'Serene tidak menggantikan konsultasi langsung dengan dokter gigi.',
    'Hasil AI diagnosis bersifat saran awal, bukan keputusan final.',
    'Pelayanan darurat harus menghubungi fasilitas kesehatan terdekat.',
  ];

  return (
    <InfoScreenLayout
      heroProps={{
        title: 'Syarat & Ketentuan',
        subtitle: 'Ketentuan ini mengatur penggunaan SereneApps dan layanan klinik mitra.',
        badgeLabel: 'Efektif 1 Juli 2024',
        badgeIcon: 'scale-balance',
        highlights: [
          { icon: 'account-check', label: 'Persetujuan', value: 'Digital' },
          { icon: 'book-account', label: 'Pasal', value: '12 Bab' },
        ],
      }}
      footerText="Dengan melanjutkan, Anda menyetujui seluruh ketentuan ini."
    >
      <SettingsSection title="KEWAJIBAN PENGGUNA" description="Pastikan aplikasi digunakan secara bertanggung jawab.">
        {obligations.map((item) => (
          <List.Item
            key={item.title}
            title={item.title}
            description={item.description}
            left={(props) => <List.Icon {...props} icon={item.icon} />}
          />
        ))}
      </SettingsSection>

      <SettingsSection title="BATASAN LAYANAN" description="Kapan Anda harus menghubungi klinik secara langsung.">
        {disclaimers.map((text) => (
          <View key={text} style={styles.bulletRow}>
            <Text style={[styles.bullet, { color: theme.colors.primary }]}>•</Text>
            <Text style={[styles.bulletText, { color: theme.colors.onSurface }]}>{text}</Text>
          </View>
        ))}
      </SettingsSection>
    </InfoScreenLayout>
  );
};

const styles = StyleSheet.create({
  bulletRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  bullet: {
    fontSize: 20,
    marginRight: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});

export default TermsScreen;
