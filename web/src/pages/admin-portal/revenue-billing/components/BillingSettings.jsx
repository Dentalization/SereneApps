import React from 'react';
import AppIcon from '../../../../components/AppIcon';
import { useLanguage } from '../../../../contexts/LanguageContext';

const BillingSettings = () => {
    const { t } = useLanguage();

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* General Settings */}
            <div className="bg-surface border border-border/40 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 dark:bg-blue-900/20">
                        <AppIcon name="Settings" size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-primary">{t('admin.revenueBilling.settings.general.title')}</h3>
                        <p className="text-sm text-secondary">{t('admin.revenueBilling.settings.general.subtitle')}</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-secondary mb-2">{t('admin.revenueBilling.settings.general.paymentGateway')}</label>
                        <select
                            value=""
                            disabled
                            className="w-full cursor-not-allowed bg-background border border-border/40 rounded-lg px-4 py-2 text-secondary opacity-70"
                        >
                            <option value="">Belum tersedia dari backend</option>
                        </select>
                        <p className="mt-1 text-xs text-secondary">Backend belum mengirim payment gateway configuration untuk Admin Portal.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-secondary mb-2">{t('admin.revenueBilling.settings.general.defaultCurrency')}</label>
                        <select
                            value="IDR"
                            disabled
                            className="w-full cursor-not-allowed bg-background border border-border/40 rounded-lg px-4 py-2 text-secondary opacity-70"
                        >
                            <option value="IDR">Indonesian Rupiah (IDR)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-secondary mb-2">{t('admin.revenueBilling.settings.general.taxRate')}</label>
                        <div className="relative">
                            <input
                                type="number"
                                value=""
                                disabled
                                placeholder="N/A"
                                className="w-full cursor-not-allowed bg-background border border-border/40 rounded-lg px-4 py-2 text-secondary opacity-70"
                            />
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <span className="text-secondary">%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Automation Settings */}
            <div className="bg-surface border border-border/40 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 dark:bg-purple-900/20">
                        <AppIcon name="Zap" size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-primary">{t('admin.revenueBilling.settings.automation.title')}</h3>
                        <p className="text-sm text-secondary">{t('admin.revenueBilling.settings.automation.subtitle')}</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-sm font-medium text-primary">{t('admin.revenueBilling.settings.automation.autoGenerate')}</h4>
                            <p className="text-xs text-secondary mt-0.5">{t('admin.revenueBilling.settings.automation.autoGenerateHint')}</p>
                        </div>
                        <button
                            disabled
                            title="Setting auto invoice belum tersedia dari backend"
                            className="relative inline-flex h-6 w-11 cursor-not-allowed items-center rounded-full bg-gray-200 opacity-70 dark:bg-gray-700"
                        >
                            <span className="inline-block h-4 w-4 translate-x-1 rounded-full bg-white" />
                        </button>
                    </div>

                    <div className="border-t border-border/40 pt-4 flex items-center justify-between">
                        <div>
                            <h4 className="text-sm font-medium text-primary">{t('admin.revenueBilling.settings.automation.reminders')}</h4>
                            <p className="text-xs text-secondary mt-0.5">{t('admin.revenueBilling.settings.automation.remindersHint')}</p>
                        </div>
                        <button
                            disabled
                            title="Setting reminder belum tersedia dari backend"
                            className="relative inline-flex h-6 w-11 cursor-not-allowed items-center rounded-full bg-gray-200 opacity-70 dark:bg-gray-700"
                        >
                            <span className="inline-block h-4 w-4 translate-x-1 rounded-full bg-white" />
                        </button>
                    </div>

                    <div className="border-t border-border/40 pt-4">
                        <h4 className="text-sm font-medium text-primary mb-3">{t('admin.revenueBilling.settings.automation.gatewayStatus')}</h4>
                        <div className="bg-surface-elevated rounded-lg p-3 flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                            <span className="text-sm text-secondary">Gateway status belum tersedia dari backend.</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="lg:col-span-2 flex justify-end">
                <button disabled title="Save billing settings belum tersedia" className="px-6 py-2.5 cursor-not-allowed bg-primary/60 text-white rounded-xl font-medium shadow-sm opacity-70 flex items-center gap-2">
                    <AppIcon name="Save" size={18} />
                    {t('admin.revenueBilling.settings.saveChanges')}
                </button>
            </div>
        </div>
    );
};

export default BillingSettings;
