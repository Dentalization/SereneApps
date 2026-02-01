import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const PricingSection = () => {
  const [billingCycle, setBillingCycle] = useState('monthly');

  const plans = [
    {
      name: 'Starter',
      price: '$199',
      desc: 'Essential AI tools for solo practitioners.',
      features: ['100 AI Analyses/mo', 'Basic Dashboard', 'Email Support', 'Single User'],
      btn: 'Start Free Trial',
      variant: 'outline'
    },
    {
      name: 'Professional',
      price: '$499',
      desc: 'Advanced diagnostics for growing clinics.',
      features: ['500 AI Analyses/mo', 'PMS Integration', 'Priority Support', '5 Team Seats', 'Patient PDF Reports'],
      btn: 'Start Free Trial',
      variant: 'default',
      popular: true
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      desc: 'Full-scale platform for DSOs & hospitals.',
      features: ['Unlimited Analyses', 'API Access', 'Dedicated CSM', 'SSO & Audit Logs', 'Custom AI Models'],
      btn: 'Contact Sales',
      variant: 'outline'
    }
  ];

  return (
    <section className="py-24 bg-slate-50 dark:bg-slate-950 overflow-hidden relative" id="pricing">
      
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider mb-6">
            <Icon name="Tag" size={14} />
            <span>Transparent Pricing</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
            Choose Your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              Growth Engine
            </span>
          </h2>
          
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10">
            Simple, predictable pricing. No hidden fees. Start with a 14-day free trial.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex bg-slate-200 dark:bg-slate-800 p-1 rounded-full relative">
            <button 
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${billingCycle === 'monthly' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
              onClick={() => setBillingCycle('monthly')}
            >
              Monthly
            </button>
            <button 
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${billingCycle === 'annual' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
              onClick={() => setBillingCycle('annual')}
            >
              Annual <span className="text-green-500 text-xs ml-1">-20%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-3 gap-8 mb-20">
          {plans.map((plan, index) => (
            <div 
              key={index} 
              className={`relative flex flex-col p-8 rounded-[2rem] border transition-all duration-300 ${
                plan.popular 
                  ? 'bg-white dark:bg-slate-900 border-blue-500 shadow-2xl scale-105 z-10' 
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-slate-700'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                  MOST POPULAR
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-extrabold text-slate-900 dark:text-white">{plan.price}</span>
                  {plan.price !== 'Custom' && <span className="text-slate-500">/mo</span>}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{plan.desc}</p>
              </div>

              <div className="space-y-4 mb-8 flex-1">
                {plan.features.map((feat, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${plan.popular ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                      <Icon name="Check" size={12} />
                    </div>
                    {feat}
                  </div>
                ))}
              </div>

              <Button 
                variant={plan.variant} 
                className={`w-full ${plan.popular ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/30' : ''}`}
              >
                {plan.btn}
              </Button>
            </div>
          ))}
        </div>

        {/* ROI Calculator Banner */}
        <div className="bg-slate-900 rounded-[2.5rem] p-8 lg:p-12 relative overflow-hidden border border-slate-800 shadow-2xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center relative z-10">
            <div>
              <h3 className="text-2xl font-bold text-white mb-4">Calculate Your ROI</h3>
              <p className="text-slate-400 mb-8">
                Most practices see a 300% return on investment within the first 90 days 
                through increased case acceptance and time savings.
              </p>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                  <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Time Saved</div>
                  <div className="text-2xl font-bold text-white">4h <span className="text-sm font-normal text-slate-400">/ day</span></div>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                  <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Revenue Boost</div>
                  <div className="text-2xl font-bold text-green-400">+$12k <span className="text-sm font-normal text-slate-400">/ mo</span></div>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-1">
              <div className="bg-slate-900 rounded-xl p-6 h-full flex flex-col items-center justify-center text-center">
                <Icon name="TrendingUp" size={48} className="text-blue-400 mb-4" />
                <h4 className="text-xl font-bold text-white mb-2">Guaranteed Performance</h4>
                <p className="text-sm text-slate-400">
                  If you don't save at least 10 hours in your first month, we'll refund your subscription.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default PricingSection;