import React, { useEffect, useState } from 'react';
import AppIcon from '../../../../components/AppIcon';
import ModalPortal from '../../../../components/ui/ModalPortal';

const INITIAL_FORM = {
  name: '',
  email: '',
  password: '',
  role: 'manager',
  position: '',
  department: '',
  assignedBranchId: ''
};

const StaffInviteModal = ({
  open,
  onClose,
  onSubmit,
  translations,
  roleOptions,
  branches,
  branchesLoading,
  loading,
  error
}) => {
  const [form, setForm] = useState(INITIAL_FORM);

  useEffect(() => {
    if (open) {
      setForm((prev) => ({ ...INITIAL_FORM, role: roleOptions?.[0]?.value || prev.role }));
    }
  }, [open, roleOptions]);

  if (!open) {
    return null;
  }

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (loading) return;
    onSubmit(form);
  };

  return (
    <ModalPortal>
      {/* Backdrop overlay - fixed to viewport */}
      <div className="fixed inset-0 z-50 bg-black/50" aria-hidden="true" />
      
      {/* Modal wrapper - positioned at current scroll location */}
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto my-8">
          {/* Modal container */}
          <div className="relative w-full max-w-lg max-h-[85vh] bg-surface-elevated rounded-2xl shadow-2xl overflow-y-auto">
          <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
            <div className="px-6 pt-6 pb-4 border-b border-border/40">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                    {translations.badge}
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-primary">{translations.title}</h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg bg-surface px-2 py-1 text-secondary transition hover:bg-surface-elevated hover:text-primary"
                  aria-label={translations.actions.close}
                >
                  <AppIcon name="X" size={18} />
                </button>
              </div>
              <p className="text-sm text-secondary mt-2">{translations.description}</p>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-secondary" htmlFor="invite-name">
                {translations.fields.name}
              </label>
              <input
                id="invite-name"
                type="text"
                value={form.name}
                onChange={handleChange('name')}
                placeholder={translations.placeholders.name}
                className="w-full rounded-lg border border-border/40 bg-surface px-3 py-2 text-sm text-primary transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-secondary" htmlFor="invite-email">
                {translations.fields.email}
              </label>
              <input
                id="invite-email"
                type="email"
                value={form.email}
                onChange={handleChange('email')}
                placeholder={translations.placeholders.email}
                className="w-full rounded-lg border border-border/40 bg-surface px-3 py-2 text-sm text-primary transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-secondary" htmlFor="invite-password">
                {translations.fields.password}
              </label>
              <input
                id="invite-password"
                type="password"
                value={form.password}
                onChange={handleChange('password')}
                placeholder={translations.placeholders.password}
                className="w-full rounded-lg border border-border/40 bg-surface px-3 py-2 text-sm text-primary transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                required
                minLength={6}
              />
              <p className="text-xs text-secondary mt-1">
                {translations.hints?.password || 'Minimal 6 karakter'}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-secondary" htmlFor="invite-role">
                  {translations.fields.role}
                </label>
                <select
                  id="invite-role"
                  value={form.role}
                  onChange={handleChange('role')}
                  className="w-full rounded-lg border border-border/40 bg-surface px-3 py-2 text-sm text-primary transition focus:border-accent focus:outline-none"
                  required
                >
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-secondary" htmlFor="invite-position">
                  {translations.fields.position}
                </label>
                <input
                  id="invite-position"
                  type="text"
                  value={form.position}
                  onChange={handleChange('position')}
                  placeholder={translations.placeholders.position}
                  className="w-full rounded-lg border border-border/40 bg-surface px-3 py-2 text-sm text-primary transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-secondary" htmlFor="invite-branch">
                {translations.fields.branch}
              </label>
              <select
                id="invite-branch"
                value={form.assignedBranchId}
                onChange={handleChange('assignedBranchId')}
                className="w-full rounded-lg border border-border/40 bg-surface px-3 py-2 text-sm text-primary transition focus:border-accent focus:outline-none"
                required
              >
                <option value="">
                  {translations.placeholders.branch}
                </option>
                {branchesLoading ? (
                  <option disabled>Loading branches...</option>
                ) : (
                  branches?.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.branchName}
                      {branch.isMainBranch ? ' (Main)' : ''}
                    </option>
                  ))
                )}
              </select>
              <p className="text-xs text-secondary mt-1">
                {translations.hints?.branch || 'Staff akan ditempatkan di cabang ini'}
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-secondary" htmlFor="invite-department">
                {translations.fields.department}
              </label>
              <input
                id="invite-department"
                type="text"
                value={form.department}
                onChange={handleChange('department')}
                placeholder={translations.placeholders.department}
                className="w-full rounded-lg border border-border/40 bg-surface px-3 py-2 text-sm text-primary transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}
            </div>

            <div className="flex flex-col-reverse gap-3 px-6 py-4 border-t border-border/40 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-2 rounded-lg border border-border/40 px-4 py-2 text-sm font-medium text-secondary transition hover:border-border/60 hover:bg-surface"
              >
                {translations.actions.cancel}
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-accent/60"
                disabled={loading}
              >
                {loading && <AppIcon name="Loader2" size={16} className="animate-spin" />}
                {loading ? translations.actions.sending : translations.actions.submit}
              </button>
            </div>
          </form>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default StaffInviteModal;
