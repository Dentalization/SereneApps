import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import AppIcon from '../AppIcon';
import { resolveMediaUrl } from '../../utils/media';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  formatLocalizedDate,
  humanizeDisplayValue,
  normalizeDisplayKey
} from './clinicDisplayModel.mjs';

const StaffAvatar = ({ avatarUrl }) => {
  const resolvedAvatarUrl = resolveMediaUrl(avatarUrl);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [resolvedAvatarUrl]);

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-secondary">
      {resolvedAvatarUrl && !imageFailed ? (
        <img
          src={resolvedAvatarUrl}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <AppIcon aria-hidden="true" name="User" size={18} />
      )}
    </div>
  );
};

StaffAvatar.propTypes = {
  avatarUrl: PropTypes.string
};

const StaffList = ({ staff = [] }) => {
  const { language, t } = useLanguage();
  const [expandedStaffId, setExpandedStaffId] = useState(null);
  const safeStaff = Array.isArray(staff)
    ? staff.filter((member) => member && typeof member === 'object')
    : [];

  if (!safeStaff.length) {
    return (
      <div role="status" className="flex items-center gap-3 rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-5 text-sm text-secondary">
        <AppIcon aria-hidden="true" name="Users" size={18} />
        {t('common.noStaffAssigned', { defaultValue: 'No staff assigned to this branch' })}
      </div>
    );
  }

  return (
    <ul className="space-y-3" aria-label={t('shared.clinic.staff.listLabel', { defaultValue: 'Clinic staff' })}>
      {safeStaff.map((member, index) => {
        const name = member.user?.name || member.name || t('shared.clinic.staff.unnamed', { defaultValue: 'Unnamed staff member' });
        const email = member.user?.email || member.email || '';
        const phone = member.user?.phone_number || member.phone || '';
        const avatarUrl = member.user?.avatar_url || member.avatar || member.avatarUrl || '';
        const position = member.positionTitle || member.position || '';
        const branch = member.assignedBranch || member.branch || null;
        const branchName = branch?.branchName || branch?.name || '';
        const dentistProfileValue = member.user?.dentistProfile || member.dentistProfile || null;
        const dentistProfile = Array.isArray(dentistProfileValue) ? dentistProfileValue[0] : dentistProfileValue;
        const roleKey = normalizeDisplayKey(member.role, 'staff');
        const roleLabel = t(`clinic.staff.roleLabels.${roleKey}`, {
          defaultValue: humanizeDisplayValue(member.role, 'Staff')
        });
        const isActive = typeof member.isActive === 'boolean'
          ? member.isActive
          : member.status
            ? normalizeDisplayKey(member.status) === 'active'
            : null;
        const memberId = member.id ?? member.userId ?? member.user?.id ?? `${name}-${index}`;
        const isExpanded = String(expandedStaffId) === String(memberId);
        const hasDetails = Boolean(email || phone || branchName || dentistProfile || member.department || member.lastLogin);

        return (
          <li
            key={memberId}
            className="rounded-xl border border-border/50 bg-surface p-4"
          >
            <div className="flex items-center gap-3">
              <StaffAvatar avatarUrl={avatarUrl} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium text-primary">{name}</span>
                  <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">{roleLabel}</span>
                  {isActive !== null && (
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200' : 'bg-muted text-secondary'}`}>
                      {isActive
                        ? t('common.statuses.active', { defaultValue: 'Active' })
                        : t('common.statuses.inactive', { defaultValue: 'Inactive' })}
                    </span>
                  )}
                  {dentistProfile && (
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${dentistProfile.isVerified ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-200' : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200'}`}>
                      {dentistProfile.isVerified
                        ? t('shared.clinic.staff.professionalVerified', { defaultValue: 'Professional verified' })
                        : t('shared.clinic.staff.professionalPending', { defaultValue: 'Professional pending' })}
                    </span>
                  )}
                </div>
                {position && <div className="mt-1 text-xs text-secondary">{position}</div>}
                <div className="mt-1 flex flex-wrap gap-x-2 text-xs text-secondary">
                  {email && <span className="break-all">{email}</span>}
                  {branchName && <span>{branchName}</span>}
                </div>
              </div>
              {hasDetails && (
                <button
                  type="button"
                  onClick={() => setExpandedStaffId((current) => String(current) === String(memberId) ? null : memberId)}
                  aria-expanded={isExpanded}
                  aria-controls={`staff-details-${memberId}`}
                  className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-3 text-xs font-semibold text-accent transition hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {isExpanded
                    ? t('shared.clinic.staff.hideDetails', { defaultValue: 'Hide' })
                    : t('shared.clinic.staff.viewDetails', { defaultValue: 'Details' })}
                  <AppIcon aria-hidden="true" name={isExpanded ? 'ChevronUp' : 'ChevronDown'} size={14} />
                </button>
              )}
            </div>

            {isExpanded && (
              <div id={`staff-details-${memberId}`} className="mt-4 grid gap-3 border-t border-border/40 pt-4 text-xs text-secondary sm:grid-cols-2">
                {branchName && (
                  <div className="flex items-start gap-2">
                    <AppIcon aria-hidden="true" className="mt-0.5" name="MapPin" size={14} />
                    <span>{t('shared.clinic.staff.assignedBranch', { defaultValue: 'Assigned branch' })}: <strong className="text-primary">{branchName}</strong></span>
                  </div>
                )}
                {dentistProfile?.primarySpecialization && (
                  <div className="flex items-start gap-2">
                    <AppIcon aria-hidden="true" className="mt-0.5" name="BadgeCheck" size={14} />
                    <span>{t('shared.clinic.staff.specialization', { defaultValue: 'Specialization' })}: <strong className="text-primary">{dentistProfile.primarySpecialization}</strong></span>
                  </div>
                )}
                {dentistProfile?.licenseNumber && (
                  <div className="flex items-start gap-2">
                    <AppIcon aria-hidden="true" className="mt-0.5" name="IdCard" size={14} />
                    <span>{t('shared.clinic.staff.license', { defaultValue: 'License' })}: <strong className="text-primary">{dentistProfile.licenseNumber}</strong></span>
                  </div>
                )}
                {dentistProfile?.licenseExpiryDate && (
                  <div className="flex items-start gap-2">
                    <AppIcon aria-hidden="true" className="mt-0.5" name="CalendarClock" size={14} />
                    <span>{t('shared.clinic.staff.licenseExpiry', { defaultValue: 'License expiry' })}: <strong className="text-primary">{formatLocalizedDate(dentistProfile.licenseExpiryDate, language)}</strong></span>
                  </div>
                )}
                {member.department && (
                  <div>{t('shared.clinic.staff.department', { defaultValue: 'Department' })}: <strong className="text-primary">{member.department}</strong></div>
                )}
                {phone && <a className="text-accent hover:underline" href={`tel:${phone}`}>{phone}</a>}
                {email && <a className="text-accent hover:underline" href={`mailto:${email}`}>{t('shared.clinic.staff.emailAction', { defaultValue: 'Email staff member' })}</a>}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
};

StaffList.propTypes = {
  staff: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    role: PropTypes.string,
    isActive: PropTypes.bool,
    status: PropTypes.string,
    positionTitle: PropTypes.string,
    position: PropTypes.string,
    department: PropTypes.string,
    name: PropTypes.string,
    email: PropTypes.string,
    phone: PropTypes.string,
    avatar: PropTypes.string,
    avatarUrl: PropTypes.string,
    dentistProfile: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
    assignedBranch: PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      branchName: PropTypes.string
    }),
    branch: PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      name: PropTypes.string,
      branchName: PropTypes.string
    }),
    user: PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      name: PropTypes.string,
      email: PropTypes.string,
      phone_number: PropTypes.string,
      avatar_url: PropTypes.string,
      dentistProfile: PropTypes.oneOfType([PropTypes.array, PropTypes.object])
    })
  }))
};

export default StaffList;
