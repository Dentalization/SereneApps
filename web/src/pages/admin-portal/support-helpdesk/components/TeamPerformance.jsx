import React from 'react';
import { AdminEmptyState } from '../../ui/AdminPagePrimitives';

const TeamPerformance = () => (
  <AdminEmptyState
    icon="Users"
    title="Team performance belum tersedia"
    description="Performa agent support tidak ditampilkan sampai backend mengirim data produksi."
  />
);

export default TeamPerformance;
