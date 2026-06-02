import React, { useState, useRef, useEffect } from 'react';
import Icon from '../../../../components/AppIcon';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { parseDateValue } from '../utils/dateUtils';
import { resolveMediaUrl } from '../../../../utils/media';

const API_BASE = import.meta.env.VITE_AUTH_API_BASE_URL || 'http://localhost:4000';
const FILE_BASE_URL = (import.meta.env.VITE_FILE_BASE_URL || API_BASE).replace(/\/$/, '');

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
]);

const AVATAR_GRADIENTS = [
  ['#7C3AED', '#4f46e5'],
  ['#6d28d9', '#9333ea'],
  ['#4f46e5', '#0ea5e9'],
  ['#7c3aed', '#ec4899'],
  ['#2563eb', '#7c3aed'],
  ['#9333ea', '#db2777'],
  ['#0891b2', '#7c3aed'],
  ['#d97706', '#7c3aed'],
];

function getAvatarGradient(name = '') {
  const hash = [...String(name)].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const [from, to] = AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
  return { background: `linear-gradient(135deg, ${from}, ${to})` };
}

function getInitials(name = '') {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';
}

function resolveFileUrl(fileUrl) {
  if (!fileUrl) return null;
  if (/^https?:\/\//i.test(fileUrl)) {
    return fileUrl;
  }
  const normalizedPath = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`;
  return `${FILE_BASE_URL}${normalizedPath}`;
}

function isImageFile(msg) {
  if (msg.mimeType && msg.mimeType.startsWith('image/')) return true;
  const fileName = msg.fileName || msg.fileUrl || '';
  const ext = fileName.split('.').pop()?.toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
}

const ImageThumbnail = ({ src, alt, onClick }) => {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div className="flex items-center gap-2 py-1">
        <Icon name="FileImage" size={14} />
        <span className="text-xs font-medium">{alt || 'Image'}</span>
      </div>
    );
  }

  return (
    <div className="relative cursor-pointer" onClick={onClick}>
      {!loaded && (
        <div className="h-[120px] w-[200px] animate-pulse rounded-lg bg-surface-elevated border border-border/40" />
      )}
      <img
        src={src}
        alt={alt || 'Attachment'}
        className={`rounded-lg object-cover transition-opacity duration-200 ${loaded ? 'opacity-100' : 'absolute inset-0 opacity-0'}`}
        style={{ maxWidth: '200px', maxHeight: '150px' }}
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
      />
    </div>
  );
};

const ChatInterface = ({
  conversation,
  messages,
  currentUserId,
  presence,
  loading = false,
  attachmentUpload = { status: 'idle', progress: 0, error: '' },
  onSendText,
  onUploadAttachment,
  onStartVideoCall,
  connectionState,
  reconnectError,
  sendTypingIndicator
}) => {
  const { t, language } = useLanguage();
  const [message, setMessage] = useState('');
  const [attachmentError, setAttachmentError] = useState('');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastTypingSentRef = useRef(0);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setMessage(val);
    const now = Date.now();
    if (now - lastTypingSentRef.current > 2500) {
      lastTypingSentRef.current = now;
      sendTypingIndicator?.();
    }
  };

  const getMessageDateLabel = (dateVal) => {
    const dateObj = parseDateValue(dateVal);
    if (!dateObj) return '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(dateObj);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / 86400000);

    if (diffDays === 0) {
      return t('clinic.teledentistry.date.today', { defaultValue: 'Hari ini' });
    } else if (diffDays === 1) {
      return t('clinic.teledentistry.date.tomorrow', { defaultValue: 'Besok' });
    } else if (diffDays === -1) {
      return t('clinic.teledentistry.date.yesterday', { defaultValue: 'Kemarin' });
    } else {
      return dateObj.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!conversation) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-surface">
        <div>
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-accent/10 border border-accent/20">
            <Icon name="MessageSquare" size={32} className="text-accent/50" />
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm font-semibold text-secondary">
            Select a conversation
          </p>
          <p className="mt-1 text-xs text-muted">
            Choose a patient session from the left
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] text-muted bg-surface-elevated border border-border/40">
          <Icon name="Lock" size={10} />
          End-to-end encrypted · HIPAA compliant
        </div>
      </div>
    );
  }

  const handleSubmit = () => {
    const text = message.trim();
    if (!text) return;
    onSendText?.(text);
    setMessage('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAttachmentError('');
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setAttachmentError('Ukuran file maksimal 10 MB.');
      fileInputRef.current.value = '';
      return;
    }
    if (file.type && !ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
      setAttachmentError('Tipe file tidak didukung. Gunakan gambar, PDF, DOC/DOCX, atau TXT.');
      fileInputRef.current.value = '';
      return;
    }
    await onUploadAttachment?.(file);
    fileInputRef.current.value = '';
  };

  const formatTimestamp = (timestamp) => {
    const dateObj = parseDateValue(timestamp);
    if (!dateObj) return '';
    return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderFileContent = (msg, isMine = false) => {
    const resolved = resolveFileUrl(msg.fileUrl);
    const expired = msg.mediaRetentionUntil && new Date(msg.mediaRetentionUntil).getTime() < Date.now();
    const deleted = msg.metadata?.deleted === true;
    const openFile = () => {
      if (resolved) window.open(resolved, '_blank', 'noopener');
    };

    if (msg.attachmentAvailable === false || expired || deleted || !resolved) {
      return (
        <div className="flex items-center gap-2 py-1">
          <Icon name="FileWarning" size={14} />
          <span className="text-xs font-medium">Attachment tidak tersedia</span>
        </div>
      );
    }

    if (isImageFile(msg) && resolved) {
      return (
        <ImageThumbnail
          src={resolved}
          alt={msg.fileName || 'Image'}
          onClick={openFile}
        />
      );
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Icon name="Paperclip" size={14} />
          <span className="text-xs font-medium">{msg.fileName || 'Attachment'}</span>
        </div>
        {msg.mediaScanStatus && msg.mediaScanStatus !== 'clean' && (
          <div className={`text-xs ${isMine ? 'text-white/70' : 'text-muted'}`}>
            Scan: {msg.mediaScanStatus === 'pending' ? 'menunggu' : msg.mediaScanStatus}
          </div>
        )}
        {msg.fileUrl && (
          <button
            onClick={openFile}
            className={`text-xs underline ${isMine ? 'text-white/80' : 'text-accent'}`}
          >
            View file
          </button>
        )}
      </div>
    );
  };

  const isGroupedWithinTwoMinutes = (current, adjacent) => {
    if (!current || !adjacent) return false;
    if (String(current.senderId || '') !== String(adjacent.senderId || '')) return false;
    const currentTime = new Date(current.createdAt).getTime();
    const adjacentTime = new Date(adjacent.createdAt).getTime();
    if (Number.isNaN(currentTime) || Number.isNaN(adjacentTime)) return false;
    return Math.abs(adjacentTime - currentTime) <= 2 * 60 * 1000;
  };

  const renderMessage = (msg, index) => {
    const isMine = msg.senderId === currentUserId?.toString();
    const groupedWithNext = isGroupedWithinTwoMinutes(msg, messages[index + 1]);
    return (
      <div key={msg.id} className={`flex ${groupedWithNext ? 'mb-1' : 'mb-2'} ${isMine ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`bubble-pop-in max-w-[68%] px-3.5 py-2.5 rounded-2xl shadow-sm ${isMine ? 'bg-accent text-white' : 'bg-surface-elevated text-primary border border-border/40'}`}
          style={{ wordBreak: 'break-word' }}
        >
          {msg.messageType === 'file' ? (
            renderFileContent(msg, isMine)
          ) : (
            <p className={`text-sm leading-relaxed whitespace-pre-line ${isMine ? 'text-white' : 'text-primary'}`} style={{ wordBreak: 'break-word' }}>
              {msg.message}
            </p>
          )}

          {!groupedWithNext && (
            <div className="mt-1 flex items-center justify-end gap-1">
              <span className={`font-mono text-[10px] ${isMine ? 'text-white/60' : 'text-muted'}`}>
                {formatTimestamp(msg.createdAt)}
              </span>
              {isMine && (
                <Icon
                  name="CheckCheck"
                  size={11}
                  className={msg.isRead ? 'text-white' : 'text-white/50'}
                />
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const patientName = conversation.patient?.name || 'Patient';
  const online = presence?.some((id) => id !== conversation.dentist?.id);

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-surface">
      <div className="flex flex-shrink-0 items-center justify-between px-4 py-3 ">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl text-sm font-bold text-white shadow-sm"
              style={getAvatarGradient(patientName)}
            >
              {conversation.patient?.avatar ? (
                <img
                  src={resolveMediaUrl(conversation.patient.avatar)}
                  alt={patientName}
                  className="h-full w-full object-cover"
                />
              ) : (
                getInitials(patientName)
              )}
            </div>
            <span
              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface ${online ? 'bg-green-500' : 'bg-muted'}`}
            />
          </div>
          <div>
            <h3 className="text-sm font-bold text-primary">
              {patientName}
            </h3>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-green-500' : 'bg-muted'}`} />
              <span className="text-[11px] text-muted">
                {online ? 'Active now' : 'Offline'} · #{conversation.appointmentId}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onStartVideoCall}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-150 hover:-translate-y-px bg-accent text-white shadow-sm hover:shadow-md"
            title="Mulai panggilan video"
          >
            <Icon name="Video" size={12} />
            Video
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-minimal px-8 pt-6 pb-24">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="h-16 w-2/3 animate-pulse rounded-2xl bg-surface-elevated border border-border/40"
                />
              </div>
            ))}
          </div>
        ) : (
          <>
            {messages.map((msg, index) => {
              const prevMsg = messages[index - 1];
              const msgDate = parseDateValue(msg.createdAt);
              const prevMsgDate = prevMsg ? parseDateValue(prevMsg.createdAt) : null;
              const msgDateStr = msgDate ? msgDate.toDateString() : '';
              const prevMsgDateStr = prevMsgDate ? prevMsgDate.toDateString() : '';
              const showSeparator = msgDateStr && msgDateStr !== prevMsgDateStr;

              return (
                <React.Fragment key={msg.id || index}>
                  {showSeparator && msgDate && (
                    <div className="my-4 flex items-center justify-center">
                      <span className="rounded-full px-3 py-1 text-[10px] font-medium text-muted bg-surface-elevated border border-border/40">
                        {getMessageDateLabel(msgDate)}
                      </span>
                    </div>
                  )}
                  {renderMessage(msg, index)}
                </React.Fragment>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 flex-shrink-0 px-6 pb-6 pt-4"
      >
        {connectionState === 'ended' && (
          <div className="mb-3 flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10 px-5 py-3.5 shadow-theme-sm pointer-events-auto">
            <span className="flex-shrink-0 rounded-lg p-2 bg-amber-500/10 text-amber-600 dark:text-amber-500">
              <Icon name="Archive" size={16} />
            </span>
            <p className="text-xs font-medium leading-normal text-amber-800 dark:text-amber-400/90">
              {reconnectError || 'Sesi teledentistry telah berakhir. Riwayat chat ditampilkan dari arsip lokal.'}
            </p>
          </div>
        )}

        <>
          {(attachmentError || attachmentUpload.status !== 'idle') && (
            <div
              className={`mb-2 rounded-lg px-3 py-1.5 text-xs pointer-events-auto border ${attachmentError || attachmentUpload.status === 'error' ? 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300' : 'bg-accent/10 border-accent/20 text-secondary'}`}
            >
              {attachmentError ? (
                <span>{attachmentError}</span>
              ) : attachmentUpload.status === 'uploading' ? (
                <div className="flex items-center gap-2">
                  <Icon name="Loader2" size={11} className="animate-spin" />
                  <span>Mengupload... {attachmentUpload.progress || 0}%</span>
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-border/40">
                    <div
                      className="h-full rounded-full transition-all duration-300 bg-accent"
                      style={{ width: `${attachmentUpload.progress || 0}%` }}
                    />
                  </div>
                </div>
              ) : attachmentUpload.status === 'scan_pending' ? (
                <span>Attachment terupload. Malware scan sedang berjalan.</span>
              ) : attachmentUpload.status === 'error' ? (
                <span>{attachmentUpload.error || 'Upload attachment gagal.'}</span>
              ) : (
                <span>Attachment berhasil diupload.</span>
              )}
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx"
          />

          <div
            className="flex items-center gap-2 rounded-3xl px-3 py-2 bg-surface/90 backdrop-blur-md border border-border/40 shadow-sm pointer-events-auto transition-all focus-within:border-accent/50 focus-within:ring-1 focus-within:ring-accent/20"
          >
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={attachmentUpload.status === 'uploading'}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-all duration-150 hover:scale-105 disabled:opacity-50 text-muted hover:text-primary hover:bg-surface-elevated"
              title="Kirim attachment"
              aria-label="Upload attachment"
            >
              <Icon name="Paperclip" size={16} />
            </button>

            <input
              type="text"
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ketik pesan..."
              className="flex-1 bg-transparent py-2 text-sm border-0 focus:ring-0 focus:outline-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400"
            />

            <button
              onClick={handleSubmit}
              disabled={!message.trim()}
              className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-all duration-200 ${message.trim() ? 'bg-accent text-white shadow-sm hover:scale-110 active:scale-95' : 'bg-surface-elevated text-muted'}`}
              aria-label="Send message"
            >
              <Icon name="ArrowUp" size={16} />
            </button>
          </div>
        </>
      </div>
    </div>
  );
};

export default ChatInterface;
