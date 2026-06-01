import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { useToast } from '../../../../contexts/ToastContext';
import AppIcon from '../../../../components/AppIcon';
import ModalPortal from '../../../../components/ui/ModalPortal';

const VerificationQueue = ({ onStatsUpdate }) => {
  const { t } = useLanguage();
  const toast = useToast();
  const [pendingDentists, setPendingDentists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDentist, setSelectedDentist] = useState(null);
  const [verificationAction, setVerificationAction] = useState(null); // 'approve' | 'reject'
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'independent' | 'clinic-staff'
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfTitle, setPdfTitle] = useState('');

  // ---- helpers ----
  const viewDocument = async (userId, docType, title) => {
    console.log('🔍 VerificationQueue: Viewing document:', { userId, docType, title });
    
    if (!userId) {
      toast.error('User ID not available');
      return;
    }

    const token = localStorage.getItem('auth.accessToken');
    if (!token) {
      toast.error('Authentication required. Please log in again.');
      return;
    }

    try {
      const response = await fetch(`http://localhost:4000/v1/admin/dentists/${userId}/documents/${docType}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        setPdfUrl(url);
        setPdfTitle(title);
        setShowPdfModal(true);
      } else {
        const errorData = await response.json();
        console.error('❌ Document fetch failed:', errorData);
        toast.error(`Error: ${errorData.error || 'Failed to load document'}`);
      }
    } catch (error) {
      console.error('❌ Error fetching document:', error);
      toast.error('Error loading document. Please try again.');
    }
  };

  const formatDate = useCallback((value) => {
    if (!value) return '-';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('id-ID');
  }, []);

  // Fetch (declare BEFORE useEffect to avoid TDZ)
  const fetchPendingDentists = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth.accessToken');
      if (!token) {
        setError('Authentication required');
        return;
      }

      const queryParams = new URLSearchParams({ type: filter });
      const response = await fetch(
        `http://localhost:4000/v1/admin/dentists/pending?${queryParams}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 403) {
          setError('Access denied - insufficient permissions');
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('🦷 Pending dentists fetched:', result);

      if (result?.success) {
        const data = Array.isArray(result.data) ? result.data : [];
        setPendingDentists(data);

        // Parent stats
        if (typeof onStatsUpdate === 'function') {
          const totalPending = result?.stats?.totalPending ?? data.length ?? 0;
          onStatsUpdate({ pendingVerification: totalPending });
        }
      } else {
        setError('Failed to load pending dentists');
      }
    } catch (err) {
      console.error('Error fetching pending dentists:', err);
      setError('Failed to load verification queue');
    } finally {
      setLoading(false);
    }
  }, [filter, onStatsUpdate]);

  useEffect(() => {
    fetchPendingDentists();
  }, [fetchPendingDentists]);

  const filteredDentists = useMemo(() => {
    return pendingDentists.filter((dentist) => {
      return filter === 'all' || dentist?.registrationType === filter;
    });
  }, [pendingDentists, filter]);

  const handleVerificationAction = (dentist, action) => {
    console.log('🔄 Verification Action:', { dentist: dentist?.name, action });
    setSelectedDentist(dentist);
    setVerificationAction(action);
    setRejectionReason('');
  };

  const submitVerification = async () => {
    if (!selectedDentist || !verificationAction) return;

    setProcessing(true);
    try {
      const token = localStorage.getItem('auth.accessToken');
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const payload = {
        action: verificationAction,
        rejectionReason: verificationAction === 'reject' ? rejectionReason : null,
      };

      const response = await fetch(
        `http://localhost:4000/v1/admin/dentists/${selectedDentist.id}/verify`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || `HTTP ${response.status}`);
      }

      if (result?.success) {
        // Optimistic update
        setPendingDentists((prev) => prev.filter((d) => d.id !== selectedDentist.id));

        // Reset modal state
        setSelectedDentist(null);
        setVerificationAction(null);
        setRejectionReason('');

        toast.success(`Dentist ${verificationAction === 'approve' ? 'approved' : 'rejected'} successfully`);

        // Refresh list (keeps stats in sync)
        fetchPendingDentists();
      } else {
        throw new Error(result?.message || 'Verification failed');
      }
    } catch (err) {
      console.error('Error processing verification:', err);
      toast.error(`Error processing verification: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const getRegistrationTypeBadge = (registrationType) => {
    if (registrationType === 'independent') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          <AppIcon name="User" size={12} />
          Independent
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
        <AppIcon name="Building" size={12} />
        Clinic Staff
      </span>
    );
  };

  const getPriorityLevel = (dentist) => {
    // Example heuristic
    return dentist?.registrationType === 'independent' ? 'High' : 'Medium';
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      High: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      Medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      Low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${colors[priority]}`}>
        {priority} Priority
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin mb-4">
            <AppIcon name="Loader2" size={48} className="text-accent mx-auto" />
          </div>
          <p className="text-secondary">Loading verification queue...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
          <AppIcon name="AlertCircle" size={32} className="text-red-600" />
        </div>
        <h3 className="text-lg font-medium text-red-800 dark:text-red-400 mb-2">Error Loading Queue</h3>
        <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
        <button
          onClick={fetchPendingDentists}
          className="px-6 py-3 bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-900/60 text-red-800 dark:text-red-300 rounded-xl border border-red-200 dark:border-red-700 transition-colors duration-200"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="bg-surface border border-border/40 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-primary mb-1">Verification Queue</h2>
            <p className="text-sm text-secondary">Review and verify dentist credentials and documentation</p>
          </div>

          <div className="flex items-center gap-4">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-border/40 rounded-lg bg-background text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            >
              <option value="all">All Registrations</option>
              <option value="independent">Independent Only</option>
              <option value="clinic-staff">Clinic Staff Only</option>
            </select>

            <button
              onClick={fetchPendingDentists}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:text-primary transition-colors"
            >
              <AppIcon name="RefreshCw" size={16} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Queue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/40 rounded-full flex items-center justify-center">
              <AppIcon name="Clock" size={20} className="text-orange-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{filteredDentists.length}</div>
              <div className="text-sm text-orange-600">Pending Review</div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center">
              <AppIcon name="User" size={20} className="text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {filteredDentists.filter((d) => d.registrationType === 'independent').length}
              </div>
              <div className="text-sm text-blue-600">Independent</div>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/40 rounded-full flex items-center justify-center">
              <AppIcon name="Building" size={20} className="text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {filteredDentists.filter((d) => d.registrationType === 'clinic-staff').length}
              </div>
              <div className="text-sm text-purple-600">Clinic Staff</div>
            </div>
          </div>
        </div>
      </div>

      {/* Verification Queue */}
      <div className="bg-surface border border-border/40 rounded-2xl overflow-hidden">
        {filteredDentists.length > 0 ? (
          <div className="divide-y divide-border/40">
            {filteredDentists.map((dentist) => (
              <div key={dentist.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 flex items-center justify-center flex-shrink-0">
                      {dentist?.avatar_url ? (
                        <img
                          src={dentist.avatar_url.startsWith('http') ? dentist.avatar_url : `http://localhost:4000/${dentist.avatar_url}`}
                          alt={dentist.name}
                          className="w-12 h-12 rounded-full object-cover"
                          onError={(e) => {
                            console.log('Failed to load avatar for dentist:', dentist.name, 'URL:', e.target.src);
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <AppIcon 
                        name="UserCheck" 
                        size={24} 
                        className="text-orange-600 dark:text-orange-400" 
                        style={{ display: dentist?.avatar_url ? 'none' : 'flex' }}
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-primary">{dentist.name}</h3>
                        {getRegistrationTypeBadge(dentist.registrationType)}
                        {getPriorityBadge(getPriorityLevel(dentist))}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-secondary mb-3">
                        <div className="flex items-center gap-2">
                          <AppIcon name="Mail" size={14} />
                          <span className="truncate">{dentist.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <AppIcon name="FileText" size={14} />
                          <span>{dentist.licenseNumber}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <AppIcon name="Award" size={14} />
                          <span>{dentist.primarySpecialization}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <AppIcon name="Calendar" size={14} />
                          <span>Submitted {formatDate(dentist.submittedAt)}</span>
                        </div>
                        {dentist.clinicName && (
                          <div className="flex items-center gap-2 md:col-span-2">
                            <AppIcon name="Building" size={14} />
                            <span className="truncate">{dentist.clinicName}</span>
                          </div>
                        )}
                      </div>

                      {/* Document Status (placeholder) */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded">
                          <AppIcon name="FileCheck" size={12} />
                          SIP Document
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded">
                          <AppIcon name="FileCheck" size={12} />
                          STR Document
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded">
                          <AppIcon name="FileCheck" size={12} />
                          Education Certificate
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => {
                        console.log('👁️ Review button clicked for:', dentist?.name);
                        setSelectedDentist(dentist);
                      }}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-accent hover:bg-accent/10 rounded-lg border border-accent/20 transition-colors"
                    >
                      <AppIcon name="Eye" size={16} />
                      Review
                    </button>
                    <button
                      onClick={() => handleVerificationAction(dentist, 'approve')}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 transition-colors"
                    >
                      <AppIcon name="CheckCircle" size={16} />
                      Approve
                    </button>
                    <button
                      onClick={() => handleVerificationAction(dentist, 'reject')}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 transition-colors"
                    >
                      <AppIcon name="XCircle" size={16} />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <AppIcon name="CheckCircle" size={32} className="text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-primary mb-2">All Caught Up!</h3>
            <p className="text-secondary">No dentists pending verification at the moment.</p>
          </div>
        )}
      </div>

      {/* Verification Action Modal */}
      {verificationAction && selectedDentist && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => {
              if (!loadingAction) {
                setSelectedDentist(null);
                setVerificationAction(null);
                setRejectionReason('');
              }
            }}
          >
          <div
            className="relative w-full max-w-md bg-surface rounded-2xl shadow-2xl border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-border/40">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-primary">
                  {verificationAction === 'approve' ? 'Approve Dentist' : 'Reject Dentist'}
                </h2>
                <button
                  onClick={() => {
                    setSelectedDentist(null);
                    setVerificationAction(null);
                    setRejectionReason('');
                  }}
                  className="p-2 hover:bg-surface-elevated rounded-full transition-colors"
                >
                  <AppIcon name="X" size={20} className="text-secondary" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <p className="text-secondary mb-2">
                  {verificationAction === 'approve'
                    ? `Are you sure you want to approve ${selectedDentist.name}?`
                    : `Are you sure you want to reject ${selectedDentist.name}?`}
                </p>
                <div className="text-sm text-secondary">
                  <p>
                    <strong>Email:</strong> {selectedDentist.email}
                  </p>
                  <p>
                    <strong>License:</strong> {selectedDentist.licenseNumber}
                  </p>
                  <p>
                    <strong>Type:</strong>{' '}
                    {selectedDentist.registrationType === 'independent' ? 'Independent Dentist' : 'Clinic Staff'}
                  </p>
                </div>
              </div>

              {verificationAction === 'reject' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-secondary mb-2">Rejection Reason *</label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Please provide a reason for rejection..."
                    rows={3}
                    className="w-full px-3 py-2 border border-border/40 rounded-lg bg-background text-primary placeholder-secondary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
                    required
                  />
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setSelectedDentist(null);
                    setVerificationAction(null);
                    setRejectionReason('');
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-secondary border border-border/40 rounded-lg hover:bg-surface-elevated transition-colors"
                  disabled={processing}
                >
                  Cancel
                </button>
                <button
                  onClick={submitVerification}
                  disabled={processing || (verificationAction === 'reject' && !rejectionReason.trim())}
                  className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    verificationAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {processing ? (
                    <span className="inline-flex items-center gap-2">
                      <AppIcon name="Loader2" size={16} className="animate-spin" />
                      Processing...
                    </span>
                  ) : verificationAction === 'approve' ? (
                    'Approve'
                  ) : (
                    'Reject'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Detailed Review Modal */}
      {selectedDentist && !verificationAction && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedDentist(null)}
          >
          <div
            className="relative w-full max-w-6xl max-h-[90vh] bg-surface rounded-2xl shadow-2xl border border-border overflow-y-auto flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-border/40">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-primary">Review Dentist Application</h2>
                <button
                  onClick={() => setSelectedDentist(null)}
                  className="p-2 hover:bg-surface-elevated rounded-full transition-colors"
                >
                  <AppIcon name="X" size={20} className="text-secondary" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Header Section */}
              <div className="flex items-start gap-6">
                <div className="relative">
                  {selectedDentist?.avatar_url ? (
                    <>
                      <img
                        src={selectedDentist.avatar_url.startsWith('http') ? selectedDentist.avatar_url : `http://localhost:4000/${selectedDentist.avatar_url}`}
                        alt={selectedDentist.name}
                        className="w-24 h-24 rounded-2xl object-cover border-2 border-border/20"
                        onError={(e) => {
                          console.log('Failed to load avatar for dentist in modal:', selectedDentist.name, 'URL:', e.target.src);
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center border-2 border-border/20" style={{ display: 'none' }}>
                        <AppIcon name="User" size={40} className="text-primary/60" />
                      </div>
                    </>
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center border-2 border-border/20">
                      <AppIcon name="User" size={40} className="text-primary/60" />
                    </div>
                  )}
                  <div className="absolute -top-1 -right-1 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                    <AppIcon name="Clock" size={16} className="text-white" />
                  </div>
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-2xl font-bold text-primary">{selectedDentist?.name}</h3>
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                      <AppIcon name="Clock" size={12} />
                      Pending Review
                    </span>
                    {getRegistrationTypeBadge(selectedDentist.registrationType)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-secondary">
                      <AppIcon name="Mail" size={16} />
                      <span>{selectedDentist?.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-secondary">
                      <AppIcon name="CreditCard" size={16} />
                      <span>{selectedDentist?.licenseNumber}</span>
                    </div>
                    <div className="flex items-center gap-2 text-secondary">
                      <AppIcon name="Award" size={16} />
                      <span>{selectedDentist?.primarySpecialization}</span>
                    </div>
                    <div className="flex items-center gap-2 text-secondary">
                      <AppIcon name="Calendar" size={16} />
                      <span>Submitted {formatDate(selectedDentist?.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Professional Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-primary">Professional Details</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-secondary">Title:</span>
                      <span className="text-primary font-medium">{selectedDentist?.title || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">License Issuing Body:</span>
                      <span className="text-primary font-medium">{selectedDentist?.licenseIssuingBody || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">License Expiry:</span>
                      <span className="text-primary font-medium">
                        {selectedDentist?.licenseExpiryDate 
                          ? formatDate(selectedDentist.licenseExpiryDate)
                          : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Registration Number:</span>
                      <span className="text-primary font-medium">{selectedDentist?.registrationNumber || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Education:</span>
                      <span className="text-primary font-medium text-right max-w-48 truncate">{selectedDentist?.educationQualification || '-'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-primary">Practice Information</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-secondary">Years of Experience:</span>
                      <span className="text-primary font-medium">{selectedDentist?.yearsOfExperience || 0} years</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Consultation Fee:</span>
                      <span className="text-primary font-medium">
                        {selectedDentist?.consultationFee 
                          ? `Rp ${Number(selectedDentist.consultationFee).toLocaleString('id-ID')}`
                          : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Accepts Insurance:</span>
                      <span className={`font-medium ${selectedDentist?.acceptsInsurance ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedDentist?.acceptsInsurance ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Accepts BPJS:</span>
                      <span className={`font-medium ${selectedDentist?.acceptsBpjs ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedDentist?.acceptsBpjs ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Emergency Available:</span>
                      <span className={`font-medium ${selectedDentist?.emergencyAvailability ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedDentist?.emergencyAvailability ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Documents Section */}
              <div className="border-t border-border/40 pt-6">
                <h4 className="text-lg font-semibold text-primary mb-4">Submitted Documents</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* SIP Document */}
                  <div className="bg-surface-elevated rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <AppIcon name="FileText" size={20} className="text-blue-600" />
                      </div>
                      <div>
                        <h5 className="font-semibold text-primary">SIP Document</h5>
                        <p className="text-sm text-secondary">Professional license</p>
                      </div>
                    </div>
                                        <button
                      onClick={() => {
                        const userId = selectedDentist?.userId || selectedDentist?.id;
                        viewDocument(userId, 'sip', 'SIP License Document');
                      }}
                      className="w-full px-4 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors text-sm"
                    >
                      <AppIcon name="ExternalLink" size={16} className="inline mr-2" />
                      View SIP PDF
                    </button>
                  </div>

                  {/* STR Document */}
                  <div className="bg-surface-elevated rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <AppIcon name="Award" size={20} className="text-green-600" />
                      </div>
                      <div>
                        <h5 className="font-semibold text-primary">STR Document</h5>
                        <p className="text-sm text-secondary">Registration certificate</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const userId = selectedDentist?.userId || selectedDentist?.id;
                        viewDocument(userId, 'str', 'STR Registration Document');
                      }}
                      className="w-full px-4 py-2 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-600 rounded-lg border border-green-200 dark:border-green-800 transition-colors text-sm"
                    >
                      <AppIcon name="ExternalLink" size={16} className="inline mr-2" />  
                      View STR PDF
                    </button>
                  </div>

                  {/* Education Documents */}
                  <div className="bg-surface-elevated rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <AppIcon name="GraduationCap" size={20} className="text-purple-600" />
                      </div>
                      <div>
                        <h5 className="font-semibold text-primary">Education Documents</h5>
                        <p className="text-sm text-secondary">Academic certificates</p>
                      </div>
                    </div>
                    {selectedDentist?.ijazahFilePaths && selectedDentist.ijazahFilePaths.length > 0 ? (
                      <div className="space-y-2">
                        {selectedDentist.ijazahFilePaths.map((filePath, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              const eduUrl = `http://localhost:4000/${filePath}`;
                              window.open(eduUrl, '_blank');
                            }}
                            className="w-full px-4 py-2 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/40 text-purple-600 rounded-lg border border-purple-200 dark:border-purple-800 transition-colors text-sm"
                          >
                            <AppIcon name="ExternalLink" size={16} className="inline mr-2" />
                            View Education Document {index + 1}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          const userId = selectedDentist?.userId || selectedDentist?.id;
                          viewDocument(userId, 'ijazah', 'Education Certificate');
                        }}
                        className="w-full px-4 py-2 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/40 text-purple-600 rounded-lg border border-purple-200 dark:border-purple-800 transition-colors text-sm"
                      >
                        <AppIcon name="ExternalLink" size={16} className="inline mr-2" />
                        View Education Document
                      </button>
                    )}
                  </div>

                  {/* Certification Documents */}
                  <div className="bg-surface-elevated rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                        <AppIcon name="Folder" size={20} className="text-orange-600" />
                      </div>
                      <div>
                        <h5 className="font-semibold text-primary">Certifications</h5>
                        <p className="text-sm text-secondary">Professional certifications</p>
                      </div>
                    </div>
                    {selectedDentist?.certificationFilePaths && selectedDentist.certificationFilePaths.length > 0 ? (
                      <div className="space-y-2">
                        {selectedDentist.certificationFilePaths.map((filePath, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              const certUrl = `http://localhost:4000/${filePath}`;
                              window.open(certUrl, '_blank');
                            }}
                            className="w-full px-4 py-2 bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 dark:hover:bg-orange-900/40 text-orange-600 rounded-lg border border-orange-200 dark:border-orange-800 transition-colors text-sm"
                          >
                            <AppIcon name="ExternalLink" size={16} className="inline mr-2" />
                            View Certification {index + 1}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          const userId = selectedDentist?.userId || selectedDentist?.id;
                          viewDocument(userId, 'certification', 'Professional Certification');
                        }}
                        className="w-full px-4 py-2 bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 dark:hover:bg-orange-900/40 text-orange-600 rounded-lg border border-orange-200 dark:border-orange-800 transition-colors text-sm"
                      >
                        <AppIcon name="ExternalLink" size={16} className="inline mr-2" />
                        View Certification Document
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t border-border/40 pt-6 flex justify-between">
                <button
                  onClick={() => setSelectedDentist(null)}
                  className="px-6 py-2 bg-surface-elevated hover:bg-surface-muted text-secondary rounded-xl transition-colors"
                >
                  Close
                </button>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => handleVerificationAction(selectedDentist, 'reject')}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors"
                  >
                    <AppIcon name="XCircle" size={16} className="inline mr-2" />
                    Reject Application
                  </button>
                  <button
                    onClick={() => handleVerificationAction(selectedDentist, 'approve')}
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors"
                  >
                    <AppIcon name="CheckCircle" size={16} className="inline mr-2" />
                    Approve Application
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* PDF Modal */}
      {showPdfModal && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => {
              setShowPdfModal(false);
              if (pdfUrl) {
                window.URL.revokeObjectURL(pdfUrl);
                setPdfUrl(null);
              }
            }}
          >
          <div
            className="relative w-full max-w-6xl h-[90vh] bg-surface rounded-2xl shadow-2xl border border-border flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-border/40">
              <h3 className="text-xl font-semibold text-primary">{pdfTitle}</h3>
              <button
                onClick={() => {
                  setShowPdfModal(false);
                  if (pdfUrl) {
                    window.URL.revokeObjectURL(pdfUrl);
                    setPdfUrl(null);
                  }
                }}
                className="p-2 hover:bg-surface-muted rounded-lg transition-colors"
              >
                <AppIcon name="X" size={24} className="text-secondary" />
              </button>
            </div>

            {/* PDF Viewer */}
            <div className="flex-1 p-6">
              {pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  className="w-full h-full rounded-lg border border-border/40"
                  title={pdfTitle}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <AppIcon name="FileText" size={48} className="text-secondary mx-auto mb-4" />
                    <p className="text-secondary">Loading document...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default VerificationQueue;
