// /src/pages/dentist-portal/patient/PatientManagement.jsx
import React, { useState, useEffect } from 'react';
import SideBar from '../ui/SideBar';
import Icon from '../../../components/AppIcon';
import { useLanguage } from '../../../contexts/LanguageContext';

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

const MIN_LOADING_MS = 900;

const PatientManagement = () => {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  // --- Mock data (dipersingkat dari versi kamu) ---
  const [patients, setPatients] = useState([
    {
      id: 1,
      patientId: 'PT001',
      name: 'Sarah Johnson',
      age: 28,
      gender: 'female',
      phone: '+62-812-3456-7890',
      email: 'sarah.j@email.com',
      status: 'active',
      lastVisit: '2024-03-10',
      nextAppointment: '2024-03-20',
      aiResults: [{ id: 'ai-001' }],
      appointments: [],
      billing: { totalBalance: 1500000, paidAmount: 900000, pendingAmount: 600000 }
    },
    {
      id: 2,
      patientId: 'PT002',
      name: 'John Doe',
      age: 35,
      gender: 'male',
      phone: '+62-813-7890-1234',
      email: 'john.doe@email.com',
      status: 'active',
      lastVisit: '2024-02-28',
      nextAppointment: '2024-03-25',
      appointments: [],
      billing: { totalBalance: 2500000, paidAmount: 1000000, pendingAmount: 1500000 }
    },
    {
      id: 3,
      patientId: 'PT003',
      name: 'Maria Garcia',
      age: 42,
      gender: 'female',
      phone: '+62-814-5678-9012',
      email: 'maria.garcia@email.com',
      status: 'active',
      lastVisit: '2024-03-05',
      nextAppointment: null,
      appointments: [],
      billing: { totalBalance: 800000, paidAmount: 800000, pendingAmount: 0 }
    }
  ]);

  // --- Handlers ---
  const handleAddPatient = (patientData) => {
    const newPatient = {
      id: patients.length + 1,
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

  const handlePatientSelect = (patient) => setSelectedPatient(patient);

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

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), MIN_LOADING_MS);
    return () => clearTimeout(timer);
  }, []);

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
            totalPatients={patients.length}
            activePatients={patients.filter((p) => p.status === 'active').length}
            scheduledAppointments={patients.filter((p) => p.nextAppointment).length}
            aiAnalyzedPatients={patients.filter((p) => p.aiResults?.length > 0).length}
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
