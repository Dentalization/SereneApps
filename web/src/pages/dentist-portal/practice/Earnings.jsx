import React from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import SideBar from '../ui/SideBar';

const Earnings = () => {
  const insights = [
    {
      label: 'Monthly Revenue',
      value: 'Rp 48.250.000',
      chip: '+18% vs last month',
      icon: 'TrendingUp',
      accent: 'text-brand-primary',
    },
    {
      label: 'Average Ticket Size',
      value: 'Rp 1.550.000',
      chip: 'Specialist focus',
      icon: 'CreditCard',
      accent: 'text-brand-secondary',
    },
    {
      label: 'Teleconsultation Share',
      value: '22%',
      chip: 'Hybrid model',
      icon: 'Camera',
      accent: 'text-accent',
    },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      <SideBar />
      <div className="flex-1 p-6">
        <div className="max-w-5xl mx-auto space-y-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-wider text-muted">My Practice</p>
          <h1 className="text-3xl font-bold text-foreground">Earnings</h1>
          <p className="text-muted-foreground">
            Track revenue trends from consultations, specialist services, and teleconsultation sessions. Detailed payout view will be available soon.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          {insights.map((card) => (
            <div key={card.label} className="rounded-2xl border border-primary/10 bg-surface-elevated shadow-theme-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wider text-muted">{card.label}</p>
                <Icon name={card.icon} className={card.accent} />
              </div>
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
              <p className="text-xs font-semibold text-success/80">{card.chip}</p>
            </div>
          ))}
        </div>

        <div className="bg-surface-elevated border border-primary/10 rounded-2xl shadow-theme-md p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Detailed Payout Reports</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Earnings breakdown by service type, payment channel, and clinic payouts is on the way.
              </p>
            </div>
            <Button disabled className="opacity-80 cursor-not-allowed">
              Coming Soon
            </Button>
          </div>
          <div className="rounded-xl border border-dashed border-primary/30 p-5 text-center">
            <p className="text-sm text-muted-foreground">
              Need raw payout data now? Contact SereneAI Concierge at{' '}
              <a href="mailto:concierge@sereneai.com" className="text-brand-primary underline">
                concierge@sereneai.com
              </a>
            </p>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default Earnings;
