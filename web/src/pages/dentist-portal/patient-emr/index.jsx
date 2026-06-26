import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SideBar from '../ui/SideBar';
import Icon from '../../../components/AppIcon';
import { PATIENT_EMR_DATA } from './data';
import AddNewEMR from './components/AddNewEMR';
import { fetchEmrList, createEmrRecord } from '../../../services/emrService';
import { buildEmrPayload, formatDateLabel } from './utils';

const PatientEMRList = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [patients, setPatients] = useState([]);
  const [showAddEmr, setShowAddEmr] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const remote = await fetchEmrList();
        if (!active) return;
        if (Array.isArray(remote)) {
          setPatients(remote);
        } else {
          setPatients(PATIENT_EMR_DATA);
        }
        setError(null);
      } catch (err) {
        console.error('Failed to load EMR list', err);
        if (active) {
          setError('Unable to load EMR records. Showing cached data.');
          setPatients((prev) => (prev.length ? prev : PATIENT_EMR_DATA));
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const handleAddEmr = async (formData) => {
    const recordPayload = buildEmrPayload(formData);
    const fallbackRecord = { ...recordPayload, id: `emr-local-${Date.now()}` };

    setSaving(true);
    try {
      const saved = await createEmrRecord(recordPayload);
      setPatients((prev) => [saved || fallbackRecord, ...prev]);
      setShowAddEmr(false);
      setError(null);
    } catch (err) {
      console.error('Failed to save EMR', err);
      setPatients((prev) => [fallbackRecord, ...prev]);
      setError('Failed to save EMR to server. Displaying local draft.');
    } finally {
      setSaving(false);
    }
  };

  const filteredPatients = useMemo(() => {
    if (!search) return patients;
    return patients.filter((patient) =>
      patient.name.toLowerCase().includes(search.toLowerCase()) ||
      patient.rmNumber.toLowerCase().includes(search.toLowerCase())
    );
  }, [patients, search]);

  return (
    <div className="flex min-h-screen bg-background theme-transition">
      <div
        className="flex-shrink-0"
        style={{ width: 'var(--sidebar-width, 20rem)' }}
      >
        <SideBar />
      </div>
      <div className="flex-1 min-w-0">
        <div className="p-6 md:p-8 space-y-8">
          <section className="clinic-page-header space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.4em] text-secondary">My Patients</p>
                <h1 className="text-3xl font-semibold text-primary">Electronic Medical Records</h1>
                <p className="text-sm text-secondary max-w-2xl">
                  Access electronic medical records (EMR), odontogram, and legal documents for every patient assigned to you.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative">
                  <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search patient or RM number"
                    className="pl-10 pr-4 py-2 rounded-xl border border-border/40 bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                </div>
                <button
                  onClick={() => setShowAddEmr((prev) => !prev)}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl border border-border/40 px-4 py-2 text-sm font-medium text-primary hover:border-accent hover:text-accent disabled:opacity-50"
                >
                  <Icon name="Plus" size={16} />
                  {saving ? 'Saving...' : showAddEmr ? 'Close Form' : 'Add New EMR'}
                </button>
              </div>
            </div>
            {showAddEmr && (
              <div className="rounded-3xl border border-border/40 bg-surface p-5 shadow-sm">
                <AddNewEMR
                  onSubmit={(data) => handleAddEmr(data)}
                  isSubmitting={saving}
                />
              </div>
            )}
          </section>

          {error && (
            <div className="rounded-2xl border border-rose-200/40 bg-rose-500/5 p-4 text-sm text-rose-600">
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="rounded-3xl border border-border/40 bg-surface p-5 shadow-sm animate-pulse space-y-4"
                >
                  <div className="h-4 w-24 bg-primary/10 rounded" />
                  <div className="h-5 w-32 bg-primary/10 rounded" />
                  <div className="h-16 bg-primary/5 rounded-xl" />
                </div>
              ))}
            </div>
          ) : (
            <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredPatients.map((patient) => (
              <article
                key={patient.id}
                className="rounded-3xl border border-border/40 bg-surface p-5 shadow-sm flex flex-col"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-secondary">RM Number</p>
                    <p className="text-sm font-semibold text-primary">{patient.rmNumber}</p>
                  </div>
                  <span className="text-xs text-secondary">
                    Last visit {formatDateLabel(patient.lastVisit)}
                  </span>
                </div>
                <div className="mt-4 space-y-1">
                  <h3 className="text-lg font-semibold text-primary">{patient.name}</h3>
                  <p className="text-sm text-secondary">
                    {patient.gender} • {patient.age != null ? `${patient.age} yrs` : 'Age -'}
                  </p>
                  <p className="text-xs text-secondary/80">NIK {patient.nik}</p>
                </div>
                <div className="mt-4 rounded-2xl border border-primary/15 bg-background/60 p-4 text-sm text-secondary">
                  <p className="text-xs uppercase tracking-[0.3em] text-secondary">Latest Plan</p>
                  <ul className="mt-2 space-y-1">
                    {(patient.plan?.treatmentPlan || []).slice(0, 2).map((item) => (
                      <li key={`${patient.id}-${item}`} className="flex items-start gap-2">
                        <Icon name="Dot" size={16} className="text-accent mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-[0.3em] text-secondary">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-600 px-3 py-1">
                    <Icon name="ShieldCheck" size={12} />
                    SOP-ready
                  </span>
                  {patient.alerts?.allergies?.length ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 text-rose-500 px-3 py-1">
                      <Icon name="AlertTriangle" size={12} />
                      Allergy
                    </span>
                  ) : null}
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    onClick={() => navigate(`/dentist-portal/patient-emr/${patient.id}`)}
                    className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm flex-1 justify-center"
                  >
                    <Icon name="ArrowUpRight" size={16} />
                    Open EMR
                  </button>
                  <button className="inline-flex items-center gap-2 rounded-xl border border-border/40 px-4 py-2 text-sm font-medium text-primary">
                    <Icon name="MessageCircle" size={16} />
                    Contact
                  </button>
                </div>
              </article>
            ))}
            {!filteredPatients.length && (
              <div className="col-span-full rounded-3xl border border-dashed border-border/40 bg-surface p-10 text-center">
                <Icon name="Inbox" size={32} className="mx-auto text-secondary/60" />
                <p className="mt-3 text-lg font-semibold text-primary">No patients found</p>
                <p className="text-secondary">Try adjusting your search or add a new patient to begin.</p>
              </div>
            )}
          </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientEMRList;
