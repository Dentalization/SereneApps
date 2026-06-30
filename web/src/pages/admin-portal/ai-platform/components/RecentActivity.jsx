import React from 'react';
import { AdminEmptyState } from '../../ui/AdminPagePrimitives';

const RecentActivity = () => (
  <AdminEmptyState
    icon="Clock"
    title="AI activity feed belum tersedia"
    description="Activity feed AI tidak memakai nama clinic sample. Backend harus mengirim event produksi sebelum daftar ditampilkan."
  />
);

export default RecentActivity;
