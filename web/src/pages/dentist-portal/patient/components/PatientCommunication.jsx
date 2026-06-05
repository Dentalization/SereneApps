import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../../components/ui/Button';
import { useLanguage } from '../../../../contexts/LanguageContext';

const PatientCommunication = ({ patient }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  if (!patient) {
    return (
      <div className="bg-surface border border-primary/10 rounded-3xl shadow-theme-sm p-12 animate-in fade-in">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-surface-elevated rounded-full flex items-center justify-center mx-auto mb-4 text-muted/50">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
          </div>
          <p className="text-secondary font-medium">{t('dentistPatient.common.noPatientSelected')}</p>
        </div>
      </div>
    );
  }

  const handleStartChat = () => navigate('/dentist-portal/teledentistry', { state: { patientId: patient.id, patientName: patient.name, openChat: true } });

  const InfoCard = ({ title, value, icon, colorClass, shadowColor }) => (
    <div className="bg-gradient-to-br from-surface-elevated to-surface rounded-2xl p-5 border border-primary/10 shadow-sm relative overflow-hidden group">
      <div className="flex items-center space-x-2.5 mb-2">
        <span className={`flex h-2.5 w-2.5 rounded-full ${colorClass}`} style={{boxShadow: `0 0 8px ${shadowColor}`}}></span>
        <span className="text-xs font-bold uppercase tracking-wider text-muted">{title}</span>
      </div>
      <p className="text-lg font-semibold text-primary break-all">{value}</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-surface border border-primary/10 rounded-3xl shadow-theme-sm p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-primary tracking-tight">{t('dentistPatient.communication.title')}</h2>
          <p className="text-secondary mt-1">Connect with {patient.name} securely</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <InfoCard title={t('dentistPatient.communication.contact.primaryEmail')} value={patient.email} colorClass="bg-blue-500" shadowColor="rgba(59,130,246,0.5)"/>
          <InfoCard title={t('dentistPatient.communication.contact.phoneNumber')} value={patient.phone} colorClass="bg-emerald-500" shadowColor="rgba(16,185,129,0.5)"/>
          <InfoCard title={t('dentistPatient.communication.contact.preferred')} value={patient.preferredContact || 'Email'} colorClass="bg-amber-500" shadowColor="rgba(245,158,11,0.5)"/>
        </div>
      </div>

      <div className="bg-gradient-to-br from-accent/10 to-blue-500/10 border border-accent/20 rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
          <svg className="w-32 h-32 text-primary" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" /></svg>
        </div>
        <div className="relative z-10">
          <h3 className="text-xl font-bold text-primary mb-2">{t('dentistPatient.communication.quickActions')}</h3>
          <p className="text-secondary mb-8 max-w-2xl">Use our secure Teledentistry platform for comprehensive communication with {patient.name}.</p>
          <div className="max-w-md mx-auto">
            <button onClick={handleStartChat} className="w-full group relative bg-surface hover:bg-accent/90 border border-primary/10 hover:border-accent/90 rounded-2xl p-6 text-left transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-accent/20 hover:-translate-y-1">
              <div className="flex items-start space-x-5">
                <div className="flex-shrink-0 w-14 h-14 bg-surface-elevated group-hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors border border-primary/10 group-hover:border-transparent">
                  <svg className="w-7 h-7 text-accent group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                </div>
                <div>
                  <h4 className="font-bold text-primary text-lg mb-1 group-hover:text-white transition-colors">Start Chat</h4>
                  <p className="text-sm text-secondary group-hover:text-blue-100 leading-relaxed">Instant messaging & secure patient teledentistry portal</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-primary/10 rounded-3xl shadow-theme-lg p-8">
        <h3 className="text-xl font-bold text-primary mb-6 flex items-center gap-3"><span className="text-2xl">📡</span> Platform Capabilities</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {icon: '💬', title: 'Real-time Messaging', text: 'Instant secure messaging with read receipts.', color: 'blue'},
            {icon: '📹', title: 'HD Video Calls', text: 'Crystal clear video consultations for clinical examination.', color: 'emerald'},
            {icon: '📎', title: 'File Sharing', text: 'Securely share documents, images, and X-rays.', color: 'purple'},
            {icon: '🕒', title: 'Session History', text: 'Access transcripts and previous consultation records.', color: 'amber'}
          ].map(item => (
            <div key={item.title} className="flex items-start space-x-4 p-5 bg-surface-elevated rounded-2xl border border-primary/10">
              <div className={`flex-shrink-0 w-10 h-10 bg-${item.color}-100 dark:bg-${item.color}-900/30 rounded-xl flex items-center justify-center text-lg`}>{item.icon}</div>
              <div>
                <h4 className="font-bold text-primary mb-1">{item.title}</h4>
                <p className="text-sm text-secondary leading-relaxed">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PatientCommunication;