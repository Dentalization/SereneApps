import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../../components/AppIcon';
import { listPatientXcoreStudies } from '../../../../services/specialistWorkspaceService';
import { updateEndoCase } from '../../../../services/endoCoreService';

const EndoXCoreEvidence = ({ evidence, caseId, patientId, editable, onChanged, onError }) => {
  const [studies, setStudies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    if (!editable || !patientId) return;
    let active = true;
    setLoading(true);
    listPatientXcoreStudies(patientId)
      .then((res) => {
        if (active) setStudies(res);
      })
      .catch((err) => {
        console.error('Failed to load patient studies:', err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [editable, patientId]);

  const handleLink = async (studyId) => {
    if (linking) return;
    setLinking(true);
    try {
      await updateEndoCase(caseId, { xcoreStudyId: studyId || null });
      setChanging(false);
      await onChanged?.();
    } catch (err) {
      onError?.(err.response?.data?.error?.message || 'Gagal menghubungkan X-Core study.');
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async () => {
    if (linking) return;
    setLinking(true);
    try {
      await updateEndoCase(caseId, { xcoreStudyId: null });
      setChanging(false);
      await onChanged?.();
    } catch (err) {
      onError?.(err.response?.data?.error?.message || 'Gagal melepaskan X-Core study.');
    } finally {
      setLinking(false);
    }
  };

  const showPicker = editable && (!evidence?.available || changing);

  return (
    <section className="rounded-3xl border border-primary/10 bg-surface p-5 shadow-theme-sm">
      <h2 className="flex items-center gap-2 text-lg font-bold text-primary">
        <Icon name="ScanLine" size={18} /> X-Core Evidence
      </h2>

      {showPicker ? (
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-semibold text-primary">
            Link X-Core Study
            {loading ? (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-secondary">
                <Icon name="Loader2" size={14} className="animate-spin" /> Memuat study…
              </div>
            ) : studies.length === 0 ? (
              <p className="mt-2 text-xs text-secondary">Tidak ada X-Core study yang dapat diakses untuk pasien ini.</p>
            ) : (
              <select
                value={evidence?.referenceId || ''}
                onChange={(e) => handleLink(e.target.value)}
                disabled={linking}
                className="mt-2 w-full rounded-xl border border-primary/15 bg-surface-elevated px-3 py-2 text-sm text-primary outline-none focus:border-accent"
              >
                <option value="">No linked imaging</option>
                {studies.map((study) => (
                  <option key={study.id} value={study.id}>
                    {study.modality} · {study.description || `Study #${study.id}`}
                  </option>
                ))}
              </select>
            )}
          </label>
          {changing && (
            <button
              type="button"
              onClick={() => setChanging(false)}
              className="text-xs font-semibold text-secondary hover:underline"
            >
              Cancel
            </button>
          )}
        </div>
      ) : !evidence?.available ? (
        <div className="mt-4 rounded-2xl border border-dashed border-primary/15 bg-surface-elevated p-5 text-sm text-secondary">
          No imaging linked to this Endo Case.
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-primary/10 bg-surface-elevated p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {evidence.source} · #{evidence.referenceId}
          </p>
          <p className="mt-2 font-semibold text-primary">{evidence.modality || 'Imaging study'}</p>
          <p className="mt-1 text-sm text-secondary">{evidence.description || 'No description'}</p>
          {evidence.openPath && (
            <Link to={evidence.openPath} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent">
              Open in X-Core <Icon name="ExternalLink" size={14} />
            </Link>
          )}
          {editable && (
            <div className="mt-4 flex gap-3 border-t border-primary/10 pt-3">
              <button
                type="button"
                onClick={handleUnlink}
                disabled={linking}
                className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
              >
                Unlink Study
              </button>
              {studies.length > 1 && (
                <button
                  type="button"
                  onClick={() => setChanging(true)}
                  disabled={linking}
                  className="text-xs font-semibold text-accent hover:underline disabled:opacity-50"
                >
                  Change Study
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <p className="mt-4 rounded-2xl bg-accent/5 p-4 text-xs leading-relaxed text-secondary">
        X-Core evidence remains in X-Core and is referenced here without copying images, findings, or annotations.
      </p>
    </section>
  );
};

export default EndoXCoreEvidence;
