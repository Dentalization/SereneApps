import React, { useMemo } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useRoute } from '@react-navigation/native';
import NotificationDetailLayout from '../../components/NotificationDetailLayout';

const friendlyRisk = (risk) => {
  if (!risk) return '';
  const map = {
    low: 'Rendah',
    medium: 'Sedang',
    high: 'Tinggi',
  };
  return map[risk.toLowerCase()] || risk;
};

const NotificationAIDetailScreen = () => {
  const route = useRoute();
  const notification = route.params?.notification;
  const meta = notification?.meta || {};

  const heroExtras = meta.previewImage ? (
    <View style={styles.previewRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.previewLabel}>Foto asli</Text>
        <Image source={{ uri: meta.previewImage }} style={styles.previewImage} />
      </View>
      {meta.heatmapImage ? (
        <View style={{ flex: 1 }}>
          <Text style={styles.previewLabel}>Peta panas AI</Text>
          <Image source={{ uri: meta.heatmapImage }} style={styles.previewImage} />
        </View>
      ) : null}
    </View>
  ) : null;

  const sections = useMemo(() => {
    const rows = [
      meta.scanId && { label: 'ID pemindaian', value: meta.scanId },
      meta.region && { label: 'Area terdeteksi', value: meta.region },
      meta.riskLevel && { label: 'Tingkat risiko', value: friendlyRisk(meta.riskLevel) },
      meta.status && { label: 'Status', value: meta.status },
      meta.confidence && { label: 'Keyakinan analisis', value: meta.confidence },
    ];
    const metricRows =
      meta.metrics?.map((metric) => ({
        label: metric.label,
        value: metric.value,
      })) || [];
    const recRows =
      meta.recommendations?.map((rec, idx) => ({
        label: `Rekomendasi ${idx + 1}`,
        value: rec,
      })) || [];
    const noteRows = meta.notes ? [{ label: '', value: meta.notes }] : [];
    const attachmentRows =
      meta.attachments?.map((item) => ({ label: 'Lampiran', value: item })) || [];
    const reasonRows = meta.reason ? [{ label: 'Alasan', value: meta.reason }] : [];
    return [
      { title: 'Detail Pemindaian AI', rows: rows.filter(Boolean) },
      ...(metricRows.length ? [{ title: 'Metrik AI', rows: metricRows }] : []),
      ...(recRows.length ? [{ title: 'Tindakan yang disarankan', rows: recRows }] : []),
      ...(noteRows.length ? [{ title: 'Catatan', rows: noteRows }] : []),
      ...(attachmentRows.length ? [{ title: 'Lampiran', rows: attachmentRows }] : []),
      ...(reasonRows.length ? [{ title: 'Alasan kegagalan', rows: reasonRows }] : []),
    ];
  }, [meta]);

  return (
    <NotificationDetailLayout notification={notification} sections={sections} heroExtras={heroExtras} />
  );
};

const styles = StyleSheet.create({
  previewRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  previewLabel: {
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 6,
    fontWeight: '600',
  },
  previewImage: {
    width: '100%',
    height: 140,
    borderRadius: 16,
  },
});

export default NotificationAIDetailScreen;
