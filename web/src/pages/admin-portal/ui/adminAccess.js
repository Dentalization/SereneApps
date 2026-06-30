export const ADMIN_BASE_ROLES = [
  'admin',
  'super_admin',
  'business_manager',
  'platform_manager',
  'finance_manager',
  'customer_success',
  'customer_success_manager',
  'technical_support',
  'ai_engineer',
  'compliance_officer'
];

export const ADMIN_ROLE_ALIASES = {
  customer_success: 'customer_success_manager'
};

export const ADMIN_ROUTE_ROLES = {
  dashboard: ['admin', 'super_admin', 'business_manager', 'platform_manager', 'finance_manager', 'customer_success_manager', 'compliance_officer'],
  clinics: ['admin', 'super_admin', 'business_manager', 'customer_success_manager'],
  dentists: ['admin', 'super_admin', 'customer_success_manager'],
  revenue: ['admin', 'super_admin', 'finance_manager', 'business_manager'],
  ai: ['admin', 'super_admin', 'platform_manager', 'ai_engineer'],
  support: ['admin', 'super_admin', 'technical_support', 'customer_success_manager'],
  diagnostics: ['admin', 'super_admin', 'technical_support', 'customer_success_manager', 'platform_manager', 'compliance_officer'],
  analytics: ['admin', 'super_admin', 'business_manager', 'platform_manager', 'finance_manager'],
  system: ['admin', 'super_admin'],
  compliance: ['admin', 'super_admin', 'compliance_officer'],
  partnership: ['admin', 'super_admin', 'business_manager', 'platform_manager'],
  content: ['admin', 'super_admin', 'customer_success_manager', 'business_manager'],
  profile: ADMIN_BASE_ROLES,
  notifications: ADMIN_BASE_ROLES
};

export function normalizeAdminRoles(userOrRoles) {
  const rawRoles = Array.isArray(userOrRoles)
    ? userOrRoles
    : userOrRoles?.roles && userOrRoles.roles.length
      ? userOrRoles.roles
      : userOrRoles?.role
        ? [userOrRoles.role]
        : [];

  const normalized = new Set();
  for (const role of rawRoles) {
    if (!role) continue;
    normalized.add(role);
    if (ADMIN_ROLE_ALIASES[role]) normalized.add(ADMIN_ROLE_ALIASES[role]);
  }
  if (!normalized.size) normalized.add('admin');
  return [...normalized];
}

export function hasAdminAccess(userOrRoles, allowedRoles = ADMIN_BASE_ROLES) {
  const roles = normalizeAdminRoles(userOrRoles);
  return roles.includes('admin') || roles.includes('super_admin') || roles.some(role => allowedRoles.includes(role));
}

export function adminTabFromPath(pathname, fallback, pathMap) {
  const entries = Object.entries(pathMap).sort((left, right) => right[0].length - left[0].length);
  return entries.find(([path]) => pathname === path || pathname.startsWith(`${path}/`))?.[1] || fallback;
}

export const ADMIN_TAB_PATHS = {
  dentist: {
    directory: '/admin/dentist-management',
    verification: '/admin/dentist-management/verification',
    network: '/admin/dentist-management/network'
  },
  revenue: {
    overview: '/admin/revenue-billing',
    transactions: '/admin/revenue-billing/payments',
    invoices: '/admin/revenue-billing/subscriptions',
    settings: '/admin/revenue-billing/settings'
  },
  ai: {
    overview: '/admin/ai-platform',
    usage: '/admin/ai-platform/usage',
    models: '/admin/ai-platform/models',
    billing: '/admin/ai-platform/billing'
  },
  support: {
    tickets: '/admin/support-helpdesk',
    liveChat: '/admin/support-helpdesk/communication',
    knowledgeBase: '/admin/support-helpdesk/knowledge-base'
  },
  system: {
    health: '/admin/system-administration',
    users: '/admin/system-administration/users',
    audit: '/admin/system-administration/audit',
    integrations: '/admin/system-administration/config',
    monitoring: '/admin/system-administration/monitoring'
  },
  compliance: {
    overview: '/admin/compliance-security',
    audit: '/admin/compliance-security/audit',
    standards: '/admin/compliance-security/regulatory',
    privacy: '/admin/compliance-security/security'
  },
  partnership: {
    overview: '/admin/partnership',
    directory: '/admin/partnership/directory',
    agreements: '/admin/partnership/api',
    integrations: '/admin/partnership/integrations'
  },
  content: {
    overview: '/admin/content-management',
    library: '/admin/content-management/library',
    workflow: '/admin/content-management/education',
    media: '/admin/content-management/media'
  },
  clinic: {
    all: '/admin/clinic-management',
    pending: '/admin/clinic-management/verification',
    owners: '/admin/clinic-management/owners',
    compliance: '/admin/clinic-management/compliance',
    actions: '/admin/clinic-management/actions',
    audit: '/admin/clinic-management/audit',
    analytics: '/admin/clinic-management/analytics'
  }
};

export function invertPathMap(pathMap) {
  return Object.fromEntries(Object.entries(pathMap).map(([tab, path]) => [path, tab]));
}
