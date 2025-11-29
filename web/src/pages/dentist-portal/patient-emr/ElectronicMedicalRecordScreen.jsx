import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SideBar from '../ui/SideBar';
import Icon from '../../../components/AppIcon';
import { getPatientEmrById, PATIENT_EMR_DATA } from './data';
import AdvancedOdontogram from './components/AdvancedOdontogram';
import { fetchEmrById } from '../../../services/emrService';
import { formatDateLabel, formatDateTimeLabel } from './utils';

const TABS = [
  { id: 'soap', label: 'SOAP & Medical' },
  { id: 'odontogram', label: 'Odontogram' },
  { id: 'documents', label: 'Documents' },
];

const ElectronicMedicalRecordScreen = () => {
  const navigate = useNavigate();
  const { patientId } = useParams();
  const [patient, setPatient] = useState(() => getPatientEmrById(patientId) || null);
  const [activeTab, setActiveTab] = useState('soap');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchEmrById(patientId);
        if (!active) return;
        setPatient(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch EMR detail', err);
        if (!active) return;
        setError('Unable to load EMR from server. Showing cached data if available.');
        setPatient((prev) => prev || getPatientEmrById(patientId) || null);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [patientId]);

  if (loading && !patient) {
    return (
      <div className="flex min-h-screen bg-background theme-transition">
        <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
          <SideBar />
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-2">
            <Icon name="Loader2" size={32} className="mx-auto animate-spin text-accent" />
            <p className="text-sm text-secondary">Loading EMR...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex min-h-screen bg-background theme-transition">
        <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
          <SideBar />
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md text-center space-y-4">
            <h2 className="text-2xl font-semibold text-primary">Patient not found</h2>
            <p className="text-secondary">
              The requested medical record is not available. Please select another patient.
            </p>
            <button
              onClick={() => navigate('/dentist-portal/profile/patients')}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white"
            >
              <Icon name="ArrowLeft" size={16} />
              Back to My Patients
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderList = (items = [], fallback = 'No data recorded') => (
    <ul className="space-y-2 mt-3">
      {items.length
        ? items.map((item, idx) => (
            <li key={`${item}-${idx}`} className="flex items-start gap-2 text-sm text-secondary">
              <Icon name="BadgeCheck" size={14} className="text-accent mt-0.5" />
              <span>{item}</span>
            </li>
          ))
        : (
            <li className="text-sm text-secondary">{fallback}</li>
          )}
    </ul>
  );

  const renderField = (label, value) => (
    <div>
      <p className="text-xs uppercase tracking-[0.3em] text-secondary">{label}</p>
      <p className="text-sm font-semibold text-primary mt-1">{value || '-'}</p>
    </div>
  );

  const patientAvatar = patient.profilePicture || patient.avatar;

  const renderSoapTab = () => (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border/40 bg-surface p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            {patientAvatar && (
              <div className="w-16 h-16 rounded-2xl overflow-hidden border border-border/30">
                <img
                  src={patientAvatar}
                  alt={patient.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">Patient</p>
              <h2 className="text-2xl font-semibold text-primary">{patient.name}</h2>
              <p className="text-sm text-secondary">
                RM {patient.rmNumber} • NIK {patient.nik}
              </p>
              <div className="flex flex-wrap gap-3 mt-2 text-xs uppercase tracking-[0.3em] text-secondary">
                {patient.preferredLanguage && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/5 px-3 py-1">
                    <Icon name="Languages" size={12} />
                    {patient.preferredLanguage.toUpperCase()}
                  </span>
                )}
                {patient.contact?.phone && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/5 px-3 py-1">
                    <Icon name="Phone" size={12} />
                    {patient.contact.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right space-y-1">
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">Last Visit</p>
            <p className="text-lg font-semibold text-primary">{formatDateLabel(patient.lastVisit)}</p>
            <p className="text-xs text-secondary">{formatDateTimeLabel(patient.lastUpdated)}</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3 mt-6 text-sm">
          {renderField('Age', patient.age ? `${patient.age} yrs` : '-')}
          {renderField('Gender', patient.gender)}
          {renderField('Date of Birth', formatDateLabel(patient.dob))}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-rose-200/40 bg-rose-50/30 dark:bg-rose-500/5 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-rose-500">Allergies</p>
            {renderList(patient.alerts?.allergies || [], 'No allergy recorded')}
          </div>
          <div className="rounded-2xl border border-amber-200/40 bg-amber-50/40 dark:bg-amber-500/5 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-amber-500">Systemic Conditions</p>
            {renderList(patient.alerts?.systemic || [], 'No systemic condition recorded')}
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-primary/15 bg-background/60 p-4 space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">Contact</p>
            {renderField('Phone', patient.contact?.phone)}
            {renderField('Email', patient.contact?.email)}
          </div>
          <div className="rounded-2xl border border-primary/15 bg-background/60 p-4 space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">Address</p>
            <p className="text-sm text-primary">
              {[patient.address?.line1, patient.address?.line2].filter(Boolean).join(', ') || '-'}
            </p>
            <p className="text-xs text-secondary">
              {[patient.address?.city, patient.address?.province, patient.address?.postalCode].filter(Boolean).join(', ')}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border/40 bg-surface p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-primary">Subjective</h3>
          <span className="text-xs uppercase tracking-[0.3em] text-secondary">S</span>
        </div>
        <div className="space-y-4 text-sm">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">Chief Complaint</p>
            <p className="text-primary mt-1">{patient.chiefComplaint}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">Medical History</p>
            <p className="text-primary mt-1">{patient.medicalHistory}</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border/40 bg-surface p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-primary">Objective</h3>
          <span className="text-xs uppercase tracking-[0.3em] text-secondary">O</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-primary/15 bg-background/60 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">Vital Signs</p>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-secondary/70">Blood Pressure</p>
                <p className="font-semibold text-primary">{patient.vitals?.bloodPressure || '-'}</p>
              </div>
              <div>
                <p className="text-secondary/70">Heart Rate</p>
                <p className="font-semibold text-primary">{patient.vitals?.heartRate || '-'}</p>
              </div>
              <div>
                <p className="text-secondary/70">Temperature</p>
                <p className="font-semibold text-primary">{patient.vitals?.temperature || '-'}</p>
              </div>
              <div>
                <p className="text-secondary/70">SpO₂</p>
                <p className="font-semibold text-primary">{patient.vitals?.spo2 || '-'}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-primary/15 bg-background/60 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">Extra Oral</p>
            {renderList(patient.extraOral)}
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-primary/15 bg-background/60 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-secondary">Intra Oral</p>
          {renderList(patient.intraOral)}
        </div>
      </section>

      <section className="rounded-3xl border border-border/40 bg-surface p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-primary">Assessment</h3>
          <span className="text-xs uppercase tracking-[0.3em] text-secondary">A</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 text-sm">
          <div className="rounded-2xl border border-primary/15 bg-background/60 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">Working Diagnosis</p>
            <p className="text-primary font-semibold mt-2">{patient.diagnoses.working}</p>
          </div>
          <div className="rounded-2xl border border-primary/15 bg-background/60 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">ICD-10 Code</p>
            <p className="text-primary font-semibold mt-2">{patient.diagnoses.icd10}</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border/40 bg-surface p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-primary">Plan & Procedures</h3>
          <span className="text-xs uppercase tracking-[0.3em] text-secondary">P</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 text-sm">
          <div className="rounded-2xl border border-primary/15 bg-background/60 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">Treatment Plan</p>
            {renderList(patient.plan?.treatmentPlan || [])}
          </div>
          <div className="rounded-2xl border border-primary/15 bg-background/60 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">Procedures & ICD-9-CM</p>
            <ul className="space-y-3 mt-3">
              {(patient.plan?.procedures || []).map((procedure) => (
                <li key={procedure.label} className="rounded-xl border border-border/40 p-3">
                  <p className="text-primary font-semibold">{procedure.label}</p>
                  <p className="text-xs text-secondary">
                    ICD-9-CM {procedure.icd9} • {procedure.status}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-primary/15 bg-background/60 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">Medications</p>
            {patient.plan?.medications?.length ? (
              <ul className="space-y-2 mt-3">
                {patient.plan.medications.map((med) => (
                  <li key={med.name}>
                    <p className="text-sm font-semibold text-primary">{med.name}</p>
                    <p className="text-xs text-secondary">{med.dosage}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-secondary mt-2">No prescription issued.</p>
            )}
          </div>
          <div className="rounded-2xl border border-primary/15 bg-background/60 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">KIE Notes</p>
            {renderList(patient.plan?.kie || [])}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border/40 bg-surface p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-primary">Family & Insurance</h3>
          <Icon name="Shield" size={18} className="text-secondary" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 text-sm">
          <div className="rounded-2xl border border-primary/15 bg-background/60 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">Emergency Contact</p>
            <p className="text-primary font-semibold mt-1">{patient.emergencyContact?.name || '-'}</p>
            <p className="text-xs text-secondary">{patient.emergencyContact?.relationship}</p>
            <p className="text-xs text-secondary">{patient.emergencyContact?.phone}</p>
          </div>
          <div className="rounded-2xl border border-primary/15 bg-background/60 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">Insurance</p>
            <p className="text-primary font-semibold mt-1">{patient.insurance?.provider || 'Private'}</p>
            <p className="text-xs text-secondary">No: {patient.insurance?.number || '-'}</p>
            <p className="text-xs text-secondary">Member ID: {patient.insurance?.memberId || '-'}</p>
          </div>
        </div>
      </section>
    </div>
  );

  const renderOdontogramTab = () => (
    <section className="rounded-3xl border border-border/40 bg-surface p-5 shadow-sm">
      <AdvancedOdontogram
        value={patient.odontogramMarks || []}
        readOnly
        showToolbar={false}
      />
    </section>
  );

  const renderDocumentsTab = () => (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border/40 bg-surface p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-primary">Prescription & Documents</h3>
          <button className="inline-flex items-center gap-2 rounded-xl border border-border/40 px-3 py-1.5 text-xs uppercase tracking-[0.3em] text-secondary hover:text-primary">
            <Icon name="UploadCloud" size={16} />
            Add
          </button>
        </div>
        <div className="space-y-3">
          {(patient.documents || []).map((doc) => (
            <div key={doc.name} className="flex items-center justify-between rounded-2xl border border-border/30 bg-background/60 p-4">
              <div>
                <p className="text-sm font-semibold text-primary">{doc.type}</p>
                <p className="text-xs text-secondary">{doc.name}</p>
              </div>
              <button className="inline-flex items-center gap-2 text-sm text-primary hover:text-accent">
                <Icon name="Download" size={16} />
                Download
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-border/40 bg-surface p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-primary mb-4">Legal & Consent</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-primary/15 bg-background/60 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">Informed Consent</p>
            <p className="text-sm font-semibold text-primary mt-1">{patient.consent?.status || 'Pending'}</p>
            <p className="text-xs text-secondary mt-1">Witness: {patient.consent?.witness || '-'}</p>
          </div>
          <div className="rounded-2xl border border-primary/15 bg-background/60 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">Doctor Signature</p>
            <p className="text-sm font-semibold text-primary mt-1">{patient.doctorSignature || 'Pending'}</p>
            <p className="text-xs text-secondary mt-1">{formatDateTimeLabel(patient.lastUpdated)}</p>
          </div>
        </div>
      </section>
    </div>
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'odontogram':
        return renderOdontogramTab();
      case 'documents':
        return renderDocumentsTab();
      default:
        return renderSoapTab();
    }
  };

  return (
    <div className="flex min-h-screen bg-background theme-transition">
      <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
        <SideBar />
      </div>
      <div className="flex-1 min-w-0">
        <div className="p-6 md:p-8 space-y-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <button
              onClick={() => navigate('/dentist-portal/profile/patients')}
              className="inline-flex items-center gap-2 text-sm text-secondary hover:text-primary"
            >
              <Icon name="ArrowLeft" size={16} />
              Back to My Patients
            </button>
            <div className="flex flex-wrap gap-3">
              <button className="inline-flex items-center gap-2 rounded-xl border border-border/40 px-4 py-2 text-sm font-medium text-primary hover:border-accent hover:text-accent">
                <Icon name="Printer" size={16} />
                Print EMR
              </button>
              <button className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm">
                <Icon name="Edit" size={16} />
                Update Record
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-200/40 bg-rose-500/5 p-4 text-sm text-rose-600">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 border-b border-border/40">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium transition border-b-2 ${
                  activeTab === tab.id ? 'border-accent text-primary' : 'border-transparent text-secondary hover:text-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {renderActiveTab()}
        </div>
      </div>
    </div>
  );
};

export default ElectronicMedicalRecordScreen;
