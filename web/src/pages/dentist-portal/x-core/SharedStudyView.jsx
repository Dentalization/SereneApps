import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import AppIcon from '../../../components/AppIcon';
import Viewer3D from './components/Viewer3D';

function pickInitialSeries(seriesList) {
  if (!Array.isArray(seriesList) || seriesList.length === 0) return null;
  return (
    seriesList.find((series) => series.type === '3D Volume' && series.status === 'ready') ||
    seriesList.find((series) => series.status === 'ready') ||
    seriesList[0]
  );
}

function buildSharedStudy(payload, token) {
  const initialSeries = pickInitialSeries(payload.series || []);

  return {
    id: payload.folderName,
    folderName: payload.folderName,
    patientName: payload.patientName,
    originalName: payload.patientName,
    selectedSeriesUid: initialSeries?.series_uid || '',
    selectedSeriesType: initialSeries?.type || '3D Volume',
    shareToken: token,
    readOnly: true,
    series: payload.series || [],
    shareExpiresAt: payload.expiresAt,
  };
}

const SharedStudyView = () => {
  const { token = '' } = useParams();
  const [study, setStudy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadSharedStudy = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/v1/x-core/share/${encodeURIComponent(token)}`);
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.error || (response.status === 410 ? 'Link expired' : 'Shared study not found'));
        }

        if (!cancelled) {
          setStudy(buildSharedStudy(payload, token));
        }
      } catch (nextError) {
        if (!cancelled) {
          setStudy(null);
          setError(nextError.message || 'Link expired');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadSharedStudy();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const seriesOptions = useMemo(() => study?.series || [], [study]);

  const handleSeriesChange = (event) => {
    const nextSeriesUid = event.target.value;
    setStudy((current) => {
      if (!current) return current;
      const nextSeries = (current.series || []).find((series) => series.series_uid === nextSeriesUid);
      if (!nextSeries) return current;

      return {
        ...current,
        selectedSeriesUid: nextSeries.series_uid,
        selectedSeriesType: nextSeries.type,
      };
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
        <div className="flex flex-col items-center gap-4 text-center">
          <AppIcon name="Loader2" size={42} className="animate-spin text-cyan-400" />
          <div>
            <p className="text-lg font-semibold">Loading Shared Study</p>
            <p className="mt-1 text-sm text-slate-400">Preparing read-only imaging view...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !study) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
        <div className="max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-8 text-center text-slate-100 shadow-2xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-300">
            <AppIcon name="Link2Off" size={28} />
          </div>
          <h1 className="text-2xl font-bold">Link expired</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            {error || 'This shared study link is no longer available.'}
          </p>
        </div>
      </div>
    );
  }

  if (!seriesOptions.length) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
        <div className="max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-8 text-center text-slate-100 shadow-2xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800 text-cyan-300">
            <AppIcon name="FolderOpen" size={28} />
          </div>
          <h1 className="text-2xl font-bold">No Viewable Series</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            This shared study was found, but no renderable DICOM series are currently available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="border-b border-slate-800 bg-slate-900/95 px-4 py-4 backdrop-blur-sm md:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-cyan-300">
              <AppIcon name="ShieldCheck" size={22} />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">Shared View — Read Only</div>
              <h1 className="mt-1 text-xl font-semibold text-white">{study.patientName || 'Shared Study'}</h1>
              <p className="mt-1 text-sm text-slate-400">
                Folder: {study.folderName}
                {study.shareExpiresAt ? ` • Expires ${new Date(study.shareExpiresAt).toLocaleString()}` : ''}
              </p>
            </div>
          </div>

          {seriesOptions.length > 1 && (
            <label className="flex min-w-[220px] flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Series</span>
              <select
                value={study.selectedSeriesUid}
                onChange={handleSeriesChange}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-500"
              >
                {seriesOptions.map((series) => (
                  <option key={series.series_uid} value={series.series_uid}>
                    {series.title} • {series.type}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      <div className="h-[calc(100vh-96px)] p-4 md:p-6">
        <Viewer3D study={study} />
      </div>
    </div>
  );
};

export default SharedStudyView;
