import React, { useEffect, useState } from 'react';
import Icon from '../../../../components/AppIcon';
import { saveEndoDifficultyAssessment } from '../../../../services/endoCoreService';

const FACTOR_GROUPS = [
  {
    key: 'patientConsiderations',
    label: 'Patient considerations',
    factors: [
      'medical_complexity',
      'anesthesia_difficulty',
      'limited_mouth_opening',
      'gag_reflex',
      'patient_cooperation_concern',
    ],
  },
  {
    key: 'diagnosticConsiderations',
    label: 'Diagnostic considerations',
    factors: [
      'unclear_pain_origin',
      'referred_pain_possible',
      'chronic_orofacial_pain_history',
      'multiple_teeth_possible',
      'conflicting_test_results',
    ],
  },
  {
    key: 'radiographicConsiderations',
    label: 'Radiographic considerations',
    factors: [
      'difficult_to_interpret',
      'limited_radiographic_visibility',
      'suspected_extra_canal',
      'proximity_to_vital_structure',
    ],
  },
  {
    key: 'toothMorphologyFactors',
    label: 'Tooth morphology',
    factors: [
      'crown_morphology_complex',
      'tilted_or_rotated_tooth',
      'limited_isolation',
      'deep_restoration',
      'cracked_tooth_concern',
    ],
  },
  {
    key: 'canalMorphologyFactors',
    label: 'Canal morphology',
    factors: [
      'curved_canal',
      'calcified_canal',
      'canal_not_visible',
      'c_shaped_canal',
      'open_apex',
      'long_root',
      'root_anomaly',
    ],
  },
  {
    key: 'previousTreatmentFactors',
    label: 'Previous treatment',
    factors: [
      'suspected_missed_canal',
      'poor_obturation',
      'coronal_leakage',
      'post_core_obstruction',
      'separated_instrument',
      'ledge_or_perforation_history',
    ],
  },
  {
    key: 'perioEndoFactors',
    label: 'Perio-endo considerations',
    factors: [
      'deep_periodontal_pocket',
      'furcation_involvement',
      'mobility_concern',
    ],
  },
  {
    key: 'traumaResorptionFactors',
    label: 'Trauma / resorption',
    factors: [
      'internal_resorption',
      'external_resorption',
      'root_fracture_concern',
      'immature_open_apex',
    ],
  },
];

const emptyAssessment = () => ({
  ...Object.fromEntries(FACTOR_GROUPS.map(({ key }) => [key, []])),
  dentistSelectedDifficulty: '',
  referralConsidered: false,
  referralReason: '',
  notes: '',
});

const normalizeAssessment = (assessment) => {
  const base = emptyAssessment();
  if (!assessment) return base;
  FACTOR_GROUPS.forEach(({ key, factors }) => {
    base[key] = Array.isArray(assessment[key])
      ? assessment[key].filter((factor) => factors.includes(factor))
      : [];
  });
  base.dentistSelectedDifficulty = assessment.dentistSelectedDifficulty || '';
  base.referralConsidered = Boolean(assessment.referralConsidered);
  base.referralReason = assessment.referralReason || '';
  base.notes = assessment.notes || '';
  return base;
};

