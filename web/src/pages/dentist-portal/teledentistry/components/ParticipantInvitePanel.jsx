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
    <section className="space-y-4 p-3 bg-surface/30">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-primary">Third-party participants</h3>
          <p className="text-xs text-muted">Guardian/interpreter access remains appointment-scoped.</p>
        </div>
        <Icon name="Users" size={18} className="text-muted" />
      </div>

      {error && <div className="rounded-md px-3 py-2 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/50">{error}</div>}
      {latestInvite && (
        <div className="break-all rounded-md px-3 py-2 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
          Invite created. Share link/token once: {latestInvite}
        </div>
      )}

      <form onSubmit={handleInvite} className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <select
            value={form.role}
            onChange={(event) => updateField('role', event.target.value)}
            className="rounded-lg px-2 py-2 text-sm bg-surface-elevated border border-border/40 text-primary focus:outline-none focus:ring-1 focus:ring-accent/50"
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role.value} value={role.value}>{role.label}</option>
            ))}
          </select>
          <input
            value={form.displayName}
            onChange={(event) => updateField('displayName', event.target.value)}
            placeholder="Name"
            className="rounded-lg px-2 py-2 text-sm bg-surface-elevated border border-border/40 text-primary placeholder-muted focus:outline-none focus:ring-1 focus:ring-accent/50"
            required
          />
        </div>
        <input
          value={form.email}
          onChange={(event) => updateField('email', event.target.value)}
          type="email"
          placeholder="Email"
          className="w-full rounded-lg px-2 py-2 text-sm bg-surface-elevated border border-border/40 text-primary placeholder-muted focus:outline-none focus:ring-1 focus:ring-accent/50"
        />
        <input
          value={form.phone}
          onChange={(event) => updateField('phone', event.target.value)}
          placeholder="Phone"
          className="w-full rounded-lg px-2 py-2 text-sm bg-surface-elevated border border-border/40 text-primary placeholder-muted focus:outline-none focus:ring-1 focus:ring-accent/50"
        />
        <button
          type="submit"
          disabled={status === 'saving'}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white bg-accent shadow-sm disabled:opacity-50 transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <Icon name={status === 'saving' ? 'Loader2' : 'Send'} size={14} className={status === 'saving' ? 'animate-spin' : ''} />
          Invite
        </button>
      </form>

      <div className="space-y-2">
        {participants.length === 0 ? (
          <p className="text-xs text-muted">No additional participants invited.</p>
        ) : participants.map((participant) => (
          <div key={participant.id} className="flex items-center justify-between rounded-lg px-3 py-2 bg-surface/30 border border-border/40">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-primary">{participant.displayName}</p>
              <p className="text-xs capitalize text-muted">{participant.role} • {participant.status}</p>
            </div>
            <div className="flex items-center gap-1">
              {['invited', 'verified'].includes(participant.status) && (
                <button
                  onClick={() => handleResend(participant.id)}
                  disabled={status === 'saving'}
                  className="rounded-md p-2 disabled:opacity-50 text-accent bg-accent/10 hover:bg-accent/20 transition-colors"
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
                  className="rounded-md p-2 disabled:opacity-50 text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
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
                  className="rounded-md p-2 disabled:opacity-50 text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-colors"
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
                  className="rounded-md p-2 disabled:opacity-50 text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-colors"
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
