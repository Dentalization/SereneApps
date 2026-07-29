import React, { useMemo, useState, useRef, useEffect } from 'react';
import AppIcon from '../../../../components/AppIcon';
import { resolveMediaUrl } from '../../../../utils/media';

const StaffDirectory = ({
  staff,
  branches,
  branchesLoading,
  search,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  statusFilter,
  onStatusFilterChange,
  translations,
  roleLabels,
  statusLabels,
  onView,
  onEdit,
  onRemove,
  onChangeBranch,
  onInvite
}) => {
  // Filter staff based on search, role, and status
  const filteredStaff = useMemo(() => {
    if (!Array.isArray(staff)) return [];
    
    return staff.filter(member => {
      if (!member || typeof member !== 'object') return false;
      
      try {
        // Search filter
        const searchLower = (search || '').toLowerCase();
        const searchMatch = !searchLower || 
          (member.name && member.name.toLowerCase().includes(searchLower)) ||
          (member.email && member.email.toLowerCase().includes(searchLower)) ||
          (member.position && member.position.toLowerCase().includes(searchLower)) ||
          (roleLabels && member.role && (roleLabels[member.role] || member.role).toLowerCase().includes(searchLower));
        
        // Role filter
        const roleMatch = !roleFilter || roleFilter === 'all' || member.role === roleFilter;
        
        // Status filter  
        const statusMatch = !statusFilter || statusFilter === 'all' || member.status === statusFilter || (!member.status && statusFilter === 'active');
        
        return searchMatch && roleMatch && statusMatch;
      } catch (error) {
        console.warn('Error filtering staff member:', error);
        return false;
      }
    });
  }, [staff, search, roleFilter, statusFilter, roleLabels]);

  return (
  <section className="space-y-4">
    <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="relative flex-1 min-w-[220px]">
        <AppIcon
          name="Search"
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary/60"
        />
        <input
          type="search"
          value={search || ''}
          onChange={(event) => onSearchChange && onSearchChange(event.target.value)}
          placeholder={translations?.searchPlaceholder || 'Search staff...'}
          className="w-full rounded-lg border border-border/40 bg-surface py-3 pl-9 pr-3 text-sm text-primary shadow-sm transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <FilterSelect
          id="role-filter"
          label={translations?.filters?.role?.label || 'Role'}
          value={roleFilter}
          onChange={onRoleFilterChange}
          options={[{ value: 'all', label: translations?.filters?.role?.all || 'All Roles' }, ...mapToOptions(roleLabels || {})]}
        />

        <FilterSelect
          id="status-filter"
          label={translations?.filters?.status?.label || 'Status'}
          value={statusFilter}
          onChange={onStatusFilterChange}
          options={[
            { value: 'all', label: translations?.filters?.status?.all || 'All Status' },
            { value: 'active', label: translations?.filters?.status?.active || 'Active' },
            { value: 'inactive', label: translations?.filters?.status?.inactive || 'Inactive' },
            { value: 'invited', label: translations?.filters?.status?.invited || 'Invited' }
          ]}
        />

      </div>
    </header>

    {filteredStaff.length === 0 ? (
      (staff || []).length === 0 ? (
        <EmptyState translations={translations || {}} onInvite={onInvite} />
      ) : (
        <div className="text-center py-8 text-secondary">
          <AppIcon name="Search" size={48} className="mx-auto mb-4 opacity-50" />
          <p>No staff members match your search criteria.</p>
        </div>
      )
    ) : (
      <DirectoryTable
        staff={filteredStaff}
        branches={branches}
        branchesLoading={branchesLoading}
        translations={translations}
        roleLabels={roleLabels}
        statusLabels={statusLabels}
        onView={onView}
        onEdit={onEdit}
        onRemove={onRemove}
        onChangeBranch={onChangeBranch}
      />
    )}
  </section>
  );
};

