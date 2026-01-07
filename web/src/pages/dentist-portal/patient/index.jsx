// /src/pages/dentist-portal/patient/PatientManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import SideBar from '../ui/SideBar';
import Icon from '../../../components/AppIcon';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getDentistPatients, getPatientDetails } from '../../../services/dentistPortalService';

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

  // Fetch patients from API
  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (filterStatus && filterStatus !== 'all') params.status = filterStatus;
      
      const response = await getDentistPatients(params);
      
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
        aiResults: p.aiResults || [],
        appointmentCount: p.appointmentCount || 0,
        appointments: [],
        billing: { totalBalance: 0, paidAmount: 0, pendingAmount: 0 }
      }));
      
      setPatients(transformedPatients);
      setSummary(response.summary || {
        total: transformedPatients.length,
        byStatus: {},
        withAiResults: transformedPatients.filter(p => p.aiResults.length > 0).length
      });
    } catch (err) {
      console.error('Error fetching patients:', err);
      setError('Gagal memuat daftar pasien');
      setPatients([]);
    } finally {
      // Ensure minimum loading time for smooth UX
      setTimeout(() => setLoading(false), MIN_LOADING_MS);
    }
  }, [searchTerm, filterStatus]);

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

  const handlePatientSelect = async (patient) => {
    try {
      // Fetch full patient details including appointments and AI results
      const fullPatient = await getPatientDetails(patient.id);
      setSelectedPatient({
        ...patient,
        ...fullPatient,
        appointments: fullPatient.appointments || [],
        aiResults: fullPatient.aiResults || []
      });
    } catch (err) {
      console.error('Error fetching patient details:', err);
      // Still select with basic data
      setSelectedPatient(patient);
    }
  };

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
