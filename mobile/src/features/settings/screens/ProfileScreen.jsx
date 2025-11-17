import React, { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import {
  Avatar,
  Button,
  Chip,
  Divider,
  List,
  Snackbar,
  Text,
  useTheme,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SettingsSection from '../components/SettingsSection';
import RiskBadge from '../../../components/shared/RiskBadge';
import { getInitials } from '../../../utils/formatters';

const defaultProfile = {
  membershipTier: 'Silver',
  lastVisit: null,
  loyaltyPoints: 0,
  gender: 'female',
  dateOfBirth: '1995-05-10',
  phoneNumber: '+628123456789',
  medicalDetails: {
    allergies: ['Penisilin', 'Latex'],
    chronicConditions: ['Hipertensi'],
    medications: ['Metformin 500mg', 'Vitamin D'],
    notes: 'Riwayat gigi sensitif sejak 2021',
  },
  emergencyContact: {
    name: 'Sarah Putri',
    phone: '+628987654321',
    relationship: 'Suami/Istri',
  },
  insurance: {
    provider: 'BPJS Kesehatan',
    number: '00011223344',
    memberId: 'PLAT-9912',
  },
  address: {
    line1: 'Jl. Kemang Raya No. 12',
    city: 'Jakarta Selatan',
    province: 'DKI Jakarta',
    postalCode: '12720',
  },
};

const ProfileScreen = ({ navigation }) => {
  const theme = useTheme();
  const { user, patientProfile } = useSelector((state) => state.auth);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  const profile = useMemo(() => {
    return {
      ...defaultProfile,
      ...patientProfile,
      medicalDetails: {
        ...defaultProfile.medicalDetails,
        ...(patientProfile?.medicalDetails || {}),
      },
      emergencyContact: patientProfile?.emergencyContact || defaultProfile.emergencyContact,
      insurance: patientProfile?.insurance || defaultProfile.insurance,
      address: patientProfile?.address || defaultProfile.address,
      phoneNumber: patientProfile?.phoneNumber || defaultProfile.phoneNumber,
    };
  }, [patientProfile]);

  const riskLevel = useMemo(() => {
    const allergies = profile.medicalDetails?.allergies?.length || 0;
    const chronic = profile.medicalDetails?.chronicConditions?.length || 0;
    if (allergies >= 3 || chronic >= 2) return 'high';
    if (allergies === 2 || chronic === 1) return 'medium';
    return 'low';
  }, [profile]);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderTagGroup = (items, icon) => {
    if (!items || items.length === 0) {
      return <Text style={{ color: theme.colors.onSurfaceVariant }}>Belum ada data</Text>;
    }
    return (
      <View style={styles.tagRow}>
        {items.map((item) => (
          <Chip key={item} icon={icon} compact style={styles.tagChip}>
            {item}
          </Chip>
        ))}
      </View>
    );
  };

  const stats = [
    { label: 'Terakhir kunjungan', value: formatDate(profile.lastVisit) },
    { label: 'Poin loyalti', value: `${profile.loyaltyPoints || 0}` },
    { label: 'Tier', value: profile.membershipTier || 'Member' },
  ];

  const addressLine = useMemo(() => {
    const parts = [
      profile.address?.line1,
      profile.address?.city,
      profile.address?.province,
      profile.address?.postalCode,
    ].filter(Boolean);
    return parts.length ? parts.join(', ') : 'Belum diisi';
  }, [profile]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroWrapper}>
          <LinearGradient
            colors={theme?.gradients?.secondary || [theme.colors.primary, theme.colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.heroCard, theme?.shadows?.lg]}
          >
            <View style={styles.heroHeader}>
              <Avatar.Text
                size={64}
                label={getInitials(user?.name || 'Serene User')}
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              />
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text variant="titleLarge" style={styles.heroName}>
                  {user?.name || 'Pasien Serene'}
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onPrimary }}>
                  {profile.membershipTier} Member • {profile.phoneNumber}
                </Text>
              </View>
              <Button
                mode="contained-tonal"
                compact
                textColor={theme.colors.primary}
                onPress={() => setSnackbar({ visible: true, message: 'Fitur edit profil segera hadir.' })}
              >
                Ubah
              </Button>
            </View>

            <View style={styles.statRow}>
              {stats.map((item, index) => (
                <View
                  key={item.label}
                  style={[styles.statCard, index !== stats.length - 1 && styles.statSeparator]}
                >
                  <Text variant="labelSmall" style={styles.statLabel}>
                    {item.label}
                  </Text>
                  <Text variant="titleMedium" style={styles.statValue}>
                    {item.value || '-'}
                  </Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </View>

        <SettingsSection
          title="KONTAK & IDENTITAS"
          description="Informasi dasar akun."
          action={
            <Button compact mode="text" onPress={() => navigation.navigate('Settings')}>
              Kelola
            </Button>
          }
        >
          <List.Item
            title="Email"
            description={user?.email || 'Belum diisi'}
            left={(props) => <List.Icon {...props} icon="email-outline" />}
          />
          <Divider />
          <List.Item
            title="Nomor telepon"
            description={user?.phone_number || profile.phoneNumber}
            left={(props) => <List.Icon {...props} icon="cellphone" />}
          />
          <Divider />
          <List.Item
            title="Tanggal lahir"
            description={formatDate(profile.dateOfBirth)}
            left={(props) => <List.Icon {...props} icon="calendar" />}
          />
          <Divider />
          <List.Item
            title="Jenis kelamin"
            description={profile.gender === 'female' ? 'Perempuan' : 'Laki-laki'}
            left={(props) => <List.Icon {...props} icon="account" />}
          />
        </SettingsSection>

        <SettingsSection
          title="INFORMASI MEDIS"
          description="Data dibagikan ke dokter sebelum tindakan."
          action={
            <Button compact mode="text" onPress={() => setSnackbar({ visible: true, message: 'Hubungi klinik untuk update data medis' })}>
              Update
            </Button>
          }
        >
            <View style={styles.medicalHeader}>
              <RiskBadge level={riskLevel} label={`Risiko ${riskLevel}`} />
              <Text
                variant="bodySmall"
                style={[styles.medicalDescription, { color: theme.colors.onSurfaceVariant }]}
              >
                Disinkronisasi otomatis dengan rekam medis klinik Serene.
              </Text>
            </View>

          <Text variant="labelLarge" style={styles.sectionLabel}>
            Alergi
          </Text>
          {renderTagGroup(profile.medicalDetails?.allergies, 'alert')}
          <Text variant="labelLarge" style={styles.sectionLabel}>
            Kondisi kronis
          </Text>
          {renderTagGroup(profile.medicalDetails?.chronicConditions, 'heart-pulse')}
          <Text variant="labelLarge" style={styles.sectionLabel}>
            Obat rutin
          </Text>
          {renderTagGroup(profile.medicalDetails?.medications, 'pill')}

          {profile.medicalDetails?.notes && (
            <View style={[styles.notesBox, { backgroundColor: theme.colors.surfaceVariant }]}>
              <MaterialCommunityIcons
                name="notebook"
                size={20}
                color={theme.colors.primary}
              />
              <Text variant="bodySmall" style={styles.notesText}>
                {profile.medicalDetails.notes}
              </Text>
            </View>
          )}
        </SettingsSection>

        <SettingsSection title="ASURANSI & ALAMAT">
          <List.Item
            title="Provider asuransi"
            description={profile.insurance?.provider || 'Belum diisi'}
            left={(props) => <List.Icon {...props} icon="shield-home" />}
          />
          <Divider />
          <List.Item
            title="Nomor polis"
            description={profile.insurance?.number || '-'}
            left={(props) => <List.Icon {...props} icon="card-text-outline" />}
          />
          <Divider />
          <List.Item
            title="Alamat rumah"
            description={addressLine}
            left={(props) => <List.Icon {...props} icon="map-marker" />}
          />
        </SettingsSection>

        <SettingsSection title="KONTAK DARURAT" description="Hubungi saat kondisi kritis">
          <List.Item
            title={profile.emergencyContact?.name}
            description={`${profile.emergencyContact?.relationship} • ${profile.emergencyContact?.phone}`}
            left={(props) => <List.Icon {...props} icon="account-heart" />}
            right={(props) => (
              <Button
                compact
                mode="contained"
                onPress={() => setSnackbar({ visible: true, message: 'Menelepon kontak darurat...' })}
              >
                Panggil
              </Button>
            )}
          />
        </SettingsSection>
      </ScrollView>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ visible: false, message: '' })}
        duration={3000}
        action={{ label: 'Tutup' }}
      >
        {snackbar.message}
      </Snackbar>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    paddingVertical: 24,
  },
  heroWrapper: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  heroCard: {
    borderRadius: 28,
    padding: 20,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroName: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
  },
  statSeparator: {
    marginRight: 12,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  medicalHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  medicalDescription: {
    marginTop: 8,
  },
  sectionLabel: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  tagChip: {
    marginHorizontal: 4,
    marginBottom: 8,
  },
  notesBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    margin: 16,
    padding: 12,
    borderRadius: 16,
  },
  notesText: {
    marginLeft: 12,
    flex: 1,
  },
});

export default ProfileScreen;