const displayFactor = (value) => value
  .replaceAll('_', ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const EndoDifficultyAssessment = ({
  caseId,
  assessment,
  caseDetails,
  editable,
  onChanged,
  onError,
}) => {
  const [form, setForm] = useState(() => normalizeAssessment(assessment));
  const [saving, setSaving] = useState(false);
  const caseContext = [
    { label: 'Swelling', present: Boolean(caseDetails?.swelling) },
    { label: 'Sinus tract', present: Boolean(caseDetails?.sinusTract) },
    { label: 'Previous RCT', present: Boolean(caseDetails?.previousEndoTreatment) },
    { label: 'CBCT considered', present: Boolean(caseDetails?.cbctConsidered) },
    { label: 'Trauma history', present: Boolean(caseDetails?.traumaHistory) },
    { label: 'Periodontal concern', present: Boolean(caseDetails?.periodontalConcern) },
  ];

  useEffect(() => {
    setForm(normalizeAssessment(assessment));
  }, [assessment]);

  const toggleFactor = (group, factor) => {
    setForm((current) => ({
      ...current,
      [group]: current[group].includes(factor)
        ? current[group].filter((value) => value !== factor)
        : [...current[group], factor],
    }));
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await saveEndoDifficultyAssessment(caseId, {
        ...form,
        dentistSelectedDifficulty: form.dentistSelectedDifficulty || null,
        referralReason: form.referralConsidered
          ? form.referralReason.trim() || null
          : null,
        notes: form.notes.trim() || null,
      });
      await onChanged?.();
    } catch (error) {
      onError?.(
        error.response?.data?.error?.message
        || 'Difficulty assessment tidak dapat disimpan.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-3xl border border-primary/10 bg-surface p-5 shadow-theme-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-primary">
            <Icon name="ClipboardCheck" size={18} />
            Difficulty Assessment
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-secondary">
            Record factors that may increase endodontic treatment difficulty. The final difficulty level is selected by the dentist.
          </p>
        </div>
        {editable && (
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save assessment'}
          </button>
        )}
      </div>

      <div className="mt-5 rounded-2xl border border-primary/10 bg-accent/5 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-primary">
          From case details
        </p>
        <p className="mt-1 text-xs text-secondary">
          Read-only clinical context maintained in the main Endo case form.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {caseContext.map(({ label, present }) => (
            <span
              key={label}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                present
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-primary/10 bg-surface text-muted'
              }`}
            >
              {label} {present ? '✓' : '—'}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {FACTOR_GROUPS.map((group) => (
          <fieldset key={group.key} className="rounded-2xl border border-primary/10 bg-surface-elevated p-4">
            <legend className="px-1 text-sm font-bold text-primary">{group.label}</legend>
            <div className="mt-2 grid gap-2">
              {group.factors.map((factor) => (
                <label key={factor} className="flex items-start gap-2 text-sm text-secondary">
                  <input
                    type="checkbox"
                    checked={form[group.key].includes(factor)}
                    onChange={() => toggleFactor(group.key, factor)}
                    disabled={!editable}
                    className="mt-0.5"
                  />
                  <span>{displayFactor(factor)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold text-primary">
          Dentist-selected difficulty
          <select
            value={form.dentistSelectedDifficulty}
            onChange={(event) => setForm({
              ...form,
              dentistSelectedDifficulty: event.target.value,
            })}
            disabled={!editable}
            className="mt-2 w-full rounded-xl border border-primary/15 bg-surface-elevated px-3 py-2.5 font-normal text-primary disabled:opacity-70"
          >
            <option value="">Not selected</option>
            <option value="low">Low</option>
            <option value="moderate">Moderate</option>
            <option value="high">High</option>
          </select>
        </label>
        <label className="flex items-center gap-2 self-end rounded-xl border border-primary/10 bg-surface-elevated p-3 text-sm font-semibold text-primary">
          <input
            type="checkbox"
            checked={form.referralConsidered}
            onChange={(event) => setForm({
              ...form,
              referralConsidered: event.target.checked,
              ...(!event.target.checked ? { referralReason: '' } : {}),
            })}
            disabled={!editable}
          />
          Referral considered by dentist
        </label>
        {form.referralConsidered && (
          <label className="text-sm font-semibold text-primary md:col-span-2">
            Referral reason
            <textarea
              value={form.referralReason}
              onChange={(event) => setForm({ ...form, referralReason: event.target.value })}
              disabled={!editable}
              rows={3}
              className="mt-2 w-full rounded-xl border border-primary/15 bg-surface-elevated px-3 py-2.5 font-normal text-primary disabled:opacity-70"
            />
          </label>
        )}
        <label className="text-sm font-semibold text-primary md:col-span-2">
          Notes
          <textarea
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
            disabled={!editable}
            rows={3}
            className="mt-2 w-full rounded-xl border border-primary/15 bg-surface-elevated px-3 py-2.5 font-normal text-primary disabled:opacity-70"
          />
        </label>
      </div>
      <p className="mt-4 text-xs text-secondary">
        No score or referral decision is generated. All selections are dentist-authored.
      </p>
    </section>
  );
};

export default EndoDifficultyAssessment;
