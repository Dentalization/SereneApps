/**
 * ChatMessage — Theme-aware Insight Cards for AI, user, error, system messages.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Bot, User, AlertCircle, BookOpen } from 'lucide-react';
import VisualFindingsCard from './VisualFindingsCard';

const messageVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1 },
};

function renderMarkdown(text) {
  if (!text) return null;
  let html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^---$/gm, '<hr class="border-current opacity-10 my-3"/>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^\d+\.\s+(.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
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
    return (
      <motion.div variants={messageVariants} initial="hidden" animate="visible" transition={{ duration: 0.35 }} className="flex gap-3 px-4 py-3">
        <div className="shrink-0 w-8 h-8 rounded-xl bg-red-500/15 flex items-center justify-center border border-red-500/20">
          <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400" />
        </div>
        <div className="flex-1 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-600 dark:text-red-300">{content}</p>
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
    return (
      <motion.div variants={messageVariants} initial="hidden" animate="visible" transition={{ duration: 0.35 }} className="flex gap-3 px-4 py-2 justify-end">
        <div className="max-w-[70%] space-y-2">
          {image?.url && (
            <div className="rounded-xl overflow-hidden border border-primary max-w-xs ml-auto">
              <img src={image.url} alt={image.name} className="w-full" />
            </div>
          )}
          {content && (
            <div className="px-4 py-3 rounded-2xl rounded-tr-md bg-accent text-white shadow-lg">
              <p className="text-sm leading-relaxed">{content}</p>
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
