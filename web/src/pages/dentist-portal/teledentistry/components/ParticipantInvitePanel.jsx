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
    <section className="border-t border-primary/10 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-primary">Third-party participants</h3>
          <p className="text-xs text-muted">Guardian/interpreter access remains appointment-scoped.</p>
        </div>
        <Icon name="Users" size={18} className="text-muted" />
      </div>

      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
      {latestInvite && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 break-all">
          Invite created. Share link/token once: {latestInvite}
        </div>
      )}

      <form onSubmit={handleInvite} className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <select
            value={form.role}
            onChange={(event) => updateField('role', event.target.value)}
            className="rounded-lg border border-primary/20 bg-surface px-2 py-2 text-sm text-primary"
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role.value} value={role.value}>{role.label}</option>
            ))}
          </select>
          <input
            value={form.displayName}
            onChange={(event) => updateField('displayName', event.target.value)}
            placeholder="Name"
            className="rounded-lg border border-primary/20 bg-surface px-2 py-2 text-sm text-primary"
            required
          />
        </div>
        <input
          value={form.email}
          onChange={(event) => updateField('email', event.target.value)}
          type="email"
          placeholder="Email"
          className="w-full rounded-lg border border-primary/20 bg-surface px-2 py-2 text-sm text-primary"
        />
        <input
          value={form.phone}
          onChange={(event) => updateField('phone', event.target.value)}
          placeholder="Phone"
          className="w-full rounded-lg border border-primary/20 bg-surface px-2 py-2 text-sm text-primary"
        />
        <button
          type="submit"
          disabled={status === 'saving'}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Icon name={status === 'saving' ? 'Loader2' : 'Send'} size={14} className={status === 'saving' ? 'animate-spin' : ''} />
          Invite
        </button>
      </form>

      <div className="space-y-2">
        {participants.length === 0 ? (
          <p className="text-xs text-muted">No additional participants invited.</p>
        ) : participants.map((participant) => (
          <div key={participant.id} className="flex items-center justify-between rounded-lg border border-primary/10 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-primary">{participant.displayName}</p>
              <p className="text-xs text-muted capitalize">{participant.role} • {participant.status}</p>
            </div>
            <div className="flex items-center gap-1">
              {['invited', 'verified'].includes(participant.status) && (
                <button
                  onClick={() => handleResend(participant.id)}
                  disabled={status === 'saving'}
                  className="p-2 rounded-md text-accent hover:bg-accent/10 disabled:opacity-50"
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
                  className="p-2 rounded-md text-amber-600 hover:bg-amber-50 disabled:opacity-50"
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
                  className="p-2 rounded-md text-red-600 hover:bg-red-50 disabled:opacity-50"
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
                  className="p-2 rounded-md text-red-500 hover:bg-red-50 disabled:opacity-50"
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
