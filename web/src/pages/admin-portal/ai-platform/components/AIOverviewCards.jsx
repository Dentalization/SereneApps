import React from 'react';
import { AdminEmptyState } from '../../ui/AdminPagePrimitives';

const AIOverviewCards = () => (
  <AdminEmptyState
    icon="Brain"
    title="AI platform metrics belum tersedia"
    description="Usage, request, latency, dan model health harus berasal dari backend AI admin. Tidak ada angka demo yang ditampilkan sebagai produksi."
  />
);

export default AIOverviewCards;
