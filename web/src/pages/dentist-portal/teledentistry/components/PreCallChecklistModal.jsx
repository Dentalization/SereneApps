import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../../../../components/AppIcon';
import ModalPortal from '../../../../components/ui/ModalPortal';
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
  const [modalAppointmentId, setModalAppointmentId] = useState(null);
  const [consentChecked, setConsentChecked] = useState(false);

  useEffect(() => {
    if (open) {
      setModalAppointmentId((prev) => prev || appointmentId);
    } else {
      setModalAppointmentId(null);
      setChecks(initialChecks);
      setError('');
      setConsentChecked(false);
    }
  }, [open, appointmentId]);

  const canJoin = useMemo(
    () => checks.every((check) => !check.critical || check.status === 'pass') && consentChecked,
    [checks, consentChecked]
  );

  const setCheck = (id, status, detail = '') => {
    setChecks((current) => current.map((check) => (
      check.id === id ? { ...check, status, detail } : check
    )));
  };

  const runChecks = async (targetId) => {
    if (!targetId) return;
    setRunning(true);
    setError('');
    setChecks(initialChecks);
    recordCommunicationClientEvent(targetId, 'device_check_started', { surface: 'dentist_web_checklist' }).catch(() => null);

    try {
      setCheck('appointment', 'pass', `#${targetId}`);
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
        recordCommunicationClientEvent(targetId, 'device_check_passed', { surface: 'dentist_web_checklist' }).catch(() => null);
      } catch (deviceError) {
        const reason = deviceError?.name || 'Permission/device unavailable';
        setCheck('devices', 'fail', `${reason}. ${deviceFixHint(reason)}`);
        recordCommunicationClientEvent(targetId, 'device_check_failed', { reason }).catch(() => null);
      }

      const session = await fetchAppointmentCommunicationsToken(targetId);
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
    if (open && modalAppointmentId) {
      runChecks(modalAppointmentId);
    }
  }, [open, modalAppointmentId]);

  if (!open) return null;

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
      >
      <div
        className="w-full max-w-lg overflow-hidden bg-surface border border-border/40 rounded-[1.5rem] shadow-2xl"
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-border/40">
          <div>
            <h2 className="text-lg font-semibold text-primary">Checklist sebelum panggilan</h2>
            <p className="text-sm text-muted">Appointment #{modalAppointmentId || '-'}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 transition-all duration-150 hover:scale-105 text-muted hover:bg-surface-elevated hover:text-primary" aria-label="Close checklist">
            <Icon name="X" size={18} />
          </button>
        </header>

        {error && (
          <div className="mx-5 mt-4 rounded-md px-3 py-2 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/50">
            {error}
          </div>
        )}

        <div className="px-5 py-4 space-y-2">
          {checks.map((check) => (
            <div key={check.id} className="flex items-center justify-between rounded-lg px-3 py-2 bg-surface/30 border border-border/40">
              <div>
                <p className="text-sm font-medium text-primary">{check.label}</p>
                {check.detail && <p className="text-xs text-muted">{check.detail}</p>}
              </div>
              <StatusIcon status={check.status} />
            </div>
          ))}
        </div>

        <div className="px-5 pb-4">
          <label className="flex items-start gap-3 rounded-xl p-3 bg-accent/5 border border-accent/20 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border text-accent focus:ring-accent"
            />
            <span className="text-xs text-secondary leading-relaxed">
              Saya mengonfirmasi bahwa pasien telah diberi tahu dan menyetujui bahwa sesi konsultasi video teledentistry ini dapat direkam untuk keperluan dokumentasi klinis/EMR (Kepatuhan HIPAA).
            </span>
          </label>
        </div>

        <footer className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border/40">
          <button
            onClick={() => runChecks(modalAppointmentId)}
            disabled={running}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm disabled:opacity-50 bg-surface-elevated border border-border/40 text-secondary hover:bg-surface/80"
          >
            <Icon name={running ? 'Loader2' : 'RefreshCw'} size={14} className={running ? 'animate-spin' : ''} />
            Retry
          </button>
          <button
            onClick={onJoin}
            disabled={!canJoin || running}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 bg-accent shadow-sm hover:scale-105 transition-transform active:scale-95"
          >
            <Icon name="Video" size={14} />
            Join
          </button>
        </footer>
      </div>
    </div>
    </ModalPortal>
  );
}

function StatusIcon({ status }) {
  if (status === 'pass') return <Icon name="CheckCircle2" size={18} className="text-green-500" />;
  if (status === 'fail') return <Icon name="XCircle" size={18} className="text-red-500" />;
  return <Icon name="Circle" size={18} className="text-muted" />;
}
