import React, { useState } from 'react';
import ClinicSideBar from '../ui/SideBar-Clinic';
import { useTheme } from '../../../contexts/ThemeContext';
import ServicesManagement from './components/ServicesManagement';
import GalleryManagement from './components/GalleryManagement';
import HighlightsManagement from './components/HighlightsManagement';
import FacilitiesManagement from './components/FacilitiesManagement';

const TABS = [
  { id: 'services', label: 'Services & Pricing', icon: 'Stethoscope' },
  { id: 'gallery', label: 'Gallery & Photos', icon: 'Image' },
  { id: 'highlights', label: 'Highlights', icon: 'Star' },
  { id: 'facilities', label: 'Facilities', icon: 'Building' },
];

const PublicProfileView = () => {
  const [activeTab, setActiveTab] = useState('services');
  const { isDark } = useTheme();

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
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <ClinicSideBar />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="px-6 py-8 md:px-10 lg:px-12 max-w-[1400px]">
          {/* Header */}
          <div className="mb-6">
            <h1 className={`text-3xl font-bold tracking-tight ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
              Public Profile
            </h1>
            <p className={`mt-2 text-base ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
              Manage how your clinic appears to patients in the mobile app
            </p>
          </div>

          {/* Tabs */}
          <div className="mb-6">
            <div className="border-b border-primary">
              <div className="flex items-center space-x-1 overflow-x-auto">
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`
                        relative inline-flex items-center gap-2
                        px-4 py-3
                        text-sm font-medium
                        whitespace-nowrap
                        border-b-2
                        transition-all duration-200
                        ${
                          isActive
                            ? 'border-accent text-accent'
                            : 'border-transparent text-muted hover:text-primary hover:border-primary/30'
                        }
                      `}
                    >
                      <span className="text-base">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="bg-surface-elevated border border-primary rounded-2xl shadow-theme-sm p-6">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicProfileView;
