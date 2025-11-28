export const PERMANENT_TEETH_ROWS = [
  ['18', '17', '16', '15', '14', '13', '12', '11'],
  ['21', '22', '23', '24', '25', '26', '27', '28'],
  ['38', '37', '36', '35', '34', '33', '32', '31'],
  ['41', '42', '43', '44', '45', '46', '47', '48'],
];

export const TOOTH_STATUSES = [
  { id: 'intact', label: 'Intact', bg: 'bg-emerald-500/15', text: 'text-emerald-600', border: 'border-emerald-400/40' },
  { id: 'caries', label: 'Caries', bg: 'bg-rose-500/15', text: 'text-rose-600', border: 'border-rose-400/40' },
  { id: 'filled', label: 'Restored', bg: 'bg-sky-500/15', text: 'text-sky-600', border: 'border-sky-400/40' },
  { id: 'missing', label: 'Missing', bg: 'bg-slate-500/15', text: 'text-slate-600', border: 'border-slate-400/40' },
  { id: 'root', label: 'Root Treated', bg: 'bg-amber-500/15', text: 'text-amber-600', border: 'border-amber-400/40' },
  { id: 'ortho', label: 'Orthodontic', bg: 'bg-purple-500/15', text: 'text-purple-600', border: 'border-purple-400/40' },
];

export const ADVANCED_ODONTOGRAM_MODES = [
  { id: 'AMF', label: 'Amalgam Filling', color: '#1f2937' },
  { id: 'COF', label: 'Composite Filling', color: '#f97316' },
  { id: 'FIS', label: 'Fissure Sealant', color: '#0ea5e9' },
  { id: 'NVT', label: 'Non Vital Tooth', color: '#7c3aed' },
  { id: 'RCT', label: 'Root Canal', color: '#a855f7' },
  { id: 'NON', label: 'None', color: '#94a3b8' },
  { id: 'UNE', label: 'Un-erupted', color: '#22d3ee' },
  { id: 'PRE', label: 'Prepared', color: '#fb7185' },
  { id: 'ANO', label: 'Anomaly', color: '#facc15' },
  { id: 'CARIES', label: 'Caries', color: '#ef4444' },
  { id: 'CFR', label: 'Crown Fracture', color: '#fcd34d' },
  { id: 'FMC', label: 'Full Metal Crown', color: '#64748b' },
  { id: 'POC', label: 'Pontic', color: '#38bdf8' },
  { id: 'RRX', label: 'Retained Root', color: '#f97316' },
  { id: 'MIS', label: 'Missing', color: '#475569' },
  { id: 'IPX', label: 'Impacted', color: '#ec4899' },
  { id: 'FRM_ACR', label: 'Frame Acrylic', color: '#10b981' },
  { id: 'BRIDGE', label: 'Bridge', color: '#0f172a' },
  { id: 'ARROW_TOP_LEFT', label: 'Arrow Top Left', color: '#0f172a' },
  { id: 'ARROW_TOP_RIGHT', label: 'Arrow Top Right', color: '#0f172a' },
  { id: 'ARROW_BOTTOM_LEFT', label: 'Arrow Bottom Left', color: '#0f172a' },
  { id: 'ARROW_BOTTOM_RIGHT', label: 'Arrow Bottom Right', color: '#0f172a' },
];

export const TOOTH_STATUS_META = TOOTH_STATUSES.reduce((acc, status) => {
  acc[status.id] = status;
  return acc;
}, {});

export const ADVANCED_ODONTOGRAM_MODE_META = ADVANCED_ODONTOGRAM_MODES.reduce((acc, mode) => {
  acc[mode.id] = mode;
  return acc;
}, {});

export const resolveOdontogramMeta = (code) => {
  return TOOTH_STATUS_META[code] || ADVANCED_ODONTOGRAM_MODE_META[code] || null;
};
