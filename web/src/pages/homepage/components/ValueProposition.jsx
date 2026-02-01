import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const ValueProposition = () => {
  const patientBenefits = [
    {
      icon: "Heart",
      title: "Reduce Anxiety",
      description: "Understand your oral health before the visit. Knowledge is confidence.",
      highlight: "-87% Anxiety"
    },
    {
      icon: "Zap",
      title: "Instant Results",
      description: "Get a professional-grade analysis in seconds, anytime, anywhere.",
      highlight: "< 2 Seconds"
    },
    {
      icon: "ShieldCheck",
      title: "Early Detection",
      description: "Catch potential issues early to avoid painful and costly procedures.",
      highlight: "3x Earlier"
    },
    {
      icon: "Wallet",
      title: "Save Money",
      description: "Prevent emergency treatments by identifying minor issues first.",
      highlight: "$2,400+ Saved"
    }
  ];

  const professionalBenefits = [
    {
      icon: "Activity",
      title: "Diagnostic Accuracy",
      description: "AI second opinions confirm diagnoses and catch overlooked details.",
      highlight: "+15% Accuracy"
    },
    {
      icon: "Clock",
      title: "Workflow Speed",
      description: "Pre-analyzed images streamline consultations and reduce chair time.",
      highlight: "30% Faster"
    },
    {
      icon: "MessageCircle",
      title: "Case Acceptance",
      description: "Visual AI reports help patients understand and say 'yes' to treatment.",
      highlight: "85% Acceptance"
    },
    {
      icon: "TrendingUp",
      title: "Practice Growth",
      description: "Attract tech-savvy patients with cutting-edge AI diagnostics.",
      highlight: "+40% Growth"
    }
  ];

  return (
    <section className="relative py-24 overflow-hidden bg-slate-50 dark:bg-slate-950">
      
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center mb-20 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-6">
            <Icon name="Sparkles" size={14} />
            <span>Value for Everyone</span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">
            Transforming Dental Care <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              For Patients & Professionals
            </span>
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            Whether you're seeking peace of mind or looking to modernize your practice, 
            Serene AI delivers clinically validated value.
          </p>
        </div>

        {/* Split Cards Grid */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-stretch mb-20">
          
          {/* Card 1: Patients */}
          <div className="group relative bg-white dark:bg-slate-900 rounded-[2rem] p-8 lg:p-12 shadow-xl hover:shadow-2xl transition-all duration-500 border border-slate-200 dark:border-slate-800 hover:-translate-y-1">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Icon name="Heart" size={120} className="text-pink-500" />
            </div>
            
            <div className="relative z-10">
              <div className="w-16 h-16 bg-pink-100 dark:bg-pink-900/30 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
                <Icon name="User" size={32} className="text-pink-600 dark:text-pink-400" />
              </div>
              
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">For Patients</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-10">Empower yourself with instant dental clarity.</p>

              <div className="grid sm:grid-cols-2 gap-6 mb-10">
                {patientBenefits.map((benefit, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon name={benefit.icon} size={18} className="text-pink-500" />
                      <span className="text-xs font-bold uppercase tracking-wider text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-900/20 px-2 py-0.5 rounded-full">
                        {benefit.highlight}
                      </span>
                    </div>
                    <h4 className="font-semibold text-slate-900 dark:text-white">{benefit.title}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-snug">{benefit.description}</p>
                  </div>
                ))}
              </div>

              <Link to="/for-patients" className="block">
                <Button
                  className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 py-6 text-lg shadow-lg"
                  iconName="ArrowRight"
                  iconPosition="right"
                >
                  Explore Patient Features
                </Button>
              </Link>
            </div>
          </div>

          {/* Card 2: Professionals */}
          <div className="group relative bg-slate-900 dark:bg-black rounded-[2rem] p-8 lg:p-12 shadow-xl hover:shadow-2xl transition-all duration-500 border border-slate-800 hover:-translate-y-1">
             {/* Gradient Border Effect */}
             <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Icon name="Stethoscope" size={120} className="text-blue-500" />
            </div>

            <div className="relative z-10">
              <div className="w-16 h-16 bg-blue-900/50 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300 ring-1 ring-blue-500/30">
                <Icon name="Stethoscope" size={32} className="text-blue-400" />
              </div>

              <h3 className="text-3xl font-bold text-white mb-2">For Dentists</h3>
              <p className="text-slate-400 mb-10">Supercharge your clinic with AI diagnostics.</p>

              <div className="grid sm:grid-cols-2 gap-6 mb-10">
                {professionalBenefits.map((benefit, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon name={benefit.icon} size={18} className="text-blue-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-300 bg-blue-900/50 px-2 py-0.5 rounded-full border border-blue-500/30">
                        {benefit.highlight}
                      </span>
                    </div>
                    <h4 className="font-semibold text-white">{benefit.title}</h4>
                    <p className="text-sm text-slate-400 leading-snug">{benefit.description}</p>
                  </div>
                ))}
              </div>

              <Link to="/for-dentists" className="block">
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white border-none py-6 text-lg shadow-lg shadow-blue-900/50"
                  iconName="ArrowRight"
                  iconPosition="right"
                >
                  Explore Clinical Suite
                </Button>
              </Link>
            </div>
          </div>

        </div>

        {/* Bottom CTA (Bento Grid Style) */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-2xl">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20" />
          
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between p-10 lg:p-16 gap-10">
            <div className="max-w-2xl text-center lg:text-left">
              <h3 className="text-3xl lg:text-4xl font-bold mb-4">
                Ready to Experience the Future?
              </h3>
              <p className="text-blue-100 text-lg mb-8">
                Join thousands who trust Serene AI for accurate, instant dental insights. 
                Start your free analysis today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link to="/serene-ai">
                  <Button
                    className="bg-white text-blue-600 hover:bg-blue-50 font-bold border-none px-8 py-4 h-auto text-lg shadow-xl"
                    iconName="Camera"
                    iconPosition="left"
                  >
                    Start Free Analysis
                  </Button>
                </Link>
                <Link to="/pricing">
                  <Button
                    variant="outline"
                    className="border-white text-white hover:bg-white/10 px-8 py-4 h-auto text-lg"
                    iconName="CreditCard"
                    iconPosition="left"
                  >
                    View Pricing
                  </Button>
                </Link>
              </div>
            </div>

            {/* Decorative Stat */}
            <div className="hidden lg:block bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 transform rotate-3 hover:rotate-0 transition-transform duration-500">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                  <Icon name="TrendingUp" size={24} className="text-blue-600" />
                </div>
                <div>
                  <div className="text-xs text-blue-100 uppercase tracking-wider">Growth</div>
                  <div className="text-2xl font-bold text-white">+240%</div>
                </div>
              </div>
              <div className="h-1.5 w-48 bg-black/20 rounded-full overflow-hidden">
                <div className="h-full bg-white w-[75%] rounded-full" />
              </div>
              <div className="mt-2 text-xs text-blue-100">User adoption this month</div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default ValueProposition;