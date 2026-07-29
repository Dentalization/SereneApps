import React from 'react';
import PropTypes from 'prop-types';
import AppIcon from '../AppIcon';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  EMPTY_DISPLAY_VALUE,
  formatBranchAddress,
  readNonNegativeInteger
} from './clinicDisplayModel.mjs';

const BranchList = ({ branches = [], selectedBranchId = null, onSelect }) => {
  const { t } = useLanguage();
  const safeBranches = Array.isArray(branches)
    ? branches.filter((branch) => branch && typeof branch === 'object')
    : [];

  if (!safeBranches.length) {
    return (
      <div role="status" className="flex items-center gap-3 rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-5 text-sm text-secondary">
        <AppIcon aria-hidden="true" name="Building2" size={18} />
        {t('common.noBranchesAvailable', { defaultValue: 'No branches available' })}
      </div>
    );
  }

  return (
    <ul className="space-y-3" aria-label={t('shared.clinic.branches.listLabel', { defaultValue: 'Clinic branches' })}>
      {safeBranches.map((branch, index) => {
        const branchName = branch.branchName || t('shared.clinic.branches.unnamed', { defaultValue: 'Unnamed branch' });
        const roomCount = readNonNegativeInteger(branch.treatmentRoomsCount);
        const staffCount = readNonNegativeInteger(branch.staffCount);
        const hasStatus = typeof branch.isActive === 'boolean';
        const branchId = branch.id ?? branch.branchCode ?? `${branchName}-${index}`;
        const isSelected = selectedBranchId !== null && String(selectedBranchId) === String(branchId);
        const itemContent = (
          <>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-primary">{branchName}</span>
                {branch.isMainBranch && (
                  <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
                    {t('common.mainBranch', { defaultValue: 'Main' })}
                  </span>
                )}
                {branch.isVirtual && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-secondary">
                    {t('shared.clinic.branches.virtual', { defaultValue: 'Unassigned' })}
                  </span>
                )}
                {hasStatus && (
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${branch.isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200' : 'bg-muted text-secondary'}`}>
                    {branch.isActive
                      ? t('common.statuses.active', { defaultValue: 'Active' })
                      : t('common.statuses.inactive', { defaultValue: 'Inactive' })}
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-start gap-1.5 text-xs text-secondary">
                <AppIcon aria-hidden="true" className="mt-0.5 shrink-0" name={branch.isVirtual ? 'UserRoundX' : 'MapPin'} size={13} />
                <span>
                  {branch.isVirtual
                    ? t('shared.clinic.branches.unassignedHint', { defaultValue: 'Staff without a branch assignment' })
                    : formatBranchAddress(branch)}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-3 text-xs text-secondary">
              {!branch.isVirtual && (
                <span className="inline-flex items-center gap-1.5">
                  <AppIcon aria-hidden="true" name="DoorOpen" size={14} />
                  {t('common.rooms', { defaultValue: 'Rooms' })}: {roomCount ?? EMPTY_DISPLAY_VALUE}
                </span>
              )}
              {staffCount !== null && (
                <span className="inline-flex items-center gap-1.5">
                  <AppIcon aria-hidden="true" name="Users" size={14} />
                  {t('shared.clinic.branches.staffCount', { defaultValue: 'Staff' })}: {staffCount}
                </span>
              )}
              {onSelect && <AppIcon aria-hidden="true" name="ChevronRight" size={16} />}
            </div>
          </>
        );

        return (
          <li
            key={branchId}
            className={`overflow-hidden rounded-xl border bg-surface transition ${isSelected ? 'border-accent ring-1 ring-accent/30' : 'border-border/50'}`}
          >
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(branch)}
                aria-pressed={isSelected}
                className="flex min-h-11 w-full flex-col gap-3 p-4 text-left transition hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent sm:flex-row sm:items-center sm:justify-between"
              >
                {itemContent}
              </button>
            ) : (
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                {itemContent}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
};

BranchList.propTypes = {
  branches: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    branchCode: PropTypes.string,
    branchName: PropTypes.string,
    isMainBranch: PropTypes.bool,
    isActive: PropTypes.bool,
    isVirtual: PropTypes.bool,
    streetAddress: PropTypes.string,
    city: PropTypes.string,
    province: PropTypes.string,
    postalCode: PropTypes.string,
    treatmentRoomsCount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    staffCount: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
  })),
  selectedBranchId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onSelect: PropTypes.func
};

export default BranchList;
