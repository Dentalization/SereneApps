/**
 * ThinkingLoader — Theme-aware pulsing skeleton loader.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Bot, Loader2 } from 'lucide-react';

export default function ThinkingLoader() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex gap-3 px-4 py-2"
    >
      <div className="shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 max-w-md px-5 py-4 rounded-2xl rounded-tl-md bg-surface-elevated border border-primary shadow-sm theme-transition">
        <div className="flex items-center gap-3 mb-3">
          <Loader2 className="w-4 h-4 text-accent animate-spin" />
          <span className="text-xs font-medium text-accent">Analyzing...</span>
        </div>
        <div className="space-y-2.5">
          {[80, 60, 40].map((w, i) => (
            <div
              key={i}
              className="h-2.5 rounded-full overflow-hidden bg-surface"
              style={{ width: `${w}%` }}
            >
              <motion.div
                className="h-full rounded-full bg-accent/20"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear', delay: i * 0.2 }}
              />
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
