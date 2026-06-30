import React from 'react';
import { AdminEmptyState } from '../../ui/AdminPagePrimitives';

const SupportOverviewCards = () => (
  <AdminEmptyState
    icon="Ticket"
    title="Support metrics belum tersedia"
    description="Open tickets, response time, resolution rate, dan CSAT harus berasal dari backend helpdesk."
  />
);

export default SupportOverviewCards;
