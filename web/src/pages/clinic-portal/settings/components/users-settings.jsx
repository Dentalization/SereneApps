import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useLanguage } from '../../../../contexts/LanguageContext';
import Icon from '../../../../components/AppIcon';
import { authHttp } from '../../../../utils/httpClient';
import { resolveMediaUrl } from '../../../../utils/media';
import ModalPortal from '../../../../components/ui/ModalPortal';

const UsersSettings = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Check if user can edit users
  const userRole = user?.roles?.[0] || user?.role || 'staff';
  const canEdit = ['owner', 'manager', 'admin'].includes(userRole);
  const canManageRoles = ['owner', 'manager'].includes(userRole);

  const [users, setUsers] = useState([
    {
      id: 1,
      name: 'Dr. John Doe',
      email: 'john@clinic.com',
      role: 'dentist',
      avatar: null,
      isActive: true,
      lastLogin: '2024-01-15T10:30:00Z',
      permissions: {
        patients: { read: true, write: true, delete: false },
        appointments: { read: true, write: true, delete: true },
        staff: { read: true, write: false, delete: false },
        settings: { read: false, write: false, delete: false }
      }
    },
    {
      id: 2,
      name: 'Jane Smith',
      email: 'jane@clinic.com',
      role: 'nurse',
      avatar: null,
      isActive: true,
      lastLogin: '2024-01-15T09:15:00Z',
      permissions: {
        patients: { read: true, write: true, delete: false },
        appointments: { read: true, write: true, delete: false },
        staff: { read: true, write: false, delete: false },
        settings: { read: false, write: false, delete: false }
      }
    }
  ]);

  const [selectedUser, setSelectedUser] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'staff',
    name: ''
  });

  const roles = [
    { 
      value: 'owner', 
      label: t('clinic.users.roles.owner') || 'Owner',
      description: t('clinic.users.roles.ownerDesc') || 'Full access to all features',
      restricted: true
    },
    { 
      value: 'manager', 
      label: t('clinic.users.roles.manager') || 'Manager',
      description: t('clinic.users.roles.managerDesc') || 'Manage staff and clinic operations'
    },
    { 
      value: 'admin', 
      label: t('clinic.users.roles.admin') || 'Admin',
      description: t('clinic.users.roles.adminDesc') || 'Administrative access'
    },
    { 
      value: 'dentist', 
      label: t('clinic.users.roles.dentist') || 'Dentist',
      description: t('clinic.users.roles.dentistDesc') || 'Medical professional access'
    },
    { 
      value: 'nurse', 
      label: t('clinic.users.roles.nurse') || 'Nurse',
      description: t('clinic.users.roles.nurseDesc') || 'Assistant medical access'
    },
    { 
      value: 'front_office', 
      label: t('clinic.users.roles.frontOffice') || 'Front Office',
      description: t('clinic.users.roles.frontOfficeDesc') || 'Reception and scheduling'
    },
    { 
      value: 'cashier', 
      label: t('clinic.users.roles.cashier') || 'Cashier',
      description: t('clinic.users.roles.cashierDesc') || 'Payment processing'
    },
    { 
      value: 'staff', 
      label: t('clinic.users.roles.staff') || 'Staff',
      description: t('clinic.users.roles.staffDesc') || 'Basic clinic access'
    }
  ];

  const permissionModules = [
    { key: 'patients', label: t('clinic.users.permissions.patients') || 'Patients' },
    { key: 'appointments', label: t('clinic.users.permissions.appointments') || 'Appointments' },
    { key: 'staff', label: t('clinic.users.permissions.staff') || 'Staff Management' },
    { key: 'settings', label: t('clinic.users.permissions.settings') || 'Settings' }
  ];

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const formatLastLogin = (dateString) => {
    if (!dateString) return t('clinic.users.neverLoggedIn') || 'Never logged in';
    const date = new Date(dateString);
    return date.toLocaleDateString(t('common.locale') || 'id-ID', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUserInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleInviteUser = async () => {
    if (!canEdit || !inviteData.email || !inviteData.name || !inviteData.role) return;

    setIsSaving(true);
    try {
      // API call would be here
      // await authHttp.post('/clinic/users/invite', inviteData);
      
      showMessage('success', t('clinic.users.inviteSuccess') || 'User invitation sent successfully!');
      setShowInviteModal(false);
      setInviteData({ email: '', role: 'staff', name: '' });
    } catch (error) {
      console.error('Invite user error:', error);
      showMessage('error', error.response?.data?.message || t('clinic.users.inviteError') || 'Failed to send invitation');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateUserRole = async (userId, newRole) => {
    if (!canManageRoles) return;

    try {
      // API call would be here
      // await authHttp.patch(`/clinic/users/${userId}/role`, { role: newRole });
      
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
      
      showMessage('success', t('clinic.users.roleUpdateSuccess') || 'User role updated successfully!');
    } catch (error) {
      console.error('Update role error:', error);
      showMessage('error', t('clinic.users.roleUpdateError') || 'Failed to update user role');
    }
  };

  const handleToggleUserStatus = async (userId, isActive) => {
    if (!canEdit) return;

    try {
      // API call would be here
      // await authHttp.patch(`/clinic/users/${userId}/status`, { isActive });
      
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, isActive } : user
      ));
      
      showMessage('success', t('clinic.users.statusUpdateSuccess') || 'User status updated successfully!');
    } catch (error) {
      console.error('Toggle status error:', error);
      showMessage('error', t('clinic.users.statusUpdateError') || 'Failed to update user status');
    }
  };

  const handleUpdatePermissions = async (userId, module, permission, value) => {
    if (!canManageRoles) return;

    try {
      const updatedUsers = users.map(user => {
        if (user.id === userId) {
          return {
            ...user,
            permissions: {
              ...user.permissions,
              [module]: {
                ...user.permissions[module],
                [permission]: value
              }
            }
          };
        }
        return user;
      });

      setUsers(updatedUsers);
      
      // API call would be here
      // await authHttp.patch(`/clinic/users/${userId}/permissions`, {
      //   [module]: { [permission]: value }
      // });
      
    } catch (error) {
      console.error('Update permissions error:', error);
      showMessage('error', t('clinic.users.permissionUpdateError') || 'Failed to update permissions');
    }
  };

  const handleRemoveUser = async (userId) => {
    if (!canManageRoles || !confirm(t('clinic.users.removeConfirm') || 'Are you sure you want to remove this user from the clinic?')) return;

    try {
      // API call would be here
      // await authHttp.delete(`/clinic/users/${userId}`);
      
      setUsers(prev => prev.filter(user => user.id !== userId));
      showMessage('success', t('clinic.users.removeSuccess') || 'User removed successfully!');
    } catch (error) {
      console.error('Remove user error:', error);
      showMessage('error', t('clinic.users.removeError') || 'Failed to remove user');
    }
  };

  return (
    <div className="space-y-8">
      {/* Message Display */}
      {message.text && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center space-x-2">
            <Icon 
              name={message.type === 'success' ? 'CheckCircle' : 'AlertCircle'} 
              size={16} 
            />
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        </div>
      )}

      {/* Users Management */}
      <div className="bg-surface-elevated border border-primary rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-primary flex items-center space-x-2">
            <Icon name="Users" size={20} />
            <span>{t('clinic.users.title') || 'User Management'}</span>
          </h2>
          {canEdit && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors flex items-center space-x-2"
            >
              <Icon name="UserPlus" size={16} />
              <span>{t('clinic.users.inviteUser') || 'Invite User'}</span>
            </button>
          )}
        </div>

        {!canEdit && (
          <div className="mb-4">
            <span className="text-xs bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 px-3 py-1 rounded-full">
              {t('clinic.settings.readOnly') || 'Read Only'}
            </span>
          </div>
        )}

        {/* Users List */}
        <div className="space-y-4">
          {users.map((userItem) => (
            <div key={userItem.id} className="border border-primary/10 rounded-lg p-4 bg-surface">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    {userItem.avatar ? (
                      <img
                        src={resolveMediaUrl(userItem.avatar)}
                        alt={userItem.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center">
                        <span className="text-accent font-medium text-sm">
                          {getUserInitials(userItem.name)}
                        </span>
                      </div>
                    )}
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-surface ${
                      userItem.isActive ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-primary">{userItem.name}</h3>
                    <p className="text-sm text-secondary">{userItem.email}</p>
                    <p className="text-xs text-secondary">
                      {t('clinic.users.lastLogin') || 'Last login'}: {formatLastLogin(userItem.lastLogin)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  {/* Role Selector */}
                  <div className="flex flex-col items-end space-y-1">
                    <select
                      value={userItem.role}
                      onChange={(e) => handleUpdateUserRole(userItem.id, e.target.value)}
                      disabled={!canManageRoles || userItem.id === user?.id}
                      className="px-3 py-1 text-sm border border-primary/20 rounded-lg bg-surface text-primary disabled:opacity-50"
                    >
                      {roles.filter(role => !role.restricted || userRole === 'owner').map(role => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      userItem.isActive 
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                        : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300'
                    }`}>
                      {userItem.isActive ? (t('clinic.users.active') || 'Active') : (t('clinic.users.inactive') || 'Inactive')}
                    </span>
                  </div>

                  {/* Actions */}
                  {canEdit && userItem.id !== user?.id && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedUser(selectedUser === userItem.id ? null : userItem.id)}
                        className="p-2 text-secondary hover:text-primary hover:bg-surface-elevated rounded-lg transition-colors"
                        title={t('clinic.users.editPermissions') || 'Edit Permissions'}
                      >
                        <Icon name="Settings" size={16} />
                      </button>
                      <button
                        onClick={() => handleToggleUserStatus(userItem.id, !userItem.isActive)}
                        className={`p-2 rounded-lg transition-colors ${
                          userItem.isActive 
                            ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                            : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                        }`}
                        title={userItem.isActive ? (t('clinic.users.deactivate') || 'Deactivate') : (t('clinic.users.activate') || 'Activate')}
                      >
                        <Icon name={userItem.isActive ? 'UserX' : 'UserCheck'} size={16} />
                      </button>
                      {canManageRoles && (
                        <button
                          onClick={() => handleRemoveUser(userItem.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title={t('clinic.users.removeUser') || 'Remove User'}
                        >
                          <Icon name="Trash2" size={16} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Permissions Panel */}
              {selectedUser === userItem.id && canManageRoles && (
                <div className="mt-4 pt-4 border-t border-primary/10">
                  <h4 className="font-medium text-primary mb-3">
                    {t('clinic.users.permissions.title') || 'Permissions'}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {permissionModules.map(module => (
                      <div key={module.key} className="bg-surface-elevated rounded-lg p-3">
                        <h5 className="font-medium text-primary mb-2">{module.label}</h5>
                        <div className="space-y-2">
                          {['read', 'write', 'delete'].map(permission => (
                            <div key={permission} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={userItem.permissions[module.key]?.[permission] || false}
                                onChange={(e) => handleUpdatePermissions(userItem.id, module.key, permission, e.target.checked)}
                                className="rounded border-primary/20 text-accent focus:ring-accent"
                              />
                              <span className="text-sm text-primary capitalize">
                                {t(`clinic.users.permissions.${permission}`) || permission}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Invite User Modal */}
      {showInviteModal && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowInviteModal(false)}
          >
          <div
            className="relative w-full max-w-md bg-surface-elevated rounded-2xl shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-primary">
                {t('clinic.users.inviteUser') || 'Invite User'}
              </h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-2 text-secondary hover:text-primary rounded-lg transition-colors"
              >
                <Icon name="X" size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  {t('clinic.users.name') || 'Name'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={inviteData.name}
                  onChange={(e) => setInviteData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t('clinic.users.namePlaceholder') || 'Enter full name'}
                  className="w-full px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  {t('clinic.users.email') || 'Email'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={inviteData.email}
                  onChange={(e) => setInviteData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder={t('clinic.users.emailPlaceholder') || 'Enter email address'}
                  className="w-full px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  {t('clinic.users.role') || 'Role'}
                </label>
                <select
                  value={inviteData.role}
                  onChange={(e) => setInviteData(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                >
                  {roles.filter(role => !role.restricted || userRole === 'owner').map(role => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-secondary mt-1">
                  {roles.find(r => r.value === inviteData.role)?.description}
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 text-secondary hover:text-primary transition-colors"
              >
                {t('common.cancel') || 'Cancel'}
              </button>
              <button
                onClick={handleInviteUser}
                disabled={isSaving || !inviteData.email || !inviteData.name}
                className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isSaving ? (
                  <>
                    <Icon name="Loader2" size={16} className="animate-spin" />
                    <span>{t('common.sending') || 'Sending...'}</span>
                  </>
                ) : (
                  <>
                    <Icon name="Send" size={16} />
                    <span>{t('clinic.users.sendInvite') || 'Send Invite'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default UsersSettings;
