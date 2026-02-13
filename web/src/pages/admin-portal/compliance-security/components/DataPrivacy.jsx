import React, { useState } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import AppIcon from '../../../../components/AppIcon';
import { useLanguage } from '../../../../contexts/LanguageContext';

const DataPrivacy = () => {
    const { t } = useLanguage();

    const [settings, setSettings] = useState({
        retention: true,
        encryption: true,
        anonymization: false,
        consent: true,
        accessControl: true,
        auditLogging: true
    });

    const consentData = [
        { day: 'M', optIn: 40, optOut: 2 },
        { day: 'T', optIn: 35, optOut: 1 },
        { day: 'W', optIn: 50, optOut: 3 },
        { day: 'T', optIn: 45, optOut: 0 },
        { day: 'F', optIn: 60, optOut: 2 },
        { day: 'S', optIn: 30, optOut: 1 },
        { day: 'S', optIn: 25, optOut: 0 },
    ];

    const toggleSetting = (key) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const SettingGroup = ({ title, items }) => (
        <div className="bg-surface border border-border/40 rounded-3xl overflow-hidden p-6 mb-6">
            <h4 className="text-sm font-bold uppercase tracking-wider text-secondary mb-4">{title}</h4>
            <div className="space-y-4">
                {items.map(key => (
                    <div key={key} className="flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${settings[key] ? 'bg-primary text-background' : 'bg-surface-elevated text-secondary'}`}>
                                <AppIcon name={settings[key] ? 'Lock' : 'Unlock'} size={20} />
                            </div>
                            <div>
                                <span className="font-semibold text-primary block">{t(`admin.complianceSecurity.privacy.settings.${key}`)}</span>
                                <span className={`text-xs font-medium ${settings[key] ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {settings[key] ? 'Active - Compliant' : 'Inactive - Attention Needed'}
                                </span>
                            </div>
                        </div>
                        <div
                            onClick={() => toggleSetting(key)}
                            className={`w-14 h-8 rounded-full p-1 cursor-pointer transition-colors duration-300 ${settings[key] ? 'bg-emerald-500' : 'bg-gray-300'}`}
                        >
                            <div className={`w-6 h-6 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${settings[key] ? 'translate-x-6' : 'translate-x-0'}`}></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <SettingGroup
                    title={t('admin.complianceSecurity.privacy.groups.patient')}
                    items={['retention', 'anonymization', 'consent']}
                />
                <SettingGroup
                    title={t('admin.complianceSecurity.privacy.groups.system')}
                    items={['encryption', 'accessControl', 'auditLogging']}
                />
            </div>

            <div className="space-y-6">
                {/* Consent Log Chart */}
                <div className="bg-surface border border-border/40 rounded-3xl p-6">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-secondary mb-4">{t('admin.complianceSecurity.privacy.consentLog')}</h4>
                    <div className="h-40 w-full mb-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={consentData}>
                                <Area type="monotone" dataKey="optIn" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
                                <Area type="monotone" dataKey="optOut" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.2} strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                            <span className="text-primary">{t('admin.complianceSecurity.privacy.optIn')} (96%)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                            <span className="text-primary">{t('admin.complianceSecurity.privacy.optOut')} (4%)</span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 text-white text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                        <AppIcon name="Database" size={32} className="text-white" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">My Data Request</h3>
                    <p className="text-white/80 text-sm mb-6">Process DSAR requests for patients.</p>

                    <div className="space-y-3">
                        <button className="w-full py-3 rounded-xl bg-white text-indigo-600 font-bold hover:bg-white/90 transition-colors flex items-center justify-center gap-2">
                            <AppIcon name="Download" size={18} />
                            {t('admin.complianceSecurity.privacy.export')}
                        </button>
                        <button className="w-full py-3 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-600 transition-colors flex items-center justify-center gap-2">
                            <AppIcon name="Trash2" size={18} />
                            {t('admin.complianceSecurity.privacy.forget')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DataPrivacy;
