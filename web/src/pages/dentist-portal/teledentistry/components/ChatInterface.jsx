import React, { useState, useRef, useEffect, useCallback } from 'react';
import Icon from '../../../../components/AppIcon';

const API_BASE = import.meta.env.VITE_AUTH_API_BASE_URL || 'http://localhost:4000';
const FILE_BASE_URL = (import.meta.env.VITE_FILE_BASE_URL || API_BASE).replace(/\/$/, '');

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

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
      <div className="flex items-center space-x-2 py-1">
        <Icon name="FileImage" size={14} />
        <span className="text-xs font-medium">{alt || 'Image'}</span>
      </div>
    );
  }

  return (
    <div className="relative cursor-pointer" onClick={onClick}>
      {!loaded && (
        <div className="w-[200px] h-[120px] rounded-lg bg-primary/10 animate-pulse" />
      )}
      <img
        src={src}
        alt={alt || 'Attachment'}
        className={`rounded-lg object-cover transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0 absolute inset-0'}`}
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
  onSendText,
  onUploadAttachment,
  onStartVideoCall
}) => {
  const [message, setMessage] = useState('');
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
      <div className="flex-1 flex items-center justify-center bg-surface">
        <div className="text-center text-muted">
          Select a conversation to start messaging
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
    await onUploadAttachment?.(file);
    fileInputRef.current.value = '';
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderFileContent = (msg) => {
    const resolved = resolveFileUrl(msg.fileUrl);
    const openFile = () => {
      if (resolved) window.open(resolved, '_blank', 'noopener');
    };

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
        <div className="flex items-center space-x-2">
          <Icon name="Paperclip" size={14} />
          <span className="text-xs font-medium">{msg.fileName || 'Attachment'}</span>
        </div>
        {msg.fileUrl && (
          <button
            onClick={openFile}
            className="text-xs underline text-white/80"
          >
            View file
          </button>
        )}
      </div>
    );
  };

  const renderMessage = (msg) => {
    const isMine = msg.senderId === currentUserId?.toString();
    const bubbleClasses = isMine
      ? 'bg-accent text-white'
      : 'bg-surface-elevated text-primary border border-primary/5';

    return (
      <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-3`}>
        <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${bubbleClasses} theme-transition`}>
          {msg.messageType === 'file' ? (
            renderFileContent(msg)
          ) : (
            <p className="text-sm whitespace-pre-line">{msg.message}</p>
          )}
          <p className={`text-xs mt-1 ${isMine ? 'text-white/70' : 'text-muted'}`}>
            {formatTimestamp(msg.createdAt)}
          </p>
        </div>
      </div>
    );
  };

  const online = presence?.some((id) => id !== conversation.dentist?.id);

  return (
    <div className="flex flex-col h-full bg-surface theme-transition">
      <div className="flex items-center justify-between px-4 py-3 border-b border-primary/10 bg-surface-elevated theme-transition">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-8 h-8 bg-surface rounded-lg flex items-center justify-center theme-transition border border-primary/10">
              {conversation.patient?.avatar ? (
                <img
                  src={conversation.patient.avatar}
                  alt={conversation.patient.name}
                  className="w-8 h-8 rounded-lg object-cover"
                />
              ) : (
                <span className="text-xs font-medium text-primary theme-transition">
                  {conversation.patient?.name
                    ?.split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()}
                </span>
              )}
            </div>
            {online && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border border-surface"></div>
            )}
          </div>
          <div>
            <h3 className="text-sm font-medium text-primary theme-transition">
              {conversation.patient?.name}
            </h3>
            <p className="text-xs text-muted theme-transition">
              {online ? 'Online' : 'Offline'} • Appointment #{conversation.appointmentId}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={onStartVideoCall}
            className="p-1.5 text-muted hover:text-primary hover:bg-surface rounded-lg theme-transition"
            title="Start video call"
          >
            <Icon name="Video" size={16} />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 text-muted hover:text-primary hover:bg-surface rounded-lg theme-transition"
            title="Share file"
            aria-label="Upload file attachment"
          >
            <Icon name="Paperclip" size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="space-y-4 animate-in fade-in duration-300">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                <div className={`w-2/3 h-16 rounded-2xl bg-primary/5 animate-pulse border border-primary/5`} />
              </div>
            ))}
          </div>
        ) : (
          <>
            {messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="border-t border-primary/10 p-3 bg-surface-elevated theme-transition">
        <div className="flex items-center space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx"
          />
          <div className="flex-1">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="w-full px-3 py-2 border border-primary/10 rounded-lg bg-surface text-primary text-sm focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent theme-transition"
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={!message.trim()}
            className="p-2 bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed theme-transition"
            aria-label="Send message"
          >
            <Icon name="Send" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
