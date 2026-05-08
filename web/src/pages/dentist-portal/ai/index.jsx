/**
 * DeepDental Pro — AI-Powered Dental Analysis Dashboard
 * Theme-aware: follows app light/dark mode via CSS custom properties.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Activity, Zap, Wifi, WifiOff, Sparkles, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAuth } from '../../../contexts/AuthContext';
import SideBar from '../ui/SideBar';

import useDentalAPI from './components/useDentalAPI';
import ChatMessage from './components/ChatMessage';
import { ImageLightbox } from './components/VisualFindingsCard';
import ThinkingLoader from './components/ThinkingLoader';
import InputBar from './components/InputBar';
import ClinicalHistorySidebar from './components/ClinicalHistorySidebar';
import VerifiedCaseWorkspace from './components/VerifiedCaseWorkspace';
import PatientLinkModal from './components/PatientLinkModal';
import ToothScanLoader from '../ui/ToothScanLoader';

// ── Boot Screen ─────────────────────────────────────

function BootScreen({ label = 'Menginisialisasi Serene AI...' }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background theme-transition">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center"
      >
        {/* 1. The 3D Tooth Scanner Animation */}
        <ToothScanLoader text={label} />

        {/* 2. Loading Progress Bar (Updated colors to match scanner) */}
        <div className="w-48 h-1 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden mt-8">
          <motion.div
            className="h-full rounded-full bg-blue-500"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 2, ease: 'easeInOut' }}
          />
        </div>
      </motion.div>
    </div>
  );
}

// ── Empty State ─────────────────────────────────────

