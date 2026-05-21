import React, { useState, useRef, useEffect } from 'react';
import Icon from '../../../../components/AppIcon';

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
        <div className="h-[120px] w-[200px] animate-pulse rounded-lg" style={{ background: 'rgba(255,255,255,0.06)' }} />
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
  onStartVideoCall
}) => {
  const [message, setMessage] = useState('');
  const [attachmentError, setAttachmentError] = useState('');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!conversation) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4" style={{ background: '#0f0d1a' }}>
        <div
          style={{
            animation: 'pulseGlow 3s infinite alternate',
            filter: 'drop-shadow(0 8px 16px rgba(124,58,237,0.15))',
          }}
        >
          <div
            className="flex h-20 w-20 items-center justify-center rounded-2xl"
            style={{
              background: 'rgba(124,58,237,0.1)',
              border: '1px solid rgba(124,58,237,0.15)',
            }}
          >
            <Icon name="MessageSquare" size={32} style={{ color: 'rgba(124,58,237,0.5)' }} />
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm font-semibold" style={{ color: 'var(--td-text-sub)' }}>
            Select a conversation
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--td-text-muted)' }}>
            Choose a patient session from the left
          </p>
        </div>

        <div
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px]"
          style={{
            color: 'var(--td-text-muted)',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
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
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
          <div className="text-xs" style={{ color: isMine ? 'rgba(255,255,255,0.72)' : 'var(--td-text-muted)' }}>
            Scan: {msg.mediaScanStatus === 'pending' ? 'menunggu' : msg.mediaScanStatus}
          </div>
        )}
        {msg.fileUrl && (
          <button
            onClick={openFile}
            className="text-xs underline"
            style={{ color: isMine ? 'rgba(255,255,255,0.82)' : 'var(--td-accent)' }}
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
          className="bubble-pop-in max-w-[68%] px-3.5 py-2.5"
          style={isMine ? {
            background: 'linear-gradient(135deg, var(--td-bubble-out-from), var(--td-bubble-out-to))',
            border: '1px solid var(--td-bubble-out-border)',
            borderRadius: '1.1rem 0 1.1rem 1.1rem',
            boxShadow: '0 2px 8px rgba(76,29,149,0.3)',
            color: 'var(--td-text-main)',
            wordBreak: 'break-word',
          } : {
            background: 'var(--td-bubble-in-bg)',
            backdropFilter: 'blur(6px)',
            border: '1px solid var(--td-bubble-in-border)',
            borderRadius: '0 1.1rem 1.1rem 1.1rem',
            color: 'var(--td-text-main)',
            wordBreak: 'break-word',
          }}
        >
          {msg.messageType === 'file' ? (
            renderFileContent(msg, isMine)
          ) : (
            <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--td-text-main)', wordBreak: 'break-word' }}>
              {msg.message}
            </p>
          )}

          {!groupedWithNext && (
            <div className="mt-1 flex items-center justify-end gap-1">
              <span className="font-mono text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {formatTimestamp(msg.createdAt)}
              </span>
              {isMine && (
                <Icon
                  name="CheckCheck"
                  size={11}
                  style={{ color: msg.isRead ? 'var(--td-accent)' : 'rgba(255,255,255,0.35)' }}
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
    <div className="relative flex h-full flex-col overflow-hidden" style={{ background: '#0f0d1a' }}>
      <div
        className="flex flex-shrink-0 items-center justify-between px-4 py-3"
        style={{
          background: 'linear-gradient(180deg, rgba(26,21,40,0.95), rgba(26,21,40,0.78))',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl text-sm font-bold text-white"
              style={getAvatarGradient(patientName)}
            >
              {conversation.patient?.avatar ? (
                <img
                  src={conversation.patient.avatar}
                  alt={patientName}
                  className="h-full w-full object-cover"
                />
              ) : (
                getInitials(patientName)
              )}
            </div>
            <span
              className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2"
              style={{ background: online ? '#22c55e' : 'var(--td-text-muted)', borderColor: 'var(--td-panel-bg)' }}
            />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: 'var(--td-text-main)' }}>
              {patientName}
            </h3>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: online ? '#22c55e' : 'var(--td-text-muted)' }} />
              <span className="text-[11px]" style={{ color: 'var(--td-text-muted)' }}>
                {online ? 'Active now' : 'Offline'} · #{conversation.appointmentId}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onStartVideoCall}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-150 hover:-translate-y-px"
            style={{
              background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(124,58,237,0.35)',
            }}
            title="Mulai panggilan video"
          >
            <Icon name="Video" size={12} />
            Video
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-minimal" style={{ padding: '1.5rem 2rem 6rem' }}>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="h-16 w-2/3 animate-pulse rounded-2xl"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.04)' }}
                />
              </div>
            ))}
          </div>
        ) : (
          <>
            {messages.length > 0 && (
              <div className="my-4 flex items-center justify-center">
                <span
                  className="rounded-full px-3 py-1 text-[10px] font-medium"
                  style={{ color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.05)' }}
                >
                  Today
                </span>
              </div>
            )}
            {messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 flex-shrink-0"
        style={{
          padding: '1.25rem 1.5rem 1.5rem',
          background: 'linear-gradient(0deg, rgba(15,13,26,0.97) 0%, transparent 100%)',
          pointerEvents: 'none',
        }}
      >
        {(attachmentError || attachmentUpload.status !== 'idle') && (
          <div
            className="mb-2 rounded-lg px-3 py-1.5 text-xs"
            style={{
              background: attachmentError || attachmentUpload.status === 'error' ? 'rgba(239,68,68,0.12)' : 'rgba(124,58,237,0.12)',
              border: attachmentError || attachmentUpload.status === 'error' ? '1px solid rgba(239,68,68,0.22)' : '1px solid rgba(124,58,237,0.2)',
              color: attachmentError || attachmentUpload.status === 'error' ? '#fca5a5' : 'var(--td-text-sub)',
              pointerEvents: 'auto',
            }}
          >
            {attachmentError ? (
              <span>{attachmentError}</span>
            ) : attachmentUpload.status === 'uploading' ? (
              <div className="flex items-center gap-2">
                <Icon name="Loader2" size={11} className="animate-spin" />
                <span>Mengupload... {attachmentUpload.progress || 0}%</span>
                <div className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${attachmentUpload.progress || 0}%`, background: 'var(--td-accent)' }}
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
          className="flex items-end gap-2 rounded-3xl px-4 py-2"
          style={{
            background: 'rgba(26,21,40,0.85)',
            backdropFilter: 'blur(15px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            pointerEvents: 'auto',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
        >
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={attachmentUpload.status === 'uploading'}
            className="mb-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-all duration-150 hover:scale-105 disabled:opacity-50"
            style={{ color: 'var(--td-text-muted)' }}
            title="Kirim attachment"
            aria-label="Upload attachment"
          >
            <Icon name="Paperclip" size={16} />
          </button>

          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ketik pesan..."
            className="flex-1 bg-transparent py-1.5 text-sm focus:outline-none"
            style={{ color: 'var(--td-text-main)' }}
          />

          <button
            onClick={handleSubmit}
            disabled={!message.trim()}
            className="mb-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 active:scale-95"
            style={{
              background: message.trim()
                ? 'linear-gradient(135deg, #7C3AED, #6D28D9)'
                : 'rgba(255,255,255,0.06)',
              boxShadow: message.trim() ? '0 4px 12px rgba(124,58,237,0.4)' : 'none',
              color: message.trim() ? '#fff' : 'var(--td-text-muted)',
            }}
            aria-label="Send message"
          >
            <Icon name="ArrowUp" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
