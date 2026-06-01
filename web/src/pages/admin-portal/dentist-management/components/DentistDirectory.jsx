import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { useToast } from '../../../../contexts/ToastContext';
import AppIcon from '../../../../components/AppIcon';
import ModalPortal from '../../../../components/ui/ModalPortal';

const DentistDirectory = ({ onStatsUpdate, onGoToVerification }) => {
  const { t } = useLanguage();
  const toast = useToast();
  const [dentists, setDentists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');     // all, independent, clinic-staff
  const [filterStatus, setFilterStatus] = useState('all'); // all, verified, pending, rejected
  const [selectedDentist, setSelectedDentist] = useState(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfTitle, setPdfTitle] = useState('');

  // ---------- Helpers ----------
  const safeLower = (v) => (v == null ? '' : String(v).toLowerCase());

  const viewDocument = async (userId, docType, title) => {
    console.log('🔍 DentistDirectory: Viewing document:', { userId, docType, title });
    
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

  // Define the callback BEFORE using it in useEffect to avoid TDZ
  const fetchDentists = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth.accessToken');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch('http://localhost:4000/v1/admin/dentists?limit=1000', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch dentists (HTTP ${response.status})`);
      }

      const result = await response.json();
      const data = Array.isArray(result?.data) ? result.data : [];

      setDentists(data);

      // Update stats if provided by parent
      if (typeof onStatsUpdate === 'function' && result?.stats) {
        onStatsUpdate(result.stats);
      }
    } catch (err) {
      console.error('Error fetching dentists:', err);
      setError(err.message || 'Failed to fetch dentists');
    } finally {
      setLoading(false);
    }
  }, [onStatsUpdate]);

  useEffect(() => {
    fetchDentists();
  }, [fetchDentists]);

  const filteredDentists = useMemo(() => {
    const q = safeLower(searchQuery);
    return dentists.filter((dentist) => {
      const name = safeLower(dentist?.name);
      const email = safeLower(dentist?.email);
      const license = safeLower(dentist?.licenseNumber);
      const type = dentist?.registrationType;
      const status = dentist?.status;

      const matchesSearch =
        !q || name.includes(q) || email.includes(q) || license.includes(q);

      const matchesType =
        filterType === 'all' ||
        (filterType === 'independent' && type === 'independent') ||
        (filterType === 'clinic-staff' && type === 'clinic-staff');

      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'verified' && status === 'verified') ||
        (filterStatus === 'pending' && status === 'pending') ||
        (filterStatus === 'rejected' && status === 'rejected');

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [dentists, searchQuery, filterType, filterStatus]);

  const getStatusBadge = (dentist) => {
    if (dentist?.status === 'verified') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
          <AppIcon name="CheckCircle" size={12} />
          Verified
        </span>
      );
    } else if (dentist?.status === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
          <AppIcon name="XCircle" size={12} />
          Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
        <AppIcon name="Clock" size={12} />
        Pending
      </span>
    );
  };

  const getTypeBadge = (dentist) => {
    if (dentist?.registrationType === 'independent') {
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

  // ---------- UI ----------
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin mb-4">
            <AppIcon name="Loader2" size={48} className="text-accent mx-auto" />
          </div>
          <p className="text-secondary">Loading dentist directory...</p>
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
        <h3 className="text-lg font-medium text-red-800 dark:text-red-400 mb-2">
          Error Loading Directory
        </h3>
        <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
        <button
          onClick={fetchDentists}
          className="px-6 py-3 bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-900/60 text-red-800 dark:text-red-300 rounded-xl border border-red-200 dark:border-red-700 transition-colors duration-200"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <div className="bg-surface border border-border/40 rounded-2xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-secondary mb-2">
              Search Dentists
            </label>
            <div className="relative">
              <AppIcon
                name="Search"
                size={20}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or license number..."
                className="w-full pl-10 pr-4 py-2 border border-border/40 rounded-lg bg-background text-primary placeholder-secondary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              />
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              Registration Type
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-border/40 rounded-lg bg-background text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            >
              <option value="all">All Types</option>
              <option value="independent">Independent</option>
              <option value="clinic-staff">Clinic Staff</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              Verification Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-border/40 rounded-lg bg-background text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            >
              <option value="all">All Status</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-secondary">
          Showing {filteredDentists.length} of {dentists.length} dentists
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDentists}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:text-primary transition-colors"
          >
            <AppIcon name="RefreshCw" size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Dentist List */}
      <div className="bg-surface border border-border/40 rounded-2xl overflow-hidden">
        {filteredDentists.length > 0 ? (
          <div className="divide-y divide-border/40">
            {filteredDentists.map((dentist) => (
              <div key={dentist.id} className="p-6 hover:bg-surface-elevated transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 flex items-center justify-center flex-shrink-0">
                      {dentist?.avatar_url ? (
                        <img
                          src={dentist.avatar_url.startsWith('http') ? dentist.avatar_url : `http://localhost:4000/${dentist.avatar_url}`}
                          alt={dentist?.name || 'Dentist'}
                          className="w-12 h-12 rounded-full object-cover"
                          onError={(e) => {
                            console.log('Failed to load avatar for dentist:', dentist?.name, 'URL:', e.target.src);
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <AppIcon 
                        name="User" 
                        size={24} 
                        className="text-green-600 dark:text-green-400" 
                        style={{ display: dentist?.avatar_url ? 'none' : 'flex' }}
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-primary truncate">
                          {dentist?.name || '-'}
                        </h3>
                        {getStatusBadge(dentist)}
                        {getTypeBadge(dentist)}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-secondary">
                        <div className="flex items-center gap-2">
                          <AppIcon name="Mail" size={14} />
                          <span className="truncate">{dentist?.email || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <AppIcon name="FileText" size={14} />
                          <span>{dentist?.licenseNumber || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <AppIcon name="Award" size={14} />
                          <span>{dentist?.primarySpecialization || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <AppIcon name="Calendar" size={14} />
                          <span>{dentist?.yearsOfExperience != null ? `${dentist.yearsOfExperience} years experience` : '-'}</span>
                        </div>
                        {dentist?.clinicName && (
                          <div className="flex items-center gap-2 md:col-span-2">
                            <AppIcon name="Building" size={14} />
                            <span className="truncate">{dentist.clinicName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('View Details clicked for:', dentist?.name);
                        setSelectedDentist(dentist);
                      }}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-accent hover:bg-accent/10 rounded-lg border border-accent/20 transition-colors cursor-pointer"
                    >
                      <AppIcon name="Eye" size={16} />
                      View Details
                    </button>

                    {dentist?.status === 'pending' && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Verify clicked for:', dentist?.name);
                          if (typeof onGoToVerification === 'function') {
                            onGoToVerification();
                          } else {
                            // Fallback: inform dev/user instead of crashing on undefined function
                            console.info('Provide onGoToVerification prop to navigate to the verification queue.');
                            toast.warning('Navigation to verification queue not configured');
                          }
                        }}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 transition-colors cursor-pointer"
                      >
                        <AppIcon name="CheckCircle" size={16} />
                        Verify
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <AppIcon name="Users" size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-primary mb-2">No Dentists Found</h3>
            <p className="text-secondary">
              {searchQuery || filterType !== 'all' || filterStatus !== 'all'
                ? 'Try adjusting your search or filters'
                : 'No dentists have been registered yet'}
            </p>
          </div>
        )}
      </div>

      {/* Dentist Detail Modal */}
      {selectedDentist && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedDentist(null)}
          >
            <div
              className="relative w-full max-w-4xl max-h-[90vh] bg-surface rounded-2xl shadow-2xl border border-border overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-primary">Dentist Details</h2>
                  <button
                    onClick={() => setSelectedDentist(null)}
                    className="p-2 hover:bg-surface-elevated rounded-full transition-colors"
                  >
                    <AppIcon name="X" size={20} className="text-secondary" />
                  </button>
                </div>
              </div>
            
            <div className="p-6 space-y-6">
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
                  <div className={`absolute -top-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center ${
                    selectedDentist?.status === 'verified' ? 'bg-green-500' :
                    selectedDentist?.status === 'rejected' ? 'bg-red-500' : 'bg-orange-500'
                  }`}>
                    <AppIcon name={
                      selectedDentist?.status === 'verified' ? 'Check' :
                      selectedDentist?.status === 'rejected' ? 'X' : 'Clock'
                    } size={16} className="text-white" />
                  </div>
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-2xl font-bold text-primary">{selectedDentist?.name}</h3>
                    {getStatusBadge(selectedDentist)}
                    {getTypeBadge(selectedDentist)}
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
                      <span>{selectedDentist?.yearsOfExperience} years experience</span>
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
                          ? new Date(selectedDentist.licenseExpiryDate).toLocaleDateString('id-ID')
                          : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Registration Number:</span>
                      <span className="text-primary font-medium">{selectedDentist?.registrationNumber || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Education:</span>
                      <span className="text-primary font-medium">{selectedDentist?.educationQualification || '-'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-primary">Practice Information</h4>
                  <div className="space-y-3 text-sm">
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
                    {selectedDentist?.clinicAddress && (
                      <div className="flex justify-between">
                        <span className="text-secondary">Clinic Address:</span>
                        <span className="text-primary font-medium">{selectedDentist.clinicAddress}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Clinic Information */}
              {selectedDentist?.clinicName && (
                <div className="border-t border-border/40 pt-6">
                  <h4 className="text-lg font-semibold text-primary mb-4">Clinic Information</h4>
                  <div className="bg-surface-elevated rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <AppIcon name="Building" size={24} className="text-primary" />
                      </div>
                      <div>
                        <h5 className="font-semibold text-primary">{selectedDentist.clinicName}</h5>
                        <p className="text-sm text-secondary">
                          {selectedDentist.registrationType === 'clinic-staff' ? 'Clinic Staff' : 'Associated Clinic'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Services Offered */}
              {selectedDentist?.servicesOffered && selectedDentist.servicesOffered.length > 0 && (
                <div className="border-t border-border/40 pt-6">
                  <h4 className="text-lg font-semibold text-primary mb-4">Services Offered</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {selectedDentist.servicesOffered.map((service, index) => (
                      <div key={index} className="bg-surface-elevated rounded-lg p-3 text-sm text-primary">
                        {service}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Consultation Types */}
              {selectedDentist?.consultationTypes && selectedDentist.consultationTypes.length > 0 && (
                <div className="border-t border-border/40 pt-6">
                  <h4 className="text-lg font-semibold text-primary mb-4">Consultation Types</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedDentist.consultationTypes.map((type, index) => (
                      <span key={index} className="px-3 py-1 bg-accent/10 text-accent rounded-full text-sm">
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents Section */}
              <div className="border-t border-border/40 pt-6">
                <h4 className="text-lg font-semibold text-primary mb-4">Documents</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* License Document */}
                  <div className="bg-surface-elevated rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <AppIcon name="FileText" size={20} className="text-blue-600" />
                      </div>
                      <div>
                        <h5 className="font-semibold text-primary">License Document</h5>
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
                  </div>
                </div>
              </div>

              {/* Verification Information */}
              {selectedDentist?.verificationDate && (
                <div className="border-t border-border/40 pt-6">
                  <h4 className="text-lg font-semibold text-primary mb-4">Verification Information</h4>
                  <div className="bg-surface-elevated rounded-xl p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-secondary">Verification Date:</span>
                        <span className="text-primary font-medium">
                          {new Date(selectedDentist.verificationDate).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary">Registration Date:</span>
                        <span className="text-primary font-medium">
                          {new Date(selectedDentist.createdAt).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="border-t border-border/40 pt-6 flex justify-end gap-3">
                <button
                  onClick={() => setSelectedDentist(null)}
                  className="px-6 py-2 bg-surface-elevated hover:bg-surface-muted text-secondary rounded-xl transition-colors"
                >
                  Close
                </button>
                {selectedDentist?.status === 'pending' && (
                  <button
                    onClick={() => {
                      if (typeof onGoToVerification === 'function') {
                        onGoToVerification();
                      }
                    }}
                    className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl transition-colors"
                  >
                    Review Application
                  </button>
                )}
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

export default DentistDirectory;
