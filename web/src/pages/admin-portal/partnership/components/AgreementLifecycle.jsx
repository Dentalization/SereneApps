import React from 'react';
import AppIcon from '../../../../components/AppIcon';
import { useLanguage } from '../../../../contexts/LanguageContext';

const AgreementLifecycle = () => {
    const { t } = useLanguage();

    const stages = [
        {
            id: 'triage',
            label: t('admin.partnerships.agreements.stages.triage') || 'Triage',
            icon: 'Activity',
            color: 'text-blue-500',
            bg: 'bg-blue-500/10'
        },
        {
            id: 'diagnosis',
            label: t('admin.partnerships.agreements.stages.diagnosis') || 'Diagnosis',
            icon: 'Stethoscope',
            color: 'text-purple-500',
            bg: 'bg-purple-500/10'
        },
        {
            id: 'treatment',
            label: t('admin.partnerships.agreements.stages.treatment') || 'Treatment',
            icon: 'HeartPulse',
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10'
        },
        {
            id: 'recovery',
            label: t('admin.partnerships.agreements.stages.recovery') || 'Recovery',
            icon: 'Thermometer',
            color: 'text-orange-500',
            bg: 'bg-orange-500/10'
        },
    ];

    const agreements = [
        { id: 1, partner: 'HealthWay Systems', value: '$12k/yr', renewal: '30 days', stage: 'recovery', type: 'Insurance' },
        { id: 2, partner: 'MediLab Diagnostics', value: '$24k/yr', renewal: '180 days', stage: 'treatment', type: 'Laboratory' },
        { id: 3, partner: 'PharmaPlus', value: '$8k/yr', renewal: 'Pending', stage: 'diagnosis', type: 'Supplier' },
        { id: 4, partner: 'Dr. Smith Clinic', value: '$5k/yr', renewal: 'New', stage: 'triage', type: 'Referral' },
        { id: 5, partner: 'QuickCare', value: '$15k/yr', renewal: '240 days', stage: 'treatment', type: 'Clinic' },
    ];

    return (
        <div className="flex flex-col lg:flex-row gap-6 overflow-x-auto pb-6 min-h-[500px]">
            {stages.map((stage) => {
                const stageAgreements = agreements.filter(a => a.stage === stage.id);

                return (
                    <div key={stage.id} className="flex-1 min-w-[300px] flex flex-col group/column">
                        {/* Column Header - Matches 'PatientsPage' stats style */}
                        <div className="flex items-center justify-between mb-4 px-1">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stage.bg} ${stage.color}`}>
                                    <AppIcon name={stage.icon} size={16} />
                                </div>
                                <span className="font-semibold text-primary">{stage.label}</span>
                            </div>
                            <span className="bg-surface-elevated border border-primary/10 px-2.5 py-0.5 rounded-full text-xs font-medium text-secondary">
                                {stageAgreements.length}
                            </span>
                        </div>

                        {/* List Area */}
                        <div className="space-y-4 flex-1">
                            {stageAgreements.map((agreement) => (
                                <div
                                    key={agreement.id}
                                    className="bg-surface-elevated border border-primary/15 rounded-2xl p-5 shadow-sm hover:border-accent/50 hover:shadow-md transition-all duration-200 cursor-move group/card"
                                >
                                    {/* Header */}
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <span className="text-[10px] uppercase tracking-wider font-semibold text-secondary mb-1 block">
                                                {agreement.type}
                                            </span>
                                            <h4 className="font-bold text-primary text-base">
                                                {agreement.partner}
                                            </h4>
                                        </div>
                                        <button className="text-secondary hover:text-primary transition-colors opacity-0 group-hover/card:opacity-100">
                                            <AppIcon name="MoreHorizontal" size={18} />
                                        </button>
                                    </div>

                                    {/* Divider */}
                                    <div className="h-px bg-primary/5 w-full my-3"></div>

                                    {/* Metrics Grid */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-xs text-secondary block mb-1">Value</span>
                                            <span className="text-sm font-semibold text-primary font-mono">
                                                {agreement.value}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-secondary block mb-1">Renewal</span>
                                            <div className={`flex items-center gap-1.5 text-sm font-medium ${agreement.stage === 'recovery' ? 'text-orange-500' : 'text-primary'
                                                }`}>
                                                <AppIcon name="Clock" size={12} />
                                                {agreement.renewal}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Footer */}
                                    <div className="mt-4 pt-3 border-t border-primary/5 flex justify-between items-center">
                                        <span className="text-xs text-secondary font-mono opacity-70">#{agreement.id}</span>
                                        <button className="text-xs font-medium text-accent hover:text-accent-hover flex items-center gap-1 transition-colors">
                                            View Details <AppIcon name="ArrowRight" size={12} />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {/* Empty State */}
                            {stageAgreements.length === 0 && (
                                <div className="border-2 border-dashed border-primary/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                                    <div className="w-10 h-10 bg-surface rounded-full flex items-center justify-center mb-2">
                                        <AppIcon name="Ghost" size={18} className="text-secondary/50" />
                                    </div>
                                    <span className="text-sm text-secondary/70">Empty</span>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default AgreementLifecycle;