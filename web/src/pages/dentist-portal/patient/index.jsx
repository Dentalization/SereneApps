// /src/pages/dentist-portal/patient/PatientManagement.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import SideBar from '../ui/SideBar';
import Icon from '../../../components/AppIcon';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useNotifications } from '../../../contexts/NotificationContext';
import { createDentistPatient, createPatientEmrRecord, getDentistPatients, getPatientDetails, uploadPatientEmrConsent } from '../../../services/dentistPortalService';
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
import ClinicalIcon from './components/ClinicalIcon.jsx';

const MIN_LOADING_MS = 500;

const summarizePatients = (patientList, base = {}) => ({
  ...base,
  total: patientList.length,
  byStatus: patientList.reduce((acc, pt) => {
    acc[pt.status] = (acc[pt.status] || 0) + 1;
    return acc;
  }, {}),
  withAiResults: patientList.filter(p => p.aiResults.length > 0).length
});

const PatientManagement = () => {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(true);
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
  const { socket } = useNotifications();
  const patientDetailsCacheRef = useRef(new Map());
  const selectRequestIdRef = useRef(0);

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

      sanitizedSummary = summaryCandidate;
      let diagnosis = [];
      let symptoms = [];
      let parsed = { symptoms: [], recommendations: [] };

      if (r.source === 'verified_case') {
        sanitizedSummary = r.summary || '';
        if (detections.length > 0) {
          diagnosis = detections.map((d, idx) => {
            const diagProb = normalizeConfidence(d.confidence || d.probability) || 100;
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

        if (detections.length > 0) {
          symptoms = detections.map((d, idx) => ({
            name: d.label || d.name || `Temuan ${idx + 1}`,
            severity: d.severity || (d.confidence > 0.7 ? 'high' : d.confidence > 0.4 ? 'medium' : 'low'),
            description: d.description || null,
          }));
        }
      } else {
        const normalizedText = normalizeAIText(detailSource || summaryCandidate || '');
        const normalizedSummary = normalizedText.summary || summaryCandidate || '';
        sanitizedSummary = stripDiagnosisIntro(cleanMarkdownFormatting(normalizedSummary)) || normalizedSummary;

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
        parsed = parseIndonesianAnalysis(fullText);

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
      }
      
      let recommendations = [];
      if (Array.isArray(r.recommendations) && r.recommendations.length > 0) {
        recommendations = r.recommendations.map((rec, idx) => {
          const txt = typeof rec === 'string'
            ? rec
            : (rec.description || rec.text || rec.recommendation || '');
          return {
            title: typeof rec === 'object' && rec.title ? rec.title : `Rekomendasi ${idx + 1}`,
            description: txt,
            text: txt,
            recommendation: txt,
            priority: (typeof rec === 'object' && (rec.priority || rec.importance)) || 'normal',
            urgency: (typeof rec === 'object' && (rec.urgency || rec.timeframe)) || 'normal',
          };
        });
      } else if (r.source !== 'verified_case' && parsed.recommendations.length > 0) {
        recommendations = parsed.recommendations;
      } else if (r.source === 'verified_case' && detections.length > 0) {
        const generated = [];
        const uniqueLabels = [...new Set(detections.map(d => d.label?.toLowerCase()).filter(Boolean))];

        if (uniqueLabels.includes('caries')) {
          generated.push('Lakukan konfirmasi taktil menggunakan probe tumpul untuk menilai keaktifan lesi karies.');
          generated.push('Diskusikan rencana penambalan gigi atau aplikasi topikal remineralisasi (seperti fluoride varnish).');
        }
        if (uniqueLabels.includes('tooth_discoloration')) {
          generated.push('Lakukan tes vitalitas termal/elektrik pada gigi yang mengalami diskolorasi untuk menyingkirkan nekrosis pulpa.');
          generated.push('Identifikasi faktor etiologi diskolorasi (ekstrinsik/intrinsik) sebelum menentukan rencana perawatan estetis.');
        }
        if (uniqueLabels.includes('calculus') || uniqueLabels.includes('plaque') || uniqueLabels.includes('gingivitis')) {
          generated.push('Lakukan tindakan pembersihan karang gigi (scaling) dan profilaksis.');
          generated.push('Berikan instruksi kebersihan mulut (oral hygiene instruction) dan teknik menyikat gigi yang tepat.');
        }

        if (generated.length === 0) {
          generated.push('Lakukan evaluasi klinis menyeluruh dan rontgen dental jika diindikasikan.');
        }

        recommendations = generated.map((txt, idx) => ({
          title: `Rekomendasi ${idx + 1}`,
          description: txt,
          text: txt,
          recommendation: txt,
          priority: 'normal',
          urgency: 'normal'
        }));
      }
      
      const images = Array.isArray(r.images) && r.images.length > 0
        ? r.images
        : [
            ...(r.imageUrl
              ? [{ url: r.imageUrl, type: 'original', description: 'Gambar asli' }]
              : []),
            ...(r.annotatedImageUrl
              ? [{ url: r.annotatedImageUrl, type: 'annotated', description: 'Hasil anotasi AI' }]
              : []),
          ];

      return {
        id: r.id?.toString?.() || r.id,
        caseId: r.caseId || null,
        source: r.source || 'mobile_ai',
        title: r.title || null,
        caseStatus: r.caseStatus || null,
        reviewStatus: r.reviewStatus || null,
        createdBy: r.createdBy || null,
        chatEnabled: r.chatEnabled !== false,
        imageCount: r.imageCount || images.length,
        sessionId: r.sessionId || r.session_id || null,
        date: (r.createdAt || '').split('T')[0] || r.createdAt || new Date().toISOString().split('T')[0],
        type: r.source === 'verified_case' ? 'Kasus Terverifikasi' : (r.overallAssessment || r.summary ? 'Diagnosis AI Mobile' : 'Deteksi AI Mobile'),
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

  const buildEmptyMedicalHistory = useCallback(() => ({
    allergies: [],
    conditions: [],
    medications: [],
    surgeries: [],
    familyHistory: {},
    emergencyContact: {}
  }), []);

  const normalizeMedicalHistory = useCallback((medicalDetails) => {
    if (!medicalDetails) return null;

    const medicalHistory = {
      allergies: Array.isArray(medicalDetails.allergies) ? medicalDetails.allergies : [],
      conditions: Array.isArray(medicalDetails.conditions) ? medicalDetails.conditions :
                 Array.isArray(medicalDetails.chronicConditions) ? medicalDetails.chronicConditions : [],
      medications: Array.isArray(medicalDetails.medications) ? medicalDetails.medications : [],
      surgeries: Array.isArray(medicalDetails.surgeries) ? medicalDetails.surgeries : [],
      familyHistory: typeof medicalDetails.familyHistory === 'object' && medicalDetails.familyHistory !== null
        ? medicalDetails.familyHistory
        : {},
      emergencyContact: typeof medicalDetails.emergencyContact === 'object' && medicalDetails.emergencyContact !== null
        ? medicalDetails.emergencyContact
        : {}
    };

    const excludeKeys = ['allergies', 'chronicConditions', 'conditions', 'medications', 'surgeries', 'familyHistory', 'emergencyContact'];
    for (const [key, value] of Object.entries(medicalDetails)) {
      if (!excludeKeys.includes(key)) {
        medicalHistory[key] = value;
      }
    }

    return medicalHistory;
  }, []);

  const buildPatientShell = useCallback((patient, isLoadingDetails = false) => ({
    ...patient,
    birthDate: patient.dateOfBirth || patient.birthDate,
    medicalHistory: patient.medicalHistory || buildEmptyMedicalHistory(),
    appointments: Array.isArray(patient.appointments) ? patient.appointments : [],
    aiResults: Array.isArray(patient.aiResults) ? patient.aiResults : [],
    emrRecords: Array.isArray(patient.emrRecords) ? patient.emrRecords : [],
    treatmentPlans: Array.isArray(patient.treatmentPlans) ? patient.treatmentPlans : [],
    billing: patient.billing || { totalBalance: 0, paidAmount: 0, pendingAmount: 0 },
    isLoadingDetails
  }), [buildEmptyMedicalHistory]);

  const normalizePatientDetails = useCallback((patient, fullPatient) => {
    const normalizedAppointments = (fullPatient.appointments || []).map(apt => ({
      ...apt,
      consultationType: apt.consultationType || apt.consultation_type || 'onsite',
      date: apt.date || apt.startsAt || apt.starts_at,
      time: apt.time || apt.startsAt || apt.starts_at
    }));

    return {
      ...patient,
      ...fullPatient,
      source: fullPatient.source || patient.source || 'unknown',
      sourceLabel: fullPatient.sourceLabel || patient.sourceLabel || 'Sumber tidak tercatat',
      createdAt: fullPatient.createdAt || patient.createdAt || null,
      directorySortAt: fullPatient.directorySortAt || patient.directorySortAt || fullPatient.createdAt || patient.createdAt || null,
      birthDate: fullPatient.dateOfBirth || fullPatient.birthDate || patient.dateOfBirth || patient.birthDate,
      medicalHistory: normalizeMedicalHistory(fullPatient.medicalDetails) || patient.medicalHistory || buildEmptyMedicalHistory(),
      appointments: normalizedAppointments,
      aiResults: transformAIResults(fullPatient.aiResults || []),
      emrRecords: Array.isArray(fullPatient.emrRecords) ? fullPatient.emrRecords : [],
      isLoadingDetails: false
    };
  }, [buildEmptyMedicalHistory, normalizeMedicalHistory, transformAIResults]);

  const normalizeDirectoryPatient = useCallback((p) => {
    const id = p.id?.toString?.() || String(p.id);
    const numericId = id.replace(/\D/g, '');
    return {
      id,
      patientId: p.patientId || `PT${(numericId || id).padStart(3, '0')}`,
      name: p.name || 'Unknown',
      phone: p.phone,
      email: p.email,
      avatar: p.avatar,
      age: Number.isFinite(Number(p.age)) ? Number(p.age) : null,
      gender: p.gender || null,
      status: p.status || 'inactive',
      source: p.source || 'unknown',
      sourceLabel: p.sourceLabel || 'Sumber tidak tercatat',
      createdAt: p.createdAt || null,
      directorySortAt: p.directorySortAt || p.createdAt || p.lastVisit || p.nextAppointment || null,
      lastVisit: p.lastVisit ? p.lastVisit.split('T')[0] : null,
      nextAppointment: p.nextAppointment ? p.nextAppointment.split('T')[0] : null,
      aiResults: transformAIResults(p.aiResults || []),
      appointmentCount: p.appointmentCount || 0,
      appointments: [],
      billing: { totalBalance: 0, paidAmount: 0, pendingAmount: 0 }
    };
  }, [transformAIResults]);

  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {};
      if (debouncedSearchTerm) params.search = debouncedSearchTerm;
      if (filterStatus && filterStatus !== 'all') params.status = filterStatus;
      params.sortBy = 'createdAt';
      params.sortOrder = 'desc';
      
      const response = await getDentistPatients(params);
      
      const transformedPatients = (response.patients || []).map(normalizeDirectoryPatient);

      const combinedPatients = transformedPatients;
      
      setPatients(combinedPatients);
      setSummary(summarizePatients(combinedPatients, response.summary || {}));
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
  }, [debouncedSearchTerm, filterStatus, normalizeDirectoryPatient]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const handleAddPatient = async (patientData) => {
    try {
      setError(null);
      const savedPatient = await createDentistPatient(patientData);
      const newPatient = normalizeDirectoryPatient(savedPatient);
      const nextPatients = [newPatient, ...patients.filter(patient => String(patient.id) !== String(newPatient.id))];

      setPatients(nextPatients);
      setSummary(prevSummary => summarizePatients(nextPatients, prevSummary));
      patientDetailsCacheRef.current.delete(String(newPatient.id));
      setShowAddPatient(false);
      handlePatientSelect(newPatient);
    } catch (err) {
      console.error('Error creating patient:', err);
      const errorMessage = err.response?.data?.error?.message || err.response?.data?.message || 'Gagal menambahkan pasien.';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const handlePatientSelect = useCallback(async (patient) => {
    const cacheKey = String(patient.id);
    const cachedPatient = patientDetailsCacheRef.current.get(cacheKey);
    const requestId = ++selectRequestIdRef.current;

    if (cachedPatient) {
      setSelectedPatient(cachedPatient);
      return;
    }

    setSelectedPatient(buildPatientShell(patient, !patient.localOnly));

    if (patient.localOnly) {
      return;
    }

    try {
      const fullPatient = await getPatientDetails(patient.id);
      if (requestId !== selectRequestIdRef.current) return;

      const normalizedPatient = normalizePatientDetails(patient, fullPatient);
      patientDetailsCacheRef.current.set(cacheKey, normalizedPatient);
      setSelectedPatient(normalizedPatient);
    } catch (err) {
      if (requestId !== selectRequestIdRef.current) return;
      console.error('Error fetching patient details:', err);
      setSelectedPatient(buildPatientShell(patient, false));
    }
  }, [buildPatientShell, normalizePatientDetails]);

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

  useEffect(() => {
    if (!socket) return;
    const handleRealtimeUpdate = (data) => {
      console.log('🔄 Patient portal socket notification: reloading patients & selected detail...');
      patientDetailsCacheRef.current.clear();
      fetchPatients();
      if (selectedPatient?.id && !selectedPatient.localOnly) {
        handlePatientSelect(selectedPatient);
      }
    };
    socket.on('notification:new', handleRealtimeUpdate);
    return () => {
      socket.off('notification:new', handleRealtimeUpdate);
    };
  }, [socket, fetchPatients, selectedPatient, handlePatientSelect]);

  // Handler stubs
  const handleScheduleNew = () => {};
  const handleUpdateAppointment = (appointmentId, newStatus) => {};
  const handleCancelAppointment = (appointmentId) => {};
  const handleCreateInvoice = (invoice) => {
    if (selectedPatient && invoice) {
      setSelectedPatient(prev => ({
        ...prev,
        billing: mergeInvoiceIntoBilling(prev.billing, invoice)
      }));
    }
  };
  const handlePaymentReceived = (invoiceId) => {
    if (selectedPatient) {
      const invoices = Array.isArray(selectedPatient.billing?.invoices) ? selectedPatient.billing.invoices : [];
      const updatedInvoices = invoices.map(inv => {
        if (inv.id === invoiceId) {
          return {
            ...inv,
            status: 'paid',
            paymentStatus: 'paid',
            paymentDate: new Date().toISOString().split('T')[0]
          };
        }
        return inv;
      });
      const updatedBilling = mergeInvoiceIntoBilling({ ...selectedPatient.billing, invoices: updatedInvoices }, null);
      setSelectedPatient(prev => ({
        ...prev,
        billing: updatedBilling
      }));
    }
  };
  const handleSendStatement = () => {};
  const handleSendMessage = (message) => {};
  const handleScheduleCall = () => {};
  const handleUpdateHistory = (updatedHistory) => {
    setSelectedPatient(prev => prev ? ({
      ...prev,
      medicalHistory: updatedHistory
    }) : prev);
  };
  const handleCreateEmr = async (recordPayload) => {
    if (!selectedPatient?.id) {
      throw new Error('No patient selected');
    }
    const savedRecord = await createPatientEmrRecord(selectedPatient.id, recordPayload);
    setSelectedPatient(prev => prev ? ({
      ...prev,
      emrRecords: [savedRecord, ...(prev.emrRecords || [])],
    }) : prev);
    return savedRecord;
  };
  const handleUploadEmrConsent = async (recordId, file) => {
    if (!selectedPatient?.id) {
      throw new Error('No patient selected');
    }
    const updatedRecord = await uploadPatientEmrConsent(selectedPatient.id, recordId, file);
    setSelectedPatient(prev => prev ? ({
      ...prev,
      emrRecords: (prev.emrRecords || []).map(record =>
        record.id === updatedRecord.id ? updatedRecord : record
      ),
    }) : prev);
    return updatedRecord;
  };
  const mergeInvoiceIntoBilling = (billing = {}, invoice) => {
    if (!invoice) return billing;
    const invoices = Array.isArray(billing.invoices) ? billing.invoices : [];
    const existing = invoices.some((item) => item.id === invoice.id || item.invoiceId === invoice.invoiceId);
    const nextInvoices = existing
      ? invoices.map((item) => (item.id === invoice.id || item.invoiceId === invoice.invoiceId ? { ...item, ...invoice } : item))
      : [invoice, ...invoices];
    const paidAmount = nextInvoices
      .filter((item) => ['paid', 'settled'].includes(item.paymentStatus || item.status))
      .reduce((sum, item) => sum + Number(item.grandTotal || item.total || 0), 0);
    const pendingAmount = nextInvoices
      .filter((item) => !['paid', 'settled', 'cancelled', 'refunded'].includes(item.paymentStatus || item.status))
      .reduce((sum, item) => sum + Number(item.grandTotal || item.total || 0), 0);
    return {
      ...billing,
      invoices: nextInvoices,
      paidAmount,
      pendingAmount,
      totalBalance: pendingAmount
    };
  };

  const handleCreatePlan = (savedPlan) => {
    // Optimistically append the new plan to the selected patient's treatmentPlans
    if (selectedPatient && savedPlan) {
      setSelectedPatient(prev => ({
        ...prev,
        treatmentPlans: [...(prev.treatmentPlans || []), savedPlan],
        billing: mergeInvoiceIntoBilling(prev.billing, savedPlan.invoice),
      }));
    }
  };
  const handleUpdatePlan = (updatedPlan) => {
    setSelectedPatient(prev => ({
      ...prev,
      treatmentPlans: (prev.treatmentPlans || []).some(p => p.id === updatedPlan.id)
        ? (prev.treatmentPlans || []).map(p => (p.id === updatedPlan.id ? updatedPlan : p))
        : [updatedPlan, ...(prev.treatmentPlans || [])],
      billing: mergeInvoiceIntoBilling(prev.billing, updatedPlan.invoice),
    }));
  };
  const handleCompleteTreatment = (treatmentId) => {};

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden theme-transition">
        <SideBar />
        <main className="flex-1 flex items-center justify-center bg-background">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-primary" />
        </main>
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

          <div className={`grid grid-cols-1 ${isDirectoryOpen ? 'lg:grid-cols-12' : ''} gap-8 items-start h-full`}>
            {/* Patient List */}
            {isDirectoryOpen && (
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
                  sourceFilter={sourceFilter}
                  onSourceFilterChange={setSourceFilter}
                  onClose={() => setIsDirectoryOpen(false)}
                />
              </div>
            )}

            {/* Patient Details */}
            <div className={isDirectoryOpen ? 'lg:col-span-8 xl:col-span-9' : 'lg:col-span-12'}>
              {!isDirectoryOpen && (
                <button
                  type="button"
                  onClick={() => setIsDirectoryOpen(true)}
                  className="mb-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-600 dark:hover:text-blue-300 transition-colors shadow-sm"
                >
                  <Icon name="PanelLeftOpen" size={16} />
                  <span>{t('dentistPatient.list.actions.open')}</span>
                </button>
              )}
              {selectedPatient ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                  {selectedPatient.isLoadingDetails && (
                    <div className="flex items-center gap-2 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-950/20 px-4 py-3 text-sm font-medium text-blue-700 dark:text-blue-300">
                      <Icon name="Loader2" size={16} className="animate-spin" />
                      <span>{t('dentistPatient.list.loadingDetails')}</span>
                    </div>
                  )}

                  {/* Tabs */}
                  <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm p-2 sticky top-0 z-30 backdrop-blur-md transition-colors">
                    <div className="flex gap-1 overflow-x-auto no-scrollbar p-1">
                      {[
                        { id: 'profile', label: t('dentistPatient.tabs.profile'), icon: 'patient-profile' },
                        { id: 'ai-results', label: t('dentistPatient.tabs.aiResults'), icon: 'ai-diagnostic' },
                        { id: 'appointments', label: t('dentistPatient.tabs.appointments'), icon: 'appointment-calendar' },
                        { id: 'medical-history', label: t('dentistPatient.tabs.medicalHistory'), icon: 'emr-record' },
                        { id: 'treatment-plan', label: t('dentistPatient.tabs.treatmentPlan'), icon: 'treatment-plan' },
                        { id: 'billing', label: t('dentistPatient.tabs.billing'), icon: 'billing-ledger' },
                        { id: 'communication', label: t('dentistPatient.tabs.communication'), icon: 'communication' }
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
                            <ClinicalIcon
                              name={tab.icon}
                              size="sm"
                              className={isActive ? 'border-white/20 bg-white/15 text-white shadow-none dark:bg-slate-900/20 dark:text-slate-900' : 'h-7 w-7'}
                            />
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
                        onCreateEmr={handleCreateEmr}
                        onUploadConsent={handleUploadEmrConsent}
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
                  <ClinicalIcon name="patient-directory" size="xl" className="mx-auto mb-6" />
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
