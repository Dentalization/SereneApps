import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Button,
  List,
  ProgressBar,
  Text,
  useTheme,
  IconButton,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import InfoScreenLayout from '../components/InfoScreenLayout';
import SettingsSection from '../components/SettingsSection';

const steps = [
  'Ajukan permintaan via aplikasi atau email data@serene.id',
  'Tim compliance memverifikasi identitas Anda (≤ 24 jam)',
  'Data dikompilasi & dienkripsi sebelum dikirim',
  'Anda menerima tautan aman dengan masa berlaku 7 hari',
];

const DataManagementScreen = ({ navigation }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      
      {/* PERBAIKAN: Hapus padding top manual. 
          Biarkan InfoScreenLayout mengisi layar penuh agar Header Gradient menyentuh status bar. 
      */}
      <View style={{ flex: 1 }}>
        <InfoScreenLayout
          heroProps={{
            title: 'Kelola Data Anda',
            subtitle:
              'Unduh, koreksi, atau hapus data medis secara mandiri sesuai regulasi PDP.',
            badgeLabel: 'Kepatuhan PDP & HIPAA',
            badgeIcon: 'shield-lock',
            highlights: [
              { icon: 'clock-outline', label: 'SLA', value: '< 24 jam' },
              { icon: 'file-lock', label: 'Periode simpan', value: '5 tahun' },
            ],
          }}
          footerText="Hubungi data@serene.id untuk permintaan khusus lainnya."
        >
          <SettingsSection
            title="UNDUH DATA"
            description="Terima arsip PDF/CSV terenkripsi."
          >
            <View style={styles.progressCard}>
              <ProgressBar
                progress={0.65}
                color={theme.colors.primary}
                style={styles.progressBar}
              />
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                Rata-rata permintaan selesai dalam 15 jam dari total SLA 24 jam.
              </Text>
            </View>
            {steps.map((text, index) => (
              <View key={text} style={styles.stepRow}>
                <View
                  style={[
                    styles.stepCircle,
                    { backgroundColor: theme.colors.primary },
                  ]}
                >
                  <Text style={styles.stepNumber}>{index + 1}</Text>
                </View>
                <Text
                  style={[styles.stepText, { color: theme.colors.onSurface }]}
                >
                  {text}
                </Text>
              </View>
            ))}
            <Button mode="contained" icon="download" style={styles.ctaButton}>
              Ajukan unduhan data
            </Button>
          </SettingsSection>

          <SettingsSection
            title="PENGHAPUSAN DATA"
            description="Anda bisa menonaktifkan akun kapan saja."
          >
            <List.Item
              title="Hapus rekam medis"
              description="Menghapus catatan aplikasi, menyisakan data klinik sesuai hukum."
              left={(props) => <List.Icon {...props} icon="trash-can" />}
            />
            <List.Item
              title="Nonaktifkan akun"
              description="Akun dibekukan dan riwayat tidak bisa diakses sampai diaktifkan kembali."
              left={(props) => <List.Icon {...props} icon="account-off" />}
            />
            <Button
              mode="outlined"
              icon="shield-alert"
              style={styles.deleteButton}
            >
              Minta penghapusan total
            </Button>
          </SettingsSection>
        </InfoScreenLayout>
      </View>

      {/* Floating Back Button 
          Posisi sudah benar menggunakan absolute + insets.top
      */}
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
  progressCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  progressBar: {
    borderRadius: 999,
    marginBottom: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumber: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
  },
  ctaButton: {
    marginHorizontal: 16,
    marginTop: 8,
  },
  deleteButton: {
    marginHorizontal: 16,
    marginTop: 12,
  },
});

export default DataManagementScreen;