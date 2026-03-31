import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../../../../components/AppIcon';

const CONSULTATION_TYPES = [
  { value: 'general', label: 'General Consultation' },
  { value: 'follow_up', label: 'Follow-up Visit' },
  { value: 'emergency', label: 'Emergency Consultation' },
  { value: 'second_opinion', label: 'Second Opinion' },
];

const NewConsultationModal = ({ onClose, onSubmit, conversations = [] }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [consultationType, setConsultationType] = useState('general');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const searchInputRef = useRef(null);

  // Focus search on mount
  useEffect(() => {
    searchInputRef.current?.focus();
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

  // Filter patients from conversations
  const filteredPatients = conversations
    .filter((conv) => conv.patient)
    .filter((conv) => {
      if (!searchQuery.trim()) return true;
      const name = (conv.patient.name || '').toLowerCase();
      const email = (conv.patient.email || '').toLowerCase();
      const q = searchQuery.toLowerCase();
      return name.includes(q) || email.includes(q);
    })
    .slice(0, 5);

  const handleSubmitClick = async () => {
    if (!selectedPatient || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit?.({
        patient: selectedPatient,
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
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-elevated rounded-3xl shadow-2xl w-full max-w-lg mx-4 theme-transition border border-primary/10 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-primary/10 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-primary theme-transition">New Consultation</h3>
            <p className="text-xs text-muted theme-transition mt-0.5">Start a virtual consultation with a patient</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted hover:text-primary hover:bg-surface rounded-lg theme-transition"
            aria-label="Close"
          >
            <Icon name="X" size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Patient Search */}
          <div>
            <label className="block text-xs font-semibold text-primary mb-2 theme-transition">
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
                  setSelectedPatient(null);
                }}
                placeholder="Search by name or email..."
                className="w-full pl-9 pr-3 py-2.5 border border-primary/10 rounded-xl bg-surface text-primary text-sm focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent theme-transition"
              />
            </div>

            {/* Patient Results */}
            {!selectedPatient && searchQuery.trim() && (
              <div className="mt-2 border border-primary/10 rounded-xl overflow-hidden bg-surface theme-transition">
                {filteredPatients.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-muted text-center">No patients found</div>
                ) : (
                  filteredPatients.map((conv) => (
                    <button
                      key={conv.appointmentId}
                      onClick={() => {
                        setSelectedPatient(conv.patient);
                        setSearchQuery(conv.patient.name || '');
                      }}
                      className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-accent/5 transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-accent">
                          {(conv.patient.name || '?')
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-primary truncate theme-transition">
                          {conv.patient.name}
                        </p>
                        <p className="text-xs text-muted truncate theme-transition">
                          {conv.patient.email || 'No email'}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Selected Patient Chip */}
            {selectedPatient && (
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20">
                <span className="text-xs font-medium text-accent">{selectedPatient.name}</span>
                <button
                  onClick={() => {
                    setSelectedPatient(null);
                    setSearchQuery('');
                  }}
                  className="text-accent/60 hover:text-accent"
                  aria-label="Remove patient"
                >
                  <Icon name="X" size={12} />
                </button>
              </div>
            )}
          </div>

          {/* Consultation Type */}
          <div>
            <label className="block text-xs font-semibold text-primary mb-2 theme-transition">
              Consultation Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CONSULTATION_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setConsultationType(type.value)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 border ${consultationType === type.value
                      ? 'bg-accent/10 border-accent/30 text-accent'
                      : 'bg-surface border-primary/10 text-primary hover:border-accent/20 theme-transition'
                    }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-primary mb-2 theme-transition">
              Notes <span className="font-normal text-muted">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any relevant notes for this consultation..."
              rows={3}
              className="w-full px-3 py-2.5 border border-primary/10 rounded-xl bg-surface text-primary text-sm resize-none focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent theme-transition"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-primary/10 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-muted hover:text-primary hover:bg-surface transition-all duration-200 theme-transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmitClick}
            disabled={!selectedPatient || submitting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
