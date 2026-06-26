import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../../../../components/AppIcon';
import AdvancedOdontogram from './AdvancedOdontogram';

const VISIT_TYPES = [
  { id: 'in-clinic', label: 'In-Clinic Visit' },
  { id: 'teledentistry', label: 'Teledentistry' },
];

const VITAL_FIELDS = [
  { field: 'bloodPressure', label: 'Blood Pressure', unit: 'mmHg', placeholder: '120/80' },
  { field: 'heartRate', label: 'Heart Rate', unit: 'bpm', placeholder: '80' },
  { field: 'temperature', label: 'Temperature', unit: '°C', placeholder: '36.8' },
  { field: 'spo2', label: 'SpO2', unit: '%', placeholder: '98' },
];

const normalizeDateInput = (value) => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

const normalizeGender = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  if (['female', 'f', 'perempuan', 'wanita'].includes(normalized)) return 'Female';
  if (['male', 'm', 'laki-laki', 'laki laki', 'pria'].includes(normalized)) return 'Male';
  if (['other', 'non-binary', 'nonbinary'].includes(normalized)) return 'Other';
  return value;
};

const stripVitalUnit = (field, value) => {
  const unit = VITAL_FIELDS.find((item) => item.field === field)?.unit;
  if (!unit || !value) return value || '';
  return String(value)
    .replace(new RegExp(`\\s*${unit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i'), '')
    .trim();
};

const sanitizeVitalInput = (field, value) => {
  const raw = stripVitalUnit(field, value);
  if (field === 'bloodPressure') {
    return raw
      .replace(/[^\d/]/g, '')
      .replace(/\/+/g, '/')
      .replace(/^\/+/, '')
      .split('/')
      .slice(0, 2)
      .join('/');
  }
  if (field === 'temperature') {
    const normalized = raw.replace(',', '.').replace(/[^\d.]/g, '');
    const [whole, ...decimalParts] = normalized.split('.');
    return decimalParts.length ? `${whole}.${decimalParts.join('')}` : whole;
  }
  return raw.replace(/\D/g, '');
};

const buildInitialForm = (prefilledPatient, visitType) => ({
  patientName: '',
  nik: '',
  dob: '',
  gender: '',
  rmNumber: '',
  allergies: '',
  systemic: '',
  chiefComplaint: '',
  medicalHistory: '',
  vitals: {
    bloodPressure: sanitizeVitalInput('bloodPressure', prefilledPatient?.vitals?.bloodPressure),
    heartRate: sanitizeVitalInput('heartRate', prefilledPatient?.vitals?.heartRate),
    temperature: sanitizeVitalInput('temperature', prefilledPatient?.vitals?.temperature),
    spo2: sanitizeVitalInput('spo2', prefilledPatient?.vitals?.spo2),
  },
  diagnosis: '',
  icd10: '',
  plan: '',
  procedures: '',
  icd9: '',
  medications: '',
  kie: '',
  odontogramMarks: prefilledPatient?.odontogramMarks || [],
  visitType,
  consentFile: null,
  ...(prefilledPatient
    ? {
        patientName: prefilledPatient.name || '',
        nik: prefilledPatient.nik || '',
        dob: normalizeDateInput(prefilledPatient.dob),
        gender: normalizeGender(prefilledPatient.gender),
        rmNumber: prefilledPatient.rmNumber || '',
        allergies: (prefilledPatient.medicalDetails?.allergies || prefilledPatient.alerts?.allergies || []).join('\n'),
        systemic: (prefilledPatient.medicalDetails?.chronicConditions || prefilledPatient.alerts?.systemic || []).join('\n'),
        medicalHistory: prefilledPatient.medicalDetails?.notes || '',
        medications: (prefilledPatient.medicalDetails?.medications || []).join('\n'),
      }
    : {}),
});

const AddNewEMR = ({ onSubmit, prefilledPatient = null, defaultVisitType = 'in-clinic', isSubmitting = false }) => {
  const initialState = useMemo(
    () => buildInitialForm(prefilledPatient, defaultVisitType),
    [prefilledPatient, defaultVisitType]
  );
  const [form, setForm] = useState(initialState);
  const [submitError, setSubmitError] = useState('');
  const [isSubmittingLocal, setIsSubmittingLocal] = useState(false);
  const identityLocked = Boolean(prefilledPatient);
  const saving = isSubmitting || isSubmittingLocal;
  const identityInputClass = (base, locked = identityLocked) =>
    `${base} ${locked ? 'bg-muted/40 cursor-not-allowed' : ''}`;

  useEffect(() => {
    setForm(buildInitialForm(prefilledPatient, defaultVisitType));
  }, [prefilledPatient, defaultVisitType]);

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleVitalChange = (field, value) => {
    setSubmitError('');
    setForm((prev) => ({
      ...prev,
      vitals: {
        ...prev.vitals,
        [field]: sanitizeVitalInput(field, value),
      },
    }));
  };

  const handleConsentUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    handleChange('consentFile', file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setIsSubmittingLocal(true);
    try {
      if (onSubmit) {
        await onSubmit(form);
      }
      setForm(buildInitialForm(prefilledPatient, defaultVisitType));
    } catch (error) {
      const data = error?.response?.data;
      const message =
        (typeof data?.error === 'string' && data.error) ||
        data?.error?.message ||
        data?.error?.detail ||
        data?.detail ||
        data?.message ||
        error?.message ||
        'Unable to save EMR. Please try again.';
      setSubmitError(message);
    } finally {
      setIsSubmittingLocal(false);
    }
  };

  const consentSummary = useMemo(() => {
    if (form.visitType === 'in-clinic') {
      if (form.consentFile) {
        return `${form.consentFile.name} • ${(form.consentFile.size / 1024).toFixed(1)} KB`;
      }
      return 'Optional for saving this EMR. Attach consent when the visit includes a procedure that requires it.';
    }
    return 'Consent requirement will be saved in this EMR. Mobile signing flow is not available yet.';
  }, [form.visitType, form.consentFile]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-3xl border border-border/40 bg-surface p-5 shadow-sm space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-secondary">Patient Identity</p>
          <h2 className="text-xl font-semibold text-primary">Administrative Data</h2>
        </div>
        {prefilledPatient && (
          <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm text-primary">
            Patient identity and medical background are synced from the patient profile. Update only the clinical sections below.
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-secondary">Patient Name</label>
            <input
              value={form.patientName}
              onChange={(e) => handleChange('patientName', e.target.value)}
              readOnly={identityLocked}
              className={identityInputClass('mt-1 w-full rounded-xl border border-border/40 bg-background/60 px-3 py-2 text-sm')}
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-secondary">NIK <span className="tracking-normal normal-case">(optional)</span></label>
            <input
              value={form.nik}
              onChange={(e) => handleChange('nik', e.target.value)}
              placeholder="Optional for in-clinic identity verification"
              className={identityInputClass('mt-1 w-full rounded-xl border border-border/40 bg-background/60 px-3 py-2 text-sm', false)}
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-secondary">Date of Birth</label>
            <input
              type="date"
              value={form.dob}
              onChange={(e) => handleChange('dob', e.target.value)}
              readOnly={identityLocked}
              className={identityInputClass('mt-1 w-full rounded-xl border border-border/40 bg-background/60 px-3 py-2 text-sm')}
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-secondary">Gender</label>
            <select
              value={form.gender}
              onChange={(e) => handleChange('gender', e.target.value)}
              className={identityInputClass('mt-1 w-full rounded-xl border border-border/40 bg-background/60 px-3 py-2 text-sm', false)}
            >
              <option value="">Select</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-secondary">RM Number</label>
            <input
              value={form.rmNumber}
              onChange={(e) => handleChange('rmNumber', e.target.value)}
              readOnly={identityLocked}
              className={identityInputClass('mt-1 w-full rounded-xl border border-border/40 bg-background/60 px-3 py-2 text-sm')}
            />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-secondary">Allergies</label>
            <textarea
              value={form.allergies}
              onChange={(e) => handleChange('allergies', e.target.value)}
              className="mt-1 w-full rounded-2xl border border-border/40 bg-background/60 px-3 py-2 text-sm min-h-[80px]"
              placeholder="e.g., Amoxicillin"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-secondary">Systemic Conditions</label>
            <textarea
              value={form.systemic}
              onChange={(e) => handleChange('systemic', e.target.value)}
              className="mt-1 w-full rounded-2xl border border-border/40 bg-background/60 px-3 py-2 text-sm min-h-[80px]"
              placeholder="e.g., Diabetes Mellitus"
            />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border/40 bg-surface p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-primary">Subjective & Objective</h3>
          <span className="text-xs uppercase tracking-[0.3em] text-secondary">SOAP</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-secondary">Chief Complaint</label>
            <textarea
              value={form.chiefComplaint}
              onChange={(e) => handleChange('chiefComplaint', e.target.value)}
              className="mt-1 w-full rounded-2xl border border-border/40 bg-background/60 px-3 py-2 text-sm min-h-[80px]"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-secondary">Medical History</label>
            <textarea
              value={form.medicalHistory}
              onChange={(e) => handleChange('medicalHistory', e.target.value)}
              className="mt-1 w-full rounded-2xl border border-border/40 bg-background/60 px-3 py-2 text-sm min-h-[80px]"
            />
          </div>
        </div>
        <div className="rounded-2xl border border-primary/15 bg-background/50 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-secondary">Vital Signs</p>
          <div className="grid gap-4 md:grid-cols-4 mt-3 text-sm">
            {VITAL_FIELDS.map(({ field, label, unit, placeholder }) => (
              <div key={field}>
                <label className="text-secondary/70">{label}</label>
                <div className="relative mt-1">
                  <input
                    value={form.vitals[field]}
                    onChange={(e) => handleVitalChange(field, e.target.value)}
                    inputMode={field === 'bloodPressure' ? 'numeric' : 'decimal'}
                    pattern={field === 'bloodPressure' ? '[0-9/]*' : '[0-9.]*'}
                    placeholder={placeholder}
                    className="w-full rounded-xl border border-border/40 bg-background/60 py-2 pl-3 pr-14 text-sm"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-secondary/70">
                    {unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border/40 bg-surface p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-primary">Assessment & Plan</h3>
          <span className="text-xs uppercase tracking-[0.3em] text-secondary">A / P</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-secondary">Working Diagnosis</label>
            <textarea
              value={form.diagnosis}
              onChange={(e) => handleChange('diagnosis', e.target.value)}
              className="mt-1 w-full rounded-2xl border border-border/40 bg-background/60 px-3 py-2 text-sm min-h-[80px]"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-secondary">ICD-10 Code</label>
            <input
              value={form.icd10}
              onChange={(e) => handleChange('icd10', e.target.value)}
              className="mt-1 w-full rounded-xl border border-border/40 bg-background/60 px-3 py-2 text-sm"
              placeholder="e.g., K04.1"
            />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-secondary">Treatment Plan</label>
            <textarea
              value={form.plan}
              onChange={(e) => handleChange('plan', e.target.value)}
              className="mt-1 w-full rounded-2xl border border-border/40 bg-background/60 px-3 py-2 text-sm min-h-[80px]"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-secondary">Procedure & ICD-9-CM</label>
            <textarea
              value={form.procedures}
              onChange={(e) => handleChange('procedures', e.target.value)}
              className="mt-1 w-full rounded-2xl border border-border/40 bg-background/60 px-3 py-2 text-sm min-h-[80px]"
              placeholder="ICD-9-CM codes & procedure notes"
            />
            <input
              value={form.icd9}
              onChange={(e) => handleChange('icd9', e.target.value)}
              className="mt-2 w-full rounded-xl border border-border/40 bg-background/60 px-3 py-2 text-sm"
              placeholder="Default ICD-9-CM code (optional)"
            />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-secondary">Medications</label>
            <textarea
              value={form.medications}
              onChange={(e) => handleChange('medications', e.target.value)}
              className="mt-1 w-full rounded-2xl border border-border/40 bg-background/60 px-3 py-2 text-sm min-h-[80px]"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-secondary">KIE Notes</label>
            <textarea
              value={form.kie}
              onChange={(e) => handleChange('kie', e.target.value)}
              className="mt-1 w-full rounded-2xl border border-border/40 bg-background/60 px-3 py-2 text-sm min-h-[80px]"
            />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border/40 bg-surface p-5 shadow-sm space-y-4">
        <AdvancedOdontogram
          value={form.odontogramMarks}
          onChange={(marks) =>
            setForm((prev) => ({
              ...prev,
              odontogramMarks: marks,
            }))
          }
        />
      </section>

      <section className="rounded-3xl border border-border/40 bg-surface p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">Legal & Documents</p>
            <h3 className="text-lg font-semibold text-primary">Informed Consent</h3>
          </div>
          <div className="flex gap-2 text-sm">
            {VISIT_TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => handleChange('visitType', type.id)}
                className={`rounded-xl border px-3 py-1.5 ${
                  form.visitType === type.id ? 'border-accent text-primary' : 'border-border/40 text-secondary'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {form.visitType === 'in-clinic' ? (
          <div className="rounded-2xl border border-dashed border-border/40 bg-background/60 p-4 flex flex-col gap-3">
            <label className="text-sm font-semibold text-primary">Upload Clinic Consent <span className="font-normal text-secondary">(optional)</span></label>
            <p className="text-xs text-secondary">
              Each clinic can attach its own signed consent template. You can save this EMR without a consent file, then attach consent later for procedures that require it.
            </p>
            <label className="inline-flex items-center gap-2 rounded-xl border border-border/40 px-4 py-2 text-sm font-medium text-primary cursor-pointer hover:border-accent">
              <Icon name="UploadCloud" size={16} />
              {form.consentFile ? 'Replace File' : 'Upload File'}
              <input type="file" className="hidden" onChange={handleConsentUpload} accept=".pdf,.jpg,.png" />
            </label>
            <p className="text-xs text-secondary/80">{consentSummary}</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 flex flex-col gap-3">
            <p className="text-sm font-semibold text-primary">Teledentistry Consent Record</p>
            <p className="text-xs text-secondary">
              Save this consent requirement to the EMR for audit tracking. The mobile app signing screen is not available yet, so no patient link will be sent from this form.
            </p>
            <div className="flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 rounded-xl border border-border/40 px-4 py-2 text-sm font-medium text-primary">
                <Icon name="Clock" size={16} />
                Pending mobile flow
              </span>
              <span className="text-xs text-secondary/80">{consentSummary}</span>
            </div>
          </div>
        )}
      </section>

      <div className="flex flex-wrap justify-end gap-3">
        {submitError && (
          <div className="w-full rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700 dark:border-rose-800/50 dark:bg-rose-900/20 dark:text-rose-300">
            {submitError}
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            setForm(buildInitialForm(prefilledPatient, defaultVisitType));
            setSubmitError('');
          }}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl border border-border/40 px-4 py-2 text-sm font-medium text-secondary hover:text-primary disabled:opacity-50"
        >
          <Icon name="RotateCcw" size={16} />
          Reset
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
        >
          <Icon name="Save" size={16} />
          {saving ? 'Saving...' : 'Save EMR'}
        </button>
      </div>
    </form>
  );
};

export default AddNewEMR;
