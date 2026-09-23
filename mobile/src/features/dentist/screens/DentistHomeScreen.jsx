import React from 'react';
import { View, ScrollView, StyleSheet, Platform } from 'react-native';
import { Text, Card, Button, Avatar, Chip, useTheme } from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DentistRoleGuard from '../components/DentistRoleGuard';
import { logout } from '../../../store/slices/authSlice';

const DentistHomeScreen = ({ navigation }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const user = useSelector((state) => state?.auth?.user);

  const handleStartScan = () => {
    navigation.navigate('DentistScanTab');
  };

  const handleLogout = () => {
    dispatch(logout());
  };

  const dentistName = user?.name ? `drg. ${user.name.replace(/^drg\.\s*/i, '')}` : 'drg. Dentist';

  return (
    <DentistRoleGuard navigation={navigation}>
      <View style={[styles.root, { backgroundColor: '#F8FAFC', paddingTop: insets.top }]}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Card */}
          <View style={styles.header}>
            <View style={styles.headerTextGroup}>
              <Text variant="headlineSmall" style={styles.greetingTitle}>
                Halo, {dentistName}
              </Text>
              <View style={styles.badgeRow}>
                <Chip
                  icon="check-decagram"
                  style={styles.verifiedBadge}
                  textStyle={styles.verifiedBadgeText}
                  compact
                >
                  Verified Dentist
                </Chip>
                <Text variant="bodySmall" style={styles.subGreeting}>
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
              style={styles.logoutBtn}
            >
              Keluar
            </Button>
          </View>

          {/* Primary CTA: 3D Scan */}
          <Card style={[styles.heroCard, { backgroundColor: theme.colors.primary || '#0284C7' }]} elevation={4}>
            <Card.Content style={styles.heroContent}>
              <View style={styles.heroHeader}>
                <View style={styles.heroIconCircle}>
                  <MaterialCommunityIcons name="cube-scan" size={32} color="#FFFFFF" />
                </View>
                <Chip style={styles.protocolChip} textStyle={styles.protocolChipText} compact>
                  Workflow 3D
                </Chip>
              </View>

              <Text variant="titleLarge" style={styles.heroTitle}>
                Smartphone Dental 3D Scan
              </Text>
              <Text variant="bodyMedium" style={styles.heroDescription}>
                Perekaman continuous RGB video gigi pasien untuk rekonstruksi 3D mesh asinkron berbasis deep learning & fotogrametri.
              </Text>

              <Button
                mode="contained"
                onPress={handleStartScan}
                style={styles.startScanButton}
                buttonColor="#FFFFFF"
                textColor={theme.colors.primary || '#0284C7'}
                icon="camera-wireless-outline"
                contentStyle={styles.startScanButtonContent}
              >
                Mulai Pemindaian 3D
              </Button>
            </Card.Content>
          </Card>

          {/* Workflow Steps Card */}
          <Card style={styles.infoCard} elevation={1}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Alur Rekonstruksi 3D
              </Text>
              <Text variant="bodySmall" style={styles.sectionSubtitle}>
                Berdasarkan rujukan riset: Neuralangelo & multi-view SfM (In Vitro Precedent)
              </Text>

              <View style={styles.timeline}>
                <View style={styles.timelineItem}>
                  <View style={[styles.stepIcon, { backgroundColor: '#E0F2FE' }]}>
                    <MaterialCommunityIcons name="account-outline" size={18} color="#0284C7" />
                  </View>
                  <View style={styles.stepTextWrapper}>
                    <Text style={styles.stepTitle}>1. Pilih Pasien</Text>
                    <Text style={styles.stepDesc}>Tautkan rekam medis & data pasien sebelum memindai.</Text>
                  </View>
                </View>

                <View style={styles.timelineItem}>
                  <View style={[styles.stepIcon, { backgroundColor: '#F0FDF4' }]}>
                    <MaterialCommunityIcons name="video-outline" size={18} color="#16A34A" />
                  </View>
                  <View style={styles.stepTextWrapper}>
                    <Text style={styles.stepTitle}>2. Perekaman Kontinu RGB</Text>
                    <Text style={styles.stepDesc}>Gerakan steady mengitari dental arch pasien.</Text>
                  </View>
                </View>

                <View style={styles.timelineItem}>
                  <View style={[styles.stepIcon, { backgroundColor: '#FEF3C7' }]}>
                    <MaterialCommunityIcons name="cloud-upload-outline" size={18} color="#D97706" />
                  </View>
                  <View style={styles.stepTextWrapper}>
                    <Text style={styles.stepTitle}>3. Unggah ke Async Pipeline</Text>
                    <Text style={styles.stepDesc}>Sampling frame cerdas & ekstraksi surface mesh di background.</Text>
                  </View>
                </View>

                <View style={styles.timelineItem}>
                  <View style={[styles.stepIcon, { backgroundColor: '#F3E8FF' }]}>
                    <MaterialCommunityIcons name="monitor-dashboard" size={18} color="#9333EA" />
                  </View>
                  <View style={styles.stepTextWrapper}>
                    <Text style={styles.stepTitle}>4. Visualisasi di X-Core Web</Text>
                    <Text style={styles.stepDesc}>Inspeksi 3D mesh, anotasi, dan pengukuran klinis.</Text>
                  </View>
                </View>
              </View>
            </Card.Content>
          </Card>

          {/* Research Precedent Card */}
          <Card style={styles.disclaimerCard} elevation={0}>
            <Card.Content style={styles.disclaimerContent}>
              <MaterialCommunityIcons name="information-outline" size={20} color="#64748B" style={styles.disclaimerIcon} />
              <Text variant="bodySmall" style={styles.disclaimerText}>
                <Text style={{ fontWeight: '700' }}>Catatan Riset:</Text> Metodologi rekonstruksi video smartphone mengacu pada studi in vitro implant scan. Sistem ini dirancang modular dan saat ini beroperasi dalam lingkungan validasi teknis.
              </Text>
            </Card.Content>
          </Card>
        </ScrollView>
      </View>
    </DentistRoleGuard>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    marginTop: 8,
  },
  headerTextGroup: {
    flex: 1,
  },
  greetingTitle: {
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verifiedBadge: {
    backgroundColor: '#DCFCE7',
    height: 24,
  },
  verifiedBadgeText: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '700',
  },
  subGreeting: {
    color: '#64748B',
  },
  logoutBtn: {
    marginTop: -4,
  },
  heroCard: {
    borderRadius: 20,
    marginBottom: 16,
  },
  heroContent: {
    padding: 20,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  protocolChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  protocolChipText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    marginBottom: 8,
  },
  heroDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
    marginBottom: 20,
  },
  startScanButton: {
    borderRadius: 14,
    elevation: 2,
  },
  startScanButtonContent: {
    paddingVertical: 6,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  sectionSubtitle: {
    color: '#64748B',
    marginBottom: 16,
  },
  timeline: {
    gap: 14,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  stepTextWrapper: {
    flex: 1,
  },
  stepTitle: {
    fontWeight: '700',
    fontSize: 13,
    color: '#1E293B',
  },
  stepDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginTop: 2,
  },
  disclaimerCard: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  disclaimerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    gap: 8,
  },
  disclaimerIcon: {
    marginTop: 2,
  },
  disclaimerText: {
    flex: 1,
    color: '#475569',
    lineHeight: 18,
  },
});

export default DentistHomeScreen;
