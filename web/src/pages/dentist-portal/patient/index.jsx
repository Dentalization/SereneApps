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

  // Normalize backend AI results to UI-friendly shape expected by PatientAIResult
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

    // Mobile-like summary: take first 1–2 sentences, clean markdown, max ~220 chars
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

      // Build diagnosis - SHORT summary for card display
      const shortSummary = getShortSummary(r, normalized);

      // Confidence: try normalized then fallbacks
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

      // Last resort: scan all numeric fields for a confidence-looking value
      if (probability === 0 && r && typeof r === 'object') {
        const numericFallback = Object.values(r)
          .map((v) => normalizeConfidence(v))
          .filter((v) => v > 0 && v <= 100)
          .sort((a, b) => b - a);
        if (numericFallback.length > 0) {
          probability = Math.round(numericFallback[0]);
        }
      }

      // If still 0, hide probability instead of showing 0%
      const probabilitySafe = probability > 0 ? probability : null;

        // Full explanation with proper formatting (no truncation)
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

        // Build structured diagnoses from detections/sections; fallback to a single item.
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

      // Parse symptoms and recommendations from summary text
      const fullText = [sanitizedSummary, r.findings, r.overallAssessment].filter(Boolean).join(' ');
      const parsed = parseIndonesianAnalysis(fullText);
      
      // Extract symptoms
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
      
      // Process recommendations
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
        date: (r.createdAt || '').split('T')[0] || r.createdAt || new Date().toISOString().split('T')[0],
        type: r.overallAssessment || r.summary ? 'Analisis Dental AI' : 'Deteksi AI',
        confidence: normalized?.confidence || Number(r.confidenceScore || 0),
        riskLevel: r.riskLevel || 'unknown',
        diagnosis,
        symptoms,
        recommendations,
        images,
        summarySections,
        // Raw data untuk summary renderer
        summary: sanitizedSummary,
        findings: r.findings,
        overallAssessment: r.overallAssessment,
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
          console.log('📊 Raw API Response (first result):', list[0]);
          console.log('📋 All fields in API response:', {
            keys: Object.keys(list[0]),
            fullObject: list[0]
          });
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
      
      // Normalize medicalDetails to medicalHistory format expected by components
      let medicalHistory = null;
      if (fullPatient.medicalDetails) {
        medicalHistory = {
          allergies: Array.isArray(fullPatient.medicalDetails.allergies) ? fullPatient.medicalDetails.allergies : [],
          // Prefer 'conditions' over 'chronicConditions' for backwards compatibility
          conditions: Array.isArray(fullPatient.medicalDetails.conditions) ? fullPatient.medicalDetails.conditions : 
                     Array.isArray(fullPatient.medicalDetails.chronicConditions) ? fullPatient.medicalDetails.chronicConditions : [],
          medications: Array.isArray(fullPatient.medicalDetails.medications) ? fullPatient.medicalDetails.medications : [],
          surgeries: Array.isArray(fullPatient.medicalDetails.surgeries) ? fullPatient.medicalDetails.surgeries : [],
          familyHistory: typeof fullPatient.medicalDetails.familyHistory === 'object' && fullPatient.medicalDetails.familyHistory !== null 
            ? fullPatient.medicalDetails.familyHistory 
            : {},
        };
        // Add any other fields from medicalDetails for extensibility
        const excludeKeys = ['allergies', 'chronicConditions', 'conditions', 'medications', 'surgeries', 'familyHistory'];
        for (const [key, value] of Object.entries(fullPatient.medicalDetails)) {
          if (!excludeKeys.includes(key)) {
            medicalHistory[key] = value;
          }
        }
      }
      
      // CRITICAL FIX: Normalize appointments - map snake_case consultation_type to camelCase
      const normalizedAppointments = (fullPatient.appointments || []).map(apt => ({
        ...apt,
        consultationType: apt.consultationType || apt.consultation_type || 'onsite',
        // Ensure date fields exist
        date: apt.date || apt.startsAt || apt.starts_at,
        time: apt.time || apt.startsAt || apt.starts_at
      }));
      
      console.log('[PatientSelect] ✅ Normalized', normalizedAppointments.length, 'appointments');
      
      // Normalize field names from backend to component expectations
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
      // Still select with basic data
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
