import React, { useState } from 'react';
import Button from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';
import Icon from '../../../components/AppIcon';

const SymptomChecker = () => {
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [description, setDescription] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const commonSymptoms = [
    { id: 'pain', label: 'Tooth Pain', desc: 'Sharp, throbbing, or constant ache.', icon: 'Zap' },
    { id: 'bleeding', label: 'Bleeding Gums', desc: 'Blood when brushing or flossing.', icon: 'Droplet' },
    { id: 'swelling', label: 'Swelling', desc: 'Inflammation in gums or jaw.', icon: 'Maximize2' },
    { id: 'bad_breath', label: 'Bad Breath', desc: 'Persistent odor or bad taste.', icon: 'Wind' },
    { id: 'sensitivity', label: 'Sensitivity', desc: 'Pain to hot, cold, or sweet.', icon: 'Thermometer' },
    { id: 'loose', label: 'Loose Teeth', desc: 'Shifting or wobbly feeling.', icon: 'Move' },
  ];

  const handleSymptomChange = (symptomId, checked) => {
    if (checked) {
      setSelectedSymptoms([...selectedSymptoms, symptomId]);
    } else {
      setSelectedSymptoms(selectedSymptoms.filter(id => id !== symptomId));
    }
  };

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setShowResults(true);
    }, 1500);
  };

  const getRecommendation = () => {
    if (selectedSymptoms.includes('pain') || selectedSymptoms.includes('swelling')) {
      return {
        urgency: 'high',
        title: 'Immediate Attention Advised',
        message: 'Your symptoms suggest a potential infection or acute issue. We recommend seeing a dentist within 24-48 hours.',
        color: 'red',
        icon: 'AlertTriangle'
      };
    } else if (selectedSymptoms.includes('bleeding') || selectedSymptoms.includes('loose')) {
      return {
        urgency: 'medium',
        title: 'Schedule an Appointment',
        message: 'These signs often indicate early gum disease. A professional cleaning and exam should be scheduled soon.',
        color: 'amber',
        icon: 'Clock'
      };
    } else {
      return {
        urgency: 'low',
        title: 'Monitor & Maintain',
        message: 'Your symptoms are mild. Improve your daily hygiene routine and monitor for changes. If they persist, book a check-up.',
        color: 'green',
        icon: 'CheckCircle'
      };
    }
  };

  const recommendation = getRecommendation();

  return (
    <section className="py-24 bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
      
      {/* Decor */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-6">
            <Icon name="Activity" size={14} />
            <span>AI Triage</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
            Check Your Symptoms <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              In Seconds
            </span>
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Not sure if it's serious? Select what you're feeling, and our AI will recommend the best next step.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
          
          {!showResults ? (
            <div className="p-8 lg:p-12 relative">
              
              {/* Loading Overlay */}
              {isAnalyzing && (
                <div className="absolute inset-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center animate-in fade-in duration-300">
                   <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4" />
                   <p className="text-slate-900 dark:text-white font-bold text-lg animate-pulse">Analyzing Symptoms...</p>
                </div>
              )}

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {commonSymptoms.map((symptom) => (
                  <label 
                    key={symptom.id} 
                    className={`
                      relative flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-200
                      ${selectedSymptoms.includes(symptom.id) 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500' 
                        : 'border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-slate-600'
                      }
                    `}
                  >
                    <div className="mt-1">
                      <Checkbox
                        checked={selectedSymptoms.includes(symptom.id)}
                        onChange={(e) => handleSymptomChange(symptom.id, e.target.checked)}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white mb-1">
                        <Icon name={symptom.icon} size={16} className={selectedSymptoms.includes(symptom.id) ? 'text-blue-600' : 'text-slate-400'} />
                        {symptom.label}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {symptom.desc}
                      </p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-8 border border-slate-100 dark:border-slate-800">
                <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Additional Details (Optional)</label>
                <textarea 
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                  rows="3"
                  placeholder="e.g., 'Pain started 2 days ago after eating ice cream...'"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="text-center">
                <Button 
                  size="lg" 
                  onClick={handleAnalyze} 
                  disabled={selectedSymptoms.length === 0}
                  className={`w-full sm:w-auto px-12 ${selectedSymptoms.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  iconName="Activity"
                >
                  Analyze Symptoms
                </Button>
                {selectedSymptoms.length === 0 && (
                  <p className="text-xs text-red-500 mt-3 animate-pulse">Please select at least one symptom.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="animate-in slide-in-from-bottom-8 duration-500">
              
              {/* Result Header */}
              <div className={`bg-${recommendation.color}-500/10 border-b border-${recommendation.color}-500/20 p-8 text-center`}>
                <div className={`w-16 h-16 rounded-full bg-${recommendation.color}-100 dark:bg-${recommendation.color}-900/30 flex items-center justify-center mx-auto mb-4 text-${recommendation.color}-600`}>
                  <Icon name={recommendation.icon} size={32} />
                </div>
                <h3 className={`text-2xl font-bold text-${recommendation.color}-700 dark:text-${recommendation.color}-400 mb-2`}>
                  {recommendation.title}
                </h3>
                <p className={`text-${recommendation.color}-900/70 dark:text-${recommendation.color}-200/70 max-w-lg mx-auto`}>
                  {recommendation.message}
                </p>
              </div>

              {/* Action Body */}
              <div className="p-8 lg:p-12 text-center">
                <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Recommended Next Steps</h4>
                
                <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto mb-10">
                  <button className="flex flex-col items-center p-6 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:shadow-lg transition-all group">
                    <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center text-blue-600 mb-3 shadow-sm group-hover:scale-110 transition-transform">
                      <Icon name="Camera" size={24} />
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white">Get AI Scan</span>
                    <span className="text-xs text-slate-500 mt-1">Verify visually</span>
                  </button>
                  
                  <button className="flex flex-col items-center p-6 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-green-500 hover:shadow-lg transition-all group">
                    <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center text-green-600 mb-3 shadow-sm group-hover:scale-110 transition-transform">
                      <Icon name="MapPin" size={24} />
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white">Find Dentist</span>
                    <span className="text-xs text-slate-500 mt-1">Book nearby</span>
                  </button>
                </div>

                <Button 
                  variant="ghost" 
                  onClick={() => { setShowResults(false); setSelectedSymptoms([]); }}
                  iconName="RotateCcw"
                  className="text-slate-500 hover:text-slate-800 dark:hover:text-white"
                >
                  Start Over
                </Button>
              </div>

              {/* Disclaimer */}
              <div className="bg-slate-50 dark:bg-slate-950 p-4 text-center border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Icon name="Info" size={14} />
                  This result is for informational purposes only and does not constitute medical advice.
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