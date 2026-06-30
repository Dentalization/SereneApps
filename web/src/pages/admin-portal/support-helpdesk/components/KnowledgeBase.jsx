import React from 'react';
import { AdminEmptyState } from '../../ui/AdminPagePrimitives';

const KnowledgeBase = () => (
  <AdminEmptyState
    icon="BookOpen"
    title="Knowledge base belum tersedia"
    description="Artikel knowledge base harus berasal dari backend. Sample artikel dan angka views sudah tidak ditampilkan."
  />
);

export default KnowledgeBase;
