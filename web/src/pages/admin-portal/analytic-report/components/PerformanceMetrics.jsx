import React from 'react';
import { AdminEmptyState } from '../../ui/AdminPagePrimitives';

const PerformanceMetrics = () => (
    <AdminEmptyState
        icon="Activity"
        title="Performance metrics belum tersedia"
        description="Backend belum mengirim treatment efficacy, system vitals, atau KPI operasional untuk Admin Analytics."
    />
);

export default PerformanceMetrics;
