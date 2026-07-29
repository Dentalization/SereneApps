import React, { useMemo, useState } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { useToast } from '../../../../contexts/ToastContext';
import Icon from '../../../../components/AppIcon';
import { listTreatmentTypes, scopeClinicPatientData } from '../clinicPatientDataModel.mjs';
import { buildClinicPatientReport } from '../patientReportModel.mjs';

const downloadReport = (report) => {
  const blob = new Blob([report.content], { type: report.mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = report.filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const formatCurrency = (amount) => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', maximumFractionDigits: 0
}).format(Number(amount) || 0);

const PatientReports = ({
  patients = [],
  allAppointments = [],
  selectedDentist = 'all',
  doctors = [],
}) => {
  const { t, language } = useLanguage();
  const toast = useToast();
  const locale = language === 'id' ? 'id-ID' : 'en-US';
  const [selectedReportType, setSelectedReportType] = useState('patientList');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [filters, setFilters] = useState({ patientType: 'all', treatmentType: 'all' });
  const [generatedReports, setGeneratedReports] = useState([]);

  const reportTypes = [
    { key: 'patientList', label: t('patients.reports.types.patientList'), icon: 'Users' },
    { key: 'visitSummary', label: t('patients.reports.types.visitSummary'), icon: 'Calendar' },
    { key: 'treatmentReport', label: t('patients.reports.types.treatmentReport'), icon: 'Stethoscope' },
    { key: 'demographic', label: t('patients.reports.types.demographic'), icon: 'PieChart' },
    { key: 'dentistPerformance', label: 'Performa Dokter', icon: 'BarChart2' },
  ];

  const dateBounds = useMemo(() => ({
    start: dateRange.start ? new Date(`${dateRange.start}T00:00:00`) : null,
    end: dateRange.end ? new Date(`${dateRange.end}T23:59:59.999`) : null,
  }), [dateRange]);
  const hasInvalidDateRange = Boolean(dateBounds.start && dateBounds.end && dateBounds.start > dateBounds.end);
  const effectiveDateBounds = hasInvalidDateRange ? { start: null, end: null } : dateBounds;

  const treatmentTypes = useMemo(() => listTreatmentTypes(allAppointments), [allAppointments]);
  const scoped = useMemo(() => scopeClinicPatientData({
    patients,
    appointments: allAppointments,
    selectedDentist,
    patientType: filters.patientType,
    treatmentType: filters.treatmentType,
    ...effectiveDateBounds,
  }), [allAppointments, effectiveDateBounds, filters, patients, selectedDentist]);

  const totalRevenue = useMemo(() => scoped.appointments
    .filter((appointment) => appointment.isPaid)
    .reduce((sum, appointment) => sum + (Number(appointment.fee) || 0), 0), [scoped.appointments]);

  const handleGenerateReport = () => {
    if (hasInvalidDateRange) {
      toast.error('Tanggal mulai tidak boleh melewati tanggal akhir.');
      return;
    }
    const generatedAt = new Date();
    const report = buildClinicPatientReport({
      type: selectedReportType,
      patients,
      appointments: allAppointments,
      doctors,
      selectedDentist,
      patientType: filters.patientType,
      treatmentType: filters.treatmentType,
      ...effectiveDateBounds,
      generatedAt,
    });
    downloadReport(report);
    setGeneratedReports((current) => [{ ...report, generatedAt }, ...current].slice(0, 5));
    toast.success(`Laporan berhasil diunduh (${report.rowCount} baris data).`);
  };

  const treatmentCounts = useMemo(() => {
    const counts = new Map();
    scoped.appointments.forEach((appointment) => {
      const key = appointment.treatment || appointment.reason || 'Tidak tercatat';
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [scoped.appointments]);

  const renderPreview = () => {
    if (selectedReportType === 'patientList') {
      return (
        <div className="overflow-x-auto rounded-xl border border-primary/10">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wider text-secondary">
              <tr><th className="px-4 py-3">Pasien</th><th className="px-4 py-3">Usia</th><th className="px-4 py-3">Dokter Perawatan</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Kunjungan</th></tr>
            </thead>
            <tbody className="divide-y divide-primary/10">
              {scoped.patients.slice(0, 5).map((patient) => (
                <tr key={patient.id}>
                  <td className="px-4 py-3 font-medium text-primary">{patient.name || 'Tanpa nama'}</td>
                  <td className="px-4 py-3 text-secondary">{patient.age ?? '—'}</td>
                  <td className="px-4 py-3 text-secondary">{patient.doctorName || '—'}</td>
                  <td className="px-4 py-3 capitalize text-secondary">{patient.status || '—'}</td>
                  <td className="px-4 py-3 text-secondary">{patient.totalVisits ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (selectedReportType === 'treatmentReport') {
      return treatmentCounts.length ? (
        <div className="space-y-3">
          {treatmentCounts.map(([treatment, count]) => (
            <div key={treatment} className="flex items-center justify-between gap-4 rounded-xl bg-surface px-4 py-3">
              <span className="truncate text-sm font-medium text-primary">{treatment}</span>
              <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-bold text-accent">{count} appointment</span>
            </div>
          ))}
        </div>
      ) : <p className="py-8 text-center text-sm text-secondary">Tidak ada treatment pada cakupan filter ini.</p>;
    }

    if (selectedReportType === 'dentistPerformance') {
      return (
        <div className="space-y-3">
          {doctors.filter((doctor) => selectedDentist === 'all' || String(doctor.id) === String(selectedDentist)).map((doctor) => {
            const appointments = scoped.appointments.filter((appointment) => String(appointment.dentistId) === String(doctor.id));
            const revenue = appointments.filter((appointment) => appointment.isPaid)
              .reduce((sum, appointment) => sum + (Number(appointment.fee) || 0), 0);
            return (
              <div key={doctor.id} className="grid grid-cols-3 gap-3 rounded-xl bg-surface px-4 py-3 text-sm">
                <span className="font-medium text-primary">{doctor.name}</span>
                <span className="text-center text-secondary">{appointments.length} appointment</span>
                <span className="text-right font-semibold text-emerald-600">{formatCurrency(revenue)}</span>
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl bg-surface p-4"><p className="text-2xl font-bold text-primary">{scoped.patients.length}</p><p className="text-xs text-secondary">Pasien</p></div>
        <div className="rounded-xl bg-surface p-4"><p className="text-2xl font-bold text-primary">{scoped.appointments.length}</p><p className="text-xs text-secondary">Appointment</p></div>
        <div className="rounded-xl bg-surface p-4"><p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalRevenue)}</p><p className="text-xs text-secondary">Revenue Dibayar</p></div>
        <div className="rounded-xl bg-surface p-4"><p className="text-2xl font-bold text-primary">{new Set(scoped.appointments.map((item) => item.dentistId)).size}</p><p className="text-xs text-secondary">Dokter</p></div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-primary/15 bg-surface-elevated p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-primary">{t('patients.reports.title')}</h3>
          <p className="mt-1 text-sm text-secondary">Semua filter di bawah diterapkan pada preview dan file CSV yang diunduh.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <label className="block text-sm font-medium text-primary">{t('patients.reports.reportType')}</label>
            {reportTypes.map((type) => (
              <button key={type.key} type="button" onClick={() => setSelectedReportType(type.key)}
                className={`flex w-full items-center rounded-xl p-3 text-left transition ${selectedReportType === type.key ? 'bg-accent text-white shadow-sm' : 'border border-primary/15 bg-surface text-secondary hover:text-primary'}`}>
                <Icon name={type.icon} className="mr-3 h-5 w-5" />{type.label}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-primary">{t('patients.reports.filters.dateRange')}</label>
            <div className="grid grid-cols-2 gap-3">
              <input aria-label="Tanggal mulai laporan" type="date" value={dateRange.start} onChange={(event) => setDateRange((current) => ({ ...current, start: event.target.value }))} className="rounded-lg border border-primary/20 bg-surface px-3 py-2 text-primary" />
              <input aria-label="Tanggal akhir laporan" type="date" value={dateRange.end} onChange={(event) => setDateRange((current) => ({ ...current, end: event.target.value }))} className="rounded-lg border border-primary/20 bg-surface px-3 py-2 text-primary" />
            </div>
            <label className="block text-sm font-medium text-primary">{t('patients.reports.filters.patientType')}</label>
            <select value={filters.patientType} onChange={(event) => setFilters((current) => ({ ...current, patientType: event.target.value }))} className="w-full rounded-lg border border-primary/20 bg-surface px-3 py-2 text-primary">
              <option value="all">Semua status</option><option value="new">Baru</option><option value="active">Aktif</option><option value="inactive">Tidak aktif</option>
            </select>
            <label className="block text-sm font-medium text-primary">{t('patients.reports.filters.treatmentType')}</label>
            <select value={filters.treatmentType} onChange={(event) => setFilters((current) => ({ ...current, treatmentType: event.target.value }))} className="w-full rounded-lg border border-primary/20 bg-surface px-3 py-2 text-primary">
              <option value="all">Semua treatment</option>
              {treatmentTypes.map((type) => <option key={type} value={type.toLowerCase()}>{type}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-primary/10 pt-6">
          <p className="text-sm text-secondary">Cakupan saat ini: <strong className="text-primary">{scoped.patients.length} pasien</strong> dan <strong className="text-primary">{scoped.appointments.length} appointment</strong>.</p>
          <button type="button" onClick={handleGenerateReport} className="inline-flex min-h-11 items-center rounded-xl bg-accent px-5 py-2.5 font-semibold text-white transition hover:bg-accent-hover">
            <Icon name="Download" className="mr-2 h-4 w-4" />Unduh CSV
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-primary/15 bg-surface-elevated p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-primary">{t('patients.reports.preview.title')}</h3>
          <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">{selectedDentist === 'all' ? 'Semua Dokter' : doctors.find((doctor) => String(doctor.id) === String(selectedDentist))?.name}</span>
        </div>
        {scoped.patients.length || scoped.appointments.length ? renderPreview() : <p className="py-10 text-center text-sm text-secondary">Tidak ada data untuk kombinasi filter ini.</p>}
      </section>

      <section className="rounded-2xl border border-primary/15 bg-surface-elevated p-6">
        <h3 className="text-lg font-semibold text-primary">Dibuat pada sesi ini</h3>
        <p className="mt-1 text-sm text-secondary">Daftar ini hanya berisi laporan yang benar-benar Anda buat, bukan contoh data.</p>
        {generatedReports.length ? (
          <div className="mt-4 space-y-3">
            {generatedReports.map((report, index) => (
              <div key={`${report.generatedAt.toISOString()}-${index}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface p-4">
                <div><p className="font-medium text-primary">{report.filename}</p><p className="text-xs text-secondary">{report.rowCount} baris • {report.generatedAt.toLocaleString(locale)}</p></div>
                <button type="button" onClick={() => downloadReport(report)} className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold text-accent hover:bg-accent/10"><Icon name="Download" className="mr-2 h-4 w-4" />Unduh lagi</button>
              </div>
            ))}
          </div>
        ) : <div className="mt-4 rounded-xl border border-dashed border-primary/15 px-5 py-8 text-center text-sm text-secondary">Belum ada laporan yang dibuat pada sesi ini.</div>}
      </section>
    </div>
  );
};

export default PatientReports;
