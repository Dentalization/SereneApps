import React from 'react';
import PropTypes from 'prop-types';
import AppIcon from '../AppIcon';
import { resolveMediaUrl } from '../../utils/media';

const StaffList = ({ staff = [] }) => {
  if (!staff.length) return <div className="text-sm text-secondary">No staff assigned to this branch</div>;

  return (
    <ul className="space-y-3">
      {staff.map((s) => (
        <li key={s.id} className="p-3 rounded-lg border flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
            {s.user?.avatar_url ? (
              <img
                src={resolveMediaUrl(s.user.avatar_url)}
                alt={s.user.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // If image fails to load, hide it so the AppIcon fallback shows
                  try { e.currentTarget.style.display = 'none'; } catch (_) {}
                }}
              />
            ) : (
              <AppIcon name="User" size={18} />
            )}
          </div>
          <div className="flex-1">
            <div className="font-medium">{s.user?.name}</div>
            <div className="text-xs text-secondary">{s.user?.email} • {s.role}</div>
          </div>
        </li>
      ))}
    </ul>
  );
};

StaffList.propTypes = {
  staff: PropTypes.array
};

export default StaffList;
