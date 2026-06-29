import React, { useEffect, useRef, useState } from 'react';
import { Activity, AlertCircle, RefreshCw, Send, Stethoscope, UserRound, X } from 'lucide-react';
import { cleanAIDentistOutput } from '../../../../utils/aiTextHelpers';

const ROLE_META = {
  dentist: { label: 'Dokter Gigi', Icon: Stethoscope, side: 'right' },
  patient: { label: 'Pasien', Icon: UserRound, side: 'left' },
  assistant: { label: 'Serene AI', Icon: Activity, side: 'left' },
  ai: { label: 'Serene AI', Icon: Activity, side: 'left' },
  system: { label: 'Sistem', Icon: Activity, side: 'left' },
};

function ChatMessage({ message }) {
  const meta = ROLE_META[message.role] || ROLE_META.system;
  const { Icon } = meta;
  const mine = meta.side === 'right';
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[88%] ${mine ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <span className="inline-flex items-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          <Icon className="h-3 w-3" />
          {message.actorName || meta.label}
        </span>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${mine
          ? 'rounded-br-md bg-cyan-600 text-white'
          : 'rounded-bl-md border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
          }`}>
          {message.role === 'assistant' || message.role === 'ai'
            ? cleanAIDentistOutput(message.content)
            : message.content}
        </div>
        <div className="flex items-center gap-2 px-1 text-[10px] text-slate-400">
          <time>{message.createdAt ? new Date(message.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''}</time>
          {message.status === 'sending' && <span>Mengirim…</span>}
          {message.status === 'failed' && <span className="text-rose-500">Gagal dikirim</span>}
        </div>
      </div>
    </div>
  );
}

export default function DentistChatPanel({
  isOpen,
  onClose,
  messages,
  isLoading,
  isSending,
  error,
  onRetry,
  onSend,
  suggestions = [],
}) {
  const [input, setInput] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    if (isOpen) listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [isOpen, messages, isSending]);

  if (!isOpen) return null;
  const submit = async () => {
    const value = input.trim();
    if (!value) return;
    if (await onSend(value)) setInput('');
  };

  return (
    <div className="fixed inset-0 z-[110] flex flex-col bg-slate-50 dark:bg-slate-950 sm:absolute sm:inset-auto sm:bottom-0 sm:right-0 sm:top-0 sm:w-[28rem] sm:border-l sm:border-slate-200 dark:sm:border-slate-800">
      <header className="flex min-h-16 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10">
            <Activity className="h-5 w-5 text-cyan-500" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Diskusi Klinis · Serene AI</h3>
            <p className="text-[11px] text-slate-500">Khusus pendukung keputusan dokter gigi</p>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Tutup diskusi klinis" className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
          <X className="h-5 w-5" />
        </button>
      </header>

      <div ref={listRef} className="flex-1 space-y-5 overflow-y-auto p-4">
        {isLoading && <p className="py-10 text-center text-sm text-slate-500">Memuat histori percakapan…</p>}
        {!isLoading && messages.length === 0 && (
          <div className="mx-auto max-w-xs py-12 text-center">
            <Activity className="mx-auto h-7 w-7 text-cyan-500" />
            <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Belum ada diskusi lanjutan</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">Ajukan pertanyaan berdasarkan temuan dan kondisi pasien.</p>
          </div>
        )}
        {messages.map((message) => <ChatMessage key={message.id} message={message} />)}
        {error && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            <span className="inline-flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Percakapan tidak dapat diproses.</span>
            <button type="button" onClick={onRetry} className="inline-flex min-h-11 items-center gap-1 font-bold"><RefreshCw className="h-3.5 w-3.5" /> Coba lagi</button>
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-slate-800 dark:bg-slate-900">
        {suggestions.length > 0 && (
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
            {suggestions.map((suggestion) => (
              <button key={suggestion} type="button" onClick={() => setInput(suggestion)} className="min-h-11 shrink-0 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 text-left text-[11px] font-medium text-cyan-700 dark:text-cyan-300">
                {suggestion}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value.slice(0, 4000))}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            disabled={isSending}
            rows={1}
            aria-label="Pertanyaan klinis lanjutan"
            placeholder="Tulis pertanyaan klinis…"
            className="min-h-12 flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-800"
          />
          <button type="button" onClick={submit} disabled={isSending || !input.trim()} aria-label="Kirim pertanyaan klinis" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-600 text-white disabled:opacity-40">
            <Send className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] text-slate-400">Serene AI dapat keliru. Verifikasi seluruh temuan sebelum keputusan klinis.</p>
      </div>
    </div>
  );
}
