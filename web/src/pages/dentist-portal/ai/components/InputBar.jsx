import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, X, Sparkles, UploadCloud } from 'lucide-react';

export default function InputBar({ onSend, isLoading }) {
  const [text, setText] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [text]);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if ((!text.trim() && !imageFile) || isLoading) return;
    onSend(text.trim(), imageFile);
    setText('');
    setImageFile(null);
    setImagePreview(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    // ANCHOR FIX: 
    // 1. absolute bottom-0: Nempel di bawah parent (AIAnalysisPage container)
    // 2. z-30: Layer di atas chat bubble
    // 3. pointer-events-none: Supaya area kosong di kiri/kanan input bar bisa di-klik tembus ke chat
    <div className="absolute bottom-0 left-0 right-0 z-30 px-8 pb-6 pt-10 flex justify-center pointer-events-none">
      
      {/* Gradient Fade: Supaya teks yang discroll ke bawah input bar terlihat memudar (estetik) */}
      <div className="absolute inset-0 bg-gradient-to-t from-white via-white/90 to-transparent dark:from-slate-950 dark:via-slate-950/90 -z-10 h-full" />

      <motion.div
        layout
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-5xl pointer-events-auto relative group"
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        
        {/* Floating Image Preview */}
        <AnimatePresence>
          {imagePreview && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute -top-24 left-4 z-0"
            >
              <div className="relative group/preview">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="h-20 w-20 rounded-2xl object-cover shadow-xl ring-2 ring-white dark:ring-slate-800" 
                />
                <button
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1.5 shadow-md hover:scale-110 transition-transform"
                >
                  <X size={12} strokeWidth={3} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CAPSULE INPUT */}
        <div className={`
          relative flex items-end gap-2 p-2
          bg-white/80 dark:bg-slate-900/80 
          backdrop-blur-2xl
          ring-1 ring-black/5 dark:ring-white/10
          shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]
          rounded-[32px]
          transition-all duration-300
          hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]
          focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:shadow-[0_0_20px_rgb(99,102,241,0.15)]
        `}>
          
          <AnimatePresence>
            {isDragOver && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 rounded-[32px] bg-indigo-500/95 backdrop-blur-sm flex items-center justify-center text-white font-semibold"
              >
                <UploadCloud className="w-8 h-8 mr-3 animate-bounce" />
                Drop to analyze
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="button"
            whileHover={{ scale: 1.1, backgroundColor: "rgba(0,0,0,0.05)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => fileRef.current?.click()}
            className="p-3 mb-0.5 rounded-full text-slate-400 hover:text-indigo-600 transition-colors"
          >
            <Paperclip className="w-5 h-5" />
          </motion.button>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about diagnosis or upload a scan..."
            className="flex-1 max-h-32 bg-transparent py-3.5 text-[15px] text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 resize-none border-none outline-none ring-0 focus:ring-0 leading-relaxed"
            style={{ scrollbarWidth: 'none' }}
            rows={1}
          />

          <motion.button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || (!text.trim() && !imageFile)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
              p-3 rounded-full mb-0.5 flex items-center justify-center transition-all duration-300 shadow-sm
              ${(text.trim() || imageFile) 
                ? 'bg-indigo-600 text-white shadow-indigo-500/30' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'}
            `}
          >
            {isLoading ? (
              <Sparkles className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5 ml-0.5" strokeWidth={2.5} />
            )}
          </motion.button>
        </div>

        <p className="text-center text-[10px] text-slate-400/70 font-medium mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-500 select-none">
          Serene AI can make mistakes. Verify clinical findings.
        </p>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
        />
      </motion.div>
    </div>
  );
}