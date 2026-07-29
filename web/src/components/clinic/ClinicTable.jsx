import React from 'react';
import PropTypes from 'prop-types';
import AppIcon from '../AppIcon';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  EMPTY_DISPLAY_VALUE,
  formatLocalizedDate,
  getBranchCount,
  getBranchPreview,
  getClinicDisplayName,
  getClinicSecondaryName,
  humanizeDisplayValue,
  normalizeDisplayKey
} from './clinicDisplayModel.mjs';

const statusStyles = {
  pending: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200',
  verified: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200',
  rejected: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-200',
  suspended: 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200',
  default: 'border-border/60 bg-muted/60 text-secondary'
};

const ClinicTable = ({ clinics = [], onView }) => {
  const { language, t } = useLanguage();
  const safeClinics = Array.isArray(clinics)
    ? clinics.filter((clinic) => clinic && typeof clinic === 'object')
    : [];
  const viewLabel = t('shared.clinic.table.view', { defaultValue: 'View' });
  const tableLabel = t('shared.clinic.table.caption', { defaultValue: 'Clinic directory' });

  const translatedStatus = (status) => {
    const statusKey = normalizeDisplayKey(status);
    return t(`common.statuses.${statusKey}`, {
      defaultValue: humanizeDisplayValue(status)
    });
  };

  return (
    <div
      role="region"
      aria-label={tableLabel}
      tabIndex={0}
      className="overflow-x-auto rounded-2xl border border-border/40 bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <table className="min-w-[960px] w-full table-auto">
        <caption className="sr-only">{tableLabel}</caption>
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-secondary border-b border-border/40 bg-muted/40">
            <th scope="col" className="px-5 py-3 font-medium">{t('shared.clinic.table.clinic', { defaultValue: 'Clinic' })}</th>
            <th scope="col" className="px-5 py-3 font-medium">{t('shared.clinic.table.owner', { defaultValue: 'Owner' })}</th>
            <th scope="col" className="px-5 py-3 font-medium">{t('shared.clinic.table.status', { defaultValue: 'Status' })}</th>
            <th scope="col" className="px-5 py-3 font-medium">{t('shared.clinic.table.branches', { defaultValue: 'Branches' })}</th>
            <th scope="col" className="px-5 py-3 font-medium">{t('shared.clinic.table.created', { defaultValue: 'Created' })}</th>
            <th scope="col" className="px-5 py-3 font-medium text-right">{t('shared.clinic.table.actions', { defaultValue: 'Actions' })}</th>
          </tr>
        </thead>
        <tbody>
          {safeClinics.length ? safeClinics.map((clinic, index) => {
            const clinicName = getClinicDisplayName(
              clinic,
              t('shared.clinic.table.unnamedClinic', { defaultValue: 'Unnamed clinic' })
            );
            const secondaryName = getClinicSecondaryName(clinic);
            const statusKey = normalizeDisplayKey(clinic.status);
            const branchCount = getBranchCount(clinic);
            const branchPreview = getBranchPreview(clinic);

            return (
              <tr
                key={clinic.id ?? `${clinicName}-${index}`}
                className="border-t border-border/30 transition-colors hover:bg-muted/30"
              >
                <td className="px-5 py-4 align-top">
                  <div className="font-medium text-primary">{clinicName}</div>
                  {secondaryName && <div className="mt-1 text-xs text-secondary">{secondaryName}</div>}
                  <div className="mt-1 text-xs text-secondary">{clinic.email || clinic.user?.email || EMPTY_DISPLAY_VALUE}</div>
                  {clinic.city && (
                    <div className="mt-1 text-xs text-secondary">
                      {t('common.city', { defaultValue: 'City' })}: {clinic.city}
                    </div>
                  )}
                </td>
                <td className="px-5 py-4 align-top">
                  <div className="font-medium text-primary">{clinic.user?.name || clinic.ownerName || EMPTY_DISPLAY_VALUE}</div>
                  <div className="mt-1 text-xs text-secondary">{clinic.user?.email || clinic.ownerEmail || EMPTY_DISPLAY_VALUE}</div>
                </td>
                <td className="px-5 py-4 align-top">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[statusKey] || statusStyles.default}`}
                  >
                    <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-current opacity-70" />
                    {translatedStatus(clinic.status)}
                  </span>
                </td>
                <td className="px-5 py-4 align-top">
                  <div className="font-semibold text-primary">{branchCount}</div>
                  {branchPreview.length ? (
                    <div className="mt-1 max-w-[16rem] truncate text-xs text-secondary" title={branchPreview.join(', ')}>
                      {branchPreview.join(', ')}
                      {branchCount > branchPreview.length && '…'}
                    </div>
                  ) : (
                    <div className="mt-1 text-xs text-secondary">{t('common.noBranches', { defaultValue: 'No branches' })}</div>
                  )}
                </td>
                <td className="whitespace-nowrap px-5 py-4 align-top text-sm text-secondary">
                  {formatLocalizedDate(clinic.createdAt, language)}
                </td>
                <td className="px-5 py-4 align-top text-right">
                  <button
                    type="button"
                    onClick={() => onView(clinic)}
                    aria-label={`${viewLabel}: ${clinicName}`}
                    className="inline-flex items-center gap-1 rounded-xl bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground shadow-sm transition hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                  >
                    {viewLabel}
                    <AppIcon aria-hidden="true" name="ArrowUpRight" size={12} />
                  </button>
                </td>
              </tr>
            );
          }) : (
            <tr>
              <td colSpan={6} className="px-5 py-10 text-center text-sm text-secondary">
                {t('shared.clinic.table.empty', { defaultValue: 'No clinics available' })}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

ClinicTable.propTypes = {
  clinics: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    brandName: PropTypes.string,
    legalName: PropTypes.string,
    email: PropTypes.string,
    city: PropTypes.string,
    status: PropTypes.string,
    createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    branchCount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    branchesCount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    branches: PropTypes.arrayOf(PropTypes.shape({
      branchName: PropTypes.string
    })),
    user: PropTypes.shape({
      name: PropTypes.string,
      email: PropTypes.string
    })
  })),
  onView: PropTypes.func.isRequired
};

export default ClinicTable;
