import React from 'react';
import { AdminEmptyState } from '../../ui/AdminPagePrimitives';

const TicketVolumeChart = () => (
  <AdminEmptyState
    icon="BarChart3"
    title="Ticket volume belum tersedia"
    description="Chart ticket volume menunggu data backend helpdesk, bukan dataset demo."
  />
);

export default TicketVolumeChart;
