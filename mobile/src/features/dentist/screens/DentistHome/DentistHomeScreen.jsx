import React from 'react';
import { View, ScrollView } from 'react-native';
import { Text, Card, Button, Chip, useTheme } from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DentistRoleGuard from '../../components/DentistRoleGuard';
import { logout } from '../../../../store/slices/authSlice';
import { logoutPatient } from '../../../../services/authService';

const DentistHomeScreen = ({ navigation }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const user = useSelector((state) => state?.auth?.user);

  const handleStartScan = () => {
    navigation.navigate('DentistScanTab');
  };

  const handleLogout = async () => {
    dispatch(logout());
    await logoutPatient();
  };

  const dentistName = user?.name ? `drg. ${user.name.replace(/^drg\.\s*/i, '')}` : 'drg. Dentist';

  return (
    <DentistRoleGuard navigation={navigation}>
      <View style={{ flex: 1, backgroundColor: '#F8FAFC', paddingTop: insets.top }}>
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Card */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, marginTop: 8 }}>
            <View style={{ flex: 1 }}>
              <Text variant="headlineSmall" style={{ fontWeight: '800', color: '#0F172A', marginBottom: 4 }}>
                Halo, {dentistName}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Chip
                  icon="check-decagram"
                  style={{ backgroundColor: '#DCFCE7', height: 24 }}
                  textStyle={{ color: '#15803D', fontSize: 10, fontWeight: '700' }}
                  compact
                >
                  Akun Dokter Gigi
                </Chip>
                <Text variant="bodySmall" style={{ color: '#64748B' }}>
                  Dentist Mobile Portal
                </Text>
              </View>
            </View>

            <Button
              mode="text"
              textColor="#EF4444"
              icon="logout-variant"
              compact
              onPress={handleLogout}
              style={{ marginTop: -4 }}
            >
              Keluar
            </Button>
          </View>

          {/* Primary CTA: 3D Scan */}
          <Card style={{ borderRadius: 20, marginBottom: 16, backgroundColor: theme.colors.primary || '#0284C7' }} elevation={4}>
            <Card.Content style={{ padding: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="cube-scan" size={32} color="#FFFFFF" />
                </View>
                <Chip style={{ backgroundColor: 'rgba(255, 255, 255, 0.25)' }} textStyle={{ color: '#FFFFFF', fontWeight: '700', fontSize: 11 }} compact>
                  Workflow 3D
                </Chip>
              </View>

              <Text variant="titleLarge" style={{ color: '#FFFFFF', fontWeight: '800', marginBottom: 8 }}>
                Smartphone Dental 3D Scan
              </Text>
              <Text variant="bodyMedium" style={{ color: 'rgba(255, 255, 255, 0.9)', lineHeight: 20, marginBottom: 20 }}>
                Perekaman video RGB untuk rekonstruksi 3D eksperimental. Hasil belum tervalidasi untuk pengukuran atau keputusan klinis.
              </Text>

              <Button
                mode="contained"
                onPress={handleStartScan}
                style={{ borderRadius: 14, elevation: 2 }}
                buttonColor="#FFFFFF"
                textColor={theme.colors.primary || '#0284C7'}
                icon="camera-wireless-outline"
                contentStyle={{ paddingVertical: 6 }}
              >
                Mulai Pemindaian 3D
              </Button>
            </Card.Content>
          </Card>

          {/* Workflow Steps Card */}
          <Card style={{ backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 16 }} elevation={1}>
            <Card.Content>
              <Text variant="titleMedium" style={{ fontWeight: '700', color: '#0F172A', marginBottom: 2 }}>
                Alur Rekonstruksi 3D
              </Text>
              <Text variant="bodySmall" style={{ color: '#64748B', marginBottom: 16 }}>
                Berdasarkan rujukan riset: Neuralangelo & multi-view SfM (In Vitro Precedent)
              </Text>

              <View style={{ gap: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 2, backgroundColor: '#E0F2FE' }}>
                    <MaterialCommunityIcons name="account-outline" size={18} color="#0284C7" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', fontSize: 13, color: '#1E293B' }}>1. Pilih Pasien</Text>
                    <Text style={{ fontSize: 12, color: '#64748B', lineHeight: 16, marginTop: 2 }}>Tautkan rekam medis & data pasien sebelum memindai.</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 2, backgroundColor: '#F0FDF4' }}>
                    <MaterialCommunityIcons name="video-outline" size={18} color="#16A34A" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', fontSize: 13, color: '#1E293B' }}>2. Perekaman Kontinu RGB</Text>
                    <Text style={{ fontSize: 12, color: '#64748B', lineHeight: 16, marginTop: 2 }}>Gerakan steady mengitari dental arch pasien.</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 2, backgroundColor: '#FEF3C7' }}>
                    <MaterialCommunityIcons name="cloud-upload-outline" size={18} color="#D97706" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', fontSize: 13, color: '#1E293B' }}>3. Unggah ke Async Pipeline</Text>
                    <Text style={{ fontSize: 12, color: '#64748B', lineHeight: 16, marginTop: 2 }}>Sampling frame cerdas & ekstraksi surface mesh di background.</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 2, backgroundColor: '#F3E8FF' }}>
                    <MaterialCommunityIcons name="monitor-dashboard" size={18} color="#9333EA" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', fontSize: 13, color: '#1E293B' }}>4. Visualisasi di X-Core Web</Text>
                    <Text style={{ fontSize: 12, color: '#64748B', lineHeight: 16, marginTop: 2 }}>Inspeksi 3D mesh, anotasi, dan pengukuran klinis.</Text>
                  </View>
                </View>
              </View>
            </Card.Content>
          </Card>

          {/* Research Precedent Card */}
          <Card style={{ backgroundColor: '#F1F5F9', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' }} elevation={0}>
            <Card.Content style={{ flexDirection: 'row', alignItems: 'flex-start', padding: 12, gap: 8 }}>
              <MaterialCommunityIcons name="information-outline" size={20} color="#64748B" style={{ marginTop: 2 }} />
              <Text variant="bodySmall" style={{ flex: 1, color: '#475569', lineHeight: 18 }}>
                <Text style={{ fontWeight: '700' }}>Catatan Riset:</Text> Metodologi rekonstruksi video smartphone mengacu pada studi in vitro implant scan. Sistem ini dirancang modular dan saat ini beroperasi dalam lingkungan validasi teknis.
              </Text>
            </Card.Content>
          </Card>
        </ScrollView>
      </View>
    </DentistRoleGuard>
  );
};

export default DentistHomeScreen;
