import React, { useEffect, useState } from 'react';
import Icon from '../../../../components/AppIcon';
import { useTheme } from '../../../../contexts/ThemeContext';
import { usePreferences } from '../../../../contexts/PreferencesContext';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { useToast } from '../../../../contexts/ToastContext';

const DEFAULT_PREFERENCES = {
  theme: 'system',
  language: 'en',
  fontSize: 'medium',
  reducedMotion: false,
  emailNotifications: true,
  pushNotifications: true,
  appointmentReminders: true,
  marketingEmails: false,
  systemUpdates: true,
  reminderSound: true,
  timezone: 'Asia/Jakarta',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '24h',
  currency: 'IDR',
  autoSave: true,
  showTips: true,
  profileVisibility: 'public',
  dataSharing: false,
  analyticsOptIn: true
};

const PreferencesSettings = ({ user, onDataChange }) => {
  const { themeMode, setTheme } = useTheme();
  const { preferences: storedPreferences, setLanguage, setFontSize, setReducedMotion } = usePreferences();
  const toast = useToast();
  const { language, changeLanguage, t } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [preferences, setPreferences] = useState(() => ({
    ...DEFAULT_PREFERENCES,
    ...storedPreferences,
    theme: themeMode || DEFAULT_PREFERENCES.theme,
    language: language || DEFAULT_PREFERENCES.language
  }));

  useEffect(() => {
    setPreferences((prev) => ({
      ...prev,
      theme: themeMode || prev.theme
    }));
  }, [themeMode]);

  useEffect(() => {
    setPreferences((prev) => ({
      ...prev,
      language: language, // Use LanguageContext value
      fontSize: storedPreferences.fontSize,
      reducedMotion: storedPreferences.reducedMotion
    }));
  }, [language, storedPreferences.fontSize, storedPreferences.reducedMotion]);

  const handleInputChange = (field, value) => {
    console.log('PreferencesSettings: handleInputChange called with:', field, value);
    setPreferences((prev) => ({
      ...prev,
      [field]: value
    }));

    if (field === 'theme') {
      setTheme?.(value);
    }

    if (field === 'language') {
      console.log('PreferencesSettings: Immediately calling changeLanguage with:', value);
      changeLanguage(value);
    }

    onDataChange?.(true);
  };

  const handleCheckboxChange = (field) => (event) => {
    handleInputChange(field, event.target.checked);
  };

  const handleSave = () => {
    console.log('Saving preferences:', preferences);
    setIsEditing(false);
    onDataChange?.(false);
    
    // Language should already be changed in handleInputChange
    // Don't save language to PreferencesContext since it's handled by LanguageContext
    setFontSize(preferences.fontSize);
    setReducedMotion(preferences.reducedMotion);
    toast.success(t('settings.preferencesSaved'));
  };

  const handleCancel = () => {
    setIsEditing(false);
    onDataChange?.(false);
    setPreferences({
      ...DEFAULT_PREFERENCES,
      ...storedPreferences,
      theme: themeMode || DEFAULT_PREFERENCES.theme
    });
  };

  const resetToDefault = () => {
    if (!window.confirm(t('settings.resetPreferencesConfirm'))) return;
    setPreferences({
      ...DEFAULT_PREFERENCES,
      theme: 'system'
    });
    setTheme?.('system');
    changeLanguage('en'); // Use LanguageContext instead
    setFontSize(DEFAULT_PREFERENCES.fontSize);
    setReducedMotion(DEFAULT_PREFERENCES.reducedMotion);
    onDataChange?.(true);
  };

  const renderToggle = (field, title, description) => (
    <div className="flex items-center justify-between">
      <div>
        <span className="text-secondary font-medium">{title}</span>
        {description && (
          <p className="text-xs text-secondary/70">{description}</p>
        )}
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={preferences[field]}
          onChange={handleCheckboxChange(field)}
          disabled={!isEditing}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
      </label>
    </div>
  );

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-primary mb-2 theme-transition">
              {t('settings.preferencesSettings')}
            </h2>
            <p className="text-secondary theme-transition">
              Customize theme, language, notifications, and other personal settings
            </p>
          </div>
          <div className="flex space-x-3">
            {isEditing ? (
              <>
                <button
                  onClick={resetToDefault}
                  className="px-4 py-2 border border-orange-500 text-orange-500 rounded-lg hover:bg-orange-50 theme-transition"
                >
                  {t('common.reset')}
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 border border-primary text-primary rounded-lg hover:bg-surface theme-transition"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 theme-transition"
                >
                  {t('common.save')}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 theme-transition flex items-center space-x-2"
              >
                <Icon name="Settings" size={16} />
                <span>{t('common.edit')}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Theme & Display */}
        <section className="bg-surface-elevated rounded-2xl p-6 border border-primary theme-transition">
          <h3 className="text-lg font-semibold text-primary mb-4 flex items-center">
            <Icon name="Palette" size={20} className="mr-2" />
            {t('settings.themeDisplay')}
          </h3>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                {t('settings.theme')}
              </label>
              <select
                value={preferences.theme}
                onChange={(e) => handleInputChange('theme', e.target.value)}
                disabled={!isEditing}
                className="w-full px-4 py-3 rounded-lg border border-primary bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent theme-transition disabled:opacity-50"
              >
                <option value="light">{t('settings.light')}</option>
                <option value="dark">{t('settings.dark')}</option>
                <option value="system">{t('settings.system')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                {t('settings.language')}
              </label>
              <select
                value={preferences.language}
                onChange={(e) => handleInputChange('language', e.target.value)}
                disabled={!isEditing}
                className="w-full px-4 py-3 rounded-lg border border-primary bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent theme-transition disabled:opacity-50"
              >
                <option value="en">{t('settings.english')}</option>
                <option value="id">{t('settings.indonesian')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                {t('settings.fontSize')}
              </label>
              <select
                value={preferences.fontSize}
                onChange={(e) => handleInputChange('fontSize', e.target.value)}
                disabled={!isEditing}
                className="w-full px-4 py-3 rounded-lg border border-primary bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent theme-transition disabled:opacity-50"
              >
                <option value="small">{t('settings.small')}</option>
                <option value="medium">Medium</option>
                <option value="large">{t('settings.large')}</option>
              </select>
            </div>

            {renderToggle('reducedMotion', t('settings.reduceMotion'), t('settings.reduceMotionDesc'))}
          </div>
        </section>

        {/* Notifications */}
        <section className="bg-surface-elevated rounded-2xl p-6 border border-primary theme-transition">
          <h3 className="text-lg font-semibold text-primary mb-4 flex items-center">
            <Icon name="Bell" size={20} className="mr-2" />
            {t('settings.notifications')}
          </h3>

          <div className="space-y-4">
            {renderToggle('emailNotifications', t('settings.emailNotifications'), t('settings.emailNotificationsDesc'))}
            {renderToggle('pushNotifications', t('settings.pushNotifications'), t('settings.pushNotificationsDesc'))}
            {renderToggle('appointmentReminders', t('settings.appointmentReminders'), t('settings.appointmentRemindersDesc'))}
            {renderToggle('marketingEmails', t('settings.marketingEmails'), t('settings.marketingEmailsDesc'))}
            {renderToggle('systemUpdates', t('settings.systemUpdates'), t('settings.systemUpdatesDesc'))}
            {renderToggle('reminderSound', t('settings.reminderSound'), t('settings.reminderSoundDesc'))}
          </div>
        </section>

        {/* Personal Settings */}
        <section className="bg-surface-elevated rounded-2xl p-6 border border-primary theme-transition">
          <h3 className="text-lg font-semibold text-primary mb-4 flex items-center">
            <Icon name="User" size={20} className="mr-2" />
            {t('settings.personalPreferences')}
          </h3>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                {t('settings.timezone')}
              </label>
              <select
                value={preferences.timezone}
                onChange={(e) => handleInputChange('timezone', e.target.value)}
                disabled={!isEditing}
                className="w-full px-4 py-3 rounded-lg border border-primary bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent theme-transition disabled:opacity-50"
              >
                <option value="Asia/Jakarta">Jakarta (WIB)</option>
                <option value="Asia/Makassar">Makassar (WITA)</option>
                <option value="Asia/Jayapura">Jayapura (WIT)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                {t('settings.dateFormat')}
              </label>
              <select
                value={preferences.dateFormat}
                onChange={(e) => handleInputChange('dateFormat', e.target.value)}
                disabled={!isEditing}
                className="w-full px-4 py-3 rounded-lg border border-primary bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent theme-transition disabled:opacity-50"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                {t('settings.timeFormat')}
              </label>
              <select
                value={preferences.timeFormat}
                onChange={(e) => handleInputChange('timeFormat', e.target.value)}
                disabled={!isEditing}
                className="w-full px-4 py-3 rounded-lg border border-primary bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent theme-transition disabled:opacity-50"
              >
                <option value="24h">24 hour</option>
                <option value="12h">12 hour (AM/PM)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                {t('settings.currency')}
              </label>
              <select
                value={preferences.currency}
                onChange={(e) => handleInputChange('currency', e.target.value)}
                disabled={!isEditing}
                className="w-full px-4 py-3 rounded-lg border border-primary bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent theme-transition disabled:opacity-50"
              >
                <option value="IDR">Rupiah (IDR)</option>
                <option value="USD">US Dollar (USD)</option>
              </select>
            </div>

            {renderToggle('autoSave', t('settings.autoSave'), t('settings.autoSaveDesc'))}
            {renderToggle('showTips', t('settings.showTips'), t('settings.showTipsDesc'))}
          </div>
        </section>

        {/* Privacy */}
        <section className="bg-surface-elevated rounded-2xl p-6 border border-primary theme-transition">
          <h3 className="text-lg font-semibold text-primary mb-4 flex items-center">
            <Icon name="Shield" size={20} className="mr-2" />
            {t('settings.privacy')}
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                {t('settings.profileVisibility')}
              </label>
              <select
                value={preferences.profileVisibility}
                onChange={(e) => handleInputChange('profileVisibility', e.target.value)}
                disabled={!isEditing}
                className="w-full px-4 py-3 rounded-lg border border-primary bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent theme-transition disabled:opacity-50"
              >
                <option value="public">{t('settings.public')}</option>
                <option value="limited">{t('settings.limited')}</option>
                <option value="private">{t('settings.private')}</option>
              </select>
            </div>

            {renderToggle('dataSharing', t('settings.dataSharing'), t('settings.dataSharingDesc'))}
            {renderToggle('analyticsOptIn', t('settings.analytics'), t('settings.analyticsDesc'))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default PreferencesSettings;
