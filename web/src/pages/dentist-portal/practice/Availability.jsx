import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import SideBar from '../ui/SideBar';

const Availability = () => {
  const templates = [
    {
      title: 'Smart Availability Templates',
      description: 'Configure weekday, weekend, and teleconsultation slots in seconds. Syncs with schedule and patient booking automatically.',
      icon: 'Calendar',
      accent: 'from-brand-primary/10 to-brand-accent/10 text-brand-primary',
    },
    {
      title: 'Instant Blocking',
      description: 'Heading to a conference or taking leave? Block times instantly and SereneAI will update patient booking windows.',
      icon: 'Slash',
      accent: 'from-warning/10 to-orange-100 text-warning',
    },
    {
      title: 'Cross-Channel Sync',
      description: 'Availability syncs with teleconsultation, in-clinic appointments, and clinic schedules (for clinic dentists).',
      icon: 'Repeat',
      accent: 'from-success/10 to-emerald-100 text-success',
    },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      <SideBar />
      <div className="flex-1 p-6">
        <div className="max-w-5xl mx-auto space-y-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-wider text-muted">My Practice</p>
          <h1 className="text-3xl font-bold text-foreground">Availability</h1>
          <p className="text-muted-foreground">
            Control when you are discoverable in SereneAI. Availability updates sync to patient booking, reminders, and teleconsultation workflows automatically.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          {templates.map((tile) => (
            <div key={tile.title} className="rounded-2xl border border-primary/10 bg-surface-elevated shadow-theme-sm p-5 space-y-3">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${tile.accent} flex items-center justify-center`}>
                <Icon name={tile.icon} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{tile.title}</h3>
                <p className="text-sm text-muted-foreground">{tile.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-surface-elevated border border-primary/10 rounded-2xl p-6 shadow-theme-md space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Sync with Schedule</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Manage slots inside the Schedule page and they’ll appear throughout the portal.
              </p>
            </div>
            <Button asChild>
              <Link to="/dentist-portal/schedule">Open Schedule</Link>
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-primary/5 p-4">
              <p className="text-xs uppercase tracking-wider text-muted">Today</p>
              <p className="text-2xl font-bold text-foreground">6 Available Slots</p>
              <p className="text-sm text-muted-foreground">Including teleconsultation sessions</p>
            </div>
            <div className="rounded-xl bg-brand-secondary/5 p-4">
              <p className="text-xs uppercase tracking-wider text-muted">Next 7 Days</p>
              <p className="text-2xl font-bold text-foreground">32 Appointments</p>
              <p className="text-sm text-muted-foreground">Auto reminders activated</p>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default Availability;
