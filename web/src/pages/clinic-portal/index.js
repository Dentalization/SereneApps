// Clinic Portal Route Exports
// Import all clinic portal pages for routing

export { default as ClinicDashboard } from './home';
export { default as ClinicSchedule } from './schedule';
export { default as ClinicPatients } from './patients';
export { default as ClinicStaff } from './staff';
export { default as ClinicBranches } from './branches';
export { default as ClinicBilling } from './billing';
export { default as ClinicInventory } from './inventory';
export { default as ClinicReports } from './reports';
export { default as ClinicXCore } from './x-core';
export { default as ClinicPublicProfile } from './public-profile';
export { default as ClinicSettings } from './settings';

// UI Components
export { default as ClinicSideBar } from './ui/SideBar-Clinic';

// Sample Route Configuration for React Router
export const clinicRoutes = [
  {
    path: '/clinic-portal',
    children: [
      { path: '', element: 'ClinicDashboard' }, // Default to home/dashboard
      { path: 'home', element: 'ClinicDashboard' },
      { path: 'schedule', element: 'ClinicSchedule' },
      { path: 'patients', element: 'ClinicPatients' },
      { path: 'staff', element: 'ClinicStaff' },
      { path: 'branches', element: 'ClinicBranches' },
      { path: 'billing', element: 'ClinicBilling' },
      { path: 'inventory', element: 'ClinicInventory' },
      { path: 'reports', element: 'ClinicReports' },
      { path: 'x-core', element: 'ClinicXCore' },
      { path: 'public-profile', element: 'ClinicPublicProfile' },
      { path: 'settings', element: 'ClinicSettings' }
    ]
  }
];

// Role-based Access Control Configuration
export const rolePermissions = {
  owner: ['dashboard', 'schedule', 'patients', 'staff', 'branches', 'inventory', 'reports', 'x-core', 'public-profile', 'settings'],
  clinic_owner: ['dashboard', 'schedule', 'patients', 'staff', 'branches', 'inventory', 'reports', 'x-core', 'public-profile', 'settings'],
  clinical_director: ['x-core'],
  authorized_clinic_doctor: ['x-core'],
  clinic_admin_xcore: ['x-core'],
  manager: ['dashboard', 'schedule', 'patients', 'staff', 'branches', 'billing', 'inventory', 'reports', 'public-profile', 'settings'],
  front_office: ['dashboard', 'schedule', 'patients'],
  nurse: ['dashboard', 'schedule', 'patients', 'inventory'],
  cashier: ['dashboard', 'billing'],
  staff: ['dashboard', 'schedule', 'patients', 'inventory', 'reports', 'settings'] // fallback
};

// Menu Configuration (used by sidebar)
export const menuConfig = {
  items: [
    { 
      id: 'dashboard', 
      path: '/clinic-portal/home',
      icon: 'Home',
      roles: ['front_office', 'nurse', 'cashier', 'manager', 'owner', 'staff']
    },
    { 
      id: 'schedule', 
      path: '/clinic-portal/schedule',
      icon: 'Calendar',
      roles: ['front_office', 'nurse', 'manager', 'owner', 'staff']
    },
    { 
      id: 'patients', 
      path: '/clinic-portal/patients',
      icon: 'Users',
      roles: ['front_office', 'nurse', 'manager', 'owner', 'staff']
    },
    { 
      id: 'staff', 
      path: '/clinic-portal/staff',
      icon: 'UserCog',
      roles: ['manager', 'owner', 'staff']
    },
    { 
      id: 'branches', 
      path: '/clinic-portal/branches',
      icon: 'Building2',
      roles: ['manager', 'owner', 'staff']
    },
    { 
      id: 'billing', 
      path: '/clinic-portal/billing',
      icon: 'Receipt',
      roles: ['cashier', 'manager']
    },
    { 
      id: 'inventory', 
      path: '/clinic-portal/inventory',
      icon: 'Boxes',
      roles: ['nurse', 'manager', 'owner', 'staff']
    },
    { 
      id: 'reports', 
      path: '/clinic-portal/reports',
      icon: 'BarChart3',
      roles: ['manager', 'owner', 'staff']
    },
    {
      id: 'x-core',
      path: '/clinic-portal/x-core',
      icon: 'Cpu',
      roles: ['owner', 'clinic_owner', 'clinical_director', 'authorized_clinic_doctor', 'clinic_admin_xcore']
    },
    { 
      id: 'public-profile', 
      path: '/clinic-portal/public-profile',
      icon: 'Globe',
      roles: ['manager', 'owner', 'staff']
    },
    { 
      id: 'settings', 
      path: '/clinic-portal/settings',
      icon: 'Settings',
      roles: ['manager', 'owner', 'staff']
    }
  ]
};
