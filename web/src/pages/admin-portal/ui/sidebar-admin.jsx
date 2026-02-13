import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import AppIcon from '../../../components/AppIcon';
import AppImage from '../../../components/AppImage';
import { resolveMediaUrl } from '../../../utils/media';
import { getAdminNotificationsForRoles } from './adminNotificationsData';

const FLAG_SRC = {
  en: '/assets/images/ukflag.png',
  id: '/assets/images/idflag.jpg',
};

const AdminSideBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { toggleTheme, isDark, isTransitioning } = useTheme();
  const { t, language, changeLanguage } = useLanguage();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);


  const avatarPath = user?.avatar_url || user?.profile?.avatar_url;
  const avatarUrl = resolveMediaUrl(avatarPath);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('sidebar-collapsed', isCollapsed);
    document.documentElement.style.setProperty('--sidebar-width', isCollapsed ? '7rem' : '20rem');
  }, [isCollapsed]);

  const formatNameWithTitle = (name, title) => {
    if (!name) return 'Admin User';
    return title ? `${title} ${name}` : name;
  };

  const getUserRole = () => user?.roles?.[0] || user?.role || 'admin';
  const userRole = getUserRole();
  const resolvedRoles = useMemo(() => {
    const roles = user?.roles && user.roles.length ? [...user.roles] : [];
    if (!roles.length && user?.role) roles.push(user.role);
    if (!roles.length) roles.push('admin');
    return roles;
  }, [user?.roles, user?.role]);
  const isSuperAdmin = resolvedRoles.includes('super_admin');
  const roleNotifications = useMemo(
    () => getAdminNotificationsForRoles(resolvedRoles, { includeAll: isSuperAdmin }),
    [resolvedRoles, isSuperAdmin]
  );
  const unreadNotifications = useMemo(
    () => roleNotifications.filter((item) => !item.read).length,
    [roleNotifications]
  );

  const menuItems = [
    {
      id: 'dashboard',
      label: t('admin.nav.dashboard') || 'Dashboard',
      icon: 'LayoutDashboard',
      path: '/admin',
      exact: true,
      description: t('admin.pages.dashboard.subtitle') || 'Executive Summary & Platform Overview',
      roles: ['super_admin', 'business_manager', 'platform_manager', 'compliance_officer'], // All admin roles can see dashboard
      badge: null
    },
    {
      id: 'clinicManagement',
      label: t('admin.nav.clinicManagement') || 'Clinic Management',
      icon: 'Building2',
      path: '/admin/clinic-management',
      description: t('admin.pages.clinics.subtitle') || 'Clinic Directory, Verification & Onboarding',
      roles: ['super_admin', 'business_manager', 'customer_success_manager'], // Customer success and business focused
      submenu: [
        { label: t('admin.nav.clinicDirectory') || 'Clinic Directory', icon: 'Building', path: '/admin/clinic-management', exact: true },
        { label: t('admin.nav.clinicVerification') || 'Clinic Verification', icon: 'Shield', path: '/admin/clinic-management/verification' },
        { label: t('admin.nav.ownerAccounts') || 'Owner Accounts', icon: 'Crown', path: '/admin/clinic-management/owners' }
      ]
    },
    {
      id: 'dentistManagement',
      label: t('admin.nav.dentistManagement') || 'Dentist Management',
      icon: 'UserCheck',
      path: '/admin/dentist-management',
      description: t('admin.pages.dentists.subtitle') || 'Professional Network & Credential Verification',
      roles: ['super_admin', 'customer_success_manager'], // Limited to customer success and super admin
      submenu: [
        { label: t('admin.nav.dentistDirectory') || 'Dentist Directory', icon: 'Users', path: '/admin/dentist-management', exact: true },
        { label: t('admin.nav.verificationQueue') || 'Verification Queue', icon: 'FileCheck', path: '/admin/dentist-management/verification', badge: '15' },
        { label: t('admin.nav.professionalNetwork') || 'Professional Network', icon: 'Network', path: '/admin/dentist-management/network' }
      ]
    },
    {
      id: 'revenueBilling',
      label: t('admin.nav.revenueBilling') || 'Revenue & Billing',
      icon: 'DollarSign',
      path: '/admin/revenue-billing',
      description: t('admin.pages.revenue.subtitle') || 'Payment Processing & Financial Analytics',
      roles: ['super_admin', 'finance_manager', 'business_manager'], // Financial roles only
      submenu: [
        { label: t('admin.nav.revenueDashboard') || 'Revenue Dashboard', icon: 'TrendingUp', path: '/admin/revenue-billing', exact: true },
        { label: t('admin.nav.paymentProcessing') || 'Payment Processing', icon: 'CreditCard', path: '/admin/revenue-billing/payments' },
        { label: t('admin.nav.subscriptionManagement') || 'Subscription Management', icon: 'Repeat', path: '/admin/revenue-billing/subscriptions' }
      ]
    },
    {
      id: 'aiPlatform',
      label: t('admin.nav.aiPlatform') || 'AI Platform',
      icon: 'Brain',
      path: '/admin/ai-platform',
      description: t('admin.pages.aiPlatform.subtitle') || 'AI Usage Monitoring & Model Management',
      roles: ['super_admin', 'platform_manager', 'ai_engineer'], // Technical roles only
      submenu: [
        { label: t('admin.nav.aiUsageAnalytics') || 'AI Usage Analytics', icon: 'BarChart3', path: '/admin/ai-platform', exact: true },
        { label: t('admin.nav.modelManagement') || 'Model Management', icon: 'Settings', path: '/admin/ai-platform/models' },
        { label: t('admin.nav.aiBilling') || 'AI Billing', icon: 'Calculator', path: '/admin/ai-platform/billing' }
      ]
    },
    {
      id: 'supportHelpdesk',
      label: t('admin.nav.supportHelpdesk') || 'Support & Helpdesk',
      icon: 'HeadphonesIcon',
      path: '/admin/support-helpdesk',
      description: t('admin.pages.support.subtitle') || 'Customer Support & Success Management',
      roles: ['super_admin', 'technical_support', 'customer_success_manager'], // Support roles only
      submenu: [
        { label: t('admin.nav.ticketManagement') || 'Ticket Management', icon: 'Ticket', path: '/admin/support-helpdesk', exact: true, badge: '23' },
        { label: t('admin.nav.knowledgeBase') || 'Knowledge Base', icon: 'BookOpen', path: '/admin/support-helpdesk/knowledge-base' },
        { label: t('admin.nav.communicationCenter') || 'Communication Center', icon: 'MessageSquare', path: '/admin/support-helpdesk/communication' }
      ]
    },
    {
      id: 'analytics',
      label: t('admin.nav.analytics') || 'Analytics & Reports',
      icon: 'Analytics',
      path: '/admin/analytics-reporting',
      description: t('admin.pages.analytics.subtitle') || 'Business Intelligence & Data Insights',
      roles: ['super_admin', 'business_manager', 'platform_manager', 'finance_manager'], // Business and platform roles
      submenu: [
        { label: t('admin.nav.businessIntelligence') || 'Business Intelligence', icon: 'TrendingUp', path: '/admin/analytics-reporting', exact: true },
        { label: t('admin.nav.performanceMetrics') || 'Performance Metrics', icon: 'Activity', path: '/admin/analytics-reporting/performance' },
        { label: t('admin.nav.financialReports') || 'Financial Reports', icon: 'FileBarChart', path: '/admin/analytics-reporting/financial' }
      ]
    },
    {
      id: 'systemAdministration',
      label: t('admin.nav.systemAdministration') || 'System Administration',
      icon: 'Settings2',
      path: '/admin/system-administration',
      description: t('admin.pages.system.subtitle') || 'User Management & Platform Configuration',
      roles: ['super_admin'], // Super admin only - highest level access
      submenu: [
        { label: t('admin.nav.userManagement') || 'User Management', icon: 'UserCog', path: '/admin/system-administration', exact: true },
        { label: t('admin.nav.systemConfiguration') || 'System Configuration', icon: 'Cog', path: '/admin/system-administration/config' },
        { label: t('admin.nav.monitoring') || 'Monitoring & Alerts', icon: 'Monitor', path: '/admin/system-administration/monitoring' }
      ]
    },
    {
      id: 'complianceSecurity',
      label: t('admin.nav.complianceSecurity') || 'Compliance & Security',
      icon: 'ShieldCheck',
      path: '/admin/compliance-security',
      description: t('admin.pages.compliance.subtitle') || 'Data Privacy & Regulatory Compliance',
      roles: ['super_admin', 'compliance_officer'], // Compliance specific roles only
      submenu: [
        { label: t('admin.nav.dataPrivacy') || 'Data Privacy', icon: 'Lock', path: '/admin/compliance-security', exact: true },
        { label: t('admin.nav.securityCenter') || 'Security Center', icon: 'Shield', path: '/admin/compliance-security/security' },
        { label: t('admin.nav.regulatoryCompliance') || 'Regulatory Compliance', icon: 'FileText', path: '/admin/compliance-security/regulatory' }
      ]
    },
    {
      id: 'partnerships',
      label: t('admin.nav.partnerships') || 'Partnerships',
      icon: 'Handshake',
      path: '/admin/partnership',
      description: t('admin.pages.partnerships.subtitle') || 'Integration Partners & API Management',
      roles: ['super_admin', 'business_manager', 'platform_manager'], // Business and platform roles
      submenu: [
        { label: t('admin.nav.partnerDirectory') || 'Partner Directory', icon: 'Building', path: '/admin/partnership', exact: true },
        { label: t('admin.nav.apiManagement') || 'API Management', icon: 'Code', path: '/admin/partnership/api' },
        { label: t('admin.nav.integrations') || 'Integrations', icon: 'Puzzle', path: '/admin/partnership/integrations' }
      ]
    },
    {
      id: 'contentManagement',
      label: t('admin.nav.contentManagement') || 'Content Management',
      icon: 'FileImage',
      path: '/admin/content-management',
      description: t('admin.pages.content.subtitle') || 'Marketing & Educational Resources',
      roles: ['super_admin', 'customer_success_manager', 'business_manager'], // Customer facing roles
      submenu: [
        { label: t('admin.nav.marketingContent') || 'Marketing Content', icon: 'Megaphone', path: '/admin/content-management', exact: true },
        { label: t('admin.nav.educationalResources') || 'Educational Resources', icon: 'GraduationCap', path: '/admin/content-management/education' },
        { label: t('admin.nav.resourceLibrary') || 'Resource Library', icon: 'Library', path: '/admin/content-management/library' }
      ]
    }
  ];

  const hasRoleAccess = (itemRoles = []) => {
    // Check if user role exactly matches any of the allowed roles
    return itemRoles.includes(userRole);
  };

  const filteredMenuItems = menuItems.filter(item => hasRoleAccess(item.roles));

  const handleNavigation = (path) => navigate(path);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/');
    }
  };

  const isActive = (item) => (item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path));



  // --- KOMPONEN TOMBOL NOTIFIKASI ---
  const NotificationButton = ({ collapsed }) => (
    <button
      onClick={() => navigate('/admin/notifications')}
      className={`relative group p-2 rounded-lg text-muted hover:bg-accent hover:bg-opacity-15 transition-all duration-200 ${collapsed ? 'mt-2' : 'mr-1'}`}
      title={t('common.notifications') || 'Notifications'}
    >
      {/* Icon Bell */}
      <AppIcon name="Bell" size={collapsed ? 20 : 18} />

      {/* Badge Merah (Jika ada notif) */}
      {unreadNotifications > 0 && (
        <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-surface-elevated"></span>
        </span>
      )}
    </button>
  );

  return (
    <div className="sticky top-0 h-screen p-4" style={{ animation: 'slideUp 0.3s ease-out' }}>
      <div
        className={`h-full flex flex-col rounded-3xl bg-surface-elevated border border-primary shadow-theme-lg theme-transition ${isCollapsed ? 'w-20' : 'w-72'}`}
        style={{ transition: 'width .4s cubic-bezier(0.4,0,0.2,1)' }}
      >
        {/* Header (custom as requested) */}
        <div className={`border-b border-primary theme-transition ${isCollapsed ? 'px-2 py-3' : 'px-6 py-4'}`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            <div className="flex items-center space-x-3">
              <div className="flex flex-col items-center">
                <AppImage
                  src="/icon.png"
                  alt="SereneAI Logo"
                  className={isCollapsed ? 'w-12 h-12 object-contain' : 'w-16 h-16 object-contain'}
                />
                {isCollapsed && (
                  <>
                    <button
                      onClick={() => setIsCollapsed(false)}
                      className="mt-1 p-1 rounded text-muted hover:bg-accent hover:bg-opacity-15"
                    >
                      <AppIcon name="ChevronRight" size={16} />
                    </button>

                    {/* LOKASI ICON NOTIF SAAT COLLAPSED */}
                    <div className="my-1 w-8 border-t border-primary/20"></div>
                    <NotificationButton collapsed={true} />
                  </>
                )}
              </div>
              {!isCollapsed && (
                <div>
                  <h1 className="text-lg font-semibold text-primary">SereneAI</h1>
                  <p className="text-xs text-secondary">Admin Portal</p>
                </div>
              )}
            </div>

            {/* LOKASI ICON NOTIF SAAT EXPANDED */}
            {!isCollapsed && (
              <div className="flex items-center">
                <NotificationButton collapsed={false} />
                <button
                  onClick={() => setIsCollapsed(true)}
                  className="p-2 rounded-lg text-muted hover:bg-accent hover:bg-opacity-15 ml-1"
                >
                  <AppIcon name="ChevronLeft" size={18} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        {!isCollapsed && (
          <div className="p-4">
            <div className="relative">
              <AppIcon
                name="Search"
                size={16}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                placeholder={t('admin.sidebar.searchPlaceholder') || 'Search admin...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-muted/30 border border-border/40 rounded-lg text-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto bg-surface-elevated">
          <div className={isCollapsed ? 'space-y-2' : 'space-y-1'}>
            {filteredMenuItems
              .filter(item => searchQuery === '' || (item.label || '').toLowerCase().includes(searchQuery.toLowerCase()))
              .map((item) => {
                const active = isActive(item);
                return (
                  <div key={item.id} className="relative group">
                    <button
                      onClick={() => handleNavigation(item.path)}
                      className={`w-full flex items-center rounded-lg ${isCollapsed ? 'justify-center p-3' : 'px-3 py-2.5 space-x-3'} ${active
                        ? 'bg-accent text-white shadow-lg'
                        : 'text-muted hover:bg-accent hover:bg-opacity-15 hover:text-primary'
                        } transition-all duration-200`}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <div className="w-5 h-5 flex items-center justify-center">
                        <AppIcon name={item.icon} size={20} />
                      </div>
                      {!isCollapsed && (
                        <div className="flex-1 text-left">
                          <div className="font-medium text-sm">{item.label}</div>
                          <div className="text-xs opacity-70">{item.description}</div>
                        </div>
                      )}
                      {!isCollapsed && (
                        <div className="flex items-center space-x-2">
                          {item.badge && <span className="px-1.5 py-0.5 bg-accent text-white text-xs rounded-full">{item.badge}</span>}
                        </div>
                      )}
                      {active && !isCollapsed && (
                        <div className="w-1 h-6 bg-white rounded-full opacity-80"></div>
                      )}
                    </button>

                    {isCollapsed && (
                      <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-2 text-xs rounded-xl shadow-theme-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 bg-surface-elevated border border-primary text-primary max-w-xs">
                        <div className="font-medium">{item.label}</div>
                        <div className="text-xs opacity-70 mt-1">{item.description}</div>
                        {item.badge && <div className="text-xs opacity-70 mt-1">{item.badge} pending</div>}
                      </div>
                    )}


                  </div>
                );
              })}
          </div>

          {!isCollapsed && (
            <div className="mt-6 px-3">
              <div className="bg-gradient-to-r from-accent/10 to-accent/5 border border-accent/20 rounded-xl p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <AppIcon name="Shield" size={14} className="text-accent" />
                  <span className="text-xs font-semibold text-accent uppercase tracking-wide">
                    {t('common.role') || 'Role'}
                  </span>
                </div>
                <div className="text-sm font-medium text-primary capitalize">{userRole.replace('_', ' ')}</div>
                <div className="text-xs text-secondary mt-1">{filteredMenuItems.length} menu accessible</div>
              </div>
            </div>
          )}
        </nav>

        {/* Footer Controls */}
        <div className="border-t border-primary p-4 space-y-3">
          {/* Language Switcher */}
          <div className="relative group">
            {!isCollapsed ? (
              <button
                onClick={() => changeLanguage(language === 'en' ? 'id' : 'en')}
                className="relative w-full h-10 rounded-full bg-gray-200 dark:bg-gray-700 transition-all duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-gray-600"
                title={`Switch to ${language === 'en' ? 'Bahasa Indonesia' : 'English'}`}
              >
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-600 dark:text-gray-400">EN</span>
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-600 dark:text-gray-400">ID</span>

                <div
                  className={`absolute top-1 h-8 w-8 rounded-full bg-white shadow-lg transition-all duration-300 ease-in-out flex items-center justify-center ${language === 'en' ? 'right-1' : 'left-1'
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
            className={`w-full flex items-center justify-start rounded-lg text-muted hover:bg-accent hover:bg-opacity-15 hover:text-primary ${isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2.5 space-x-3'
              } ${isTransitioning ? 'opacity-50 cursor-not-allowed' : ''} transition-all duration-200`}
            title={isCollapsed ? (isDark ? 'Light Mode' : 'Dark Mode') : undefined}
          >
            <AppIcon name={isDark ? 'Sun' : 'Moon'} size={24} className="flex-shrink-0" />
            {!isCollapsed && (
              <span className="text-sm font-medium">
                {isDark ? (t('admin.ui.lightMode') || 'Light Mode') : (t('admin.ui.darkMode') || 'Dark Mode')}
              </span>
            )}
          </button>

          {/* User Profile */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className={`w-full flex items-center pt-2 border-t rounded-lg transition-all duration-200 ${isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2.5 space-x-3'
                } ${isUserMenuOpen ? 'bg-accent bg-opacity-20 border-accent' : 'hover:bg-accent hover:bg-opacity-10 border-primary'}`}
              style={{ borderColor: isUserMenuOpen ? '#A08A48' : isDark ? 'rgba(148,163,184,.2)' : 'rgba(156,163,175,.3)' }}
              title={isCollapsed ? 'User Menu' : undefined}
            >
              <div className="relative">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="User Avatar" className={`rounded-full object-cover border-2 border-accent/30 ${isCollapsed ? 'w-7 h-7' : 'w-6 h-6'}`} />
                ) : (
                  <AppIcon name="User" size={isCollapsed ? 28 : 24} style={{ color: '#A08A48' }} />
                )}
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm truncate ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{formatNameWithTitle(user?.name, 'Admin')}</p>
                  <p className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{user?.email || 'SereneAI Admin'}</p>
                </div>
              )}
              {!isCollapsed && (
                <AppIcon name={isUserMenuOpen ? 'ChevronUp' : 'ChevronDown'} size={16} style={{ color: isUserMenuOpen ? '#A08A48' : isDark ? '#94A3B8' : '#6B7280' }} />
              )}
            </button>

            {isUserMenuOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-full min-w-[240px] bg-surface-elevated border border-primary shadow-theme-lg overflow-hidden z-50" style={{ animation: 'slideUp .2s cubic-bezier(0.4,0,0.2,1)', borderRadius: 25 }}>
                <div className="p-4 border-b border-primary bg-gradient-to-r from-accent/10 to-accent/5" style={{ borderColor: isDark ? 'rgba(148,163,184,.2)' : 'rgba(156,163,175,.3)' }}>
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="User Avatar" className="w-12 h-12 rounded-full object-cover border-2 border-accent/30" />
                      ) : (
                        <AppIcon name="User" size={48} style={{ color: '#A08A48' }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-base truncate ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{formatNameWithTitle(user?.name, 'Admin ')}</p>
                      <p className={`text-sm truncate ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>{user?.email || 'admin@sereneai.com'}</p>
                    </div>
                  </div>
                </div>

                <div className="py-2">
                  <button
                    onClick={() => {
                      navigate('/admin/profile');
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full flex items-center px-4 py-3 text-left hover:bg-accent hover:bg-opacity-10 transition-colors group"
                  >
                    <AppIcon name="User" size={20} className="mr-3 text-muted group-hover:text-accent" />
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>{t('admin.sidebar.profile') || 'Profile Settings'}</p>
                      <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>Manage your admin account</p>
                    </div>
                  </button>

                  <button onClick={() => navigate('/admin/preferences')} className="w-full flex items-center px-4 py-3 text-left hover:bg-accent hover:bg-opacity-10 transition-colors group">
                    <AppIcon name="Settings" size={20} className="mr-3 text-muted group-hover:text-accent" />
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>{t('admin.sidebar.preferences') || 'Preferences'}</p>
                      <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>Customize your admin experience</p>
                    </div>
                  </button>

                  <div className="border-t mx-4 my-2" style={{ borderColor: isDark ? 'rgba(148,163,184,.2)' : 'rgba(156,163,175,.3)' }} />

                  <button onClick={handleLogout} className="w-full flex items-center px-4 py-3 text-left hover:bg-red-50 hover:text-red-600 transition-colors group">
                    <AppIcon name="LogOut" size={20} className="mr-3 text-red-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-600">{t('admin.sidebar.logout') || 'Sign Out'}</p>
                      <p className="text-xs text-red-400">Sign out from admin portal</p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSideBar;
