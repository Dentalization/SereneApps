import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import ConfirmDialog from '../../../components/ConfirmDialog';
import SideBar from '../ui/SideBar';
import { useToast } from '../../../contexts/ToastContext';
import {
  addSpecialistCaseNote,
  getSpecialistCase,
  updateSpecialistCaseStatus,
} from '../../../services/specialistWorkspaceService';

const NEXT_STATUS = {
  draft: 'active',
  active: 'completed',
  completed: 'archived',
};

const statusLabels = {
  draft: 'Draft',
  active: 'Active',
  completed: 'Completed',
  archived: 'Archived',
};

const statusStyles = {
  draft: 'bg-slate-100 text-slate-700',
  active: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  archived: 'bg-amber-100 text-amber-700',
};

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function patientAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  const birth = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const birthdayPending =
    today.getMonth() < birth.getMonth()
    || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (birthdayPending) age -= 1;
  return age;
}

function displayValue(value) {
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (value && typeof value === 'object') return Object.values(value).filter(Boolean).join(' · ') || '—';
  return value || '—';
}

function formatCaseType(value) {
  return String(value || 'unknown')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

const SpecialistWorkspace = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [caseRecord, setCaseRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [completionSummary, setCompletionSummary] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [archiveConfirmationOpen, setArchiveConfirmationOpen] = useState(false);

  const loadCase = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setCaseRecord(await getSpecialistCase(caseId));
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Specialist Case tidak dapat dimuat.');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    loadCase();
  }, [loadCase]);

  useEffect(() => {
    if (caseRecord?.id) {
      setCompletionSummary(caseRecord.completionSummary || '');
    }
  }, [caseRecord?.id, caseRecord?.completionSummary]);

  const patient = caseRecord?.patient;
  const appointment = caseRecord?.appointment;
  const healthForm = appointment?.healthForm;
  // The Specialist Workspace API intentionally normalizes PatientProfile into
  // medicalContext and insurance.provider for this dentist-only response.
  const medicalDetails = patient?.medicalContext || {};
  const age = useMemo(() => patientAge(patient?.dateOfBirth), [patient?.dateOfBirth]);
  const allergyValue = displayValue(medicalDetails.allergies);
  const hasKnownAllergies = allergyValue !== '—';

  const handleAddNote = async () => {
    const content = noteContent.trim();
    if (!content || savingNote) return;
    setSavingNote(true);
    try {
      await addSpecialistCaseNote(caseId, content);
      setNoteContent('');
      await loadCase();
      toast.success('Catatan klinis ditambahkan.');
    } catch (requestError) {
      toast.error(requestError.response?.data?.error?.message || 'Gagal menambahkan catatan.');
    } finally {
      setSavingNote(false);
    }
  };

  const handleStatus = async (status) => {
    if (changingStatus) return;
    setChangingStatus(true);
    try {
      await updateSpecialistCaseStatus(
        caseId,
        status,
        status === 'completed' ? completionSummary.trim() : null,
      );
      await loadCase();
      toast.success(`Case diperbarui menjadi ${statusLabels[status]}.`);
      return true;
    } catch (requestError) {
      toast.error(requestError.response?.data?.error?.message || 'Gagal memperbarui status case.');
      return false;
    } finally {
      setChangingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-surface-elevated">
        <SideBar />
        <main className="flex flex-1 items-center justify-center">
          <Icon name="Loader2" size={32} className="animate-spin text-accent" />
        </main>
      </div>
    );
  }

  if (error || !caseRecord) {
    return (
      <div className="flex min-h-screen bg-surface-elevated">
        <SideBar />
        <main className="flex flex-1 items-center justify-center p-8">
          <div className="max-w-md rounded-3xl border border-red-200 bg-surface p-8 text-center">
            <Icon name="AlertTriangle" size={32} className="mx-auto text-red-500" />
            <p className="mt-4 font-semibold text-primary">{error || 'Specialist Case tidak ditemukan.'}</p>
            <button type="button" onClick={() => navigate(-1)} className="mt-5 text-sm font-semibold text-accent">
              Kembali
            </button>
          </div>
        </main>
      </div>
    );
  }

  const nextStatus = NEXT_STATUS[caseRecord.status];
  const canArchiveDraft = caseRecord.status === 'draft';
  const canAddNote = caseRecord.status === 'draft' || caseRecord.status === 'active';

  return (
    <div className="flex min-h-screen bg-surface-elevated">
      <SideBar />
      <main className="min-w-0 flex-1 overflow-y-auto p-5 md:p-8">
        <div className="mx-auto max-w-[1600px] space-y-6">
          <header className="rounded-3xl border border-primary/10 bg-surface p-6 shadow-theme-sm">
            <button type="button" onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-secondary hover:text-accent">
              <Icon name="ArrowLeft" size={16} />
              Kembali
            </button>
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-violet-700">
                    {formatCaseType(caseRecord.caseType)}
                  </span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[caseRecord.status]}`}>
                    {statusLabels[caseRecord.status]}
                  </span>
                </div>
                <h1 className="mt-3 text-3xl font-bold text-primary">{caseRecord.title}</h1>
                <p className="mt-2 text-sm text-secondary">
                  {patient?.name} · terakhir diperbarui {formatDate(caseRecord.updatedAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {nextStatus && (
                  <button
                    type="button"
                    onClick={() => handleStatus(nextStatus)}
                    disabled={
                      changingStatus
                      || (nextStatus === 'completed' && !completionSummary.trim())
                    }
                    className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {nextStatus === 'active' && 'Mark Active'}
                    {nextStatus === 'completed' && 'Mark Completed'}
                    {nextStatus === 'archived' && 'Archive'}
                  </button>
                )}
                {canArchiveDraft && (
                  <button
                    type="button"
                    onClick={() => setArchiveConfirmationOpen(true)}
                    disabled={changingStatus}
                    className="rounded-xl border border-amber-300 px-4 py-2.5 text-sm font-semibold text-amber-700 disabled:opacity-60"
                  >
                    Archive
                  </button>
                )}
              </div>
            </div>
          </header>

          <div className="grid gap-6 xl:grid-cols-[minmax(260px,0.8fr)_minmax(420px,1.5fr)_minmax(280px,0.9fr)]">
            <aside className="space-y-5">
              <section className="rounded-3xl border border-primary/10 bg-surface p-5 shadow-theme-sm">
                <h2 className="flex items-center gap-2 text-lg font-bold text-primary">
                  <Icon name="UserRound" size={18} />
                  Patient Context
                </h2>
                <dl className="mt-4 space-y-3 text-sm">
                  <div><dt className="text-muted">Nama</dt><dd className="font-semibold text-primary">{patient?.name}</dd></div>
                  <div><dt className="text-muted">Usia / gender</dt><dd className="text-primary">{age ?? '—'} / {patient?.gender || '—'}</dd></div>
                  <div><dt className="text-muted">Kontak</dt><dd className="break-words text-primary">{patient?.phone || patient?.email || '—'}</dd></div>
                  <div>
                    <dt className="text-muted">Alergi</dt>
                    <dd className="mt-1">
                      <span className={hasKnownAllergies
                        ? 'inline-flex rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 font-semibold text-red-700'
                        : 'text-primary'}
                      >
                        {allergyValue}
                      </span>
                    </dd>
                  </div>
                  <div><dt className="text-muted">Kondisi sistemik</dt><dd className="text-primary">{displayValue(medicalDetails.conditions || medicalDetails.chronicConditions)}</dd></div>
                  <div><dt className="text-muted">Asuransi</dt><dd className="text-primary">{patient?.insurance?.provider || '—'}</dd></div>
                  <div><dt className="text-muted">Kontak darurat</dt><dd className="text-primary">{displayValue(patient?.emergencyContact)}</dd></div>
                </dl>
              </section>

              <section className="rounded-3xl border border-primary/10 bg-surface p-5 shadow-theme-sm">
                <h2 className="flex items-center gap-2 text-lg font-bold text-primary">
                  <Icon name="CalendarClock" size={18} />
                  Appointment
                </h2>
                {appointment ? (
                  <dl className="mt-4 space-y-3 text-sm">
                    <div><dt className="text-muted">Waktu</dt><dd className="text-primary">{formatDate(appointment.startsAt)}</dd></div>
                    <div><dt className="text-muted">Alasan</dt><dd className="text-primary">{appointment.reason || '—'}</dd></div>
                    <div><dt className="text-muted">Status</dt><dd className="capitalize text-primary">{appointment.status}</dd></div>
                  </dl>
                ) : (
                  <p className="mt-3 text-sm text-secondary">Tidak ada appointment yang ditautkan.</p>
                )}
              </section>

              {healthForm && (
                <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5">
                  <h2 className="font-bold text-blue-950">Pre-session Health Form</h2>
                  <dl className="mt-3 space-y-2 text-sm text-blue-950">
                    <div><dt className="font-semibold">Gejala</dt><dd>{healthForm.symptoms || '—'}</dd></div>
                    <div><dt className="font-semibold">Skala nyeri</dt><dd>{healthForm.painLevel ?? '—'}</dd></div>
                    <div><dt className="font-semibold">Alergi</dt><dd>{healthForm.allergies || '—'}</dd></div>
                    <div><dt className="font-semibold">Obat</dt><dd>{healthForm.medications || '—'}</dd></div>
                    <div><dt className="font-semibold">Catatan</dt><dd>{healthForm.notes || '—'}</dd></div>
                  </dl>
                </section>
              )}
            </aside>

            <section className="space-y-5">
              <div className="rounded-3xl border border-primary/10 bg-surface p-6 shadow-theme-sm">
                <h2 className="text-xl font-bold text-primary">Case Work Area</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-secondary">
                  {caseRecord.summary || 'Belum ada ringkasan case.'}
                </p>
                {caseRecord.status === 'active' && (
                  <div className="mt-5 border-t border-primary/10 pt-5">
                    <label
                      htmlFor="specialist-completion-summary"
                      className="text-sm font-semibold text-primary"
                    >
                      Completion summary
                    </label>
                    <p className="mt-1 text-xs text-secondary">
                      Ringkasan yang disetujui dentist. Raw working notes tidak disalin ke EMR.
                    </p>
                    <textarea
                      id="specialist-completion-summary"
                      value={completionSummary}
                      onChange={(event) => setCompletionSummary(event.target.value)}
                      maxLength={4000}
                      rows={4}
                      placeholder="Tuliskan hasil review dan keputusan klinis akhir…"
                      className="mt-3 w-full rounded-2xl border border-primary/15 bg-surface-elevated p-4 text-sm text-primary outline-none focus:border-accent"
                    />
                  </div>
                )}
                {caseRecord.completionSummary && caseRecord.status !== 'active' && (
                  <div className="mt-5 border-t border-primary/10 pt-5">
                    <p className="text-sm font-semibold text-primary">Completion summary</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-secondary">
                      {caseRecord.completionSummary}
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-primary/10 bg-surface p-6 shadow-theme-sm">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-bold text-primary">Clinical Notes</h2>
                  <span className="text-xs text-muted">{caseRecord.notes.length} catatan</span>
                </div>
                <div className="mt-4 space-y-3">
                  {caseRecord.notes.map((note) => (
                    <article key={note.id} className="rounded-2xl bg-surface-elevated p-4">
                      <p className="whitespace-pre-wrap text-sm leading-6 text-primary">{note.content}</p>
                      <p className="mt-3 text-xs text-muted">{note.authorName || 'Dentist'} · {formatDate(note.createdAt)}</p>
                    </article>
                  ))}
                  {caseRecord.notes.length === 0 && (
                    <p className="rounded-2xl border border-dashed border-primary/15 p-6 text-center text-sm text-secondary">
                      Belum ada catatan klinis.
                    </p>
                  )}
                </div>
                {canAddNote && (
                  <div className="mt-5 space-y-3">
                    <label htmlFor="specialist-note" className="text-sm font-semibold text-primary">Add Note</label>
                    <textarea
                      id="specialist-note"
                      value={noteContent}
                      onChange={(event) => setNoteContent(event.target.value)}
                      maxLength={10000}
                      rows={4}
                      placeholder="Tambahkan catatan clinical review…"
                      className="w-full rounded-2xl border border-primary/15 bg-surface-elevated p-4 text-sm text-primary outline-none focus:border-accent"
                    />
                    <button
                      type="button"
                      onClick={handleAddNote}
                      disabled={!noteContent.trim() || savingNote}
                      className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {savingNote ? 'Menyimpan…' : 'Simpan Catatan'}
                    </button>
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-primary/10 bg-surface p-6 shadow-theme-sm">
                <h2 className="text-xl font-bold text-primary">Timeline</h2>
                <ol className="mt-4 space-y-3">
                  {caseRecord.timelineEvents.map((event) => (
                    <li key={event.id} className="flex gap-3 rounded-2xl bg-surface-elevated p-4">
                      <span className="mt-1 h-2.5 w-2.5 flex-none rounded-full bg-accent" />
                      <div>
                        <p className="font-semibold capitalize text-primary">{event.eventType.replaceAll('_', ' ')}</p>
                        <p className="mt-1 text-xs text-muted">{formatDate(event.createdAt)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </section>

            <aside>
              <section className="sticky top-6 rounded-3xl border border-primary/10 bg-surface p-5 shadow-theme-sm">
                <h2 className="flex items-center gap-2 text-lg font-bold text-primary">
                  <Icon name="ScanLine" size={18} />
                  X-Core Evidence
                </h2>
                {caseRecord.xcore?.available ? (
                  <div className="mt-4 space-y-3 text-sm">
                    <p className="font-semibold text-primary">
                      {caseRecord.xcore.source === 'study'
                        ? `${caseRecord.xcore.modality} · ${caseRecord.xcore.description || 'Untitled study'}`
                        : caseRecord.xcore.title}
                    </p>
                    {caseRecord.xcore.source === 'study' && (
                      <dl className="space-y-2 text-secondary">
                        <div>
                          <dt className="text-xs text-muted">Study date</dt>
                          <dd>{formatDate(caseRecord.xcore.studyDate)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted">Series</dt>
                          <dd>{caseRecord.xcore.seriesCount}</dd>
                        </div>
                      </dl>
                    )}
                    <p className="capitalize text-secondary">Status: {caseRecord.xcore.status}</p>
                    <p className="break-all text-xs text-muted">Reference: {caseRecord.xcore.referenceId}</p>
                    {caseRecord.xcore.openPath && (
                      <Link to={caseRecord.xcore.openPath} className="inline-flex items-center gap-2 font-semibold text-accent">
                        Open X-Core
                        <Icon name="ExternalLink" size={14} />
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-primary/15 p-5 text-center">
                    <Icon name="ImageOff" size={24} className="mx-auto text-muted" />
                    <p className="mt-2 text-sm font-semibold text-primary">X-Core evidence belum tersedia</p>
                    {caseRecord.xcore?.referenceId && (
                      <p className="mt-1 break-all text-xs text-muted">{caseRecord.xcore.referenceId}</p>
                    )}
                  </div>
                )}
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
                  AI/X-Core findings are decision-support information and must be verified by a dentist. They are not autonomous diagnosis.
                </div>
              </section>
            </aside>
          </div>
        </div>
      </main>
      <ConfirmDialog
        open={archiveConfirmationOpen}
        title="Archive draft case?"
        description="Case draft akan langsung diarsipkan tanpa melewati tahap active dan completed."
        confirmLabel="Archive Case"
        cancelLabel="Batal"
        tone="danger"
        busy={changingStatus}
        onCancel={() => setArchiveConfirmationOpen(false)}
        onConfirm={async () => {
          const archived = await handleStatus('archived');
          if (archived) setArchiveConfirmationOpen(false);
        }}
      />
    </div>
  );
};

export default SpecialistWorkspace;
