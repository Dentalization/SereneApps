import React from 'react';
import AppIcon from '../../../../components/AppIcon';
import AppImage from '../../../../components/AppImage';
import { useLanguage } from '../../../../contexts/LanguageContext';

const UserManagement = () => {
    const { t } = useLanguage();

    const users = [
        {
            id: 1,
            name: 'Adrian Halim',
            email: 'adrian@serene.com',
            role: 'admin',
            status: 'active',
            lastLogin: '2 mins ago',
            avatar: 'https://i.pravatar.cc/150?u=adrian',
        },
        {
            id: 2,
            name: 'Sarah Jenkins',
            email: 'sarah@serene.com',
            role: 'manager',
            status: 'active',
            lastLogin: '1 hour ago',
            avatar: 'https://i.pravatar.cc/150?u=sarah',
        },
        {
            id: 3,
            name: 'Michael Chen',
            email: 'michael@serene.com',
            role: 'support',
            status: 'inactive',
            lastLogin: '3 days ago',
            avatar: 'https://i.pravatar.cc/150?u=michael',
        },
        {
            id: 4,
            name: 'Emma Wilson',
            email: 'emma@serene.com',
            role: 'staff',
            status: 'active',
            lastLogin: '5 hours ago',
            avatar: 'https://i.pravatar.cc/150?u=emma',
        },
    ];

    const getRoleBadge = (role) => {
        const colors = {
            admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
            manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            support: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
            staff: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
        };
        return (
            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${colors[role]}`}>
                {t(`admin.systemAdmin.users.roles.${role}`)}
            </span>
        );
    };

    return (
        <div className="bg-surface border border-border/40 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-border/40 flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold text-primary">{t('admin.systemAdmin.users.title')}</h3>
                    <p className="text-sm text-secondary">{t('admin.systemAdmin.users.subtitle')}</p>
                </div>
                <button className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-accent/90">
                    <AppIcon name="Plus" size={16} />
                    <span>{t('admin.systemAdmin.users.addUser')}</span>
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-surface-elevated">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{t('admin.systemAdmin.users.table.user')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{t('admin.systemAdmin.users.table.role')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{t('admin.systemAdmin.users.table.status')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{t('admin.systemAdmin.users.table.lastLogin')}</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-secondary uppercase tracking-wider">{t('admin.systemAdmin.users.table.actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 bg-surface">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-surface-elevated/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <AppImage src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full" />
                                        <div>
                                            <div className="text-sm font-medium text-primary">{user.name}</div>
                                            <div className="text-xs text-secondary">{user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {getRoleBadge(user.role)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium ${user.status === 'active'
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                                        }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                                        {t(`admin.systemAdmin.users.status.${user.status}`)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                                    {user.lastLogin}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button className="text-secondary hover:text-accent transition-colors mr-3">
                                        <AppIcon name="Edit2" size={16} />
                                    </button>
                                    <button className="text-secondary hover:text-red-600 transition-colors">
                                        <AppIcon name="Trash2" size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UserManagement;
