import React from 'react';
import { AdminEmptyState } from '../../ui/AdminPagePrimitives';

const RecentTickets = () => (
  <AdminEmptyState
    icon="HeadphonesIcon"
    title="Recent tickets belum tersedia"
    description="Backend helpdesk belum mengirim ticket produksi. Komponen ini tidak menampilkan sample ticket palsu."
  />
);

export default RecentTickets;
