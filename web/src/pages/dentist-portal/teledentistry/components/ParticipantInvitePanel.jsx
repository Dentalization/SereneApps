import React, { useEffect, useState } from 'react';
import Icon from '../../../../components/AppIcon';
import {
  kickCommunicationParticipant,
  inviteCommunicationParticipant,
  listCommunicationParticipants,
  regenerateCommunicationParticipantAccess,
  resendCommunicationParticipantInvite,
  revokeCommunicationParticipant
} from '../../../../services/chatService';

const ROLE_OPTIONS = [
  { value: 'guardian', label: 'Guardian' },
  { value: 'interpreter', label: 'Interpreter' }
];

export default function ParticipantInvitePanel({ appointmentId }) {
  const [participants, setParticipants] = useState([]);
  const [form, setForm] = useState({ role: 'guardian', displayName: '', email: '', phone: '' });
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [latestInvite, setLatestInvite] = useState(null);

  const loadParticipants = () => {
    if (!appointmentId) return;
    listCommunicationParticipants(appointmentId)
      .then(setParticipants)
      .catch(() => setParticipants([]));
  };

  useEffect(() => {
    loadParticipants();
  }, [appointmentId]);

  if (!appointmentId) return null;

  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleInvite = async (event) => {
    event.preventDefault();
    setStatus('saving');
    setError('');
    setLatestInvite(null);
    try {
      const result = await inviteCommunicationParticipant(appointmentId, form);
      setLatestInvite(result.inviteUrl || result.inviteToken);
      setForm({ role: 'guardian', displayName: '', email: '', phone: '' });
      loadParticipants();
    } catch (err) {
      setError(err?.response?.data?.error?.code || 'Gagal membuat undangan.');
    } finally {
      setStatus('idle');
    }
  };

  const handleRevoke = async (participantId) => {
    if (!window.confirm('Revoke participant invite?')) return;
    setStatus('saving');
    try {
      await revokeCommunicationParticipant(appointmentId, participantId);
      loadParticipants();
    } catch (err) {
      setError(err?.response?.data?.error?.code || 'Gagal revoke undangan.');
    } finally {
      setStatus('idle');
    }
  };

  const applyInviteResult = (result) => {
    setLatestInvite(result.inviteUrl || result.inviteToken || null);
    loadParticipants();
  };

  const handleResend = async (participantId) => {
    setStatus('saving');
    setError('');
    try {
      applyInviteResult(await resendCommunicationParticipantInvite(appointmentId, participantId));
    } catch (err) {
      setError(err?.response?.data?.error?.code || 'Gagal mengirim ulang undangan.');
    } finally {
      setStatus('idle');
    }
  };

  const handleRegenerate = async (participantId) => {
    if (!window.confirm('Regenerate participant access? Existing invite/session access will be invalidated.')) return;
    setStatus('saving');
    setError('');
    try {
      applyInviteResult(await regenerateCommunicationParticipantAccess(appointmentId, participantId));
    } catch (err) {
      setError(err?.response?.data?.error?.code || 'Gagal regenerate akses.');
    } finally {
      setStatus('idle');
    }
  };

  const handleKick = async (participantId) => {
    if (!window.confirm('Kick participant from the current consultation?')) return;
    setStatus('saving');
    setError('');
    try {
      await kickCommunicationParticipant(appointmentId, participantId);
      loadParticipants();
    } catch (err) {
      setError(err?.response?.data?.error?.code || 'Gagal mengeluarkan participant.');
    } finally {
      setStatus('idle');
    }
  };

  return (
    <section className="space-y-4 p-3" style={{ background: 'rgba(255,255,255,0.025)' }}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--td-text-main)' }}>Third-party participants</h3>
          <p className="text-xs" style={{ color: 'var(--td-text-muted)' }}>Guardian/interpreter access remains appointment-scoped.</p>
        </div>
        <Icon name="Users" size={18} style={{ color: 'var(--td-text-muted)' }} />
      </div>

      {error && <div className="rounded-md px-3 py-2 text-xs" style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.22)' }}>{error}</div>}
      {latestInvite && (
        <div className="break-all rounded-md px-3 py-2 text-xs" style={{ background: 'rgba(34,197,94,0.1)', color: '#86efac', border: '1px solid rgba(34,197,94,0.2)' }}>
          Invite created. Share link/token once: {latestInvite}
        </div>
      )}

      <form onSubmit={handleInvite} className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <select
            value={form.role}
            onChange={(event) => updateField('role', event.target.value)}
            className="rounded-lg px-2 py-2 text-sm"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--td-text-main)' }}
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role.value} value={role.value}>{role.label}</option>
            ))}
          </select>
          <input
            value={form.displayName}
            onChange={(event) => updateField('displayName', event.target.value)}
            placeholder="Name"
            className="rounded-lg px-2 py-2 text-sm"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--td-text-main)' }}
            required
          />
        </div>
        <input
          value={form.email}
          onChange={(event) => updateField('email', event.target.value)}
          type="email"
          placeholder="Email"
          className="w-full rounded-lg px-2 py-2 text-sm"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--td-text-main)' }}
        />
        <input
          value={form.phone}
          onChange={(event) => updateField('phone', event.target.value)}
          placeholder="Phone"
          className="w-full rounded-lg px-2 py-2 text-sm"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--td-text-main)' }}
        />
        <button
          type="submit"
          disabled={status === 'saving'}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', boxShadow: '0 4px 12px rgba(124,58,237,0.28)' }}
        >
          <Icon name={status === 'saving' ? 'Loader2' : 'Send'} size={14} className={status === 'saving' ? 'animate-spin' : ''} />
          Invite
        </button>
      </form>

      <div className="space-y-2">
        {participants.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--td-text-muted)' }}>No additional participants invited.</p>
        ) : participants.map((participant) => (
          <div key={participant.id} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium" style={{ color: 'var(--td-text-main)' }}>{participant.displayName}</p>
              <p className="text-xs capitalize" style={{ color: 'var(--td-text-muted)' }}>{participant.role} • {participant.status}</p>
            </div>
            <div className="flex items-center gap-1">
              {['invited', 'verified'].includes(participant.status) && (
                <button
                  onClick={() => handleResend(participant.id)}
                  disabled={status === 'saving'}
                  className="rounded-md p-2 disabled:opacity-50"
                  style={{ color: 'var(--td-accent)', background: 'rgba(124,58,237,0.08)' }}
                  aria-label="Resend invite"
                  title="Resend invite"
                >
                  <Icon name="Send" size={14} />
                </button>
              )}
              {['invited', 'verified', 'joined', 'expired'].includes(participant.status) && (
                <button
                  onClick={() => handleRegenerate(participant.id)}
                  disabled={status === 'saving'}
                  className="rounded-md p-2 disabled:opacity-50"
                  style={{ color: '#fbbf24', background: 'rgba(245,158,11,0.08)' }}
                  aria-label="Regenerate access"
                  title="Regenerate access"
                >
                  <Icon name="KeyRound" size={14} />
                </button>
              )}
              {['verified', 'joined'].includes(participant.status) && (
                <button
                  onClick={() => handleKick(participant.id)}
                  disabled={status === 'saving'}
                  className="rounded-md p-2 disabled:opacity-50"
                  style={{ color: '#f87171', background: 'rgba(239,68,68,0.08)' }}
                  aria-label="Kick participant"
                  title="Kick participant"
                >
                  <Icon name="LogOut" size={14} />
                </button>
              )}
              {['invited', 'verified'].includes(participant.status) && (
                <button
                  onClick={() => handleRevoke(participant.id)}
                  disabled={status === 'saving'}
                  className="rounded-md p-2 disabled:opacity-50"
                  style={{ color: '#f87171', background: 'rgba(239,68,68,0.08)' }}
                  aria-label="Revoke participant"
                  title="Revoke participant"
                >
                  <Icon name="X" size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
