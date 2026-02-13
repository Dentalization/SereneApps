import React from 'react';
import AppIcon from '../../../../components/AppIcon';
import { useLanguage } from '../../../../contexts/LanguageContext';

const SystemHealth = () => {
    const { t } = useLanguage();

    const metrics = [
        { label: t('admin.systemAdmin.health.cpuUsage'), value: 45, color: 'bg-blue-500', text: 'text-blue-600' },
        { label: t('admin.systemAdmin.health.memoryUsage'), value: 62, color: 'bg-purple-500', text: 'text-purple-600' },
        { label: t('admin.systemAdmin.health.storageUsage'), value: 28, color: 'bg-green-500', text: 'text-green-600' },
        { label: t('admin.systemAdmin.health.apiLatency'), value: 12, max: 100, unit: 'ms', color: 'bg-orange-500', text: 'text-orange-600' },
    ];

    const services = [
        { name: t('admin.systemAdmin.health.services.database'), status: 'operational', uptime: '99.99%', latency: '24ms' },
        { name: t('admin.systemAdmin.health.services.redis'), status: 'operational', uptime: '99.95%', latency: '5ms' },
        { name: t('admin.systemAdmin.health.services.storage'), status: 'operational', uptime: '99.90%', latency: '120ms' },
        { name: t('admin.systemAdmin.health.services.email'), status: 'operational', uptime: '99.85%', latency: '450ms' },
    ];

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-primary">{t('admin.systemAdmin.tabs.health')}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {metrics.map((metric, idx) => (
                    <div key={idx} className="bg-surface border border-border/40 rounded-2xl p-5">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-sm font-medium text-secondary">{metric.label}</span>
                            <span className={`text-xl font-bold ${metric.text}`}>
                                {metric.value}{metric.unit || '%'}
                            </span>
                        </div>
                        <div className="h-2 w-full bg-surface-elevated rounded-full overflow-hidden">
                            <div
                                className={`h-full ${metric.color} transition-all duration-1000`}
                                style={{ width: `${(metric.value / (metric.max || 100)) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-surface border border-border/40 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-border/40">
                    <h4 className="font-semibold text-primary">System Services</h4>
                </div>
                <div className="divide-y divide-border/40">
                    {services.map((service, idx) => (
                        <div key={idx} className="p-4 flex items-center justify-between hover:bg-surface-elevated/50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center text-green-600">
                                    <AppIcon name="CheckCircle" size={20} />
                                </div>
                                <div>
                                    <h5 className="font-medium text-primary">{service.name}</h5>
                                    <p className="text-xs text-secondary">Uptime: {service.uptime}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <p className="text-xs text-secondary">Latency</p>
                                    <p className="text-sm font-medium text-primary">{service.latency}</p>
                                </div>
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                    {t('admin.systemAdmin.health.status.operational')}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SystemHealth;
