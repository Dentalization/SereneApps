import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Text, Card, Button, Avatar, useTheme } from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DentistRoleGuard from '../../components/DentistRoleGuard';
import { logout } from '../../../../store/slices/authSlice';
import { logoutPatient } from '../../../../services/authService';
import { getInitials } from '../../../../utils/formatters';
import { resolveMediaUrl } from '../../../../utils/media';

const { width } = Dimensions.get('window');

const DentistHomeScreen = ({ navigation }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const user = useSelector((state) => state?.auth?.user);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  const handleStartScan = () => {
    navigation.navigate('DentistScanTab');
  };

  const handleLogout = async () => {
    dispatch(logout());
    await logoutPatient();
  };

  const rawName = user?.name || 'Dentist';
  const dentistName = rawName.startsWith('drg.') ? rawName : `drg. ${rawName}`;
  const initials = getInitials(rawName.replace(/^drg\.\s*/i, '')) || 'DR';

  const rawAvatar =
    user?.avatar_url ||
    user?.avatarUrl ||
    user?.avatar ||
    user?.profile_picture ||
    user?.profilePicture ||
    user?.dentistProfile?.avatar_url ||
    user?.dentistProfile?.photo ||
    null;
  const resolvedAvatar = resolveMediaUrl(rawAvatar);

  return (
    <DentistRoleGuard navigation={navigation}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 130 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* TOP HEADER */}
          <View style={styles.headerRow}>
            <View style={styles.doctorInfoRow}>
              <View style={styles.avatarWrapper}>
                {resolvedAvatar && !avatarLoadFailed ? (
                  <Avatar.Image
                    size={50}
                    source={{ uri: resolvedAvatar }}
                    style={styles.avatar}
                    onError={() => setAvatarLoadFailed(true)}
                  />
                ) : (
                  <Avatar.Text
                    size={50}
                    label={initials}
                    style={styles.avatar}
                    labelStyle={styles.avatarLabel}
                  />
                )}
                <View style={styles.doctorOnlineBadge} />
              </View>

              <View style={styles.doctorTitleCol}>
                <Text variant="titleMedium" style={styles.doctorNameText} numberOfLines={2}>
                  {dentistName}
                </Text>
                <View style={styles.badgeRow}>
                  <View style={styles.verifiedBadge}>
                    <MaterialCommunityIcons name="check-decagram" size={13} color="#15803D" />
                    <Text style={styles.verifiedBadgeText}>Akun Dokter Gigi</Text>
                  </View>
                </View>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleLogout}
              style={styles.logoutButton}
            >
              <MaterialCommunityIcons name="logout-variant" size={16} color="#EF4444" />
              <Text style={styles.logoutText}>Keluar</Text>
            </TouchableOpacity>
          </View>

          {/* HERO CARD: 3D SCANNER */}
          <View style={styles.heroCardShadow}>
            <LinearGradient
              colors={['#4A0E78', '#62109F', '#7E22CE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              {/* Decorative background glow circles */}
              <View style={[styles.glowCircle, { width: 140, height: 140, top: -40, right: -30 }]} />
              <View style={[styles.glowCircle, { width: 90, height: 90, bottom: -20, left: -20 }]} />

              <View style={styles.heroTopRow}>
                <View style={styles.heroIconBox}>
                  <MaterialCommunityIcons name="tooth" size={28} color="#FFFFFF" />
                </View>
                <View style={styles.heroWorkflowPill}>
                  <MaterialCommunityIcons name="star-four-points" size={12} color="#FDE047" style={{ marginRight: 4 }} />
                  <Text style={styles.heroWorkflowText}>AI & SfM Engine</Text>
                </View>
              </View>

              <Text style={styles.heroTitle}>
                Smartphone Dental 3D Scan
              </Text>
              <Text style={styles.heroSubtitle}>
                Perekaman video continuous RGB resolusi tinggi untuk rekonstruksi 3D sparse surface mesh & visualisasi klinis.
              </Text>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleStartScan}
                style={styles.heroCtaButton}
              >
                <MaterialCommunityIcons name="camera-wireless-outline" size={20} color="#62109F" style={{ marginRight: 8 }} />
                <Text style={styles.heroCtaText}>Mulai Pemindaian 3D</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>

          {/* QUICK METRICS BAR */}
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <View style={[styles.metricIconWrap, { backgroundColor: '#F0FDF4' }]}>
                <MaterialCommunityIcons name="check-circle-outline" size={18} color="#16A34A" />
              </View>
              <Text style={styles.metricValue}>Siap</Text>
              <Text style={styles.metricLabel}>Pipeline 3D</Text>
            </View>

            <View style={styles.metricCard}>
              <View style={[styles.metricIconWrap, { backgroundColor: '#EDE9FE' }]}>
                <MaterialCommunityIcons name="archive-sync-outline" size={18} color="#62109F" />
              </View>
              <Text style={styles.metricValue}>LIDRA</Text>
              <Text style={styles.metricLabel}>Vision Engine</Text>
            </View>

            <View style={styles.metricCard}>
              <View style={[styles.metricIconWrap, { backgroundColor: '#E0F2FE' }]}>
                <MaterialCommunityIcons name="shield-check-outline" size={18} color="#0284C7" />
              </View>
              <Text style={styles.metricValue}>STR Valid</Text>
              <Text style={styles.metricLabel}>Akun Dokter</Text>
            </View>
          </View>

          {/* STEP BY STEP WORKFLOW CARD */}
          <View style={styles.workflowCard}>
            <View style={styles.workflowHeader}>
              <View style={styles.workflowTitleRow}>
                <MaterialCommunityIcons name="timeline-text-outline" size={20} color="#62109F" />
                <Text style={styles.workflowTitle}>Alur Kerja Pemindaian 3D</Text>
              </View>
              <Text style={styles.workflowSubtitle}>
                Panduan 4 langkah dari perekaman hingga inspeksi di portal web
              </Text>
            </View>

            <View style={styles.stepsContainer}>
              {/* Step 1 */}
              <View style={styles.stepRow}>
                <View style={[styles.stepNumberBadge, { backgroundColor: '#EDE9FE' }]}>
                  <Text style={[styles.stepNumberText, { color: '#62109F' }]}>1</Text>
                </View>
                <View style={styles.stepContentCol}>
                  <Text style={styles.stepTitle}>Pilih Pasien Terdaftar</Text>
                  <Text style={styles.stepDesc}>Tautkan rekam medis & data pasien sebelum memulai pemindaian.</Text>
                </View>
              </View>

              <View style={styles.stepConnectorLine} />

              {/* Step 2 */}
              <View style={styles.stepRow}>
                <View style={[styles.stepNumberBadge, { backgroundColor: '#E0F2FE' }]}>
                  <Text style={[styles.stepNumberText, { color: '#0284C7' }]}>2</Text>
                </View>
                <View style={styles.stepContentCol}>
                  <Text style={styles.stepTitle}>Perekaman Kontinu RGB</Text>
                  <Text style={styles.stepDesc}>Gerakan kamera melengkung steady mengitari dental arch pasien.</Text>
                </View>
              </View>

              <View style={styles.stepConnectorLine} />

              {/* Step 3 */}
              <View style={styles.stepRow}>
                <View style={[styles.stepNumberBadge, { backgroundColor: '#FEF3C7' }]}>
                  <Text style={[styles.stepNumberText, { color: '#D97706' }]}>3</Text>
                </View>
                <View style={styles.stepContentCol}>
                  <Text style={styles.stepTitle}>Ekstraksi Otomatis</Text>
                  <Text style={styles.stepDesc}>LIDRA frame-selection & triangulasi titik 3D mesh di background.</Text>
                </View>
              </View>

              <View style={styles.stepConnectorLine} />

              {/* Step 4 */}
              <View style={styles.stepRow}>
                <View style={[styles.stepNumberBadge, { backgroundColor: '#F0FDF4' }]}>
                  <Text style={[styles.stepNumberText, { color: '#16A34A' }]}>4</Text>
                </View>
                <View style={styles.stepContentCol}>
                  <Text style={styles.stepTitle}>Inspeksi di X-Core Web</Text>
                  <Text style={styles.stepDesc}>Inspeksi 3D surface mesh STL/OBJ, anotasi, dan pengukuran klinis.</Text>
                </View>
              </View>
            </View>
          </View>

          {/* RESEARCH DISCLAIMER BANNER */}
          <View style={styles.researchCard}>
            <MaterialCommunityIcons name="information-outline" size={20} color="#64748B" style={{ marginTop: 2 }} />
            <Text style={styles.researchText}>
              <Text style={{ fontWeight: '700', color: '#334155' }}>Catatan Riset: </Text>
              Metodologi rekonstruksi video smartphone mengacu pada studi in vitro implant scan. Sistem ini dirancang untuk visualisasi pendukung dan beroperasi dalam lingkungan validasi teknis.
            </Text>
          </View>
        </ScrollView>
      </View>
    </DentistRoleGuard>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    marginTop: 4,
  },
  doctorInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    backgroundColor: '#62109F',
  },
  avatarLabel: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 18,
  },
  doctorOnlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  doctorTitleCol: {
    flex: 1,
  },
  doctorNameText: {
    fontWeight: '800',
    color: '#0F172A',
    fontSize: 18,
    letterSpacing: 0.2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  verifiedBadgeText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
  heroCardShadow: {
    borderRadius: 22,
    marginBottom: 16,
    shadowColor: '#62109F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 8,
  },
  heroCard: {
    borderRadius: 22,
    padding: 22,
    overflow: 'hidden',
    position: 'relative',
  },
  glowCircle: {
    position: 'absolute',
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  heroWorkflowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  heroWorkflowText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 22,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  heroSubtitle: {
    color: 'rgba(255, 255, 255, 0.88)',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 20,
    fontWeight: '400',
  },
  heroCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  heroCtaText: {
    color: '#62109F',
    fontWeight: '800',
    fontSize: 15,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  metricIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  workflowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  workflowHeader: {
    marginBottom: 16,
  },
  workflowTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  workflowTitle: {
    fontWeight: '800',
    fontSize: 16,
    color: '#0F172A',
  },
  workflowSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  stepsContainer: {
    paddingLeft: 4,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  stepNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  stepNumberText: {
    fontWeight: '800',
    fontSize: 12,
  },
  stepContentCol: {
    flex: 1,
  },
  stepTitle: {
    fontWeight: '700',
    fontSize: 14,
    color: '#1E293B',
  },
  stepDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    marginTop: 2,
  },
  stepConnectorLine: {
    width: 2,
    height: 18,
    backgroundColor: '#E2E8F0',
    marginLeft: 12,
    marginVertical: 4,
  },
  researchCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 10,
  },
  researchText: {
    flex: 1,
    color: '#475569',
    fontSize: 11,
    lineHeight: 17,
  },
});

export default DentistHomeScreen;
