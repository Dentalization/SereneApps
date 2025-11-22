import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { authHttp } from '../../../../utils/httpClient';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import { cn } from '../../../../utils/cn';

const FacilitiesManagement = () => {
  const { user } = useAuth();
  const [facilities, setFacilities] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingFacility, setEditingFacility] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState({
    facilityName: '',
    description: '',
    icon: '',
  });

  const userRole = user?.roles?.[0] || user?.role || 'staff';
  const canEdit = ['owner', 'clinic_owner', 'manager', 'admin', 'clinic_staff'].includes(userRole);

  useEffect(() => {
    if (canEdit) {
      fetchFacilities();
    }
  }, [canEdit]);

  const fetchFacilities = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Fetching facilities from /clinic/facilities...');
      const response = await authHttp.get('/clinic/facilities');
      console.log('✅ Facilities response:', response.data);
      setFacilities(response.data.facilities || []);
    } catch (error) {
      console.error('❌ Error fetching facilities:', error);
      console.error('Error response:', error.response?.data);
      showMessage('error', `Failed to load facilities: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleOpenDialog = (facility = null) => {
    if (facility) {
      setEditingFacility(facility);
      setFormData({
        facilityName: facility.facility_name,
        description: facility.description || '',
        icon: facility.icon || '',
      });
    } else {
      setEditingFacility(null);
      setFormData({ facilityName: '', description: '', icon: '' });
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingFacility(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingFacility) {
        await authHttp.put(`/clinic/facilities/${editingFacility.id}`, formData);
        showMessage('success', 'Facility updated successfully');
      } else {
        await authHttp.post('/clinic/facilities', formData);
        showMessage('success', 'Facility added successfully');
      }

      await fetchFacilities();
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving facility:', error);
      showMessage('error', error.response?.data?.error || 'Failed to save facility');
    }
  };

  const handleDelete = async (facilityId) => {
    if (!window.confirm('Are you sure you want to delete this facility?')) return;

    try {
      await authHttp.delete(`/clinic/facilities/${facilityId}`);
      showMessage('success', 'Facility deleted successfully');
      await fetchFacilities();
    } catch (error) {
      console.error('Error deleting facility:', error);
      showMessage('error', 'Failed to delete facility');
    }
  };

  if (!canEdit) {
    return (
      <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 text-warning">
        You don't have permission to manage facilities. Contact your clinic owner or manager.
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
        <h2 className="text-2xl font-bold text-foreground">Facilities</h2>
        <Button onClick={() => handleOpenDialog()}>
          + Add Facility
        </Button>
      </div>

      {/* Facilities List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
        </div>
      ) : facilities.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
          <p className="text-muted-foreground mb-4">No facilities added yet</p>
          <Button variant="outline" onClick={() => handleOpenDialog()}>
            Add First Facility
          </Button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow divide-y divide-gray-200 dark:divide-gray-700">
          {facilities.map((facility) => (
            <div key={facility.id} className="p-4 flex items-start justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <div className="flex items-start gap-3 flex-1">
                <svg className="w-5 h-5 text-brand-primary mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <div>
                  <h3 className="font-semibold text-foreground">{facility.facility_name}</h3>
                  {facility.description && (
                    <p className="text-sm text-muted-foreground mt-1">{facility.description}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(facility)}>
                  Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(facility.id)} className="text-error hover:text-error">
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
                  {editingFacility ? 'Edit Facility' : 'Add Facility'}
                </h3>
              </div>

              <div className="p-6 space-y-4">
                <Input
                  label="Facility Name"
                  value={formData.facilityName}
                  onChange={(e) => setFormData({ ...formData, facilityName: e.target.value })}
                  required
                  placeholder="e.g., Smart Treatment Rooms, VIP Lounge"
                />

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Description (optional)</label>
                  <textarea
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    placeholder="Describe the facility..."
                  />
                </div>

                <Input
                  label="Icon (optional)"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="e.g., smart-room, lounge"
                />
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingFacility ? 'Update' : 'Add'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacilitiesManagement;
