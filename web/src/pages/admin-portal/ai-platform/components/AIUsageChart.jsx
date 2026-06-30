import React from 'react';
import { AdminEmptyState } from '../../ui/AdminPagePrimitives';

const AIUsageChart = () => (
  <AdminEmptyState
    icon="Activity"
    title="AI usage chart belum tersedia"
    description="Token, request, dan usage trend belum ditampilkan sampai backend AI usage tersedia."
  />
);

export default AIUsageChart;
