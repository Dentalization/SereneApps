import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, ImagePlus, Loader2, RefreshCw, Trash2, UploadCloud, XCircle } from 'lucide-react';
import { buildImageQualityCoach, readImageDimensions } from './qualityCoach.mjs';
import { validateWorkspaceImages } from './caseWorkspaceModels.mjs';

const REJECTION_LABELS = {
  unsupported_file_type: 'Unsupported file type',
  file_too_large: 'File too large',
  duplicate_image: 'Duplicate image',
};

function statusIcon(status) {
  if (status === 'uploaded' || status === 'acceptable') return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (status === 'uploading' || status === 'checking' || status === 'analyzing') return <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />;
  if (status === 'failed' || status === 'needs_retake' || status === 'rejected') return <XCircle className="h-4 w-4 text-rose-500" />;
  return <AlertTriangle className="h-4 w-4 text-amber-500" />;
}

export default function MultiImageUploader({
  images = [],
  disabled = false,
  verified = false,
  existingFingerprints,
  onUpload,
  onRemove,
  onRetry,
  labels = {},
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [rejections, setRejections] = useState([]);
  const [localPrechecks, setLocalPrechecks] = useState({});
  const inputRef = useRef(null);
  const previewsRef = useRef(new Set());

  useEffect(() => () => {
    previewsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewsRef.current.clear();
  }, []);

  const fingerprints = useMemo(() => existingFingerprints || new Set(images.map((image) => image.fingerprint).filter(Boolean)), [existingFingerprints, images]);

  const handleFiles = async (fileList) => {
    const result = validateWorkspaceImages(Array.from(fileList || []), { existingFingerprints: fingerprints });
    setRejections(result.rejected);
    if (result.accepted.length === 0) return;

    const acceptedFiles = result.accepted.map((entry) => entry.file);
    const prechecks = {};
    await Promise.all(acceptedFiles.map(async (file) => {
      const previewUrl = URL.createObjectURL(file);
      previewsRef.current.add(previewUrl);
      const initial = buildImageQualityCoach(file);
      const dimensions = await readImageDimensions(file);
      prechecks[file.name] = {
        previewUrl,
        localQuality: buildImageQualityCoach(file, dimensions || {}),
        initial,
        dimensions,
      };
    }));
    setLocalPrechecks((current) => ({ ...current, ...prechecks }));
    await onUpload?.(acceptedFiles, prechecks);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragOver(false);
    if (disabled || verified) return;
    handleFiles(event.dataTransfer?.files);
  };

  const lockedLabel = labels.locked || 'Images are locked after clinician verification.';

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{labels.title || 'Multi-image case upload'}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{labels.subtitle || 'Attach all diagnostic images to one clinical case.'}</p>
        </div>
        <span className="rounded-full border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-500 dark:border-slate-700">
          {images.length} {labels.images || 'images'}
        </span>
      </div>

      <div
        onDragOver={(event) => { event.preventDefault(); if (!disabled && !verified) setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`rounded-xl border border-dashed p-4 text-center transition-colors ${
          isDragOver
            ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30'
            : 'border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900'
        } ${disabled || verified ? 'opacity-60' : ''}`}
      >
        <UploadCloud className="mx-auto h-7 w-7 text-indigo-500" />
        <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
          {verified ? lockedLabel : labels.drop || 'Drop dental images here'}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{labels.help || 'JPG, PNG, WebP, HEIC. Multiple files supported.'}</p>
        <button
          type="button"
          disabled={disabled || verified}
          onClick={() => inputRef.current?.click()}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <ImagePlus className="h-4 w-4" />
          {labels.select || 'Select images'}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          aria-label={labels.fileInput || 'Select multiple dental case images'}
          onChange={(event) => handleFiles(event.target.files)}
        />
      </div>

      {rejections.length > 0 && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">{labels.rejected || 'Some images were not attached'}</p>
          <ul className="mt-2 space-y-1 text-[11px] text-amber-700 dark:text-amber-300">
            {rejections.map((entry, index) => (
              <li key={`${entry.file?.name || index}:${entry.reason}`}>{entry.file?.name || 'File'}: {REJECTION_LABELS[entry.reason] || entry.reason}</li>
            ))}
          </ul>
        </div>
      )}

      {images.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {images.map((image) => {
            const precheck = localPrechecks[image.file_name] || localPrechecks[image.name] || {};
            const preview = image.previewUrl || precheck.previewUrl || image.storage_ref;
            const qualityStatus = image.quality_check?.quality_status || image.quality_status || precheck.localQuality?.status;
            const issues = image.quality_check?.issues || [];
            return (
              <div key={image.id || image.localId || image.file_name} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex gap-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-200 dark:bg-slate-800">
                    {preview ? (
                      <img src={preview} alt={image.file_name || image.name || 'Dental case image'} className="h-full w-full object-cover" />
                    ) : (
                      <ImagePlus className="m-5 h-6 w-6 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">{image.file_name || image.name}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">{image.mime_type || image.type} · {Math.round((image.size_bytes || image.size || 0) / 1024)} KB</p>
                      </div>
                      {statusIcon(image.upload_status || qualityStatus || 'pending')}
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-indigo-500"
                        style={{ width: `${image.progress ?? (image.upload_status === 'uploaded' ? 100 : 25)}%` }}
                      />
                    </div>
                    <p className="mt-2 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                      {qualityStatus ? `Quality: ${qualityStatus}` : image.upload_status || 'Queued'}
                    </p>
                    {issues.length > 0 && (
                      <p className="mt-1 line-clamp-2 text-[10px] text-amber-700 dark:text-amber-300">
                        {issues.map((issue) => issue.message || issue.code).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  {image.upload_status === 'failed' && (
                    <button
                      type="button"
                      onClick={() => onRetry?.(image)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
                    >
                      <RefreshCw className="h-3 w-3" />
                      {labels.retry || 'Retry'}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={verified}
                    onClick={() => onRemove?.(image)}
                    aria-label={`${labels.remove || 'Remove image'} ${image.file_name || image.name}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
                  >
                    <Trash2 className="h-3 w-3" />
                    {labels.remove || 'Remove'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
