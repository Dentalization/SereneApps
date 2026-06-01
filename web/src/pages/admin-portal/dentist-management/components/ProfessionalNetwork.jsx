import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { useToast } from '../../../../contexts/ToastContext';
import AppIcon from '../../../../components/AppIcon';
import ModalPortal from '../../../../components/ui/ModalPortal';

const ProfessionalNetwork = ({ onStatsUpdate }) => {
  const { t } = useLanguage();
  const toast = useToast();
  const [verifiedDentists, setVerifiedDentists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [specializationFilter, setSpecializationFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [selectedDentist, setSelectedDentist] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfTitle, setPdfTitle] = useState('');
  const [networkStats, setNetworkStats] = useState({
    totalVerified: 0,
    bySpecialization: {},
    byLocation: {},
    recentJoins: 0,
  });

  // ---------- helpers ----------
  const toText = useCallback((v) => (v == null ? '' : String(v)), []);
  const includesI = useCallback(
    (val, qLower) => toText(val).toLowerCase().includes(qLower),
    [toText]
  );

  const viewDocument = async (userId, docType, title) => {
    console.log('🔍 ProfessionalNetwork: Viewing document:', { userId, docType, title });
    
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

  const calculateStats = useCallback((dentists) => {
    const stats = {
      totalVerified: dentists.length,
      bySpecialization: {},
      byLocation: {},
      recentJoins: 0,
    };

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    dentists.forEach((dentist) => {
      const spec = dentist.primarySpecialization || 'Unknown';
      const loc = dentist.location || 'Unknown';
      stats.bySpecialization[spec] = (stats.bySpecialization[spec] || 0) + 1;
      stats.byLocation[loc] = (stats.byLocation[loc] || 0) + 1;

      if (dentist.verificationDate && new Date(dentist.verificationDate) > oneWeekAgo) {
        stats.recentJoins += 1;
      }
    });

    return stats;
  }, []);

  // Transform backend data to include network metrics
  const transformDentistData = useCallback((dentist) => {
    // Extract location from clinic address or default to Jakarta
    const location = dentist?.clinicAddress?.includes('Jakarta') ? 'Jakarta' :
                    dentist?.clinicAddress?.includes('Surabaya') ? 'Surabaya' :
                    dentist?.clinicAddress?.includes('Bandung') ? 'Bandung' :
                    dentist?.clinicAddress?.includes('Medan') ? 'Medan' :
                    'Jakarta'; // Default fallback

    return {
      ...dentist,
      location,
      // Add network performance metrics (would come from real data in production)
      rating: 4.5 + Math.random() * 0.5, // Random between 4.5-5.0
      totalReviews: Math.floor(Math.random() * 200) + 50,
      patientsServed: Math.floor(Math.random() * 500) + 200,
      networkConnections: Math.floor(Math.random() * 80) + 20,
      referralsMade: Math.floor(Math.random() * 50) + 10,
      referralsReceived: Math.floor(Math.random() * 40) + 5,
      // Normalize boolean fields
      acceptsBPJS: dentist?.acceptsBpjs || false,
      isVerified: dentist?.isVerified || dentist?.status === 'verified',
    };
  }, []);

  // Fetch verified dentists using the working /admin/dentists endpoint
  const fetchVerifiedDentists = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth.accessToken');
      if (!token) {
        throw new Error('Authentication required');
      }

      // Use the working /admin/dentists endpoint instead of /admin/dentists/verified
      const response = await fetch('http://localhost:4000/v1/admin/dentists', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch dentists (HTTP ${response.status})`);
      }

      const result = await response.json();
      const allDentists = Array.isArray(result?.data) ? result.data : [];
      
      // Filter only verified dentists and transform data
      const verifiedDentistsData = allDentists
        .filter(dentist => dentist?.isVerified === true || dentist?.status === 'verified')
        .map(transformDentistData);
      
      setVerifiedDentists(verifiedDentistsData);

      const stats = calculateStats(verifiedDentistsData);
      setNetworkStats(stats);

      if (typeof onStatsUpdate === 'function') {
        onStatsUpdate({ verifiedDentists: verifiedDentistsData.length });
      }
    } catch (err) {
      console.error('Error fetching verified dentists:', err);
      setError(err.message || 'Failed to fetch verified dentists');
    } finally {
      setLoading(false);
    }
  }, [calculateStats, transformDentistData, onStatsUpdate]);

  useEffect(() => {
    fetchVerifiedDentists();
  }, [fetchVerifiedDentists]);

  const filteredDentists = useMemo(() => {
    const searchLower = toText(searchQuery).toLowerCase();
    return verifiedDentists.filter((dentist) => {
      const matchesSearch =
        includesI(dentist?.name, searchLower) ||
        includesI(dentist?.email, searchLower) ||
        includesI(dentist?.primarySpecialization, searchLower) ||
        includesI(dentist?.location, searchLower);

      const matchesSpecialization =
        specializationFilter === 'all' || dentist?.primarySpecialization === specializationFilter;

      const matchesLocation = locationFilter === 'all' || dentist?.location === locationFilter;

      return matchesSearch && matchesSpecialization && matchesLocation;
    });
  }, [verifiedDentists, searchQuery, specializationFilter, locationFilter, includesI, toText]);

  // ---------- UI helpers ----------
  const getPerformanceBadge = (rating) => {
    const r = Number(rating);
    if (r >= 4.8) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
          <AppIcon name="Star" size={12} />
          Top Performer
        </span>
      );
    }
    if (r >= 4.5) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          <AppIcon name="TrendingUp" size={12} />
          High Performer
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
        <AppIcon name="User" size={12} />
        Active
      </span>
    );
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

  // ---------- render ----------
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin mb-4">
            <AppIcon name="Loader2" size={48} className="text-accent mx-auto" />
          </div>
          <p className="text-secondary">Loading professional network...</p>
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
        <h3 className="text-lg font-medium text-red-800 dark:text-red-400 mb-2">Error Loading Network</h3>
        <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
        <button
          onClick={fetchVerifiedDentists}
          className="px-6 py-3 bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-900/60 text-red-800 dark:text-red-300 rounded-xl border border-red-200 dark:border-red-700 transition-colors duration-200"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Network Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center">
              <AppIcon name="Users" size={20} className="text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{networkStats.totalVerified}</div>
              <div className="text-sm text-green-600">Verified Dentists</div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center">
              <AppIcon name="Award" size={20} className="text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{Object.keys(networkStats.bySpecialization).length}</div>
              <div className="text-sm text-blue-600">Specializations</div>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/40 rounded-full flex items-center justify-center">
              <AppIcon name="MapPin" size={20} className="text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{Object.keys(networkStats.byLocation).length}</div>
              <div className="text-sm text-purple-600">Cities</div>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/40 rounded-full flex items-center justify-center">
              <AppIcon name="UserPlus" size={20} className="text-orange-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{networkStats.recentJoins}</div>
              <div className="text-sm text-orange-600">New This Month</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-surface border border-border/40 rounded-2xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-secondary mb-2">Search Network</label>
            <div className="relative">
              <AppIcon name="Search" size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, specialization, or location..."
                className="w-full pl-10 pr-4 py-2 border border-border/40 rounded-lg bg-background text-primary placeholder-secondary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              />
            </div>
          </div>

          {/* Specialization Filter */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">Specialization</label>
            <select
              value={specializationFilter}
              onChange={(e) => setSpecializationFilter(e.target.value)}
              className="w-full px-3 py-2 border border-border/40 rounded-lg bg-background text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            >
              <option value="all">All Specializations</option>
              {Object.keys(networkStats.bySpecialization).map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </select>
          </div>

          {/* Location Filter */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">Location</label>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full px-3 py-2 border border-border/40 rounded-lg bg-background text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            >
              <option value="all">All Locations</option>
              {Object.keys(networkStats.byLocation).map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-secondary">
          Showing {filteredDentists.length} of {verifiedDentists.length} verified dentists
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchVerifiedDentists}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:text-primary transition-colors"
          >
            <AppIcon name="RefreshCw" size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Professional Network Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredDentists.length > 0 ? (
          filteredDentists.map((dentist) => (
            <div key={dentist.id} className="bg-surface border border-border/40 rounded-2xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-4">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 flex items-center justify-center flex-shrink-0">
                    {dentist?.avatar_url ? (
                      <img 
                        src={dentist.avatar_url.startsWith('http') 
                          ? dentist.avatar_url 
                          : `http://localhost:4000/${dentist.avatar_url}`} 
                        alt={dentist.name} 
                        className="w-12 h-12 rounded-full object-cover"
                        onError={(e) => {
                          console.log('❌ Avatar failed to load:', dentist.avatar_url);
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = `<svg class="w-6 h-6 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;
                        }}
                      />
                    ) : (
                      <AppIcon name="User" size={24} className="text-green-600 dark:text-green-400" />
                    )}
                  </div>

                  {/* Basic Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="text-lg font-semibold text-primary truncate">{dentist.name}</h3>
                      {getPerformanceBadge(dentist.rating)}
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      {getRegistrationTypeBadge(dentist.registrationType)}
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <AppIcon name="CheckCircle" size={12} />
                        Verified
                      </span>
                    </div>

                    <div className="text-sm text-secondary space-y-1">
                      <div className="flex items-center gap-2">
                        <AppIcon name="Award" size={14} />
                        <span>{dentist.primarySpecialization}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <AppIcon name="MapPin" size={14} />
                        <span>{dentist.location}</span>
                      </div>
                      {dentist.clinicName && (
                        <div className="flex items-center gap-2">
                          <AppIcon name="Building" size={14} />
                          <span className="truncate">{dentist.clinicName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedDentist(dentist);
                    setShowDetailModal(true);
                  }}
                  className="p-2 hover:bg-surface-elevated rounded-full transition-colors flex-shrink-0"
                  title="View Profile"
                >
                  <AppIcon name="Eye" size={20} className="text-secondary" />
                </button>
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <AppIcon name="Star" size={16} className="text-yellow-500" />
                    <span className="text-lg font-bold text-primary">{dentist.rating}</span>
                  </div>
                  <div className="text-xs text-secondary">{dentist.totalReviews} reviews</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-primary">{dentist.patientsServed}</div>
                  <div className="text-xs text-secondary">Patients served</div>
                </div>
              </div>

              {/* Network Stats */}
              <div className="grid grid-cols-3 gap-2 pt-4 border-t border-border/40">
                <div className="text-center">
                  <div className="text-sm font-semibold text-primary">{dentist.networkConnections}</div>
                  <div className="text-xs text-secondary">Connections</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-green-600">{dentist.referralsMade}</div>
                  <div className="text-xs text-secondary">Referred</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-blue-600">{dentist.referralsReceived}</div>
                  <div className="text-xs text-secondary">Received</div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="lg:col-span-2 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <AppIcon name="Network" size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-primary mb-2">No Dentists Found</h3>
            <p className="text-secondary">
              {searchQuery || specializationFilter !== 'all' || locationFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'No verified dentists in the network yet'}
            </p>
          </div>
        )}
      </div>

      {/* Detailed Profile Modal */}
      {showDetailModal && selectedDentist && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowDetailModal(false)}
          >
          <div
            className="relative w-full max-w-4xl max-h-[90vh] bg-surface rounded-2xl shadow-2xl border border-border overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-border/40">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-primary">Professional Profile</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 hover:bg-surface-elevated rounded-full transition-colors"
                >
                  <AppIcon name="X" size={20} className="text-secondary" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Header Section */}
              <div className="flex items-start gap-6">
                <div className="relative group">
                  {selectedDentist?.avatar_url ? (
                    <img
                      src={selectedDentist.avatar_url.startsWith('http') 
                        ? selectedDentist.avatar_url 
                        : `http://localhost:4000/${selectedDentist.avatar_url}`}
                      alt={selectedDentist.name}
                      className="w-24 h-24 rounded-2xl object-cover border-2 border-border/20"
                      onError={(e) => {
                        console.log('❌ Modal avatar failed to load:', selectedDentist.avatar_url);
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = `<div class="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center border-2 border-border/20"><svg class="w-12 h-12 text-primary/60" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>`;
                      }}
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center border-2 border-border/20">
                      <AppIcon name="User" size={40} className="text-primary/60" />
                    </div>
                  )}
                  <div className="absolute -top-1 -right-1 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <AppIcon name="Check" size={16} className="text-white" />
                  </div>
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-bold text-primary">{selectedDentist?.name}</h3>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        selectedDentist?.registrationType === 'clinic-staff'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                      }`}
                    >
                      {selectedDentist?.registrationType === 'clinic-staff'
                        ? 'Clinic Dentist'
                        : 'Independent'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-secondary">
                    <div className="flex items-center gap-2">
                      <AppIcon name="Mail" size={16} />
                      <span>{selectedDentist?.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AppIcon name="CreditCard" size={16} />
                      <span>{selectedDentist?.licenseNumber}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-secondary">
                    <div className="flex items-center gap-2">
                      <AppIcon name="MapPin" size={16} />
                      <span>{selectedDentist?.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AppIcon name="Calendar" size={16} />
                      <span>{selectedDentist?.yearsOfExperience} years experience</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <AppIcon
                          key={i}
                          name="Star"
                          size={16}
                          className={
                            i < Math.floor(Number(selectedDentist?.rating || 0))
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }
                        />
                      ))}
                    </div>
                    <span className="text-sm text-secondary">
                      {selectedDentist?.rating} ({selectedDentist?.totalReviews || 0} reviews)
                    </span>
                  </div>
                </div>
              </div>

              {/* Professional Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-primary">Professional Details</h4>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-secondary">Primary Specialization:</span>
                      <span className="text-primary font-medium">{selectedDentist?.primarySpecialization}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-secondary">Consultation Fee:</span>
                      <span className="text-primary font-medium">
                        {selectedDentist?.consultationFee != null
                          ? `Rp ${Number(selectedDentist.consultationFee).toLocaleString('id-ID')}`
                          : '-'}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-secondary">Insurance Accepted:</span>
                      <span className={`font-medium ${selectedDentist?.acceptsInsurance ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedDentist?.acceptsInsurance ? 'Yes' : 'No'}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-secondary">BPJS Accepted:</span>
                      <span className={`font-medium ${selectedDentist?.acceptsBPJS ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedDentist?.acceptsBPJS ? 'Yes' : 'No'}
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

                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-primary">Network Performance</h4>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-secondary">Network Connections:</span>
                      <span className="text-primary font-medium">{selectedDentist?.networkConnections || 0}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-secondary">Referrals Made:</span>
                      <span className="text-primary font-medium">{selectedDentist?.referralsMade || 0}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-secondary">Referrals Received:</span>
                      <span className="text-primary font-medium">{selectedDentist?.referralsReceived || 0}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-secondary">Verification Date:</span>
                      <span className="text-primary font-medium">
                        {selectedDentist?.verificatioDate /* typo-proof */ || selectedDentist?.verificationDate
                          ? new Date(selectedDentist?.verificationDate || selectedDentist?.verificatioDate).toLocaleDateString('id-ID')
                          : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Clinic Information (if applicable) */}
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
                        <p className="text-sm text-secondary">Associated Clinic</p>
                      </div>
                    </div>
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
                      View License PDF
                    </button>
                  </div>

                  {/* Certificate Document */}
                  <div className="bg-surface-elevated rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <AppIcon name="Award" size={20} className="text-green-600" />
                      </div>
                      <div>
                        <h5 className="font-semibold text-primary">Certificate</h5>
                        <p className="text-sm text-secondary">Education certificate</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const userId = selectedDentist?.userId || selectedDentist?.id;
                        viewDocument(userId, 'ijazah', 'Education Certificate');
                      }}
                      className="w-full px-4 py-2 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-600 rounded-lg border border-green-200 dark:border-green-800 transition-colors text-sm"
                    >
                      <AppIcon name="ExternalLink" size={16} className="inline mr-2" />
                      View Certificate PDF
                    </button>
                  </div>

                  {/* ID Document */}
                  <div className="bg-surface-elevated rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <AppIcon name="CreditCard" size={20} className="text-purple-600" />
                      </div>
                      <div>
                        <h5 className="font-semibold text-primary">Identity Document</h5>
                        <p className="text-sm text-secondary">Government ID</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const userId = selectedDentist?.userId || selectedDentist?.id;
                        viewDocument(userId, 'str', 'STR Registration Document');
                      }}
                      className="w-full px-4 py-2 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/40 text-purple-600 rounded-lg border border-purple-200 dark:border-purple-800 transition-colors text-sm"
                    >
                      <AppIcon name="ExternalLink" size={16} className="inline mr-2" />
                      View ID PDF
                    </button>
                  </div>

                  {/* Additional Documents */}
                  <div className="bg-surface-elevated rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                        <AppIcon name="Folder" size={20} className="text-orange-600" />
                      </div>
                      <div>
                        <h5 className="font-semibold text-primary">Additional Documents</h5>
                        <p className="text-sm text-secondary">Supporting documents</p>
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
                      View Additional PDF
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t border-border/40 pt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-6 py-2 bg-surface-elevated hover:bg-surface-muted text-secondary rounded-xl transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    // TODO: Implement contact dentist functionality
                    console.log('Contact dentist:', selectedDentist?.name);
                    // For now, show a simple notification
                    if (selectedDentist?.email) {
                      window.open(`mailto:${selectedDentist.email}?subject=Professional Network Contact`);
                    }
                  }}
                  className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl transition-colors"
                >
                  Contact Dentist
                </button>
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

export default ProfessionalNetwork;
