import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../../../../components/AppIcon';
import {
  fetchAppointmentCommunicationsToken,
  recordCommunicationClientEvent
} from '../../../../services/chatService';

const initialChecks = [
  { id: 'appointment', label: 'Appointment', status: 'pending', critical: true },
  { id: 'network', label: 'Jaringan', status: 'pending', critical: true },
  { id: 'devices', label: 'Kamera & mikrofon', status: 'pending', critical: true },
  { id: 'token', label: 'Token sesi', status: 'pending', critical: true },
  { id: 'chat', label: 'Kesiapan chat', status: 'pending', critical: true },
  { id: 'video', label: 'Kesiapan video room', status: 'pending', critical: true }
];

const DEVICE_CHECK_CACHE_TTL_MS = 2 * 60 * 1000;
const DEVICE_CHECK_CACHE_KEY = 'sereneapps:teledentistry:device-check-passed-at';

function hasRecentDeviceCheck() {
  const value = Number(window.sessionStorage?.getItem(DEVICE_CHECK_CACHE_KEY) || 0);
  return value && Date.now() - value < DEVICE_CHECK_CACHE_TTL_MS;
}

function markDeviceCheckPassed() {
  window.sessionStorage?.setItem(DEVICE_CHECK_CACHE_KEY, String(Date.now()));
}

function deviceFixHint(reason) {
  if (reason === 'NotAllowedError' || /denied/i.test(reason || '')) {
    return 'Izinkan akses kamera dan mikrofon di browser, lalu klik Retry.';
  }
  if (reason === 'NotFoundError') {
    return 'Periksa perangkat kamera/mikrofon, lalu sambungkan ulang jika perlu.';
  }
  return 'Reload halaman atau hubungi admin jika pemeriksaan perangkat tetap gagal.';
}

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
        if (hasRecentDeviceCheck()) {
          setCheck('devices', 'pass', 'Siap (dicek baru saja)');
        } else {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
          stream.getTracks().forEach((track) => track.stop());
          markDeviceCheckPassed();
          setCheck('devices', 'pass', 'Siap');
        }
        if (appointmentId) recordCommunicationClientEvent(appointmentId, 'device_check_passed', { surface: 'dentist_web_checklist' }).catch(() => null);
      } catch (deviceError) {
        const reason = deviceError?.name || 'Permission/device unavailable';
        setCheck('devices', 'fail', `${reason}. ${deviceFixHint(reason)}`);
        if (appointmentId) recordCommunicationClientEvent(appointmentId, 'device_check_failed', { reason }).catch(() => null);
      }

      if (!appointmentId) {
        setCheck('token', 'fail', 'Missing appointment');
        setCheck('chat', 'fail', 'Missing appointment');
        setCheck('video', 'fail', 'Missing appointment');
        return;
      }

      const session = await fetchAppointmentCommunicationsToken(appointmentId);
      setCheck('token', session?.token ? 'pass' : 'fail', session?.token ? 'Token siap' : 'Token gagal. Hubungi admin jika berulang.');
      setCheck('chat', session?.chat?.conversationSid ? 'pass' : 'fail', session?.chat?.conversationSid ? 'Chat siap' : 'Chat belum siap. Klik Retry.');
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'rgba(15,13,26,0.75)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div
        className="w-full max-w-lg overflow-hidden"
        style={{
          background: 'rgba(26,21,40,0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '1.5rem',
          boxShadow: '0 25px 50px rgba(0,0,0,0.7)',
        }}
      >
        <header className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--td-text-main)' }}>Checklist sebelum panggilan</h2>
            <p className="text-sm" style={{ color: 'var(--td-text-muted)' }}>Appointment #{appointmentId || '-'}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 transition-all duration-150 hover:scale-105" style={{ color: 'var(--td-text-muted)', background: 'rgba(255,255,255,0.04)' }} aria-label="Close checklist">
            <Icon name="X" size={18} />
          </button>
        </header>

        {error && (
          <div className="mx-5 mt-4 rounded-md px-3 py-2 text-sm" style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.22)' }}>
            {error}
          </div>
        )}

        <div className="px-5 py-4 space-y-2">
          {checks.map((check) => (
            <div key={check.id} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--td-text-main)' }}>{check.label}</p>
                {check.detail && <p className="text-xs" style={{ color: 'var(--td-text-muted)' }}>{check.detail}</p>}
              </div>
              <StatusIcon status={check.status} />
            </div>
          ))}
        </div>

        <footer className="flex items-center justify-end gap-2 px-5 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={runChecks}
            disabled={running}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm disabled:opacity-50"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--td-text-sub)' }}
          >
            <Icon name={running ? 'Loader2' : 'RefreshCw'} size={14} className={running ? 'animate-spin' : ''} />
            Retry
          </button>
          <button
            onClick={onJoin}
            disabled={!canJoin || running}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', boxShadow: '0 4px 12px rgba(124,58,237,0.35)' }}
          >
            <Icon name="Video" size={14} />
            Join
          </button>
        </footer>
      </div>
    </div>
  );
}

function StatusIcon({ status }) {
  if (status === 'pass') return <Icon name="CheckCircle2" size={18} style={{ color: '#22c55e' }} />;
  if (status === 'fail') return <Icon name="XCircle" size={18} style={{ color: '#ef4444' }} />;
  return <Icon name="Circle" size={18} style={{ color: 'var(--td-text-muted)' }} />;
}
