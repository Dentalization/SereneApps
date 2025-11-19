import React from 'react';
import PropTypes from 'prop-types';
import AppIcon from '../../components/AppIcon';

const statusStyles = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  verified: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  rejected: 'bg-rose-100 text-rose-700 border-rose-200',
  default: 'bg-slate-100 text-slate-600 border-slate-200'
};

const formatStatus = (status) => {
  if (!status) return 'Unknown';
  return status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const ClinicTable = ({ clinics = [], onView }) => {
  return (
    <div className="bg-surface border border-border/40 rounded-2xl overflow-hidden">
      <table className="w-full table-auto">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-secondary border-b border-border/40 bg-muted/40">
            <th className="px-5 py-3 font-medium">Clinic</th>
            <th className="px-5 py-3 font-medium">Owner</th>
            <th className="px-5 py-3 font-medium">Status</th>
            <th className="px-5 py-3 font-medium">Branches</th>
            <th className="px-5 py-3 font-medium">Created</th>
            <th className="px-5 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {clinics.map((c) => (
            <tr key={c.id} className="border-t border-border/30 hover:bg-muted/30 transition-colors">
              <td className="px-5 py-4 align-top">
                <div className="font-medium text-primary">{c.legalName || c.brandName}</div>
                <div className="text-xs text-secondary mt-1">{c.email || c.user?.email}</div>
                {c.city && <div className="text-xs text-secondary mt-1">City: {c.city}</div>}
              </td>
              <td className="px-5 py-4 align-top">
                <div className="font-medium">{c.user?.name || c.ownerName || '—'}</div>
                <div className="text-xs text-secondary mt-1">{c.user?.email || c.ownerEmail || '—'}</div>
              </td>
              <td className="px-5 py-4 align-top">
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[c.status] || statusStyles.default}`}
                >
                  <span className="inline-block h-2 w-2 rounded-full bg-current opacity-70" />
                  {formatStatus(c.status)}
                </span>
              </td>
              <td className="px-5 py-4 align-top">
                <div className="font-semibold text-primary">{(c.branches || []).length}</div>
                {c.branches?.length ? (
                  <div className="text-xs text-secondary mt-1">
                    {c.branches.slice(0, 2).map((branch) => branch.branchName).join(', ')}
                    {c.branches.length > 2 && '…'}
                  </div>
                ) : (
                  <div className="text-xs text-secondary mt-1">No branches</div>
                )}
              </td>
              <td className="px-5 py-4 align-top text-sm text-secondary">
                {formatDate(c.createdAt)}
              </td>
              <td className="px-5 py-4 align-top text-right">
                <button
                  onClick={() => onView(c)}
                  className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-blue-700"
                >
                  View
                  <AppIcon name="ArrowUpRight" size={12} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

ClinicTable.propTypes = {
  clinics: PropTypes.array,
  onView: PropTypes.func.isRequired
};

export default ClinicTable;
