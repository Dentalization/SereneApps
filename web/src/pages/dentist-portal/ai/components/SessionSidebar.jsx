import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Plus, Trash2, X, Activity, Calendar } from 'lucide-react';

// --- Helper: Group Sessions by Date ---
const groupSessionsByDate = (sessions) => {
  const groups = {
    'Today': [],
    'Yesterday': [],
    'Previous 7 Days': [],
    'Older': []
  };

  sessions.forEach(session => {
    const d = new Date(session.created_at || session.updated_at);
    const now = new Date();
    const diffTime = Math.abs(now - d);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) groups['Today'].push(session);
    else if (diffDays <= 2) groups['Yesterday'].push(session);
    else if (diffDays <= 7) groups['Previous 7 Days'].push(session);
    else groups['Older'].push(session);
  });

  return groups;
};

export default function SessionSidebar({ 
  isOpen, 
  onClose, 
  sessions, 
  currentSessionId, 
  onSelect, 
  onDelete, 
  onNewSession 
}) {
  
  const groupedSessions = useMemo(() => groupSessionsByDate(sessions), [sessions]);

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[45] bg-black/40 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container - Floating Panel Style */}
      <motion.aside
        initial={false}
        animate={{ x: isOpen ? 0 : -350 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed left-0 top-0 h-screen z-50 w-80 p-4"
      >
        <div className="h-full flex flex-col rounded-3xl bg-surface-elevated border border-primary shadow-theme-lg theme-transition overflow-hidden">
          
          {/* Header */}
          <div className="border-b border-primary px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-surface border border-primary/20">
                   {/* Logo Placeholder - using Icon to match style */}
                   <Activity className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-primary">History</h1>
                  <p className="text-xs text-secondary">Past Analyses</p>
                </div>
              </div>
              
              {/* Close Button (X) */}
              <button 
                onClick={onClose} 
                className="p-2 rounded-lg text-muted hover:bg-accent hover:bg-opacity-15 transition-colors"
                title="Close Sidebar"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* New Analysis Button */}
          <div className="px-4 py-4">
            <button
              onClick={onNewSession}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-accent text-white shadow-lg shadow-accent/20 hover:bg-accent-hover transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus size={18} strokeWidth={2.5} />
              <span className="font-medium text-sm">New Analysis</span>
            </button>
          </div>

          {/* Search / Filter (Optional placeholder to match visual weight) */}
          {/* <div className="px-4 pb-2"> ...search input code... </div> */}

          {/* Navigation / List */}
          <div className="flex-1 overflow-y-auto px-3 pb-4 custom-scrollbar">
            {Object.entries(groupedSessions).map(([groupName, groupItems]) => (
              groupItems.length > 0 && (
                <div key={groupName} className="mb-4">
                  {/* Section Label */}
                  <div className="px-3 pt-4 pb-2 text-[10px] uppercase tracking-[0.3em] text-muted font-semibold">
                    {groupName}
                  </div>
                  
                  <div className="space-y-1">
                    {groupItems.map((session) => {
                      const isActive = session.id === currentSessionId;
                      return (
                        <div key={session.id} className="relative group">
                          <button
                            onClick={() => onSelect(session.id)}
                            className={`w-full flex items-center rounded-lg px-3 py-2.5 space-x-3 transition-all duration-200 ${
                              isActive 
                                ? 'bg-accent/10 text-accent border border-accent/20' 
                                : 'text-muted hover:bg-accent hover:bg-opacity-15 hover:text-primary border border-transparent'
                            }`}
                          >
                            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                              <MessageSquare size={18} className={isActive ? "text-accent" : "text-muted opacity-70 group-hover:text-primary group-hover:opacity-100"} />
                            </div>
                            
                            <div className="flex-1 text-left min-w-0">
                              <div className={`font-medium text-sm truncate ${isActive ? 'text-accent' : 'text-primary'}`}>
                                {session.metadata?.title || 'Untitled Session'}
                              </div>
                              <div className="text-[10px] opacity-60 truncate">
                                {new Date(session.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </div>
                            </div>

                            {/* Delete Action (Visible on Hover) */}
                            <div 
                              role="button"
                              onClick={(e) => { e.stopPropagation(); onDelete(session.id); }}
                              className={`
                                p-1.5 rounded-md hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/30 transition-colors
                                ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                              `}
                            >
                              <Trash2 size={14} />
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            ))}

            {/* Empty State */}
            {sessions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-surface border border-primary/20 flex items-center justify-center mb-3">
                  <Calendar className="w-6 h-6 text-muted" />
                </div>
                <p className="text-sm font-medium text-primary">No history</p>
                <p className="text-xs text-secondary mt-1 max-w-[150px]">Start a new analysis to see your sessions here.</p>
              </div>
            )}
          </div>

          {/* Footer - Optional branding or stats */}
          <div className="border-t border-primary p-3 bg-surface/50">
             <div className="flex items-center justify-center gap-2 text-[10px] text-muted uppercase tracking-wider">
                <Activity size={12} />
                <span>Secure Storage</span>
             </div>
          </div>

        </div>
      </motion.aside>
    </>
  );
}