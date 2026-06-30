import React from 'react';
import { AdminEmptyState } from '../../ui/AdminPagePrimitives';

const LiveChat = () => (
  <AdminEmptyState
    icon="MessageCircle"
    title="Live chat belum tersedia"
    description="Percakapan realtime belum tersedia dari backend support, jadi tidak ada chat demo yang ditampilkan."
  />
);

export default LiveChat;
