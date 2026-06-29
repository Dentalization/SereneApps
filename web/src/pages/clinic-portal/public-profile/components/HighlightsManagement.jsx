import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { authHttp } from '../../../../utils/httpClient';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';

import ModalPortal from '../../../../components/ui/ModalPortal';
import { cn } from '../../../../utils/cn';
import AppIcon from '../../../../components/AppIcon';
import { HIGHLIGHT_ICON_OPTIONS, resolveHighlightIcon } from '../profileIcons.mjs';

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
      const response = await authHttp.get('/clinic/highlights');
      setHighlights(response.data.highlights || []);
    } catch (error) {
      console.error('Error fetching highlights:', error);
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
        <AppIcon name="ShieldAlert" size={22} className="shrink-0" />
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
          <AppIcon name={message.type === 'success' ? 'CircleCheck' : 'CircleAlert'} size={18} className="shrink-0" />
          {message.text}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Clinic Highlights</h2>
          <p className="text-muted-foreground mt-1">Key features that make your clinic special</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="inline-flex items-center gap-2 rounded-xl shadow-sm transition-all">
          <AppIcon name="Plus" size={16} /> Add Highlight
        </Button>
      </div>

      {/* Highlights Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <AppIcon name="LoaderCircle" size={30} className="animate-spin text-brand-primary" />
          <p className="text-muted-foreground">Loading highlights...</p>
        </div>
      ) : highlights.length === 0 ? (
        <div className="rounded-2xl border border-primary/15 bg-surface-elevated p-12 text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl border border-primary/15 bg-surface text-secondary">
            <AppIcon name="BadgeCheck" size={25} />
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
            <div key={highlight.id} className="group relative rounded-2xl border border-primary/15 bg-surface-elevated p-5 transition-colors hover:border-accent/35">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent/5 text-accent">
                  <AppIcon name={resolveHighlightIcon(highlight.icon, highlight.highlight_text)} size={21} />
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <h3 className="font-semibold text-foreground text-lg mb-1">{highlight.highlight_text}</h3>
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Ditampilkan di profil</p>
                </div>

                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleOpenDialog(highlight)}
                    className="p-1.5 text-gray-400 hover:text-brand-primary hover:bg-brand-primary/5 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <AppIcon name="Pencil" size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(highlight.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <AppIcon name="Trash2" size={16} />
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
                  <AppIcon name="X" size={22} />
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
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Jenis ikon</label>
                      <div className="relative">
                        <select
                          value={formData.icon}
                          onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                        >
                          <option value="">Pilih otomatis dari teks</option>
                          {HIGHLIGHT_ICON_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Gunakan kategori visual yang konsisten; emoji bebas tidak ditampilkan.</p>
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
