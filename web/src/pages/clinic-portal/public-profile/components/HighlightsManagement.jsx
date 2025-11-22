import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { authHttp } from '../../../../utils/httpClient';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
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
      <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 text-warning">
        You don't have permission to manage highlights. Contact your clinic owner or manager.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Message Alert */}
      {message.text && (
        <div className={cn(
          "rounded-lg p-4 border",
          message.type === 'success' ? "bg-success/10 border-success/20 text-success" : "bg-error/10 border-error/20 text-error"
        )}>
          {message.text}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">Highlights</h2>
        <Button onClick={() => handleOpenDialog()}>
          + Add Highlight
        </Button>
      </div>

      {/* Highlights List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
        </div>
      ) : highlights.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
          <p className="text-muted-foreground mb-4">No highlights added yet</p>
          <Button variant="outline" onClick={() => handleOpenDialog()}>
            Add First Highlight
          </Button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow divide-y divide-gray-200 dark:divide-gray-700">
          {highlights.map((highlight) => (
            <div key={highlight.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <div className="flex items-center gap-3 flex-1">
                <svg className="w-5 h-5 text-warning" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-foreground">{highlight.highlight_text}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(highlight)}>
                  Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(highlight.id)} className="text-error hover:text-error">
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <form onSubmit={handleSubmit}>
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-semibold text-foreground">
                  {editingHighlight ? 'Edit Highlight' : 'Add Highlight'}
                </h3>
              </div>

              <div className="p-6 space-y-4">
                <Input
                  label="Highlight Text"
                  value={formData.highlightText}
                  onChange={(e) => setFormData({ ...formData, highlightText: e.target.value })}
                  required
                  placeholder="e.g., 3D Digital Scanning Available"
                />

                <Input
                  label="Icon (optional)"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="e.g., scan, check, star"
                />
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingHighlight ? 'Update' : 'Add'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HighlightsManagement;
