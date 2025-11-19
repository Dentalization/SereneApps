import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import AdminSideBar from '../../ui/sidebar-admin';
import { authHttp } from '../../../../utils/httpClient';
import AppIcon from '../../../../components/AppIcon';
import StaffList from '../../../../components/clinic/StaffList';
import { useLanguage } from '../../../../contexts/LanguageContext';
import ModalPortal from '../../../../components/ui/ModalPortal';

const STATUS_STYLES = {
  pending: {
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    chip: 'bg-amber-500/15 text-amber-600'
  },
  verified: {
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    chip: 'bg-emerald-500/15 text-emerald-600'
  },
  rejected: {
    badge: 'bg-rose-100 text-rose-700 border-rose-200',
    chip: 'bg-rose-500/15 text-rose-600'
  }
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const ClinicDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fallbackClinic = location.state?.clinic || null;
  const { t } = useLanguage();

  const [clinic, setClinic] = useState(fallbackClinic);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(!fallbackClinic);
  const [error, setError] = useState(null);
  const [selectedBranchId, setSelectedBranchId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyAction, setVerifyAction] = useState(null); // 'verify' or 'reject'
  const [verificationNotes, setVerificationNotes] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    let isActive = true;

    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await authHttp.get(`/clinic/admin/${id}`);
        if (!isActive) return;
        setClinic(data.clinic || null);
      } catch (err) {
        if (!isActive) return;
        console.error('Failed to fetch clinic detail', err);
        const status = err?.response?.status;
        if ([401, 403].includes(status)) {
          setError(t('admin.clinicManagement.directory.errors.sessionExpired'));
        } else if (status === 404) {
          if (fallbackClinic) {
            setError(null);
            setClinic(fallbackClinic);
          } else {
            setError(t('admin.clinicDetail.errors.notFoundRedirect'));
            setClinic(null);
            if (typeof window !== 'undefined') {
              window.setTimeout(() => navigate('/admin/clinic-management'), 2000);
            }
          }
        } else {
          setError(err?.response?.data?.error || err.message || t('admin.clinicDetail.errors.fetchFailed'));
          if (!fallbackClinic) setClinic(null);
        }
      } finally {
        if (isActive) setLoading(false);
      }
    };

    const fetchStaff = async () => {
      try {
        const { data } = await authHttp.get(`/clinic/admin/${id}/staff`);
        if (!isActive) return;
        setStaff(data.staff || []);
      } catch (err) {
        if (!isActive) return;
        console.error('Failed to fetch clinic staff', err);
        const status = err?.response?.status;
        if (status === 404) {
          setStaff([]);
        } else if ([401, 403].includes(status)) {
          setError((prev) => prev || t('admin.clinicManagement.directory.errors.sessionExpired'));
        } else {
          setError((prev) => prev || err?.response?.data?.error || err.message || t('admin.clinicDetail.errors.staffFetchFailed'));
        }
      }
    };

    fetchDetail();
    fetchStaff();

    return () => {
      isActive = false;
    };
  }, [id, navigate, fallbackClinic, refreshKey]);

  const statusConfig = useMemo(() => {
    const styles = STATUS_STYLES[clinic?.status] || {
      badge: 'bg-slate-100 text-slate-600 border-slate-200',
      chip: 'bg-slate-500/15 text-slate-600'
    };
    const labelKey = clinic?.status ? `admin.clinicDetail.statusLabels.${clinic.status}` : null;
    let label = t('admin.clinicDetail.statusLabels.unknown');
    if (clinic?.status && labelKey) {
      const translated = t(labelKey);
      label = translated !== labelKey ? translated : clinic.status.replace(/_/g, ' ');
    }
    return { ...styles, label };
  }, [clinic?.status, t]);

  const mainBranch = useMemo(
    () => clinic?.branches?.find((b) => b.isMainBranch) || clinic?.branches?.[0] || null,
    [clinic?.branches]
  );

  const mainBranchId = useMemo(() => {
    if (!mainBranch?.id) return null;
    return mainBranch.id.toString();
  }, [mainBranch?.id]);

  const { branchList, staffByBranch } = useMemo(() => {
    const branchMap = new Map();
    const nameLookup = new Map();
    const staffBuckets = new Map();

    const normalizeId = (value, fallbackName) => {
      if (value !== null && value !== undefined) return String(value);
      if (fallbackName) return `name:${String(fallbackName).toLowerCase()}`;
      return null;
    };

    const registerBranch = (rawId, info = {}, isVirtual = false) => {
      const id = normalizeId(rawId, info.branchName);
      if (!id) return null;

      const existing = branchMap.get(id);
      const merged = {
        id,
        branchName: info.branchName || existing?.branchName || (id === 'unassigned' ? t('admin.clinicDetail.unassignedBranchLabel') : t('admin.clinicDetail.unnamedBranchLabel')),
        city: info.city ?? existing?.city ?? null,
        province: info.province ?? existing?.province ?? null,
        streetAddress: info.streetAddress ?? existing?.streetAddress ?? null,
        isMainBranch: existing?.isMainBranch || Boolean(info.isMainBranch),
        branchCode: info.branchCode ?? existing?.branchCode ?? null,
        treatmentRoomsCount: info.treatmentRoomsCount ?? existing?.treatmentRoomsCount ?? null,
        isVirtual: existing?.isVirtual || isVirtual
      };

      branchMap.set(id, merged);
      if (!staffBuckets.has(id)) staffBuckets.set(id, []);
      if (merged.branchName) nameLookup.set(merged.branchName.toLowerCase(), id);
      return id;
    };

    (clinic?.branches || []).forEach((branch) => {
      registerBranch(branch.id, branch, false);
    });

    const fallbackBranchId =
      mainBranchId ||
      (mainBranch?.branchName ? nameLookup.get(mainBranch.branchName.toLowerCase()) : null);

    staff.forEach((member) => {
      const assigned = member.assignedBranch || {};
      let branchId = null;

      if (assigned.id !== undefined && assigned.id !== null) {
        branchId = registerBranch(assigned.id, assigned, false);
      }

      if (!branchId && assigned.branchName) {
        branchId = nameLookup.get(assigned.branchName.toLowerCase());
        branchId = registerBranch(branchId || `name:${assigned.branchName.toLowerCase()}`, assigned, false);
      }

      if (!branchId && fallbackBranchId) {
        branchId = fallbackBranchId;
      }

      if (!branchId) {
        branchId = registerBranch(
          'unassigned',
          {
            branchName: t('admin.clinicDetail.unassignedBranchLabel'),
            isMainBranch: false
          },
          true
        );
      }

      // Ensure we always use string keys for buckets
      const bucketKey = String(branchId);
      if (!staffBuckets.has(bucketKey)) staffBuckets.set(bucketKey, []);
      staffBuckets.get(bucketKey)?.push(member);
    });

    if (!branchMap.size && staff.length && !mainBranchId) {
      registerBranch('unassigned', { branchName: t('admin.clinicDetail.unassignedBranchLabel') }, true);
    }

    const branchArray = Array.from(branchMap.values())
      .map((branch) => ({
        ...branch,
        // branch.id should already be a string from normalizeId; coerce for safety
        staffCount: staffBuckets.get(String(branch.id))?.length || 0
      }))
      .sort((a, b) => {
        if (a.isMainBranch && !b.isMainBranch) return -1;
        if (!a.isMainBranch && b.isMainBranch) return 1;
        return (a.branchName || '').localeCompare(b.branchName || '');
      });

    const buckets = {};
    branchArray.forEach((branch) => {
      buckets[String(branch.id)] = staffBuckets.get(String(branch.id)) || [];
    });

    return { branchList: branchArray, staffByBranch: buckets };
  }, [clinic?.branches, staff, mainBranchId, mainBranch?.branchName, t]);

  useEffect(() => {
    if (!branchList.length) {
      setSelectedBranchId(null);
      return;
    }
    setSelectedBranchId((prev) => {
      if (prev && branchList.some((branch) => (branch.id?.toString?.() ?? branch.id) === prev)) {
        return prev;
      }
      const defaultBranch = branchList.find((b) => b.isMainBranch) || branchList[0];
      const branchId = defaultBranch?.id?.toString?.() ?? defaultBranch?.id;
      return branchId ? branchId.toString() : null;
    });
  }, [branchList]);

  const selectedBranch = useMemo(() => {
    if (!branchList.length || !selectedBranchId) return null;
    return branchList.find((branch) => (branch.id?.toString?.() ?? branch.id) === selectedBranchId) || null;
  }, [branchList, selectedBranchId]);

  const staffForSelectedBranch = useMemo(() => {
    if (!selectedBranchId) return staff;
    return staffByBranch[selectedBranchId] || [];
  }, [staff, selectedBranchId, staffByBranch]);

  const mainBranchStaffCount = mainBranchId ? (staffByBranch[mainBranchId]?.length || 0) : 0;

  const totalBranches = branchList.filter((branch) => !branch.isVirtual).length;
  const totalStaff = staff.length;

  const handleVerifyClinic = async () => {
    if (!verifyAction) return;
    
    setVerifying(true);
    try {
      const payload = {
        status: verifyAction === 'verify' ? 'verified' : 'rejected',
        verificationNotes: verificationNotes.trim() || undefined
      };

      await authHttp.put(`/clinic/admin/${id}/verify`, payload);
      
      // Refresh clinic data
      const { data: updatedClinic } = await authHttp.get(`/clinic/admin/${id}`);
      setClinic(updatedClinic.clinic);
      
      setShowVerifyModal(false);
      setVerifyAction(null);
      setVerificationNotes('');
    } catch (err) {
      console.error('Error verifying clinic:', err);
      setError(err?.response?.data?.error || t('admin.clinicDetail.errors.verifyFailed'));
    } finally {
      setVerifying(false);
    }
  };

  const openVerifyModal = (action) => {
    setVerifyAction(action);
    setVerificationNotes('');
    setShowVerifyModal(true);
  };

  const renderDocumentBadge = (label, value) => (
    <div className="flex flex-col gap-1 rounded-2xl border border-border/40 bg-muted/20 p-3">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-secondary">{label}</span>
      <span className="text-sm font-semibold text-primary truncate">{value || '—'}</span>
    </div>
  );

  const renderSkeleton = () => (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border/40 bg-surface p-8 shadow-sm animate-pulse">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="h-6 w-40 bg-accent/10 rounded" />
            <div className="h-8 w-72 bg-accent/15 rounded" />
            <div className="space-y-2">
              <div className="h-4 w-56 bg-accent/10 rounded" />
              <div className="h-4 w-64 bg-accent/10 rounded" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 min-w-[240px]">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="rounded-2xl border border-border/40 bg-muted/10 p-4 space-y-2">
                <div className="h-3 w-24 bg-accent/10 rounded" />
                <div className="h-6 w-12 bg-accent/20 rounded" />
                <div className="h-3 w-32 bg-accent/10 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="rounded-3xl border border-border/40 bg-surface p-6 shadow-sm animate-pulse space-y-4 xl:col-span-2">
          <div className="h-5 w-40 bg-accent/10 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="rounded-2xl border border-border/40 bg-muted/10 p-4 space-y-2">
                <div className="h-3 w-24 bg-accent/10 rounded" />
                <div className="h-4 w-36 bg-accent/10 rounded" />
                <div className="h-3 w-28 bg-accent/10 rounded" />
              </div>
            ))}
          </div>
          <div className="h-4 w-48 bg-accent/10 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-16 rounded-2xl border border-border/40 bg-muted/10" />
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-border/40 bg-surface p-6 shadow-sm animate-pulse space-y-3">
          <div className="h-5 w-40 bg-accent/10 rounded" />
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="h-12 rounded-2xl border border-border/40 bg-muted/10" />
          ))}
          <div className="h-20 rounded-2xl border border-border/40 bg-muted/10" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, idx) => (
          <div key={idx} className="rounded-3xl border border-border/40 bg-surface p-6 shadow-sm animate-pulse space-y-3">
            <div className="h-5 w-48 bg-accent/10 rounded" />
            {Array.from({ length: 4 }).map((__, innerIdx) => (
              <div key={innerIdx} className="h-12 rounded-2xl border border-border/40 bg-muted/10" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background theme-transition">
      <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
        <AdminSideBar />
      </div>

      <div className="flex-1 p-6 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm font-medium text-secondary transition hover:text-primary"
          >
            <AppIcon name="ChevronLeft" size={16} />
            {t('admin.clinicDetail.backButton')}
          </button>
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {loading && !clinic && renderSkeleton()}

          {clinic && (
            <>
              <section className="rounded-3xl border border-border/40 bg-gradient-to-r from-sky-50 via-white to-emerald-50 p-8 shadow-sm dark:from-slate-900 dark:via-slate-950 dark:to-emerald-900/40">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-4">
                    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${statusConfig.badge}`}>
                      <span className="inline-block h-2 w-2 rounded-full bg-current opacity-70" />
                      {statusConfig.label}
                    </div>
                    <div>
                      <h1 className="text-3xl font-semibold text-primary">
                        {clinic.brandName || clinic.legalName || t('admin.clinicDetail.unnamedClinic')}
                      </h1>
                      {clinic.legalName && (
                        <p className="text-sm text-secondary mt-1">
                          {t('admin.clinicDetail.legalEntityLabel')}{' '}
                          <span className="font-semibold text-primary">{clinic.legalName}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-secondary">
                      {clinic.facilityType && (
                        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-medium ${statusConfig.chip}`}>
                          {clinic.facilityType}
                        </span>
                      )}
                      {clinic.city && (
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 font-medium text-primary shadow-sm">
                          {clinic.city}
                          {clinic.province ? `, ${clinic.province}` : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-secondary max-w-2xl leading-relaxed">
                      {clinic.streetAddress ? `${clinic.streetAddress}, ` : ''}
                      {[clinic.city, clinic.province, clinic.postalCode].filter(Boolean).join(', ')}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 min-w-[240px]">
                    <div className="rounded-2xl border border-border/40 bg-white/80 p-4 shadow-sm">
                      <p className="text-[11px] uppercase font-semibold tracking-wide text-secondary">{t('admin.clinicDetail.metricTotalBranches')}</p>
                      <p className="mt-2 text-2xl font-semibold text-primary">{totalBranches}</p>
                      <p className="text-xs text-secondary mt-1">{t('admin.clinicDetail.metricTotalBranchesHint')}</p>
                    </div>
                    <div className="rounded-2xl border border-border/40 bg-white/80 p-4 shadow-sm">
                      <p className="text-[11px] uppercase font-semibold tracking-wide text-secondary">{t('admin.clinicDetail.metricStaff')}</p>
                      <p className="mt-2 text-2xl font-semibold text-primary">{totalStaff}</p>
                      <p className="text-xs text-secondary mt-1">{t('admin.clinicDetail.metricStaffHint')}</p>
                    </div>
                    <div className="rounded-2xl border border-border/40 bg-white/80 p-4 shadow-sm">
                      <p className="text-[11px] uppercase font-semibold tracking-wide text-secondary">{t('admin.clinicDetail.metricOwner')}</p>
                      <p className="mt-2 text-sm font-semibold text-primary">{clinic.ownerName || '—'}</p>
                      <p className="text-xs text-secondary mt-1">{clinic.ownerEmail || t('admin.clinicDetail.noEmail')}</p>
                    </div>
                    <div className="rounded-2xl border border-border/40 bg-white/80 p-4 shadow-sm">
                      <p className="text-[11px] uppercase font-semibold tracking-wide text-secondary">{t('admin.clinicDetail.metricPrimaryBranch')}</p>
                      <p className="mt-2 text-sm font-semibold text-primary">{mainBranch?.branchName || t('admin.clinicDetail.notAssigned')}</p>
                      <p className="text-xs text-secondary mt-1">
                        {mainBranch ? (
                          t('admin.clinicDetail.primaryBranchSummary', {
                            count: mainBranchStaffCount,
                            location: mainBranch?.city ? `${mainBranch.city}${mainBranch.province ? `, ${mainBranch.province}` : ''}` : t('admin.clinicDetail.noLocation')
                          })
                        ) : (
                          t('admin.clinicDetail.primaryBranchMissing')
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="rounded-3xl border border-border/40 bg-surface p-6 shadow-sm xl:col-span-2">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="text-lg font-semibold text-primary">{t('admin.clinicDetail.operationalOverviewTitle')}</h2>
                      <p className="text-xs text-secondary">{t('admin.clinicDetail.operationalOverviewSubtitle')}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-border/40 bg-muted/20 p-4 space-y-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary">{t('admin.clinicDetail.ownerSectionTitle')}</p>
                      <div>
                        <p className="text-sm font-semibold text-primary">{clinic.ownerName || '—'}</p>
                        <p className="text-xs text-secondary">{clinic.ownerPosition || '—'}</p>
                      </div>
                      <div className="space-y-1 text-xs text-secondary">
                        <p>{t('admin.clinicDetail.fieldEmail')}: <span className="text-primary font-medium">{clinic.ownerEmail || '—'}</span></p>
                        <p>{t('admin.clinicDetail.fieldWhatsapp')}: <span className="text-primary font-medium">{clinic.ownerWhatsapp || '—'}</span></p>
                        <p>{t('admin.clinicDetail.fieldNik')}: <span className="text-primary font-medium">{clinic.ownerNik || '—'}</span></p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border/40 bg-muted/20 p-4 space-y-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary">{t('admin.clinicDetail.contactSectionTitle')}</p>
                      <div className="space-y-1 text-xs text-secondary">
                        <p>{t('admin.clinicDetail.fieldPhone')}: <span className="text-primary font-medium">{clinic.phone || '—'}</span></p>
                        <p>{t('admin.clinicDetail.fieldEmail')}: <span className="text-primary font-medium">{clinic.email || clinic.user?.email || '—'}</span></p>
                        <p>{t('admin.clinicDetail.fieldTimezone')}: <span className="text-primary font-medium">{clinic.timezone || t('admin.clinicDetail.defaultTimezone')}</span></p>
                      </div>
                      <div className="space-y-1 text-xs text-secondary">
                        <p>{t('admin.clinicDetail.fieldCreated')}: <span className="text-primary font-medium">{formatDate(clinic.createdAt)}</span></p>
                        <p>{t('admin.clinicDetail.fieldUpdated')}: <span className="text-primary font-medium">{formatDate(clinic.updatedAt)}</span></p>
                        <p>{t('admin.clinicDetail.fieldVerificationNotes')}: <span className="text-primary font-medium">{clinic.verificationNotes || '—'}</span></p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary mb-3">{t('admin.clinicDetail.complianceFilesTitle')}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {renderDocumentBadge(t('admin.clinicDetail.docNIB'), clinic.nibNumber)}
                      {renderDocumentBadge(t('admin.clinicDetail.docNPWP'), clinic.npwpNumber)}
                      {renderDocumentBadge(t('admin.clinicDetail.docOperational'), clinic.operationalLicenseNumber || clinic.operationalLicense || (clinic.operationalLicenseFilePath ? t('admin.clinicDetail.docUploadedPlaceholder') : '—'))}
                      {renderDocumentBadge(t('admin.clinicDetail.docAdditional'), clinic.additionalLicenseFilePaths?.length ? `${clinic.additionalLicenseFilePaths.length} ${t('admin.clinicDetail.docFilesSuffix')}` : '—')}
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-border/40 bg-surface p-6 shadow-sm space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-primary">{t('admin.clinicDetail.quickActionsTitle')}</h2>
                    <p className="text-xs text-secondary">{t('admin.clinicDetail.quickActionsSubtitle')}</p>
                  </div>
                  <div className="space-y-3">
                    <button
                      onClick={() => navigate('/admin/clinic-management')}
                      className="w-full inline-flex items-center justify-between rounded-2xl border border-border/40 bg-muted/20 px-4 py-3 text-sm font-semibold text-primary transition hover:border-primary/40 hover:bg-primary/5"
                    >
                      <span>{t('admin.clinicDetail.actionBack')}</span>
                      <span className="text-xs text-secondary">{t('admin.clinicDetail.actionBackHint')}</span>
                    </button>
                    <button
                      onClick={() => setRefreshKey((prev) => prev + 1)}
                      className="w-full inline-flex items-center justify-between rounded-2xl border border-border/40 bg-muted/20 px-4 py-3 text-sm font-semibold text-primary transition hover:border-primary/40 hover:bg-primary/5"
                    >
                      <span>{t('admin.clinicDetail.actionRefresh')}</span>
                      <span className="text-xs text-secondary">{t('admin.clinicDetail.actionRefreshHint')}</span>
                    </button>
                    
                    {clinic?.status === 'pending' && (
                      <>
                        <button
                          onClick={() => openVerifyModal('verify')}
                          className="w-full inline-flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-400 transition hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                        >
                          <span className="flex items-center gap-2">
                            <AppIcon name="CheckCircle2" size={16} />
                            {t('admin.clinicDetail.actionApprove')}
                          </span>
                        </button>
                        <button
                          onClick={() => openVerifyModal('reject')}
                          className="w-full inline-flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 dark:bg-rose-900/20 px-4 py-3 text-sm font-semibold text-rose-700 dark:text-rose-400 transition hover:bg-rose-100 dark:hover:bg-rose-900/30"
                        >
                          <span className="flex items-center gap-2">
                            <AppIcon name="XCircle" size={16} />
                            {t('admin.clinicDetail.actionReject')}
                          </span>
                        </button>
                      </>
                    )}
                    
                    {clinic?.status === 'verified' && (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                          <AppIcon name="ShieldCheck" size={16} />
                          <span>{t('admin.clinicDetail.statusVerified')}</span>
                        </div>
                        {clinic.verificationDate && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">
                            {t('admin.clinicDetail.verifiedOn')} {formatDate(clinic.verificationDate)}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {clinic?.status === 'rejected' && (
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 dark:bg-rose-900/20 px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2 text-sm font-semibold text-rose-700 dark:text-rose-400">
                          <AppIcon name="XCircle" size={16} />
                          <span>{t('admin.clinicDetail.statusRejected')}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="rounded-2xl border border-border/40 bg-muted/20 p-4 space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary">{t('admin.clinicDetail.notesTitle')}</p>
                    <p className="text-sm text-secondary leading-relaxed">
                      {clinic.verificationNotes ||
                        t('admin.clinicDetail.notesPlaceholder')}
                    </p>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="rounded-3xl border border-border/40 bg-surface p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-primary">{t('admin.clinicDetail.branchDirectoryTitle')}</h2>
                      <p className="text-xs text-secondary">
                        {totalBranches
                          ? t('admin.clinicDetail.branchCount', { count: totalBranches })
                          : t('admin.clinicDetail.noBranches')}
                      </p>
                    </div>
                  </div>
                  {branchList.length ? (
                    <div className="space-y-3">
                      {branchList.map((branch) => {
                        const branchId = branch.id?.toString?.() ?? branch.id ?? branch.branchName;
                        const isSelected = selectedBranchId === branchId;
                        const staffCount = staffByBranch[branchId]?.length || 0;
                        const isVirtual = branch.isVirtual || branchId === 'unassigned';
                        return (
                          <button
                            key={branchId}
                            onClick={() => setSelectedBranchId(branchId)}
                            className={`w-full text-left rounded-2xl border px-4 py-4 transition ${
                              isSelected
                                ? 'border-primary/60 bg-primary/5 shadow-sm'
                                : 'border-border/40 bg-muted/10 hover:border-primary/40 hover:bg-primary/5'
                            }`}
                          >
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-primary">
                                    {branch.branchName || t('admin.clinicDetail.unnamedBranchLabel')}
                                  </p>
                                  {branch.isMainBranch && (
                                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                                      {t('admin.clinicDetail.mainBadge')}
                                    </span>
                                  )}
                                  {isVirtual && (
                                    <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-[11px] font-semibold text-secondary">
                                      {t('admin.clinicDetail.virtualBadge')}
                                    </span>
                                  )}
                                </div>
                                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                                  <AppIcon name="Users" size={12} />
                                  {t('admin.clinicDetail.staffCountLabel', { count: staffCount })}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-secondary">
                                {isVirtual ? (
                                  <span>{t('admin.clinicDetail.unassignedStaffHint')}</span>
                                ) : (
                                  <>
                                    {branch.city && <span>{branch.city}{branch.province ? `, ${branch.province}` : ''}</span>}
                                    {branch.streetAddress && <span className="truncate">{branch.streetAddress}</span>}
                                  </>
                                )}
                                {!isVirtual && branch.treatmentRoomsCount ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-secondary">
                                    <AppIcon name="DoorOpen" size={12} />
                                    {t('admin.clinicDetail.roomCountLabel', { count: branch.treatmentRoomsCount })}
                                  </span>
                                ) : null}
                              </div>
                              {!isVirtual && branch.branchCode && (
                                <p className="text-[11px] uppercase tracking-wide text-secondary">
                                  {t('admin.clinicDetail.branchCodeLabel', { code: branch.branchCode })}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border/60 bg-muted/10 p-6 text-center text-sm text-secondary">
                      {t('admin.clinicDetail.noBranchesEmpty')}
                    </div>
                  )}
                </div>

                <div className="rounded-3xl border border-border/40 bg-surface p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-primary">{t('admin.clinicDetail.staffRosterTitle')}</h2>
                      {selectedBranch ? (
                        <p className="text-xs text-secondary">
                          {t('admin.clinicDetail.staffRosterSubtitle', {
                            branch: selectedBranch.branchName || t('admin.clinicDetail.unnamedBranchLabel')
                          })}
                        </p>
                      ) : (
                        <p className="text-xs text-secondary">{t('admin.clinicDetail.noMainBranchHint')}</p>
                      )}
                    </div>
                  </div>
                  {branchList.length ? (
                    <div className="flex flex-wrap gap-2">
                      {branchList.map((branch) => {
                        const branchId = branch.id?.toString?.() ?? branch.id ?? branch.branchName;
                        const isActive = selectedBranchId === branchId;
                        const count = staffByBranch[branchId]?.length || 0;
                        return (
                          <button
                            key={`staff-tab-${branchId}`}
                            onClick={() => setSelectedBranchId(branchId)}
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                              isActive
                                ? 'border-transparent bg-primary text-white shadow-sm'
                                : 'border-border/50 bg-muted/20 text-secondary hover:border-primary/40 hover:text-primary'
                            }`}
                          >
                            <span>{branch.branchName || t('admin.clinicDetail.unnamedBranchLabel')}</span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-medium">
                              <AppIcon name="Users" size={11} />
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                  {selectedBranch ? (
                    <StaffList staff={staffForSelectedBranch} />
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border/60 bg-muted/10 p-6 text-center text-sm text-secondary">
                      {t('admin.clinicDetail.noMainBranchHint')}
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </div>

      {/* Verification Modal */}
      {showVerifyModal && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => !verifying && setShowVerifyModal(false)}
          >
          <div
            className="relative w-full max-w-lg bg-surface rounded-2xl shadow-2xl border border-border/40 max-h-[85vh] overflow-y-auto flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div
                className={`flex items-center justify-center w-12 h-12 rounded-full mx-auto ${
                  verifyAction === 'verify'
                    ? 'bg-emerald-100 dark:bg-emerald-900/30'
                    : 'bg-rose-100 dark:bg-rose-900/30'
                }`}
              >
                <AppIcon
                  name={verifyAction === 'verify' ? 'CheckCircle2' : 'XCircle'}
                  size={24}
                  className={verifyAction === 'verify' ? 'text-emerald-600' : 'text-rose-600'}
                />
              </div>

              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold text-primary">
                  {verifyAction === 'verify'
                    ? t('admin.clinicDetail.modal.approveTitle')
                    : t('admin.clinicDetail.modal.rejectTitle')}
                </h2>

                <p className="text-sm text-secondary">
                  {verifyAction === 'verify'
                    ? t('admin.clinicDetail.modal.approveDescription', {
                        clinic: clinic?.legalName || clinic?.brandName
                      })
                    : t('admin.clinicDetail.modal.rejectDescription', {
                        clinic: clinic?.legalName || clinic?.brandName
                      })}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  {t('admin.clinicDetail.modal.notesLabel')}
                  {verifyAction === 'reject' && <span className="text-rose-600 ml-1">*</span>}
                </label>
                <textarea
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder={
                    verifyAction === 'verify'
                      ? t('admin.clinicDetail.modal.notesPlaceholderApprove')
                      : t('admin.clinicDetail.modal.notesPlaceholderReject')
                  }
                  rows={4}
                  className="w-full p-3 border border-border/40 rounded-xl bg-muted/20 text-sm text-primary placeholder:text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
                />
                <p className="text-xs text-secondary mt-2">
                  {verifyAction === 'verify'
                    ? t('admin.clinicDetail.modal.notesHintApprove')
                    : t('admin.clinicDetail.modal.notesHintReject')}
                </p>
              </div>

              {verifyAction === 'reject' && !verificationNotes.trim() && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    ⚠️ {t('admin.clinicDetail.modal.rejectWarning')}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 px-6 pb-6 pt-4 border-t border-border/40">
              <button
                onClick={() => {
                  setShowVerifyModal(false);
                  setVerifyAction(null);
                  setVerificationNotes('');
                }}
                disabled={verifying}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-border/40 px-4 py-2.5 text-sm font-medium text-secondary transition hover:bg-muted/20 disabled:opacity-50"
              >
                {t('admin.clinicDetail.modal.cancelButton')}
              </button>
              <button
                onClick={handleVerifyClinic}
                disabled={verifying || (verifyAction === 'reject' && !verificationNotes.trim())}
                className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-sm transition disabled:opacity-50 ${
                  verifyAction === 'verify'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {verifying ? (
                  <>
                    <AppIcon name="Loader2" size={16} className="animate-spin" />
                    <span>{t('admin.clinicDetail.modal.processing')}</span>
                  </>
                ) : (
                  <>
                    <AppIcon name={verifyAction === 'verify' ? 'CheckCircle2' : 'XCircle'} size={16} />
                    <span>
                      {verifyAction === 'verify'
                        ? t('admin.clinicDetail.modal.confirmApprove')
                        : t('admin.clinicDetail.modal.confirmReject')
                      }
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default ClinicDetail;
