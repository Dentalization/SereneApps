import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Icon from '../../../components/AppIcon';
import ClinicSideBar from '../ui/SideBar-Clinic';
import { useLanguage } from '../../../contexts/LanguageContext';
import clinicService from '../../../services/clinicService';
import { useLocation, useNavigate } from 'react-router-dom';

// Import components
import PatientDetailModal from './components/PatientDetailModal';
import PatientAnalytics from './components/PatientAnalytics';
import PatientReports from './components/PatientReports';
import { useNotifications } from '../../../contexts/NotificationContext';
import { resolveMediaUrl } from '../../../utils/media';
import { usePortalRealtimeRefresh } from '../../../hooks/usePortalRealtimeRefresh';
import { PORTAL_REFRESH_PROFILES } from '../../../collaboration/portalCollaboration.mjs';
import {
  getJakartaDateKey,
  getPatientDentistIds,
  isActiveAppointment,
} from './clinicPatientDataModel.mjs';

// ─── APPOINTMENT STATUS BADGE ───────────────────────────────────────────────
const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'scheduled': return 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-800/50';
    case 'confirmed': return 'text-indigo-700 bg-indigo-50 border-indigo-200 dark:text-indigo-400 dark:bg-indigo-900/20 dark:border-indigo-800/50';
    case 'completed': return 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-800/50';
    case 'cancelled': return 'text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800/50';
    case 'overdue': return 'text-orange-700 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-900/20 dark:border-orange-800/50';
    case 'no-show': return 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-800/50';
    case 'in-progress': return 'text-purple-700 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-900/20 dark:border-purple-800/50';
    default: return 'text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-900/20 dark:border-slate-700/50';
  }
};

const getPatientStatusColor = (status) => {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    case 'new': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    case 'inactive': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const formatDateSafe = (dateString, locale, options) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '-';
  try {
    return d.toLocaleDateString(locale, options);
  } catch (e) {
    return '-';
  }
};


