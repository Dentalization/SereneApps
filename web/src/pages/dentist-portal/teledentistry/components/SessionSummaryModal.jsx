import React from 'react';
import PostCallSummaryPanel from './PostCallSummaryPanel';

export default function SessionSummaryModal({ open, onClose, appointmentId, conversation }) {
  return (
    <PostCallSummaryPanel
      open={open}
      onClose={onClose}
      appointmentId={appointmentId}
      conversation={conversation}
    />
  );
}
