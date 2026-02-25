/**
 * ChatMessage — Theme-aware Insight Cards for AI, user, error, system messages.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Bot, User, AlertCircle, BookOpen, Construction, WifiOff, ServerCrash, FileWarning, RefreshCw, Camera } from 'lucide-react';
import VisualFindingsCard from './VisualFindingsCard';

/**
 * Strip system-injected YOLO context blocks from user messages for display.
 * Defence-in-depth: loadSession already strips these, but just in case.
 */
function stripContextBlockDisplay(content) {
  if (!content) return '';
  let stripped = content
    .replace(/\[KONTEKS ANALISIS GAMBAR DENTAL[^\]]*\][\s\S]*?\[END KONTEKS\]\s*/gi, '')
    .replace(/\[DENTAL IMAGE ANALYSIS CONTEXT[^\]]*\][\s\S]*?\[END CONTEXT\]\s*/gi, '')
    .trim();
  if (/^Foto dental pasien sudah dianalisis oleh sistem deteksi AI \(YOLO\)/i.test(stripped)) {
    return '';
  }
  return stripped;
}

const messageVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1 },
};

function renderMarkdown(text) {
  if (!text) return null;
  let html = text
    // Bold **text**
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    // Bullet lines: "* text" or "- text" → list items (BEFORE italic to prevent * bullets becoming <em>)
    .replace(/^\*\s+(.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^-\s+(.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    // Numbered list: "1. text"
    .replace(/^\d+\.\s+(.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr class="border-current opacity-10 my-3"/>')
    // Strip any remaining stray * characters
    .replace(/\*/g, '')
    // Line breaks
    .replace(/\n{2,}/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
  return <div className="prose-dental" dangerouslySetInnerHTML={{ __html: html }} />;
}

function SourcesCitations({ sources }) {
  if (!sources?.length) return null;
  return (
    <div className="mt-4 pt-3 border-t border-primary">
      <div className="flex items-center gap-1.5 mb-2">
        <BookOpen className="w-3 h-3 text-accent" />
        <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">Sources & Citations</span>
      </div>
      <div className="space-y-1.5">
        {sources.map((src, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            <span className="shrink-0 inline-flex items-center justify-center w-4 h-4 rounded bg-accent/20 text-accent text-[9px] font-mono font-bold mt-0.5">
              {src.citation_number || i + 1}
            </span>
            <div>
              <p className="text-primary font-medium">{src.source}</p>
              {src.page && <p className="text-muted text-[10px]">Page {src.page}</p>}
              {src.excerpt && (
                <p className="text-muted text-[10px] italic mt-0.5 line-clamp-2">"{src.excerpt}"</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SuggestedQuestions({ questions, onSelect }) {
  if (!questions?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-3">
      {questions.map((q, i) => (
        <motion.button
          key={i}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect(q)}
          className="px-3 py-1.5 rounded-full bg-accent/10 text-accent text-[11px] font-medium border border-accent/20 hover:bg-accent/20 transition-colors"
        >
          {q}
        </motion.button>
      ))}
    </div>
  );
}

export default function ChatMessage({ message, onImageClick, onSuggestedQuestion }) {
  const { type, content, image, sources, visualFindings, suggestedQuestions } = message;

  if (type === 'error') {
    const errorType = message.errorType || 'generic';
    const title = message.title || 'Terjadi Kesalahan';
    const description = message.description || content || 'Permintaan gagal. Silakan coba lagi.';
    const hint = message.hint || null;

    const configs = {
      api_key_invalid: {
        Icon: Construction,
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/25',
        iconBg: 'bg-amber-500/15',
        iconColor: 'text-amber-500',
        titleColor: 'text-amber-700 dark:text-amber-300',
        descColor: 'text-amber-800/80 dark:text-amber-200/70',
        hintColor: 'text-amber-600/60 dark:text-amber-400/50',
        badge: 'AI Tidak Tersedia',
        badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/20',
      },
      rate_limited: {
        Icon: RefreshCw,
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/25',
        iconBg: 'bg-orange-500/15',
        iconColor: 'text-orange-500',
        titleColor: 'text-orange-700 dark:text-orange-300',
        descColor: 'text-orange-800/80 dark:text-orange-200/70',
        hintColor: 'text-orange-600/60 dark:text-orange-400/50',
        badge: 'AI Sedang Sibuk',
        badgeClass: 'bg-orange-500/15 text-orange-600 dark:text-orange-300 border-orange-500/20',
      },
      network_error: {
        Icon: WifiOff,
        bg: 'bg-slate-500/10',
        border: 'border-slate-500/25',
        iconBg: 'bg-slate-500/15',
        iconColor: 'text-slate-500',
        titleColor: 'text-slate-700 dark:text-slate-300',
        descColor: 'text-slate-600/80 dark:text-slate-300/70',
        hintColor: 'text-slate-500/60 dark:text-slate-400/50',
        badge: 'Koneksi Terputus',
        badgeClass: 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/20',
      },
      server_error: {
        Icon: ServerCrash,
        bg: 'bg-red-500/10',
        border: 'border-red-500/25',
        iconBg: 'bg-red-500/15',
        iconColor: 'text-red-500',
        titleColor: 'text-red-700 dark:text-red-300',
        descColor: 'text-red-800/80 dark:text-red-200/70',
        hintColor: 'text-red-600/60 dark:text-red-400/50',
        badge: 'Sedang Maintenance',
        badgeClass: 'bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/20',
      },
      parsing_error: {
        Icon: FileWarning,
        bg: 'bg-violet-500/10',
        border: 'border-violet-500/25',
        iconBg: 'bg-violet-500/15',
        iconColor: 'text-violet-500',
        titleColor: 'text-violet-700 dark:text-violet-300',
        descColor: 'text-violet-800/80 dark:text-violet-200/70',
        hintColor: 'text-violet-600/60 dark:text-violet-400/50',
        badge: 'Analisis Gagal',
        badgeClass: 'bg-violet-500/15 text-violet-600 dark:text-violet-300 border-violet-500/20',
      },
      no_response: {
        Icon: AlertCircle,
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/25',
        iconBg: 'bg-blue-500/15',
        iconColor: 'text-blue-500',
        titleColor: 'text-blue-700 dark:text-blue-300',
        descColor: 'text-blue-800/80 dark:text-blue-200/70',
        hintColor: 'text-blue-600/60 dark:text-blue-400/50',
        badge: 'Tidak Ada Hasil',
        badgeClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/20',
      },
      generic: {
        Icon: AlertCircle,
        bg: 'bg-red-500/10',
        border: 'border-red-500/25',
        iconBg: 'bg-red-500/15',
        iconColor: 'text-red-500',
        titleColor: 'text-red-700 dark:text-red-300',
        descColor: 'text-red-800/80 dark:text-red-200/70',
        hintColor: 'text-red-600/60 dark:text-red-400/50',
        badge: 'Gangguan Sementara',
        badgeClass: 'bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/20',
      },
    };

    const cfg = configs[errorType] || configs.generic;
    const { Icon } = cfg;

    return (
      <motion.div
        variants={messageVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.35 }}
        className="flex gap-3 px-1 py-1"
      >
        <div className={`shrink-0 w-9 h-9 rounded-xl ${cfg.iconBg} flex items-center justify-center border ${cfg.border} mt-0.5`}>
          <Icon className={`w-4 h-4 ${cfg.iconColor}`} />
        </div>

        <div className={`flex-1 rounded-2xl ${cfg.bg} border ${cfg.border} overflow-hidden`}>
          {/* Top bar */}
          <div className={`flex items-center gap-2 px-4 pt-4 pb-2`}>
            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${cfg.badgeClass}`}>
              {cfg.badge}
            </span>
            <span className={`text-sm font-semibold ${cfg.titleColor}`}>{title}</span>
          </div>

          {/* Description */}
          <p className={`px-4 pb-3 text-sm leading-relaxed ${cfg.descColor}`}>{description}</p>

          {/* Hint / technical detail */}
          {hint && (
            <div className={`mx-4 mb-4 px-3 py-2 rounded-lg bg-black/5 dark:bg-white/5 border ${cfg.border}`}>
              <p className={`text-[11px] font-mono ${cfg.hintColor}`}>{hint}</p>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  if (type === 'system') {
    return (
      <motion.div variants={messageVariants} initial="hidden" animate="visible" transition={{ duration: 0.3 }} className="flex justify-center px-4 py-2">
        <p className="text-xs text-muted italic">{content}</p>
      </motion.div>
    );
  }

  if (type === 'user') {
    const displayContent = stripContextBlockDisplay(content);
    return (
      <motion.div variants={messageVariants} initial="hidden" animate="visible" transition={{ duration: 0.35 }} className="flex gap-3 px-4 py-2 justify-end">
        <div className="max-w-[70%] space-y-2">
          {image?.url && (
            <div className="rounded-xl overflow-hidden border border-primary max-w-xs ml-auto">
              <img src={image.url} alt={image.name} className="w-full" />
            </div>
          )}
          {image && !image.url && (
            <div className="rounded-xl border border-accent/30 max-w-xs ml-auto bg-accent/10 px-3 py-2 flex items-center gap-2">
              <Camera className="w-4 h-4 text-accent/60" />
              <span className="text-xs text-accent/70 italic">Gambar dental telah diunggah</span>
            </div>
          )}
          {displayContent && (
            <div className="px-4 py-3 rounded-2xl rounded-tr-md bg-accent text-white shadow-lg">
              <p className="text-sm leading-relaxed">{displayContent}</p>
            </div>
          )}
        </div>
        <div className="shrink-0 w-8 h-8 rounded-xl bg-accent flex items-center justify-center shadow-lg">
          <User className="w-4 h-4 text-white" />
        </div>
      </motion.div>
    );
  }

  // AI "Insight Card"
  return (
    <motion.div
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex gap-3 px-4 py-2"
    >
      <div className="shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="px-5 py-4 rounded-2xl rounded-tl-md text-sm leading-relaxed bg-surface-elevated border border-primary text-primary shadow-sm theme-transition">
          {renderMarkdown(content)}
          <SourcesCitations sources={sources} />
          <SuggestedQuestions questions={suggestedQuestions} onSelect={onSuggestedQuestion} />
        </div>
        {visualFindings && (
          <VisualFindingsCard findings={visualFindings} onImageClick={onImageClick} />
        )}
      </div>
    </motion.div>
  );
}
