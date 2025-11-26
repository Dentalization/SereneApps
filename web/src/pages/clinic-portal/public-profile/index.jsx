import React, { useMemo, useState } from 'react';
import ClinicSideBar from '../ui/SideBar-Clinic';
import Icon from '../../../components/AppIcon';
import ServicesManagement from './components/ServicesManagement';
import GalleryManagement from './components/GalleryManagement';
import HighlightsManagement from './components/HighlightsManagement';
import FacilitiesManagement from './components/FacilitiesManagement';
import { useLanguage } from '../../../contexts/LanguageContext';

const PublicProfileView = () => {
  const [activeTab, setActiveTab] = useState('services');
  const { t } = useLanguage();

  const tabs = useMemo(
    () => [
      {
        id: 'services',
        icon: 'Stethoscope',
        label: t('clinic.publicProfile.tabs.services') || 'Services & Pricing',
        description: t('clinic.publicProfile.tabDescriptions.services'),
      },
      {
        id: 'gallery',
        icon: 'Image',
        label: t('clinic.publicProfile.tabs.gallery') || 'Gallery & Photos',
        description: t('clinic.publicProfile.tabDescriptions.gallery'),
      },
      {
        id: 'highlights',
        icon: 'Star',
        label: t('clinic.publicProfile.tabs.highlights') || 'Highlights',
        description: t('clinic.publicProfile.tabDescriptions.highlights'),
      },
      {
        id: 'facilities',
        icon: 'Building',
        label: t('clinic.publicProfile.tabs.facilities') || 'Facilities',
        description: t('clinic.publicProfile.tabDescriptions.facilities'),
      },
    ],
    [t]
  );

  const handlePreview = () => {
    window.open('/preview/public-profile', '_blank', 'noopener,noreferrer');
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'services':
        return <ServicesManagement />;
      case 'gallery':
        return <GalleryManagement />;
      case 'highlights':
        return <HighlightsManagement />;
      case 'facilities':
        return <FacilitiesManagement />;
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-background theme-transition">
      <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
        <ClinicSideBar />
      </div>

      <div className="flex-1 min-w-0">
        <div className="p-6 md:p-8 space-y-8">
          <section className="clinic-page-header space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-3 py-1 text-xs font-semibold text-primary">
                  <span className="inline-block h-2 w-2 rounded-full bg-primary" />
                  {t('clinic.publicProfile.badge') || 'Public Profile'}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-primary">
                    {t('clinic.publicProfile.title') || 'Clinic Public Profile'}
                  </h1>
                  <p className="text-sm text-secondary max-w-3xl mt-2">
                    {t('clinic.publicProfile.subtitle') || 'Manage how your clinic appears to patients.'}
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <button
                  type="button"
                  onClick={handlePreview}
                  className="inline-flex items-center gap-2 rounded-xl border border-border/40 bg-surface px-4 py-2 text-sm font-medium text-primary hover:border-primary/50"
                >
                  <Icon name="ExternalLink" size={16} />
                  {t('clinic.publicProfile.actions.preview') || 'Preview mobile view'}
                </button>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-accent-hover"
                >
                  <Icon name="RefreshCcw" size={16} />
                  {t('clinic.publicProfile.actions.refresh') || 'Refresh content'}
                </button>
              </div>
            </div>
            <div className="border-t border-border/40 pt-4">
              <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                        isActive
                          ? 'bg-accent text-white shadow-sm'
                          : 'text-secondary hover:text-primary hover:bg-surface'
                      }`}
                    >
                      <Icon name={tab.icon} size={16} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-border/40 bg-surface-elevated shadow-theme-sm p-6">
            <div className="mb-6 text-sm text-secondary">
              {tabs.find((tab) => tab.id === activeTab)?.description}
            </div>
            {renderTabContent()}
          </section>
        </div>
      </div>
    </div>
  );
};

export default PublicProfileView;
