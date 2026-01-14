// /src/pages/dentist-portal/patient/PatientManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import SideBar from '../ui/SideBar';
import Icon from '../../../components/AppIcon';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getDentistPatients, getPatientDetails, getPatientAIResults } from '../../../services/dentistPortalService';

// Components
import AddPatient from './components/AddPatient';
import PatientAIResult from './components/PatientAIResult';
import PatientAppointment from './components/PatientAppointment';
import PatientBilling from './components/PatientBilling';
import PatientCommunication from './components/PatientCommunication';
import PatientList from './components/PatientList';
import PatientMedicalHistory from './components/PatientMedicalHistory';
import PatientProfile from './components/PatientProfile';
import PatientTreatmentPlan from './components/PatientTreatmentPlan';
import EnhancedHeader from './components/EnhancedHeader.jsx';

const MIN_LOADING_MS = 500;

const PatientManagement = () => {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [patients, setPatients] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    byStatus: {},
    withAiResults: 0
  });
  const { t } = useLanguage();

  // Normalize backend AI results to UI-friendly shape expected by PatientAIResult
  const transformAIResults = useCallback((results = []) => {
    return (results || []).map((r) => {
      const detections = Array.isArray(r.detections) ? r.detections : [];
      
      // Build diagnosis from detections or create summary item
      const diagnosis = detections.length > 0
        ? detections.map((d) => {
            // Calculate confidence: handle 0-1 range or percentage
            let confidence = 0;
            if (typeof d.confidence === 'number') {
              confidence = d.confidence <= 1 ? Math.round(d.confidence * 100) : d.confidence;
            } else if (typeof d.probability === 'number') {
              confidence = d.probability <= 1 ? Math.round(d.probability * 100) : d.probability;
            }
            
            return {
              condition: d.label || d.name || d.condition || 'Temuan Dental',
              description: d.description || d.details || r.summary || r.overallAssessment || 'Analisis dental',
              probability: confidence || Number(r.confidenceScore || 0),
              details: d.details || r.findings || null,
              severity: d.severity || null,
            };
          })
        : (r.summary || r.overallAssessment || r.findings)
        ? [
            {
              condition: r.overallAssessment ? 'Penilaian Keseluruhan' : 'Ringkasan Analisis',
              description: r.summary || r.overallAssessment || r.findings || 'Analisis gigi dilakukan',
              probability: Number(r.confidenceScore || 0),
              details: r.findings || null,
              severity: null,
            },
          ]
        : [];

      // Extract symptoms from detections if not provided
      const symptoms = Array.isArray(r.symptoms) && r.symptoms.length > 0
        ? r.symptoms
        : detections.map((d, idx) => ({
            name: d.label || d.name || `Temuan ${idx + 1}`,
            severity: d.severity || (d.confidence > 0.7 ? 'high' : d.confidence > 0.4 ? 'medium' : 'low'),
            description: d.description || null,
          }));
      
      // Process recommendations with proper structure
      const recommendations = Array.isArray(r.recommendations) 
        ? r.recommendations.map((rec, idx) => ({
            title: rec.title || rec.name || `Rekomendasi ${idx + 1}`,
            description: rec.description || rec.text || rec.recommendation || '',
            priority: rec.priority || rec.importance || 'normal',
            urgency: rec.urgency || rec.timeframe || 'normal',
          }))
        : [];
      
      const images = [
        ...(r.imageUrl
          ? [{ url: r.imageUrl, type: 'original', description: 'Gambar asli' }]
          : []),
        ...(r.annotatedImageUrl
          ? [{ url: r.annotatedImageUrl, type: 'annotated', description: 'Hasil anotasi AI' }]
          : []),
      ];

      // Calculate proper confidence score
      let confidence = Number(r.confidenceScore || 0);
      if (confidence <= 1) confidence = Math.round(confidence * 100);

      return {
        id: r.id?.toString?.() || r.id,
        date: (r.createdAt || '').split('T')[0] || r.createdAt || new Date().toISOString().split('T')[0],
        type: r.overallAssessment || r.summary ? 'Analisis Dental AI' : 'Deteksi AI',
        confidence,
        riskLevel: r.riskLevel || 'unknown',
        diagnosis,
        symptoms,
        recommendations,
        images,
      };
    });
  }, []);

  // Fetch AI results with small retry to handle eventual consistency
  const getAIResultsWithRetry = useCallback(async (patientId, attempts = 2, delayMs = 1000) => {
    for (let i = 0; i <= attempts; i++) {
      try {
        const aiRes = await getPatientAIResults(patientId);
        const list = aiRes?.aiResults || aiRes || [];
        if (Array.isArray(list) && list.length > 0) {
          return list;
        }
      } catch (e) {
        console.warn('getPatientAIResults attempt failed:', e?.message);
      }
      if (i < attempts) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
    return [];
  }, []);

  // Fetch patients from API
  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (filterStatus && filterStatus !== 'all') params.status = filterStatus;
      
      console.log('🔍 Fetching dentist patients with params:', params);
      
      const response = await getDentistPatients(params);
      
      console.log('✅ Received response:', {
        totalPatients: response.patients?.length || 0,
        summary: response.summary,
        firstPatient: response.patients?.[0]
      });
      
      // Transform API data to match component expectations
      const transformedPatients = (response.patients || []).map(p => ({
        id: p.id,
        patientId: `PT${p.id.padStart(3, '0')}`,
        name: p.name || 'Unknown',
        phone: p.phone,
        email: p.email,
        avatar: p.avatar,
        status: p.status || 'inactive',
        lastVisit: p.lastVisit ? p.lastVisit.split('T')[0] : null,
        nextAppointment: p.nextAppointment ? p.nextAppointment.split('T')[0] : null,
        aiResults: transformAIResults(p.aiResults || []),
        appointmentCount: p.appointmentCount || 0,
        appointments: [],
        billing: { totalBalance: 0, paidAmount: 0, pendingAmount: 0 }
      }));
      
      console.log('📋 Transformed patients:', transformedPatients.length);
      
      setPatients(transformedPatients);
      setSummary(response.summary || {
        total: transformedPatients.length,
        byStatus: transformedPatients.reduce((acc, pt) => {
          acc[pt.status] = (acc[pt.status] || 0) + 1;
          return acc;
        }, {}),
        withAiResults: transformedPatients.filter(p => p.aiResults.length > 0).length
      });
    } catch (err) {
      console.error('❌ Error fetching patients:', err);
      console.error('Error details:', {
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data
      });
      
      let errorMessage = 'Gagal memuat daftar pasien';
      
      if (err.response?.status === 401) {
        errorMessage = 'Sesi Anda telah berakhir. Silakan login kembali.';
      } else if (err.response?.status === 403) {
        errorMessage = 'Anda tidak memiliki akses untuk melihat data pasien.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      setError(errorMessage);
      setPatients([]);
    } finally {
      // Ensure minimum loading time for smooth UX
      setTimeout(() => setLoading(false), MIN_LOADING_MS);
    }
  }, [searchTerm, filterStatus, transformAIResults]);

  // Initial fetch and refetch on search/filter change
  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPatients();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // --- Handlers ---
  const handleAddPatient = (patientData) => {
    const newPatient = {
      id: (patients.length + 1).toString(),
      patientId: `PT${String(patients.length + 1).padStart(3, '0')}`,
      ...patientData,
      status: 'new',
      lastVisit: null,
      appointments: [],
      billing: { totalBalance: 0, paidAmount: 0, pendingAmount: 0 }
    };
    setPatients((prev) => [...prev, newPatient]);
    setShowAddPatient(false);
    setSelectedPatient(newPatient);
  };

  const handlePatientSelect = useCallback(async (patient) => {
    try {
      // Fetch full patient details including appointments and AI results
      const fullPatient = await getPatientDetails(patient.id);
      let transformed = transformAIResults(fullPatient.aiResults || []);
      // Fallback: fetch AI results endpoint explicitly if none returned
      if (!transformed.length) {
        const raw = await getAIResultsWithRetry(patient.id, 2, 1000);
        transformed = transformAIResults(raw);
      }
      setSelectedPatient({
        ...patient,
        ...fullPatient,
        appointments: fullPatient.appointments || [],
        aiResults: transformed
      });
    } catch (err) {
      console.error('Error fetching patient details:', err);
      // Still select with basic data
      setSelectedPatient({
        ...patient,
        aiResults: transformAIResults(patient.aiResults || []),
      });
    }
  }, [transformAIResults, getAIResultsWithRetry]);

  useEffect(() => {
    if (!patients.length) {
      if (selectedPatient) {
        setSelectedPatient(null);
      }
      return;
    }

    const currentExists = selectedPatient && patients.some((p) => p.id === selectedPatient.id);
    if (currentExists) return;

    handlePatientSelect(patients[0]).catch((err) => {
      console.error('Failed to auto-select patient:', err);
    });
  }, [patients, selectedPatient, handlePatientSelect]);

  // appointments / billing / comms (stub)
  const handleScheduleNew = () => console.log('Schedule new appointment for:', selectedPatient?.name);
  const handleUpdateAppointment = (appointmentId, newStatus) => console.log('Update appointment:', appointmentId, newStatus);
  const handleCancelAppointment = (appointmentId) => console.log('Cancel appointment:', appointmentId);
  const handleCreateInvoice = () => console.log('Create invoice for:', selectedPatient?.name);
  const handlePaymentReceived = (invoiceId) => console.log('Payment received for:', invoiceId);
  const handleSendStatement = () => console.log('Send statement to:', selectedPatient?.name);
  const handleSendMessage = (message) => console.log('Send message:', message);
  const handleScheduleCall = () => console.log('Schedule call with:', selectedPatient?.name);
  const handleUpdateHistory = (updatedHistory) => console.log('Update medical history for:', selectedPatient?.name, updatedHistory);
  const handleCreatePlan = (planData) => console.log('Create treatment plan:', planData);
  const handleUpdatePlan = (planId, updatedPlan) => console.log('Update treatment plan:', planId, updatedPlan);
  const handleCompleteTreatment = (treatmentId) => console.log('Complete treatment:', treatmentId);

  const statusBadge = (status) => {
    switch (status) {
      case 'active':
        return 'text-emerald-200 bg-emerald-500/10 border-emerald-400/20';
      case 'new':
        return 'text-white bg-accent/20 border-accent/40';
      default:
        return 'text-slate-200 bg-slate-800/60 border-slate-700';
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background theme-transition dentist-skeleton">
        <SideBar />
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="bg-surface border border-primary/20 rounded-2xl shadow-theme-lg p-6 skeleton-surface">
              <div className="flex items-center justify-between mb-6">
                <div className="space-y-3">
                  <div className="h-4 w-32 rounded-full bg-accent/10 animate-pulse"></div>
                  <div className="h-8 w-72 rounded-xl bg-accent/20 animate-pulse"></div>
                  <div className="h-4 w-96 max-w-full rounded-lg bg-accent/10 animate-pulse"></div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right space-y-2">
                    <div className="h-6 w-64 rounded-lg bg-accent/10 animate-pulse"></div>
                    <div className="h-6 w-32 rounded-lg bg-accent/10 animate-pulse"></div>
                  </div>
                  <div className="h-11 w-40 rounded-xl bg-accent/20 animate-pulse"></div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-primary/10 bg-surface-elevated skeleton-surface">
                    <div className="w-12 h-12 rounded-2xl bg-accent/10 animate-pulse mb-4"></div>
                    <div className="h-4 w-24 rounded bg-accent/10 animate-pulse mb-2"></div>
                    <div className="h-6 w-20 rounded bg-accent/20 animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="p-4 rounded-2xl border border-primary/10 bg-surface-elevated skeleton-surface">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-6 w-28 rounded bg-accent/10 animate-pulse"></div>
                      <div className="h-6 w-16 rounded-full bg-accent/10 animate-pulse"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 w-40 rounded bg-accent/10 animate-pulse"></div>
                      <div className="h-4 w-32 rounded bg-accent/10 animate-pulse"></div>
                      <div className="h-4 w-24 rounded bg-accent/10 animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="lg:col-span-3 space-y-6">
                <div className="h-16 rounded-xl border border-primary/10 bg-surface-elevated skeleton-surface"></div>
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="p-6 rounded-2xl border border-primary/10 bg-surface-elevated skeleton-surface">
                    <div className="h-4 w-32 rounded bg-accent/10 animate-pulse mb-4"></div>
                    <div className="space-y-3">
                      <div className="h-4 w-full rounded bg-accent/10 animate-pulse"></div>
                      <div className="h-4 w-3/4 rounded bg-accent/10 animate-pulse"></div>
                      <div className="h-4 w-1/2 rounded bg-accent/10 animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background theme-transition">
      <SideBar />

      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <EnhancedHeader
            totalPatients={summary.total}
            activePatients={summary.byStatus?.active || 0}
            scheduledAppointments={patients.filter((p) => p.nextAppointment).length}
            aiAnalyzedPatients={summary.withAiResults || 0}
            onAddPatient={() => setShowAddPatient(true)}
          />

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
                  <Icon name="AlertCircle" size={20} className="text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">
                    Error Memuat Data
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    {error}
                  </p>
                  <button
                    onClick={fetchPatients}
                    className="mt-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                  >
                    Coba Lagi
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Patient List */}
            <div className="lg:col-span-1">
              <PatientList
                patients={patients}
                selectedPatient={selectedPatient}
                onPatientSelect={handlePatientSelect}
                onAddPatient={() => setShowAddPatient(true)}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                filterStatus={filterStatus}
                onFilterChange={setFilterStatus}
              />
            </div>

            {/* Patient Details */}
            <div className="lg:col-span-3">
              {selectedPatient ? (
                <div className="space-y-6">

                  {/* Tabs */}
                  <div className="bg-surface-elevated border border-primary/10 rounded-xl shadow-theme-md p-6 theme-transition">
                    <div className="flex gap-1 overflow-x-auto hide-scrollbar">
                      {[
                        { id: 'profile', label: t('dentistPatient.tabs.profile'), icon: 'User' },
                        { id: 'ai-results', label: t('dentistPatient.tabs.aiResults'), icon: 'Brain' },
                        { id: 'appointments', label: t('dentistPatient.tabs.appointments'), icon: 'Calendar' },
                        { id: 'medical-history', label: t('dentistPatient.tabs.medicalHistory'), icon: 'FileText' },
                        { id: 'treatment-plan', label: t('dentistPatient.tabs.treatmentPlan'), icon: 'Clipboard' },
                        { id: 'billing', label: t('dentistPatient.tabs.billing'), icon: 'CreditCard' },
                        { id: 'communication', label: t('dentistPatient.tabs.communication'), icon: 'MessageSquare' }
                      ].map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap theme-transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                              isActive
                                ? 'bg-accent text-white shadow-sm'
                                : 'bg-transparent text-secondary hover:text-primary hover:bg-surface-elevated'
                            }`}
                          >
                            <Icon name={tab.icon} size={16} />
                            <span>{tab.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tab Content */}
                  <div className="space-y-6">
                    {activeTab === 'profile' && (
                      <PatientProfile 
                        patient={selectedPatient} 
                        onClose={() => setSelectedPatient(null)}
                      />
                    )}

                    {activeTab === 'ai-results' && (
                      <PatientAIResult patient={selectedPatient} />
                    )}

                    {activeTab === 'appointments' && (
                      <PatientAppointment
                        patient={selectedPatient}
                        onScheduleNew={handleScheduleNew}
                        onUpdateAppointment={handleUpdateAppointment}
                        onCancelAppointment={handleCancelAppointment}
                      />
                    )}

                    {activeTab === 'medical-history' && (
                      <PatientMedicalHistory
                        patient={selectedPatient}
                        onUpdateHistory={handleUpdateHistory}
                      />
                    )}

                    {activeTab === 'treatment-plan' && (
                      <PatientTreatmentPlan
                        patient={selectedPatient}
                        onCreatePlan={handleCreatePlan}
                        onUpdatePlan={handleUpdatePlan}
                        onCompleteTreatment={handleCompleteTreatment}
                      />
                    )}

                    {activeTab === 'billing' && (
                      <PatientBilling
                        patient={selectedPatient}
                        onCreateInvoice={handleCreateInvoice}
                        onPaymentReceived={handlePaymentReceived}
                        onSendStatement={handleSendStatement}
                      />
                    )}

                    {activeTab === 'communication' && (
                      <PatientCommunication
                        patient={selectedPatient}
                        onSendMessage={handleSendMessage}
                        onScheduleCall={handleScheduleCall}
                      />
                    )}
                  </div>
                </div>
              ) : (
                // Empty state
                <div className="bg-surface border border-border/40 rounded-2xl shadow-theme-lg theme-transition">
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 bg-surface-elevated rounded-full flex items-center justify-center mx-auto mb-4 border border-border/40">
                      <Icon name="User" size={24} className="text-muted" />
                    </div>
                    <h3 className="text-lg font-medium text-primary mb-2">{t('dentistPatient.emptyState.title')}</h3>
                    <p className="text-secondary">{t('dentistPatient.emptyState.subtitle')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Add Patient Modal */}
      {showAddPatient && (
        <AddPatient onSubmit={handleAddPatient} onClose={() => setShowAddPatient(false)} />
      )}
    </div>
  );
};

export default PatientManagement;
