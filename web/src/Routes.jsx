import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes as RouterRoutes, Route, Navigate } from "react-router-dom";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
import ProtectedRoute from 'components/auth/ProtectedRoute';

const NotFound = lazy(() => import('pages/NotFound'));
const ForPatientsPage = lazy(() => import('./pages/for-patients'));
const ProductPlatform = lazy(() => import('./pages/product-platform'));
const ClinicalResearch = lazy(() => import('./pages/clinical-research'));
const Homepage = lazy(() => import('./pages/homepage'));
const ForDentists = lazy(() => import('./pages/for-dentists'));
const SereneAIPage = lazy(() => import('./pages/serene-ai'));
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const DentistPortal = lazy(() => import('./pages/dentist-portal'));
const DentistHome = lazy(() => import('./pages/dentist-portal/home'));
const PatientManagement = lazy(() => import('./pages/dentist-portal/patient'));
const DentistSchedule = lazy(() => import('./pages/dentist-portal/schedule'));
const Teledentistry = lazy(() => import('./pages/dentist-portal/teledentistry'));
const DentistSettings = lazy(() => import('./pages/dentist-portal/dentist-settings'));
const Reports = lazy(() => import('./pages/dentist-portal/reports'));
const AIAnalysis = lazy(() => import('./pages/dentist-portal/ai'));
const XCore = lazy(() => import('./pages/dentist-portal/x-core'));
const SharedStudyView = lazy(() => import('./pages/dentist-portal/x-core/SharedStudyView'));
const DentistPracticeServices = lazy(() => import('./pages/dentist-portal/practice/MyServices'));
const DentistPracticeAvailability = lazy(() => import('./pages/dentist-portal/practice/Availability'));
const DentistPracticeEarnings = lazy(() => import('./pages/dentist-portal/practice/Earnings'));
const ClinicServicesView = lazy(() => import('./pages/dentist-portal/profile/ClinicServices'));
const PatientEMRList = lazy(() => import('./pages/dentist-portal/patient-emr'));
const ElectronicMedicalRecordScreen = lazy(() => import('./pages/dentist-portal/patient-emr/ElectronicMedicalRecordScreen'));
const NotificationScreenDentist = lazy(() => import('./pages/dentist-portal/ui/NotificationScreenDentist'));
const GetTheApp = lazy(() => import('./pages/get-the-app'));
const PatientAppointments = lazy(() => import('./pages/patient-portal/appointments'));
const PatientTeledentistry = lazy(() => import('./pages/patient-portal/teledentistry'));
const PricingPage = lazy(() => import('./pages/prices'));

const ClinicDashboard = lazy(() => import('./pages/clinic-portal/home'));
const ClinicSchedule = lazy(() => import('./pages/clinic-portal/schedule'));
const ClinicPatients = lazy(() => import('./pages/clinic-portal/patients'));
const ClinicBilling = lazy(() => import('./pages/clinic-portal/billing'));
const ClinicInventory = lazy(() => import('./pages/clinic-portal/inventory'));
const ClinicReports = lazy(() => import('./pages/clinic-portal/reports'));
const ClinicPublicProfile = lazy(() => import('./pages/clinic-portal/public-profile'));
const ClinicSettings = lazy(() => import('./pages/clinic-portal/settings'));
const StaffManagement = lazy(() => import('./pages/clinic-portal/staff'));
const BranchManagement = lazy(() => import('./pages/clinic-portal/branches'));
const NotificationScreenClinic = lazy(() => import('./pages/clinic-portal/ui/NotificationScreenClinic'));
const ClinicTeledentistry = lazy(() => import('./pages/clinic-portal/teledentistry'));
const ClinicXCore = lazy(() => import('./pages/clinic-portal/x-core'));

const AdminDashboard = lazy(() => import('./pages/admin-portal/home'));
const ClinicManagement = lazy(() => import('./pages/admin-portal/clinic-management'));
const CreateClinic = lazy(() => import('./pages/admin-portal/clinic-management/components/CreateClinic'));
const ClinicDetail = lazy(() => import('./pages/admin-portal/clinic-management/components/ClinicDetail'));
const DentistManagement = lazy(() => import('./pages/admin-portal/dentist-management'));
const RevenueBilling = lazy(() => import('./pages/admin-portal/revenue-billing'));
const AIPlatform = lazy(() => import('./pages/admin-portal/ai-platform'));
const SupportHelpdesk = lazy(() => import('./pages/admin-portal/support-helpdesk'));
const SystemAdministration = lazy(() => import('./pages/admin-portal/system-administration'));
const ComplianceSecurity = lazy(() => import('./pages/admin-portal/compliance-security'));
const Partnership = lazy(() => import('./pages/admin-portal/partnership'));
const ContentManagement = lazy(() => import('./pages/admin-portal/content-management'));
const AdminProfile = lazy(() => import('./pages/admin-portal/admin-profile'));
const AnalyticReport = lazy(() => import('./pages/admin-portal/analytic-report'));
const NotificationScreenAdmin = lazy(() => import('./pages/admin-portal/ui/NotificationScreenAdmin'));
const AppointmentDiagnosticsDashboard = lazy(() => import('./pages/admin-portal/communications-diagnostics'));

const routeFallback = (
  <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center" role="status" aria-live="polite">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-sky-300" />
    <span className="sr-only">Loading</span>
  </div>
);

const Routes = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ScrollToTop />
        <Suspense fallback={routeFallback}>
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

          {/* Restricted clinic X-Core route - clinical roles only */}
          <Route element={<ProtectedRoute allow={["clinic_owner", "owner", "clinical_director", "authorized_clinic_doctor", "clinic_admin_xcore"]} />}>
            <Route path="/clinic-portal/x-core" element={<ClinicXCore />} />
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
            <Route path="/admin/communications-diagnostics" element={<AppointmentDiagnosticsDashboard />} />
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
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;
