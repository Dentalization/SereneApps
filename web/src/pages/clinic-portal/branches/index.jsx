import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { shouldSuppressToastMessage } from '../../../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import AppIcon from '../../../components/AppIcon';
import ModalPortal from '../../../components/ui/ModalPortal';
import ClinicSideBar from '../ui/SideBar-Clinic';
import BranchOverview from './components/BranchOverview';
import BranchDirectory from './components/BranchDirectory';
import BranchRevenueChart from './components/BranchRevenueChart';
import BranchAddModal from './components/BranchAddModal';
import BranchEditModal from './components/BranchEditModal';
import BranchDeleteDialog from './components/BranchDeleteDialog';
import clinicService from '../../../services/clinicService';
import httpClient from '../../../utils/httpClient';
import { getAccessToken } from '../../../utils/auth/tokenStorage';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useNotifications } from '../../../contexts/NotificationContext';
import { usePortalRealtimeRefresh } from '../../../hooks/usePortalRealtimeRefresh';
import { PORTAL_REFRESH_PROFILES } from '../../../collaboration/portalCollaboration.mjs';
import { formToBranchPayload, normalizeBranch } from './branchData.mjs';

const BranchManagement = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user, logout } = useAuth();
  const { socket } = useNotifications();
  
  // Check if user has access (owner or manager only) - improved detection
  const hasAccess = useMemo(() => {
    if (!user) {
      return false;
    }

    const normalizedRoles = Array.isArray(user.roles)
      ? user.roles
      : user.role
      ? [user.role]
      : [];

    const detectedRole = user.role || normalizedRoles[0] || null;
    const ownerRoles = new Set(['owner', 'clinic_owner']);
    const managerRoles = new Set(['manager', 'clinic_manager', 'clinic_admin']);

    const hasOwnerAccess =
      ownerRoles.has(detectedRole) ||
      normalizedRoles.some((role) => ownerRoles.has(role));
    const hasManagerAccess =
      managerRoles.has(detectedRole) ||
      normalizedRoles.some((role) => managerRoles.has(role));

    return hasOwnerAccess || hasManagerAccess;
  }, [user]);

  const [branches, setBranches] = useState([]);
  const [ownerInfo, setOwnerInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [notice, setNotice] = useState(null);
  const [showTokenExpiredModal, setShowTokenExpiredModal] = useState(false);

  const MIN_LOADING_MS = 900;
  const loadStartRef = useRef(Date.now());
  const loadingTimerRef = useRef(null);

  // Modal states
  const [addBranchModal, setAddBranchModal] = useState(false);
  const [editBranchModal, setEditBranchModal] = useState(null);
  const [deleteBranchModal, setDeleteBranchModal] = useState(null);

  // Form loading states
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Revenue data
  const [revenueData, setRevenueData] = useState([]);
  const [revenueLoading, setRevenueLoading] = useState(false);

  const finishLoading = useCallback(() => {
    const finalize = () => {
      setLoading(false);
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
    };
    const elapsed = Date.now() - loadStartRef.current;
    const remaining = MIN_LOADING_MS - elapsed;
    if (remaining > 0) {
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = setTimeout(finalize, remaining);
    } else {
      finalize();
    }
  }, []);

  useEffect(() => {
    return () => {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
    };
  }, []);

  // Don't redirect, just show access denied message instead
  // useEffect(() => {
  //   if (!hasAccess && user) {
  //     console.log('🚫 Access denied, redirecting to dashboard');
  //     navigate('/clinic-portal', { replace: true });
  //   }
  // }, [hasAccess, user, navigate]);

  const extractBranchesFromPayload = (payload) => {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.branches)) return payload.branches;
    if (Array.isArray(payload.data?.branches)) return payload.data.branches;
    return [];
  };

  // Fetch branches data - using centralized clinic service
  const fetchBranches = useCallback(async () => {
    loadStartRef.current = Date.now();
    setLoading(true);
    setError(null);

    const token = getAccessToken();
    if (!token) {
      console.warn('🔒 No active clinic session found');
      setShowTokenExpiredModal(true);
      finishLoading();
      return;
    }

    try {
      const data = await clinicService.getBranches();
      const owner = data?.owner || data?.data?.owner || null;
      const branchList = extractBranchesFromPayload(data)
        .map((branch) => normalizeBranch(branch, owner))
        .filter(Boolean);

      setOwnerInfo(owner);
      setBranches(branchList);
    } catch (error) {
      const errorMsg = error?.message || 'Failed to load branches';
      if (!shouldSuppressToastMessage(errorMsg)) {
        setError(`Failed to load branches: ${errorMsg}`);
      } else {
        setError(null);
      }
      setBranches([]);
      setOwnerInfo(null);
      if (process.env.NODE_ENV !== 'production') {
        console.error('❌ Error fetching branches:', error);
      }
    } finally {
      finishLoading();
    }
  }, [finishLoading]);

  // Fetch revenue data for all branches
  const fetchRevenueData = useCallback(async () => {
    setRevenueLoading(true);
    
    try {
      const token = getAccessToken();
      if (!token) {
        setRevenueLoading(false);
        return;
      }

      const response = await httpClient.get('/clinic/analytics/revenue-by-branch', {
        params: { _t: Date.now() },
      });

      const revenueResult = response?.data?.data || response?.data;
      if (Array.isArray(revenueResult)) {
        setRevenueData(revenueResult);
      } else if (Array.isArray(revenueResult?.branches)) {
        setRevenueData(revenueResult.branches);
      } else {
        setRevenueData([]);
      }
    } catch (error) {
      const errorMsg = error?.message || 'Failed to fetch revenue data';
      if (!shouldSuppressToastMessage(errorMsg)) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('❌ Error fetching revenue data:', error);
        }
      }
      setRevenueData([]);
    } finally {
      setRevenueLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasAccess) {
      fetchBranches();
    }
  }, [hasAccess, fetchBranches]);

  useEffect(() => {
    if (branches.length > 0) {
      fetchRevenueData();
    }
  }, [branches, fetchRevenueData]);

  usePortalRealtimeRefresh({
    socket,
    events: PORTAL_REFRESH_PROFILES.BRANCHES,
    refresh: fetchBranches,
    enabled: hasAccess
  });

  // Handle add branch
  const handleAddBranch = async (formData) => {
    setAddLoading(true);
    setAddError(null);

    try {
      const token = getAccessToken();
      if (!token) {
        setShowTokenExpiredModal(true);
        return;
      }

      // Prepare branch data for API - match database schema
      const branchData = {
        ...formToBranchPayload(formData),
        branchCode: (formData.branchName?.substring(0, 3).toUpperCase() || 'BR') + Math.floor(Math.random() * 100),
        hasSterlization: Boolean(formData.facilities?.includes('Autoclave Sterilizer')),
        hasRadiography: Boolean(formData.facilities?.includes('X-Ray Machine')),
      };

      // API call to add branch
      const result = await clinicService.createBranch(branchData);
      const createdBranch = normalizeBranch(result?.branch || result, ownerInfo);
      
      setAddBranchModal(false);
      setNotice({
        type: 'success',
        message: `Branch "${formData.branchName}" has been added successfully`
      });
      
      setBranches((prev) => {
        if (createdBranch) {
          return [createdBranch, ...prev];
        }
        return prev;
      });
      await fetchBranches();
      
    } catch (error) {
      console.error('❌ Error adding branch:', error);
      setAddError(error.message || 'Failed to add branch');
    } finally {
      setAddLoading(false);
    }
  };

  // Handle edit branch
  const handleEditBranch = async (branchId, formData) => {
    setEditLoading(true);
    setEditError(null);

    try {
      const token = getAccessToken();
      if (!token) {
        setShowTokenExpiredModal(true);
        return;
      }

      // API call to update branch
      const updatedBranch = await clinicService.updateBranch(branchId, formToBranchPayload(formData));
      const normalizedBranch = normalizeBranch(updatedBranch?.branch || updatedBranch, ownerInfo);
      setBranches(prev => prev.map(branch => 
        branch.id === branchId ? normalizedBranch || branch : branch
      ));
      setEditBranchModal(null);
      setNotice({
        type: 'success',
        message: t('clinic.branches.notifications.branchUpdated', { name: formData.branchName })
      });
    } catch (error) {
      console.error('❌ Error updating branch:', error);
      setEditError(t('clinic.branches.errors.updateFailed') || 'Failed to update branch');
    } finally {
      setEditLoading(false);
    }
  };

  // Handle delete branch
  const handleDeleteBranch = async (branchId) => {
    setDeleteLoading(true);
    setDeleteError(null);

    try {
      const token = getAccessToken();
      if (!token) {
        setShowTokenExpiredModal(true);
        return;
      }

      await clinicService.deleteBranch(branchId);

      setBranches(prev => prev.filter(branch => branch.id !== branchId));
      setDeleteBranchModal(null);
      setNotice({
        type: 'success',
        message: t('clinic.branches.notifications.branchDeleted')
      });
    } catch (error) {
      console.error('❌ Error deleting branch:', error);
      setDeleteError(t('clinic.branches.errors.deleteFailed') || 'Failed to delete branch');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Handle token expired
  const handleTokenExpired = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // Calculate summary statistics
  const branchStats = useMemo(() => {
    const totalRevenue = revenueData.reduce((sum, branch) => sum + (Number(branch.monthlyRevenue) || 0), 0);
    const growthValues = revenueData
      .map((branch) => Number(branch.growth))
      .filter(Number.isFinite);
    const avgGrowth = growthValues.length > 0
      ? (growthValues.reduce((sum, growth) => sum + growth, 0) / growthValues.length).toFixed(1)
      : null;
    const totalTransactions = revenueData.reduce((sum, branch) => sum + (Number(branch.transactions) || 0), 0);
    const avgTransactionValue = totalTransactions > 0 
      ? Math.floor(totalRevenue / totalTransactions) 
      : 0;

    return {
      totalBranches: branches.length,
      activeBranches: branches.filter(b => (b.status === 'active') || b.isActive === true).length,
      totalRevenue,
      avgGrowth,
      totalTransactions,
      avgTransactionValue
    };
  }, [branches, revenueData]);

  // Temporarily disable access check for testing
  // if (!hasAccess) {
  //   return (
  //     <div className="flex min-h-screen bg-background theme-transition">
  //       <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
  //         <ClinicSideBar />
  //       </div>
  //       <div className="flex-1 min-w-0 flex items-center justify-center">
  //         <div className="text-center">
  //           <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
  //             <AppIcon name="ShieldAlert" size={32} className="text-red-600" />
  //           </div>
  //           <h2 className="text-xl font-semibold text-primary mb-2">Access Denied</h2>
  //           <p className="text-secondary mb-4">You don't have permission to access Branch Management.</p>
  //           <button
  //             onClick={() => navigate('/clinic-portal')}
  //             className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover"
  //           >
  //             Back to Dashboard
  //           </button>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  if (loading) {
    const summarySkeletons = Array.from({ length: 4 });
    const performanceSkeletons = Array.from({ length: 4 });
    const tabSkeletons = ['overview', 'directory', 'revenue'];
    const infoCardSkeletons = Array.from({ length: 2 });
    const directorySkeletons = Array.from({ length: 4 });

    return (
      <div className="flex min-h-screen bg-background theme-transition clinic-skeleton">
        <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
          <ClinicSideBar />
        </div>
        <div className="flex-1 min-w-0">
          <div className="p-6 md:p-8 space-y-8">
            <section className="space-y-6 rounded-3xl border border-primary/15 bg-surface-elevated skeleton-surface p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-3">
                  <div className="h-3 w-32 rounded bg-accent/10 animate-pulse"></div>
                  <div className="h-8 w-72 rounded-lg bg-accent/20 animate-pulse"></div>
                  <div className="h-4 w-96 rounded bg-accent/10 animate-pulse"></div>
                </div>
                <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3">
                  <div className="h-10 w-40 rounded-xl bg-accent/10 animate-pulse"></div>
                  <div className="h-10 w-48 rounded-xl bg-accent/20 animate-pulse"></div>
                </div>
              </div>
              <div className="border-t border-primary/15 pt-4 flex flex-wrap gap-2">
                {tabSkeletons.map((key) => (
                  <div key={key} className="h-9 w-28 rounded-lg bg-accent/10 animate-pulse"></div>
                ))}
              </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {summarySkeletons.map((_, idx) => (
                <div
                  key={idx}
                  className="p-6 rounded-2xl border border-primary/15 bg-surface-elevated skeleton-surface space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 animate-pulse"></div>
                    <div className="h-6 w-20 rounded bg-accent/20 animate-pulse"></div>
                  </div>
                  <div className="h-4 w-32 rounded bg-accent/10 animate-pulse"></div>
                  <div className="h-3 w-24 rounded bg-accent/10 animate-pulse"></div>
                </div>
              ))}
            </section>

            <section className="rounded-2xl border border-primary/15 bg-surface-elevated skeleton-surface p-6 space-y-4">
              <div className="h-5 w-48 rounded bg-accent/10 animate-pulse"></div>
              <div className="space-y-3">
                {performanceSkeletons.map((_, idx) => (
                  <div
                    key={idx}
                    className="border border-primary/10 bg-surface rounded-xl p-4 flex items-center gap-4 animate-pulse"
                  >
                    <div className="w-12 h-12 rounded-xl bg-accent/10"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-40 rounded bg-accent/10"></div>
                      <div className="h-3 w-32 rounded bg-accent/10"></div>
                    </div>
                    <div className="text-right space-y-2">
                      <div className="h-4 w-24 rounded bg-accent/10"></div>
                      <div className="h-3 w-16 rounded bg-accent/10"></div>
                    </div>
                    <div className="w-20 h-2 rounded-full bg-accent/10"></div>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {infoCardSkeletons.map((_, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-primary/15 bg-surface-elevated skeleton-surface p-6 space-y-4"
                >
                  <div className="h-5 w-56 rounded bg-accent/10 animate-pulse"></div>
                  <div className="space-y-3">
                    {[...Array(5)].map((__, innerIdx) => (
                      <div key={innerIdx} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-accent/10 animate-pulse"></div>
                          <div className="h-4 w-32 rounded bg-accent/10 animate-pulse"></div>
                        </div>
                        <div className="h-3 w-16 rounded bg-accent/10 animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>

            <section className="rounded-2xl border border-primary/15 bg-surface-elevated skeleton-surface p-6 space-y-5">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="h-12 w-full rounded-lg bg-accent/10 animate-pulse"></div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <div className="h-10 w-32 rounded-lg bg-accent/10 animate-pulse"></div>
                  <div className="h-10 w-36 rounded-lg bg-accent/20 animate-pulse"></div>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {directorySkeletons.map((_, idx) => (
                  <div
                    key={idx}
                    className="border border-primary/15 bg-surface rounded-2xl p-5 space-y-4 animate-pulse"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-accent/10"></div>
                        <div>
                          <div className="h-4 w-40 rounded bg-accent/10"></div>
                          <div className="h-3 w-24 rounded bg-accent/10 mt-2"></div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="h-8 w-8 rounded-lg bg-accent/10"></div>
                        <div className="h-8 w-8 rounded-lg bg-accent/10"></div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {[...Array(3)].map((__, infoIdx) => (
                        <div key={infoIdx} className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded bg-accent/10"></div>
                          <div className="h-3 w-48 rounded bg-accent/10"></div>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-4 pt-3 border-t border-primary/10">
                      {[...Array(3)].map((__, statIdx) => (
                        <div key={statIdx} className="space-y-2 text-center">
                          <div className="h-4 w-12 mx-auto rounded bg-accent/20"></div>
                          <div className="h-3 w-16 mx-auto rounded bg-accent/10"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background theme-transition">
      <ClinicSideBar />
      
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="p-6 md:p-8 pb-0">
          {/* Header */}
          <section className="clinic-page-header space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                  {t('clinic.branches.badge') || 'Branch Management'}
                </p>
                <h1 className="text-2xl font-bold text-primary">
                  {t('clinic.branches.title') || 'Manajemen Cabang'}
                </h1>
                <p className="text-sm text-secondary max-w-2xl">
                  {t('clinic.branches.subtitle') || 'Kelola cabang klinik, monitor performa, dan analisis pendapatan'}
                </p>
                {ownerInfo && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-l-2 border-accent/60 pl-3 text-xs text-secondary sm:text-sm">
                    <span>
                      <strong className="font-semibold text-primary">Penanggung jawab:</strong> {ownerInfo.name || '—'}
                    </span>
                    {ownerInfo.email && (
                      <span>
                        <a href={`mailto:${ownerInfo.email}`} className="text-secondary underline-offset-4 hover:text-accent hover:underline">
                          {ownerInfo.email}
                        </a>
                      </span>
                    )}
                    {ownerInfo.whatsapp && (
                      <span>{ownerInfo.whatsapp}</span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3">
                <div className="rounded-2xl border border-border/40 bg-surface px-4 py-2 text-sm text-secondary">
                  {branches.length} {t('clinic.branches.totalBranches') || 'total branches'}
                </div>
                <button 
                  onClick={() => setAddBranchModal(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-accent/90"
                >
                  <AppIcon name="Plus" size={16} />
                  <span>{t('clinic.branches.actions.addBranch') || 'Add Branch'}</span>
                </button>
              </div>
            </div>
            
            <div className="border-t border-border/40 pt-4">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'overview'
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-secondary hover:text-primary hover:bg-surface'
                  }`}
                >
                  <AppIcon name="BarChart3" size={16} />
                  <span>{t('clinic.branches.tabs.overview') || 'Overview'}</span>
                </button>
                <button
                  onClick={() => setActiveTab('directory')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'directory'
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-secondary hover:text-primary hover:bg-surface'
                  }`}
                >
                  <AppIcon name="MapPin" size={16} />
                  <span>{t('clinic.branches.tabs.directory') || 'Directory'}</span>
                </button>
                <button
                  onClick={() => setActiveTab('revenue')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'revenue'
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-secondary hover:text-primary hover:bg-surface'
                  }`}
                >
                  <AppIcon name="TrendingUp" size={16} />
                  <span>{t('clinic.branches.tabs.revenue') || 'Revenue'}</span>
                </button>
              </div>
            </div>
          </section>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-background theme-transition">
          {notice && (
            <div className="mb-6 flex items-start justify-between gap-3 rounded-2xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-4 py-3 text-sm text-green-700 dark:text-green-400">
              <div className="flex items-center gap-2">
                <AppIcon name="CheckCircle" size={18} />
                <span>{notice.message}</span>
              </div>
              <button
                onClick={() => setNotice(null)}
                className="rounded-full p-1 text-green-700 dark:text-green-400 transition hover:bg-green-100/80 dark:hover:bg-green-800/40"
                aria-label="Close notification"
              >
                <AppIcon name="X" size={14} />
              </button>
            </div>
          )}

          {error ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
                <AppIcon name="AlertCircle" size={32} className="text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-red-800 dark:text-red-400 mb-2">
                {t('clinic.branches.errors.title') || 'Error Loading Branches'}
              </h3>
              <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
              <button
                onClick={fetchBranches}
                className="px-6 py-3 bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-900/60 text-red-800 dark:text-red-300 rounded-xl border border-red-200 dark:border-red-700 transition-colors duration-200"
              >
                {t('clinic.branches.actions.retry') || 'Try Again'}
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <BranchOverview
                  stats={branchStats}
                  branches={branches}
                  revenueData={revenueData}
                  loading={revenueLoading}
                />
              )}

              {activeTab === 'directory' && (
                <div>


                  
                  <BranchDirectory
                    branches={branches}
                    onEdit={(branch) => setEditBranchModal(branch)}
                    onDelete={(branch) => setDeleteBranchModal(branch)}
                    onAdd={() => setAddBranchModal(true)}
                  />
                </div>
              )}

              {activeTab === 'revenue' && (
                <BranchRevenueChart
                  revenueData={revenueData}
                  loading={revenueLoading}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <BranchAddModal
        open={addBranchModal}
        onClose={() => setAddBranchModal(false)}
        onSubmit={handleAddBranch}
        loading={addLoading}
        error={addError}
      />

      <BranchEditModal
        open={!!editBranchModal}
        branch={editBranchModal}
        onClose={() => setEditBranchModal(null)}
        onSubmit={handleEditBranch}
        loading={editLoading}
        error={editError}
      />

      <BranchDeleteDialog
        open={!!deleteBranchModal}
        branch={deleteBranchModal}
        onClose={() => setDeleteBranchModal(null)}
        onConfirm={() => handleDeleteBranch(deleteBranchModal.id)}
        loading={deleteLoading}
        error={deleteError}
      />

      {/* Token Expired Modal */}
      {showTokenExpiredModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="relative w-full max-w-md max-h-[80vh] bg-surface rounded-2xl shadow-2xl border border-border/40 p-6 overflow-y-auto">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AppIcon name="AlertCircle" size={32} className="text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-primary mb-2">Session Expired</h2>
                <p className="text-secondary text-sm">Your session has expired. Please login again.</p>
              </div>
              
              <div className="flex justify-center">
                <button
                  onClick={handleTokenExpired}
                  className="px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-xl font-medium transition-colors duration-200"
                >
                  Login Again
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default BranchManagement;
