import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import ClinicSideBar from '../ui/SideBar-Clinic';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import ProfileSettings from './components/profile-settings';
import ClinicSettings from './components/clinic-settings';
import ScheduleSettings from './components/schedule-settings';
import ServicesSettings from './components/services-settings';
import IntegrationsSettings from './components/integrations-settings';
// UsersSettings removed - using dedicated staff management instead
import TemplatesSettings from './components/templates-settings';
import AuditSettings from './components/audit-settings';

const SettingsPage = () => {
  const { t } = useLanguage();
  const { isDark } = useTheme();
  const { user } = useAuth();
  
  // Role-based access configuration
  const rolePermissions = {
    owner: ['profile', 'clinic', 'schedule', 'services', 'integrations', 'templates', 'audit'], // Full access
    manager: ['profile', 'clinic', 'schedule', 'services', 'templates'], // Management access
    admin: ['profile', 'clinic', 'schedule', 'services', 'templates'], // Administrative access
    dentist: ['profile', 'schedule', 'services', 'templates'], // Clinical access
    front_office: ['profile', 'schedule', 'services'], // Reception access
    nurse: ['profile', 'schedule', 'templates'], // Clinical support access
    cashier: ['profile', 'services'], // Billing access
    staff: ['profile', 'schedule'] // Basic access
  };

  // Get user's role from context or default to 'staff'
  const userRole = user?.roles?.[0] || user?.role || 'staff';
  const allowedTabs = rolePermissions[userRole] || ['schedule'];
  
  // Set initial tab to profile if available, otherwise first allowed tab
  const [activeTab, setActiveTab] = useState(allowedTabs.includes('profile') ? 'profile' : allowedTabs[0] || 'schedule');
  const [settingsData, setSettingsData] = useState({
    clinic: {
      name: 'Klinik Gigi Serene',
      address: 'Jl. Sudirman No. 123, Jakarta Pusat',
      phone: '021-12345678',
      email: 'info@klinikserene.com',
      license: 'KG-001/2024'
    },
    schedule: {
      operatingHours: {
        monday: { open: '08:00', close: '17:00', closed: false },
        tuesday: { open: '08:00', close: '17:00', closed: false },
        wednesday: { open: '08:00', close: '17:00', closed: false },
        thursday: { open: '08:00', close: '17:00', closed: false },
        friday: { open: '08:00', close: '16:00', closed: false },
        saturday: { open: '09:00', close: '14:00', closed: false },
        sunday: { open: '09:00', close: '12:00', closed: true }
      },
      holidays: ['2024-01-01', '2024-12-25']
    },
    services: [
      { id: 1, name: 'Konsultasi', price: 150000, duration: 30, active: true },
      { id: 2, name: 'Scaling', price: 250000, duration: 45, active: true },
      { id: 3, name: 'Filling', price: 300000, duration: 60, active: true },
      { id: 4, name: 'Root Canal', price: 1500000, duration: 90, active: true }
    ],
    integrations: {
      whatsapp: { enabled: false, apiKey: '' },
      bpjs: { enabled: false, facilityCode: '' },
      payment: { enabled: true, providers: ['BCA', 'Mandiri', 'QRIS'] }
    },
    users: [
      { id: 1, name: 'Dr. Sarah Lestari', role: 'dentist', email: 'sarah@klinik.com', active: true },
      { id: 2, name: 'Ahmad Receptionist', role: 'front_office', email: 'ahmad@klinik.com', active: true },
      { id: 3, name: 'Siti Cashier', role: 'cashier', email: 'siti@klinik.com', active: true }
    ]
  });
  const [loading, setLoading] = useState(true);

  const tabs = [
    { 
      id: 'profile', 
      label: t('settings.profile') || 'Profil Saya', 
      icon: 'User',
      description: 'Informasi pribadi, password, foto profil',
      minRole: ['owner', 'manager', 'admin', 'dentist', 'front_office', 'nurse', 'cashier', 'staff']
    },
    { 
      id: 'clinic', 
      label: t('settings.clinic') || 'Profil Klinik', 
      icon: 'Building',
      description: 'Informasi dasar klinik, alamat, kontak',
      minRole: ['owner', 'manager', 'admin']
    },
    { 
      id: 'schedule', 
      label: t('settings.schedule') || 'Jam Operasional', 
      icon: 'Clock',
      description: 'Jadwal operasional dan hari libur',
      minRole: ['owner', 'manager', 'admin', 'dentist', 'front_office', 'nurse', 'staff']
    },
    { 
      id: 'services', 
      label: t('settings.services') || 'Layanan & Tarif', 
      icon: 'Stethoscope',
      description: 'Daftar layanan, harga, dan durasi',
      minRole: ['owner', 'manager', 'admin', 'dentist', 'front_office', 'cashier']
    },
    { 
      id: 'integrations', 
      label: t('settings.integrations') || 'Integrasi', 
      icon: 'Link',
      description: 'WhatsApp, BPJS, payment gateway',
      minRole: ['owner']
    },
    { 
      id: 'users', 
      label: t('settings.users') || 'Pengguna & Peran', 
      icon: 'Users',
      description: 'Manajemen staff dan role',
      minRole: ['owner', 'manager']
    },
    { 
      id: 'templates', 
      label: t('settings.templates') || 'Template Dokumen', 
      icon: 'FileText',
      description: 'Form consent, invoice, dokumen medis',
      minRole: ['owner', 'manager', 'admin', 'dentist', 'nurse']
    },
    { 
      id: 'audit', 
      label: t('settings.audit') || 'Audit & Data', 
      icon: 'Shield',
      description: 'Compliance, audit trail, retensi data',
      minRole: ['owner']
    }
  ];

  // Filter tabs based on user role
  const availableTabs = tabs.filter(tab => allowedTabs.includes(tab.id));

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const days = [
    { key: 'monday', label: 'Senin' },
    { key: 'tuesday', label: 'Selasa' },
    { key: 'wednesday', label: 'Rabu' },
    { key: 'thursday', label: 'Kamis' },
    { key: 'friday', label: 'Jumat' },
    { key: 'saturday', label: 'Sabtu' },
    { key: 'sunday', label: 'Minggu' }
  ];

  const canEdit = (section) => {
    const editPermissions = {
      clinic: ['owner', 'manager'],
      schedule: ['owner', 'manager', 'admin'],
      services: ['owner', 'manager', 'admin'],
      integrations: ['owner'],
      users: ['owner', 'manager'],
      templates: ['owner', 'manager', 'admin'],
      audit: ['owner']
    };
    return editPermissions[section]?.includes(userRole) || false;
  };

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    const tabSkeletons = availableTabs.length ? availableTabs : tabs;

    return (
      <div className="flex min-h-screen bg-background theme-transition clinic-skeleton">
        <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
          <ClinicSideBar />
        </div>

        <div className="flex-1 min-w-0">
          <div className="p-6 md:p-8 space-y-8">
            <section className="space-y-6 rounded-3xl border border-primary/15 bg-surface-elevated skeleton-surface p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-3">
                  <div className="h-6 w-60 rounded bg-accent/10 animate-pulse"></div>
                  <div className="h-4 w-72 rounded bg-accent/10 animate-pulse"></div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="h-10 w-44 rounded-lg bg-accent/10 animate-pulse"></div>
                  <div className="h-10 w-40 rounded-lg bg-accent/20 animate-pulse"></div>
                </div>
              </div>
              <div className="border-t border-primary/15 pt-4 flex flex-wrap gap-2">
                {tabSkeletons.map((tab) => (
                  <div key={tab.id} className="h-9 w-32 rounded-lg bg-accent/10 animate-pulse"></div>
                ))}
              </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="rounded-2xl border border-primary/15 bg-surface-elevated skeleton-surface p-6 space-y-4">
                  <div className="h-4 w-48 rounded bg-accent/10 animate-pulse"></div>
                  <div className="space-y-3">
                    <div className="h-3 w-full rounded bg-accent/10 animate-pulse"></div>
                    <div className="h-3 w-5/6 rounded bg-accent/10 animate-pulse"></div>
                    <div className="h-3 w-2/3 rounded bg-accent/10 animate-pulse"></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="h-10 rounded-lg bg-accent/10 animate-pulse"></div>
                    <div className="h-10 rounded-lg bg-accent/10 animate-pulse"></div>
                  </div>
                </div>
              ))}
            </section>
          </div>
        </div>
      </div>
    );
  }

  const renderClinicView = () => (
    <div className="space-y-6">
      <div className="bg-surface-elevated rounded-xl border border-primary/20 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-primary">Informasi Klinik</h3>
          {!canEdit('clinic') && (
            <span className="text-xs bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 px-2 py-1 rounded-full">
              {t('settings.readOnly') || 'Read Only'}
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">Nama Klinik</label>
            <input
              type="text"
              value={settingsData.clinic.name}
              className="w-full px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent disabled:opacity-50"
              readOnly={!canEdit('clinic')}
              disabled={!canEdit('clinic')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">Nomor Lisensi</label>
            <input
              type="text"
              value={settingsData.clinic.license}
              className="w-full px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent disabled:opacity-50"
              readOnly={!canEdit('clinic')}
              disabled={!canEdit('clinic')}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-secondary mb-2">Alamat</label>
            <textarea
              value={settingsData.clinic.address}
              rows={3}
              className="w-full px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent disabled:opacity-50"
              readOnly={!canEdit('clinic')}
              disabled={!canEdit('clinic')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">Telepon</label>
            <input
              type="tel"
              value={settingsData.clinic.phone}
              className="w-full px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent disabled:opacity-50"
              readOnly={!canEdit('clinic')}
              disabled={!canEdit('clinic')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">Email</label>
            <input
              type="email"
              value={settingsData.clinic.email}
              className="w-full px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent disabled:opacity-50"
              readOnly={!canEdit('clinic')}
              disabled={!canEdit('clinic')}
            />
          </div>
        </div>
        {canEdit('clinic') && (
          <div className="flex justify-end mt-6">
            <button className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors">
              <Icon name="Save" size={16} className="mr-2" />
              Simpan Perubahan
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderScheduleView = () => (
    <div className="space-y-6">
      <div className="bg-surface-elevated rounded-xl border border-primary/20 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-primary">Jam Operasional</h3>
          {!canEdit('schedule') && (
            <span className="text-xs bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 px-2 py-1 rounded-full">
              {t('settings.readOnly') || 'Read Only'}
            </span>
          )}
        </div>
        <div className="space-y-4">
          {days.map((day) => (
            <div key={day.key} className="flex items-center space-x-4 p-4 bg-surface rounded-lg">
              <div className="w-20">
                <span className="text-sm font-medium text-primary">{day.label}</span>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={!settingsData.schedule.operatingHours[day.key].closed}
                  className="rounded border-primary/20 text-accent focus:ring-accent disabled:opacity-50"
                  readOnly={!canEdit('schedule')}
                  disabled={!canEdit('schedule')}
                />
                <span className="text-sm text-secondary">Buka</span>
              </div>
              {!settingsData.schedule.operatingHours[day.key].closed && (
                <>
                  <div className="flex items-center space-x-2">
                    <input
                      type="time"
                      value={settingsData.schedule.operatingHours[day.key].open}
                      className="px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary disabled:opacity-50"
                      readOnly={!canEdit('schedule')}
                      disabled={!canEdit('schedule')}
                    />
                    <span className="text-secondary">-</span>
                    <input
                      type="time"
                      value={settingsData.schedule.operatingHours[day.key].close}
                      className="px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary disabled:opacity-50"
                      readOnly={!canEdit('schedule')}
                      disabled={!canEdit('schedule')}
                    />
                  </div>
                </>
              )}
              {settingsData.schedule.operatingHours[day.key].closed && (
                <span className="text-sm text-red-600">Tutup</span>
              )}
            </div>
          ))}
        </div>
        {canEdit('schedule') && (
          <div className="flex justify-end mt-6">
            <button className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors">
              <Icon name="Save" size={16} className="mr-2" />
              Simpan Jadwal
            </button>
          </div>
        )}
      </div>

      <div className="bg-surface-elevated rounded-xl border border-primary/20 p-6">
        <h3 className="text-lg font-semibold text-primary mb-4">Hari Libur</h3>
        <div className="flex items-center space-x-4 mb-4">
          <input
            type="date"
            className="px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary"
          />
          <button className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors">
            <Icon name="Plus" size={16} className="mr-2" />
            Tambah Libur
          </button>
        </div>
        <div className="space-y-2">
          {settingsData.schedule.holidays.map((holiday, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-surface rounded-lg">
              <span className="text-sm text-primary">
                {new Date(holiday).toLocaleDateString('id-ID', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
              <button className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                <Icon name="Trash2" size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderServicesView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-primary">Layanan & Tarif</h3>
          {!canEdit('services') && (
            <span className="text-xs bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 px-2 py-1 rounded-full mt-1 inline-block">
              {t('settings.readOnly') || 'Read Only'}
            </span>
          )}
        </div>
        {canEdit('services') && (
          <button className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors">
            <Icon name="Plus" size={16} className="mr-2" />
            Tambah Layanan
          </button>
        )}
      </div>

      <div className="bg-surface-elevated rounded-xl border border-primary/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Layanan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Tarif</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Durasi</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10">
              {settingsData.services.map((service) => (
                <tr key={service.id} className="hover:bg-surface transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-primary">{service.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-primary">{formatCurrency(service.price)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-secondary">{service.duration} menit</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      service.active 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {service.active ? 'Aktif' : 'Tidak Aktif'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      {canEdit('services') ? (
                        <>
                          <button className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded">
                            <Icon name="Edit" size={16} />
                          </button>
                          <button className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                            <Icon name="Trash2" size={16} />
                          </button>
                        </>
                      ) : (
                        <button className="p-1 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900/20 rounded">
                          <Icon name="Eye" size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderIntegrationsView = () => (
    <div className="text-center py-12">
      <Icon name="Link" size={48} className="text-muted mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-primary mb-2">Integrasi Sistem</h3>
      <p className="text-secondary">WhatsApp API, BPJS bridging, payment gateway</p>
    </div>
  );

  const renderUsersView = () => (
    <div className="text-center py-12">
      <Icon name="Users" size={48} className="text-muted mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-primary mb-2">Manajemen Pengguna</h3>
      <p className="text-secondary">Role-based access control dan user management</p>
    </div>
  );

  const renderTemplatesView = () => (
    <div className="text-center py-12">
      <Icon name="FileText" size={48} className="text-muted mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-primary mb-2">Template Dokumen</h3>
      <p className="text-secondary">Consent forms, invoice templates, dan dokumen medis</p>
    </div>
  );

  const renderAuditView = () => (
    <div className="text-center py-12">
      <Icon name="Shield" size={48} className="text-muted mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-primary mb-2">Audit & Retensi Data</h3>
      <p className="text-secondary">Compliance UU PDP, audit trail, dan data retention</p>
    </div>
  );

  const renderAccessDenied = () => (
    <div className="text-center py-12">
      <Icon name="Lock" size={48} className="text-red-500 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-primary mb-2">Akses Terbatas</h3>
      <p className="text-secondary mb-4">
        Role {userRole.replace('_', ' ').toUpperCase()} tidak memiliki akses ke section ini.
      </p>
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 max-w-md mx-auto">
        <p className="text-sm text-red-800 dark:text-red-300">
          Hubungi administrator atau owner klinik untuk mendapatkan akses tambahan.
        </p>
      </div>
    </div>
  );

  const renderRolePermissionsInfo = () => {
    const roleDescriptions = {
      owner: 'Full access to all settings including integrations, audit, and user management',
      manager: 'Management access to clinic operations, staff, and services',
      admin: 'Administrative access to clinic settings and documentation',
      dentist: 'Clinical access to schedules, services, and medical templates',
      front_office: 'Reception access to schedules and service information',
      nurse: 'Clinical support access to schedules and medical forms',
      cashier: 'Billing access to service pricing information',
      staff: 'Basic access to schedule information'
    };

    return (
      <div className="bg-surface-elevated rounded-xl border border-primary/20 p-6 mb-6">
        <div className="flex items-start gap-3">
          <Icon name="UserCheck" size={20} className="text-accent mt-1" />
          <div>
            <h4 className="font-semibold text-primary mb-2">Your Access Level: {userRole.replace('_', ' ').toUpperCase()}</h4>
            <p className="text-sm text-secondary mb-3">
              {roleDescriptions[userRole] || 'Limited access to system settings'}
            </p>
            <div className="text-xs text-secondary">
              <strong>Accessible sections:</strong> {availableTabs.map(tab => tab.label).join(', ')}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    // Check if user has access to current tab
    if (!allowedTabs.includes(activeTab)) {
      return renderAccessDenied();
    }

    switch (activeTab) {
      case 'profile': return <ProfileSettings />;
      case 'clinic': return <ClinicSettings />;
      case 'schedule': return <ScheduleSettings />;
      case 'services': return <ServicesSettings />;
      case 'integrations': return <IntegrationsSettings />;
      case 'users': return (
        <div className="text-center py-12">
          <Icon name="Users" size={48} className="text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            User Management Moved
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            User management is now handled in the dedicated Staff Management section.
          </p>
          <button
            onClick={() => window.location.href = '/clinic-portal/staff'}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
          >
            Go to Staff Management
          </button>
        </div>
      );
      case 'templates': return <TemplatesSettings />;
      case 'audit': return <AuditSettings />;
      default: return allowedTabs.includes('profile') ? <ProfileSettings /> : <ScheduleSettings />; // Default to profile if available or most accessible tab
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background theme-transition">
        <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
          <ClinicSideBar />
        </div>
        <div className="flex-1 min-w-0 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin mb-4">
              <Icon name="Loader2" size={48} className="text-accent mx-auto" />
            </div>
            <p className="text-secondary">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background theme-transition">
      <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
        <ClinicSideBar />
      </div>

      <div className="flex-1 min-w-0">
        <div className="p-6 md:p-8 space-y-8">
          <section className="clinic-page-header space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                                    {t('settings.badge') || 'System Settings'}
                </p>
                <h1 className="text-2xl font-bold text-primary">
                  {t('settings.title') || 'Pengaturan'}
                </h1>
                <p className="text-sm text-secondary max-w-2xl">
                                    {t('settings.subtitle') || 'Konfigurasi klinik, layanan, dan sistem'}
                </p>
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3">
                <div className="rounded-2xl border border-border/40 bg-surface px-4 py-2 text-sm text-secondary">
                  <Icon name="User" size={14} className="inline mr-1" />
                  {userRole.replace('_', ' ').toUpperCase()} - {availableTabs.length} {t('settings.accessibleSections') || 'accessible sections'}
                </div>
                {(userRole === 'owner' || userRole === 'manager' || userRole === 'admin') && (
                  <button className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-accent/90">
                    <Icon name="Save" size={16} />
                    <span>{t('settings.saveAll') || 'Simpan Semua'}</span>
                  </button>
                )}
              </div>
            </div>
            <div className="border-t border-border/40 pt-4">
              <div className="flex flex-wrap gap-2">
                {availableTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-accent text-white shadow-sm'
                        : 'text-secondary hover:text-primary hover:bg-surface'
                    }`}
                    title={tab.description}
                  >
                    <Icon name={tab.icon} size={16} />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
              
              {/* Role-based access info */}
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <Icon name="Info" size={16} className="text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                      {t('settings.roleAccess') || 'Your Access Level'}: {userRole.replace('_', ' ').toUpperCase()}
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                      {userRole === 'owner' 
                        ? (t('settings.roleAccessDesc') || 'Full access to all settings including integrations, audit, and user management')
                        : `As ${userRole.replace('_', ' ')}, you have access to ${availableTabs.length} settings sections. Contact your administrator for additional permissions.`
                      }
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-300 mt-2">
                      <strong>{t('settings.accessibleSections') || 'Accessible sections'}:</strong> {availableTabs.map(tab => tab.label).join(', ')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="min-h-[500px]">
            {renderRolePermissionsInfo()}
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