function EmptyState({ labels = {} }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="flex-1 flex items-center justify-center px-4"
    >
      <div className="text-center max-w-md">
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="inline-flex p-5 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 mb-6"
        >
          <Sparkles className="w-10 h-10 text-indigo-500" />
        </motion.div>
        <h2 className="text-xl font-bold text-primary mb-2">{labels.title || 'Siap Menganalisis'}</h2>
        <p className="text-sm text-muted leading-relaxed mb-6">
          {labels.subtitle || 'Unggah gambar dental atau jelaskan kasus untuk mendapatkan analisis AI, temuan klinis, dan rekomendasi perawatan.'}
        </p>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { icon: 'P', label: labels.pathology || 'Deteksi Patologi', sub: 'YOLO AI' },
            { icon: 'K', label: labels.clinical || 'Analisis Klinis', sub: 'LLM' },
            { icon: 'E', label: labels.evidence || 'Berbasis Bukti', sub: 'Knowledge RAG' },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="p-3 rounded-xl bg-surface border border-primary hover:border-indigo-500/30 transition-colors"
            >
              <span className="text-lg font-bold text-indigo-500">{item.icon}</span>
              <p className="text-[11px] font-medium text-primary mt-2">{item.label}</p>
              <p className="text-[9px] text-muted mt-0.5">{item.sub}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Page ───────────────────────────────────────

const AIAnalysisPage = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();

  const {
    sessionId, messages, sessions, clinicalHistory, caseWorkspace, isLoading, isBootstrapping, systemHealth,
    bootstrap, sendMessage, startNewSession, loadSession, deleteSession,
    reviewFindings, clearLocalClinicalData, createWorkspaceCase, loadCaseWorkspace,
    loadClinicalHistoryItem, archiveWorkspaceCase, uploadWorkspaceImages,
    removeWorkspaceImage, analyzeWorkspaceImages, confirmWorkspaceFinding,
    rejectWorkspaceFinding, editWorkspaceFinding, addManualWorkspaceFinding,
    verifyWorkspaceCase, exportWorkspacePdf, exportWorkspaceJson, linkWorkspacePatient,
  } = useDentalAPI('dentist', user?.id, language || 'id');

  // Resolve the current session's generated title for the header
  const currentSessionTitle = sessions.find(s => s.id === sessionId)?.metadata?.title || null;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [patientLinkOpen, setPatientLinkOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const messagesEndRef = useRef(null);

  // Initialize
  useEffect(() => { bootstrap(); }, [bootstrap]);
  
  // Auto-scroll logic
  useEffect(() => { 
    if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSend = useCallback((text, imageFile) => { sendMessage(text, imageFile); }, [sendMessage]);
  const handleSuggestedQuestion = useCallback((q) => { sendMessage(q); }, [sendMessage]);
  const handleNewSession = useCallback(async () => { await startNewSession(); setSidebarOpen(false); }, [startNewSession]);
  const handleLoadSession = useCallback(async (sid) => { await loadSession(sid); setSidebarOpen(false); }, [loadSession]);
  const handleSelectHistory = useCallback(async (item) => { await loadClinicalHistoryItem(item); setSidebarOpen(false); }, [loadClinicalHistoryItem]);
  const handleArchiveHistory = useCallback(async (item) => { await archiveWorkspaceCase(item); }, [archiveWorkspaceCase]);
  const handleCreateCase = useCallback(async () => { await createWorkspaceCase({ title: currentSessionTitle || 'Verified dental case' }); }, [createWorkspaceCase, currentSessionTitle]);
  const handleRefreshCase = useCallback(async () => {
    if (caseWorkspace.caseRecord?.id) await loadCaseWorkspace(caseWorkspace.caseRecord.id);
  }, [caseWorkspace.caseRecord?.id, loadCaseWorkspace]);
  const handleLinkPatient = useCallback(() => setPatientLinkOpen(true), []);
  const handleConfirmPatientLink = useCallback(async (patient) => {
    await linkWorkspacePatient(patient);
  }, [linkWorkspacePatient]);

  if (isBootstrapping) return <BootScreen label={t('ai.deepDental.booting', { fallbackText: 'Menginisialisasi Serene AI...' })} />;

  const isOnline = systemHealth?.status === 'ok';

  return (
    <div className="flex h-screen bg-background theme-transition overflow-hidden">
      {/* 1. App Navigation (Left) */}
      <SideBar />

      {/* 2. Clinical History Sidebar (Slide-over) */}
      <ClinicalHistorySidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        items={clinicalHistory}
        currentSessionId={sessionId}
        currentCaseId={caseWorkspace.caseRecord?.id}
        onSelect={handleSelectHistory}
        onArchive={handleArchiveHistory}
        onNewSession={handleNewSession}
        isLoading={caseWorkspace.isLoading}
        error={caseWorkspace.error}
        labels={{
          title: t('ai.deepDental.sidebar.clinicalHistory', { fallbackText: 'Riwayat Klinis' }),
          subtitle: t('ai.deepDental.sidebar.sessionsAndCases', { fallbackText: 'Sesi dan kasus terverifikasi' }),
          close: t('ai.deepDental.sidebar.close', { fallbackText: 'Tutup riwayat' }),
          newSession: t('ai.deepDental.newAnalysis', { fallbackText: 'Kasus Klinis Baru' }),
          open: t('ai.deepDental.sidebar.openSession', { fallbackText: 'Buka' }),
          archive: t('ai.deepDental.sidebar.archiveCase', { fallbackText: 'Arsipkan' }),
          empty: t('ai.deepDental.sidebar.noHistory', { fallbackText: 'Belum ada riwayat' }),
          emptyDescription: t('ai.deepDental.sidebar.emptyDescription', { fallbackText: 'Mulai kasus atau analisis baru untuk melihat riwayat.' }),
          sourceOfTruth: t('ai.deepDental.sidebar.backendSource', { fallbackText: 'Backend sebagai sumber data klinis' }),
        }}
      />

      {/* 3. Main Content + Verified Case Workspace */}
      <div className="flex-1 flex h-full min-w-0">
      <div className="flex-1 flex flex-col h-full relative min-w-0 w-full">
        
        {/* --- TOP HEADER --- */}
        <header className="flex-none relative z-20">
          {/* Glass Background with subtle border */}
          <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50" />
          
          <div className="relative flex items-center justify-between px-6 py-4">
            {/* Left: Branding & Menu */}
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSidebarOpen(true)}
                aria-label={t('ai.deepDental.sidebar.open', { fallbackText: 'Buka riwayat analisis' })}
                className="p-2 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all shadow-sm"
              >
                <Menu className="w-5 h-5" />
              </motion.button>
              
              {/* [STRIP DELETED] The vertical separator line is completely removed here */}

              <div className="flex items-center gap-3">
                <div className="relative group">
                  <div className="absolute inset-0 bg-indigo-500 blur opacity-20 group-hover:opacity-40 transition-opacity rounded-xl" />
                  <div className="relative p-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20 text-white">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <h1 className="text-sm font-bold text-slate-800 dark:text-white leading-none">Serene AI</h1>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('ai.deepDental.clinicalAssistant', { fallbackText: 'Asisten Klinis' })}
                    </span>
                    {sessionId && (
                        <>
                            <ChevronRight className="w-3 h-3 text-slate-300" />
                            {currentSessionTitle ? (
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 max-w-[200px] truncate" title={currentSessionTitle}>
                                {currentSessionTitle}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-mono animate-pulse">Sesi Baru…</span>
                            )}
                        </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Status & Actions */}
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setWorkspaceOpen(true)}
                aria-label="Open verified case workspace"
                className="xl:hidden flex items-center gap-2 px-3 py-2 rounded-xl border border-indigo-200 text-xs font-semibold text-indigo-600 dark:border-indigo-800 dark:text-indigo-300"
              >
                Case
              </motion.button>

              {/* Action Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleNewSession}
                aria-label={t('ai.deepDental.newAnalysis', { fallbackText: 'Analisis Baru' })}
                className="group relative flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <Zap className="w-4 h-4 fill-current" />
                <span className="text-sm font-semibold relative">{t('ai.deepDental.newAnalysis', { fallbackText: 'Analisis Baru' })}</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={clearLocalClinicalData}
                aria-label={t('ai.deepDental.clearLocalData', { fallbackText: 'Bersihkan data klinis lokal' })}
                className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200/70 dark:border-slate-700/70 text-xs font-semibold text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {t('ai.deepDental.clearLocalDataShort', { fallbackText: 'Bersihkan Lokal' })}
              </motion.button>
            </div>
          </div>
        </header>

        {/* --- SCROLLABLE MESSAGES --- */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-0" style={{ scrollbarWidth: 'none' }}>
          <div className="max-w-3xl mx-auto space-y-6 pb-4">
            {messages.length === 0 ? (
              <EmptyState labels={{
                title: t('ai.deepDental.empty.title', { fallbackText: 'Siap Menganalisis' }),
                subtitle: t('ai.deepDental.empty.subtitle', { fallbackText: 'Unggah gambar dental atau jelaskan kasus untuk mendapatkan analisis AI, temuan klinis, dan rekomendasi perawatan.' }),
                pathology: t('ai.deepDental.empty.pathology', { fallbackText: 'Deteksi Patologi' }),
                clinical: t('ai.deepDental.empty.clinical', { fallbackText: 'Analisis Klinis' }),
                evidence: t('ai.deepDental.empty.evidence', { fallbackText: 'Berbasis Bukti' }),
              }} />
            ) : (
              <>
                <AnimatePresence mode="popLayout">
                  {messages.map((msg) => (
                    <ChatMessage
                      key={msg.id}
                      message={msg}
                      onImageClick={setLightboxImage}
                      onSuggestedQuestion={handleSuggestedQuestion}
                      onReviewFindings={reviewFindings}
                    />
                  ))}
                </AnimatePresence>
                <AnimatePresence>
                  {isLoading && <ThinkingLoader label={t('ai.deepDental.analyzing', { fallbackText: 'Menganalisis...' })} />}
                </AnimatePresence>
                {/* Scroll Anchor */}
                <div ref={messagesEndRef} className="h-1" />
              </>
            )}
          </div>
        </div>

        {/* --- INPUT BAR AREA --- */}
        <div className="flex-none p-4 md:p-6 bg-background/50 backdrop-blur-sm z-20">
            <div className="max-w-3xl mx-auto">
                <InputBar
                  onSend={handleSend}
                  isLoading={isLoading}
                  labels={{
                    placeholder: t('ai.deepDental.input.placeholder', { fallbackText: 'Tanyakan diagnosis atau unggah scan...' }),
                    dropToAnalyze: t('ai.deepDental.input.dropToAnalyze', { fallbackText: 'Lepas untuk dianalisis' }),
                    attachImage: t('ai.deepDental.input.attachImage', { fallbackText: 'Lampirkan gambar dental' }),
                    removeImage: t('ai.deepDental.input.removeImage', { fallbackText: 'Hapus gambar' }),
                    messageInput: t('ai.deepDental.input.messageInput', { fallbackText: 'Pesan analisis dental' }),
                    send: t('ai.deepDental.input.send', { fallbackText: 'Kirim permintaan analisis' }),
                    analyzing: t('ai.deepDental.analyzing', { fallbackText: 'Menganalisis...' }),
                    qualityCoach: t('ai.deepDental.qualityCoach.title', { fallbackText: 'Quality Coach' }),
                    qualityReady: t('ai.deepDental.qualityCoach.ready', { fallbackText: 'Kualitas awal cukup untuk analisis.' }),
                    verifyNotice: t('ai.deepDental.verifyNotice', { fallbackText: 'Serene AI dapat keliru. Verifikasi temuan klinis.' }),
                    fileInput: t('ai.deepDental.input.fileInput', { fallbackText: 'Pilih gambar dental' }),
                  }}
                />
            </div>
        </div>
      </div>

      <VerifiedCaseWorkspace
        isOpen={workspaceOpen}
        onClose={() => setWorkspaceOpen(false)}
        caseRecord={caseWorkspace.caseRecord}
        images={caseWorkspace.images}
        findings={caseWorkspace.findings}
        auditEvents={caseWorkspace.auditEvents}
        exports={caseWorkspace.exports}
        timeline={caseWorkspace.timeline}
        isLoading={caseWorkspace.isLoading}
        onCreateCase={handleCreateCase}
        onRefresh={handleRefreshCase}
        onUploadImages={uploadWorkspaceImages}
        onRemoveImage={removeWorkspaceImage}
        onAnalyzeImages={analyzeWorkspaceImages}
        onConfirmFinding={confirmWorkspaceFinding}
        onRejectFinding={rejectWorkspaceFinding}
        onEditFinding={editWorkspaceFinding}
        onAddManualFinding={addManualWorkspaceFinding}
        onVerifyCase={verifyWorkspaceCase}
        onExportPdf={exportWorkspacePdf}
        onExportJson={exportWorkspaceJson}
        onLinkPatient={handleLinkPatient}
      />
      </div>

      <PatientLinkModal
        isOpen={patientLinkOpen}
        onClose={() => setPatientLinkOpen(false)}
        onConfirm={handleConfirmPatientLink}
      />

      {/* Lightbox Overlay */}
      <AnimatePresence>
        {lightboxImage && (
          <ImageLightbox imageSrc={lightboxImage} onClose={() => setLightboxImage(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIAnalysisPage;
