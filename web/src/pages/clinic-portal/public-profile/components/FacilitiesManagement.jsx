import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { authHttp } from '../../../../utils/httpClient';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';

import ModalPortal from '../../../../components/ui/ModalPortal';
import { cn } from '../../../../utils/cn';
import AppIcon from '../../../../components/AppIcon';
import { FACILITY_ICON_OPTIONS, resolveFacilityIcon } from '../profileIcons.mjs';

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
      const response = await authHttp.get('/clinic/facilities');
      setFacilities(response.data.facilities || []);
    } catch (error) {
      console.error('Error fetching facilities:', error);
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
      <div className="bg-warning/10 border border-warning/20 rounded-2xl p-6 text-warning flex items-center gap-3">
        <AppIcon name="ShieldAlert" size={22} className="shrink-0" />
        <span className="font-medium">You don't have permission to manage facilities. Contact your clinic owner or manager.</span>
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
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Facilities</h2>
          <p className="text-muted-foreground mt-1">Amenities and equipment available at your clinic</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="inline-flex items-center gap-2 rounded-xl shadow-sm transition-all">
          <AppIcon name="Plus" size={16} /> Add Facility
        </Button>
      </div>

      {/* Facilities Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <AppIcon name="LoaderCircle" size={30} className="animate-spin text-brand-primary" />
          <p className="text-muted-foreground">Loading facilities...</p>
        </div>
      ) : facilities.length === 0 ? (
        <div className="rounded-2xl border border-primary/15 bg-surface-elevated p-12 text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl border border-primary/15 bg-surface text-secondary">
            <AppIcon name="Hospital" size={25} />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No Facilities Listed</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">List your key facilities like "Waiting Room", "X-Ray Room", or "Dental Chairs" to inform patients.</p>
          <Button variant="outline" onClick={() => handleOpenDialog()} className="rounded-xl">
            Add First Facility
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {facilities.map((facility) => (
            <div key={facility.id} className="group relative rounded-2xl border border-primary/15 bg-surface-elevated p-5 transition-colors hover:border-accent/35">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent/5 text-accent">
                  <AppIcon name={resolveFacilityIcon(facility.icon, facility.facility_name)} size={21} />
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <h3 className="font-semibold text-foreground text-lg mb-1">{facility.facility_name}</h3>
                  {facility.description ? (
                    <p className="text-sm text-muted-foreground line-clamp-2">{facility.description}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No description</p>
                  )}
                </div>

                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleOpenDialog(facility)}
                    className="p-1.5 text-gray-400 hover:text-brand-primary hover:bg-brand-primary/5 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <AppIcon name="Pencil" size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(facility.id)}
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
                    {editingFacility ? 'Edit Facility' : 'New Facility'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {editingFacility ? 'Update facility details' : 'Add an amenity or equipment'}
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
                <form id="facilityForm" onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <Input
                      label="Facility Name"
                      value={formData.facilityName}
                      onChange={(e) => setFormData({ ...formData, facilityName: e.target.value })}
                      required
                      placeholder="e.g., Smart Treatment Rooms, VIP Lounge"
                      className="text-lg font-medium"
                    />

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description (optional)</label>
                      <textarea
                        className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/50 transition-all resize-none"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        placeholder="Describe the facility..."
                      />
                    </div>

                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Jenis fasilitas
                    </label>
                    <select
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 dark:border-gray-700 dark:bg-gray-800/50 dark:text-white"
                    >
                      <option value="">Pilih otomatis dari nama</option>
                      {FACILITY_ICON_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </form>
              </div>

              <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-sm flex justify-end gap-3 sticky bottom-0">
                <Button type="button" variant="outline" onClick={handleCloseDialog} className="rounded-xl hover:bg-white dark:hover:bg-gray-700 px-6">
                  Cancel
                </Button>
                <Button type="submit" form="facilityForm" className="rounded-xl shadow-lg shadow-brand-primary/20 px-8">
                  {editingFacility ? 'Save Changes' : 'Create Facility'}
                </Button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default FacilitiesManagement;
