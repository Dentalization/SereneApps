import React, { useState, useEffect } from 'react';
import AppIcon from '../../../../components/AppIcon';
import ModalPortal from '../../../../components/ui/ModalPortal';
import { useToast } from '../../../../contexts/ToastContext';

const INITIAL_FORM = {
  branchName: '',
  address: '',
  city: '',
  province: '',
  district: '',
  postalCode: '',
  latitude: '',
  longitude: '',
  phone: '',
  email: '',
  operatingHours: '08:00 - 17:00',
  treatmentRooms: '',
  facilities: [],
  isMainBranch: false,
  status: 'active'
};

// Indonesian cities with GPS coordinates
const INDONESIAN_CITIES = [
  { name: 'Jakarta', province: 'DKI Jakarta', lat: -6.2088, lng: 106.8456 },
  { name: 'Surabaya', province: 'Jawa Timur', lat: -7.2575, lng: 112.7521 },
  { name: 'Bandung', province: 'Jawa Barat', lat: -6.9175, lng: 107.6191 },
  { name: 'Medan', province: 'Sumatera Utara', lat: 3.5952, lng: 98.6722 },
  { name: 'Semarang', province: 'Jawa Tengah', lat: -6.9667, lng: 110.4167 },
  { name: 'Makassar', province: 'Sulawesi Selatan', lat: -5.1477, lng: 119.4327 },
  { name: 'Palembang', province: 'Sumatera Selatan', lat: -2.9761, lng: 104.7754 },
  { name: 'Tangerang', province: 'Banten', lat: -6.1783, lng: 106.6319 },
  { name: 'Depok', province: 'Jawa Barat', lat: -6.4025, lng: 106.7942 },
  { name: 'Bekasi', province: 'Jawa Barat', lat: -6.2383, lng: 106.9756 },
  { name: 'Yogyakarta', province: 'DI Yogyakarta', lat: -7.7956, lng: 110.3695 },
  { name: 'Malang', province: 'Jawa Timur', lat: -7.9666, lng: 112.6326 },
  { name: 'Bogor', province: 'Jawa Barat', lat: -6.5950, lng: 106.8166 },
  { name: 'Batam', province: 'Kepulauan Riau', lat: 1.0456, lng: 104.0305 },
  { name: 'Denpasar', province: 'Bali', lat: -8.6705, lng: 115.2126 },
  { name: 'Balikpapan', province: 'Kalimantan Timur', lat: -1.2379, lng: 116.8529 },
  { name: 'Bandar Lampung', province: 'Lampung', lat: -5.3971, lng: 105.2668 },
  { name: 'Padang', province: 'Sumatera Barat', lat: -0.9471, lng: 100.4172 },
  { name: 'Manado', province: 'Sulawesi Utara', lat: 1.4748, lng: 124.8421 },
  { name: 'Pontianak', province: 'Kalimantan Barat', lat: -0.0263, lng: 109.3425 },
];

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
  const toast = useToast();
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

  const handleCityChange = (event) => {
    const cityName = event.target.value;
    const selectedCity = INDONESIAN_CITIES.find(c => c.name === cityName);
    
    if (selectedCity) {
      setForm(prev => ({
        ...prev,
        city: selectedCity.name,
        province: selectedCity.province,
        latitude: selectedCity.lat.toString(),
        longitude: selectedCity.lng.toString()
      }));
    } else {
      setForm(prev => ({ ...prev, city: cityName }));
    }
  };

  const validateGPSCoordinates = () => {
    // Allow empty coordinates
    if (!form.latitude && !form.longitude) {
      return { valid: true };
    }

    // Clean the input (remove spaces, handle comma as decimal separator)
    const cleanLat = form.latitude.toString().trim().replace(',', '.');
    const cleanLng = form.longitude.toString().trim().replace(',', '.');
    
    const lat = parseFloat(cleanLat);
    const lng = parseFloat(cleanLng);
    
    if (isNaN(lat) || isNaN(lng)) {
      return { valid: false, message: 'Please enter valid GPS coordinates (e.g., -6.200000, 106.816666)' };
    }
    
    if (lat < -90 || lat > 90) {
      return { valid: false, message: 'Latitude must be between -90 and 90' };
    }
    
    if (lng < -180 || lng > 180) {
      return { valid: false, message: 'Longitude must be between -180 and 180' };
    }
    
    return { valid: true };
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
    
    // Validate GPS if provided
    if (form.latitude || form.longitude) {
      const gpsValidation = validateGPSCoordinates();
      if (!gpsValidation.valid) {
        toast.error(gpsValidation.message);
        return;
      }
    }
    
    // Prepare form data with proper number conversion
    const submitData = {
      ...form,
      treatmentRooms: form.treatmentRooms === '' ? 1 : parseInt(form.treatmentRooms) || 1,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null
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
                    Street Address *
                  </label>
                  <textarea
                    id="address"
                    value={form.address}
                    onChange={handleChange('address')}
                    placeholder="Complete street address"
                    required
                    rows={2}
                    className="w-full rounded-lg border border-border/40 bg-surface px-3 py-2 text-sm text-primary placeholder-secondary/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none"
                  />
                </div>

                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-secondary mb-2">
                    City *
                  </label>
                  <select
                    id="city"
                    value={form.city}
                    onChange={handleCityChange}
                    required
                    className="w-full rounded-lg border border-border/40 bg-surface px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  >
                    <option value="">Select a city...</option>
                    {INDONESIAN_CITIES.map(city => (
                      <option key={city.name} value={city.name}>
                        {city.name}, {city.province}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-secondary/60 mt-1">Auto-fills province and GPS coordinates</p>
                </div>

                <div>
                  <label htmlFor="province" className="block text-sm font-medium text-secondary mb-2">
                    Province *
                  </label>
                  <input
                    id="province"
                    type="text"
                    value={form.province}
                    onChange={handleChange('province')}
                    placeholder="Auto-filled from city"
                    required
                    readOnly
                    className="w-full rounded-lg border border-border/40 bg-surface-elevated px-3 py-2 text-sm text-primary placeholder-secondary/60 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label htmlFor="district" className="block text-sm font-medium text-secondary mb-2">
                    District / Subdistrict
                  </label>
                  <input
                    id="district"
                    type="text"
                    value={form.district}
                    onChange={handleChange('district')}
                    placeholder="e.g., Menteng, Kebayoran Baru"
                    className="w-full rounded-lg border border-border/40 bg-surface px-3 py-2 text-sm text-primary placeholder-secondary/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>

                <div>
                  <label htmlFor="postalCode" className="block text-sm font-medium text-secondary mb-2">
                    Postal Code
                  </label>
                  <input
                    id="postalCode"
                    type="text"
                    value={form.postalCode}
                    onChange={handleChange('postalCode')}
                    placeholder="e.g., 12345"
                    maxLength={5}
                    className="w-full rounded-lg border border-border/40 bg-surface px-3 py-2 text-sm text-primary placeholder-secondary/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>
              </div>

              {/* GPS Coordinates */}
              <div className="space-y-3 rounded-xl border border-primary/15 bg-surface p-4">
                <div className="flex items-center gap-2 text-blue-700">
                  <AppIcon name="MapPin" size={16} />
                  <h4 className="text-sm font-medium">GPS Coordinates</h4>
                </div>
                <p className="text-xs text-blue-600">
                  Coordinates are auto-filled when you select a city. You can adjust them for precise location.
                </p>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="latitude" className="block text-xs font-medium text-blue-700 mb-1">
                      Latitude
                    </label>
                    <input
                      id="latitude"
                      type="text"
                      value={form.latitude}
                      onChange={handleChange('latitude')}
                      placeholder="-6.200000"
                      className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-primary placeholder-secondary/60 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 font-mono"
                    />
                    <p className="text-xs text-blue-600 mt-1">Range: -90 to 90</p>
                  </div>

                  <div>
                    <label htmlFor="longitude" className="block text-xs font-medium text-blue-700 mb-1">
                      Longitude
                    </label>
                    <input
                      id="longitude"
                      type="text"
                      value={form.longitude}
                      onChange={handleChange('longitude')}
                      placeholder="106.816666"
                      className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-primary placeholder-secondary/60 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 font-mono"
                    />
                    <p className="text-xs text-blue-600 mt-1">Range: -180 to 180</p>
                  </div>
                </div>
                
                <div className="text-xs text-blue-600 space-y-1">
                  <p className="font-medium">💡 How to get coordinates from Google Maps:</p>
                  <ol className="list-decimal list-inside space-y-0.5 ml-2">
                    <li>Right-click on location in Google Maps</li>
                    <li>Click the coordinates to copy them</li>
                    <li>Paste here (format: -6.200000, 106.816666)</li>
                  </ol>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
