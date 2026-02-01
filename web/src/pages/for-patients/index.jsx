import React from 'react';
import Header from '../../components/ui/Header';
import HeroSection from './components/HeroSection';
import SymptomChecker from './components/SymptomChecker';
import EducationalContent from './components/EducationalContent';
import PatientSuccessStories from './components/PatientSuccessStories';
import AppointmentBooking from './components/AppointmentBooking';
import FAQSection from './components/FAQSection';
import MobileCameraGuide from './components/MobileCameraGuide';
import MobileApps from './components/MobileApps';

const ForPatientsPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Header />
      
      <main className="">
        <HeroSection />
        <MobileApps />
        <SymptomChecker />
        <MobileCameraGuide />
        <EducationalContent />
        <PatientSuccessStories />
        <AppointmentBooking />
        <FAQSection />
      </main>
    </div>
  );
};

export default ForPatientsPage;