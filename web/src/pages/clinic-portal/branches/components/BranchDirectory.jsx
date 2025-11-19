import React, { useMemo, useState } from 'react';
import AppIcon from '../../../../components/AppIcon';

/**
 * BranchDirectory
 * - Pure render (no Math.random in JSX)
 * - Safe filtering (never calls .includes on non-strings)
 * - Stable, deterministic fallback metrics (seeded from branch id/name)
 * - Defensive guards for all optional fields
 */
const BranchDirectory = ({ branches, onEdit, onDelete, onAdd }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // --- Utilities -------------------------------------------------------------

  // Normalize any value to lowercase string for safe "includes" checks
  const toText = (v) => (v === undefined || v === null) ? '' : String(v);
  const includesCaseInsensitive = (value, queryLower) =>
    toText(value).toLowerCase().includes(queryLower);

  // Deterministic "random-like" generator from a string seed (pure function)
  const seededInt = (seed, min, max) => {
    const s = toText(seed);
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h << 5) - h + s.charCodeAt(i);
      h |= 0; // to 32-bit int
    }
    const abs = Math.abs(h);
    return min + (abs % (max - min + 1));
  };

  const getStableMetrics = (branch) => {
    const seed = branch?.id ?? branch?.branchName ?? 'branch';
    return {
      rooms: branch?.treatmentRoomsCount ?? seededInt(seed, 2, 9),
      patientsPerMonth: branch?.monthlyPatients ?? seededInt(seed + 'm', 100, 400),
      rating: branch?.rating ?? (seededInt(seed + 'r', 40, 49) / 10).toFixed(1), // 4.0–4.9
    };
  };

  const formatPhone = (phone) => {
    const digits = toText(phone).replace(/\D/g, '');
    if (!digits) return '—';
    // Format as 4-4-remaining; if not enough, return digits
    const m = digits.match(/^(\d{4})(\d{4})(\d+)$/);
    return m ? `${m[1]}-${m[2]}-${m[3]}` : digits;
  };

  const formatAddress = (address) => {
    const txt = toText(address);
    return txt.length > 50 ? `${txt.substring(0, 50)}...` : (txt || '—');
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: {
        bg: 'bg-green-100 dark:bg-green-900/20',
        text: 'text-green-800 dark:text-green-400',
        label: 'Active',
      },
      inactive: {
        bg: 'bg-gray-100 dark:bg-gray-900/20',
        text: 'text-gray-800 dark:text-gray-400',
        label: 'Inactive',
      },
      maintenance: {
        bg: 'bg-yellow-100 dark:bg-yellow-900/20',
        text: 'text-yellow-800 dark:text-yellow-400',
        label: 'Maintenance',
      },
    };
    const config = statusConfig[status] || statusConfig.inactive;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  // --- Data guards -----------------------------------------------------------

  const safeBranches = useMemo(() => {
    try {
      if (!Array.isArray(branches)) return [];
      return branches.filter(Boolean); // strip null/undefined
    } catch (e) {
      console.error('❌ Error processing branches:', e);
      return [];
    }
  }, [branches]);

  // --- Filtering -------------------------------------------------------------

  const filteredBranches = useMemo(() => {
    try {
      const q = toText(search).trim().toLowerCase();
      return safeBranches.filter((branch) => {
        try {
          const searchMatch =
            !q ||
            includesCaseInsensitive(branch?.branchName, q) ||
            includesCaseInsensitive(branch?.streetAddress, q) ||
            includesCaseInsensitive(branch?.phone, q);

          const status =
            branch?.isActive === true
              ? 'active'
              : branch?.isActive === 'maintenance'
              ? 'maintenance'
              : 'inactive'; // default fallback

          const statusMatch = statusFilter === 'all' || status === statusFilter;
          return searchMatch && statusMatch;
        } catch (filterError) {
          console.error('❌ Error filtering a branch:', branch, filterError);
          return false;
        }
      });
    } catch (e) {
      console.error('❌ Error computing filteredBranches:', e);
      return [];
    }
  }, [safeBranches, search, statusFilter]);

  // --- Handlers (defensive defaults) ----------------------------------------

  const handleAdd = typeof onAdd === 'function' ? onAdd : () => {};
  const handleEdit = typeof onEdit === 'function' ? onEdit : () => {};
  const handleDelete = typeof onDelete === 'function' ? onDelete : () => {};

  // --- Render ---------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 min-w-[280px]">
          <AppIcon
            name="Search"
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary/60"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search branches by name, address, or phone..."
            className="w-full rounded-lg border border-border/40 bg-surface py-3 pl-9 pr-3 text-sm text-primary shadow-sm transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="status-filter" className="text-sm font-medium text-secondary whitespace-nowrap">
              Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="min-w-[120px] appearance-none rounded-lg border border-border/40 bg-surface pl-3 pr-8 py-2 text-sm text-primary transition hover:border-border/60 focus:border-accent focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>

          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-accent-hover"
          >
            <AppIcon name="Plus" size={16} />
            Add Branch
          </button>
        </div>
      </div>

      {/* Branch Cards */}
      {filteredBranches.length === 0 ? (
        safeBranches.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/40 bg-surface-elevated p-10 text-center shadow-sm">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <AppIcon name="Building2" size={28} />
            </div>
            <h3 className="text-lg font-semibold text-primary">No branches yet</h3>
            <p className="mt-2 max-w-md text-sm text-secondary">
              Create your first branch to start managing multiple clinic locations.
            </p>
            <button
              onClick={handleAdd}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-accent-hover"
            >
              <AppIcon name="Plus" size={16} />
              Add First Branch
            </button>
          </div>
        ) : (
          <div className="text-center py-8 text-secondary">
            <AppIcon name="Search" size={48} className="mx-auto mb-4 opacity-50" />
            <p>No branches match your search criteria.</p>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredBranches.map((branch, idx) => {
            const status = branch?.isActive === true
              ? 'active'
              : branch?.isActive === 'maintenance'
              ? 'maintenance'
              : 'inactive';

            const metrics = getStableMetrics(branch);

            // Prefer a nice human-readable string if provided; else fallback
            let hoursText = 'Mon-Fri: 08:00-17:00';
            const oh = branch?.operatingHours;
            if (typeof oh === 'string' && oh.trim()) {
              hoursText = oh.trim();
            } else if (oh && typeof oh === 'object') {
              const common = oh.monday ?? oh.weekdays ?? oh.default ?? null;
              if (typeof common === 'string' && common.trim()) {
                hoursText = common.trim();
              }
            }

            return (
              <div
                key={branch?.id ?? branch?.branchName ?? `branch-${idx}`}
                className="bg-surface-elevated rounded-2xl p-6 border border-border/40 hover:border-accent/20 transition-all duration-200 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
                      {toText(branch?.branchName).charAt(0) || 'B'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-primary group-hover:text-accent transition-colors">
                        {toText(branch?.branchName) || 'Unnamed Branch'}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusBadge(status)}
                        {branch?.isMainBranch && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent">
                            <AppIcon name="Star" size={12} />
                            Main
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(branch)}
                      className="p-2 rounded-lg text-secondary hover:text-primary hover:bg-surface transition-colors"
                      title="Edit Branch"
                    >
                      <AppIcon name="Edit" size={16} />
                    </button>
                    {!branch?.isMainBranch && (
                      <button
                        onClick={() => handleDelete(branch)}
                        className="p-2 rounded-lg text-secondary hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Delete Branch"
                      >
                        <AppIcon name="Trash2" size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <AppIcon name="MapPin" size={16} className="text-secondary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-primary font-medium">Address</p>
                      <p className="text-sm text-secondary" title={toText(branch?.streetAddress)}>
                        {formatAddress(branch?.streetAddress)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <AppIcon name="Phone" size={16} className="text-secondary flex-shrink-0" />
                    <div>
                      <p className="text-sm text-primary font-medium">Phone</p>
                      <p className="text-sm text-secondary">
                        {formatPhone(branch?.phone)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <AppIcon name="Users" size={16} className="text-secondary flex-shrink-0" />
                    <div>
                      <p className="text-sm text-primary font-medium">Staff</p>
                      <p className="text-sm text-secondary">
                        {Number.isFinite(branch?.staffCount) ? branch.staffCount : 0} members
                      </p>
                    </div>
                  </div>

                  {branch?.operatingHours && (
                    <div className="flex items-center gap-3">
                      <AppIcon name="Clock" size={16} className="text-secondary flex-shrink-0" />
                      <div>
                        <p className="text-sm text-primary font-medium">Operating Hours</p>
                        <p className="text-sm text-secondary">{hoursText}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Facilities */}
                {Array.isArray(branch?.facilities) && branch.facilities.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border/20">
                    <p className="text-sm text-primary font-medium mb-2">Facilities</p>
                    <div className="flex flex-wrap gap-1">
                      {branch.facilities.slice(0, 3).map((facility, index) => (
                        <span
                          key={`${branch?.id ?? branch?.branchName ?? 'b'}-facility-${index}`}
                          className="inline-block px-2 py-1 rounded-md bg-surface text-xs text-secondary border border-border/20"
                        >
                          {toText(facility)}
                        </span>
                      ))}
                      {branch.facilities.length > 3 && (
                        <span className="inline-block px-2 py-1 rounded-md bg-surface text-xs text-secondary border border-border/20">
                          +{branch.facilities.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Quick Stats (stable, deterministic) */}
                <div className="mt-4 pt-4 border-t border-border/20">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-lg font-semibold text-primary">{metrics.rooms}</p>
                      <p className="text-xs text-secondary">Rooms</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-primary">{metrics.patientsPerMonth}</p>
                      <p className="text-xs text-secondary">Patients/mo</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-primary">{metrics.rating}</p>
                      <p className="text-xs text-secondary">Rating</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BranchDirectory;