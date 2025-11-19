import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { fetchAppointments, rescheduleAppointment, cancelAppointment } from '../../../services/appointmentService';
import Icon from '../../../components/AppIcon';

const formatDisplayDate = (value, locale = 'id-ID') => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const toDateTimeLocalValue = (isoString) => {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const PatientAppointments = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeRescheduleId, setActiveRescheduleId] = useState(null);
  const [formValues, setFormValues] = useState({ startsAt: '', endsAt: '' });
  const [processingId, setProcessingId] = useState(null);
  const [alert, setAlert] = useState(null);

  const isPatient = useMemo(() => user?.roles?.includes('patient'), [user]);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchAppointments({ view: 'patient', includeHistory: true, order: 'asc' });
      const mapped = (response?.appointments || []).map((appointment) => ({
        ...appointment,
        startsAt: appointment.startsAt || appointment.starts_at,
        endsAt: appointment.endsAt || appointment.ends_at,
        statusHistory: appointment.statusHistory || []
      }));
      setAppointments(mapped);
    } catch (err) {
      console.error('Failed to load patient appointments', err);
      setError('Tidak dapat memuat daftar janji temu. Coba lagi beberapa saat lagi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isPatient) {
      setLoading(false);
      return;
    }
    loadAppointments();
  }, [isPatient, loadAppointments]);

  const handleOpenReschedule = (appointment) => {
    setActiveRescheduleId(appointment.id);
    setFormValues({
      startsAt: toDateTimeLocalValue(appointment.startsAt),
      endsAt: toDateTimeLocalValue(appointment.endsAt)
    });
  };

  const handleRescheduleSubmit = async (appointmentId) => {
    if (!formValues.startsAt || !formValues.endsAt) {
      setAlert({ type: 'error', message: 'Harap pilih waktu mulai dan selesai baru.' });
      return;
    }

    setProcessingId(appointmentId);
    try {
      await rescheduleAppointment(appointmentId, {
        startsAt: new Date(formValues.startsAt).toISOString(),
        endsAt: new Date(formValues.endsAt).toISOString(),
        reason: 'Patient requested reschedule via portal'
      });
      setAlert({ type: 'success', message: 'Permintaan penjadwalan ulang berhasil dikirim.' });
      setActiveRescheduleId(null);
      await loadAppointments();
    } catch (err) {
      console.error('Failed to reschedule appointment', err);
      const apiMessage = err?.response?.data?.error || err?.message || 'Gagal mengajukan penjadwalan ulang.';
      setAlert({ type: 'error', message: apiMessage });
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = async (appointmentId) => {
    if (!window.confirm('Batalkan janji temu ini? Kebijakan klinik dapat mengenakan biaya pembatalan.')) {
      return;
    }
    setProcessingId(appointmentId);
    try {
      await cancelAppointment(appointmentId, { reason: 'Patient cancelled via portal' });
      setAlert({ type: 'success', message: 'Janji temu berhasil dibatalkan.' });
      await loadAppointments();
    } catch (err) {
      console.error('Failed to cancel appointment', err);
      const apiMessage = err?.response?.data?.error || err?.message || 'Gagal membatalkan janji temu.';
      setAlert({ type: 'error', message: apiMessage });
    } finally {
      setProcessingId(null);
    }
  };

  if (!isPatient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center space-y-4">
          <Icon name="Lock" size={32} className="mx-auto text-muted" />
          <p className="text-primary font-medium">Halaman ini hanya untuk pasien.</p>
          <p className="text-sm text-secondary">Silakan masuk sebagai pasien untuk melihat dan mengelola janji temu.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-primary">Janji Temu Saya</h1>
          <p className="text-secondary">Lihat, jadwalkan ulang, atau batalkan janji temu mendatang Anda di SereneAI.</p>
        </header>

        {alert && (
          <div
            className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
              alert.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            <Icon name={alert.type === 'success' ? 'CheckCircle' : 'AlertCircle'} size={18} />
            <div className="flex-1">
              <p>{alert.message}</p>
            </div>
            <button onClick={() => setAlert(null)} className="text-xs text-muted hover:text-primary">
              Tutup
            </button>
          </div>
        )}

        {loading ? (
          <div className="bg-surface-elevated border border-primary/10 rounded-2xl p-6 text-center text-secondary">
            Memuat janji temu...
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700">
            {error}
          </div>
        ) : appointments.length === 0 ? (
          <div className="bg-surface-elevated border border-primary/10 rounded-2xl p-6 text-center text-secondary">
            Belum ada janji temu yang dijadwalkan.
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((appointment) => {
              const isRescheduling = activeRescheduleId === appointment.id;
              return (
                <div key={appointment.id} className="bg-surface-elevated border border-primary/10 rounded-2xl p-4 md:p-6 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-primary">#{appointment.id}</span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold theme-transition ${
                          appointment.status === 'confirmed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : appointment.status === 'cancelled'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                        }`}>
                          <Icon name="Activity" size={12} />
                          {appointment.status}
                        </span>
                      </div>
                      <p className="text-primary text-lg font-medium mt-2">
                        {formatDisplayDate(appointment.startsAt)}
                      </p>
                      <p className="text-sm text-secondary">
                        Dengan {appointment.dentist?.name || 'Dokter'} • {appointment.reason || 'Konsultasi'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleOpenReschedule(appointment)}
                        className="inline-flex items-center gap-2 rounded-lg border border-accent/40 px-3 py-2 text-sm text-accent hover:bg-accent/10 transition"
                      >
                        <Icon name="Clock" size={14} />
                        Reschedule
                      </button>
                      <button
                        onClick={() => handleCancel(appointment.id)}
                        disabled={processingId === appointment.id}
                        className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition disabled:opacity-50"
                      >
                        <Icon name="Trash2" size={14} />
                        {processingId === appointment.id ? 'Memproses...' : 'Batalkan'}
                      </button>
                    </div>
                  </div>

                  {isRescheduling && (
                    <div className="bg-surface border border-primary/10 rounded-xl p-4 space-y-3">
                      <h3 className="text-sm font-semibold text-primary">Pilih jadwal baru</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="space-y-1 text-sm">
                          <span className="text-secondary">Mulai</span>
                          <input
                            type="datetime-local"
                            value={formValues.startsAt}
                            onChange={(e) => setFormValues((prev) => ({ ...prev, startsAt: e.target.value }))}
                            className="w-full rounded-lg border border-primary/20 bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                          />
                        </label>
                        <label className="space-y-1 text-sm">
                          <span className="text-secondary">Selesai</span>
                          <input
                            type="datetime-local"
                            value={formValues.endsAt}
                            onChange={(e) => setFormValues((prev) => ({ ...prev, endsAt: e.target.value }))}
                            className="w-full rounded-lg border border-primary/20 bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                          />
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRescheduleSubmit(appointment.id)}
                          disabled={processingId === appointment.id}
                          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition disabled:opacity-60"
                        >
                          <Icon name="RefreshCcw" size={14} />
                          {processingId === appointment.id ? 'Mengirim...' : 'Kirim Permintaan'}
                        </button>
                        <button
                          onClick={() => setActiveRescheduleId(null)}
                          className="text-sm text-secondary hover:text-primary"
                        >
                          Batalkan
                        </button>
                      </div>
                    </div>
                  )}

                  {appointment.statusHistory?.length > 0 && (
                    <div className="bg-surface border border-primary/10 rounded-xl p-4 space-y-2">
                      <h3 className="text-sm font-semibold text-primary">Riwayat Status</h3>
                      <ul className="space-y-1 text-sm text-secondary">
                        {appointment.statusHistory.map((entry) => (
                          <li key={entry.id} className="flex items-center gap-2">
                            <Icon name="Timeline" size={12} className="text-muted" />
                            <span>
                              <strong>{entry.newStatus}</strong> • {formatDisplayDate(entry.createdAt)}
                              {entry.reason ? ` — ${entry.reason}` : ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientAppointments;
