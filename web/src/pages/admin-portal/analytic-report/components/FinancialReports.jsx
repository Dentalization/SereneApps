import React from 'react';
import { AdminEmptyState } from '../../ui/AdminPagePrimitives';

const FinancialReports = () => (
    <AdminEmptyState
        icon="FileBarChart"
        title="Financial analytics reports belum tersedia"
        description="Gunakan Revenue & Billing untuk data payment/invoice yang tersedia. Export analytics report dinonaktifkan sampai backend report source tersedia."
    />
);

export default FinancialReports;
