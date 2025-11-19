import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import Icon from '../../../components/AppIcon';
import SideBar from '../ui/SideBar';

// Import setting components
import ProfileSettings from './components/ProfileSettings';
import AIBillingSettings from './components/AIBillingSettings';
import PracticeSettings from './components/PracticeSettings';
import SecuritySettings from './components/SecuritySettings';
import PreferencesSettings from './components/PreferencesSettings';

const DentistSettings = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      setLoading(false); // Set loading false as soon as auth is not loading
    }
  }, [user, authLoading]);

  // Settings navigation items
  const settingsNavItems = [
    {
      id: 'profile',
      label: t('settings.profile'),
      icon: 'UserCog',
      description: t('settings.personalInformation')
    },
    {
      id: 'ai-billing',
      label: t('settings.billing'),
      icon: 'Brain',
      description: 'AI usage and billing'
    },
    {
      id: 'practice',
      label: t('settings.practice'),
      icon: 'Building2',
      description: 'Clinic hours and appointments'
    },
    {
      id: 'security',
      label: t('settings.security'),
      icon: 'Shield',
      description: 'Password and security controls'
    },
    {
      id: 'preferences',
      label: t('settings.preferences'),
      icon: 'Settings',
      description: 'Language, theme, and integrations'
    }
  ];

  const renderSettingsContent = () => {
    // Show skeleton loading if no user data yet
    if (!user || authLoading) {
      return (
        <div className="p-8 dentist-skeleton">
          {/* Header Skeleton */}
          <div className="mb-8">
            <div className="h-8 bg-accent/20 rounded-xl animate-pulse w-64 mb-2"></div>
            <div className="h-5 bg-accent/10 rounded-lg animate-pulse w-96"></div>
          </div>

          {/* Profile Image Skeleton */}
          <div className="space-y-8">
            <div className="flex items-center space-x-6">
              <div className="w-24 h-4 bg-accent/10 rounded animate-pulse"></div>
              <div className="flex items-center space-x-6">
                <div className="w-20 h-20 bg-accent/20 rounded-2xl animate-pulse"></div>
                <div className="h-12 bg-accent/10 rounded-xl animate-pulse w-32"></div>
              </div>
            </div>

            {/* Personal Info Skeleton */}
            <div className="space-y-6">
              <div className="h-6 bg-accent/20 rounded-xl animate-pulse w-48"></div>
              
              {/* Form Fields */}
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-6">
                  <div className="w-24 h-4 bg-accent/10 rounded animate-pulse"></div>
                  <div className="flex-1 h-12 bg-accent/10 rounded-xl animate-pulse"></div>
                </div>
              ))}
            </div>

            {/* Professional Info Skeleton */}
            <div className="space-y-6">
              <div className="h-6 bg-accent/20 rounded-xl animate-pulse w-56"></div>
              
              <div className="grid gap-6 md:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-6">
                    <div className="w-32 h-4 bg-accent/10 rounded animate-pulse"></div>
                    <div className="flex-1 h-12 bg-accent/10 rounded-xl animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Documents Skeleton */}
            <div className="space-y-6">
              <div className="h-6 bg-accent/20 rounded-xl animate-pulse w-52"></div>
              
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-6">
                  <div className="w-32 h-4 bg-accent/10 rounded animate-pulse"></div>
                  <div className="flex-1 flex items-center space-x-4">
                    <div className="h-12 bg-accent/10 rounded-xl animate-pulse w-32"></div>
                    <div className="h-8 bg-accent/10 rounded-lg animate-pulse w-20"></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons Skeleton */}
            <div className="flex justify-end space-x-4 pt-6">
              <div className="h-12 bg-accent/10 rounded-xl animate-pulse w-24"></div>
              <div className="h-12 bg-accent/20 rounded-xl animate-pulse w-32"></div>
            </div>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'profile':
        return <ProfileSettings user={user} onDataChange={setHasUnsavedChanges} />;
      case 'ai-billing':
        return <AIBillingSettings user={user} onDataChange={setHasUnsavedChanges} />;
      case 'practice':
        return <PracticeSettings user={user} onDataChange={setHasUnsavedChanges} />;
      case 'security':
        return <SecuritySettings user={user} onDataChange={setHasUnsavedChanges} />;
      case 'preferences':
        return <PreferencesSettings user={user} onDataChange={setHasUnsavedChanges} />;
      default:
        return <ProfileSettings user={user} onDataChange={setHasUnsavedChanges} />;
    }
  };

  const handleSave = () => {
    // TODO: Implement save functionality
    console.log('Saving settings data...');
    setHasUnsavedChanges(false);
    // Here you would typically call an API to update the user data
  };

  const handleCancel = () => {
    // Reset any unsaved changes
    setHasUnsavedChanges(false);
    // TODO: Reset form data in child components
    console.log('Cancelled changes');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-surface theme-transition dentist-skeleton">
        <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
          <SideBar />
        </div>
        <div className="flex-1 min-w-0 overflow-y-auto">
          <div className="w-full p-8">
            <div className="h-10 bg-accent/20 rounded-2xl animate-pulse mb-6 w-80"></div>
            <div className="h-6 bg-accent/10 rounded-xl animate-pulse w-96 mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((item) => (
                  <div key={item} className="h-16 bg-accent/10 rounded-2xl animate-pulse"></div>
                ))}
              </div>
              <div className="lg:col-span-3">
                <div className="h-96 bg-accent/10 rounded-2xl animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background theme-transition">
      <SideBar />
      
      {/* Header */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="p-6 md:p-8 pb-4">
          <section className="dentist-page-header space-y-6 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-3xl p-8 border border-emerald-100 dark:border-emerald-800/30">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                  {t('dentist.settings.badge') || 'Account Configuration'}
                </p>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                  {t('settings.title') || 'Settings'}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300 max-w-2xl">
                  {t('dentist.settings.subtitle') || 'Manage your profile, AI billing, and practice configuration'}
                </p>
                {hasUnsavedChanges && (
                  <div className="mt-4 flex items-center space-x-2">
                    <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                      You have unsaved changes
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3">
                <div className="rounded-2xl border border-white/30 bg-white/20 backdrop-blur-sm px-4 py-2 text-sm text-gray-700 dark:text-gray-200">
                  Profile Status: Active
                </div>
                <button className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition">
                  <Icon name="Save" size={16} />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
            <div className="border-t border-white/20 pt-4">
              <div className="flex flex-wrap gap-2">
                {settingsNavItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      activeTab === item.id
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-white/20 backdrop-blur-sm'
                    }`}
                  >
                    <Icon name={item.icon} size={16} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="flex-1 overflow-y-auto px-6 md:px-8 pt-4 pb-6 md:pb-8">
          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Settings Navigation */}
            <div className="lg:col-span-1">
              <div className="bg-surface-elevated rounded-2xl border border-primary/20 shadow-theme-sm p-6 theme-transition sticky top-8">
                <h3 className="text-lg font-semibold text-primary mb-4 theme-transition">
                  Settings Categories
                </h3>
                <nav className="space-y-2">
                  {settingsNavItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-start space-x-3 p-4 rounded-2xl transition-all duration-200 text-left group ${
                        activeTab === item.id
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-foreground hover:bg-muted hover:text-emerald-600'
                      }`}
                    >
                      <Icon 
                        name={item.icon} 
                        size={20} 
                        className={`flex-shrink-0 mt-0.5 transition-colors ${
                          activeTab === item.id ? 'text-white' : 'text-muted-foreground group-hover:text-emerald-600'
                        }`} 
                      />
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium text-sm transition-colors ${
                          activeTab === item.id ? 'text-white' : 'text-foreground group-hover:text-emerald-600'
                        }`}>
                          {item.label}
                        </div>
                        <div className={`text-xs mt-1 transition-colors ${
                          activeTab === item.id ? 'text-white/80' : 'text-muted-foreground'
                        }`}>
                          {item.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Settings Content */}
            <div className="lg:col-span-3">
              <div className="bg-surface-elevated rounded-2xl border border-primary/20 shadow-theme-sm theme-transition overflow-hidden">
                {renderSettingsContent()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DentistSettings;
