import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../../../../components/AppIcon';

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
        const response = await fetchAppointments({ view: 'dentist', status: 'confirmed' });
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
      className="fixed inset-0 z-[9998] flex items-center justify-center"
      style={{
        background: 'rgba(15,13,26,0.75)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div
        className="mx-4 w-full max-w-lg overflow-hidden"
        style={{
          background: 'rgba(26,21,40,0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '1.5rem',
          boxShadow: '0 25px 50px rgba(0,0,0,0.7)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--td-text-main)' }}>New Consultation</h3>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--td-text-muted)' }}>Start a virtual consultation with a patient</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 transition-all duration-150 hover:scale-105"
            style={{ color: 'var(--td-text-muted)', background: 'rgba(255,255,255,0.04)' }}
            aria-label="Close"
          >
            <Icon name="X" size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] space-y-5 overflow-y-auto px-6 py-5 scrollbar-minimal">
          {/* Patient Search */}
          <div>
            <label className="mb-2 block text-xs font-semibold" style={{ color: 'var(--td-text-sub)' }}>
              Select Patient
            </label>
            <div className="relative">
              <Icon
                name="Search"
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--td-text-muted)' }}
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
                className="w-full rounded-xl py-2.5 pl-9 pr-3 text-sm focus:outline-none"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'var(--td-text-main)',
                }}
              />
            </div>

            {/* Patient Results */}
            {!selectedAppointment && searchQuery.trim() && (
              <div className="mt-2 overflow-hidden rounded-xl" style={{ background: 'rgba(15,13,26,0.72)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {loading ? (
                  <div className="px-4 py-3 text-center text-xs" style={{ color: 'var(--td-text-muted)' }}>Loading...</div>
                ) : filteredAppointments.length === 0 ? (
                  <div className="px-4 py-3 text-center text-xs" style={{ color: 'var(--td-text-muted)' }}>No matching upcoming virtual appointments found</div>
                ) : (
                  filteredAppointments.map((appt) => (
                    <button
                      key={appt.id}
                      onClick={() => {
                        setSelectedAppointment(appt);
                        setSearchQuery(appt.patient.name || '');
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    >
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white" style={getAvatarGradient(appt.patient.name || '?')}>
                        <span>
                          {getInitials(appt.patient.name || '?')}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium" style={{ color: 'var(--td-text-main)' }}>
                          {appt.patient.name} <span className="font-normal" style={{ color: 'var(--td-text-muted)' }}>({new Date(appt.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})})</span>
                        </p>
                        <p className="truncate text-xs" style={{ color: 'var(--td-text-muted)' }}>
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
              <div className="mt-2 inline-flex items-center gap-2 rounded-lg px-3 py-1.5" style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.22)' }}>
                <span className="text-xs font-medium" style={{ color: 'var(--td-accent)' }}>{selectedAppointment.patient.name}</span>
                <span className="block rounded-full px-1.5 text-[10px]" style={{ color: 'rgba(167,139,250,0.75)', background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.22)' }}>
                  #{selectedAppointment.id}
                </span>
                <button
                  onClick={() => {
                    setSelectedAppointment(null);
                    setSearchQuery('');
                  }}
                  className="ml-1"
                  style={{ color: 'rgba(167,139,250,0.75)' }}
                  aria-label="Remove patient"
                >
                  <Icon name="X" size={12} />
                </button>
              </div>
            )}
          </div>

          {/* Consultation Type */}
          <div>
            <label className="mb-2 block text-xs font-semibold" style={{ color: 'var(--td-text-sub)' }}>
              Consultation Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CONSULTATION_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setConsultationType(type.value)}
                  className="rounded-xl px-3 py-2.5 text-xs font-medium transition-all duration-200"
                  style={consultationType === type.value ? {
                    background: 'rgba(124,58,237,0.14)',
                    border: '1px solid rgba(124,58,237,0.35)',
                    color: 'var(--td-accent)',
                  } : {
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'var(--td-text-sub)',
                  }}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-2 block text-xs font-semibold" style={{ color: 'var(--td-text-sub)' }}>
              Notes <span className="font-normal" style={{ color: 'var(--td-text-muted)' }}>(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any relevant notes for this consultation..."
              rows={3}
              className="w-full resize-none rounded-xl px-3 py-2.5 text-sm focus:outline-none"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'var(--td-text-main)',
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--td-text-sub)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmitClick}
            disabled={!selectedAppointment || submitting}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', boxShadow: '0 4px 12px rgba(124,58,237,0.35)' }}
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
