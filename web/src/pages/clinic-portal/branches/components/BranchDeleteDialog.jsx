import React from 'react';
import AppIcon from '../../../../components/AppIcon';
import ModalPortal from '../../../../components/ui/ModalPortal';

const BranchDeleteDialog = ({ open, branch, onClose, onConfirm, loading, error }) => {
  if (!open || !branch) {
    return null;
  }

  const handleConfirm = () => {
    if (loading) return;
    onConfirm();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="relative w-full max-w-md max-h-[80vh] bg-surface-elevated rounded-2xl shadow-2xl overflow-y-auto">
        <div className="p-6 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/20">
              <AppIcon name="AlertTriangle" size={24} className="text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-primary">Delete Branch</h2>
              <p className="text-sm text-secondary">This action cannot be undone</p>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
              <h3 className="font-medium text-red-800 dark:text-red-400 mb-2">
                Are you sure you want to delete "{branch.branchName}"?
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300">
                This will permanently delete the branch and all associated data including:
              </p>
              <ul className="mt-2 text-sm text-red-700 dark:text-red-300 space-y-1">
                <li className="flex items-center gap-2">
                  <AppIcon name="Dot" size={12} />
                  Staff assignments to this branch
                </li>
                <li className="flex items-center gap-2">
                  <AppIcon name="Dot" size={12} />
                  Appointment history
                </li>
                <li className="flex items-center gap-2">
                  <AppIcon name="Dot" size={12} />
                  Revenue and analytics data
                </li>
                <li className="flex items-center gap-2">
                  <AppIcon name="Dot" size={12} />
                  Branch-specific settings
                </li>
              </ul>
            </div>

            {branch.isMainBranch && (
              <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center gap-2 mb-2">
                  <AppIcon name="AlertTriangle" size={16} className="text-yellow-600" />
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-400">
                    Main Branch Warning
                  </h4>
                </div>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  This is your main branch. Deleting it may affect clinic operations and staff access.
                  Consider designating another branch as main before deletion.
                </p>
              </div>
            )}

            {/* Branch Info */}
            <div className="p-4 rounded-lg border border-border/40 bg-surface">
              <h4 className="font-medium text-primary mb-3">Branch Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-secondary">Name:</span>
                  <span className="text-primary font-medium">{branch.branchName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Address:</span>
                  <span className="text-primary text-right max-w-[200px] truncate" title={branch.address}>
                    {branch.address || '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Phone:</span>
                  <span className="text-primary">{branch.phone || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Staff:</span>
                  <span className="text-primary">{branch.staffCount || 0} members</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Status:</span>
                  <span className={`capitalize ${
                    branch.status === 'active' ? 'text-green-600' : 
                    branch.status === 'inactive' ? 'text-gray-600' : 
                    'text-yellow-600'
                  }`}>
                    {branch.status || 'active'}
                  </span>
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AppIcon name="AlertCircle" size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Confirmation Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-secondary">
                Type <code className="px-1 py-0.5 bg-surface rounded text-primary font-mono text-xs">{branch.branchName}</code> to confirm:
              </label>
              <input
                type="text"
                placeholder={`Type "${branch.branchName}" here`}
                className="w-full rounded-lg border border-border/40 bg-surface px-3 py-2 text-sm text-primary placeholder-secondary/60 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400/20"
                id="deleteConfirmation"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-border/40">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-secondary border border-border/40 rounded-lg hover:bg-surface-elevated disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading || document.getElementById('deleteConfirmation')?.value !== branch.branchName}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading && <AppIcon name="Loader2" size={16} className="animate-spin" />}
              {loading ? 'Deleting...' : 'Delete Branch'}
            </button>
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};

export default BranchDeleteDialog;
