import React, { Suspense } from "react";
import { BrowserRouter, Routes as RouterRoutes, Route, Navigate } from "react-router-dom";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
import ProtectedRoute from 'components/auth/ProtectedRoute';

import NotFound from 'pages/NotFound';
import ForPatientsPage from './pages/for-patients';
import ProductPlatform from './pages/product-platform';
import ClinicalResearch from './pages/clinical-research';
import Homepage from './pages/homepage';
import ForDentists from './pages/for-dentists';
import SereneAIPage from './pages/serene-ai';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import DentistPortal from './pages/dentist-portal';
import DentistHome from './pages/dentist-portal/home';
import PatientManagement from './pages/dentist-portal/patient';
import DentistSchedule from './pages/dentist-portal/schedule';
import Teledentistry from './pages/dentist-portal/teledentistry';
import DentistSettings from './pages/dentist-portal/dentist-settings';
import Reports from './pages/dentist-portal/reports';
import AIAnalysis from './pages/dentist-portal/ai';
import XCore from './pages/dentist-portal/x-core';
import SharedStudyView from './pages/dentist-portal/x-core/SharedStudyView';
import DentistPracticeServices from './pages/dentist-portal/practice/MyServices';
import DentistPracticeAvailability from './pages/dentist-portal/practice/Availability';
import DentistPracticeEarnings from './pages/dentist-portal/practice/Earnings';
import ClinicServicesView from './pages/dentist-portal/profile/ClinicServices';
import PatientEMRList from './pages/dentist-portal/patient-emr';
import ElectronicMedicalRecordScreen from './pages/dentist-portal/patient-emr/ElectronicMedicalRecordScreen';
import NotificationScreenDentist from './pages/dentist-portal/ui/NotificationScreenDentist';
import GetTheApp from './pages/get-the-app';
import PatientAppointments from './pages/patient-portal/appointments';
import PatientTeledentistry from './pages/patient-portal/teledentistry';
import PricingPage from './pages/prices';

import ClinicDashboard from './pages/clinic-portal/home';
import ClinicSchedule from './pages/clinic-portal/schedule';
import ClinicPatients from './pages/clinic-portal/patients';
import ClinicBilling from './pages/clinic-portal/billing';
import ClinicInventory from './pages/clinic-portal/inventory';
import ClinicReports from './pages/clinic-portal/reports';
import ClinicPublicProfile from './pages/clinic-portal/public-profile';
import ClinicSettings from './pages/clinic-portal/settings';
import StaffManagement from './pages/clinic-portal/staff';
import BranchManagement from './pages/clinic-portal/branches';
import NotificationScreenClinic from './pages/clinic-portal/ui/NotificationScreenClinic';
import ClinicTeledentistry from './pages/clinic-portal/teledentistry';
import ClinicXCore from './pages/clinic-portal/x-core';

import AdminDashboard from './pages/admin-portal/home';
import ClinicManagement from './pages/admin-portal/clinic-management';
import CreateClinic from './pages/admin-portal/clinic-management/components/CreateClinic';
import ClinicDetail from './pages/admin-portal/clinic-management/components/ClinicDetail';
import DentistManagement from './pages/admin-portal/dentist-management';
import RevenueBilling from './pages/admin-portal/revenue-billing';
import AIPlatform from './pages/admin-portal/ai-platform';
import SupportHelpdesk from './pages/admin-portal/support-helpdesk';
import SystemAdministration from './pages/admin-portal/system-administration';
import ComplianceSecurity from './pages/admin-portal/compliance-security';
import Partnership from './pages/admin-portal/partnership';
import ContentManagement from './pages/admin-portal/content-management';
import AdminProfile from './pages/admin-portal/admin-profile';
import AnalyticReport from './pages/admin-portal/analytic-report';
import NotificationScreenAdmin from './pages/admin-portal/ui/NotificationScreenAdmin';
import AppointmentDiagnosticsDashboard from './pages/admin-portal/communications-diagnostics';
import AdminRouteGate from './pages/admin-portal/ui/AdminRouteGate';
import { ADMIN_ROUTE_ROLES } from './pages/admin-portal/ui/adminAccess';

