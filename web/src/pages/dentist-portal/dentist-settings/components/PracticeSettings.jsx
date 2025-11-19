import React, { useState } from 'react';
import Icon from '../../../../components/AppIcon';

const PracticeSettings = ({ user, onDataChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [settings, setSettings] = useState({
    // Working Hours
    workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    workingHours: {
      monday: { start: '08:00', end: '17:00', isActive: true },
      tuesday: { start: '08:00', end: '17:00', isActive: true },
      wednesday: { start: '08:00', end: '17:00', isActive: true },
      thursday: { start: '08:00', end: '17:00', isActive: true },
      friday: { start: '08:00', end: '17:00', isActive: true },
      saturday: { start: '09:00', end: '15:00', isActive: false },
      sunday: { start: '09:00', end: '15:00', isActive: false }
    },
    
    // Appointment Settings
    appointmentDuration: 30, // minutes
    bufferTime: 15, // minutes between appointments
    maxAdvanceBooking: 60, // days
    allowOnlineBooking: true,
    requireConfirmation: true,
    sendReminders: true,
    reminderHours: 24,
    
    // Practice Info
    clinicName: user?.profile?.clinic_name || '',
    clinicAddress: user?.profile?.clinic_address || '',
    clinicPhone: user?.profile?.phone_number || '',
    specializations: user?.profile?.primary_specialization ? [user.profile.primary_specialization] : [],
    acceptsInsurance: true,
    acceptsBPJS: true, // Specific to Indonesia, can be generalized if needed
    emergencyAvailable: false,
    
    // Services
    services: [
      { name: 'General Consultation', price: 150000, duration: 30, active: true },
      { name: 'Scaling & Polishing', price: 200000, duration: 60, active: true },
      { name: 'Dental Filling', price: 300000, duration: 45, active: true },
      { name: 'Tooth Extraction', price: 250000, duration: 30, active: true },
      { name: 'Root Canal', price: 800000, duration: 90, active: false },
      { name: 'Crown & Bridge', price: 1500000, duration: 120, active: false }
    ]
  });

  const dayLabels = {
    monday: 'Monday',
    tuesday: 'Tuesday', 
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday'
  };

  const handleInputChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
    onDataChange?.(true);
  };

  const handleWorkingHoursChange = (day, field, value) => {
    setSettings(prev => ({
      ...prev,
      workingHours: {
        ...prev.workingHours,
        [day]: {
          ...prev.workingHours[day],
          [field]: value
        }
      }
    }));
    onDataChange?.(true);
  };

  const handleServiceChange = (index, field, value) => {
    setSettings(prev => ({
      ...prev,
      services: prev.services.map((service, i) => 
        i === index ? { ...service, [field]: value } : service
      )
    }));
    onDataChange?.(true);
  };

  const addService = () => {
    setSettings(prev => ({
      ...prev,
      services: [...prev.services, { name: '', price: 0, duration: 30, active: true }]
    }));
    onDataChange?.(true);
  };

  const removeService = (index) => {
    setSettings(prev => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index)
    }));
    onDataChange?.(true);
  };

  const handleSave = async () => {
    // Implement save logic here
    console.log('Saving practice settings:', settings);
    setIsEditing(false);
    onDataChange?.(false);
    alert('Practice settings saved successfully!');
  };

  const handleCancel = () => {
    setIsEditing(false);
    onDataChange?.(false);
    // Reset to original values if needed
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-primary mb-2 theme-transition">
              Practice Settings
            </h2>
            <p className="text-secondary theme-transition">
              Manage practice hours, appointments, and clinic settings
            </p>
          </div>
          <div className="flex space-x-3">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 border border-primary text-primary rounded-lg hover:bg-surface theme-transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 theme-transition"
                >
                  Save
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 theme-transition flex items-center space-x-2"
              >
                <Icon name="Edit" size={16} />
                <span>Edit</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Practice Information */}
        <div className="bg-surface-elevated rounded-2xl p-6 border border-primary theme-transition">
          <h3 className="text-lg font-semibold text-primary mb-4 flex items-center">
            <Icon name="Building2" size={20} className="mr-2" />
            Practice Information
          </h3>
          
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Clinic/Practice Name
              </label>
              <input
                type="text"
                value={settings.clinicName}
                onChange={(e) => handleInputChange('clinicName', e.target.value)}
                disabled={!isEditing}
                className="w-full px-4 py-3 rounded-lg border border-primary bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent theme-transition disabled:opacity-50"
                placeholder="Name of the clinic or practice"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={settings.clinicPhone}
                onChange={(e) => handleInputChange('clinicPhone', e.target.value)}
                disabled={!isEditing}
                className="w-full px-4 py-3 rounded-lg border border-primary bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent theme-transition disabled:opacity-50"
                placeholder="Clinic phone number"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-secondary mb-2">
                Practice Address
              </label>
              <textarea
                value={settings.clinicAddress}
                onChange={(e) => handleInputChange('clinicAddress', e.target.value)}
                disabled={!isEditing}
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-primary bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent theme-transition disabled:opacity-50"
                placeholder="Full clinic address"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-secondary">Accepts Insurance</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.acceptsInsurance}
                  onChange={(e) => handleInputChange('acceptsInsurance', e.target.checked)}
                  disabled={!isEditing}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-secondary">Accepts BPJS</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.acceptsBPJS}
                  onChange={(e) => handleInputChange('acceptsBPJS', e.target.checked)}
                  disabled={!isEditing}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Working Hours */}
        <div className="bg-surface-elevated rounded-2xl p-6 border border-primary theme-transition">
          <h3 className="text-lg font-semibold text-primary mb-4 flex items-center">
            <Icon name="Clock" size={20} className="mr-2" />
            Working Hours
          </h3>
          
          <div className="space-y-4">
            {Object.entries(settings.workingHours).map(([day, hours]) => (
              <div key={day} className="flex items-center space-x-4">
                <div className="w-24">
                  <span className="text-sm font-medium text-secondary">
                    {dayLabels[day]}
                  </span>
                </div>
                
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hours.isActive}
                    onChange={(e) => handleWorkingHoursChange(day, 'isActive', e.target.checked)}
                    disabled={!isEditing}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                </label>
                
                {hours.isActive && (
                  <>
                    <input
                      type="time"
                      value={hours.start}
                      onChange={(e) => handleWorkingHoursChange(day, 'start', e.target.value)}
                      disabled={!isEditing}
                      className="px-3 py-2 rounded-lg border border-primary bg-surface text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent theme-transition disabled:opacity-50"
                    />
                    <span className="text-secondary">-</span>
                    <input
                      type="time"
                      value={hours.end}
                      onChange={(e) => handleWorkingHoursChange(day, 'end', e.target.value)}
                      disabled={!isEditing}
                      className="px-3 py-2 rounded-lg border border-primary bg-surface text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent theme-transition disabled:opacity-50"
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Appointment Settings */}
        <div className="bg-surface-elevated rounded-2xl p-6 border border-primary theme-transition">
          <h3 className="text-lg font-semibold text-primary mb-4 flex items-center">
            <Icon name="Calendar" size={20} className="mr-2" />
            Appointment Settings
          </h3>
          
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Default Duration (minutes)
              </label>
              <input
                type="number"
                value={settings.appointmentDuration}
                onChange={(e) => handleInputChange('appointmentDuration', parseInt(e.target.value))}
                disabled={!isEditing}
                min="15"
                max="180"
                step="15"
                className="w-full px-4 py-3 rounded-lg border border-primary bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent theme-transition disabled:opacity-50"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Buffer Time (minutes)
              </label>
              <input
                type="number"
                value={settings.bufferTime}
                onChange={(e) => handleInputChange('bufferTime', parseInt(e.target.value))}
                disabled={!isEditing}
                min="0"
                max="60"
                step="5"
                className="w-full px-4 py-3 rounded-lg border border-primary bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent theme-transition disabled:opacity-50"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Max Advance Booking (days)
              </label>
              <input
                type="number"
                value={settings.maxAdvanceBooking}
                onChange={(e) => handleInputChange('maxAdvanceBooking', parseInt(e.target.value))}
                disabled={!isEditing}
                min="1"
                max="365"
                className="w-full px-4 py-3 rounded-lg border border-primary bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent theme-transition disabled:opacity-50"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Reminder (hours before)
              </label>
              <select
                value={settings.reminderHours}
                onChange={(e) => handleInputChange('reminderHours', parseInt(e.target.value))}
                disabled={!isEditing}
                className="w-full px-4 py-3 rounded-lg border border-primary bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent theme-transition disabled:opacity-50"
              >
                <option value={1}>1 hour</option>
                <option value={2}>2 hours</option>
                <option value={4}>4 hours</option>
                <option value={12}>12 hours</option>
                <option value={24}>24 hours</option>
                <option value={48}>48 hours</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-secondary">Online Booking</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.allowOnlineBooking}
                  onChange={(e) => handleInputChange('allowOnlineBooking', e.target.checked)}
                  disabled={!isEditing}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-secondary">Send Reminders</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.sendReminders}
                  onChange={(e) => handleInputChange('sendReminders', e.target.checked)}
                  disabled={!isEditing}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Services & Pricing */}
        <div className="bg-surface-elevated rounded-2xl p-6 border border-primary theme-transition">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-primary flex items-center">
              <Icon name="Stethoscope" size={20} className="mr-2" />
              Services & Pricing
            </h3>
            {isEditing && (
              <button
                onClick={addService}
                className="px-3 py-2 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors flex items-center space-x-2"
              >
                <Icon name="Plus" size={16} />
                <span>Add</span>
              </button>
            )}
          </div>
          
          <div className="space-y-4">
            {settings.services.map((service, index) => (
              <div key={index} className="flex items-center space-x-4 p-4 border border-primary rounded-lg">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={service.active}
                    onChange={(e) => handleServiceChange(index, 'active', e.target.checked)}
                    disabled={!isEditing}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                </label>
                
                <div className="flex-1">
                  <input
                    type="text"
                    value={service.name}
                    onChange={(e) => handleServiceChange(index, 'name', e.target.value)}
                    disabled={!isEditing}
                    placeholder="Service name"
                    className="w-full px-3 py-2 rounded-lg border border-primary bg-surface text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent theme-transition disabled:opacity-50"
                  />
                </div>
                
                <div className="w-32">
                  <input
                    type="number"
                    value={service.price}
                    onChange={(e) => handleServiceChange(index, 'price', parseInt(e.target.value))}
                    disabled={!isEditing}
                    placeholder="Price"
                    className="w-full px-3 py-2 rounded-lg border border-primary bg-surface text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent theme-transition disabled:opacity-50"
                  />
                </div>
                
                <div className="w-20">
                  <input
                    type="number"
                    value={service.duration}
                    onChange={(e) => handleServiceChange(index, 'duration', parseInt(e.target.value))}
                    disabled={!isEditing}
                    placeholder="Minutes"
                    min="15"
                    step="15"
                    className="w-full px-3 py-2 rounded-lg border border-primary bg-surface text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent theme-transition disabled:opacity-50"
                  />
                </div>
                
                {isEditing && (
                  <button
                    onClick={() => removeService(index)}
                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Icon name="Trash2" size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PracticeSettings;
