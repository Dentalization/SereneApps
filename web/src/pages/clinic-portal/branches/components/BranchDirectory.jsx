import React, { useMemo, useState } from 'react';
import AppIcon from '../../../../components/AppIcon';

const toText = (value) => (value == null ? '' : String(value));

function resolveStatus(branch) {
  if (branch?.status === 'maintenance' || branch?.isActive === 'maintenance') return 'maintenance';
  if (branch?.status === 'active' || branch?.isActive === true) return 'active';
  return 'inactive';
}

function statusBadge(status) {
  const config = {
    active: {
      label: 'Aktif',
      className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
      dot: 'bg-emerald-500'
    },
    maintenance: {
      label: 'Maintenance',
      className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
      dot: 'bg-amber-500'
    },
    inactive: {
      label: 'Tidak aktif',
      className: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
      dot: 'bg-slate-400'
    }
  }[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

function formatPhone(phone) {
  const value = toText(phone).trim();
  return value || 'Belum tersedia';
}

function formatAddress(branch) {
  return [
    branch?.streetAddress,
    branch?.city,
    branch?.province,
    branch?.postalCode
  ].filter(Boolean).join(', ') || 'Alamat belum dilengkapi';
}

function formatOperatingHours(operatingHours) {
  if (typeof operatingHours === 'string' && operatingHours.trim()) return operatingHours.trim();
  if (!operatingHours || typeof operatingHours !== 'object') return null;
  const monday = operatingHours.monday ?? operatingHours.weekdays ?? operatingHours.default;
  return typeof monday === 'string' && monday.trim() ? `Senin: ${monday.trim()}` : 'Jadwal operasional tersedia';
}

const BranchDirectory = ({ branches, onEdit, onDelete, onAdd }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const safeBranches = useMemo(() => (Array.isArray(branches) ? branches.filter(Boolean) : []), [branches]);

  const filteredBranches = useMemo(() => {
    const query = search.trim().toLowerCase();
    return safeBranches.filter((branch) => {
      const searchable = [
        branch.branchName,
        branch.streetAddress,
        branch.city,
        branch.province,
        branch.phone
      ].map((value) => toText(value).toLowerCase());
      const matchesSearch = !query || searchable.some((value) => value.includes(query));
      const matchesStatus = statusFilter === 'all' || resolveStatus(branch) === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [safeBranches, search, statusFilter]);

  const handleAdd = typeof onAdd === 'function' ? onAdd : () => {};
  const handleEdit = typeof onEdit === 'function' ? onEdit : () => {};
  const handleDelete = typeof onDelete === 'function' ? onDelete : () => {};

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-primary/15 bg-surface-elevated p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xl">
          <AppIcon name="Search" size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary/60" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama, alamat, kota, atau telepon..."
            className="min-h-11 w-full rounded-xl border border-primary/20 bg-surface py-2 pl-10 pr-4 text-sm text-primary transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            aria-label="Filter status cabang"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="min-h-11 rounded-xl border border-primary/20 bg-surface px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none"
          >
            <option value="all">Semua status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Tidak aktif</option>
            <option value="maintenance">Maintenance</option>
          </select>
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-accent-hover"
          >
            <AppIcon name="Plus" size={16} />
            Tambah Cabang
          </button>
        </div>
      </div>

      {filteredBranches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-primary/20 bg-surface-elevated px-6 py-14 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-primary/15 bg-surface text-secondary">
            <AppIcon name={safeBranches.length === 0 ? 'Hospital' : 'SearchX'} size={23} />
          </div>
          <h3 className="font-semibold text-primary">{safeBranches.length === 0 ? 'Belum ada cabang' : 'Cabang tidak ditemukan'}</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-secondary">
            {safeBranches.length === 0
              ? 'Tambahkan lokasi pertama untuk mulai mengelola operasional multi-cabang.'
              : 'Ubah kata pencarian atau filter status untuk melihat hasil lain.'}
          </p>
          {safeBranches.length === 0 && (
            <button type="button" onClick={handleAdd} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white">
              <AppIcon name="Plus" size={16} />
              Tambah Cabang Pertama
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {filteredBranches.map((branch, index) => {
            const status = resolveStatus(branch);
            const hours = formatOperatingHours(branch.operatingHours);
            const rooms = branch.treatmentRoomsCount ?? branch.treatment_rooms_count;
            const staff = branch.staffCount ?? branch.staff_count;
            const patients = branch.monthlyPatients ?? branch.monthly_patients;
            return (
              <article
                key={branch.id ?? branch.branchName ?? `branch-${index}`}
                className="rounded-2xl border border-primary/15 bg-surface-elevated p-5 transition-colors hover:border-accent/30"
              >
                <header className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent/5 text-accent">
                      <AppIcon name={branch.isMainBranch ? 'Landmark' : 'MapPinned'} size={21} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold text-primary">{branch.branchName || 'Cabang tanpa nama'}</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {statusBadge(status)}
                        {branch.isMainBranch && (
                          <span className="rounded-full border border-accent/20 bg-accent/5 px-2.5 py-1 text-xs font-medium text-accent">Cabang utama</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button type="button" onClick={() => handleEdit(branch)} className="rounded-lg p-2 text-secondary transition hover:bg-surface hover:text-primary" title="Edit cabang" aria-label={`Edit ${branch.branchName || 'cabang'}`}>
                      <AppIcon name="Pencil" size={16} />
                    </button>
                    {!branch.isMainBranch && (
                      <button type="button" onClick={() => handleDelete(branch)} className="rounded-lg p-2 text-secondary transition hover:bg-red-500/10 hover:text-red-600" title="Hapus cabang" aria-label={`Hapus ${branch.branchName || 'cabang'}`}>
                        <AppIcon name="Trash2" size={16} />
                      </button>
                    )}
                  </div>
                </header>

                <div className="mt-5 grid gap-4 border-t border-primary/10 pt-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-secondary/70">Alamat</p>
                    <p className="mt-1 text-sm leading-relaxed text-primary">{formatAddress(branch)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-secondary/70">Telepon</p>
                    <p className="mt-1 text-sm text-primary">{formatPhone(branch.phone)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-secondary/70">Jam operasional</p>
                    <p className="mt-1 text-sm text-primary">{hours || 'Belum dilengkapi'}</p>
                  </div>
                </div>

                {Array.isArray(branch.facilities) && branch.facilities.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5 border-t border-primary/10 pt-4">
                    {branch.facilities.slice(0, 4).map((facility, facilityIndex) => (
                      <span key={`${branch.id}-facility-${facilityIndex}`} className="rounded-md border border-primary/10 bg-surface px-2 py-1 text-xs text-secondary">
                        {toText(facility)}
                      </span>
                    ))}
                    {branch.facilities.length > 4 && <span className="px-2 py-1 text-xs text-secondary">+{branch.facilities.length - 4} lainnya</span>}
                  </div>
                )}

                <dl className="mt-4 grid grid-cols-3 divide-x divide-primary/10 border-t border-primary/10 pt-4 text-center">
                  <div>
                    <dt className="text-[11px] text-secondary">Ruang</dt>
                    <dd className="mt-1 font-semibold text-primary">{rooms ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-secondary">Staf</dt>
                    <dd className="mt-1 font-semibold text-primary">{staff ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-secondary">Pasien/bulan</dt>
                    <dd className="mt-1 font-semibold text-primary">{patients ?? '—'}</dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BranchDirectory;
