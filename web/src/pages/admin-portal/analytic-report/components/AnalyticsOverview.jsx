import React from 'react';
import { AdminEmptyState } from '../../ui/AdminPagePrimitives';

const AnalyticsOverview = () => (
    <AdminEmptyState
        icon="BarChart3"
        title="Analytics overview belum tersedia"
        description="Backend belum menyediakan sumber analytics platform-wide. Tidak ada angka demo/fallback yang ditampilkan."
    />
);

export default AnalyticsOverview;
