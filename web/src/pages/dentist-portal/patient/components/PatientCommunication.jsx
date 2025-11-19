import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../../components/ui/Button';
import { useLanguage } from '../../../../contexts/LanguageContext';

const PatientCommunication = ({ patient }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  if (!patient) {
    return (
      <div className="bg-surface-elevated border border-primary/10 rounded-xl shadow-theme-md theme-transition p-6">
        <div className="text-center py-8">
          <p className="text-secondary">{t('dentistPatient.common.noPatientSelected')}</p>
        </div>
      </div>
    );
  }

  const handleStartChat = () => {
    // Navigate to teledentistry with patient context
    navigate('/dentist/teledentistry', { 
      state: { 
        patientId: patient.id,
        patientName: patient.name,
        openChat: true 
      } 
    });
  };

  const handleStartVideoCall = () => {
    // Navigate to teledentistry with video call context
    navigate('/dentist/teledentistry', { 
      state: { 
        patientId: patient.id,
        patientName: patient.name,
        startVideoCall: true 
      } 
    });
  };

  return (
    <div className="space-y-6">
      {/* Communication Header */}
      <div className="bg-surface-elevated border border-primary/10 rounded-xl shadow-theme-md theme-transition p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-primary">{t('dentistPatient.communication.title')}</h2>
        </div>

        {/* Patient Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-surface rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-brand-primary rounded-full"></div>
              <span className="text-sm font-medium text-text-primary">{t('dentistPatient.communication.contact.primaryEmail')}</span>
            </div>
            <p className="text-primary font-medium">{patient.email}</p>
          </div>

          <div className="bg-surface rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-success rounded-full"></div>
              <span className="text-sm font-medium text-text-primary">{t('dentistPatient.communication.contact.phoneNumber')}</span>
            </div>
            <p className="text-primary font-medium">{patient.phone}</p>
          </div>

          <div className="bg-surface rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-warning rounded-full"></div>
              <span className="text-sm font-medium text-text-primary">{t('dentistPatient.communication.contact.preferred')}</span>
            </div>
            <p className="text-primary font-medium">
              {patient.preferredContact || t('dentistPatient.communication.contact.defaultPreferred')}
            </p>
          </div>
        </div>

        {/* Quick Communication Actions */}
        <div className="bg-gradient-to-r from-brand-primary/5 to-brand-secondary/5 border border-brand-primary/20 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-primary mb-4">
            {t('dentistPatient.communication.quickActions')}
          </h3>
          
          <p className="text-secondary mb-6">
            Use the Teledentistry platform for comprehensive communication with {patient.name}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Start Chat Button */}
            <button
              onClick={handleStartChat}
              className="group relative bg-surface-elevated hover:bg-brand-primary/10 border border-primary/10 hover:border-brand-primary/30 rounded-xl p-6 text-left transition-all duration-300 hover:shadow-lg hover:scale-105"
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-brand-primary/10 group-hover:bg-brand-primary/20 rounded-lg flex items-center justify-center transition-colors">
                  <svg className="w-6 h-6 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-primary mb-2 group-hover:text-brand-primary transition-colors">
                    💬 Start Chat Conversation
                  </h4>
                  <p className="text-sm text-secondary">
                    Send messages, share files, and maintain chat history
                  </p>
                </div>
                <svg className="w-5 h-5 text-secondary group-hover:text-brand-primary group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* Start Video Call Button */}
            <button
              onClick={handleStartVideoCall}
              className="group relative bg-surface-elevated hover:bg-success/10 border border-primary/10 hover:border-success/30 rounded-xl p-6 text-left transition-all duration-300 hover:shadow-lg hover:scale-105"
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-success/10 group-hover:bg-success/20 rounded-lg flex items-center justify-center transition-colors">
                  <svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-primary mb-2 group-hover:text-success transition-colors">
                    📹 Start Video Consultation
                  </h4>
                  <p className="text-sm text-secondary">
                    Face-to-face consultation with HD video and audio
                  </p>
                </div>
                <svg className="w-5 h-5 text-secondary group-hover:text-success group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Teledentistry Features Overview */}
      <div className="bg-surface-elevated border border-primary/10 rounded-xl shadow-theme-md theme-transition p-6">
        <h3 className="text-lg font-semibold text-primary mb-4">
          📡 Teledentistry Platform Features
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start space-x-3 p-4 bg-surface rounded-lg">
            <div className="flex-shrink-0 w-8 h-8 bg-brand-primary/10 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-primary mb-1">Real-time Messaging</h4>
              <p className="text-sm text-secondary">Instant messaging with typing indicators</p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 bg-surface rounded-lg">
            <div className="flex-shrink-0 w-8 h-8 bg-success/10 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-primary mb-1">HD Video Calls</h4>
              <p className="text-sm text-secondary">High-quality video consultations</p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 bg-surface rounded-lg">
            <div className="flex-shrink-0 w-8 h-8 bg-trust-green/10 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-trust-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-primary mb-1">File Sharing</h4>
              <p className="text-sm text-secondary">Share documents, images, and X-rays</p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 bg-surface rounded-lg">
            <div className="flex-shrink-0 w-8 h-8 bg-warning/10 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-primary mb-1">Chat History</h4>
              <p className="text-sm text-secondary">Access previous conversations anytime</p>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-brand-primary/5 border border-brand-primary/20 rounded-lg">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-brand-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-primary mb-1">💡 Pro Tip</p>
              <p className="text-sm text-secondary">
                All communication is encrypted and HIPAA-compliant. Patient information is kept secure and private.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Alternative Communication Methods */}
      <div className="bg-surface-elevated border border-primary/10 rounded-xl shadow-theme-md theme-transition p-6">
        <h3 className="text-lg font-semibold text-primary mb-4">
          📞 Alternative Contact Methods
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Button variant="outline" className="justify-start">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Send Email
          </Button>
          
          <Button variant="outline" className="justify-start">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Send SMS
          </Button>
          
          <Button variant="outline" className="justify-start">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Call Phone
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PatientCommunication;

