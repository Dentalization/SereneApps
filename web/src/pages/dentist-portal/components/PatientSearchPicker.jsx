import React, { useEffect, useState } from 'react';
import Icon from '../../../components/AppIcon';
import { getDentistPatients } from '../../../services/dentistPortalService';

const PatientSearchPicker = ({ selectedPatient, onSelect }) => {
  const [query, setQuery] = useState('');
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const timeoutId = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const response = await getDentistPatients({
          ...(query.trim() ? { search: query.trim() } : {}),
          limit: 20,
          sortBy: 'lastVisit',
          sortOrder: 'desc',
        });
        if (!cancelled) setPatients(response.patients || []);
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError.response?.data?.error?.message
            || 'Pencarian pasien tidak tersedia.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, query.trim() ? 250 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [query]);

  return (
    <div>
      <label
        htmlFor="specialist-patient-search"
        className="flex items-center gap-2 rounded-xl border border-primary/15 bg-surface-elevated px-3 py-2"
      >
        <Icon name="Search" size={16} className="text-muted" />
        <input
          id="specialist-patient-search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPatients([]);
            onSelect?.(null);
          }}
          placeholder="Cari nama, kode, telepon, atau email"
          aria-label="Cari pasien"
          className="min-w-0 flex-1 bg-transparent text-sm text-primary outline-none"
        />
        {loading && <Icon name="Loader2" size={16} className="animate-spin text-accent" />}
      </label>

      {error && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
        {!loading && !error && patients.length === 0 && (
          <div className="rounded-xl border border-dashed border-primary/15 p-6 text-center">
            <p className="text-sm font-semibold text-primary">
              {query.trim() ? 'Pasien tidak ditemukan' : 'Belum ada pasien yang terhubung'}
            </p>
            <p className="mt-1 text-xs text-secondary">
              Daftar ini hanya menampilkan pasien yang pernah memiliki appointment dengan Anda.
            </p>
          </div>
        )}

        {patients.map((patient) => {
          const selected = String(selectedPatient?.id) === String(patient.id);
          return (
            <button
              key={patient.id}
              type="button"
              onClick={() => onSelect?.(patient)}
              className={`w-full rounded-xl border p-3 text-left transition ${
                selected
                  ? 'border-accent bg-accent/10'
                  : 'border-primary/10 bg-surface hover:border-accent/30'
              }`}
            >
              <p className="text-sm font-semibold text-primary">
                {patient.name || 'Pasien tanpa nama'}
              </p>
              <p className="mt-1 text-xs text-secondary">
                #{patient.patientCode || patient.code || patient.id}
                {patient.phone ? ` · ${patient.phone}` : ''}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PatientSearchPicker;
