import React, { useMemo } from 'react';
import { useRoute } from '@react-navigation/native';
import NotificationDetailLayout from '../../components/NotificationDetailLayout';

const NotificationSystemDetailScreen = () => {
  const route = useRoute();
  const notification = route.params?.notification;
  const meta = notification?.meta || {};

  const sections = useMemo(() => {
    const infoRows = [
      meta.window && { label: 'Jadwal', value: meta.window },
      meta.version && { label: 'Versi', value: meta.version },
    ];
    const impactRows =
      meta.impacts?.map((item, idx) => ({
        label: `Dampak ${idx + 1}`,
        value: item,
      })) || [];
    const actionRows =
      meta.actions?.map((item, idx) => ({
        label: `Tindakan ${idx + 1}`,
        value: item,
      })) || [];
    const featureRows =
      meta.newFeatures?.map((feature, idx) => ({
        label: `Fitur ${idx + 1}`,
        value: feature,
      })) || [];
    const policyRows =
      meta.policyUpdates?.map((item, idx) => ({
        label: `Perubahan ${idx + 1}`,
        value: item,
      })) || [];
    return [
      { title: 'Informasi Sistem', rows: infoRows.filter(Boolean) },
      ...(impactRows.length ? [{ title: 'Dampak', rows: impactRows }] : []),
      ...(actionRows.length ? [{ title: 'Tindakan yang disarankan', rows: actionRows }] : []),
      ...(featureRows.length ? [{ title: 'Fitur Baru', rows: featureRows }] : []),
      ...(policyRows.length ? [{ title: 'Pembaruan Kebijakan', rows: policyRows }] : []),
    ];
  }, [meta]);

  return <NotificationDetailLayout notification={notification} sections={sections} />;
};

export default NotificationSystemDetailScreen;
