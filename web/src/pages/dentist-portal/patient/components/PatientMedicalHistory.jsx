import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../../../components/ui/Button';
import Icon from '../../../../components/AppIcon';
import { useAuth } from '../../../../contexts/AuthContext';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { useToast } from '../../../../contexts/ToastContext';
import AddNewEMR from '../../patient-emr/components/AddNewEMR';
import AdvancedOdontogram from '../../patient-emr/components/AdvancedOdontogram';
import { buildEmrPayload, formatDateTimeLabel } from '../../patient-emr/utils';
import { resolveMediaUrl } from '../../../../utils/mediaHelpers';
import ClinicalIcon from './ClinicalIcon';
import { buildImagingUrl, buildStudyAssetParams } from '../../x-core/utils/imagingUrl';
import { PY_API_BASE } from '../../../../config/api';

const PatientMedicalHistory = ({ patient, onUpdateHistory, onCreateEmr, onUploadConsent }) => {
  const [editingSection, setEditingSection] = useState(null);
  const [newItem, setNewItem] = useState('');
  const [showEmrForm, setShowEmrForm] = useState(false);
  const [isSubmittingEmr, setIsSubmittingEmr] = useState(false);
  const [expandedEmrId, setExpandedEmrId] = useState(null);
  const [uploadingConsentId, setUploadingConsentId] = useState(null);
  const [savingSection, setSavingSection] = useState(null);
  const { t } = useLanguage();
  const toast = useToast();
  const { user } = useAuth();
  const labels = t('dentistPatient.medicalHistory') || {};
  const medicalHistory = patient?.medicalHistory || {};
  const emrRecords = Array.isArray(patient?.emrRecords) ? patient.emrRecords : [];
  const xCoreStudies = Array.isArray(patient?.xCoreStudies) ? patient.xCoreStudies : [];
  const currentUserId = user?.id?.toString?.() || user?.id;
  const [enrichedStudies, setEnrichedStudies] = useState({});

  useEffect(() => {
    if (!xCoreStudies.length) return;
    let isMounted = true;
    xCoreStudies.forEach(async (study) => {
      const studyKey = study.folderName || study.id;
      if (!studyKey) return;
      try {
        const response = await fetch(`${PY_API_BASE}/gallery/${studyKey}`);
        if (response.ok) {
          const data = await response.json();
          if (isMounted && data.series && data.series.length > 0) {
            setEnrichedStudies((prev) => ({
              ...prev,
              [studyKey]: data.series,
            }));
          }
        }
      } catch (_) {}
    });
    return () => { isMounted = false; };
  }, [xCoreStudies]);

  const emrPrefilledPatient = useMemo(() => {
    if (!patient) return null;
    return {
      id: patient.id,
      name: patient.name || '',
      nik: patient.nik || patient.nationalId || '',
      dob: patient.dateOfBirth || patient.birthDate || patient.dob || '',
      gender: patient.gender || '',
      rmNumber: patient.rmNumber || patient.patientId || `RM-${patient.id}`,
      alerts: {
        allergies: Array.isArray(medicalHistory.allergies) ? medicalHistory.allergies : [],
        systemic: Array.isArray(medicalHistory.conditions) ? medicalHistory.conditions : [],
      },
      medicalDetails: {
        allergies: Array.isArray(medicalHistory.allergies) ? medicalHistory.allergies : [],
        chronicConditions: Array.isArray(medicalHistory.conditions) ? medicalHistory.conditions : [],
        medications: Array.isArray(medicalHistory.medications) ? medicalHistory.medications : [],
        notes: medicalHistory.notes || medicalHistory.medicalHistory || '',
      },
      odontogramMarks: patient.odontogramMarks || [],
    };
  }, [patient, medicalHistory]);

  if (!patient) {
    return (
      <div className="bg-surface border border-primary/10 rounded-3xl shadow-theme-sm p-12 animate-in fade-in">
        <div className="text-center py-8">
          <ClinicalIcon name="emr-record" size="xl" className="mx-auto mb-4" />
          <p className="text-secondary font-medium">{t('dentistPatient.common.noPatientSelected')}</p>
        </div>
      </div>
    );
  }

  const persistMedicalHistory = async (section, updatedHistory) => {
    if (!onUpdateHistory) return;
    setSavingSection(section);
    try {
      await onUpdateHistory(updatedHistory);
      setEditingSection(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSavingSection(null);
    }
  };

  const handleAddItem = async (section) => {
    if (!newItem.trim()) return;
    const updatedHistory = {
      ...medicalHistory,
      [section]: [...(medicalHistory[section] || []), newItem.trim()]
    };
    await persistMedicalHistory(section, updatedHistory);
    setNewItem('');
  };

  const handleRemoveItem = async (section, index) => {
    if (!window.confirm('Hapus item ini dari riwayat medis pasien? Perubahan akan dibagikan ke portal klinik.')) return;
    const updatedHistory = {
      ...medicalHistory,
      [section]: (medicalHistory[section] || []).filter((_, i) => i !== index)
    };
    await persistMedicalHistory(section, updatedHistory);
  };

  const handleExportHistory = () => {
    const exportPayload = {
      exportedAt: new Date().toISOString(),
      patient: {
        id: patient.id,
        name: patient.name || null,
        dateOfBirth: patient.dateOfBirth || null,
        gender: patient.gender || null,
      },
      medicalHistory,
      emrRecords,
      xCoreStudies: xCoreStudies.map((study) => ({
        id: study.id,
        folderName: study.folderName,
        modality: study.modality,
        studyDate: study.studyDate,
        status: study.status,
        ownerDentist: study.ownerDentist || null,
      })),
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `medical-history-${String(patient.id)}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success('Medical history exported.');
  };

  const getErrorMessage = (err) => {
    const data = err?.response?.data;
    if (typeof data?.error === 'string') return data.error;
    if (data?.error?.message) return data.error.message;
    if (data?.error?.detail) return data.error.detail;
    if (data?.detail) return data.detail;
    if (data?.message) return data.message;
    if (err?.message && err.message !== 'Network Error') return err.message;
    return 'Failed to save EMR. Please check that the backend is running and try again.';
  };

  const handleCreateEmr = async (formData) => {
    if (!onCreateEmr) return;
    setIsSubmittingEmr(true);
    try {
      const recordPayload = buildEmrPayload(formData, {
        patientUserId: patient.id,
        rmNumber: emrPrefilledPatient?.rmNumber,
      });
      const savedRecord = await onCreateEmr(recordPayload);
      toast.success('EMR saved to patient record.');
      setShowEmrForm(false);
      if (savedRecord?.id) {
        setExpandedEmrId(savedRecord.id);
      }
    } catch (err) {
      console.error('Failed to save patient EMR:', err);
      toast.error(getErrorMessage(err));
      throw err;
    } finally {
      setIsSubmittingEmr(false);
    }
  };

  const handleConsentUpload = async (record, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !onUploadConsent) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Consent file must be smaller than 10 MB.');
      return;
    }
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
      toast.error('Consent file must be PDF, JPG, or PNG.');
      return;
    }

    setUploadingConsentId(record.id);
    try {
      await onUploadConsent(record.id, file);
      toast.success('Informed consent uploaded.');
    } catch (err) {
      console.error('Failed to upload informed consent:', err);
      toast.error(getErrorMessage(err));
    } finally {
      setUploadingConsentId(null);
    }
  };

  const asList = (value) => {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === 'string' && value.trim()) {
      return value.split('\n').map((item) => item.trim()).filter(Boolean);
    }
    return [];
  };

  const getRecordDentistName = (record) =>
    record?.dentist?.name || record?.createdBy?.name || 'Unknown dentist';

  const getRecordTitle = (record) =>
    record?.chiefComplaint ||
    record?.diagnoses?.working ||
    record?.plan?.treatmentPlan?.[0] ||
    'Clinical EMR entry';

  const getConsentWorkflowLabel = (workflow) => ({
    'in-clinic-upload': 'In-clinic consent upload',
    'teledentistry-mobile-pending': 'Teledentistry mobile signing pending',
  }[workflow] || workflow);

  const renderConsentPreview = (document) => {
    const previewUrl = resolveMediaUrl(document?.url);
    if (!previewUrl) return null;
    const isPdf = document?.mimeType === 'application/pdf' || document?.name?.toLowerCase?.().endsWith('.pdf');
    return (
      <div className="mt-4 overflow-hidden rounded-2xl border border-primary/10 bg-surface-elevated">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-primary/10 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-primary">{document.name || 'Informed consent'}</p>
            {document.uploadedAt && (
              <p className="text-xs text-secondary">Uploaded {formatDateTimeLabel(document.uploadedAt)}</p>
            )}
          </div>
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-primary/15 px-3 py-1.5 text-xs font-semibold text-primary hover:border-accent hover:text-accent"
          >
            <Icon name="ExternalLink" size={14} />
            Open
          </a>
        </div>
        {isPdf ? (
          <iframe
            title={document.name || 'Informed consent preview'}
            src={previewUrl}
            className="h-96 w-full bg-white"
          />
        ) : (
          <img
            src={previewUrl}
            alt={document.name || 'Informed consent preview'}
            className="max-h-96 w-full object-contain bg-white"
          />
        )}
      </div>
    );
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high': case 'severe': return 'text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800/50';
      case 'medium': case 'moderate': return 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-800/50';
      case 'low': case 'mild': return 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-800/50';
      default: return 'text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-900/20 dark:border-slate-700/50';
    }
  };

  const getSeverityLabel = (severity) => {
    const key = (severity || '').toLowerCase();
    const label = t(`dentistPatient.medicalHistory.severity.${key}`);
    return label.startsWith('dentistPatient') ? severity : label;
  };

  const getMedicalSectionIcon = (section) => ({
    allergies: 'allergy-alert',
    conditions: 'medical-condition',
    medications: 'medication',
    surgeries: 'procedure',
    familyHistory: 'patient-directory',
    emergencyContact: 'emergency-contact'
  }[section] || 'clinical-note');

  const StatCard = ({ title, value, colorClass, icon, shadowColor }) => (
    <div className="bg-gradient-to-br from-surface-elevated to-surface rounded-2xl p-5 border border-primary/10 shadow-sm relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <ClinicalIcon name={icon} size="xl" className="border-0 shadow-none" />
      </div>
      <div className="flex items-center space-x-2.5 mb-2">
        <span className={`flex h-2.5 w-2.5 rounded-full ${colorClass}`} style={{ boxShadow: `0 0 8px ${shadowColor}` }}></span>
        <span className="text-xs font-bold uppercase tracking-wider text-muted">{title}</span>
      </div>
      <p className="text-3xl font-bold text-primary">{value}</p>
    </div>
  );

  const renderMedicalSection = (section, items) => {
    const sectionLabels = labels.sections?.[section] || {};
    const title = sectionLabels.title || section;
    const placeholder = sectionLabels.placeholder || labels.placeholders?.default || '';
    const emptyLabel = sectionLabels.empty || labels.empty || '';

    return (
      <div className="bg-surface border border-primary/10 rounded-3xl shadow-theme-lg overflow-hidden">
        <div className="p-6 border-b border-primary/10 flex items-center justify-between bg-surface-elevated/50">
          <h3 className="font-bold text-lg flex items-center gap-3 text-primary">
            <ClinicalIcon name={getMedicalSectionIcon(section)} size="sm" />
            {title}
          </h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditingSection(editingSection === section ? null : section)}
            disabled={savingSection === section}
            className="text-xs bg-surface hover:bg-surface-elevated border-primary/20"
          >
            {editingSection === section ? t('dentistPatient.common.cancel') : t('dentistPatient.common.add')}
          </Button>
        </div>

        <div className="p-6 space-y-3">
          {editingSection === section && (
            <div className="mb-4 flex gap-2 animate-in fade-in slide-in-from-top-2">
              <input
                type="text"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder={placeholder}
                className="flex-1 px-4 py-2 border border-primary/20 rounded-xl bg-surface-elevated text-primary focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none text-sm shadow-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleAddItem(section)}
                disabled={savingSection === section}
                autoFocus
              />
              <Button size="sm" onClick={() => handleAddItem(section)} disabled={savingSection === section}>
                {savingSection === section ? 'Saving...' : t('dentistPatient.common.add')}
              </Button>
            </div>
          )}

          {items && items.length > 0 ? (
            items.map((item, index) => (
              <div key={index} className="group flex items-center justify-between p-3 bg-surface-elevated rounded-xl border border-primary/10 shadow-sm hover:border-primary/20 hover:shadow-md transition-all">
                <div className="flex-1">
                  {typeof item === 'string' ? (
                    <span className="text-secondary font-medium text-sm">{item}</span>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-primary font-bold text-sm">{item.name || item.condition || item.medication}</span>
                      {item.severity && <span className={`px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wide border ${getSeverityColor(item.severity)}`}>{getSeverityLabel(item.severity)}</span>}
                      {(item.dosage || item.date) && <span className="text-xs text-muted bg-surface px-2 py-0.5 rounded border border-primary/10">{item.dosage || item.date}</span>}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveItem(section, index)}
                  disabled={savingSection === section}
                  aria-label={`Remove ${title} item`}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted hover:text-red-500 hover:bg-red-500/10 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            ))
          ) : (
            <div className="py-6 text-center border border-dashed border-primary/10 rounded-xl bg-surface">
              <p className="text-muted text-sm font-medium">{emptyLabel}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderInlineList = (items, fallback = 'No data recorded') => {
    const list = asList(items);
    if (!list.length) {
      return <p className="text-sm text-secondary">{fallback}</p>;
    }
    return (
      <ul className="space-y-2">
        {list.map((item, index) => (
          <li key={`${item}-${index}`} className="flex items-start gap-2 text-sm text-secondary">
            <Icon name="BadgeCheck" size={14} className="mt-0.5 text-accent" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  };

  const renderEmrRecord = (record) => {
    const isExpanded = expandedEmrId === record.id;
    const allergies = asList(record.alerts?.allergies || record.medicalDetails?.allergies);
    const systemic = asList(record.alerts?.systemic || record.medicalDetails?.chronicConditions);
    const treatmentPlan = asList(record.plan?.treatmentPlan);
    const procedures = Array.isArray(record.plan?.procedures) ? record.plan.procedures : [];
    const medications = Array.isArray(record.plan?.medications) ? record.plan.medications : [];
    const odontogramMarks = Array.isArray(record.odontogramMarks) ? record.odontogramMarks : [];
    const consentDocument = record.consent?.document || record.documents?.find?.((doc) => doc?.type === 'Informed Consent' && doc?.url);
    const canManageConsent = Boolean(currentUserId && record.dentistId?.toString?.() === currentUserId?.toString?.());
    const createdAt = record.createdAt || record.lastUpdated || record.lastVisit;

    return (
      <article key={record.id} className="bg-surface border border-primary/10 rounded-3xl shadow-theme-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setExpandedEmrId(isExpanded ? null : record.id)}
          className="w-full p-6 text-left hover:bg-surface-elevated/40 transition-colors"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <ClinicalIcon name="emr-record" size="sm" />
                <h3 className="text-lg font-bold text-primary truncate">{getRecordTitle(record)}</h3>
                {record.diagnoses?.icd10 && record.diagnoses.icd10 !== 'N/A' && (
                  <span className="rounded-full border border-primary/10 bg-surface-elevated px-3 py-1 text-xs font-bold uppercase tracking-wide text-secondary">
                    ICD-10 {record.diagnoses.icd10}
                  </span>
                )}
              </div>
              <p className="line-clamp-2 text-sm leading-6 text-secondary">
                {record.medicalHistory || record.chiefComplaint || 'No clinical narrative recorded.'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-surface-elevated px-3 py-1 text-xs font-semibold text-secondary">
                  <ClinicalIcon name="patient-profile" size="xs" className="h-4 w-4 border-0 shadow-none" />
                  {getRecordDentistName(record)}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-surface-elevated px-3 py-1 text-xs font-semibold text-secondary">
                  <ClinicalIcon name="appointment-calendar" size="xs" className="h-4 w-4 border-0 shadow-none" />
                  {formatDateTimeLabel(createdAt)}
                </span>
                {allergies.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 dark:border-rose-800/50 dark:bg-rose-900/20 dark:text-rose-300">
                    <ClinicalIcon name="allergy-alert" size="xs" className="h-4 w-4 border-0 shadow-none" />
                    {allergies.length} allergy
                  </span>
                )}
                {systemic.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-300">
                    <ClinicalIcon name="medical-condition" size="xs" className="h-4 w-4 border-0 shadow-none" />
                    {systemic.length} systemic
                  </span>
                )}
              </div>
            </div>
            <span className={`mt-1 text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
              <Icon name="ChevronDown" size={18} />
            </span>
          </div>
        </button>

        {isExpanded && (
          <div className="border-t border-primary/10 bg-surface-elevated/35 p-6 animate-in slide-in-from-top-2 duration-200">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-primary/10 bg-surface p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Subjective</p>
                <p className="text-sm font-semibold text-primary">Chief complaint</p>
                <p className="mt-1 text-sm leading-6 text-secondary">{record.chiefComplaint || '-'}</p>
                <p className="mt-4 text-sm font-semibold text-primary">Medical history</p>
                <p className="mt-1 text-sm leading-6 text-secondary">{record.medicalHistory || '-'}</p>
              </div>
              <div className="rounded-2xl border border-primary/10 bg-surface p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Objective</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted">Blood pressure</p>
                    <p className="font-semibold text-primary">{record.vitals?.bloodPressure || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted">Heart rate</p>
                    <p className="font-semibold text-primary">{record.vitals?.heartRate || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted">Temperature</p>
                    <p className="font-semibold text-primary">{record.vitals?.temperature || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted">SpO2</p>
                    <p className="font-semibold text-primary">{record.vitals?.spo2 || '-'}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-primary/10 bg-surface p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Assessment</p>
                <p className="text-sm font-semibold text-primary">{record.diagnoses?.working || 'Pending'}</p>
                <p className="mt-1 text-xs text-secondary">ICD-10 {record.diagnoses?.icd10 || 'N/A'}</p>
              </div>
              <div className="rounded-2xl border border-primary/10 bg-surface p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Plan</p>
                {renderInlineList(treatmentPlan)}
              </div>
              <div className="rounded-2xl border border-primary/10 bg-surface p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Procedures</p>
                {procedures.length ? (
                  <ul className="space-y-2">
                    {procedures.map((procedure, index) => (
                      <li key={`${procedure.label}-${index}`} className="text-sm text-secondary">
                        <span className="font-semibold text-primary">{procedure.label}</span>
                        <span className="ml-2 text-xs text-muted">ICD-9-CM {procedure.icd9 || 'N/A'}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-secondary">No procedure recorded.</p>
                )}
              </div>
              <div className="rounded-2xl border border-primary/10 bg-surface p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Medications</p>
                {medications.length ? (
                  <ul className="space-y-2">
                    {medications.map((medication, index) => (
                      <li key={`${medication.name}-${index}`} className="text-sm text-secondary">
                        <span className="font-semibold text-primary">{medication.name}</span>
                        {medication.dosage && <span className="ml-2 text-xs text-muted">{medication.dosage}</span>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-secondary">No medication recorded.</p>
                )}
              </div>
              <div className="rounded-2xl border border-primary/10 bg-surface p-4 lg:col-span-2">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted">Odontogram</p>
                    <p className="text-sm text-secondary">
                      {odontogramMarks.length ? `${odontogramMarks.length} mark${odontogramMarks.length > 1 ? 's' : ''} recorded` : 'No odontogram marks recorded.'}
                    </p>
                  </div>
                </div>
                <AdvancedOdontogram
                  value={odontogramMarks}
                  readOnly
                  showToolbar={false}
                  width={900}
                  height={420}
                />
              </div>
              <div className="rounded-2xl border border-primary/10 bg-surface p-4 lg:col-span-2">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Informed Consent</p>
                    <p className="text-sm font-semibold text-primary">{record.consent?.status || 'Not recorded'}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-secondary">
                      {record.visitType && (
                        <span className="rounded-full border border-primary/10 bg-surface-elevated px-3 py-1">
                          {record.visitType === 'teledentistry' ? 'Teledentistry' : 'In-clinic'}
                        </span>
                      )}
                      {record.consent?.workflow && (
                        <span className="rounded-full border border-primary/10 bg-surface-elevated px-3 py-1">
                          {getConsentWorkflowLabel(record.consent.workflow)}
                        </span>
                      )}
                      {record.consent?.mobileSigningAvailable === false && (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-semibold text-amber-700 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-300">
                          Mobile signing pending
                        </span>
                      )}
                      {!canManageConsent && !consentDocument && (
                        <span className="rounded-full border border-primary/10 bg-surface-elevated px-3 py-1 font-semibold">
                          Upload restricted to creator dentist
                        </span>
                      )}
                    </div>
                  </div>
                  {canManageConsent && (
                    <label className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-primary/15 px-4 py-2 text-sm font-semibold text-primary hover:border-accent hover:text-accent ${uploadingConsentId === record.id ? 'pointer-events-none opacity-60' : ''}`}>
                      <Icon name="UploadCloud" size={16} />
                      {uploadingConsentId === record.id ? 'Uploading...' : consentDocument ? 'Replace consent' : 'Upload consent'}
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(event) => handleConsentUpload(record, event)}
                      />
                    </label>
                  )}
                </div>
                {consentDocument ? (
                  renderConsentPreview(consentDocument)
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-primary/15 bg-surface-elevated/50 p-4 text-sm text-secondary">
                    {canManageConsent
                      ? 'No consent file uploaded yet. You can upload it here because you created this EMR.'
                      : 'No consent file uploaded yet. Only the dentist who created this EMR can upload or replace the consent file.'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </article>
    );
  };

  const renderEmrSection = () => (
    <section className="space-y-5">
      <div className="bg-surface border border-primary/10 rounded-3xl shadow-theme-sm p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <ClinicalIcon name="emr-record" size="md" />
              <div>
                <h2 className="text-xl font-bold text-primary tracking-tight">Electronic Medical Records</h2>
                <p className="text-sm text-secondary">SOAP notes, odontogram, consent, and dentist audit trail.</p>
              </div>
            </div>
          </div>
          <Button
            onClick={() => setShowEmrForm((prev) => !prev)}
            disabled={isSubmittingEmr}
            className="shadow-lg shadow-accent/20"
          >
            {showEmrForm ? 'Close EMR Form' : 'Add EMR'}
          </Button>
        </div>
      </div>

      {showEmrForm && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <AddNewEMR
            prefilledPatient={emrPrefilledPatient}
            onSubmit={handleCreateEmr}
            isSubmitting={isSubmittingEmr}
          />
        </div>
      )}

      <div className="space-y-4">
        {emrRecords.length ? (
          emrRecords.map(renderEmrRecord)
        ) : (
          <div className="rounded-3xl border border-dashed border-primary/20 bg-surface p-10 text-center">
            <ClinicalIcon name="emr-empty" size="xl" className="mx-auto" />
            <p className="mt-3 font-semibold text-primary">No EMR recorded yet</p>
            <p className="mt-1 text-sm text-secondary">Create the first EMR entry to start the shared clinical timeline.</p>
          </div>
        )}
      </div>
    </section>
  );

  const formatBytes = (bytes) => {
    if (!bytes) return '0 MB';
    const num = Number(bytes);
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    if (num < 1024 * 1024 * 1024) return `${(num / (1024 * 1024)).toFixed(1)} MB`;
    return `${(num / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const getStudyThumbnail = (study) => {
    const studyKey = study.folderName || study.id;
    const seriesList = study.series || enrichedStudies[studyKey] || [];
    const panSeries = seriesList.find((s) => s.classification === '2D');
    const targetSeries = panSeries || seriesList[0];
    if (targetSeries) {
      const thumbnailPath = targetSeries.thumbnail_url || `/thumbnail/${studyKey}/${targetSeries.series_uid}`;
      return buildImagingUrl(thumbnailPath, buildStudyAssetParams(study));
    }
    return buildImagingUrl(`/preview/${studyKey}`, buildStudyAssetParams(study));
  };

  const getStudyModalities = (study) => {
    const studyKey = study.folderName || study.id;
    const seriesList = study.series || enrichedStudies[studyKey] || [];
    const modalities = new Set();
    seriesList.forEach((s) => {
      const mod = s.modality;
      if (mod === 'CBCT') {
        modalities.add('3D CBCT');
      } else if (mod === 'Panoramic') {
        modalities.add('2D Panoramik');
      } else if (mod === 'Cephalometric') {
        modalities.add('2D Sefalometri');
      } else if (mod === 'Intraoral Periapical') {
        modalities.add('Periapikal');
      } else if (mod === 'Intraoral Bitewing') {
        modalities.add('Bitewing');
      } else if (mod === 'Intraoral Occlusal') {
        modalities.add('Oklusal');
      } else if (mod === 'Intraoral') {
        modalities.add('Intraoral');
      } else {
        if (s.type === '3D Volume' || s.classification === '3D') {
          modalities.add('3D CBCT');
        } else {
          modalities.add(s.modality || '2D Panoramik');
        }
      }
    });
    if (modalities.size === 0) {
      modalities.add(study.modality || '3D CBCT');
    }
    return Array.from(modalities);
  };

  const getModalityBadgeClass = (mod) => {
    if (mod.includes('3D') || mod === 'CBCT') return 'bg-indigo-600/85 border border-indigo-500/30';
    if (mod.includes('Panoramik') || mod === 'Panoramic') return 'bg-emerald-600/85 border border-emerald-500/30';
    if (mod.includes('Sefalometri') || mod === 'Cephalometric') return 'bg-cyan-600/85 border border-cyan-500/30';
    if (['Periapikal', 'Bitewing', 'Oklusal', 'Intraoral'].some((k) => mod.includes(k))) return 'bg-amber-600/85 border border-amber-500/30';
    return 'bg-slate-600/85 border border-slate-500/30';
  };

  const renderAccessBadge = (scope) => {
    switch (scope) {
      case 'clinic':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-md backdrop-blur-sm">
            <Icon name="Hospital" size={10} className="stroke-[2.5]" />
            <span>Klinik</span>
          </span>
        );
      case 'shared_with_me':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-600 border border-cyan-500/20 rounded-md backdrop-blur-sm">
            <Icon name="Share2" size={10} className="stroke-[2.5]" />
            <span>Dibagikan</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 rounded-md backdrop-blur-sm">
            <Icon name="Lock" size={10} className="stroke-[2.5]" />
            <span>PRIBADI</span>
          </span>
        );
    }
  };

  const renderXCoreSection = () => {
    const xCoreLabels = labels.xcore || {};
    return (
      <section className="rounded-3xl border border-primary/10 bg-surface shadow-theme-sm p-6 md:p-8 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="h-11 w-11 shrink-0 rounded-2xl border border-cyan-200 bg-cyan-50 dark:border-cyan-800/60 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shadow-xs">
              <Icon name="Scan" size={20} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-bold tracking-tight text-primary">
                  {xCoreLabels.title || 'X-Core Imaging'}
                </h2>
                <span className="inline-flex items-center justify-center rounded-full border border-cyan-200 bg-cyan-50 dark:border-cyan-800/60 dark:bg-cyan-900/30 px-2.5 py-0.5 text-xs font-bold text-cyan-600 dark:text-cyan-400">
                  {xCoreStudies.length}
                </span>
              </div>
              <p className="mt-1 text-sm text-secondary">
                {xCoreLabels.description || 'Radiographic studies linked to this patient and accessible to you.'}
              </p>
            </div>
          </div>
          <Link
            to="/dentist-portal/x-core"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-primary/15 bg-surface hover:bg-surface-elevated px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:border-primary/30 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Icon name="Images" size={16} />
            {xCoreLabels.openGallery || 'Open X-Core Gallery'}
          </Link>
        </div>

        <div className="border-t border-primary/10" />

        <div>
          {patient.isLoadingDetails ? (
            <div role="status" className="grid gap-4 md:grid-cols-2">
              {[0, 1].map((item) => (
                <div key={item} className="h-36 animate-pulse rounded-2xl border border-primary/10 bg-surface-elevated" />
              ))}
            </div>
          ) : xCoreStudies.length ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {xCoreStudies.map((study) => {
                const studyKey = study.folderName || study.id;
                const seriesList = (study.series && study.series.length) ? study.series : (enrichedStudies[studyKey] || []);
                const studyWithSeries = { ...study, series: seriesList };

                const studyDate = studyWithSeries.studyDate || studyWithSeries.createdAt;
                const dateDisplay = studyWithSeries.dateDisplay || (studyDate ? new Date(studyDate).toISOString().split('T')[0] : 'N/A');
                const folderSize = formatBytes(studyWithSeries.sizeInBytes);
                const studyModalities = getStudyModalities(studyWithSeries);
                const thumbnailUrl = getStudyThumbnail(studyWithSeries);
                const statusDisplay = (studyWithSeries.status || 'processed').charAt(0).toUpperCase() + (studyWithSeries.status || 'processed').slice(1).replace(/_/g, ' ');
                const patientName = studyWithSeries.patientName || studyWithSeries.metadata?.PatientName?.replace(/\^/g, ' ') || patient?.name || 'Patient Name';
                const patientIdDisplay = studyWithSeries.patientIdDisplay || (studyWithSeries.metadata?.PatientID ? `ID: ${studyWithSeries.metadata.PatientID}` : (patient?.rmNumber ? `RM: ${patient.rmNumber}` : `Patient ID: ${patient?.id || studyWithSeries.patientId || 'N/A'}`));
                const folderName = studyWithSeries.originalName || studyWithSeries.folderName || 'Patient - 027.SL';
                const scanCount = seriesList.length || studyWithSeries.seriesCount || 1;

                return (
                  <article
                    key={study.id}
                    className="group relative bg-surface-elevated rounded-2xl border border-primary/10 overflow-hidden transition hover:shadow-theme-lg flex flex-col justify-between"
                  >
                    {/* Study Cover Image / Thumbnail */}
                    <div className="aspect-video bg-gray-900 flex items-center justify-center relative overflow-hidden">
                      {thumbnailUrl ? (
                        <>
                          <img
                            src={thumbnailUrl}
                            alt={patientName}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              if (e.target.nextSibling) {
                                e.target.nextSibling.style.display = 'flex';
                              }
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 items-center justify-center hidden">
                            <Icon name="FolderOpen" size={48} className="text-gray-700" />
                          </div>
                        </>
                      ) : (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Icon name="FolderOpen" size={48} className="text-gray-700" />
                        </div>
                      )}

                      {/* Modalities badges list */}
                      <div className="absolute top-2 left-2 flex flex-wrap gap-1.5 z-10">
                        {studyModalities.map((mod) => (
                          <span
                            key={mod}
                            className={`px-2 py-0.5 text-[10px] font-semibold rounded backdrop-blur-sm text-white ${getModalityBadgeClass(mod)}`}
                          >
                            {mod}
                          </span>
                        ))}
                      </div>

                      {/* Access Scope Badge */}
                      <div className="absolute top-2 right-2 z-10">
                        {renderAccessBadge(studyWithSeries.xcoreAccessScope)}
                      </div>

                      {/* Scan Count Badge */}
                      <span className="absolute bottom-2 left-2 px-2 py-1 bg-black/55 text-cyan-400 text-[10px] rounded backdrop-blur-sm font-semibold flex items-center gap-1">
                        <Icon name="Layers" size={10} className="stroke-[2.5]" />
                        <span>{scanCount} Scan</span>
                      </span>

                      {/* Folder Size Badge */}
                      <span className="absolute bottom-2 right-2 px-2 py-1 bg-black/55 text-white text-[10px] rounded backdrop-blur-sm font-medium">
                        {folderSize}
                      </span>
                    </div>

                    {/* Card Content Information */}
                    <div className="p-4 space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-primary truncate group-hover:text-accent transition-colors">
                            {patientName}
                          </h3>
                          <p className="text-xs text-secondary mt-0.5">{patientIdDisplay}</p>
                          <p className="text-[11px] text-muted truncate mt-1">Folder: {folderName}</p>
                        </div>
                        <Link
                          to={`/dentist-portal/x-core?studyId=${encodeURIComponent(studyKey)}`}
                          className="p-1 text-muted hover:text-accent transition-colors shrink-0"
                          title="Open Study in X-Core Gallery"
                        >
                          <Icon name="ChevronRight" size={18} className="transition-transform group-hover:translate-x-1 mt-0.5" />
                        </Link>
                      </div>

                      <div className="pt-2 border-t border-primary/10 flex justify-between items-center text-xs text-secondary">
                        <span>{dateDisplay}</span>
                        <div className="flex items-center gap-2">
                          <span className={statusDisplay === 'Analyzed' || statusDisplay === 'Processed' ? 'text-emerald-500 font-medium' : 'text-amber-500 font-medium'}>
                            {statusDisplay}
                          </span>
                          <Link
                            to={`/dentist-portal/x-core?studyId=${encodeURIComponent(studyKey)}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-accent/20 bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent transition hover:bg-accent/20"
                          >
                            <Icon name="ExternalLink" size={13} />
                            <span>Open Study</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-primary/15 bg-surface-elevated/35 px-6 py-10 text-center">
              <ClinicalIcon name="xcore-imaging" size="xl" className="mx-auto opacity-75" />
              <p className="mt-4 font-semibold text-primary">{xCoreLabels.emptyTitle || 'No X-Core studies linked'}</p>
              <p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-secondary">
                {xCoreLabels.emptyDescription || 'Studies uploaded to Gallery appear here after they are explicitly assigned to this patient.'}
              </p>
            </div>
          )}
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-surface border border-primary/10 rounded-3xl shadow-theme-sm p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-primary tracking-tight">{labels.title}</h2>
            <p className="text-secondary mt-1">Comprehensive medical background and shared EMR timeline</p>
          </div>
          <Button onClick={handleExportHistory} variant="outline" className="shadow-sm bg-surface hover:bg-surface-elevated border-primary/20 text-secondary">
            {labels.actions?.export || t('dentistPatient.common.export')}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard title={labels.summary?.allergies} value={medicalHistory.allergies?.length || 0} colorClass="bg-red-500" shadowColor="rgba(239,68,68,0.5)" icon="allergy-alert" />
          <StatCard title={labels.summary?.conditions} value={medicalHistory.conditions?.length || 0} colorClass="bg-amber-500" shadowColor="rgba(245,158,11,0.5)" icon="medical-condition" />
          <StatCard title={labels.summary?.medications} value={medicalHistory.medications?.length || 0} colorClass="bg-blue-500" shadowColor="rgba(59,130,246,0.5)" icon="medication" />
          <StatCard title={labels.summary?.surgeries} value={medicalHistory.surgeries?.length || 0} colorClass="bg-emerald-500" shadowColor="rgba(16,185,129,0.5)" icon="procedure" />
        </div>
      </div>

      {renderXCoreSection()}

      {renderEmrSection()}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderMedicalSection('allergies', medicalHistory.allergies)}
        {renderMedicalSection('conditions', medicalHistory.conditions)}
        {renderMedicalSection('medications', medicalHistory.medications)}
        {renderMedicalSection('surgeries', medicalHistory.surgeries)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface border border-primary/10 rounded-3xl shadow-theme-lg p-8 h-full">
          <h3 className="text-lg font-bold text-primary mb-6 flex items-center gap-3">
            <ClinicalIcon name="emergency-contact" size="sm" />
            <span>{labels.emergency?.title}</span>
          </h3>

          {medicalHistory.emergencyContact && Object.keys(medicalHistory.emergencyContact).length > 0 ? (
            <div className="bg-surface-elevated rounded-2xl p-6 border border-primary/10 space-y-4">
              <div className="flex items-center justify-between border-b border-primary/10 pb-3">
                <span className="text-xs font-bold text-muted uppercase tracking-wider">{labels.emergency?.name}</span>
                <span className="text-primary font-semibold">{medicalHistory.emergencyContact.name || t('dentistPatient.common.notProvided')}</span>
              </div>
              <div className="flex items-center justify-between border-b border-primary/10 pb-3">
                <span className="text-xs font-bold text-muted uppercase tracking-wider">{labels.emergency?.relationship}</span>
                <span className="text-primary font-medium">{medicalHistory.emergencyContact.relationship || t('dentistPatient.common.notProvided')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted uppercase tracking-wider">{labels.emergency?.phone}</span>
                <span className="text-accent font-bold font-mono">{medicalHistory.emergencyContact.phone || t('dentistPatient.common.notProvided')}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 border-2 border-dashed border-primary/10 rounded-2xl">
              <p className="text-muted mb-4">{labels.emergency?.empty}</p>
              <Button variant="outline" size="sm">{labels.emergency?.add}</Button>
            </div>
          )}
        </div>

        <div className="bg-surface border border-primary/10 rounded-3xl shadow-theme-lg p-8 h-full">
          <h3 className="text-lg font-bold text-primary mb-6 flex items-center gap-3">
            <span className="text-xl">👥</span>
            <span>{labels.family?.title}</span>
          </h3>
          <p className="text-center py-12 text-secondary">Family history not available.</p>
        </div>
      </div>
    </div>
  );
};

export default PatientMedicalHistory;
