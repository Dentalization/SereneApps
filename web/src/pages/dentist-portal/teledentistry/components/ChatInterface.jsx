import React, { useState, useRef, useEffect } from 'react';
import Icon from '../../../../components/AppIcon';

const API_BASE = import.meta.env.VITE_AUTH_API_BASE_URL || 'http://localhost:4000';
const FILE_BASE_URL = (import.meta.env.VITE_FILE_BASE_URL || API_BASE).replace(/\/$/, '');

function resolveFileUrl(fileUrl) {
  if (!fileUrl) return null;
  if (/^https?:\/\//i.test(fileUrl)) {
    return fileUrl;
  }
  const normalizedPath = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`;
  return `${FILE_BASE_URL}${normalizedPath}`;
}

const ChatInterface = ({
  conversation,
  messages,
  currentUserId,
  presence,
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const text = message.trim();
    if (!text) return;
    onSendText?.(text);
    setMessage('');
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

  const renderMessage = (msg) => {
    const isMine = msg.senderId === currentUserId?.toString();
    const bubbleClasses = isMine
      ? 'bg-accent text-white'
      : 'bg-surface-elevated text-primary border border-primary/5';

    return (
      <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-3`}>
        <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${bubbleClasses} theme-transition`}>
          {msg.messageType === 'file' ? (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Icon name="Paperclip" size={14} />
                <span className="text-xs font-medium">{msg.fileName || 'Attachment'}</span>
              </div>
              {msg.fileUrl && (
                <button
                  onClick={() => {
                    const url = resolveFileUrl(msg.fileUrl);
                    if (url) {
                      window.open(url, '_blank', 'noopener');
                    }
                  }}
                  className="text-xs underline text-white/80"
                >
                  View file
                </button>
              )}
            </div>
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
          >
            <Icon name="Paperclip" size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(renderMessage)}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-primary/10 p-3 bg-surface-elevated theme-transition">
        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
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
              placeholder="Type a message..."
              className="w-full px-3 py-2 border border-primary/10 rounded-lg bg-surface text-primary text-sm focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent theme-transition"
            />
          </div>
          <button
            type="submit"
            disabled={!message.trim()}
            className="p-2 bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed theme-transition"
          >
            <Icon name="Send" size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
