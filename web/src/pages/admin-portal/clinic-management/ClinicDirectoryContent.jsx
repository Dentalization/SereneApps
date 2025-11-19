import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { authHttp } from '../../../utils/httpClient';
import ClinicTable from '../../../components/clinic/ClinicTable';
import AppIcon from '../../../components/AppIcon';
import PropTypes from 'prop-types';
import { useLanguage } from '../../../contexts/LanguageContext';

const PAGE_SIZE = 12;
const defaultStats = {
  total: 0,
  pending: 0,
  verified: 0,
  rejected: 0
};

const ClinicDirectoryContent = ({ onView, onCreate, onStatsChange, activeStatus = 'all', onStatusChange }) => {
  const { t } = useLanguage();
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState(activeStatus);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
    limit: PAGE_SIZE
  });
  const [stats, setStats] = useState(defaultStats);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (activeStatus && activeStatus !== statusFilter) {
      setStatusFilter(activeStatus);
      setPage(1);
    }
  }, [activeStatus, statusFilter]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    let isActive = true;

    const fetchClinics = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        params.set('limit', PAGE_SIZE.toString());
        params.set('page', page.toString());

        if (statusFilter && statusFilter !== 'all') {
          params.set('status', statusFilter);
        }
        if (debouncedSearch) {
          params.set('search', debouncedSearch);
        }

        const { data } = await authHttp.get(`/clinic/admin/list?${params.toString()}`);

        if (!isActive) return;

        setClinics(data.clinics || []);

        const normalizedPagination = {
          page: Number(data.pagination?.page ?? page),
          pages: Number(data.pagination?.pages ?? 1),
          total: Number(data.pagination?.total ?? (data.clinics?.length ?? 0)),
          limit: Number(data.pagination?.limit ?? PAGE_SIZE)
        };

        setPagination(normalizedPagination);
      } catch (err) {
        if (!isActive) return;
        console.error('Failed to fetch clinics', err);
        const status = err?.response?.status;
        if ([401, 403, 404].includes(status)) {
          setError(t('admin.clinicManagement.directory.errors.sessionExpired'));
        } else {
          setError(err?.response?.data?.error || err.message || t('admin.clinicManagement.directory.errors.fetchFailed'));
        }
      } finally {
        if (!isActive) return;
        setLoading(false);
        setIsRefreshing(false);
      }
    };

    fetchClinics();

    return () => {
      isActive = false;
    };
  }, [statusFilter, debouncedSearch, page, refreshKey]);

  const fetchStats = useCallback(async () => {
    try {
      const [allRes, pendingRes, verifiedRes, rejectedRes] = await Promise.all([
        authHttp.get('/clinic/admin/list?limit=1'),
        authHttp.get('/clinic/admin/list?limit=1&status=pending'),
        authHttp.get('/clinic/admin/list?limit=1&status=verified'),
        authHttp.get('/clinic/admin/list?limit=1&status=rejected')
      ]);

      const nextStats = {
        total: Number(allRes.data?.pagination?.total ?? allRes.data?.clinics?.length ?? 0),
        pending: Number(pendingRes.data?.pagination?.total ?? pendingRes.data?.clinics?.length ?? 0),
        verified: Number(verifiedRes.data?.pagination?.total ?? verifiedRes.data?.clinics?.length ?? 0),
        rejected: Number(rejectedRes.data?.pagination?.total ?? rejectedRes.data?.clinics?.length ?? 0)
      };

      setStats(nextStats);
      onStatsChange?.(nextStats);
    } catch (err) {
      console.error('Failed to fetch clinic stats', err);
    }
  }, [onStatsChange]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const totalPages = useMemo(() => Math.max(pagination.pages || 1, 1), [pagination.pages]);
  const statusCounts = useMemo(() => ({
    all: stats.total,
    pending: stats.pending,
    verified: stats.verified,
    rejected: stats.rejected
  }), [stats]);

  const statusOptions = useMemo(
    () => [
      { key: 'all', label: t('admin.clinicManagement.directory.status.all'), icon: 'Building2' },
      { key: 'pending', label: t('admin.clinicManagement.directory.status.pending'), icon: 'Clock' },
      { key: 'verified', label: t('admin.clinicManagement.directory.status.verified'), icon: 'ShieldCheck' },
      { key: 'rejected', label: t('admin.clinicManagement.directory.status.rejected'), icon: 'CircleX' }
    ],
    [t]
  );

  const hasFilters = useMemo(() => {
    return (statusFilter && statusFilter !== 'all') || Boolean(debouncedSearch);
  }, [statusFilter, debouncedSearch]);

  const handleStatusFilterChange = (statusKey) => {
    const nextStatus = statusKey === statusFilter ? 'all' : statusKey;
    setStatusFilter(nextStatus);
    setPage(1);
    onStatusChange?.(nextStatus);
  };

  const handleResetFilters = () => {
    setStatusFilter('all');
    setSearchTerm('');
    setDebouncedSearch('');
    setPage(1);
    onStatusChange?.('all');
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey((prev) => prev + 1);
    fetchStats();
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      setPage((prev) => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (page > 1) {
      setPage((prev) => prev - 1);
    }
  };

  const paginationLabel = useMemo(() => {
    if (!pagination.total) return t('admin.clinicManagement.directory.pagination.none');
    const start = (pagination.page - 1) * pagination.limit + 1;
    const end = Math.min(pagination.total, pagination.page * pagination.limit);
    return t('admin.clinicManagement.directory.pagination.range', {
      start,
      end,
      total: pagination.total
    });
  }, [pagination, t]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-primary">
            {t('admin.clinicManagement.directory.title')}
          </h2>
          <p className="text-sm text-secondary mt-1">
            {t('admin.clinicManagement.directory.description')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 rounded-xl border border-border/50 bg-surface px-3 py-2 text-sm font-medium text-secondary transition hover:text-primary hover:border-primary/40"
            disabled={loading && !isRefreshing}
          >
            <AppIcon name="RefreshCw" size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span>
              {isRefreshing
                ? t('admin.clinicManagement.directory.actions.refreshing')
                : t('admin.clinicManagement.directory.actions.refresh')}
            </span>
          </button>
          <button onClick={onCreate} className="inline-flex items-center gap-2 rounded-xl bg-accent px-3 py-2 text-sm font-medium text-white shadow-sm">
            <AppIcon name="Plus" size={14} /> {t('admin.clinicManagement.directory.actions.addClinic')}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md">
          <AppIcon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            className="w-full rounded-xl border border-border/60 bg-surface py-2 pl-9 pr-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition"
            placeholder={t('admin.clinicManagement.directory.search.placeholder')}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {statusOptions.map((option) => {
            const isActive = statusFilter === option.key;
            const count = statusCounts[option.key] ?? 0;
            return (
              <button
                key={option.key}
                onClick={() => handleStatusFilterChange(option.key)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  isActive ? 'border-transparent bg-primary text-white shadow-sm' : 'border-border/50 text-secondary hover:text-primary hover:border-primary/40'
                }`}
              >
                <AppIcon name={option.icon} size={12} />
                <span>{option.label}</span>
                <span className={`min-w-[1.75rem] rounded-full px-1.5 text-center text-[11px] ${isActive ? 'bg-white/15' : 'bg-border/50 text-secondary'}`}>
                  {count}
                </span>
              </button>
            );
          })}
          {hasFilters && (
            <button onClick={handleResetFilters} className="text-xs font-medium text-accent hover:text-accent/80 transition">
              {t('admin.clinicManagement.directory.filters.clear')}
            </button>
          )}
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <div className="rounded-2xl border border-border/40 bg-surface p-4">
        {loading ? (
          <div className="space-y-3">
            <div className="h-4 w-40 rounded bg-accent/10 animate-pulse" />
            <div className="h-48 rounded-xl border border-border/30 bg-accent/5 animate-pulse" />
          </div>
        ) : clinics.length ? (
          <ClinicTable clinics={clinics} onView={onView} />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <AppIcon name="Inbox" size={32} className="text-secondary" />
            <p className="text-sm font-medium text-primary">
              {t('admin.clinicManagement.directory.list.emptyTitle')}
            </p>
            <p className="text-xs text-secondary max-w-sm">
              {t('admin.clinicManagement.directory.list.emptyDescription')}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-border/40 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-secondary">{paginationLabel}</div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevPage}
            disabled={page <= 1 || loading}
            className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-surface px-3 py-1.5 text-xs font-medium text-secondary transition disabled:opacity-50 hover:text-primary hover:border-primary/40"
          >
            <AppIcon name="ChevronLeft" size={12} />
            {t('admin.clinicManagement.directory.pagination.prev')}
          </button>
          <span className="text-xs text-secondary">
            {t('admin.clinicManagement.directory.pagination.pageInfo', {
              page: pagination.page,
              totalPages
            })}
          </span>
          <button
            onClick={handleNextPage}
            disabled={page >= totalPages || loading}
            className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-surface px-3 py-1.5 text-xs font-medium text-secondary transition disabled:opacity-50 hover:text-primary hover:border-primary/40"
          >
            {t('admin.clinicManagement.directory.pagination.next')}
            <AppIcon name="ChevronRight" size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

ClinicDirectoryContent.propTypes = {
  onView: PropTypes.func.isRequired,
  onCreate: PropTypes.func.isRequired,
  onStatsChange: PropTypes.func,
  activeStatus: PropTypes.string,
  onStatusChange: PropTypes.func
};

export default ClinicDirectoryContent;