const FilterSelect = ({ id, label, value, onChange, options = [] }) => (
  <div className="flex items-center gap-2">
    <label htmlFor={id} className="text-sm font-medium text-secondary whitespace-nowrap">
      {label}
    </label>
    <div className="relative">
      <select
        id={id}
        value={value || 'all'}
        onChange={(event) => onChange && onChange(event.target.value)}
        className="min-w-[140px] appearance-none rounded-lg border border-border/40 bg-surface bg-no-repeat pl-3 pr-8 py-2 text-sm text-primary transition hover:border-border/60 focus:border-accent focus:outline-none"
        style={{ backgroundImage: 'none' }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <AppIcon
        name="ChevronDown"
        size={16}
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-secondary"
      />
    </div>
  </div>
);

const EmptyState = ({ translations = {}, onInvite }) => (
  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/40 bg-surface-elevated p-10 text-center shadow-sm">
    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
      <AppIcon name="Users" size={28} />
    </div>
    <h3 className="text-lg font-semibold text-primary">{translations?.empty?.title || 'No staff members yet'}</h3>
    <p className="mt-2 max-w-md text-sm text-secondary">{translations?.empty?.description || 'Invite your first team member to get started.'}</p>
    <button
      onClick={onInvite}
      className="mt-5 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-accent-hover"
    >
      <AppIcon name="UserPlus" size={16} />
      {translations?.actions?.add || 'Add Staff'}
    </button>
  </div>
);

const DirectoryTable = ({ staff, branches, branchesLoading, translations, roleLabels, statusLabels, onView, onEdit, onRemove, onChangeBranch }) => (
  <div className="overflow-hidden rounded-xl border border-border/40 bg-surface-elevated shadow-sm">
    <div className="overflow-x-auto">
      <table className="w-full min-w-[800px] divide-y divide-border/40">
      <thead className="bg-surface">
        <tr>
          {['staff', 'contact', 'role', 'branch', 'status', 'actions'].map((key) => (
            <th
              key={key}
              scope="col"
              className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-secondary/70 ${key === 'actions' ? 'text-right' : ''}`}
            >
              {(translations?.headers && translations.headers[key]) || key.toUpperCase()}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-border/30">
        {staff.map((item) => (
          <tr key={item.id} className="transition hover:bg-surface">
            <td className="px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full overflow-hidden border-2 border-accent/20 flex-shrink-0">
                  {item.avatar_url ? (
                    <img 
                      src={resolveMediaUrl(item.avatar_url)} 
                      alt={item.name || 'Staff'} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-sm">
                      {item.name?.charAt(0)?.toUpperCase() || 'S'}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-primary truncate" title={item.name || '—'}>{item.name || '—'}</p>
                  {item.position && (
                    <p className="text-sm text-secondary truncate" title={item.position}>{item.position}</p>
                  )}
                </div>
              </div>
            </td>
            <td className="px-6 py-4 text-sm text-secondary">
              <div className="flex flex-col gap-1">
                <span className="inline-flex items-center gap-2">
                  <AppIcon name="Mail" size={14} />
                  {item.email || '—'}
                </span>
                {item.phone && (
                  <span className="inline-flex items-center gap-2">
                    <AppIcon name="Phone" size={14} />
                    {item.phone}
                  </span>
                )}
              </div>
            </td>
            <td className="px-6 py-4 text-sm">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-primary">
                <AppIcon name={ROLE_ICONS[item.role] || 'User'} size={14} />
                {(roleLabels && roleLabels[item.role]) || (roleLabels && roleLabels.staff) || item.role || 'Staff'}
              </span>
            </td>
            <td className="px-6 py-4 text-sm">
              <div className="flex flex-col gap-1">
                {branchesLoading ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-gray-50 dark:bg-gray-800 px-3 py-1 text-gray-600 dark:text-gray-400">
                    <AppIcon name="Loader" size={14} className="animate-spin" />
                    Loading...
                  </span>
                ) : (() => {
                  const branch = branches?.find(b => b.id === item.branchId);
                  if (branch) {
                    return (
                      <>
                        <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 dark:bg-blue-900/20 px-3 py-1 text-blue-700 dark:text-blue-300">
                          <AppIcon name="MapPin" size={14} />
                          {branch.branchName || 'Unknown Branch'}
                        </span>
                        {branch.isMainBranch && (
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                            {(translations.branchInfo && translations.branchInfo.mainBranch) || 'Main Branch'}
                          </span>
                        )}
                      </>
                    );
                  } else {
                    return (
                      <span className="inline-flex items-center gap-2 rounded-full bg-gray-50 dark:bg-gray-800 px-3 py-1 text-gray-600 dark:text-gray-400">
                        <AppIcon name="MapPinOff" size={14} />
                        {(translations.branches && translations.branches.unassigned) || 'Unassigned'}
                      </span>
                    );
                  }
                })()}
              </div>
            </td>
            <td className="px-6 py-4 text-sm">
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${STATUS_STYLES[item.status] || STATUS_STYLES.default}`}>
                <span className="h-2 w-2 rounded-full bg-current" />
                {(statusLabels && statusLabels[item.status]) || (statusLabels && statusLabels.default) || item.status || 'Active'}
              </span>
            </td>
            <td className="px-6 py-4 text-right text-sm">
              <ActionDropdown
                item={item}
                translations={translations}
                onView={onView}
                onEdit={onEdit}
                onChangeBranch={onChangeBranch}
                onRemove={onRemove}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  </div>
);

const ActionDropdown = ({ item, translations, onView, onEdit, onChangeBranch, onRemove }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const isOwner = item.role === 'owner';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center w-8 h-8 rounded-full text-secondary hover:bg-surface-elevated hover:text-primary transition-colors"
        aria-label="More actions"
      >
        <AppIcon name="MoreVertical" size={16} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-surface-elevated border border-border/40 rounded-lg shadow-lg z-10 py-1">
          <button
            onClick={() => {
              onView?.(item);
              setIsOpen(false);
            }}
            className="w-full px-4 py-2 text-left text-sm text-primary hover:bg-surface transition-colors flex items-center gap-2"
          >
            <AppIcon name="Eye" size={16} />
            {translations?.actions?.view || 'View Profile'}
          </button>
          
          <button
            onClick={() => {
              onEdit?.(item);
              setIsOpen(false);
            }}
            disabled={isOwner}
            className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2 ${
              isOwner 
                ? 'text-secondary/50 cursor-not-allowed' 
                : 'text-primary hover:bg-surface'
            }`}
          >
            <AppIcon name="Edit" size={16} />
            {translations?.actions?.edit || 'Edit Role'}
          </button>
          
          <button
            onClick={() => {
              onChangeBranch?.(item);
              setIsOpen(false);
            }}
            className="w-full px-4 py-2 text-left text-sm text-primary hover:bg-surface transition-colors flex items-center gap-2"
          >
            <AppIcon name="GitBranch" size={16} />
            {translations?.actions?.changeBranch || 'Change Branch'}
          </button>
          
          <div className="border-t border-border/30 my-1"></div>
          
          <button
            onClick={() => {
              onRemove?.(item);
              setIsOpen(false);
            }}
            disabled={isOwner}
            className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2 ${
              isOwner 
                ? 'text-secondary/50 cursor-not-allowed' 
                : 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
            }`}
          >
            <AppIcon name="Trash2" size={16} />
            {translations?.actions?.remove || 'Remove'}
          </button>
        </div>
      )}
    </div>
  );
};

const STATUS_STYLES = {
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-gray-100 text-gray-600',
  invited: 'bg-indigo-100 text-indigo-700',
  default: 'bg-gray-100 text-gray-600'
};

const ROLE_ICONS = {
  owner: 'Crown',
  manager: 'Briefcase',
  front_office: 'Phone',
  nurse: 'Stethoscope',
  cashier: 'Calculator',
  staff: 'User'
};

const mapToOptions = (labels) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

export default StaffDirectory;
