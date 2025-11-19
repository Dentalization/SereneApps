import React, { useState } from 'react';
import Button from '../../../../components/ui/Button';
import { useLanguage } from '../../../../contexts/LanguageContext';

const PatientAIResult = ({ patient }) => {
  const { t } = useLanguage();

  if (!patient || !patient.aiResults || patient.aiResults.length === 0) {
    return (
      <div className="bg-surface border border-primary/20 rounded-2xl shadow-theme-lg p-6 theme-transition">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-surface-elevated rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/10">
            <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014.846 21H9.154a3.374 3.374 0 00-2.14-1.453l-.548-.547z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-primary mb-2">{t('dentistPatient.ai.empty.title')}</h3>
          <p className="text-secondary">{t('dentistPatient.ai.empty.description')}</p>
        </div>
      </div>
    );
  }

  const [selectedResult, setSelectedResult] = useState(patient.aiResults[0]);
  const [expandedSection, setExpandedSection] = useState('diagnosis');

  const getRiskColor = (risk) => {
    switch (risk?.toLowerCase()) {
      case 'high': return 'text-error bg-error/10 border-error/30';
      case 'medium': return 'text-warning bg-warning/10 border-warning/30';
      case 'low': return 'text-success bg-success/10 border-success/30';
      default: return 'text-secondary bg-muted border-primary/10';
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return 'text-success';
    if (confidence >= 60) return 'text-warning';
    return 'text-error';
  };

  const getRiskLabel = (risk) => {
    const key = (risk || '').toLowerCase() || 'unknown';
    const label = t(`dentistPatient.ai.riskLevels.${key}`);
    return label.startsWith('dentistPatient') ? risk : label;
  };

  const getSeverityLabel = (severity) => {
    const key = (severity || '').toLowerCase() || 'unknown';
    const label = t(`dentistPatient.ai.severityLevels.${key}`);
    return label.startsWith('dentistPatient') ? severity : label;
  };

  const getUrgencyLabel = (urgency) => {
    const key = (urgency || '').toLowerCase() || 'normal';
    const label = t(`dentistPatient.ai.urgencyLevels.${key}`);
    return label.startsWith('dentistPatient') ? urgency : label;
  };

  const resultsCountLabel = t('dentistPatient.ai.header.count', { count: patient.aiResults.length });

  return (
    <div className="space-y-6">
      {/* AI Results Header */}
      <div className="bg-surface border border-primary/20 rounded-2xl shadow-theme-lg p-6 theme-transition">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-primary">{t('dentistPatient.ai.header.title')}</h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-secondary">{resultsCountLabel}</span>
          </div>
        </div>

        {/* Results Selector */}
        {patient.aiResults.length > 1 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-text-primary mb-2">
              {t('dentistPatient.ai.controls.select')}
            </label>
            <select
              value={selectedResult.id}
              onChange={(e) => setSelectedResult(patient.aiResults.find(r => r.id === e.target.value))}
              className="w-full px-3 py-2 border border-primary/10 rounded-md bg-background text-primary focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-colors"
            >
              {patient.aiResults.map((result) => (
                <option key={result.id} value={result.id}>
                  {result.date} - {result.type}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Result Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-brand-primary rounded-full"></div>
              <span className="text-sm font-medium text-text-primary">{t('dentistPatient.ai.summary.analysisDate')}</span>
            </div>
            <p className="text-primary font-semibold">{selectedResult.date}</p>
          </div>

          <div className="bg-surface rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-brand-accent rounded-full"></div>
              <span className="text-sm font-medium text-text-primary">{t('dentistPatient.ai.summary.confidence')}</span>
            </div>
            <p className={`font-semibold ${getConfidenceColor(selectedResult.confidence)}`}>
              {selectedResult.confidence}%
            </p>
          </div>

          <div className="bg-surface rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-trust-green rounded-full"></div>
              <span className="text-sm font-medium text-text-primary">{t('dentistPatient.ai.summary.risk')}</span>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRiskColor(selectedResult.riskLevel)}`}>
              {getRiskLabel(selectedResult.riskLevel)}
            </span>
          </div>
        </div>
      </div>

      {/* Detailed Results */}
      <div className="bg-surface-elevated border border-primary/10 rounded-xl shadow-theme-md theme-transition">
        {/* Tabs */}
        <div className="border-b border-primary/10">
          <div className="flex">
            {[
              { id: 'diagnosis', label: t('dentistPatient.ai.tabs.diagnosis'), icon: '🔍' },
              { id: 'symptoms', label: t('dentistPatient.ai.tabs.symptoms'), icon: '📋' },
              { id: 'recommendations', label: t('dentistPatient.ai.tabs.recommendations'), icon: '💡' },
              { id: 'images', label: t('dentistPatient.ai.tabs.images'), icon: '📸' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setExpandedSection(tab.id)}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  expandedSection === tab.id
                    ? 'border-brand-primary text-brand-primary bg-brand-primary/5'
                    : 'border-transparent text-secondary hover:text-primary hover:bg-muted/50'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {expandedSection === 'diagnosis' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary mb-4">{t('dentistPatient.ai.diagnosis.title')}</h3>
              
              {selectedResult.diagnosis?.map((diag, index) => (
                <div key={index} className="bg-surface rounded-lg p-4 border border-primary/10">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-primary">{diag.condition}</h4>
                      <p className="text-sm text-secondary">{diag.description}</p>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${getConfidenceColor(diag.probability)}`}>
                        {diag.probability}%
                      </div>
                      <div className="text-xs text-secondary">{t('dentistPatient.ai.diagnosis.probability')}</div>
                    </div>
                  </div>
                  
                  {diag.details && (
                    <div className="mt-3 p-3 bg-muted/30 rounded-md">
                      <p className="text-sm text-primary">{diag.details}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {expandedSection === 'symptoms' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary mb-4">{t('dentistPatient.ai.symptoms.title')}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedResult.symptoms?.map((symptom, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-surface rounded-lg border border-primary/10">
                    <div className={`w-3 h-3 rounded-full ${
                      symptom.severity === 'high' ? 'bg-error' :
                      symptom.severity === 'medium' ? 'bg-warning' : 'bg-success'
                    }`}></div>
                    <div className="flex-1">
                      <p className="font-medium text-primary">{symptom.name}</p>
                      <p className="text-sm text-secondary">
                        {t('dentistPatient.ai.symptoms.severity', { severity: getSeverityLabel(symptom.severity) })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {expandedSection === 'recommendations' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary mb-4">{t('dentistPatient.ai.recommendations.title')}</h3>
              
              <div className="space-y-3">
                {selectedResult.recommendations?.map((rec, index) => (
                  <div key={index} className="flex items-start space-x-3 p-4 bg-surface rounded-lg border border-primary/10">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      rec.priority === 'urgent' ? 'bg-error' :
                      rec.priority === 'high' ? 'bg-warning' : 'bg-brand-primary'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-primary mb-1">{rec.title}</h4>
                      <p className="text-sm text-secondary mb-2">{rec.description}</p>
                      {rec.urgency && (
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          rec.urgency === 'immediate' ? 'bg-error/10 text-error' :
                          rec.urgency === 'soon' ? 'bg-warning/10 text-warning' :
                          'bg-brand-primary/10 text-brand-primary'
                        }`}>
                          {getUrgencyLabel(rec.urgency)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {expandedSection === 'images' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary mb-4">{t('dentistPatient.ai.images.title')}</h3>
              
              {selectedResult.images && selectedResult.images.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedResult.images.map((image, index) => (
                    <div key={index} className="bg-surface rounded-lg border border-primary/10 overflow-hidden">
                      <div className="aspect-video bg-muted flex items-center justify-center">
                        <img 
                          src={image.url} 
                          alt={image.description}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-medium text-primary">{image.type}</p>
                        <p className="text-xs text-secondary">{image.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-secondary">{t('dentistPatient.ai.images.empty')}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="border-t border-primary/10 px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-secondary">
              {t('dentistPatient.ai.footer.performedOn', { date: selectedResult.date })}
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                {t('dentistPatient.ai.footer.export')}
              </Button>
              <Button variant="outline" size="sm">
                {t('dentistPatient.ai.footer.share')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientAIResult;
