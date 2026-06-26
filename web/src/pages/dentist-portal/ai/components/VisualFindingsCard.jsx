/**
 * VisualFindingsCard — Theme-aware HUD card for dental AI analysis results.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, Shield, AlertTriangle, CheckCircle, XCircle,
  Maximize2, X, ChevronDown, ChevronUp, Activity, Crosshair,
  Stethoscope, Lightbulb, AlertCircle,
} from 'lucide-react';
import { buildAnnotatedImageDataUrl } from './deepDentalSchemas.mjs';
import ModalPortal from '../../../../components/ui/ModalPortal';

const CONCERN_CONFIG = {
  minimal: { icon: CheckCircle, accent: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  low: { icon: CheckCircle, accent: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  mild: { icon: Shield, accent: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  moderate: { icon: AlertTriangle, accent: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  severe: { icon: AlertCircle, accent: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  critical: { icon: XCircle, accent: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  high: { icon: XCircle, accent: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
};

const SEVERITY_BADGE = {
  minimal: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700/40 dark:text-gray-300 dark:border-gray-600',
  mild: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
  moderate: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
  severe: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700',
  critical: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
};

const ConfidenceBar = ({ confidence, label, index }) => {
  const pct = Math.round((confidence || 0) * 100);
  const barColor =
    pct >= 70 ? 'from-red-500 to-rose-500' :
    pct >= 50 ? 'from-amber-500 to-orange-500' :
    'from-blue-500 to-cyan-500';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-surface text-[10px] font-mono font-bold text-muted border border-primary">
            {index + 1}
          </span>
          <span className="text-xs font-medium text-primary capitalize">
            {(label || 'unknown').replace(/_/g, ' ')}
          </span>
        </div>
        <span className="text-xs font-mono font-bold text-muted">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay: index * 0.05 + 0.2, duration: 0.6, ease: 'easeOut' }}
          className={`h-full rounded-full bg-gradient-to-r ${barColor}`}
        />
      </div>
    </motion.div>
  );
};

const FindingItem = ({ finding, index }) => {
  const severity = finding.severity?.toLowerCase() || 'mild';
  const badgeClass = SEVERITY_BADGE[severity] || SEVERITY_BADGE.mild;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="p-3 rounded-xl bg-surface border border-primary hover:bg-surface-elevated transition-colors theme-transition"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2">
          {finding.location && (
            <span className="text-xs font-semibold text-primary">{finding.location}</span>
          )}
          {finding.severity && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium uppercase tracking-wider ${badgeClass}`}>
              {finding.severity}
            </span>
          )}
        </div>
        {finding.confidence && (
          <span className="text-[10px] font-mono text-muted">
            {Math.round(finding.confidence * 100)}%
          </span>
        )}
      </div>
      {finding.description && (
        <p className="text-xs text-muted leading-relaxed">{finding.description}</p>
      )}
      {finding.differentials?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {finding.differentials.map((d, i) => (
            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">
              {d}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default function VisualFindingsCard({
  findings,
  review = null,
  caseWorkspace = null,
  onImageClick,
  onReview,
}) {
  const [expanded, setExpanded] = useState(true);
  const [showAllDetections, setShowAllDetections] = useState(false);

  if (!findings) return null;

  const concern = (findings.concern_level || '').toLowerCase();
  const config = CONCERN_CONFIG[concern] || CONCERN_CONFIG.mild;
  const ConcernIcon = config.icon;
  const iq = typeof findings.image_quality === 'string' ? findings.image_quality : 'analyzed';
  const detections = findings.detections || [];
  const clinicalFindings = findings.findings || [];
  const recommendations = findings.recommendations || [];
  const visibleDetections = showAllDetections ? detections : detections.slice(0, 6);
  const hasAnnotated = !!findings.annotated_image_base64;
  const annotatedImageSrc = buildAnnotatedImageDataUrl(findings);
  const reviewStatus = review?.status || 'pending_clinician_review';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="mt-4 rounded-2xl overflow-hidden bg-surface-elevated border border-primary shadow-lg theme-transition"
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${config.bg} border ${config.border}`}>
              <Activity className={`w-4 h-4 ${config.accent}`} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-primary tracking-tight">Clinical Findings</h3>
              <p className="text-[10px] text-muted mt-0.5">AI-Powered Dental Analysis</p>
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? 'Collapse clinical findings' : 'Expand clinical findings'}
            className="p-1.5 rounded-lg hover:bg-surface text-muted transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap gap-2 mt-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-primary">
            <Eye className="w-3 h-3 text-accent" />
            <span className="text-[10px] font-medium text-muted uppercase tracking-wider">{iq}</span>
          </div>
          {concern && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${config.bg} border ${config.border}`}>
              <ConcernIcon className={`w-3 h-3 ${config.accent}`} />
              <span className={`text-[10px] font-medium uppercase tracking-wider ${config.accent}`}>{concern}</span>
            </div>
          )}
          {detections.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/10 border border-accent/20">
              <Crosshair className="w-3 h-3 text-accent" />
              <span className="text-[10px] font-medium text-accent uppercase tracking-wider">
                {detections.length} marker{detections.length > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Collapsible Body */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4">

              {/* Annotated Image */}
              {hasAnnotated && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="relative group rounded-xl overflow-hidden border border-primary"
                >
                  <img
                    src={annotatedImageSrc}
                    alt="AI-annotated dental scan"
                    className="w-full rounded-xl"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <button
                    onClick={() => onImageClick?.(annotatedImageSrc)}
                    aria-label="Open annotated dental scan full size"
                    className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-sm text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-all hover:bg-black/80"
                  >
                    <Maximize2 className="w-3 h-3" />
                    Full Size
                  </button>
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-md bg-accent/20 backdrop-blur-sm border border-accent/30">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                    <span className="text-[10px] font-medium text-accent uppercase tracking-wider">AI Enhanced</span>
                  </div>
                </motion.div>
              )}

              {/* Pathology Detections */}
              {detections.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Crosshair className="w-3.5 h-3.5 text-accent" />
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                      Pathology Markers ({detections.length})
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {visibleDetections.map((det, i) => (
                      <ConfidenceBar key={det.mark_id || i} confidence={det.confidence} label={det.label} index={i} />
                    ))}
                  </div>
                  {detections.length > 6 && (
                    <button
                      onClick={() => setShowAllDetections(!showAllDetections)}
                      aria-label={showAllDetections ? 'Show fewer pathology markers' : `Show all ${detections.length} pathology markers`}
                      className="mt-2 text-xs text-accent hover:underline font-medium"
                    >
                      {showAllDetections ? 'Show less' : `Show all ${detections.length} detections`}
                    </button>
                  )}
                </div>
              )}

              {/* Clinical Findings */}
              {clinicalFindings.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Stethoscope className="w-3.5 h-3.5 text-accent" />
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                      Detailed Findings ({clinicalFindings.length})
                    </span>
                  </div>
                  <div className="space-y-2">
                    {clinicalFindings.map((f, i) => (
                      <FindingItem key={i} finding={f} index={i} />
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {recommendations.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                      Recommendations
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {recommendations.map((rec, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-start gap-2 text-xs text-muted"
                      >
                        <span className="mt-0.5 w-1 h-1 rounded-full bg-amber-500 dark:bg-amber-400 shrink-0" />
                        <span>{rec}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Limitations */}
              {findings.limitations && (
                <div className="px-3 py-2 rounded-lg bg-surface border border-primary">
                  <p className="text-[10px] text-muted leading-relaxed">
                    <span className="font-semibold text-primary">Note: </span>
                    {findings.limitations}
                  </p>
                </div>
              )}

              {(clinicalFindings.length > 0 || detections.length > 0) && (
                <div className="rounded-xl border border-primary bg-surface px-3 py-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                        Clinician Review
                      </p>
                      <p className="text-[11px] text-muted mt-1">
                        {reviewStatus === 'confirmed'
                          ? 'Findings confirmed by clinician.'
                          : reviewStatus === 'needs_revision'
                            ? 'Marked for clinical revision.'
                            : 'AI draft awaiting clinician confirmation.'}
                      </p>
                      {caseWorkspace && (
                        <p className="text-[10px] text-muted mt-1">
                          Workspace prepared: {caseWorkspace.imageCount || 0} image, export {caseWorkspace.exportReady ? 'ready' : 'pending'}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onReview?.('needs_revision')}
                        aria-label="Mark AI findings as needing revision"
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                          reviewStatus === 'needs_revision'
                            ? 'bg-amber-500/15 text-amber-700 border-amber-500/30'
                            : 'bg-surface-elevated text-muted border-primary hover:text-primary'
                        }`}
                      >
                        Revise
                      </button>
                      <button
                        type="button"
                        onClick={() => onReview?.('confirmed')}
                        aria-label="Confirm AI findings as reviewed by clinician"
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                          reviewStatus === 'confirmed'
                            ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30'
                            : 'bg-accent text-white border-accent hover:bg-accent-hover'
                        }`}
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * ImageLightbox — Fullscreen image viewer
 */
export function ImageLightbox({ imageSrc, onClose }) {
  if (!imageSrc) return null;
  return (
    <ModalPortal>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            className="relative max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={imageSrc}
              alt="Full-size annotated scan"
              className="max-w-full max-h-[90vh] rounded-xl object-contain"
            />
            <button
              onClick={onClose}
              aria-label="Close annotated image preview"
              className="absolute -top-3 -right-3 p-2 rounded-full bg-surface-elevated border border-primary text-primary hover:bg-surface transition-colors shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </ModalPortal>
  );
}
