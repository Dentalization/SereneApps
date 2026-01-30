// /src/pages/dentist-portal/patient/PatientManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import SideBar from '../ui/SideBar';
import Icon from '../../../components/AppIcon';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getDentistPatients, getPatientDetails, getPatientAIResults } from '../../../services/dentistPortalService';
import { parseIndonesianAnalysis } from '../../../utils/indonesianAnalysisParser';
import { cleanMarkdownFormatting, normalizeAIExplanation } from '../../../utils/textFormatting';
import { stripDiagnosisIntro, deriveSummaryFromNarrative, normalizeAIText } from '../../../utils/aiTextHelpers';

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

  // Normalize backend AI results
  const transformAIResults = useCallback((results = []) => {
    const normalizeConfidence = (val) => {
      if (val === null || val === undefined) return 0;
      if (typeof val === 'string') {
        const parsed = parseFloat(val);
        if (Number.isNaN(parsed)) return 0;
        return val.includes('%') || parsed > 1 ? parsed : parsed * 100;
      }
      if (typeof val === 'number') {
        return val > 1 ? val : val * 100;
      }
      return 0;
    };

      const getShortSummary = (r, normalized) => {
        const candidate = normalized?.summary || deriveSummaryFromNarrative(
          [r.summary, r.overallAssessment, r.description, r.details]
            .filter((x) => typeof x === 'string' && x.trim())
            .join(' ')
        );

        if (!candidate) return 'Analisis dental';

        const sanitized = stripDiagnosisIntro(cleanMarkdownFormatting(candidate));
        const clipped = sanitized.length > 220 ? `${sanitized.slice(0, 220).trim()}...` : sanitized;
        return clipped;
      };

    return (results || []).map((r) => {
      const normalized = normalizeAIExplanation(r);
      const detections = Array.isArray(r.detections) ? r.detections : [];

      const summaryCandidates = [normalized?.summary, r.summary, r.overallAssessment, r.findings].filter((x) => typeof x === 'string' && x.trim());
      const summaryCandidate = summaryCandidates.length ? summaryCandidates[0] : '';
      let sanitizedSummary = stripDiagnosisIntro(summaryCandidate) || summaryCandidate;

      const shortSummary = getShortSummary(r, normalized);

      const fieldOrder = [
        normalized?.confidence,
        r.confidenceScore,
        r.confidence,
        r.accuracy,
        r.score,
        r.probability,
        detections[0]?.confidence,
        detections[0]?.probability,
      ];
      let probability = 0;
      for (const candidate of fieldOrder) {
        const c = normalizeConfidence(candidate);
        if (c > 0) {
          probability = Math.round(c);
          break;
        }
      }

      if (probability === 0 && r && typeof r === 'object') {
        const numericFallback = Object.values(r)
          .map((v) => normalizeConfidence(v))
          .filter((v) => v > 0 && v <= 100)
          .sort((a, b) => b - a);
        if (numericFallback.length > 0) {
          probability = Math.round(numericFallback[0]);
        }
      }

      const probabilitySafe = probability > 0 ? probability : null;

        const detailCandidates = [
          normalized?.explanation,
          r.details,
          r.analysis,
          r.findings,
          r.overallAssessment,
          r.summary,
        ]
          .filter((x) => typeof x === 'string' && x.trim())
          .map((item) => cleanMarkdownFormatting(item));
        const detailSource = detailCandidates.join('\n\n');
        const fullDetails = detailSource ? stripDiagnosisIntro(detailSource) : null;

        const summarySections = Array.isArray(normalized?.sections) ? normalized.sections : [];

        const normalizedText = normalizeAIText(detailSource || summaryCandidate || '');
        const normalizedSummary = normalizedText.summary || summaryCandidate || '';
        sanitizedSummary = stripDiagnosisIntro(cleanMarkdownFormatting(normalizedSummary)) || normalizedSummary;

        let diagnosis = [];

        if (detections.length > 0) {
          diagnosis = detections.map((d, idx) => {
            const diagProb = normalizeConfidence(d.confidence || d.probability) || probabilitySafe;
            const diagSeverity = d.severity || (diagProb && diagProb >= 70 ? 'medium' : 'low');

            return {
              condition: d.label || d.name || `Temuan ${idx + 1}`,
              description: d.description || d.notes || shortSummary,
              probability: diagProb,
              severity: diagSeverity,
              details: stripDiagnosisIntro(d.description || ''),
              sections: [],
            };
          });
        } else if (normalizedText.diagnosis.length > 0) {
          diagnosis = normalizedText.diagnosis.map((d, idx) => {
            const diagProb = d.probability != null ? Math.max(0, Math.min(100, Math.round(d.probability))) : probabilitySafe;
            return {
              condition: d.condition || `Kondisi ${idx + 1}`,
              description: d.shortExplanation || shortSummary,
              probability: diagProb,
              severity: null,
              details: d.shortExplanation || null,
              sections: [],
            };
          });
        } else if (summarySections.length > 0) {
          diagnosis = summarySections.map((section, idx) => ({
            condition: section.title || `Kondisi ${idx + 1}`,
            description: deriveSummaryFromNarrative(section.content || shortSummary),
            probability: probabilitySafe,
            severity: null,
            details: stripDiagnosisIntro(section.content || ''),
            sections: [],
          }));
        } else {
          diagnosis = [{
            condition: 'Kondisi Gigi',
            description: shortSummary,
            probability: probabilitySafe,
            severity: null,
            details: fullDetails,
            sections: [],
          }];
        }

      const fullText = [sanitizedSummary, r.findings, r.overallAssessment].filter(Boolean).join(' ');
      const parsed = parseIndonesianAnalysis(fullText);
      
      let symptoms = [];
      if (Array.isArray(r.symptoms) && r.symptoms.length > 0) {
        symptoms = r.symptoms;
      } else if (parsed.symptoms.length > 0) {
        symptoms = parsed.symptoms;
      } else if (detections.length > 0) {
        symptoms = detections.map((d, idx) => ({
          name: d.label || d.name || `Temuan ${idx + 1}`,
          severity: d.severity || (d.confidence > 0.7 ? 'high' : d.confidence > 0.4 ? 'medium' : 'low'),
          description: d.description || null,
        }));
      }
      
      let recommendations = [];
      if (Array.isArray(r.recommendations) && r.recommendations.length > 0) {
        recommendations = r.recommendations.map((rec, idx) => ({
          title: rec.title || rec.name || `Rekomendasi ${idx + 1}`,
          description: rec.description || rec.text || rec.recommendation || '',
          priority: rec.priority || rec.importance || 'normal',
          urgency: rec.urgency || rec.timeframe || 'normal',
        }));
      } else if (parsed.recommendations.length > 0) {
        recommendations = parsed.recommendations;
      }
      
      const images = [
        ...(r.imageUrl
          ? [{ url: r.imageUrl, type: 'original', description: 'Gambar asli' }]
          : []),
        ...(r.annotatedImageUrl
          ? [{ url: r.annotatedImageUrl, type: 'annotated', description: 'Hasil anotasi AI' }]
          : []),
      ];

      return {
        id: r.id?.toString?.() || r.id,
        sessionId: r.sessionId || r.session_id || null,
        date: (r.createdAt || '').split('T')[0] || r.createdAt || new Date().toISOString().split('T')[0],
        type: r.overallAssessment || r.summary ? 'Analisis Dental AI' : 'Deteksi AI',
        confidence: normalized?.confidence || Number(r.confidenceScore || 0),
        riskLevel: r.riskLevel || 'unknown',
        diagnosis,
        symptoms,
        recommendations,
        images,
        summarySections,
        summary: sanitizedSummary,
        findings: r.findings,
        overallAssessment: r.overallAssessment,
      };
    });
  }, []);

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

  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (filterStatus && filterStatus !== 'all') params.status = filterStatus;
      
      const response = await getDentistPatients(params);
      
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
      setTimeout(() => setLoading(false), MIN_LOADING_MS);
    }
  }, [searchTerm, filterStatus, transformAIResults]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPatients();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

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
      const fullPatient = await getPatientDetails(patient.id);
      let transformed = transformAIResults(fullPatient.aiResults || []);
      if (!transformed.length) {
        const raw = await getAIResultsWithRetry(patient.id, 2, 1000);
        transformed = transformAIResults(raw);
      }
      
      let medicalHistory = null;
      if (fullPatient.medicalDetails) {
        medicalHistory = {
          allergies: Array.isArray(fullPatient.medicalDetails.allergies) ? fullPatient.medicalDetails.allergies : [],
          conditions: Array.isArray(fullPatient.medicalDetails.conditions) ? fullPatient.medicalDetails.conditions : 
                     Array.isArray(fullPatient.medicalDetails.chronicConditions) ? fullPatient.medicalDetails.chronicConditions : [],
          medications: Array.isArray(fullPatient.medicalDetails.medications) ? fullPatient.medicalDetails.medications : [],
          surgeries: Array.isArray(fullPatient.medicalDetails.surgeries) ? fullPatient.medicalDetails.surgeries : [],
          familyHistory: typeof fullPatient.medicalDetails.familyHistory === 'object' && fullPatient.medicalDetails.familyHistory !== null 
            ? fullPatient.medicalDetails.familyHistory 
            : {},
        };
        const excludeKeys = ['allergies', 'chronicConditions', 'conditions', 'medications', 'surgeries', 'familyHistory'];
        for (const [key, value] of Object.entries(fullPatient.medicalDetails)) {
          if (!excludeKeys.includes(key)) {
            medicalHistory[key] = value;
          }
        }
      }
      
      const normalizedAppointments = (fullPatient.appointments || []).map(apt => ({
        ...apt,
        consultationType: apt.consultationType || apt.consultation_type || 'onsite',
        date: apt.date || apt.startsAt || apt.starts_at,
        time: apt.time || apt.startsAt || apt.starts_at
      }));
      
      const normalizedPatient = {
        ...patient,
        ...fullPatient,
        birthDate: fullPatient.dateOfBirth || fullPatient.birthDate,
        medicalHistory: medicalHistory || {
          allergies: [],
          conditions: [],
          medications: [],
          surgeries: [],
          familyHistory: {},
          emergencyContact: {}
        },
        appointments: normalizedAppointments,
        aiResults: transformed
      };
      
      setSelectedPatient(normalizedPatient);
    } catch (err) {
      console.error('Error fetching patient details:', err);
      setSelectedPatient({
        ...patient,
        medicalHistory: {
          allergies: [],
          conditions: [],
          medications: [],
          surgeries: [],
          familyHistory: {},
          emergencyContact: {}
        },
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

  // Handler stubs
  const handleScheduleNew = () => {};
  const handleUpdateAppointment = (appointmentId, newStatus) => {};
  const handleCancelAppointment = (appointmentId) => {};
  const handleCreateInvoice = () => {};
  const handlePaymentReceived = (invoiceId) => {};
  const handleSendStatement = () => {};
  const handleSendMessage = (message) => {};
  const handleScheduleCall = () => {};
  const handleUpdateHistory = (updatedHistory) => {};
  const handleCreatePlan = (planData) => {};
  const handleUpdatePlan = (planId, updatedPlan) => {};
  const handleCompleteTreatment = (treatmentId) => {};

  if (loading) {
    return (
      <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
        <SideBar />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden theme-transition">
      <SideBar />

      <main className="flex-1 p-4 md:p-8 overflow-y-auto scroll-smooth custom-scrollbar">
        <div className="max-w-[1600px] mx-auto pb-10">
          <EnhancedHeader
            totalPatients={summary.total}
            activePatients={summary.byStatus?.active || 0}
            scheduledAppointments={patients.filter((p) => p.nextAppointment).length}
            aiAnalyzedPatients={summary.withAiResults || 0}
            onAddPatient={() => setShowAddPatient(true)}
          />

          {/* Error Alert */}
          {error && (
            <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl flex items-start gap-4 shadow-sm animate-in fade-in slide-in-from-top-2">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center">
                <Icon name="AlertCircle" size={20} />
              </div>
              <div className="flex-1 pt-1">
                <h4 className="font-bold text-red-900 dark:text-red-100">Error Memuat Data</h4>
                <p className="text-red-700 dark:text-red-300 text-sm mt-1">{error}</p>
                <button
                  onClick={fetchPatients}
                  className="mt-3 text-sm font-semibold text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline transition-colors"
                >
                  Coba Lagi
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start h-full">
            {/* Patient List */}
            <div className="lg:col-span-4 xl:col-span-3 h-full flex flex-col min-h-[600px]">
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
            <div className="lg:col-span-8 xl:col-span-9">
              {selectedPatient ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">

                  {/* Tabs */}
                  <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm p-2 sticky top-0 z-10 backdrop-blur-md transition-colors">
                    <div className="flex gap-1 overflow-x-auto no-scrollbar p-1">
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
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-semibold text-sm transition-all whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                              isActive
                                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md shadow-slate-900/20 dark:shadow-slate-200/10 scale-[1.02]'
                                : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
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
                  <div className="min-h-[500px]">
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
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm p-16 text-center animate-in zoom-in-95 duration-300 h-full flex flex-col items-center justify-center min-h-[600px] transition-colors">
                  <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-slate-100 dark:border-slate-700">
                    <Icon name="User" size={40} className="text-slate-300 dark:text-slate-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{t('dentistPatient.emptyState.title')}</h3>
                  <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">{t('dentistPatient.emptyState.subtitle')}</p>
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