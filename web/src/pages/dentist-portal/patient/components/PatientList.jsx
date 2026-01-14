import React, { useMemo, useState } from 'react';
import Icon from '../../../../components/AppIcon';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { resolvePatientAvatar } from '../../../../utils/mediaHelpers';

const PatientList = ({
  patients = [],
  selectedPatient,
  onPatientSelect,
  searchTerm = '',
  onSearchChange,
  filterStatus = 'all',
  onFilterChange,
}) => {
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const { t, language } = useLanguage();
  const locale = language === 'id' ? 'id-ID' : 'en-US';

  // ---------- helpers ----------
  const lower = (v) => (typeof v === 'string' ? v.toLowerCase() : '');
  const safeDate = (v, fallback) => (v ? new Date(v) : fallback ? new Date(fallback) : null);
  const initials = (name = '') =>
    name.trim().split(/\s+/).map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const formatRelative = (date) => {
    if (!date) return t('dentistPatient.list.labels.noVisits');
    const d = new Date(date);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (Math.abs(diffDays) < 7) {
      return rtf.format(diffDays, 'day');
    }
    const diffWeeks = Math.round(diffDays / 7);
    if (Math.abs(diffWeeks) < 5) {
      return rtf.format(diffWeeks, 'week');
    }
    const diffMonths = Math.round(diffDays / 30);
    if (Math.abs(diffMonths) < 12) {
      return rtf.format(diffMonths, 'month');
    }
    const diffYears = Math.round(diffDays / 365);
    return rtf.format(diffYears, 'year');
  };

  const formatDateDDMMYYYY = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString(locale);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50';
      case 'inactive':
        return 'bg-slate-50 dark:bg-slate-900/20 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/50';
      case 'new':
        return 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/50';
      default:
        return 'bg-slate-50 dark:bg-slate-900/20 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/50';
    }
  };

  const avatarBg = (name = '') => {
    const code = (name.charCodeAt(0) || 65) % 6;
    const palettes = [
      'from-violet-500 to-purple-600',
      'from-emerald-500 to-teal-600',
      'from-blue-500 to-indigo-600',
      'from-amber-500 to-orange-600',
      'from-pink-500 to-rose-600',
      'from-cyan-500 to-sky-600',
    ];
    return palettes[code];
  };

  // ---------- filter + sort ----------
  const filteredPatients = useMemo(() => {
    const term = lower(searchTerm);
    return patients.filter((p) => {
      const matchesSearch =
        lower(p.name).includes(term) ||
        lower(p.patientId).includes(term) ||
        lower(p.email || '').includes(term) ||
        lower(p.phone || '').includes(term);
      const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [patients, searchTerm, filterStatus]);

  const sortedPatients = useMemo(() => {
    const list = [...filteredPatients];
    list.sort((a, b) => {
      let va, vb;
      switch (sortBy) {
        case 'name':
          va = lower(a.name); vb = lower(b.name);
          break;
        case 'lastVisit':
          va = safeDate(a.lastVisit, '1900-01-01'); vb = safeDate(b.lastVisit, '1900-01-01');
          break;
        case 'nextAppointment':
          va = safeDate(a.nextAppointment, '9999-12-31'); vb = safeDate(b.nextAppointment, '9999-12-31');
          break;
        case 'age':
          va = a.age || 0; vb = b.age || 0;
          break;
        default:
          va = lower(a.name); vb = lower(b.name);
      }
      if (va < vb) return sortOrder === 'asc' ? -1 : 1;
      if (va > vb) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredPatients, sortBy, sortOrder]);

  const handleSort = (field) => {
    if (sortBy === field) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(field); setSortOrder('asc'); }
  };

  const statusCounts = useMemo(() => {
    const base = { all: patients.length, active: 0, inactive: 0, new: 0 };
    patients.forEach((p) => {
      if (p.status === 'active') base.active++;
      else if (p.status === 'inactive') base.inactive++;
      else if (p.status === 'new') base.new++;
    });
    return base;
  }, [patients]);

  const getFilterLabel = (status) => {
    const label = t(`dentistPatient.list.filters.${status}`);
    if (typeof label === 'string' && !label.startsWith('dentistPatient')) return label;
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // ---------- UI ----------
  return (
    <div className="bg-surface border border-primary/20 rounded-2xl shadow-theme-lg h-full flex flex-col overflow-hidden theme-transition">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 backdrop-blur bg-surface border-b border-primary/10">
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-primary">{t('dentistPatient.list.title')}</h2>
              <p className="text-sm text-secondary">
                {t('dentistPatient.list.subtitle', { visible: sortedPatients.length, total: patients.length })}
              </p>
            </div>
            <div className="flex items-stretch gap-2 w-1/2 max-w-sm">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Icon name="Search" size={16} className="text-muted" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                  placeholder={t('dentistPatient.list.searchPlaceholder')}
                  className="w-full pl-9 pr-3 py-2 bg-surface-elevated border border-primary/10 rounded-lg focus:ring-2 focus:ring-accent/30 focus:border-accent text-sm text-primary placeholder-muted"
                />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="inline-flex rounded-lg border border-primary/10 bg-surface-elevated p-1">
              {(['all','active','inactive','new']).map(s => {
                const active = filterStatus === s;
                return (
                  <button
                    key={s}
                    onClick={() => onFilterChange && onFilterChange(s)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      active ? 'bg-accent text-white shadow-sm' : 'text-secondary hover:text-primary hover:bg-white/5'
                    }`}
                  >
                    {getFilterLabel(s)}{' '}
                    <span className={`ml-1 text-[10px] ${active ? 'text-white/80' : 'text-muted'}`}>{statusCounts[s]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {sortedPatients.length ? (
          <ul className="space-y-4 p-4">
            {sortedPatients.map((p) => {
              const isSelected = selectedPatient?.id === p.id;
              const patientAvatar = resolvePatientAvatar(p);
              const hasAvatar = Boolean(patientAvatar);
              return (
                <li key={p.id}>
                  {/* Main Card - hanya avatar, nama, ID, age, gender, phone */}
                  <button
                    onClick={() => onPatientSelect && onPatientSelect(p)}
                    className={`w-full text-left rounded-xl border transition-all duration-200 px-4 py-4 md:px-6 md:py-5 ${
                      isSelected
                        ? 'bg-accent/10 border-accent/40 ring-2 ring-accent/20 shadow-lg'
                        : 'bg-surface-elevated border-primary/10 hover:bg-surface hover:border-primary/20 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-2xl shadow-lg flex items-center justify-center font-bold text-sm text-white overflow-hidden ${
                          hasAvatar ? 'bg-surface' : `bg-gradient-to-br ${avatarBg(p.name)}`
                        }`}
                      >
                        {hasAvatar ? (
                          <img
                            src={patientAvatar}
                            alt={`${p.name || 'Patient'} avatar`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          initials(p.name)
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-primary text-sm truncate max-w-[180px] md:max-w-[200px]">
                            {p.name}
                          </h3>
                          {p.aiResults?.length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50">
                              {t('dentistPatient.list.badges.ai')}
                            </span>
                          )}
                          {p.medicalHistory?.allergies?.length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50">
                              {t('dentistPatient.list.badges.allergy')}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-secondary truncate">
                          {t('dentistPatient.list.labels.id', { id: p.patientId })} •{' '}
                          {t('dentistPatient.list.labels.ageShort', { age: p.age ?? '-' })} •{' '}
                          <span className="capitalize">
                            {p.gender
                              ? t(`dentistPatient.list.labels.gender.${p.gender.toLowerCase()}`)
                              : t('dentistPatient.list.labels.gender.unknown')}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-secondary min-w-0">
                          <Icon name="Phone" size={12} className="text-accent flex-shrink-0" />
                          <span className="truncate">{p.phone || '—'}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-10 text-center">
            <div className="w-16 h-16 bg-surface-elevated rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/10">
              <Icon name="Users" size={24} className="text-muted" />
            </div>
            <h3 className="text-lg font-medium text-primary mb-2">{t('dentistPatient.list.empty.title')}</h3>
            <p className="text-secondary mb-4">
              {searchTerm || filterStatus !== 'all'
                ? t('dentistPatient.list.empty.adjustFilters')
                : t('dentistPatient.list.empty.addFirst')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientList;
