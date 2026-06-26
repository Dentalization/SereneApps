import React from 'react';
import Icon from '../../../../components/AppIcon';

const iconMap = {
  'active-care': { icon: 'HeartPulse', tone: 'emerald' },
  'add-patient': { icon: 'UserRoundPlus', tone: 'blue' },
  'ai-diagnostic': { icon: 'BrainCircuit', tone: 'violet' },
  'ai-assistant': { icon: 'BotMessageSquare', tone: 'indigo' },
  'ai-chat-prompt': { icon: 'MessagesSquare', tone: 'blue' },
  'ai-confidence': { icon: 'GaugeCircle', tone: 'violet' },
  'ai-error': { icon: 'TriangleAlert', tone: 'red' },
  'ai-images': { icon: 'Images', tone: 'cyan' },
  'ai-image-unavailable': { icon: 'ImageOff', tone: 'slate' },
  'ai-recommendation': { icon: 'Lightbulb', tone: 'amber' },
  'ai-summary': { icon: 'FileSearch', tone: 'blue' },
  'ai-unavailable': { icon: 'BrainCircuit', tone: 'amber' },
  'allergy-alert': { icon: 'ShieldAlert', tone: 'red' },
  'appointment-calendar': { icon: 'CalendarClock', tone: 'amber' },
  'appointment-cancelled': { icon: 'XCircle', tone: 'red' },
  'appointment-completed': { icon: 'CircleCheckBig', tone: 'emerald' },
  'appointment-overdue': { icon: 'TriangleAlert', tone: 'orange' },
  'appointment-upcoming': { icon: 'Hourglass', tone: 'amber' },
  'billing-ledger': { icon: 'ReceiptText', tone: 'blue' },
  'case-findings': { icon: 'ScanSearch', tone: 'blue' },
  'clinical-note': { icon: 'ClipboardPenLine', tone: 'slate' },
  'clinic-patient': { icon: 'Building2', tone: 'amber' },
  'communication': { icon: 'MessageCircleMore', tone: 'blue' },
  'consent-document': { icon: 'FileCheck2', tone: 'emerald' },
  'emergency-contact': { icon: 'Siren', tone: 'red' },
  'emr-empty': { icon: 'FileClock', tone: 'slate' },
  'emr-record': { icon: 'ClipboardPlus', tone: 'blue' },
  'file-sharing': { icon: 'Paperclip', tone: 'violet' },
  'insurance-shield': { icon: 'ShieldCheck', tone: 'emerald' },
  'invoice-document': { icon: 'FileText', tone: 'slate' },
  'medical-condition': { icon: 'Activity', tone: 'amber' },
  'medication': { icon: 'Pill', tone: 'blue' },
  'mobile-patient': { icon: 'Smartphone', tone: 'cyan' },
  'odontogram': { icon: 'LayoutGrid', tone: 'cyan' },
  'patient-directory': { icon: 'UsersRound', tone: 'blue' },
  'patient-profile': { icon: 'ContactRound', tone: 'blue' },
  'payment-card': { icon: 'CreditCard', tone: 'indigo' },
  'payment-rate': { icon: 'Gauge', tone: 'indigo' },
  'procedure': { icon: 'Microscope', tone: 'emerald' },
  'secure-chat': { icon: 'MessageSquareText', tone: 'blue' },
  'session-history': { icon: 'History', tone: 'amber' },
  'teledentistry': { icon: 'Video', tone: 'emerald' },
  'treatment-cost': { icon: 'CircleDollarSign', tone: 'indigo' },
  'treatment-plan': { icon: 'ClipboardList', tone: 'blue' },
  'treatment-progress': { icon: 'ListChecks', tone: 'amber' },
};

const toneClasses = {
  amber: {
    soft: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/50',
    solid: 'bg-amber-500 text-white border-amber-500',
  },
  blue: {
    soft: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/50',
    solid: 'bg-blue-600 text-white border-blue-600',
  },
  cyan: {
    soft: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-300 dark:border-cyan-800/50',
    solid: 'bg-cyan-600 text-white border-cyan-600',
  },
  emerald: {
    soft: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/50',
    solid: 'bg-emerald-600 text-white border-emerald-600',
  },
  indigo: {
    soft: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800/50',
    solid: 'bg-indigo-600 text-white border-indigo-600',
  },
  orange: {
    soft: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800/50',
    solid: 'bg-orange-500 text-white border-orange-500',
  },
  red: {
    soft: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800/50',
    solid: 'bg-red-600 text-white border-red-600',
  },
  slate: {
    soft: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/70 dark:text-slate-300 dark:border-slate-700',
    solid: 'bg-slate-700 text-white border-slate-700',
  },
  violet: {
    soft: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-800/50',
    solid: 'bg-violet-600 text-white border-violet-600',
  },
};

const sizeClasses = {
  xs: { box: 'h-6 w-6 rounded-lg', icon: 12 },
  sm: { box: 'h-8 w-8 rounded-lg', icon: 15 },
  md: { box: 'h-10 w-10 rounded-xl', icon: 18 },
  lg: { box: 'h-12 w-12 rounded-xl', icon: 22 },
  xl: { box: 'h-16 w-16 rounded-2xl', icon: 30 },
};

const ClinicalIcon = ({
  name,
  size = 'md',
  tone,
  variant = 'soft',
  className = '',
  iconClassName = '',
  title,
}) => {
  const config = iconMap[name] || iconMap['clinical-note'];
  const resolvedTone = tone || config.tone || 'slate';
  const resolvedSize = sizeClasses[size] || sizeClasses.md;
  const resolvedToneClasses = toneClasses[resolvedTone] || toneClasses.slate;
  const resolvedVariant = resolvedToneClasses[variant] || resolvedToneClasses.soft;

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center border shadow-sm ${resolvedSize.box} ${resolvedVariant} ${className}`}
      title={title}
      aria-hidden={title ? undefined : true}
    >
      <Icon name={config.icon} size={resolvedSize.icon} className={iconClassName} />
    </span>
  );
};

export default ClinicalIcon;
