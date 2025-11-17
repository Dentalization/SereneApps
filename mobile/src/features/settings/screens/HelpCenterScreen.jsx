import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, List, Text, useTheme } from 'react-native-paper';
import InfoScreenLayout from '../components/InfoScreenLayout';
import SettingsSection from '../components/SettingsSection';

const faqItems = [
  {
    question: 'Bagaimana cara menjadwalkan ulang janji?',
    answer: 'Buka tab Appointment > pilih jadwal > tekan "Reschedule" minimal 6 jam sebelum waktu janji.',
  },
  {
    question: 'Apakah AI diagnosis menyimpan foto saya?',
    answer: 'Tidak, kami hanya menyimpan metadata hasil analisis dan menghapus foto dalam 30 detik. Anda dapat menyimpan foto lokal sendiri.',
  },
  {
    question: 'Bagaimana menghubungkan akun keluarga?',
    answer: 'Hubungi care@serene.id untuk aktivasi Family Link agar Anda bisa memantau 3 anggota keluarga sekaligus.',
  },
];

const categories = [
  { label: 'Janji Temu', icon: 'calendar' },
  { label: 'Pembayaran', icon: 'credit-card' },
  { label: 'AI Diagnosis', icon: 'robot' },
  { label: 'Rekam Medis', icon: 'clipboard-text' },
];

const HelpCenterScreen = () => {
  const theme = useTheme();

  return (
    <InfoScreenLayout
      heroProps={{
        title: 'Pusat Bantuan Serene',
        subtitle: 'Panduan self-service untuk menyelesaikan kebutuhan pasien dalam hitungan menit.',
        badgeLabel: 'Siaran langsung 24/7',
        badgeIcon: 'headset',
        highlights: [
          { icon: 'clock-fast', label: 'Respons', value: '< 5 menit' },
          { icon: 'account-group', label: 'Agent', value: '50+ Care' },
        ],
      }}
      footerText="Masih butuh bantuan? Pilih Hubungi Care untuk berbicara dengan agen."
    >
      <SettingsSection title="KATEGORI POPULER" description="Akses cepat ke topik yang sering dicari.">
        <View style={styles.chipRow}>
          {categories.map((item) => (
            <Chip key={item.label} icon={item.icon} style={styles.chip}>
              {item.label}
            </Chip>
          ))}
        </View>
      </SettingsSection>

      <SettingsSection title="PERTANYAAN UMUM">
        {faqItems.map((item) => (
          <List.Accordion
            key={item.question}
            title={item.question}
            titleStyle={styles.accordionTitle}
            right={(props) => <List.Icon {...props} icon="chevron-down" />}
          >
            <Text style={[styles.answer, { color: theme.colors.onSurfaceVariant }]}>{item.answer}</Text>
          </List.Accordion>
        ))}
      </SettingsSection>
    </InfoScreenLayout>
  );
};

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  chip: {
    marginHorizontal: 4,
    marginBottom: 8,
  },
  accordionTitle: {
    fontWeight: '600',
  },
  answer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    fontSize: 14,
    lineHeight: 20,
  },
});

export default HelpCenterScreen;
