import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../../../../components/AppIcon';
import {
  fetchAppointmentCommunicationsToken,
  recordCommunicationClientEvent
} from '../../../../services/chatService';

const initialChecks = [
  { id: 'appointment', label: 'Appointment', status: 'pending', critical: true },
  { id: 'network', label: 'Network', status: 'pending', critical: true },
  { id: 'devices', label: 'Camera & microphone', status: 'pending', critical: true },
  { id: 'token', label: 'Token readiness', status: 'pending', critical: true },
  { id: 'chat', label: 'Chat readiness', status: 'pending', critical: true },
  { id: 'video', label: 'Video room readiness', status: 'pending', critical: true }
];

export default function PreCallChecklistModal({ appointmentId, open, onClose, onJoin }) {
  const [checks, setChecks] = useState(initialChecks);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  const canJoin = useMemo(
    () => checks.every((check) => !check.critical || check.status === 'pass'),
    [checks]
  );

  const setCheck = (id, status, detail = '') => {
    setChecks((current) => current.map((check) => (
      check.id === id ? { ...check, status, detail } : check
    )));
  };

  const runChecks = async () => {
    setRunning(true);
    setError('');
    setChecks(initialChecks);
    if (appointmentId) {
      recordCommunicationClientEvent(appointmentId, 'device_check_started', { surface: 'dentist_web_checklist' }).catch(() => null);
    }

    try {
      setCheck('appointment', appointmentId ? 'pass' : 'fail', appointmentId ? `#${appointmentId}` : 'No appointment selected');
      setCheck('network', navigator.onLine === false ? 'fail' : 'pass', navigator.onLine === false ? 'Offline' : 'Online');

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        stream.getTracks().forEach((track) => track.stop());
        setCheck('devices', 'pass', 'Ready');
        if (appointmentId) recordCommunicationClientEvent(appointmentId, 'device_check_passed', { surface: 'dentist_web_checklist' }).catch(() => null);
      } catch (deviceError) {
        setCheck('devices', 'fail', deviceError?.name || 'Permission/device unavailable');
        if (appointmentId) recordCommunicationClientEvent(appointmentId, 'device_check_failed', { reason: deviceError?.name || 'unavailable' }).catch(() => null);
      }

      if (!appointmentId) {
        setCheck('token', 'fail', 'Missing appointment');
        setCheck('chat', 'fail', 'Missing appointment');
        setCheck('video', 'fail', 'Missing appointment');
        return;
      }

      const session = await fetchAppointmentCommunicationsToken(appointmentId);
      setCheck('token', session?.token ? 'pass' : 'fail', session?.token ? 'Issued' : 'Unavailable');
      setCheck('chat', session?.chat?.conversationSid ? 'pass' : 'fail', session?.chat?.conversationSid ? 'Conversation ready' : 'Conversation unavailable');
      setCheck('video', session?.video?.roomName && session?.video?.canJoin ? 'pass' : 'fail', session?.video?.roomName || 'Room unavailable');
    } catch (checkError) {
      const code = checkError?.response?.data?.error?.code || checkError?.message || 'Checklist failed';
      setError(code);
      setCheck('token', 'fail', code);
      setCheck('chat', 'fail', code);
      setCheck('video', 'fail', code);
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    if (open) runChecks();
  }, [open, appointmentId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-lg bg-surface-elevated border border-primary/20 shadow-2xl">
        <header className="px-5 py-4 border-b border-primary/10 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-primary">Pre-call checklist</h2>
            <p className="text-sm text-secondary">Appointment #{appointmentId || '-'}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-primary/10 text-muted" aria-label="Close checklist">
            <Icon name="X" size={18} />
          </button>
        </header>

        {error && <div className="mx-5 mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <div className="px-5 py-4 space-y-2">
          {checks.map((check) => (
            <div key={check.id} className="flex items-center justify-between rounded-lg border border-primary/10 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-primary">{check.label}</p>
                {check.detail && <p className="text-xs text-muted">{check.detail}</p>}
              </div>
              <StatusIcon status={check.status} />
            </div>
          ))}
        </div>

        <footer className="px-5 py-4 border-t border-primary/10 flex items-center justify-end gap-2">
          <button onClick={runChecks} disabled={running} className="inline-flex items-center gap-2 rounded-lg border border-primary/20 px-4 py-2 text-sm text-primary disabled:opacity-50">
            <Icon name={running ? 'Loader2' : 'RefreshCw'} size={14} className={running ? 'animate-spin' : ''} />
            Retry
          </button>
          <button onClick={onJoin} disabled={!canJoin || running} className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            <Icon name="Video" size={14} />
            Join
          </button>
        </footer>
      </div>
    </div>
  );
}

function StatusIcon({ status }) {
  if (status === 'pass') return <Icon name="CheckCircle2" size={18} className="text-emerald-500" />;
  if (status === 'fail') return <Icon name="XCircle" size={18} className="text-red-500" />;
  return <Icon name="Circle" size={18} className="text-muted" />;
}
