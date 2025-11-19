import React, { useState, useEffect } from 'react';
import Icon from '../../../../components/AppIcon';

const AIBillingSettings = ({ user, onDataChange }) => {
  // State data remains the same
  const [billingData, setBillingData] = useState({
    currentPlan: 'basic',
    aiCredits: 150,
    totalCredits: 500,
    billingCycle: 'monthly',
    nextBillingDate: '2025-10-17',
    paymentMethod: 'card_ending_4321'
  });

  const [usageStats, setUsageStats] = useState({
    thisMonth: {
      aiAnalysis: 45,
      teledentistry: 23,
      cdss: 12,
      totalUsage: 80
    },
    lastMonth: {
      aiAnalysis: 52,
      teledentistry: 28,
      cdss: 15,
      totalUsage: 95
    }
  });

  const subscriptionPlans = [
    {
      id: 'basic',
      name: 'Basic',
      price: 199000,
      credits: 500,
      features: [
        'Basic AI Analysis',
        'Teledentistry sessions',
        'Basic CDSS support',
        'Email support'
      ],
      popular: false
    },
    {
      id: 'professional',
      name: 'Professional',
      price: 399000,
      credits: 1200,
      features: [
        'Advanced AI Analysis',
        'Unlimited teledentistry',
        'Advanced CDSS with recommendations',
        'Priority support',
        'Custom reports'
      ],
      popular: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 799000,
      credits: 3000,
      features: [
        'Premium AI Analysis',
        'Unlimited everything',
        'Full CDSS with AI insights',
        '24/7 phone support',
        'API access',
        'White-label options'
      ],
      popular: false
    }
  ];

  const paymentMethods = [
    {
      id: 'card_ending_4321',
      type: 'credit_card',
      last4: '4321',
      brand: 'Visa',
      expiryMonth: 12,
      expiryYear: 2027,
      isDefault: true
    },
    {
      id: 'bank_transfer',
      type: 'bank_transfer',
      bankName: 'Bank BCA',
      accountNumber: '****1234',
      isDefault: false
    }
  ];
  // Helper functions remain the same
  const getCreditsUsagePercentage = () => {
    return Math.round(((billingData.totalCredits - billingData.aiCredits) / billingData.totalCredits) * 100);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    // Using en-US locale for English date format
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handlePlanChange = (planId) => {
    setBillingData(prev => ({
      ...prev,
      currentPlan: planId
    }));
    onDataChange?.(true);
  };

  const handleAddPaymentMethod = () => {
    // TODO: Implement add payment method modal
    alert('The feature to add a new payment method is coming soon!');
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-primary mb-2 theme-transition">
          AI & Billing
        </h2>
        <p className="text-secondary theme-transition">
          Manage your AI usage, subscription, and payment methods
        </p>
      </div>

      {/* AI Credits Overview */}
      <div className="mb-8">
        <div className="bg-gradient-to-br from-accent/10 to-accent/5 rounded-2xl p-6 border border-accent/20">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-primary mb-1">
                AI Credits
              </h3>
              <p className="text-secondary">
                Credits for using AI features
              </p>
            </div>
            <div className="w-16 h-16 bg-accent/20 rounded-2xl flex items-center justify-center">
              <Icon name="Brain" size={32} className="text-accent" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Remaining Credits */}
            <div className="text-center">
              <div className="text-3xl font-bold text-accent mb-1">
                {billingData.aiCredits}
              </div>
              <div className="text-sm text-secondary">
                Remaining Credits
              </div>
            </div>

            {/* Total Credits */}
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-1">
                {billingData.totalCredits}
              </div>
              <div className="text-sm text-secondary">
                Total Credits
              </div>
            </div>

            {/* Usage Percentage */}
            <div className="text-center">
              <div className="text-3xl font-bold text-accent mb-1">
                {getCreditsUsagePercentage()}%
              </div>
              <div className="text-sm text-secondary">
                Used
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm text-secondary mb-2">
              <span>This month's usage</span>
              <span>{billingData.totalCredits - billingData.aiCredits} / {billingData.totalCredits}</span>
            </div>
            <div className="w-full bg-surface rounded-full h-3">
              <div 
                className="bg-accent rounded-full h-3 transition-all duration-500"
                style={{ width: `${getCreditsUsagePercentage()}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Statistics */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-primary mb-4">
          Usage Statistics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* AI Analysis */}
          <div className="bg-surface-elevated rounded-2xl p-6 border border-primary">
            <div className="flex items-center justify-between mb-4">
              <Icon name="Brain" size={24} className="text-blue-500" />
              <div className="text-sm text-secondary">
                {usageStats.thisMonth.aiAnalysis > usageStats.lastMonth.aiAnalysis ? '+' : ''}
                {usageStats.thisMonth.aiAnalysis - usageStats.lastMonth.aiAnalysis}
              </div>
            </div>
            <div className="text-2xl font-bold text-primary mb-1">
              {usageStats.thisMonth.aiAnalysis}
            </div>
            <div className="text-sm text-secondary">
              AI Analysis
            </div>
          </div>

          {/* Teledentistry */}
          <div className="bg-surface-elevated rounded-2xl p-6 border border-primary">
            <div className="flex items-center justify-between mb-4">
              <Icon name="Video" size={24} className="text-green-500" />
              <div className="text-sm text-secondary">
                {usageStats.thisMonth.teledentistry > usageStats.lastMonth.teledentistry ? '+' : ''}
                {usageStats.thisMonth.teledentistry - usageStats.lastMonth.teledentistry}
              </div>
            </div>
            <div className="text-2xl font-bold text-primary mb-1">
              {usageStats.thisMonth.teledentistry}
            </div>
            <div className="text-sm text-secondary">
              Teledentistry
            </div>
          </div>

          {/* CDSS */}
          <div className="bg-surface-elevated rounded-2xl p-6 border border-primary">
            <div className="flex items-center justify-between mb-4">
              <Icon name="Stethoscope" size={24} className="text-purple-500" />
              <div className="text-sm text-secondary">
                {usageStats.thisMonth.cdss > usageStats.lastMonth.cdss ? '+' : ''}
                {usageStats.thisMonth.cdss - usageStats.lastMonth.cdss}
              </div>
            </div>
            <div className="text-2xl font-bold text-primary mb-1">
              {usageStats.thisMonth.cdss}
            </div>
            <div className="text-sm text-secondary">
              CDSS Support
            </div>
          </div>

          {/* Total Usage */}
          <div className="bg-surface-elevated rounded-2xl p-6 border border-primary">
            <div className="flex items-center justify-between mb-4">
              <Icon name="BarChart3" size={24} className="text-accent" />
              <div className="text-sm text-secondary">
                {usageStats.thisMonth.totalUsage > usageStats.lastMonth.totalUsage ? '+' : ''}
                {usageStats.thisMonth.totalUsage - usageStats.lastMonth.totalUsage}
              </div>
            </div>
            <div className="text-2xl font-bold text-primary mb-1">
              {usageStats.thisMonth.totalUsage}
            </div>
            <div className="text-sm text-secondary">
              Total Usage
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Plans */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-primary mb-4">
          Subscription Plans
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {subscriptionPlans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-surface-elevated rounded-2xl p-6 border transition-all duration-300 cursor-pointer ${
                billingData.currentPlan === plan.id
                  ? 'border-accent shadow-lg ring-4 ring-accent/20'
                  : 'border-primary hover:border-accent/50'
              }`}
              onClick={() => handlePlanChange(plan.id)}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="bg-accent text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Popular
                  </div>
                </div>
              )}
              
              <div className="text-center mb-6">
                <h4 className="text-xl font-bold text-primary mb-2">
                  {plan.name}
                </h4>
                <div className="text-3xl font-bold text-accent mb-1">
                  {formatCurrency(plan.price)}
                </div>
                <div className="text-sm text-secondary">
                  per month
                </div>
              </div>

              <div className="mb-6">
                <div className="text-center mb-4">
                  <div className="text-2xl font-bold text-primary">
                    {plan.credits}
                  </div>
                  <div className="text-sm text-secondary">
                    AI Credits
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <Icon name="Check" size={16} className="text-green-500 flex-shrink-0" />
                    <span className="text-sm text-secondary">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              {billingData.currentPlan === plan.id ? (
                <div className="text-center py-3 bg-accent/10 rounded-xl border border-accent/30">
                  <span className="text-accent font-semibold">
                    Active Plan
                  </span>
                </div>
              ) : (
                <button className="w-full py-3 bg-accent hover:bg-accent/90 text-white rounded-xl font-semibold transition-all duration-200">
                  Upgrade to {plan.name}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Payment Methods */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-primary">
            Payment Methods
          </h3>
          <button
            onClick={handleAddPaymentMethod}
            className="flex items-center space-x-2 px-4 py-2 bg-accent/10 hover:bg-accent/20 text-accent rounded-xl font-medium transition-all duration-200"
          >
            <Icon name="Plus" size={16} />
            <span>Add Method</span>
          </button>
        </div>

        <div className="space-y-4">
          {paymentMethods.map((method) => (
            <div
              key={method.id}
              className={`bg-surface-elevated rounded-2xl p-6 border transition-all duration-300 ${
                method.isDefault
                  ? 'border-accent shadow-md ring-2 ring-accent/20'
                  : 'border-primary hover:border-accent/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    method.type === 'credit_card' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-green-100 dark:bg-green-900/30'
                  }`}>
                    <Icon 
                      name={method.type === 'credit_card' ? 'CreditCard' : 'Building2'} 
                      size={24} 
                      className={method.type === 'credit_card' ? 'text-blue-600' : 'text-green-600'} 
                    />
                  </div>
                  <div>
                    <div className="font-semibold text-primary">
                      {method.type === 'credit_card' 
                        ? `${method.brand} •••• ${method.last4}`
                        : `${method.bankName} •••• ${method.accountNumber.slice(-4)}`
                      }
                    </div>
                    <div className="text-sm text-secondary">
                      {method.type === 'credit_card' 
                        ? `Expires ${method.expiryMonth}/${method.expiryYear}`
                        : 'Bank Transfer'
                      }
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {method.isDefault && (
                    <span className="px-3 py-1 bg-accent/10 text-accent rounded-full text-sm font-medium">
                      Default
                    </span>
                  )}
                  <button className="p-2 hover:bg-surface-muted rounded-lg transition-colors">
                    <Icon name="MoreHorizontal" size={20} className="text-secondary" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Billing Information */}
      <div className="bg-surface-elevated rounded-2xl p-6 border border-primary">
        <h3 className="text-lg font-semibold text-primary mb-4">
          Billing Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-sm text-secondary mb-1">
              Current Plan
            </div>
            <div className="font-semibold text-primary capitalize">
              {subscriptionPlans.find(p => p.id === billingData.currentPlan)?.name}
            </div>
          </div>
          <div>
            <div className="text-sm text-secondary mb-1">
              Billing Cycle
            </div>
            <div className="font-semibold text-primary capitalize">
              {billingData.billingCycle === 'monthly' ? 'Monthly' : 'Yearly'}
            </div>
          </div>
          <div>
            <div className="text-sm text-secondary mb-1">
              Next Billing Date
            </div>
            <div className="font-semibold text-primary">
              {formatDate(billingData.nextBillingDate)}
            </div>
          </div>
          <div>
            <div className="text-sm text-secondary mb-1">
              Amount
            </div>
            <div className="font-semibold text-primary">
              {formatCurrency(subscriptionPlans.find(p => p.id === billingData.currentPlan)?.price || 0)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIBillingSettings;