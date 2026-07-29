/**
 * ChatMessage — Theme-aware Insight Cards for AI, user, error, system messages.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Activity, User, AlertCircle, BookOpen, Construction, WifiOff, ServerCrash, FileWarning, RefreshCw, Camera, ArrowUpRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
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

function SafeMarkdown({ text }) {
  if (!text) return null;

  return (
    <div className="prose-dental space-y-2">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          p: ({ children }) => <p className="leading-relaxed">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          ul: ({ children }) => <ul className="ml-4 list-disc space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="ml-4 list-decimal space-y-1">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          hr: () => <hr className="border-current opacity-10 my-3" />,
          a: ({ href, children }) => (
            <a href={href} rel="noreferrer" target="_blank" className="text-accent underline underline-offset-2">
              {children}
            </a>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

function SourcesCitations({ sources }) {
  if (!sources?.length) return null;
  return (
    <div className="mt-5 border-t border-primary/70 pt-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10">
          <BookOpen className="h-3.5 w-3.5 text-emerald-500" />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Rujukan Ilmiah</span>
      </div>
      <div className="space-y-2">
        {sources.map((src, i) => (
          <div key={i} className="flex items-start gap-3 rounded-xl border border-primary/70 bg-surface px-3 py-2.5 text-xs">
            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 font-mono text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
              {src.citation_number || i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-primary font-medium">{src.source}</p>
              {src.page && <p className="text-muted text-[10px]">Halaman {src.page}</p>}
              {src.excerpt && (
                <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-muted">“{src.excerpt}”</p>
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
    <div className="mt-4 border-t border-primary/60 pt-3">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Lanjutkan analisis</p>
      <div className="flex flex-wrap gap-2">
      {questions.map((q, i) => (
        <motion.button
          key={i}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect(q)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-accent/20 bg-accent/5 px-3 py-2 text-left text-[11px] font-medium text-accent transition-colors hover:bg-accent/10"
        >
          {q}
          <ArrowUpRight className="h-3 w-3 shrink-0 opacity-60" />
        </motion.button>
      ))}
      </div>
    </div>
  );
}

function UserHistoryImage({ image, onImageClick }) {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [image?.url]);

  if (image?.url && !failed) {
    return (
      <button
        type="button"
        onClick={() => onImageClick?.(image.url)}
        className="block rounded-xl overflow-hidden border border-primary max-w-xs ml-auto"
        aria-label={`Buka ${image.name || 'gambar dental'} ukuran penuh`}
      >
        <img
          src={image.url}
          alt={image.name || 'Gambar dental'}
          className="w-full"
          onError={() => setFailed(true)}
        />
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-accent/30 max-w-xs ml-auto bg-accent/10 px-3 py-2 flex items-center gap-2">
      <Camera className="w-4 h-4 text-accent/60" />
      <span className="text-xs text-accent/70 italic">
        {image?.artifactStatus === 'unavailable' || failed
          ? 'Gambar riwayat tidak tersedia di storage'
          : 'Gambar dental telah diunggah'}
      </span>
    </div>
  );
}

export default function ChatMessage({
  message,
  onImageClick,
  onSuggestedQuestion,
  onReviewFindings,
}) {
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
      workspace_error: {
        Icon: ServerCrash,
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/25',
        iconBg: 'bg-rose-500/15',
        iconColor: 'text-rose-500',
        titleColor: 'text-rose-700 dark:text-rose-300',
        descColor: 'text-rose-800/80 dark:text-rose-200/70',
        hintColor: 'text-rose-600/60 dark:text-rose-400/50',
        badge: 'Workspace Error',
        badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/20',
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
        className="flex gap-3 px-4 py-2"
      >
        <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${cfg.iconBg} ${cfg.border}`}>
          <Icon className={`w-4 h-4 ${cfg.iconColor}`} />
        </div>

        <div className={`flex-1 overflow-hidden rounded-2xl rounded-tl-md border ${cfg.bg} ${cfg.border}`}>
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
        <div className="max-w-[78%] space-y-2 sm:max-w-[70%]">
          {image && <UserHistoryImage image={image} onImageClick={onImageClick} />}
          {displayContent && (
            <div className="rounded-2xl rounded-tr-md bg-accent px-4 py-3 text-white shadow-sm">
              <p className="text-sm leading-relaxed">{displayContent}</p>
            </div>
          )}
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent shadow-sm">
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
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10">
        <Activity className="h-4 w-4 text-cyan-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="overflow-hidden rounded-2xl rounded-tl-md border border-primary bg-surface-elevated text-sm leading-relaxed text-primary shadow-sm theme-transition">
          <div className="flex items-center justify-between border-b border-primary/60 px-5 py-2.5">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Serene AI · Analisis Klinis</span>
            </div>
          </div>
          <div className="px-5 py-4">
          <SafeMarkdown text={content} />
          <SourcesCitations sources={sources} />
          <SuggestedQuestions questions={suggestedQuestions} onSelect={onSuggestedQuestion} />
          </div>
        </div>
        {visualFindings && (
          <VisualFindingsCard
            findings={visualFindings}
            review={message.review}
            caseWorkspace={message.caseWorkspace}
            onImageClick={onImageClick}
            onReview={(status) => onReviewFindings?.(message.id, status)}
          />
        )}
      </div>
    </motion.div>
  );
}
