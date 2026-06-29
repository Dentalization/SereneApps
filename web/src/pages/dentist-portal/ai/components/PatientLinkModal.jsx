import React, { useEffect, useState } from 'react';
import { Loader2, Search, ShieldAlert, X } from 'lucide-react';
import { authHttp } from '../../../../utils/httpClient.js';
import ModalPortal from '../../../../components/ui/ModalPortal';

export default function PatientLinkModal({ isOpen, onClose, onConfirm }) {
  const [query, setQuery] = useState('');
  const [patients, setPatients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setPatients([]);
      setSelected(null);
      setQuery('');
      return undefined;
    }
    let cancelled = false;
    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const search = query.trim();
        const response = await authHttp.get('/dentist-portal/patients', {
          params: { ...(search ? { search } : {}), limit: 20, sortBy: 'lastVisit', sortOrder: 'desc' },
        });
        if (!cancelled) setPatients(response.data?.patients || []);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, query.trim() ? 250 : 0);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [isOpen, query]);

  if (!isOpen) return null;

  const confirmDisabled = !selected;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Tautkan pasien</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Konfirmasi identitas sebelum menautkan kasus klinis ini.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup modal tautan pasien" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => { setQuery(event.target.value); setSelected(null); }}
              placeholder="Cari nama, kode, telepon, atau email"
              aria-label="Cari pasien"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />}
          </label>

          {error && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
              Pencarian pasien tidak tersedia. Coba lagi setelah layanan dapat dijangkau.
            </div>
          )}

          <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
            {!isLoading && !error && patients.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center dark:border-slate-700">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {query.trim() ? 'Pasien tidak ditemukan' : 'Belum ada pasien yang terhubung'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {query.trim()
                    ? 'Periksa nama, kode, telepon, atau email pasien.'
                    : 'Daftar ini hanya menampilkan pasien yang pernah memiliki appointment dengan Anda.'}
                </p>
              </div>
            )}
            {patients.map((patient) => {
              const isSelected = selected?.id === patient.id;
              return (
                <button
                  key={patient.id}
                  type="button"
                  onClick={() => setSelected(patient)}
                  className={`w-full rounded-xl border p-3 text-left transition-colors ${
                    isSelected
                      ? 'border-indigo-400 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/30'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{patient.name || 'Pasien tanpa nama'}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Kode/MRN: {patient.patientCode || patient.code || patient.id} · Telepon: {patient.phone || 'tidak tersedia'}
                  </p>
                  {(patient.lastVisit || patient.nextAppointment) && (
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      {patient.lastVisit ? `Kunjungan terakhir: ${new Date(patient.lastVisit).toLocaleDateString('id-ID')}` : ''}
                      {patient.lastVisit && patient.nextAppointment ? ' · ' : ''}
                      {patient.nextAppointment ? `Jadwal berikutnya: ${new Date(patient.nextAppointment).toLocaleDateString('id-ID')}` : ''}
                    </p>
                  )}
                  {(patient.dob || patient.email) && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Tgl lahir: {patient.dob || 'tidak tersedia'} · {patient.email || ''}</p>
                  )}
                </button>
              );
            })}
          </div>

          {selected && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
              <div className="flex gap-2">
                <ShieldAlert className="mt-0.5 h-4 w-4 text-amber-700 dark:text-amber-300" />
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Pastikan ini adalah pasien yang tepat sebelum menautkan. Tindakan ini mencatat audit event dan memengaruhi timeline pasien.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">Batal</button>
          <button
            type="button"
            disabled={confirmDisabled}
            onClick={() => {
              onConfirm?.({
                patient_id: selected.id,
                patient_name: selected.name,
                patient_code: selected.patientCode || selected.code || selected.id,
              });
              onClose?.();
            }}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Konfirmasi tautan
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