const Routes = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ScrollToTop />
        <Suspense fallback={null}>
          <RouterRoutes>
          {/* Define your route here */}
          <Route path="/" element={<Homepage />} />
          <Route path="/homepage" element={<Navigate to="/" replace />} />
          <Route path="/for-patients" element={<ForPatientsPage />} />
          <Route path="/for-dentists" element={<ForDentists />} />

          {/* Auth Routes - support both /login and /auth/login */}
          <Route path="/login" element={<Login />} />
          <Route path="/auth/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth/register" element={<Register />} />
          <Route path="/shared/:token" element={<SharedStudyView />} />

          {/* Protected app routes */}
          <Route element={<ProtectedRoute allow={["dentist"]} />}>
            <Route path="/dentist-portal" element={<DentistPortal />} />
            <Route path="/dentist-portal/home" element={<DentistHome />} />
            <Route path="/dentist-portal/patient" element={<PatientManagement />} />
            <Route path="/dentist-portal/teledentistry" element={<Teledentistry />} />
            <Route path="/dentist-portal/notifications" element={<NotificationScreenDentist />} />
            <Route path="/dentist-portal/schedule" element={<DentistSchedule />} />
            <Route path="/dentist-portal/dentist-settings" element={<DentistSettings />} />
            <Route path="/dentist-portal/reports" element={<Reports />} />
            <Route path="/dentist-portal/ai-analysis" element={<AIAnalysis />} />
            <Route path="/dentist-portal/x-core" element={<XCore />} />
            <Route path="/dentist-portal/practice/services" element={<DentistPracticeServices />} />
            <Route path="/dentist-portal/practice/availability" element={<DentistPracticeAvailability />} />
            <Route path="/dentist-portal/practice/earnings" element={<DentistPracticeEarnings />} />
            <Route path="/dentist-portal/profile/services" element={<ClinicServicesView />} />
            <Route path="/dentist-portal/profile/schedule" element={<DentistSchedule />} />
            <Route path="/dentist-portal/profile/patients" element={<PatientEMRList />} />
            <Route path="/dentist-portal/profile" element={<Navigate to="/dentist-portal/profile/services" replace />} />
            {/* Keep compatibility with existing sidebar link */}
            <Route path="/dentist-portal/appointments" element={<DentistSchedule />} />
            <Route path="/dentist-portal/patient-emr/:patientId" element={<ElectronicMedicalRecordScreen />} />
          </Route>

          <Route element={<ProtectedRoute allow={["patient"]} />}>
            <Route path="/patient-portal/appointments" element={<PatientAppointments />} />
            <Route path="/patient-portal/teledentistry" element={<PatientTeledentistry />} />
          </Route>

          {/* Clinic Portal Routes - Protected for clinic staff roles */}
          <Route element={<ProtectedRoute allow={["clinic_owner", "owner", "manager", "clinic_admin", "clinic_manager", "front_office", "nurse", "cashier", "clinic_staff", "staff"]} />}>
            <Route path="/clinic-portal" element={<Navigate to="/clinic-portal/home" replace />} />
            <Route path="/clinic-portal/home" element={<ClinicDashboard />} />
            <Route path="/clinic-portal/schedule" element={<ClinicSchedule />} />
            <Route path="/clinic-portal/teledentistry" element={<ClinicTeledentistry />} />
            <Route path="/clinic-portal/notifications" element={<NotificationScreenClinic />} />
            <Route path="/clinic-portal/patients" element={<ClinicPatients />} />
            <Route path="/clinic-portal/inventory" element={<ClinicInventory />} />
            <Route path="/clinic-portal/reports" element={<ClinicReports />} />
            <Route path="/clinic-portal/settings" element={<ClinicSettings />} />
          </Route>

          <Route element={<ProtectedRoute allow={["cashier", "manager"]} />}>
            <Route path="/clinic-portal/billing" element={<ClinicBilling />} />
          </Route>

          {/* Staff Management Route - Only for owner and manager */}
          <Route element={<ProtectedRoute allow={["clinic_owner", "owner", "manager", "clinic_admin"]} />}>
            <Route path="/clinic-portal/staff" element={<StaffManagement />} />
            <Route path="/clinic-portal/branches" element={<BranchManagement />} />
            <Route path="/clinic-portal/public-profile" element={<ClinicPublicProfile />} />
          </Route>

          {/* Restricted clinic X-Core route - clinical roles only */}
          <Route element={<ProtectedRoute allow={["clinic_owner", "owner", "clinical_director", "authorized_clinic_doctor", "clinic_admin_xcore"]} />}>
            <Route path="/clinic-portal/x-core" element={<ClinicXCore />} />
          </Route>

          {/* Admin Portal Routes - Protected for admin roles */}
          <Route element={<ProtectedRoute allow={["admin", "super_admin", "business_manager", "platform_manager", "finance_manager", "customer_success", "customer_success_manager", "technical_support", "ai_engineer", "compliance_officer"]} />}>
            <Route path="/admin" element={<AdminRouteGate allow={ADMIN_ROUTE_ROLES.dashboard}><AdminDashboard /></AdminRouteGate>} />
            <Route path="/admin/notifications" element={<AdminRouteGate allow={ADMIN_ROUTE_ROLES.notifications}><NotificationScreenAdmin /></AdminRouteGate>} />
            <Route path="/admin/clinic-management" element={<AdminRouteGate allow={ADMIN_ROUTE_ROLES.clinics}><ClinicManagement /></AdminRouteGate>} />
            <Route path="/admin/clinic-management/verification" element={<AdminRouteGate allow={ADMIN_ROUTE_ROLES.clinics}><ClinicManagement /></AdminRouteGate>} />
            <Route path="/admin/clinic-management/owners" element={<AdminRouteGate allow={ADMIN_ROUTE_ROLES.clinics}><ClinicManagement /></AdminRouteGate>} />
            <Route path="/admin/clinic-management/compliance" element={<AdminRouteGate allow={ADMIN_ROUTE_ROLES.clinics}><ClinicManagement /></AdminRouteGate>} />
            <Route path="/admin/clinic-management/actions" element={<AdminRouteGate allow={ADMIN_ROUTE_ROLES.clinics}><ClinicManagement /></AdminRouteGate>} />
            <Route path="/admin/clinic-management/audit" element={<AdminRouteGate allow={ADMIN_ROUTE_ROLES.clinics}><ClinicManagement /></AdminRouteGate>} />
            <Route path="/admin/clinic-management/analytics" element={<AdminRouteGate allow={ADMIN_ROUTE_ROLES.clinics}><ClinicManagement /></AdminRouteGate>} />
            <Route path="/admin/clinic-management/create" element={<AdminRouteGate allow={ADMIN_ROUTE_ROLES.clinics}><CreateClinic /></AdminRouteGate>} />
            <Route path="/admin/clinic-management/:id" element={<AdminRouteGate allow={ADMIN_ROUTE_ROLES.clinics}><ClinicDetail /></AdminRouteGate>} />
            <Route path="/admin/dentist-management" element={<AdminRouteGate allow={ADMIN_ROUTE_ROLES.dentists}><DentistManagement /></AdminRouteGate>} />
            <Route path="/admin/dentist-management/verification" element={<AdminRouteGate allow={ADMIN_ROUTE_ROLES.dentists}><DentistManagement /></AdminRouteGate>} />
            <Route path="/admin/dentist-management/network" element={<AdminRouteGate allow={ADMIN_ROUTE_ROLES.dentists}><DentistManagement /></AdminRouteGate>} />
            <Route path="/admin/revenue-billing" element={<AdminRouteGate allow={ADMIN_ROUTE_ROLES.revenue}><RevenueBilling /></AdminRouteGate>} />
            <Route path="/admin/revenue-billing/payments" element={<AdminRouteGate allow={ADMIN_ROUTE_ROLES.revenue}><RevenueBilling /></AdminRouteGate>} />
            <Route path="/admin/revenue-billing/subscriptions" element={<AdminRouteGate allow={ADMIN_ROUTE_ROLES.revenue}><RevenueBilling /></AdminRouteGate>} />
            <Route path="/admin/revenue-billing/settings" element={<AdminRouteGate allow={ADMIN_ROUTE_ROLES.revenue}><RevenueBilling /></AdminRouteGate>} />
            <Route path="/admin/ai-platform" element={<AdminRouteGate allow={ADMIN_ROUTE_ROLES.ai}><AIPlatform /></AdminRouteGate>} />
            <Route path="/admin/ai-platform/usage" element={<AdminRouteGate allow={ADMIN_ROUTE_ROLES.ai}><AIPlatform /></AdminRouteGate>} />
            <Route path="/admin/ai-platform/models" element={<AdminRouteGate allow={ADMIN_ROUTE_ROLES.ai}><AIPlatform /></AdminRouteGate>} />
            <Route path="/admin/ai-platform/billing" element={<AdminRouteGate allow={ADMIN_ROUTE_ROLES.ai}><AIPlatform /></AdminRouteGate>} />
            <Route path="/admin/support-helpdesk" element={<AdminRouteGate allow={ADMIN_ROUTE_ROLES.support}><SupportHelpdesk /></AdminRouteGate>} />
            <Route path="/admin/support-helpdesk/communication" element={<AdminRouteGate allow={ADMIN_ROUTE_ROLES.support}><SupportHelpdesk /></AdminRouteGate>} />
            <Route path="/admin/support-helpdesk/knowledge-base" element={<AdminRouteGate allow={ADMIN_ROUTE_ROLES.support}><SupportHelpdesk /></AdminRouteGate>} />
            <Route path="/admin/communications-diagnostics" element={<AdminRouteGate allow={ADMIN_ROUTE_ROLES.diagnostics}><AppointmentDiagnosticsDashboard /></AdminRouteGate>} />
            <Route path="/admin/system-administration" element={<AdminRouteGate allow={ADMIN_ROUTE_ROLES.system}><SystemAdministration /></AdminRouteGate>} />
            <Route path="/admin/system-administration/users" element={<AdminRouteGate allow={ADMIN_ROUTE_ROLES.system}><SystemAdministration /></AdminRouteGate>} />
            <Route path="/admin/system-administration/audit" element={<AdminRouteGate allow={ADMIN_ROUTE_ROLES.system}><SystemAdministration /></AdminRouteGate>} />
            <Route path="/admin/system-administration/config" element={<AdminRouteGate allow={ADMIN_ROUTE_ROLES.system}><SystemAdministration /></AdminRouteGate>} />
            <Route path="/admin/system-administration/monitoring" element={<AdminRouteGate allow={ADMIN_ROUTE_ROLES.system}><SystemAdministration /></AdminRouteGate>} />
            <Route path="/admin/compliance-security" element={<AdminRouteGate allow={ADMIN_ROUTE_ROLES.compliance}><ComplianceSecurity /></AdminRouteGate>} />
            <Route path="/admin/compliance-security/audit" element={<AdminRouteGate allow={ADMIN_ROUTE_ROLES.compliance}><ComplianceSecurity /></AdminRouteGate>} />
            <Route path="/admin/compliance-security/security" element={<AdminRouteGate allow={ADMIN_ROUTE_ROLES.compliance}><ComplianceSecurity /></AdminRouteGate>} />
            <Route path="/admin/compliance-security/regulatory" element={<AdminRouteGate allow={ADMIN_ROUTE_ROLES.compliance}><ComplianceSecurity /></AdminRouteGate>} />
            <Route path="/admin/partnership" element={<AdminRouteGate allow={ADMIN_ROUTE_ROLES.partnership}><Partnership /></AdminRouteGate>} />
            <Route path="/admin/partnership/directory" element={<AdminRouteGate allow={ADMIN_ROUTE_ROLES.partnership}><Partnership /></AdminRouteGate>} />
            <Route path="/admin/partnership/api" element={<AdminRouteGate allow={ADMIN_ROUTE_ROLES.partnership}><Partnership /></AdminRouteGate>} />
            <Route path="/admin/partnership/integrations" element={<AdminRouteGate allow={ADMIN_ROUTE_ROLES.partnership}><Partnership /></AdminRouteGate>} />
            <Route path="/admin/content-management" element={<AdminRouteGate allow={ADMIN_ROUTE_ROLES.content}><ContentManagement /></AdminRouteGate>} />
            <Route path="/admin/content-management/education" element={<AdminRouteGate allow={ADMIN_ROUTE_ROLES.content}><ContentManagement /></AdminRouteGate>} />
            <Route path="/admin/content-management/library" element={<AdminRouteGate allow={ADMIN_ROUTE_ROLES.content}><ContentManagement /></AdminRouteGate>} />
            <Route path="/admin/content-management/media" element={<AdminRouteGate allow={ADMIN_ROUTE_ROLES.content}><ContentManagement /></AdminRouteGate>} />
            <Route path="/admin/analytics-reporting/*" element={<AdminRouteGate allow={ADMIN_ROUTE_ROLES.analytics}><AnalyticReport /></AdminRouteGate>} />
            <Route path="/admin/profile" element={<AdminRouteGate allow={ADMIN_ROUTE_ROLES.profile}><AdminProfile /></AdminRouteGate>} />
          </Route>
          <Route path="/product-platform" element={<ProductPlatform />} />
          <Route path="/clinical-research" element={<ClinicalResearch />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/prices" element={<PricingPage />} />
          <Route path="/serene-agentic" element={<SereneAIPage />} />
          <Route path="/serene-ai" element={<Navigate to="/serene-agentic" replace />} />
          <Route path="/get-the-app" element={<GetTheApp />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<NotFound />} />
          </RouterRoutes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;
