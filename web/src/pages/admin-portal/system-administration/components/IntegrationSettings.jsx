import React, { useState } from 'react';
import AppIcon from '../../../../components/AppIcon';
import AppImage from '../../../../components/AppImage';
import { useLanguage } from '../../../../contexts/LanguageContext';

const IntegrationSettings = () => {
    const { t } = useLanguage();

    const [integrations, setIntegrations] = useState([
        {
            id: 'stripe',
            name: 'Stripe',
            description: 'Payment processing',
            icon: 'https://cdn.brandfetch.io/id581t6s1D/theme/dark/logo.svg?c=1dxbfHSJF06C0WZe0',
            connected: true,
        },
        {
            id: 'twilio',
            name: 'Twilio',
            description: 'SMS & Notifications',
            icon: 'https://cdn.brandfetch.io/idK_w3-j5M/theme/dark/logo.svg?c=1dxbfHSJF06C0WZe0',
            connected: true,
        },
        {
            id: 'sendgrid',
            name: 'SendGrid',
            description: 'Email delivery service',
            icon: 'https://cdn.brandfetch.io/idbp3m4-6k/theme/dark/logo.svg?c=1dxbfHSJF06C0WZe0',
            connected: true,
        },
        {
            id: 's3',
            name: 'AWS S3',
            description: 'File storage',
            icon: 'https://cdn.brandfetch.io/idawilWk2n/theme/dark/logo.svg?c=1dxbfHSJF06C0WZe0',
            connected: false,
        },
        {
            id: 'openai',
            name: 'OpenAI',
            description: 'AI Model API',
            icon: 'https://cdn.brandfetch.io/id8MfI-VzF/theme/dark/logo.svg?c=1dxbfHSJF06C0WZe0',
            connected: true,
        },
        {
            id: 'sentry',
            name: 'Sentry',
            description: 'Error tracking',
            icon: 'https://cdn.brandfetch.io/id9bK0_M5n/theme/dark/logo.svg?c=1dxbfHSJF06C0WZe0',
            connected: false,
        },
    ]);

    const toggleIntegration = (id) => {
        setIntegrations(integrations.map(int =>
            int.id === id ? { ...int, connected: !int.connected } : int
        ));
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold text-primary">{t('admin.systemAdmin.integrations.title')}</h3>
                    <p className="text-sm text-secondary">{t('admin.systemAdmin.integrations.subtitle')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {integrations.map((integration) => (
                    <div key={integration.id} className="bg-surface border border-border/40 rounded-2xl p-6 flex flex-col justify-between hover:shadow-lg transition-all h-full">
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-surface-elevated p-2 flex items-center justify-center border border-border/40">
                                <AppImage src={integration.icon} alt={integration.name} className="w-full h-full object-contain" />
                            </div>
                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${integration.connected
                                    ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                                    : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800'
                                }`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${integration.connected ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                {integration.connected ? t('admin.systemAdmin.integrations.card.connected') : t('admin.systemAdmin.integrations.card.disconnected')}
                            </div>
                        </div>

                        <div className="mb-6">
                            <h4 className="text-base font-bold text-primary mb-1">{integration.name}</h4>
                            <p className="text-sm text-secondary">{integration.description}</p>
                        </div>

                        <div className="flex gap-3 mt-auto">
                            <button className="flex-1 py-2 rounded-lg text-sm font-medium border border-border/40 text-primary hover:bg-surface-elevated transition-colors">
                                {t('admin.systemAdmin.integrations.card.configure')}
                            </button>
                            <button
                                onClick={() => toggleIntegration(integration.id)}
                                className={`px-3 py-2 rounded-lg flex items-center justify-center transition-colors ${integration.connected
                                        ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30'
                                        : 'bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30'
                                    }`}
                            >
                                <AppIcon name={integration.connected ? 'Power' : 'Plug'} size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default IntegrationSettings;
