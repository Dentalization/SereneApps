import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import AppImage from '../../../components/AppImage';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { resolveMediaUrl } from '../../../utils/media';
import { getDentistServicesContext } from '../../../services/dentistPortalService';

const FLAG_SRC = {
  en: '/assets/images/ukflag.png',
  id: '/assets/images/idflag.jpg',
};

const SideBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { toggleTheme, isDark, isTransitioning } = useTheme();
  const { t, language, changeLanguage } = useLanguage();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const [dentistContext, setDentistContext] = useState({ loading: true, dentistType: null });
  
  // State dummy untuk notifikasi
  const [unreadNotifications, setUnreadNotifications] = useState(2);

  const avatarPath = user?.avatar_url || user?.profile?.avatar_url;
  const avatarUrl = resolveMediaUrl(avatarPath);

  useEffect(() => {
    const onDocClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setIsUserMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', isCollapsed ? '7rem' : '20rem');
  }, [isCollapsed]);

  useEffect(() => {
    let mounted = true;
    const fetchDentistContext = async () => {
      if (!user?.roles?.includes('dentist')) {
        setDentistContext({ loading: false, dentistType: null });
        return;
      }
      try {
        const data = await getDentistServicesContext();
        if (!mounted) return;
        setDentistContext({ loading: false, dentistType: data.dentistType });
      } catch (error) {
        console.error('Failed to fetch dentist type', error);
        if (!mounted) return;
        setDentistContext({ loading: false, dentistType: null });
      }
    };

    fetchDentistContext();
    return () => {
      mounted = false;
    };
  }, [user?.id, user?.roles]);

  const formatNameWithTitle = (name, title) => {
    if (!name) return title || 'User Name';
    if (!title) return `Dr. ${name}`;
    if (/drg/i.test(title)) {
      const m = title.match(/(.*drg\.?)\s*(.*)/i);
      if (m) {
        const beforeDrg = m[1];
        const afterDrg = m[2];
        return `${beforeDrg} ${name}${afterDrg ? ', ' + afterDrg.replace(/^,\s*/, '') : ''}`;
      }
    }
    return `${title} ${name}`;
  };

  const userIsDentist = user?.roles?.includes('dentist');
  const dentistType = dentistContext.dentistType;
  const isClinicDentist = dentistType === 'clinic';

  const baseMenuItems = useMemo(
    () => [
      { id: 'dashboard', label: t('sidebar.dashboard'), icon: 'LayoutDashboard', path: '/dentist-portal/home', description: 'Overview & Analytics' },
      { id: 'patients', label: t('sidebar.patients'), icon: 'Users', path: '/dentist-portal/patient', description: 'Patient Management' },
      { id: 'consultations', label: t('sidebar.teledentistry'), icon: 'Video', path: '/dentist-portal/teledentistry', description: 'Teledentistry Sessions' },
      { id: 'ai-analysis', label: t('sidebar.aiInsights'), icon: 'Brain', path: '/dentist-portal/ai-analysis', description: 'AI Clinical Decision Support' },
      { id: 'appointments', label: t('sidebar.schedule'), icon: 'Calendar', path: '/dentist-portal/appointments', description: 'Schedule Management' },
      { id: 'reports', label: t('sidebar.reports'), icon: 'BarChart3', path: '/dentist-portal/reports', description: 'Reports & Statistics' },
    ],
    [t]
  );

  const independentPracticeMenu = [
    {
      id: 'practice-services',
      label: 'My Services & Pricing',
      icon: 'BadgeDollarSign',
      path: '/dentist-portal/practice/services',
      description: 'Create offerings & fees',
    },
    {
      id: 'practice-availability',
      label: 'Availability',
      icon: 'Clock',
      path: '/dentist-portal/practice/availability',
      description: 'Control slots & hours',
    },
    {
      id: 'practice-earnings',
      label: 'Earnings',
      icon: 'Wallet',
      path: '/dentist-portal/practice/earnings',
      description: 'Monitor revenue',
    },
  ];

  const clinicProfileMenu = [
    {
      id: 'clinic-services',
      label: 'View My Services',
      icon: 'Layers',
      path: '/dentist-portal/profile/services',
      description: 'Clinic-managed services',
    },
    {
      id: 'clinic-schedule',
      label: 'My Schedule',
      icon: 'CalendarDays',
      path: '/dentist-portal/profile/schedule',
      description: 'Branch schedule view',
    },
    {
      id: 'clinic-patients',
      label: 'My Patients',
      icon: 'UserCircle2',
      path: '/dentist-portal/profile/patients',
      description: 'Assigned patients',
    },
  ];

  const menuItems = useMemo(() => {
    if (!userIsDentist) return baseMenuItems;
    if (dentistContext.loading) return baseMenuItems;

    const roleMenu = isClinicDentist ? clinicProfileMenu : independentPracticeMenu;
    if (!roleMenu.length) return baseMenuItems;

    return [
      ...baseMenuItems,
      { type: 'section', id: 'dentist-section', label: isClinicDentist ? 'My Profile' : 'My Practice' },
      ...roleMenu,
    ];
  }, [baseMenuItems, dentistContext.loading, isClinicDentist, userIsDentist]);

  const handleNavigation = (path) => navigate(path);
  const handleLogout = async () => { try { await logout(); navigate('/login'); } catch (e) { console.error(e); } };
  const isActive = (path) => (path === '/dentist-portal' ? location.pathname === '/dentist-portal' : location.pathname.startsWith(path));

  // --- KOMPONEN TOMBOL NOTIFIKASI ---
  const NotificationButton = ({ collapsed }) => (
    <button
      onClick={() => handleNavigation('/dentist-portal/notifications')}
      className={`relative group p-2 rounded-lg text-muted hover:bg-accent hover:bg-opacity-15 transition-all duration-200 ${collapsed ? 'mt-2' : 'mr-1'}`}
      title={t('common.notifications') || 'Notifications'}
    >
      <Icon name="Bell" size={collapsed ? 20 : 18} />
      {unreadNotifications > 0 && (
        <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-surface-elevated"></span>
        </span>
      )}
    </button>
  );

  return (
    <>
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div className="sticky top-0 h-screen p-4">
        <div
          className={`h-full flex flex-col rounded-3xl bg-surface-elevated border border-primary shadow-theme-lg theme-transition ${isCollapsed ? 'w-20' : 'w-72'}`}
          style={{ transition: 'width .4s cubic-bezier(0.4,0,0.2,1)' }}
        >
          {/* Header */}
          <div className={`border-b border-primary theme-transition ${isCollapsed ? 'px-2 py-3' : 'px-6 py-4'}`}>
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
              <div className="flex items-center space-x-3">
                <div className="flex flex-col items-center">
                  <AppImage src="/icon.png" alt="SereneAI Logo" className={isCollapsed ? 'w-12 h-12 object-contain' : 'w-16 h-16 object-contain'} />
                  {isCollapsed && (
                    <>
                      <button onClick={() => setIsCollapsed(false)} className="mt-1 p-1 rounded text-muted hover:bg-accent hover:bg-opacity-15">
                        <Icon name="ChevronRight" size={16} />
                      </button>

                      {/* NOTIFIKASI (COLLAPSED) */}
                      <div className="my-1 w-8 border-t border-primary/20"></div>
                      <NotificationButton collapsed={true} />
                    </>
                  )}
                </div>
                {!isCollapsed && (
                  <div>
                    <h1 className="text-lg font-semibold text-primary">SereneAI</h1>
                    <p className="text-xs text-secondary">Dental Portal</p>
                  </div>
                )}
              </div>
              
              {/* NOTIFIKASI (EXPANDED) */}
              {!isCollapsed && (
                <div className="flex items-center">
                  <NotificationButton collapsed={false} />
                  <button onClick={() => setIsCollapsed(true)} className="p-2 rounded-lg text-muted hover:bg-accent hover:bg-opacity-15 ml-1">
                    <Icon name="ChevronLeft" size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Search */}
          {!isCollapsed && (
            <div className="px-4 py-3">
              <div className="relative">
                <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-primary bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                />
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto bg-surface-elevated">
            <div className={isCollapsed ? 'space-y-2' : 'space-y-1'}>
              {menuItems.map((item) => {
                if (item.type === 'section') {
                  return isCollapsed ? (
                    <div key={item.id} className="my-4 border-t border-primary/20 relative">
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 text-[10px] uppercase tracking-widest text-muted bg-surface-elevated">
                        {item.label}
                      </span>
                    </div>
                  ) : (
                    <div key={item.id} className="px-3 pt-5 pb-2 text-[11px] uppercase tracking-[0.3em] text-muted">
                      {item.label}
                    </div>
                  );
                }

                const active = isActive(item.path);
                return (
                  <div key={item.path} className="relative group">
                    <button
                      onClick={() => handleNavigation(item.path)}
                      className={`w-full flex items-center rounded-lg ${isCollapsed ? 'justify-center p-3' : 'px-3 py-2.5 space-x-3'} ${
                        active ? 'bg-accent text-white' : 'text-muted hover:bg-accent hover:bg-opacity-15 hover:text-primary'
                      }`}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <div className="w-5 h-5 flex items-center justify-center">
                        <Icon name={item.icon} size={20} />
                      </div>
                      {!isCollapsed && (
                        <div className="flex-1 text-left">
                          <div className="font-medium text-sm">{item.label}</div>
                          <div className="text-xs opacity-70">{item.description}</div>
                        </div>
                      )}
                    </button>

                    {isCollapsed && (
                      <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1.5 text-xs rounded-md shadow-theme-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 bg-surface-elevated border border-primary text-primary">
                        <div className="font-medium">{item.label}</div>
                        <div className="text-xs opacity-70 mt-0.5">{item.description}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </nav>

          {/* Footer */}
          <div className="border-t border-primary p-4 space-y-3">
            {/* Language Switcher */}
            <div className="relative group">
              {!isCollapsed ? (
                <button
                  onClick={() => changeLanguage(language === 'en' ? 'id' : 'en')}
                  className="relative w-full h-10 rounded-full bg-gray-200 dark:bg-gray-700 transition-all duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-gray-600"
                  title={`Switch to ${language === 'en' ? 'Bahasa Indonesia' : 'English'}`}
                >
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-600 dark:text-gray-400">
                    EN
                  </span>
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-600 dark:text-gray-400">
                    ID
                  </span>
                  
                  <div
                    className={`absolute top-1 h-8 w-8 rounded-full bg-white shadow-lg transition-all duration-300 ease-in-out flex items-center justify-center ${
                      language === 'en' ? 'right-1' : 'left-1'
                    }`}
                  >
                    <img
                      src={FLAG_SRC[language === 'en' ? 'id' : 'en']}
                      alt={language === 'en' ? 'Bahasa Indonesia' : 'English'}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  </div>
                </button>
              ) : (
                <button
                  onClick={() => changeLanguage(language === 'en' ? 'id' : 'en')}
                  className="w-full flex items-center justify-center p-2.5 rounded-lg text-muted hover:bg-accent hover:bg-opacity-15 hover:text-primary transition-all duration-200"
                  title={`Switch to ${language === 'en' ? 'Bahasa Indonesia' : 'English'}`}
                >
                  <img
                    src={FLAG_SRC[language === 'en' ? 'id' : 'en']}
                    alt={language === 'en' ? 'Bahasa Indonesia' : 'English'}
                    className="w-6 h-6 rounded object-cover border border-primary/20"
                  />
                </button>
              )}

              {isCollapsed && (
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1.5 text-xs rounded-md shadow-theme-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 bg-surface-elevated border border-primary text-primary">
                  <div className="font-medium">Switch to {language === 'en' ? 'Bahasa Indonesia' : 'English'}</div>
                  <div className="text-xs opacity-70 mt-0.5">Click to change language</div>
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              disabled={isTransitioning}
              className={`w-full flex items-center justify-start rounded-lg text-muted hover:bg-accent hover:bg-opacity-15 hover:text-primary ${
                isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2.5 space-x-3'
              } ${isTransitioning ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isCollapsed ? (isDark ? 'Light Mode' : 'Dark Mode') : undefined}
            >
              <Icon name={isDark ? 'Sun' : 'Moon'} size={24} className="flex-shrink-0" />
              {!isCollapsed && <span className="text-sm font-medium">{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
            </button>

            {/* User Profile */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className={`w-full flex items-center pt-2 border-t rounded-lg transition-all duration-200 ${
                  isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2.5 space-x-3'
                } ${isUserMenuOpen ? 'bg-accent bg-opacity-20 border-accent' : 'hover:bg-accent hover:bg-opacity-10 border-primary'}`}
                style={{ borderColor: isUserMenuOpen ? '#A08A48' : isDark ? 'rgba(148,163,184,.2)' : 'rgba(156,163,175,.3)' }}
                title={isCollapsed ? 'User Menu' : undefined}
              >
                <div className="relative">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="User Avatar" className={`rounded-full object-cover border-2 border-accent/30 ${isCollapsed ? 'w-7 h-7' : 'w-6 h-6'}`} />
                  ) : (
                    <Icon name="User" size={isCollapsed ? 28 : 24} style={{ color: '#A08A48' }} />
                  )}
                </div>
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm truncate ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
                      {user ? formatNameWithTitle(user.name, user.profile?.title) : 'Loading...'}
                    </p>
                    <p className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      {user?.profile?.primary_specialization || 'Dentist'}
                    </p>
                  </div>
                )}
                {!isCollapsed && (
                  <Icon name={isUserMenuOpen ? 'ChevronUp' : 'ChevronDown'} size={16} style={{ color: isUserMenuOpen ? '#A08A48' : isDark ? '#94A3B8' : '#6B7280' }} />
                )}
              </button>

              {isUserMenuOpen && (
                <div
                  className="absolute bottom-full left-0 mb-2 w-full min-w-[240px] bg-surface-elevated border border-primary shadow-theme-lg overflow-hidden z-50"
                  style={{ animation: 'slideUp .2s cubic-bezier(0.4,0,0.2,1)', borderRadius: 25 }}
                >
                  <div className="p-4 border-b border-primary bg-gradient-to-r from-accent/10 to-accent/5" style={{ borderTopLeftRadius: 25, borderTopRightRadius: 25 }}>
                    <div className="flex items-center space-x-3">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="User Avatar" className="w-8 h-8 rounded-full object-cover border-2 border-accent/30" />
                      ) : (
                        <Icon name="User" size={32} style={{ color: '#A08A48' }} />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-sm truncate ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
                          {user ? formatNameWithTitle(user.name, user.profile?.title) : 'Memuat data...'}
                        </p>
                        <p className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                          {user?.profile?.primary_specialization || 'Dentist'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="py-2" style={{ borderBottomLeftRadius: 25, borderBottomRightRadius: 25 }}>
                    <button
                      onClick={() => { handleNavigation('/dentist-portal/dentist-settings'); setIsUserMenuOpen(false); }}
                      className="flex items-center px-4 py-3 text-left hover:bg-accent hover:bg-opacity-15"
                      style={{ borderRadius: 15, margin: '0 12px', width: 'calc(100% - 24px)' }}
                    >
                      <Icon name="UserCog" size={18} className="mr-3 text-muted" />
                      <div>
                        <div className="font-medium text-sm text-primary">{t('sidebar.settings')}</div>
                        <div className="text-xs text-secondary">Manage profile & credentials</div>
                      </div>
                    </button>

                    <hr className="my-1 border-primary opacity-30" />

                    <button
                      onClick={() => { handleLogout(); setIsUserMenuOpen(false); }}
                      className="flex items-center px-4 py-3 text-left hover:bg-red-500 hover:bg-opacity-15 text-red-400 hover:text-red-300"
                      style={{ borderRadius: 15, margin: '0 12px', width: 'calc(100% - 24px)' }}
                    >
                      <Icon name="LogOut" size={18} className="mr-3" />
                      <div>
                        <div className="font-medium text-sm">{t('sidebar.logout')}</div>
                        <div className="text-xs opacity-70">Sign out from account</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* /Footer */}
        </div>
      </div>
    </>
  );
};

export default SideBar;