export function redirectByRole(roles = []) {
  console.log('redirectByRole called with roles:', roles);
  const has = (r) => roles?.includes(r);
  console.log('Checking roles:', { 
    admin: has('admin'), 
    dentist: has('dentist'), 
    patient: has('patient'),
    owner: has('owner'),
    manager: has('manager'),
    front_office: has('front_office'),
    nurse: has('nurse'),
    cashier: has('cashier'),
    staff: has('staff')
  });
  
  if (has('admin') || has('super_admin') || has('business_manager') || has('platform_manager') || 
      has('finance_manager') || has('customer_success') || has('technical_support') || 
      has('ai_engineer') || has('compliance_officer')) {
    console.log('Redirecting to admin portal: /admin');
    return '/admin';
  }
  if (has('dentist')) {
    console.log('Redirecting to dentist home: /dentist-portal/home');
    return '/dentist-portal/home';
  }
  
  // Clinic roles - redirect to clinic portal
  const clinicRoles = ['owner', 'manager', 'front_office', 'nurse', 'cashier', 'staff'];
  if (clinicRoles.some(role => has(role))) {
    console.log('Redirecting to clinic portal: /clinic-portal/home');
    return '/clinic-portal/home';
  }
  
  // Patients use the mobile app; guide them to install/open it
  if (has('patient')) {
    console.log('Redirecting to get-the-app: /get-the-app');
    return '/get-the-app';
  }
  console.log('No specific role found, redirecting to homepage: /');
  return '/';
}
