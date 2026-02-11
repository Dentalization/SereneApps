import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { authHttp } from '../../../../utils/httpClient';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';

import ModalPortal from '../../../../components/ui/ModalPortal';
import { cn } from '../../../../utils/cn';

const HighlightsManagement = () => {
  const { user } = useAuth();
  const [highlights, setHighlights] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingHighlight, setEditingHighlight] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState({
    highlightText: '',
    icon: '',
  });

  const userRole = user?.roles?.[0] || user?.role || 'staff';
  const canEdit = ['owner', 'clinic_owner', 'manager', 'admin', 'clinic_staff'].includes(userRole);

  useEffect(() => {
    if (canEdit) {
      fetchHighlights();
    }
  }, [canEdit]);

  const fetchHighlights = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Fetching highlights from /clinic/highlights...');
      const response = await authHttp.get('/clinic/highlights');
      console.log('✅ Highlights response:', response.data);
      setHighlights(response.data.highlights || []);
    } catch (error) {
      console.error('❌ Error fetching highlights:', error);
      console.error('Error response:', error.response?.data);
      showMessage('error', `Failed to load highlights: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleOpenDialog = (highlight = null) => {
    if (highlight) {
      setEditingHighlight(highlight);
      setFormData({
        highlightText: highlight.highlight_text,
        icon: highlight.icon || '',
      });
    } else {
      setEditingHighlight(null);
      setFormData({ highlightText: '', icon: '' });
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingHighlight(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingHighlight) {
        await authHttp.put(`/clinic/highlights/${editingHighlight.id}`, formData);
        showMessage('success', 'Highlight updated successfully');
      } else {
        await authHttp.post('/clinic/highlights', formData);
        showMessage('success', 'Highlight added successfully');
      }

      await fetchHighlights();
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving highlight:', error);
      showMessage('error', error.response?.data?.error || 'Failed to save highlight');
    }
  };

  const handleDelete = async (highlightId) => {
    if (!window.confirm('Are you sure you want to delete this highlight?')) return;

    try {
      await authHttp.delete(`/clinic/highlights/${highlightId}`);
      showMessage('success', 'Highlight deleted successfully');
      await fetchHighlights();
    } catch (error) {
      console.error('Error deleting highlight:', error);
      showMessage('error', 'Failed to delete highlight');
    }
  };

  if (!canEdit) {
    return (
      <div className="bg-warning/10 border border-warning/20 rounded-2xl p-6 text-warning flex items-center gap-3">
        <span className="text-2xl">🔒</span>
        <span className="font-medium">You don't have permission to manage highlights. Contact your clinic owner or manager.</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Message Alert */}
      {message.text && (
        <div className={cn(
          "rounded-2xl p-4 border flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-2",
          message.type === 'success' ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300" : "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300"
        )}>
          {message.text}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Clinic Highlights</h2>
          <p className="text-muted-foreground mt-1">Key features that make your clinic special</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="rounded-xl shadow-lg shadow-brand-primary/20 hover:shadow-brand-primary/40 transition-all">
          <span className="mr-2 text-lg">✨</span> Add Highlight
        </Button>
      </div>

      {/* Highlights Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-primary"></div>
          <p className="text-muted-foreground animate-pulse">Loading highlights...</p>
        </div>
      ) : highlights.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700/50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl">
            ⭐
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No Highlights Yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">Add key features like "24/7 Emergency", "Free Parking", or "Child Friendly" to attract patients.</p>
          <Button variant="outline" onClick={() => handleOpenDialog()} className="rounded-xl">
            Add First Highlight
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {highlights.map((highlight) => (
            <div key={highlight.id} className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 transition-all duration-300 hover:shadow-lg hover:border-brand-primary/20 hover:-translate-y-1 relative">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center flex-shrink-0 text-xl">
                  {/* Try to use icon from data, or fallback to Star */}
                  {highlight.icon === 'wifi' ? '📶' :
                    highlight.icon === 'parking' ? '🅿️' :
                      highlight.icon === 'card' ? '💳' :
                        highlight.icon === 'child' ? '🧸' :
                          highlight.icon === '24h' ? '🕒' :
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
                  }
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <h3 className="font-semibold text-foreground text-lg mb-1">{highlight.highlight_text}</h3>
                  <p className="text-xs text-muted-foreground">Feature active</p>
                </div>

                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleOpenDialog(highlight)}
                    className="p-1.5 text-gray-400 hover:text-brand-primary hover:bg-brand-primary/5 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                  </button>
                  <button
                    onClick={() => handleDelete(highlight.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      {showDialog && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-all duration-300 animate-in fade-in"
              onClick={handleCloseDialog}
            />
            <div
              className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20 dark:border-gray-700"
              onClick={(e) => e.stopPropagation()}
              style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
            >
              <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md flex justify-between items-center sticky top-0 z-10">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                    {editingHighlight ? 'Edit Highlight' : 'New Highlight'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {editingHighlight ? 'Update this feature details' : 'Add a key feature to your clinic profile'}
                  </p>
                </div>
                <button
                  onClick={handleCloseDialog}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar">
                <form id="highlightForm" onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <Input
                      label="Highlight Text"
                      value={formData.highlightText}
                      onChange={(e) => setFormData({ ...formData, highlightText: e.target.value })}
                      required
                      placeholder="e.g., 3D Digital Scanning Available"
                      className="text-lg font-medium"
                    />

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Icon (optional)</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.icon}
                          onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                          placeholder="e.g., scan, check, star"
                          className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Enter an icon name or emoji.</p>
                    </div>
                  </div>
                </form>
              </div>

              <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-sm flex justify-end gap-3 sticky bottom-0">
                <Button type="button" variant="outline" onClick={handleCloseDialog} className="rounded-xl hover:bg-white dark:hover:bg-gray-700 px-6">
                  Cancel
                </Button>
                <Button type="submit" form="highlightForm" className="rounded-xl shadow-lg shadow-brand-primary/20 px-8">
                  {editingHighlight ? 'Save Changes' : 'Create Highlight'}
                </Button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default HighlightsManagement;
