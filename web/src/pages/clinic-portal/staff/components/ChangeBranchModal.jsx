import React, { useState, useEffect } from 'react';
import AppIcon from '../../../../components/AppIcon';
import ModalPortal from '../../../../components/ui/ModalPortal';

const ChangeBranchModal = ({ 
  open, 
  onClose, 
  onSubmit, 
  staffMember, 
  branches, 
  branchesLoading, 
  loading, 
  error,
  translations = {}
}) => {
  const [selectedBranchId, setSelectedBranchId] = useState('');

  useEffect(() => {
    if (open && staffMember) {
      setSelectedBranchId(staffMember.branchId || '');
    }
  }, [open, staffMember]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedBranchId && selectedBranchId !== staffMember?.branchId) {
      onSubmit(staffMember.id, selectedBranchId);
    }
  };

  const handleClose = () => {
    setSelectedBranchId('');
    onClose();
  };

  if (!open) return null;

  const currentBranch = branches.find(b => b.id === staffMember?.branchId);
  const selectedBranch = branches.find(b => b.id === selectedBranchId);

  return (
    <ModalPortal>
      {/* Backdrop overlay - fixed to viewport */}
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" aria-hidden="true" />
      
      {/* Modal wrapper - positioned at current scroll location */}
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto my-8">
          {/* Modal container */}
          <div className="relative w-full max-w-lg max-h-[85vh] rounded-2xl bg-surface-elevated shadow-2xl overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border/30">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center">
              <AppIcon name="Building" size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-primary">
                {translations.title || 'Change Branch Assignment'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {translations.subtitle || `Move ${staffMember?.name} to a different branch`}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg hover:bg-muted/60 dark:hover:bg-muted/40 flex items-center justify-center transition-colors"
            disabled={loading}
          >
            <AppIcon name="X" size={16} className="text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Current Assignment */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center">
                <AppIcon name="MapPin" size={16} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {translations.currentBranch || 'Current Branch'}
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {currentBranch?.branchName || translations.unassigned || 'Unassigned'}
                </p>
              </div>
            </div>
          </div>

          {/* Branch Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-primary block">
              {translations.newBranch || 'New Branch Assignment'}
            </label>
            
            {branchesLoading ? (
              <div className="w-full h-12 bg-muted/50 rounded-xl animate-pulse flex items-center justify-center">
                <AppIcon name="Loader2" size={16} className="text-muted-foreground animate-spin" />
              </div>
            ) : branches.length === 0 ? (
              <div className="w-full h-12 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl flex items-center justify-center">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  {translations.noBranches || 'No branches available'}
                </p>
              </div>
            ) : (
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full h-12 px-4 bg-surface border border-border/40 rounded-xl text-primary focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
                required
                disabled={loading}
              >
                <option value="">
                  {translations.selectBranch || 'Select a branch...'}
                </option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.branchName}
                    {branch.isMainBranch ? ` (${translations.mainBranch || 'Main'})` : ''}
                  </option>
                ))}
              </select>
            )}
            
            {selectedBranch && (
              <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AppIcon name="ArrowRight" size={14} className="text-green-600 dark:text-green-400" />
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {translations.willMoveTo || 'Will move to'}: <strong>{selectedBranch.branchName}</strong>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <AppIcon name="AlertCircle" size={16} className="text-red-500" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border/30">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              disabled={loading}
            >
              {translations.cancel || 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={loading || !selectedBranchId || selectedBranchId === staffMember?.branchId}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-muted/60 disabled:text-muted-foreground text-white rounded-xl text-sm font-medium transition-colors flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <AppIcon name="Loader2" size={16} className="animate-spin" />
                  <span>{translations.updating || 'Updating...'}</span>
                </>
              ) : (
                <>
                  <AppIcon name="Check" size={16} />
                  <span>{translations.update || 'Update Branch'}</span>
                </>
              )}
            </button>
          </div>
        </form>
        </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default ChangeBranchModal;
