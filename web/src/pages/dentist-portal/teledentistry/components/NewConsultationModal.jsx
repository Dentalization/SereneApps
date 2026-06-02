import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../../../../components/AppIcon';
import { useLanguage } from '../../../../contexts/LanguageContext';

import { fetchAppointments } from '../../../../services/appointmentService';

const CONSULTATION_TYPES = [
  { value: 'general', label: 'General Consultation' },
  { value: 'follow_up', label: 'Follow-up Visit' },
  { value: 'emergency', label: 'Emergency Consultation' },
  { value: 'second_opinion', label: 'Second Opinion' },
];

const AVATAR_GRADIENTS = [
  ['#7C3AED', '#4f46e5'],
  ['#6d28d9', '#9333ea'],
  ['#4f46e5', '#0ea5e9'],
  ['#7c3aed', '#ec4899'],
  ['#2563eb', '#7c3aed'],
  ['#9333ea', '#db2777'],
  ['#0891b2', '#7c3aed'],
  ['#d97706', '#7c3aed'],
];

function getAvatarGradient(name = '') {
  const hash = [...String(name)].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const [from, to] = AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
  return { background: `linear-gradient(135deg, ${from}, ${to})` };
}

function getInitials(name = '') {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';
}

const NewConsultationModal = ({ onClose, onSubmit }) => {
  const { t } = useLanguage();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [consultationType, setConsultationType] = useState('general');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const searchInputRef = useRef(null);

  // Focus search on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Fetch Virtual Appointments
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const response = await fetchAppointments({ view: 'dentist', status: 'confirmed,scheduled' });
        if (mounted) {
          const virtualAppts = (response.appointments || []).filter(a => a.type === 'virtual' || a.isVirtual);
          setAppointments(virtualAppts);
        }
      } catch (error) {
        console.error('Failed to load appointments for modal:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // Escape key to close
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Filter appointments
  const filteredAppointments = appointments
    .filter((appt) => appt.patient)
    .filter((appt) => {
      if (!searchQuery.trim()) return true;
      const name = (appt.patient.name || '').toLowerCase();
      const email = (appt.patient.email || '').toLowerCase();
      const q = searchQuery.toLowerCase();
      return name.includes(q) || email.includes(q);
    })
    .slice(0, 5);

  const handleSubmitClick = async () => {
    if (!selectedAppointment || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit?.({
        appointmentId: selectedAppointment.id,
        patient: selectedAppointment.patient,
        consultationType,
        notes: notes.trim(),
      });
    } catch (error) {
      console.error('Failed to create consultation:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-md"
    >
      <div
        className="mx-4 w-full max-w-lg overflow-hidden bg-surface border border-border/40 rounded-[1.5rem] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
          <div>
            <h3 className="text-lg font-semibold text-primary">{t('dentistTeledentistry.newConsultation.title')}</h3>
            <p className="mt-0.5 text-xs text-muted">{t('dentistTeledentistry.newConsultation.subtitle')}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 transition-all duration-150 hover:scale-105 text-muted hover:bg-surface-elevated hover:text-primary"
            aria-label="Close"
          >
            <Icon name="X" size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] space-y-5 overflow-y-auto px-6 py-5 scrollbar-minimal">
          {/* Patient Search */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-secondary">
              Select Patient
            </label>
            <div className="relative">
              <Icon
                name="Search"
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedAppointment(null);
                }}
                placeholder="Search by name or email..."
                className="w-full rounded-xl py-2.5 pl-9 pr-3 text-sm focus:outline-none bg-surface-elevated border border-border/40 text-zinc-800 placeholder-zinc-500 focus:ring-1 focus:ring-accent/50"
              />
            </div>

            {/* Patient Results */}
            {!selectedAppointment && searchQuery.trim() && (
              <div className="mt-2 overflow-hidden rounded-xl bg-surface border border-border/40">
                {loading ? (
                  <div className="px-4 py-3 text-center text-xs text-muted">Loading...</div>
                ) : filteredAppointments.length === 0 ? (
                  <div className="px-4 py-3 text-center text-xs text-muted">No matching upcoming virtual appointments found</div>
                ) : (
                  filteredAppointments.map((appt) => (
                    <button
                      key={appt.id}
                      onClick={() => {
                        setSelectedAppointment(appt);
                        setSearchQuery(appt.patient.name || '');
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors border-b border-border/20 hover:bg-surface-elevated"
                    >
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white" style={getAvatarGradient(appt.patient.name || '?')}>
                        <span>
                          {getInitials(appt.patient.name || '?')}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-primary">
                          {appt.patient.name} <span className="font-normal text-muted">({new Date(appt.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
                        </p>
                        <p className="truncate text-xs text-muted">
                          #{appt.id} • {appt.patient.email || 'No email'}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Selected Patient Chip */}
            {selectedAppointment && (
              <div className="mt-2 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 bg-accent/10 border border-accent/20">
                <span className="text-xs font-medium text-accent">{selectedAppointment.patient.name}</span>
                <span className="block rounded-full px-1.5 text-[10px] text-accent/70 bg-accent/10 border border-accent/20">
                  #{selectedAppointment.id}
                </span>
                <button
                  onClick={() => {
                    setSelectedAppointment(null);
                    setSearchQuery('');
                  }}
                  className="ml-1 text-accent/70 hover:text-accent"
                  aria-label="Remove patient"
                >
                  <Icon name="X" size={12} />
                </button>
              </div>
            )}
          </div>

          {/* Consultation Type */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-secondary">
              Consultation Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CONSULTATION_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setConsultationType(type.value)}
                  className={`rounded-xl px-3 py-2.5 text-xs font-medium transition-all duration-200 border ${consultationType === type.value
                    ? 'bg-accent/10 border-accent/40 text-accent'
                    : 'bg-surface-elevated border-border/40 text-secondary hover:bg-surface/80'
                    }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-secondary">
              Notes <span className="font-normal text-muted">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any relevant notes for this consultation..."
              rows={3}
              className="w-full resize-none rounded-xl px-3 py-2.5 text-sm focus:outline-none bg-surface-elevated border border-border/40 text-zinc-800 placeholder-zinc-500 focus:ring-1 focus:ring-accent/50"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border/40 bg-surface/90 backdrop-blur-sm">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 bg-surface-elevated border border-border/40 text-secondary hover:bg-surface/80"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmitClick}
            disabled={!selectedAppointment || submitting}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 bg-accent shadow-sm hover:scale-105 active:scale-95"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Icon name="Video" size={14} />
            )}
            <span>{submitting ? 'Creating...' : 'Start Consultation'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default NewConsultationModal;