// ─── STAT CARD ──────────────────────────────────────────────────────────────
const StatCard = ({ title, value, icon, iconColor = 'text-accent' }) => (
  <div className="bg-surface-elevated rounded-xl p-5 border border-primary/15">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-medium text-secondary uppercase tracking-wider mb-1">{title}</p>
        <p className="text-2xl font-bold text-primary">{typeof value === 'number' ? value.toLocaleString('id-ID') : value}</p>
      </div>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconColor} bg-current/10`}>
        <Icon name={icon} size={20} className={iconColor} />
      </div>
    </div>
  </div>
);

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────
const PatientsPage = () => {
  const { t, language } = useLanguage();
  const { socket } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const requestSequence = useRef(0);
  const hasLoadedOnce = useRef(false);

  // This is the CLINIC PORTAL — always clinic context.
  // The logged-in user is the clinic admin/owner.
  // They see ALL patients across ALL dentists in their clinic.

  const [activeTab, setActiveTab] = useState('registry');
  const [patients, setPatients] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]); // Real dentists from API
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedDentist, setSelectedDentist] = useState('all'); // Filter by dentist
  const [aptStatusFilter, setAptStatusFilter] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const locale = language === 'id' ? 'id-ID' : 'en-US';

  // ── DATA LOADING ─────────────────────────────────────────────────────────
  const fetchData = useCallback(async ({ silent = false } = {}) => {
    const requestId = ++requestSequence.current;
    if (!silent && !hasLoadedOnce.current) setLoading(true);
    if (!silent) setError(null);

    try {
      // Fetch patients + appointments + dentists in one call
      const data = await clinicService.getClinicPatients();

      if (data && requestId === requestSequence.current) {
        setPatients(data.patients || []);
        setAllAppointments(data.appointments || []);
        setDoctors(data.dentists || []);
        hasLoadedOnce.current = true;
      }
    } catch (err) {
      console.error('❌ Error fetching clinic patients:', err);
      if (requestId !== requestSequence.current) return;
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError('Sesi Anda telah berakhir. Silakan login kembali.');
      } else if (!silent || !hasLoadedOnce.current) {
        setError('Gagal memuat data pasien. Silakan coba lagi.');
      }
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData({ silent: true });
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  usePortalRealtimeRefresh({
    socket,
    events: PORTAL_REFRESH_PROFILES.PATIENTS,
    refresh: () => fetchData({ silent: true })
  });

  // Deep-link to patient history/details based on query parameters
  useEffect(() => {
    if (patients.length === 0) return;
    const params = new URLSearchParams(location.search);
    const patientId = params.get('patientId');
    const tab = params.get('tab');
    if (patientId) {
      const patient = patients.find(p => String(p.id) === String(patientId));
      if (patient) {
        setModalInitialTab(tab || 'overview');
        setSelectedPatient(patient);
        setShowDetailModal(true);
        // Clear query parameters to prevent modal reopening on navigate/refresh
        navigate(location.pathname, { replace: true });
      }
    }
  }, [patients, location.pathname, location.search, navigate]);

  // ── FILTERED PATIENTS (Registry) ─────────────────────────────────────────
  const filteredPatients = useMemo(() => {
    let filtered = patients;

    // Filter by dentist
    if (selectedDentist !== 'all') {
      filtered = filtered.filter(p => getPatientDentistIds(p).includes(String(selectedDentist)));
    }

    // Status filter
    if (activeFilter !== 'all') {
      if (activeFilter === 'newPatients') {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        filtered = filtered.filter(p => new Date(p.createdAt) > oneMonthAgo);
      } else {
        filtered = filtered.filter(p => p.status === activeFilter);
      }
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.phone || '').includes(searchQuery) ||
        (p.email || '').toLowerCase().includes(q) ||
        (p.doctorName || '').toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [patients, activeFilter, searchQuery, selectedDentist]);

  // ── FILTERED APPOINTMENTS ────────────────────────────────────────────────
  const filteredAppointments = useMemo(() => {
    let apts = allAppointments;

    if (selectedDentist !== 'all') {
      apts = apts.filter(a => a.dentistId === selectedDentist);
    }

    if (aptStatusFilter !== 'all') {
      apts = apts.filter(a => a.status === aptStatusFilter);
    }

    return [...apts].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [allAppointments, selectedDentist, aptStatusFilter]);

  // ── PAGINATION ───────────────────────────────────────────────────────────
  const totalPages = Math.ceil(filteredPatients.length / ITEMS_PER_PAGE);
  const paginatedPatients = filteredPatients.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => { setCurrentPage(1); }, [activeFilter, searchQuery, selectedDentist]);

  // ── STATS ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const scopedApts = selectedDentist !== 'all'
      ? allAppointments.filter(a => a.dentistId === selectedDentist)
      : allAppointments;

    const active = filteredPatients.filter(p => p.status === 'active').length;
    const inactive = filteredPatients.filter(p => p.status === 'inactive').length;
    const now = new Date();
    const newThisMonth = filteredPatients.filter(p => {
      const d = new Date(p.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    const totalRevenue = filteredPatients.reduce((sum, p) => sum + (p.totalRevenue || 0), 0);
    const overdueCount = scopedApts.filter(a => a.status === 'overdue').length;
    const todayStr = getJakartaDateKey();
    const todayApts = scopedApts.filter(a => a.date === todayStr).length;
    const upcomingApts = scopedApts.filter(a => isActiveAppointment(a)).length;
    const totalDentists = doctors.length;

    return { active, inactive, newThisMonth, totalRevenue, overdueCount, todayApts, upcomingApts, totalDentists };
  }, [filteredPatients, allAppointments, selectedDentist, doctors]);

  // ── TABS ─────────────────────────────────────────────────────────────────
  const tabs = [
    { id: 'registry', label: t('patients.tabs.registry'), icon: 'Users' },
    { id: 'appointments', label: t('patients.tabs.appointments'), icon: 'Calendar' },
    { id: 'analytics', label: t('patients.tabs.analytics'), icon: 'BarChart2' },
    { id: 'reports', label: t('patients.tabs.reports'), icon: 'FileText' },
  ];

  // ── HANDLERS ─────────────────────────────────────────────────────────────
  const handlePatientAction = (action, patient) => {
    switch (action) {
      case 'view':
        setModalInitialTab('overview');
        setSelectedPatient(patient);
        setShowDetailModal(true);
        break;
      case 'schedule':
        setModalInitialTab('schedule');
        setSelectedPatient(patient);
        setShowDetailModal(true);
        break;
      case 'history':
        setModalInitialTab('history');
        setSelectedPatient(patient);
        setShowDetailModal(true);
        break;
      default:
        break;
    }
  };

  const handleExport = () => {
    const exportData = filteredPatients.map(p => ({
      name: p.name, age: p.age, gender: p.gender, phone: p.phone, email: p.email,
      status: p.status, lastVisit: p.lastVisit, totalVisits: p.totalVisits,
      doctor: p.doctorName, totalRevenue: p.totalRevenue,
    }));
    const headers = Object.keys(exportData[0] || { message: '' });
    const escapeCsv = (value) => {
      const text = value === null || value === undefined ? '' : String(value);
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const rows = exportData.length ? exportData : [{ message: 'Tidak ada data untuk filter yang dipilih' }];
    const dataStr = `\uFEFF${headers.join(',')}\r\n${rows.map(row => headers.map(key => escapeCsv(row[key])).join(',')).join('\r\n')}`;
    const blob = new Blob([dataStr], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `patients-clinic-${getJakartaDateKey()}.csv`;
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  // ── SKELETON LOADING ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen bg-background theme-transition clinic-skeleton">
        <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
          <ClinicSideBar />
        </div>
        <div className="flex-1 min-w-0">
          <div className="p-6 md:p-8 space-y-8">
            <section className="space-y-6 rounded-3xl border border-primary/15 bg-surface-elevated skeleton-surface p-6">
              <div className="space-y-3">
                <div className="h-6 w-64 rounded bg-accent/10 animate-pulse" />
                <div className="h-4 w-80 rounded bg-accent/10 animate-pulse" />
              </div>
              <div className="border-t border-primary/15 pt-4 flex flex-wrap gap-3">
                {tabs.map(tab => <div key={tab.id} className="h-9 w-28 rounded-lg bg-accent/10 animate-pulse" />)}
              </div>
            </section>
            <section className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="rounded-xl border border-primary/15 bg-surface-elevated p-5 space-y-3">
                  <div className="h-3 w-20 rounded bg-accent/10 animate-pulse" />
                  <div className="h-6 w-16 rounded bg-accent/20 animate-pulse" />
                </div>
              ))}
            </section>
            <section className="rounded-xl border border-primary/15 bg-surface-elevated p-6 space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-14 rounded-lg bg-accent/10 animate-pulse" />
              ))}
            </section>
          </div>
        </div>
      </div>
    );
  }

  // ── ERROR STATE ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex min-h-screen bg-background theme-transition">
        <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
          <ClinicSideBar />
        </div>
        <div className="flex-1 min-w-0 flex items-center justify-center">
          <div className="bg-surface-elevated rounded-xl p-8 border border-primary/20 text-center max-w-md">
            <Icon name="AlertCircle" size={48} className="text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-primary mb-2">Error</h3>
            <p className="text-secondary mb-4">{error}</p>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────
  // RENDER TAB CONTENT
  // ────────────────────────────────────────────────────────────────────────
  const renderTabContent = () => {
    try {
      switch (activeTab) {

        // ═══════════════════════════════════════════════════════════════════
        // REGISTRY TAB
        // ═══════════════════════════════════════════════════════════════════
        case 'registry':
          return (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatCard title="Total Pasien" value={filteredPatients.length} icon="Users" iconColor="text-blue-500" />
                <StatCard title="Pasien Aktif" value={stats.active} icon="UserCheck" iconColor="text-green-500" />
                <StatCard title="Perlu Follow-up" value={stats.inactive} icon="UserRoundSearch" iconColor="text-amber-500" />
                <StatCard title="Baru Bulan Ini" value={stats.newThisMonth} icon="Calendar" iconColor="text-indigo-500" />
                <StatCard
                  title="Revenue"
                  value={`Rp ${(stats.totalRevenue / 1000000).toFixed(1)}M`}
                  icon="DollarSign"
                  iconColor="text-emerald-500"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Search */}
                  <div className="relative w-full sm:w-auto">
                    <Icon name="Search" className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Cari pasien atau dokter..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full sm:w-72 rounded-lg border border-primary/20 bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent text-sm"
                    />
                  </div>
                  {/* Status filter */}
                  <select
                    value={activeFilter}
                    onChange={(e) => setActiveFilter(e.target.value)}
                    className="px-3 py-2 pr-8 border border-primary/20 rounded-lg bg-surface text-primary text-sm min-w-[140px] appearance-none focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
                  >
                    <option value="all">Semua Status</option>
                    <option value="active">Aktif</option>
                    <option value="new">Baru</option>
                    <option value="inactive">Tidak Aktif</option>
                  </select>

                  {/* Filter by Dentist */}
                  <select
                    value={selectedDentist}
                    onChange={(e) => setSelectedDentist(e.target.value)}
                    className="px-3 py-2 pr-8 border border-primary/20 rounded-lg bg-surface text-primary text-sm min-w-[200px] appearance-none focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
                  >
                    <option value="all">Semua Dokter ({doctors.length})</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <button onClick={handleExport} className="flex items-center px-4 py-2 border border-primary/20 text-primary rounded-lg hover:bg-surface transition-colors text-sm">
                  <Icon name="Download" size={14} className="mr-2" />
                  Export
                </button>
              </div>

              {/* Empty state */}
              {filteredPatients.length === 0 ? (
                <div className="bg-surface-elevated rounded-xl border border-primary/15 p-12 text-center">
                  <Icon name="Users" size={48} className="mx-auto text-secondary/40 mb-4" />
                  <h3 className="text-lg font-semibold text-primary mb-2">Belum Ada Pasien</h3>
                  <p className="text-sm text-secondary">
                    {patients.length === 0
                      ? 'Belum ada pasien yang membuat appointment di klinik ini.'
                      : 'Tidak ada pasien yang sesuai dengan filter yang dipilih.'}
                  </p>
                </div>
              ) : (
                /* Table */
                <div className="bg-surface-elevated rounded-xl border border-primary/15 overflow-hidden">
                  <div className="px-6 py-4 border-b border-primary/15 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-primary">
                      Daftar Pasien Klinik
                      {selectedDentist !== 'all' && (
                        <span className="ml-2 text-sm font-normal text-secondary">
                          — {doctors.find(d => d.id === selectedDentist)?.name}
                        </span>
                      )}
                    </h3>
                    <span className="text-xs text-secondary">{filteredPatients.length} pasien</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-surface">
                        <tr>
                          <th className="px-5 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Pasien</th>
                          <th className="px-5 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Kontak</th>
                          <th className="px-5 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Dokter</th>
                          <th className="px-5 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Kunjungan Terakhir</th>
                          <th className="px-5 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Status</th>
                          <th className="px-5 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-primary/10">
                        {paginatedPatients.map((patient) => (
                          <tr key={patient.id} className="hover:bg-surface/50 transition-colors">
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <div className="flex items-center">
                                {patient.avatar ? (
                                  <img
                                    src={resolveMediaUrl(patient.avatar)}
                                    alt={patient.name}
                                    className="w-9 h-9 rounded-full object-cover ring-2 ring-accent/20"
                                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                  />
                                ) : null}
                                <div
                                  className="w-9 h-9 bg-accent/10 rounded-full items-center justify-center text-xs font-bold text-accent"
                                  style={{ display: patient.avatar ? 'none' : 'flex' }}
                                >
                                  {(patient.name || '').split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2)}
                                </div>
                                <div className="ml-3">
                                  <div className="text-sm font-medium text-primary">{patient.name}</div>
                                  <div className="text-xs text-secondary">
                                    {patient.age ? `${patient.age} thn` : ''}{patient.age && patient.gender ? ' • ' : ''}{patient.gender === 'M' || patient.gender === 'male' ? 'L' : patient.gender === 'F' || patient.gender === 'female' ? 'P' : ''}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <div className="text-sm text-primary">{patient.phone || '-'}</div>
                              <div className="text-xs text-secondary">{patient.email || '-'}</div>
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <div className="text-sm text-primary">{patient.doctorName || '-'}</div>
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap text-sm text-secondary">
                              {formatDateSafe(patient.lastVisit, locale)}
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <span className={`px-2 py-0.5 text-xs font-medium rounded-full uppercase ${getPatientStatusColor(patient.status)}`}>
                                {patient.status === 'active' ? 'Aktif' : patient.status === 'new' ? 'Baru' : 'Tidak Aktif'}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap text-sm">
                              <div className="flex items-center gap-1">
                                <button onClick={() => handlePatientAction('view', patient)} className="p-1.5 text-accent hover:bg-accent/10 rounded-lg transition-all duration-200 transform hover:scale-110 active:scale-95" title="Lihat" aria-label={`Lihat detail ${patient.name || 'pasien'}`}>
                                  <Icon name="Eye" size={15} />
                                </button>
                                <button onClick={() => handlePatientAction('schedule', patient)} className="p-1.5 text-green-500 hover:bg-green-500/10 rounded-lg transition-all duration-200 transform hover:scale-110 active:scale-95" title="Lihat jadwal pasien" aria-label={`Lihat jadwal ${patient.name || 'pasien'}`}>
                                  <Icon name="CalendarDays" size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-primary/10 flex items-center justify-between">
                      <span className="text-xs text-secondary">
                        {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredPatients.length)} dari {filteredPatients.length}
                      </span>
                      <div className="flex items-center gap-1">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}
                          className="p-1.5 rounded-lg text-secondary hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed">
                          <Icon name="ChevronLeft" size={16} />
                        </button>
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                          const page = currentPage <= 3 ? i + 1 : currentPage + i - 2;
                          if (page < 1 || page > totalPages) return null;
                          return (
                            <button key={page} onClick={() => setCurrentPage(page)}
                              className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${page === currentPage ? 'bg-accent text-white' : 'text-secondary hover:bg-surface'}`}>
                              {page}
                            </button>
                          );
                        })}
                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}
                          className="p-1.5 rounded-lg text-secondary hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed">
                          <Icon name="ChevronRight" size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );

        // ═══════════════════════════════════════════════════════════════════
        // APPOINTMENTS TAB
        // ═══════════════════════════════════════════════════════════════════
        case 'appointments':
          return (
            <div className="space-y-6">
              {/* Appointment Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatCard title="Total" value={filteredAppointments.length} icon="Calendar" iconColor="text-blue-500" />
                <StatCard title="Hari Ini" value={stats.todayApts} icon="Clock" iconColor="text-indigo-500" />
                <StatCard title="Upcoming" value={stats.upcomingApts} icon="CalendarCheck" iconColor="text-green-500" />
                <StatCard title="Overdue" value={stats.overdueCount} icon="AlertTriangle" iconColor="text-orange-500" />
                <StatCard title="Dokter" value={stats.totalDentists} icon="Stethoscope" iconColor="text-purple-500" />
              </div>

              {/* Overdue Alert Banner */}
              {stats.overdueCount > 0 && (
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800/50 flex items-start gap-3">
                  <span className="text-orange-500 text-lg flex-shrink-0">⚠️</span>
                  <div>
                    <h5 className="text-sm font-bold text-orange-700 dark:text-orange-400">
                      {stats.overdueCount} Appointment Overdue & Belum Dibayar
                    </h5>
                    <p className="text-sm text-orange-600 dark:text-orange-300 mt-0.5">
                      Ada {stats.overdueCount} appointment yang sudah melewati jadwal dan belum dibayar. Segera hubungi pasien untuk follow-up.
                    </p>
                  </div>
                </div>
              )}

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <select value={aptStatusFilter} onChange={(e) => setAptStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary text-sm min-w-[140px]">
                  <option value="all">Semua Status</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="no-show">No Show</option>
                </select>

                {/* Filter by Dentist */}
                <select value={selectedDentist} onChange={(e) => setSelectedDentist(e.target.value)}
                  className="px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary text-sm min-w-[180px]">
                  <option value="all">Semua Dokter ({doctors.length})</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Appointment List */}
              <div className="bg-surface-elevated rounded-xl border border-primary/15 overflow-hidden">
                <div className="px-6 py-4 border-b border-primary/15 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-primary">
                    Daftar Appointment Klinik
                    {selectedDentist !== 'all' && (
                      <span className="ml-2 text-sm font-normal text-secondary">
                        — {doctors.find(d => d.id === selectedDentist)?.name}
                      </span>
                    )}
                  </h3>
                  <span className="text-xs text-secondary">{filteredAppointments.length} appointment</span>
                </div>
                <div className="divide-y divide-primary/10">
                  {filteredAppointments.slice(0, 30).map((apt) => (
                    <div key={apt.id} className="px-6 py-4 hover:bg-surface/50 transition-colors">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
                            <Icon name="User" size={18} className="text-accent" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-primary truncate">{apt.patientName}</div>
                            <div className="text-xs text-secondary truncate">{apt.treatment || apt.reason || '-'}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <span className="text-xs text-secondary hidden lg:block px-2 py-0.5 bg-surface rounded-md">{apt.dentistName}</span>
                          <span className="text-xs text-secondary whitespace-nowrap">
                            {formatDateSafe(apt.date, locale)} • {apt.time}
                          </span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full border capitalize ${getStatusColor(apt.status)}`}>
                            {apt.status}
                          </span>
                          <span className="text-xs font-medium text-primary whitespace-nowrap">
                            Rp {(apt.fee || 0).toLocaleString('id-ID')}
                          </span>
                          {!apt.isPaid && apt.status !== 'cancelled' && (
                            <span className="text-xs text-red-500 font-medium">Unpaid</span>
                          )}
                        </div>
                      </div>

                      {/* Overdue alert inline */}
                      {apt.status === 'overdue' && (
                        <div className="mt-3 ml-14 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800/50 flex items-start gap-2">
                          <span className="text-orange-500 text-sm flex-shrink-0">⚠️</span>
                          <div>
                            <span className="text-xs font-bold text-orange-700 dark:text-orange-400 uppercase">Overdue & Unpaid</span>
                            <p className="text-xs text-orange-600 dark:text-orange-300 mt-0.5">
                              Appointment ini sudah melewati jadwal dan belum dibayar. Hubungi pasien untuk follow-up.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {filteredAppointments.length === 0 && (
                    <div className="px-6 py-12 text-center">
                      <Icon name="Calendar" size={40} className="mx-auto text-secondary/40 mb-3" />
                      <p className="text-sm text-secondary">Tidak ada appointment dengan filter ini</p>
                    </div>
                  )}
                  {filteredAppointments.length > 30 && (
                    <div className="px-6 py-4 text-center text-xs text-secondary bg-surface/60">
                      Menampilkan 30 appointment terbaru dari {filteredAppointments.length}. Gunakan filter status atau dokter untuk mempersempit data.
                    </div>
                  )}
                </div>
              </div>
            </div>
          );

        // ═══════════════════════════════════════════════════════════════════
        // ANALYTICS TAB
        // ═══════════════════════════════════════════════════════════════════
        case 'analytics':
          return (
            <PatientAnalytics
              patients={filteredPatients}
              allAppointments={allAppointments}
              selectedDentist={selectedDentist}
              onDentistChange={setSelectedDentist}
              doctors={doctors}
            />
          );

        // ═══════════════════════════════════════════════════════════════════
        // REPORTS TAB
        // ═══════════════════════════════════════════════════════════════════
        case 'reports':
          return (
            <PatientReports
              patients={filteredPatients}
              allAppointments={allAppointments}
              selectedDentist={selectedDentist}
              doctors={doctors}
            />
          );

        default:
          return null;
      }
    } catch (error) {
      console.error('Error rendering tab content:', error);
      return (
        <div className="bg-surface-elevated rounded-xl p-8 border border-primary/20 text-center">
          <Icon name="AlertCircle" size={48} className="text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-primary mb-2">Error Loading Content</h3>
          <p className="text-secondary">Mohon refresh halaman atau coba lagi nanti.</p>
        </div>
      );
    }
  };

  // ── MAIN RENDER ──────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-background theme-transition">
      <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
        <ClinicSideBar />
      </div>

      <div className="flex-1 min-w-0">
        <div className="p-6 md:p-8 space-y-6">
          {/* Header */}
          <section className="clinic-page-header space-y-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1.5">
                <h1 className="text-2xl font-bold text-primary">
                  Patient Management
                </h1>
                <p className="text-sm text-secondary">
                  Kelola rekam medis semua pasien di klinik Anda
                </p>
                {/* Clinic badge */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                  <Icon name="Building2" size={12} />
                  Clinic Portal • {doctors.length} Dokter
                </span>
              </div>
              <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center sm:gap-3">
                {/* Quick dentist summary */}
                <div className="min-w-0 rounded-2xl border border-border/40 bg-surface px-3 py-3 text-center sm:min-w-[120px] sm:px-4">
                  <div className="text-xs uppercase tracking-wide text-secondary">Dokter</div>
                  <div className="text-2xl font-bold text-primary">{doctors.length}</div>
                </div>
                <div className="min-w-0 rounded-2xl border border-border/40 bg-surface px-3 py-3 text-center sm:min-w-[120px] sm:px-4">
                  <div className="text-xs uppercase tracking-wide text-secondary">Total Pasien</div>
                  <div className="text-2xl font-bold text-primary">{patients.length.toLocaleString()}</div>
                </div>
              </div>
            </div>
            <div className="border-t border-border/40 pt-4">
              <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab.id
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-secondary hover:text-primary hover:bg-surface'
                      }`}
                  >
                    <Icon name={tab.icon} size={16} />
                    <span>{tab.label}</span>
                    {/* Overdue badge on appointments tab */}
                    {tab.id === 'appointments' && stats.overdueCount > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-500 text-white">
                        {stats.overdueCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {renderTabContent()}
        </div>
      </div>

      <PatientDetailModal
        patient={selectedPatient}
        isOpen={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedPatient(null); }}
        allAppointments={allAppointments}
        initialTab={modalInitialTab}
      />
    </div>
  );
};

export default PatientsPage;
