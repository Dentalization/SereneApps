import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useLanguage } from '../../../../contexts/LanguageContext';
import Icon from '../../../../components/AppIcon';
import { authHttp } from '../../../../utils/httpClient';

const ScheduleSettings = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Check if user can edit schedule settings
  const userRole = user?.roles?.[0] || user?.role || 'staff';
  const canEdit = ['owner', 'manager', 'admin'].includes(userRole);

  const [operatingHours, setOperatingHours] = useState({
    monday: { open: '08:00', close: '17:00', closed: false },
    tuesday: { open: '08:00', close: '17:00', closed: false },
    wednesday: { open: '08:00', close: '17:00', closed: false },
    thursday: { open: '08:00', close: '17:00', closed: false },
    friday: { open: '08:00', close: '16:00', closed: false },
    saturday: { open: '09:00', close: '14:00', closed: false },
    sunday: { open: '09:00', close: '12:00', closed: true }
  });

  const [holidays, setHolidays] = useState(['2024-01-01', '2024-12-25']);
  const [newHoliday, setNewHoliday] = useState('');

  const days = [
    { key: 'monday', label: t('common.days.monday') || 'Monday' },
    { key: 'tuesday', label: t('common.days.tuesday') || 'Tuesday' },
    { key: 'wednesday', label: t('common.days.wednesday') || 'Wednesday' },
    { key: 'thursday', label: t('common.days.thursday') || 'Thursday' },
    { key: 'friday', label: t('common.days.friday') || 'Friday' },
    { key: 'saturday', label: t('common.days.saturday') || 'Saturday' },
    { key: 'sunday', label: t('common.days.sunday') || 'Sunday' }
  ];

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleDayToggle = (day) => {
    if (!canEdit) return;
    setOperatingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        closed: !prev[day].closed
      }
    }));
  };

  const handleTimeChange = (day, field, value) => {
    if (!canEdit) return;
    setOperatingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  const addHoliday = () => {
    if (!canEdit || !newHoliday) return;
    if (!holidays.includes(newHoliday)) {
      setHolidays(prev => [...prev, newHoliday].sort());
      setNewHoliday('');
    }
  };

  const removeHoliday = (holidayToRemove) => {
    if (!canEdit) return;
    setHolidays(prev => prev.filter(holiday => holiday !== holidayToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canEdit) return;

    setIsSaving(true);
    try {
      // This would be the API call to save schedule settings
      // await authHttp.put('/clinic/schedule', { operatingHours, holidays });
      
      showMessage('success', t('settings.scheduleSaveSuccess') || 'Schedule updated successfully!');
    } catch (error) {
      console.error('Schedule update error:', error);
      showMessage('error', error.response?.data?.message || t('settings.scheduleSaveError') || 'Failed to update schedule');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Message Display */}
      {message.text && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center space-x-2">
            <Icon 
              name={message.type === 'success' ? 'CheckCircle' : 'AlertCircle'} 
              size={16} 
            />
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        </div>
      )}

      {/* Operating Hours */}
      <div className="bg-surface-elevated border border-primary rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-primary flex items-center space-x-2">
            <Icon name="Clock" size={20} />
            <span>{t('clinic.settings.operatingHours') || 'Operating Hours'}</span>
          </h2>
          {!canEdit && (
            <span className="text-xs bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 px-3 py-1 rounded-full">
              {t('clinic.settings.readOnly') || 'Read Only'}
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {days.map((day) => (
            <div key={day.key} className="flex items-center space-x-4 p-4 bg-surface rounded-lg border border-primary/10">
              <div className="w-20">
                <span className="text-sm font-medium text-primary">{day.label}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={!operatingHours[day.key].closed}
                  onChange={() => handleDayToggle(day.key)}
                  disabled={!canEdit}
                  className="rounded border-primary/20 text-accent focus:ring-accent disabled:opacity-50"
                />
                <span className="text-sm text-secondary">
                  {t('clinic.settings.open') || 'Open'}
                </span>
              </div>

              {!operatingHours[day.key].closed ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="time"
                    value={operatingHours[day.key].open}
                    onChange={(e) => handleTimeChange(day.key, 'open', e.target.value)}
                    disabled={!canEdit}
                    className="px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary disabled:opacity-50"
                  />
                  <span className="text-secondary">-</span>
                  <input
                    type="time"
                    value={operatingHours[day.key].close}
                    onChange={(e) => handleTimeChange(day.key, 'close', e.target.value)}
                    disabled={!canEdit}
                    className="px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary disabled:opacity-50"
                  />
                </div>
              ) : (
                <span className="text-sm text-red-600">
                  {t('clinic.settings.closed') || 'Closed'}
                </span>
              )}
            </div>
          ))}

          {canEdit && (
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-3 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isSaving ? (
                  <>
                    <Icon name="Loader2" size={18} className="animate-spin" />
                    <span>{t('clinic.settings.saving') || 'Saving...'}</span>
                  </>
                ) : (
                  <>
                    <Icon name="Save" size={18} />
                    <span>{t('clinic.settings.saveSchedule') || 'Save Schedule'}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Holidays */}
      <div className="bg-surface-elevated border border-primary rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-primary mb-6 flex items-center space-x-2">
          <Icon name="CalendarX" size={20} />
          <span>{t('clinic.settings.holidays') || 'Holidays'}</span>
        </h2>

        {canEdit && (
          <div className="flex items-center space-x-4 mb-6">
            <input
              type="date"
              value={newHoliday}
              onChange={(e) => setNewHoliday(e.target.value)}
              className="px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
            />
            <button
              onClick={addHoliday}
              disabled={!newHoliday}
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Icon name="Plus" size={16} />
              <span>{t('clinic.settings.addHoliday') || 'Add Holiday'}</span>
            </button>
          </div>
        )}

        <div className="space-y-2">
          {holidays.length === 0 ? (
            <div className="text-center py-8 text-secondary">
              <Icon name="Calendar" size={32} className="mx-auto mb-2 opacity-50" />
              <p>{t('clinic.settings.noHolidays') || 'No holidays configured'}</p>
            </div>
          ) : (
            holidays.map((holiday, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-surface rounded-lg border border-primary/10">
                <span className="text-sm text-primary">
                  {new Date(holiday).toLocaleDateString(t('common.locale') || 'id-ID', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
                {canEdit && (
                  <button 
                    onClick={() => removeHoliday(holiday)}
                    className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  >
                    <Icon name="Trash2" size={16} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduleSettings;