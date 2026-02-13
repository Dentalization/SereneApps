import React from 'react';
import AppIcon from '../../../../components/AppIcon';
import AppImage from '../../../../components/AppImage';
import { useLanguage } from '../../../../contexts/LanguageContext';

const PartnerDirectory = () => {
    const { t } = useLanguage();

    const partners = [
        { id: 1, name: 'MediLab Diagnostics', type: 'Laboratory', tier: 'gold', status: 'online', users: 1200, location: 'Singapore' },
        { id: 2, name: 'QuickCare Pharmacy', type: 'Pharmacy Chain', tier: 'silver', status: 'online', users: 850, location: 'Jakarta' },
        { id: 3, name: 'City Health Clinic', type: 'Clinic Network', tier: 'bronze', status: 'maintenance', users: 300, location: 'Bangkok' },
        { id: 4, name: 'Zenith Wellness', type: 'Wellness Center', tier: 'gold', status: 'offline', users: 500, location: 'Bali' },
    ];

    const getTierBadge = (tier) => {
        const styles = {
            gold: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
            silver: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
            bronze: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
        };
        const icons = {
            gold: 'Award',
            silver: 'Shield',
            bronze: 'Star',
        };
        return (
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase border ${styles[tier]}`}>
                <AppIcon name={icons[tier]} size={12} />
                {t(`admin.partnerships.directory.tier.${tier}`)}
            </span>
        );
    };

    const getStatusIndicator = (status) => {
        const colors = {
            online: 'text-emerald-500 bg-emerald-500',
            offline: 'text-rose-500 bg-rose-500',
            maintenance: 'text-amber-500 bg-amber-500',
        };
        return (
            <div className="flex items-center gap-2">
                <span className={`relative flex h-3 w-3`}>
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${colors[status].split(' ')[1]}`}></span>
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${colors[status].split(' ')[1]}`}></span>
                </span>
                <span className={`text-xs font-medium uppercase ${colors[status].split(' ')[0]}`}>
                    {t(`admin.partnerships.directory.status.${status}`)}
                </span>
            </div>
        );
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {partners.map((partner) => (
                <div key={partner.id} className="bg-surface border border-border/40 rounded-3xl overflow-hidden hover:shadow-xl transition-shadow group">
                    <div className="h-24 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 relative">
                        <div className="absolute top-4 right-4">
                            {getStatusIndicator(partner.status)}
                        </div>
                    </div>
                    <div className="px-6 pb-6 relative">
                        <div className="w-16 h-16 rounded-2xl bg-white dark:bg-gray-800 shadow-md flex items-center justify-center -mt-8 mb-4 border-2 border-surface text-2xl font-bold text-primary">
                            {partner.name[0]}
                        </div>

                        <h3 className="text-xl font-bold text-primary mb-1">{partner.name}</h3>
                        <p className="text-sm text-secondary mb-4">{partner.type} • {partner.location}</p>

                        <div className="flex flex-wrap gap-2 mb-6">
                            {getTierBadge(partner.tier)}
                        </div>

                        <div className="grid grid-cols-2 gap-4 border-t border-border/40 pt-4">
                            <div>
                                <p className="text-xs text-secondary uppercase tracking-wider mb-1">Users</p>
                                <p className="font-mono font-medium text-primary">{partner.users.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-xs text-secondary uppercase tracking-wider mb-1">ID</p>
                                <p className="font-mono font-medium text-primary text-xs truncate">PID-{Date.now().toString().slice(-6)}-{partner.id}</p>
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button className="flex-1 py-2 rounded-xl bg-primary text-background font-medium text-sm hover:opacity-90 transition-opacity">
                                View Profile
                            </button>
                            <button className="p-2 rounded-xl border border-border/40 text-secondary hover:text-primary hover:bg-surface-elevated transition-colors">
                                <AppIcon name="Settings" size={20} />
                            </button>
                            <button className="p-2 rounded-xl border border-border/40 text-secondary hover:text-primary hover:bg-surface-elevated transition-colors">
                                <AppIcon name="MessageCircle" size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            ))}

            {/* Add New Card */}
            <button className="border-2 border-dashed border-border/40 rounded-3xl p-6 flex flex-col items-center justify-center text-secondary hover:border-indigo-500 hover:text-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all min-h-[300px]">
                <div className="w-16 h-16 rounded-full bg-surface-elevated flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <AppIcon name="Plus" size={32} />
                </div>
                <h3 className="text-lg font-bold">Add New Partner</h3>
                <p className="text-sm">Onboard a new clinic or service</p>
            </button>
        </div>
    );
};

export default PartnerDirectory;
