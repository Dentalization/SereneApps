import React from 'react';
import { AdminEmptyState } from '../../ui/AdminPagePrimitives';

const ModelPerformance = () => (
  <AdminEmptyState
    icon="Settings"
    title="Model performance belum tersedia"
    description="Akurasi, request volume, uptime, dan latency model harus berasal dari backend model registry/observability."
  />
);

export default ModelPerformance;
