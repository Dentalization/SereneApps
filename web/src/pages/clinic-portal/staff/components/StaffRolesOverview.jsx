import React from 'react';
import AppIcon from '../../../../components/AppIcon';

const ROLE_CONFIG = [
  { key: 'owner', icon: 'Crown', accent: 'bg-purple-100 text-purple-700' },
  { key: 'manager', icon: 'Briefcase', accent: 'bg-blue-100 text-blue-700' },
  { key: 'front_office', icon: 'Phone', accent: 'bg-emerald-100 text-emerald-700' },
  { key: 'nurse', icon: 'Stethoscope', accent: 'bg-pink-100 text-pink-700' },
  { key: 'cashier', icon: 'Calculator', accent: 'bg-amber-100 text-amber-700' }
];

const StaffRolesOverview = ({ descriptions, labels, roleCounts }) => (
  <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    {ROLE_CONFIG.map(({ key, icon, accent }) => (
      <article
        key={key}
        className="rounded-xl border border-border/50 bg-surface-elevated p-5 shadow-sm shadow-primary/5 transition duration-150 hover:-translate-y-0.5 hover:shadow-md"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`${accent} inline-flex h-11 w-11 items-center justify-center rounded-lg`}> 
              <AppIcon name={icon} size={20} className="stroke-current" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-primary">{labels[key]}</h3>
              <p className="text-sm text-secondary">{descriptions[key]}</p>
            </div>
          </div>
          <span className="rounded-full bg-surface px-3 py-1 text-sm font-medium text-secondary">
            {roleCounts[key] ?? 0}
          </span>
        </div>
      </article>
    ))}
  </section>
);

export default StaffRolesOverview;
