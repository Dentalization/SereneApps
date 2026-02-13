import React from 'react';
import AppIcon from '../../../../components/AppIcon';
import { useLanguage } from '../../../../contexts/LanguageContext';

const KnowledgeBase = () => {
    const { t } = useLanguage();

    const categories = [
        {
            id: 'getting-started',
            title: t('admin.supportHelpdesk.knowledgeContent.categories.gettingStarted'),
            icon: 'Rocket',
            articles: 12,
            color: 'text-blue-600',
            bg: 'bg-blue-100 dark:bg-blue-900/20',
        },
        {
            id: 'account-billing',
            title: t('admin.supportHelpdesk.knowledgeContent.categories.accountBilling'),
            icon: 'CreditCard',
            articles: 8,
            color: 'text-purple-600',
            bg: 'bg-purple-100 dark:bg-purple-900/20',
        },
        {
            id: 'technical-support',
            title: t('admin.supportHelpdesk.knowledgeContent.categories.technicalSupport'),
            icon: 'Tool',
            articles: 24,
            color: 'text-orange-600',
            bg: 'bg-orange-100 dark:bg-orange-900/20',
        },
        {
            id: 'features',
            title: t('admin.supportHelpdesk.knowledgeContent.categories.features'),
            icon: 'Zap',
            articles: 18,
            color: 'text-green-600',
            bg: 'bg-green-100 dark:bg-green-900/20',
        },
    ];

    const popularArticles = [
        { id: 1, title: 'How to integrate with Midtrans', views: 1240, category: 'Account & Billing' },
        { id: 2, title: 'Setting up AI Models for beginners', views: 980, category: 'Features' },
        { id: 3, title: 'Troubleshooting login issues', views: 850, category: 'Technical Support' },
        { id: 4, title: 'Exporting patient data to CSV', views: 720, category: 'Features' },
        { id: 5, title: 'Understanding your monthly invoice', views: 650, category: 'Account & Billing' },
    ];

    return (
        <div className="space-y-8">
            {/* Search Header */}
            <div className="bg-gradient-to-r from-teal-500 to-cyan-600 rounded-3xl p-10 text-center text-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-10">
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
                    </svg>
                </div>
                <div className="relative z-10 max-w-2xl mx-auto space-y-6">
                    <h2 className="text-3xl font-bold">{t('admin.supportHelpdesk.knowledgeContent.searchPlaceholder')}</h2>
                    <div className="relative">
                        <AppIcon name="Search" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('admin.supportHelpdesk.knowledgeContent.searchPlaceholder')}
                            className="w-full bg-white text-gray-800 rounded-xl pl-12 pr-4 py-4 shadow-lg focus:outline-none focus:ring-4 focus:ring-white/30"
                        />
                    </div>
                </div>
            </div>

            {/* Categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {categories.map((cat) => (
                    <div key={cat.id} className="bg-surface border border-border/40 rounded-2xl p-6 hover:shadow-lg transition-all cursor-pointer group">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${cat.bg} group-hover:scale-110 transition-transform`}>
                            <AppIcon name={cat.icon} size={24} className={cat.color} />
                        </div>
                        <h3 className="text-lg font-semibold text-primary mb-2">{cat.title}</h3>
                        <p className="text-sm text-secondary">{cat.articles} articles</p>
                    </div>
                ))}
            </div>

            {/* Popular Articles */}
            <div className="bg-surface border border-border/40 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-primary mb-6">{t('admin.supportHelpdesk.knowledgeContent.popularArticles')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {popularArticles.map((article) => (
                        <div key={article.id} className="flex items-center gap-4 p-4 rounded-xl hover:bg-surface-elevated transition-colors cursor-pointer border border-transparent hover:border-border/40">
                            <div className="w-10 h-10 rounded-lg bg-surface-elevated border border-border/40 flex items-center justify-center text-secondary">
                                <AppIcon name="FileText" size={20} />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-medium text-primary mb-1">{article.title}</h4>
                                <div className="flex items-center gap-3 text-xs text-secondary">
                                    <span className="bg-accent/10 text-accent px-2 py-0.5 rounded-md">{article.category}</span>
                                    <span className="flex items-center gap-1">
                                        <AppIcon name="Eye" size={12} /> {article.views}
                                    </span>
                                </div>
                            </div>
                            <AppIcon name="ChevronRight" size={16} className="text-secondary opacity-50" />
                        </div>
                    ))}
                </div>
                <div className="mt-6 text-center">
                    <button className="text-accent font-medium hover:text-accent/80 transition-colors">
                        {t('admin.supportHelpdesk.knowledgeContent.viewAll')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default KnowledgeBase;
