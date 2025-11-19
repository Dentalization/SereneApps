import React, { useState, useEffect } from 'react';
import AppIcon from '../../../../components/AppIcon';
import ModalPortal from '../../../../components/ui/ModalPortal';

const INITIAL_FORM = {
  branchName: '',
  address: '',
  phone: '',
  email: '',
  operatingHours: '08:00 - 17:00',
  treatmentRooms: '',
  facilities: [],
  isMainBranch: false,
  status: 'active'
};

const AVAILABLE_FACILITIES = [
  'X-Ray Machine',
  'Panoramic X-Ray',
  'Dental Chair',
  'Autoclave Sterilizer',
  'Ultrasonic Cleaner',
  'Intraoral Camera',
  'Digital Scanner',
  'Waiting Room',
  'Parking Area',
  'Wi-Fi',
  'Air Conditioning',
  'Emergency Equipment'
];

const BranchAddModal = ({ open, onClose, onSubmit, loading, error }) => {
  const [form, setForm] = useState(INITIAL_FORM);
  const [facilityInput, setFacilityInput] = useState('');

  useEffect(() => {
    if (open) {
      setForm(INITIAL_FORM);
      setFacilityInput('');
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const handleChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' 
      ? event.target.checked 
      : event.target.type === 'number'
      ? event.target.value === '' ? '' : parseInt(event.target.value) || ''
      : event.target.value;
    
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleFacilityAdd = (facility) => {
    if (facility && !form.facilities.includes(facility)) {
      setForm(prev => ({
        ...prev,
        facilities: [...prev.facilities, facility]
      }));
    }
    setFacilityInput('');
  };

  const handleFacilityRemove = (facility) => {
    setForm(prev => ({
      ...prev,
      facilities: prev.facilities.filter(f => f !== facility)
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (loading) return;
    
    // Prepare form data with proper number conversion
    const submitData = {
      ...form,
      treatmentRooms: form.treatmentRooms === '' ? 1 : parseInt(form.treatmentRooms) || 1
    };
    
    onSubmit(submitData);
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="relative w-full max-w-2xl max-h-[85vh] bg-surface-elevated rounded-2xl shadow-2xl overflow-y-auto">
          <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border/40">
            <div>
              <h2 className="text-xl font-semibold text-primary">Add New Branch</h2>
              <p className="text-sm text-secondary mt-1">Create a new clinic branch location</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-secondary hover:text-primary hover:bg-surface transition-colors"
            >
              <AppIcon name="X" size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AppIcon name="AlertCircle" size={18} />
                <span>{error}</span>
              </div>
            )}

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-primary">Basic Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="branchName" className="block text-sm font-medium text-secondary mb-2">
                    Branch Name *
                  </label>
                  <input
                    id="branchName"
                    type="text"
                    value={form.branchName}
                    onChange={handleChange('branchName')}
                    placeholder="e.g., Main Branch, Downtown Clinic"
                    required
                    className="w-full rounded-lg border border-border/40 bg-surface px-3 py-2 text-sm text-primary placeholder-secondary/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="address" className="block text-sm font-medium text-secondary mb-2">
                    Address *
                  </label>
                  <textarea
                    id="address"
                    value={form.address}
                    onChange={handleChange('address')}
                    placeholder="Complete branch address"
                    required
                    rows={3}
                    className="w-full rounded-lg border border-border/40 bg-surface px-3 py-2 text-sm text-primary placeholder-secondary/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-secondary mb-2">
                    Phone Number *
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange('phone')}
                    placeholder="e.g., +62 21 1234567"
                    required
                    className="w-full rounded-lg border border-border/40 bg-surface px-3 py-2 text-sm text-primary placeholder-secondary/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-secondary mb-2">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange('email')}
                    placeholder="branch@clinic.com"
                    className="w-full rounded-lg border border-border/40 bg-surface px-3 py-2 text-sm text-primary placeholder-secondary/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="operatingHours" className="block text-sm font-medium text-secondary mb-2">
                    Operating Hours
                  </label>
                  <input
                    id="operatingHours"
                    type="text"
                    value={form.operatingHours}
                    onChange={handleChange('operatingHours')}
                    placeholder="e.g., 08:00 - 17:00"
                    className="w-full rounded-lg border border-border/40 bg-surface px-3 py-2 text-sm text-primary placeholder-secondary/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>

                <div>
                  <label htmlFor="treatmentRooms" className="block text-sm font-medium text-secondary mb-2">
                    Treatment Rooms
                  </label>
                  <input
                    id="treatmentRooms"
                    type="number"
                    min="1"
                    max="20"
                    placeholder="Enter number of treatment rooms"
                    value={form.treatmentRooms}
                    onChange={handleChange('treatmentRooms')}
                    className="w-full rounded-lg border border-border/40 bg-surface px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>
              </div>
            </div>

            {/* Facilities */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-primary">Facilities & Equipment</h3>
              
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Add Facilities
                </label>
                <div className="flex gap-2">
                  <select
                    value={facilityInput}
                    onChange={(e) => setFacilityInput(e.target.value)}
                    className="flex-1 rounded-lg border border-border/40 bg-surface px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  >
                    <option value="">Select a facility...</option>
                    {AVAILABLE_FACILITIES.filter(f => !form.facilities.includes(f)).map(facility => (
                      <option key={facility} value={facility}>{facility}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleFacilityAdd(facilityInput)}
                    disabled={!facilityInput}
                    className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              {form.facilities.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Selected Facilities ({form.facilities.length})
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {form.facilities.map(facility => (
                      <span
                        key={facility}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm"
                      >
                        {facility}
                        <button
                          type="button"
                          onClick={() => handleFacilityRemove(facility)}
                          className="hover:bg-accent/20 rounded-full p-0.5 transition-colors"
                        >
                          <AppIcon name="X" size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-primary">Settings</h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    id="isMainBranch"
                    type="checkbox"
                    checked={form.isMainBranch}
                    onChange={handleChange('isMainBranch')}
                    className="w-4 h-4 text-accent border-border/40 rounded focus:ring-accent focus:ring-2"
                  />
                  <label htmlFor="isMainBranch" className="text-sm text-primary">
                    Set as main branch
                  </label>
                </div>

                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-secondary mb-2">
                    Status
                  </label>
                  <select
                    id="status"
                    value={form.status}
                    onChange={handleChange('status')}
                    className="w-full rounded-lg border border-border/40 bg-surface px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="maintenance">Under Maintenance</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-border/40 bg-surface">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-secondary border border-border/40 rounded-lg hover:bg-surface-elevated disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !form.branchName || !form.address || !form.phone}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading && <AppIcon name="Loader2" size={16} className="animate-spin" />}
              {loading ? 'Creating...' : 'Create Branch'}
            </button>
          </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default BranchAddModal;
