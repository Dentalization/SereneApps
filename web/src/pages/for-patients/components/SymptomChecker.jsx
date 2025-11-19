import React, { useState } from 'react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { Checkbox } from '../../../components/ui/Checkbox';
import Icon from '../../../components/AppIcon';

const SymptomChecker = () => {
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [description, setDescription] = useState('');
  const [showResults, setShowResults] = useState(false);

  const commonSymptoms = [
    { id: 'pain', label: 'Tooth pain or sensitivity', icon: 'Zap' },
    { id: 'bleeding', label: 'Bleeding gums', icon: 'Droplet' },
    { id: 'swelling', label: 'Swelling or inflammation', icon: 'AlertCircle' },
    { id: 'bad_breath', label: 'Persistent bad breath', icon: 'Wind' },
    { id: 'loose_tooth', label: 'Loose or shifting teeth', icon: 'Move' },
    { id: 'jaw_pain', label: 'Jaw pain or clicking', icon: 'Skull' },
    { id: 'white_spots', label: 'White or dark spots on teeth', icon: 'Circle' },
    { id: 'dry_mouth', label: 'Dry mouth', icon: 'Droplets' }
  ];

  const handleSymptomChange = (symptomId, checked) => {
    if (checked) {
      setSelectedSymptoms([...selectedSymptoms, symptomId]);
    } else {
      setSelectedSymptoms(selectedSymptoms?.filter(id => id !== symptomId));
    }
  };

  const handleAnalyze = () => {
    setShowResults(true);
  };

  const getRecommendation = () => {
    if (selectedSymptoms?.includes('pain') || selectedSymptoms?.includes('swelling')) {
      return {
        urgency: 'high',
        title: 'Seek Professional Care Soon',
        message: 'Your symptoms suggest you should see a dentist within the next few days. Pain and swelling can indicate infection or other serious conditions.',
        color: 'text-error',
        bgColor: 'bg-error/10',
        borderColor: 'border-error/20'
      };
    } else if (selectedSymptoms?.includes('bleeding') || selectedSymptoms?.includes('loose_tooth')) {
      return {
        urgency: 'medium',
        title: 'Schedule a Dental Appointment',
        message: 'These symptoms warrant professional evaluation. Consider scheduling an appointment within the next 2-3 weeks.',
        color: 'text-warning',
        bgColor: 'bg-warning/10',
        borderColor: 'border-warning/20'
      };
    } else if (selectedSymptoms?.length > 0) {
      return {
        urgency: 'low',
        title: 'Monitor and Maintain Good Oral Hygiene',
        message: 'Your symptoms are common and may improve with better oral care. Consider a routine dental checkup.',
        color: 'text-trust-green',
        bgColor: 'bg-trust-green/10',
        borderColor: 'border-trust-green/20'
      };
    } else {
      return {
        urgency: 'none',
        title: 'Great! No Immediate Concerns',
        message: 'Keep up with regular brushing, flossing, and routine dental visits for optimal oral health.',
        color: 'text-trust-green',
        bgColor: 'bg-trust-green/10',
        borderColor: 'border-trust-green/20'
      };
    }
  };

  return (
    <section className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-text-primary mb-4">
            AI-Powered Symptom Checker
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Describe your dental concerns and get personalized recommendations for next steps. 
            Our AI analyzes your symptoms to provide guidance on when to seek professional care.
          </p>
        </div>

        <div className="bg-surface rounded-2xl p-8 shadow-brand">
          {!showResults ? (
            <div className="space-y-8">
              {/* Symptom Selection */}
              <div>
                <h3 className="text-xl font-semibold text-text-primary mb-6">
                  Select any symptoms you're experiencing:
                </h3>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  {commonSymptoms?.map((symptom) => (
                    <div key={symptom?.id} className="flex items-center space-x-3 p-4 bg-white rounded-lg border border-border hover:border-primary/30 transition-gentle">
                      <Checkbox
                        checked={selectedSymptoms?.includes(symptom?.id)}
                        onChange={(e) => handleSymptomChange(symptom?.id, e?.target?.checked)}
                      />
                      <Icon name={symptom?.icon} size={20} className="text-primary" />
                      <span className="text-text-primary font-medium">{symptom?.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <Input
                  label="Additional details (optional)"
                  type="text"
                  placeholder="Describe your symptoms in more detail..."
                  value={description}
                  onChange={(e) => setDescription(e?.target?.value)}
                  description="The more details you provide, the better our AI can assist you"
                />
              </div>

              {/* Analyze Button */}
              <div className="text-center">
                <Button
                  variant="default"
                  size="lg"
                  onClick={handleAnalyze}
                  iconName="Brain"
                  iconPosition="left"
                  iconSize={20}
                >
                  Analyze My Symptoms
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Results */}
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-text-primary mb-2">
                  Your Personalized Recommendation
                </h3>
                <p className="text-text-secondary">
                  Based on the symptoms you've described
                </p>
              </div>

              <div className={`p-6 rounded-xl border-2 ${getRecommendation()?.bgColor} ${getRecommendation()?.borderColor}`}>
                <div className="flex items-start space-x-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getRecommendation()?.bgColor}`}>
                    <Icon 
                      name={getRecommendation()?.urgency === 'high' ? 'AlertTriangle' : 
                            getRecommendation()?.urgency === 'medium' ? 'Clock' : 'CheckCircle'} 
                      size={24} 
                      className={getRecommendation()?.color}
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className={`text-xl font-bold mb-2 ${getRecommendation()?.color}`}>
                      {getRecommendation()?.title}
                    </h4>
                    <p className="text-text-primary mb-4">
                      {getRecommendation()?.message}
                    </p>
                    
                    {selectedSymptoms?.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-text-secondary mb-2">Selected symptoms:</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedSymptoms?.map(symptomId => {
                            const symptom = commonSymptoms?.find(s => s?.id === symptomId);
                            return (
                              <span key={symptomId} className="px-3 py-1 bg-white rounded-full text-sm text-text-primary border border-border">
                                {symptom?.label}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  variant="default"
                  iconName="Camera"
                  iconPosition="left"
                  iconSize={18}
                >
                  Take Photo Analysis
                </Button>
                <Button
                  variant="outline"
                  iconName="Calendar"
                  iconPosition="left"
                  iconSize={18}
                >
                  Find Local Dentist
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowResults(false);
                    setSelectedSymptoms([]);
                    setDescription('');
                  }}
                  iconName="RotateCcw"
                  iconPosition="left"
                  iconSize={18}
                >
                  Start Over
                </Button>
              </div>

              {/* Disclaimer */}
              <div className="bg-muted p-4 rounded-lg border border-border">
                <p className="text-sm text-text-secondary text-center">
                  <Icon name="Info" size={16} className="inline mr-2" />
                  This tool provides general guidance only and is not a substitute for professional medical advice. 
                  Always consult with a qualified dentist for proper diagnosis and treatment.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default SymptomChecker;