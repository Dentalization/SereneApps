import React, { useMemo } from 'react';
import { View, Image, StyleSheet, Linking } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useRoute } from '@react-navigation/native';
import NotificationDetailLayout from '../../components/NotificationDetailLayout';

const formatDate = (iso) =>
  iso
    ? new Date(iso).toLocaleString(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

const NotificationAppointmentDetailScreen = () => {
  const route = useRoute();
  const notification = route.params?.notification;
  const meta = notification?.meta || {};

  const heroExtras = meta.dentist ? (
    <View style={styles.doctorCard}>
      {meta.dentistAvatar ? (
        <Image source={{ uri: meta.dentistAvatar }} style={styles.doctorAvatar} />
      ) : (
        <View style={[styles.doctorAvatar, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.doctorName}>{meta.dentist}</Text>
        {meta.clinicName ? (
          <Text style={styles.doctorClinic}>{meta.clinicName}</Text>
        ) : null}
      </View>
    </View>
  ) : null;

  const sections = useMemo(() => {
    const rows = [
      meta.appointmentId && { label: 'ID Janji', value: meta.appointmentId },
      meta.status && { label: 'Status', value: meta.status },
      meta.patient && { label: 'Pasien', value: meta.patient },
      meta.startsAt && { label: 'Waktu', value: formatDate(meta.startsAt) },
      meta.clinicAddress && { label: 'Alamat', value: meta.clinicAddress },
      meta.clinicPhone && { label: 'Telepon Klinik', value: meta.clinicPhone },
      meta.reason && { label: 'Alasan', value: meta.reason },
    ];
    const prepRows =
      meta.preparations?.map((item, idx) => ({
        label: `Langkah ${idx + 1}`,
        value: item,
      })) || [];
    const notesRows =
      meta.notes?.map((note) => ({
        label: '',
        value: note,
      })) || [];
    const attachmentRows =
      meta.attachments?.map((item) => ({ label: 'Lampiran', value: item })) || [];
    const nextStepRows =
      meta.nextSteps?.map((step, idx) => ({ label: `Tindak lanjut ${idx + 1}`, value: step })) || [];
    return [
      { title: 'Detail Janji', rows: rows.filter(Boolean) },
      ...(prepRows.length ? [{ title: 'Persiapan Pasien', rows: prepRows }] : []),
      ...(notesRows.length ? [{ title: 'Catatan Tambahan', rows: notesRows }] : []),
      ...(attachmentRows.length ? [{ title: 'Lampiran', rows: attachmentRows }] : []),
      ...(nextStepRows.length ? [{ title: 'Tindak Lanjut', rows: nextStepRows }] : []),
    ];
  }, [meta]);

  const footer = meta.mapLink ? (
    <Button mode="outlined" onPress={() => Linking.openURL(meta.mapLink)}>
      Buka lokasi di Maps
    </Button>
  ) : null;

  return (
    <NotificationDetailLayout
      notification={notification}
      sections={sections}
      heroExtras={heroExtras}
      footer={footer}
    />
  );
};

const styles = StyleSheet.create({
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    padding: 12,
  },
  doctorAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 12,
  },
  doctorName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  doctorClinic: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
  },
});

export default NotificationAppointmentDetailScreen;
