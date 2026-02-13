import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route, Navigate } from "react-router-dom";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
import NotFound from "pages/NotFound";
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
import DentistPracticeServices from './pages/dentist-portal/practice/MyServices';
import DentistPracticeAvailability from './pages/dentist-portal/practice/Availability';
import DentistPracticeEarnings from './pages/dentist-portal/practice/Earnings';
import ClinicServicesView from './pages/dentist-portal/profile/ClinicServices';
import PatientEMRList from './pages/dentist-portal/patient-emr';
import ElectronicMedicalRecordScreen from './pages/dentist-portal/patient-emr/ElectronicMedicalRecordScreen';
import NotificationScreenDentist from './pages/dentist-portal/ui/NotificationScreenDentist';
import ProtectedRoute from 'components/auth/ProtectedRoute';
import GetTheApp from './pages/get-the-app';
import PatientAppointments from './pages/patient-portal/appointments';
import PricingPage from './pages/prices';

// Clinic Portal Imports
import {
  ClinicDashboard,
  ClinicSchedule,
  ClinicPatients,
  ClinicBilling,
  ClinicInventory,
  ClinicReports,
  ClinicPublicProfile,
  ClinicSettings
} from './pages/clinic-portal';
import StaffManagement from './pages/clinic-portal/staff';
import BranchManagement from './pages/clinic-portal/branches';
import NotificationScreenClinic from './pages/clinic-portal/ui/NotificationScreenClinic';

// Admin Portal Imports
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

const Routes = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ScrollToTop />
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
          </Route>

          {/* Clinic Portal Routes - Protected for clinic staff roles */}
          <Route element={<ProtectedRoute allow={["clinic_owner", "owner", "manager", "clinic_admin", "front_office", "nurse", "cashier", "staff"]} />}>
            <Route path="/clinic-portal" element={<Navigate to="/clinic-portal/home" replace />} />
            <Route path="/clinic-portal/home" element={<ClinicDashboard />} />
            <Route path="/clinic-portal/schedule" element={<ClinicSchedule />} />
            <Route path="/clinic-portal/notifications" element={<NotificationScreenClinic />} />
            <Route path="/clinic-portal/patients" element={<ClinicPatients />} />
            <Route path="/clinic-portal/billing" element={<ClinicBilling />} />
            <Route path="/clinic-portal/inventory" element={<ClinicInventory />} />
            <Route path="/clinic-portal/reports" element={<ClinicReports />} />
            <Route path="/clinic-portal/settings" element={<ClinicSettings />} />
          </Route>

          {/* Staff Management Route - Only for owner and manager */}
          <Route element={<ProtectedRoute allow={["clinic_owner", "owner", "manager", "clinic_admin"]} />}>
            <Route path="/clinic-portal/staff" element={<StaffManagement />} />
            <Route path="/clinic-portal/branches" element={<BranchManagement />} />
            <Route path="/clinic-portal/public-profile" element={<ClinicPublicProfile />} />
          </Route>

          {/* Admin Portal Routes - Protected for admin roles */}
          <Route element={<ProtectedRoute allow={["admin", "super_admin", "business_manager", "platform_manager", "finance_manager", "customer_success", "customer_success_manager", "technical_support", "ai_engineer", "compliance_officer"]} />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/notifications" element={<NotificationScreenAdmin />} />
            <Route path="/admin/clinic-management" element={<ClinicManagement />} />
            <Route path="/admin/clinic-management/create" element={<CreateClinic />} />
            <Route path="/admin/clinic-management/:id" element={<ClinicDetail />} />
            <Route path="/admin/dentist-management" element={<DentistManagement />} />
            <Route path="/admin/revenue-billing" element={<RevenueBilling />} />
            <Route path="/admin/ai-platform" element={<AIPlatform />} />
            <Route path="/admin/support-helpdesk" element={<SupportHelpdesk />} />
            <Route path="/admin/system-administration" element={<SystemAdministration />} />
            <Route path="/admin/compliance-security" element={<ComplianceSecurity />} />
            <Route path="/admin/partnership" element={<Partnership />} />
            <Route path="/admin/content-management" element={<ContentManagement />} />
            <Route path="/admin/analytics-reporting/*" element={<AnalyticReport />} />
            <Route path="/admin/profile" element={<AdminProfile />} />
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
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;