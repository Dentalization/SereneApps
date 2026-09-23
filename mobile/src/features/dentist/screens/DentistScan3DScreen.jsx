import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card, Button, TextInput, Chip, useTheme, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DentistRoleGuard from '../components/DentistRoleGuard';

const MOCK_RECENT_PATIENTS = [
  { id: '1', name: 'Budi Santoso', mrn: 'MRN-2026-081', phone: '+6281234567890' },
  { id: '2', name: 'Siti Rahma', mrn: 'MRN-2026-082', phone: '+6281298765432' },
  { id: '3', name: 'Ahmad Fauzi', mrn: 'MRN-2026-083', phone: '+6281311223344' },
];

const DentistScan3DScreen = ({ navigation }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [scanArch, setScanArch] = useState('full'); // 'full' | 'upper' | 'lower'
  const [isReadyToRecord, setIsReadyToRecord] = useState(false);

  const filteredPatients = MOCK_RECENT_PATIENTS.filter((p) =>
    p.name.toLowerCase().includes(patientSearchQuery.toLowerCase()) ||
    p.mrn.toLowerCase().includes(patientSearchQuery.toLowerCase())
  );

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setIsReadyToRecord(true);
  };

  const handleClearPatient = () => {
    setSelectedPatient(null);
    setIsReadyToRecord(false);
  };

  return (
    <DentistRoleGuard navigation={navigation}>
      <View style={[styles.root, { backgroundColor: '#F8FAFC', paddingTop: insets.top }]}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.headerIconCircle, { backgroundColor: '#E0F2FE' }]}>
                <MaterialCommunityIcons name="cube-scan" size={24} color="#0284C7" />
              </View>
              <View>
                <Text variant="titleLarge" style={styles.screenTitle}>
                  3D Dental Scan
                </Text>
                <Text variant="bodySmall" style={styles.screenSubtitle}>
                  Continuous Smartphone RGB Video Acquisition
                </Text>
              </View>
            </View>
          </View>

          {/* Section 1: Patient Selection */}
          <Card style={styles.card} elevation={2}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <Text variant="titleMedium" style={styles.cardTitle}>
                  1. Pilih Pasien
                </Text>
                {selectedPatient && (
                  <Button mode="text" compact onPress={handleClearPatient} textColor="#EF4444">
                    Ganti
                  </Button>
                )}
              </View>

              {selectedPatient ? (
                <View style={styles.selectedPatientBanner}>
                  <View style={styles.patientAvatarCircle}>
                    <MaterialCommunityIcons name="account" size={24} color="#0284C7" />
                  </View>
                  <View style={styles.patientDetails}>
                    <Text style={styles.patientName}>{selectedPatient.name}</Text>
                    <Text style={styles.patientSubtext}>
                      {selectedPatient.mrn} • {selectedPatient.phone}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="check-circle" size={20} color="#16A34A" />
                </View>
              ) : (
                <View style={styles.patientSearchContainer}>
                  <TextInput
                    mode="outlined"
                    placeholder="Cari nama pasien atau No. RM..."
                    value={patientSearchQuery}
                    onChangeText={setPatientSearchQuery}
                    left={<TextInput.Icon icon="magnify" />}
                    style={styles.searchInput}
                    outlineStyle={styles.searchOutline}
                    dense
                  />

                  <Text style={styles.recentLabel}>Pasien Terdaftar:</Text>
                  <View style={styles.patientList}>
                    {filteredPatients.map((patient) => (
                      <TouchableOpacity
                        key={patient.id}
                        onPress={() => handleSelectPatient(patient)}
                        style={styles.patientItem}
                        activeOpacity={0.7}
                      >
                        <View style={styles.patientItemLeft}>
                          <MaterialCommunityIcons name="account-outline" size={20} color="#64748B" />
                          <View>
                            <Text style={styles.patientItemName}>{patient.name}</Text>
                            <Text style={styles.patientItemMrn}>{patient.mrn}</Text>
                          </View>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={20} color="#94A3B8" />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </Card.Content>
          </Card>

          {/* Section 2: Scan Scope / Target Arch */}
          <Card style={styles.card} elevation={2}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.cardTitle}>
                2. Target Area Pemindaian
              </Text>
              <Text variant="bodySmall" style={styles.cardSubtitle}>
                Pilih lengkung gigi yang akan direkonstruksi:
              </Text>

              <View style={styles.chipRow}>
                <Chip
                  selected={scanArch === 'full'}
                  onPress={() => setScanArch('full')}
                  style={[styles.archChip, scanArch === 'full' && styles.archChipSelected]}
                  textStyle={scanArch === 'full' ? styles.archChipTextSelected : styles.archChipText}
                >
                  Full Arch (Kedua Lengkung)
                </Chip>
                <Chip
                  selected={scanArch === 'upper'}
                  onPress={() => setScanArch('upper')}
                  style={[styles.archChip, scanArch === 'upper' && styles.archChipSelected]}
                  textStyle={scanArch === 'upper' ? styles.archChipTextSelected : styles.archChipText}
                >
                  Maxilla (Atas)
                </Chip>
                <Chip
                  selected={scanArch === 'lower'}
                  onPress={() => setScanArch('lower')}
                  style={[styles.archChip, scanArch === 'lower' && styles.archChipSelected]}
                  textStyle={scanArch === 'lower' ? styles.archChipTextSelected : styles.archChipText}
                >
                  Mandibula (Bawah)
                </Chip>
              </View>
            </Card.Content>
          </Card>

          {/* Section 3: Protocol Guidance Checklist */}
          <Card style={styles.card} elevation={2}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.cardTitle}>
                3. Panduan Pengambilan Video RGB
              </Text>
              <Text variant="bodySmall" style={styles.cardSubtitle}>
                Standar akurasi fotogrametri & neural reconstruction:
              </Text>

              <View style={styles.guidanceList}>
                <View style={styles.guidanceItem}>
                  <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color="#0284C7" />
                  <Text style={styles.guidanceText}>
                    <Text style={styles.boldText}>Pencahayaan Cukup:</Text> Pastikan rongga mulut diterangi cahaya stabil tanpa bayangan pekat.
                  </Text>
                </View>

                <View style={styles.guidanceItem}>
                  <MaterialCommunityIcons name="speedometer" size={18} color="#0284C7" />
                  <Text style={styles.guidanceText}>
                    <Text style={styles.boldText}>Gerakan Halus & Konstan:</Text> Gerakkan kamera secara perlahan mengitari oklusal, bukal, dan lingual.
                  </Text>
                </View>

                <View style={styles.guidanceItem}>
                  <MaterialCommunityIcons name="focus-field" size={18} color="#0284C7" />
                  <Text style={styles.guidanceText}>
                    <Text style={styles.boldText}>Jaga Jarak Fokus:</Text> Pertahankan jarak 5–10 cm agar frame tidak buram (mengurangi motion blur).
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>

          {/* Action Button: Start Continuous RGB Video */}
          <Button
            mode="contained"
            disabled={!selectedPatient}
            onPress={() => {
              // Note: Video capture and async upload will be hooked up in Phase 2
              alert(`Pasien: ${selectedPatient?.name}\nTarget: ${scanArch.toUpperCase()}\n\nKamera siap untuk continuous RGB video capture (Phase 2).`);
            }}
            style={[
              styles.actionButton,
              { backgroundColor: selectedPatient ? (theme.colors.primary || '#0284C7') : '#CBD5E1' }
            ]}
            contentStyle={styles.actionButtonContent}
            icon="camera-wireless-outline"
          >
            {selectedPatient ? 'Buka Kamera Perekaman 3D' : 'Pilih Pasien Terlebih Dahulu'}
          </Button>

          {/* Research Reference Badge */}
          <View style={styles.researchFooter}>
            <MaterialCommunityIcons name="school-outline" size={16} color="#64748B" />
            <Text variant="bodySmall" style={styles.researchFooterText}>
              Research Precedent: In Vitro Implant Protocol • Deep Learning 3D Reconstruction
            </Text>
          </View>
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
    marginBottom: 16,
    marginTop: 4,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenTitle: {
    fontWeight: '800',
    color: '#0F172A',
  },
  screenSubtitle: {
    color: '#64748B',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSubtitle: {
    color: '#64748B',
    marginBottom: 12,
  },
  selectedPatientBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  patientAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  patientDetails: {
    flex: 1,
  },
  patientName: {
    fontWeight: '700',
    fontSize: 14,
    color: '#0369A1',
  },
  patientSubtext: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  patientSearchContainer: {
    marginTop: 4,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  searchOutline: {
    borderRadius: 12,
    borderColor: '#E2E8F0',
  },
  recentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
  },
  patientList: {
    gap: 8,
  },
  patientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  patientItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  patientItemName: {
    fontWeight: '600',
    fontSize: 13,
    color: '#1E293B',
  },
  patientItemMrn: {
    fontSize: 11,
    color: '#64748B',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  archChip: {
    backgroundColor: '#F1F5F9',
  },
  archChipSelected: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  archChipText: {
    color: '#475569',
    fontSize: 12,
  },
  archChipTextSelected: {
    color: '#0284C7',
    fontWeight: '700',
    fontSize: 12,
  },
  guidanceList: {
    gap: 10,
  },
  guidanceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  guidanceText: {
    flex: 1,
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  boldText: {
    fontWeight: '700',
    color: '#1E293B',
  },
  actionButton: {
    borderRadius: 14,
    marginTop: 8,
    marginBottom: 16,
    elevation: 2,
  },
  actionButtonContent: {
    paddingVertical: 8,
  },
  researchFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  researchFooterText: {
    color: '#64748B',
    fontSize: 11,
    textAlign: 'center',
  },
});

export default DentistScan3DScreen;
