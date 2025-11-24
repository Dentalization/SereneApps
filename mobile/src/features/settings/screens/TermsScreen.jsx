import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, List, Text, useTheme, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import InfoScreenLayout from '../components/InfoScreenLayout';
import SettingsSection from '../components/SettingsSection';

const TermsScreen = ({ navigation }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const usageRules = [
    'Dilarang menggunakan akun palsu',
    'Tidak menyalahgunakan fitur konsultasi',
    'Menghargai hak kekayaan intelektual',
    'Mematuhi etika komunikasi medis',
  ];

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      
      {/* PERBAIKAN: Hapus padding top manual. Biarkan layout full screen (immersive). */}
      <View style={{ flex: 1 }}>
        <InfoScreenLayout
          heroProps={{
            title: 'Syarat & Ketentuan',
            subtitle:
              'Perjanjian penggunaan layanan antara Anda (Pasien) dan Serene Dental Care.',
            badgeLabel: 'Efektif 1 Jan 2024',
            badgeIcon: 'file-document-check',
            highlights: [
              { icon: 'scale-balance', label: 'Hukum', value: 'Indonesia' },
              { icon: 'account-check', label: 'Usia', value: '17+' },
            ],
          }}
          footerText="Dengan melanjutkan, Anda menyetujui seluruh poin di atas."
        >
          <SettingsSection
            title="KETENTUAN UMUM"
            description="Prinsip dasar penggunaan aplikasi."
          >
            <View style={styles.paragraph}>
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                Aplikasi SereneApps adalah platform pendukung kesehatan gigi.
                Layanan ini tidak menggantikan penanganan gawat darurat medis.
                Segera ke IGD rumah sakit terdekat untuk kondisi kritis.
              </Text>
            </View>
            <View style={styles.chipRow}>
              {usageRules.map((item) => (
                <Chip key={item} icon="check" style={styles.chip}>
                  {item}
                </Chip>
              ))}
            </View>
          </SettingsSection>

          <SettingsSection
            title="LAYANAN MEDIS"
            description="Batasan tanggung jawab klinis."
          >
            <List.Item
              title="Telekonsultasi"
              description="Diagnosis via chat/video bersifat sementara dan wajib diverifikasi dengan kunjungan fisik."
              left={(props) => <List.Icon {...props} icon="doctor" />}
            />
            <List.Item
              title="Rekam Medis"
              description="Anda memberikan izin kepada kami untuk menyimpan dan mengolah data kesehatan sesuai permenkes."
              left={(props) => <List.Icon {...props} icon="file-medical" />}
            />
            <List.Item
              title="Resep Digital"
              description="Hanya diberikan setelah verifikasi identitas dan kondisi medis yang memadai."
              left={(props) => <List.Icon {...props} icon="pill" />}
            />
          </SettingsSection>

          <SettingsSection
            title="PEMBAYARAN & PEMBATALAN"
            description="Kebijakan transaksi finansial."
          >
            <List.Item
              title="Deposit Janji Temu"
              description="Deposit hangus jika pembatalan dilakukan kurang dari 24 jam sebelum jadwal."
              left={(props) => <List.Icon {...props} icon="cash-remove" />}
            />
            <List.Item
              title="Refund"
              description="Proses pengembalian dana membutuhkan waktu 3-5 hari kerja."
              left={(props) => <List.Icon {...props} icon="refresh-circle" />}
            />
          </SettingsSection>
        </InfoScreenLayout>
      </View>

      {/* Floating Back Button - Posisinya sudah benar */}
      <View
        style={{
          position: 'absolute',
          left: 16,
          top: insets.top + 8,
          zIndex: 999,
          elevation: 999,
        }}
      >
        <IconButton
          icon="arrow-left"
          iconColor="white"
          size={24}
          onPress={() => navigation.goBack()}
          style={{ margin: 0 }}
          containerColor="rgba(0,0,0,0.3)"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
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
});

export default TermsScreen;