import { useState } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import AppIcon from '../../../../components/AppIcon';

const MarketingView = () => {
  const { t } = useLanguage();

  // Mock data
  const marketingKPI = {
    newPatients: 45,
    growthRate: 15,
    recallSuccess: 68,
    referralRate: 23,
    campaignROI: 340
  };

  const patientAcquisition = [
    { source: 'Google Search', patients: 18, percentage: 40, cost: 4500000, cpa: 250000 },
    { source: 'Instagram Ads', patients: 12, percentage: 27, cost: 3600000, cpa: 300000 },
    { source: 'Referral/Word of Mouth', patients: 10, percentage: 22, cost: 0, cpa: 0 },
    { source: 'Facebook Ads', patients: 5, percentage: 11, cost: 2000000, cpa: 400000 }
  ];

  const campaignPerformance = [
    { 
      name: 'Promo Scaling Januari', 
      status: 'active', 
      impressions: 45000, 
      clicks: 1250, 
      conversions: 18, 
      spend: 4500000, 
      revenue: 18000000,
      roi: 300,
      ctr: 2.78,
      conversionRate: 1.44
    },
    { 
      name: 'Instagram Stories - Teeth Whitening', 
      status: 'active', 
      impressions: 32000, 
      clicks: 980, 
      conversions: 12, 
      spend: 3600000, 
      revenue: 14400000,
      roi: 300,
      ctr: 3.06,
      conversionRate: 1.22
    },
    { 
      name: 'Google Ads - Root Canal', 
      status: 'completed', 
      impressions: 28000, 
      clicks: 750, 
      conversions: 8, 
      spend: 3200000, 
      revenue: 12000000,
      roi: 275,
      ctr: 2.68,
      conversionRate: 1.07
    }
  ];

  const recallProgram = [
    { month: 'Jan', sent: 120, responded: 82, booked: 65, attended: 58, successRate: 70.7 },
    { month: 'Feb', sent: 135, responded: 95, booked: 75, attended: 68, successRate: 71.6 },
    { month: 'Mar', sent: 142, responded: 98, booked: 78, attended: 72, successRate: 73.5 },
    { month: 'Apr', sent: 150, responded: 105, booked: 85, attended: 78, successRate: 74.3 }
  ];

  const socialMediaMetrics = [
    { platform: 'Instagram', followers: 2450, engagement: 4.2, posts: 24, reach: 15600, likes: 1840 },
    { platform: 'Facebook', followers: 1820, engagement: 2.8, posts: 18, reach: 8900, likes: 980 },
    { platform: 'TikTok', followers: 1250, engagement: 6.5, posts: 15, reach: 12400, likes: 2100 }
  ];

  const referralSources = [
    { patient: 'Ahmad Yani', referred: 3, status: 'active', totalRevenue: 4500000, lastReferral: '2024-01-14' },
    { patient: 'Siti Nurhaliza', referred: 2, status: 'active', totalRevenue: 3200000, lastReferral: '2024-01-12' },
    { patient: 'Budi Santoso', referred: 2, status: 'active', totalRevenue: 2800000, lastReferral: '2024-01-10' },
    { patient: 'Linda Wijaya', referred: 1, status: 'active', totalRevenue: 1500000, lastReferral: '2024-01-08' }
  ];

  const contentPerformance = [
    { title: 'Tips Menjaga Kesehatan Gigi', type: 'Blog', views: 1250, shares: 45, leads: 8 },
    { title: 'Proses Scaling & Polishing', type: 'Video', views: 2800, shares: 120, leads: 15 },
    { title: 'Before/After Teeth Whitening', type: 'Instagram Post', views: 3400, shares: 180, leads: 22 },
    { title: 'FAQ Root Canal Treatment', type: 'Blog', views: 980, shares: 32, leads: 6 }
  ];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'paused': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Marketing KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <AppIcon name="UserPlus" size={20} className="text-green-600" />
            <div className="flex items-center gap-1">
              <AppIcon name="TrendingUp" size={14} className="text-green-600" />
              <span className="text-xs text-green-600">+{marketingKPI.growthRate}%</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-green-900 dark:text-green-300">{marketingKPI.newPatients}</div>
            <h3 className="text-sm font-medium text-green-800 dark:text-green-400">
              {t('clinic.reports.marketing.newPatients') || 'Pasien Baru'}
            </h3>
            <p className="text-xs text-green-600">Bulan ini</p>
          </div>
        </div>

        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <AppIcon name="RotateCcw" size={20} className="text-blue-600" />
            <AppIcon name="TrendingUp" size={14} className="text-blue-600" />
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-300">{marketingKPI.recallSuccess}%</div>
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-400">
              {t('clinic.reports.marketing.recallSuccess') || 'Recall Success'}
            </h3>
            <p className="text-xs text-blue-600">Tingkat keberhasilan</p>
          </div>
        </div>

        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <AppIcon name="Users" size={20} className="text-purple-600" />
            <AppIcon name="TrendingUp" size={14} className="text-purple-600" />
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-300">{marketingKPI.referralRate}%</div>
            <h3 className="text-sm font-medium text-purple-800 dark:text-purple-400">
              {t('clinic.reports.marketing.referralRate') || 'Referral Rate'}
            </h3>
            <p className="text-xs text-purple-600">dari total pasien</p>
          </div>
        </div>

        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <AppIcon name="TrendingUp" size={20} className="text-orange-600" />
            <AppIcon name="ArrowUp" size={14} className="text-orange-600" />
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-orange-900 dark:text-orange-300">{marketingKPI.campaignROI}%</div>
            <h3 className="text-sm font-medium text-orange-800 dark:text-orange-400">
              {t('clinic.reports.marketing.campaignROI') || 'Campaign ROI'}
            </h3>
            <p className="text-xs text-orange-600">Rata-rata</p>
          </div>
        </div>

        <div className="p-4 bg-pink-50 dark:bg-pink-900/20 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <AppIcon name="Target" size={20} className="text-pink-600" />
            <span className="text-xs font-semibold text-pink-600">ACTIVE</span>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-pink-900 dark:text-pink-300">
              {campaignPerformance.filter(c => c.status === 'active').length}
            </div>
            <h3 className="text-sm font-medium text-pink-800 dark:text-pink-400">
              {t('clinic.reports.marketing.activeCampaigns') || 'Campaign Aktif'}
            </h3>
          </div>
        </div>
      </div>

      {/* Patient Acquisition Sources */}
      <div className="bg-surface-elevated rounded-xl border border-primary/20 overflow-hidden">
        <div className="px-6 py-4 border-b border-primary/20">
          <h3 className="text-lg font-semibold text-primary">
            {t('clinic.reports.marketing.acquisitionSources') || 'Sumber Akuisisi Pasien'}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Sumber</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Pasien Baru</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Persentase</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Biaya</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">CPA</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10">
              {patientAcquisition.map((source, idx) => (
                <tr key={idx} className="hover:bg-surface transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-primary">{source.source}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-accent">{source.patients}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-primary">{source.percentage}%</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-primary">{source.cost > 0 ? formatCurrency(source.cost) : '-'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-primary">{source.cpa > 0 ? formatCurrency(source.cpa) : 'Gratis'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-full max-w-[120px] bg-surface rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-accent h-full transition-all"
                        style={{ width: `${source.percentage}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Campaign Performance */}
      <div className="bg-surface-elevated rounded-xl border border-primary/20 overflow-hidden">
        <div className="px-6 py-4 border-b border-primary/20">
          <h3 className="text-lg font-semibold text-primary">
            {t('clinic.reports.marketing.campaignPerformance') || 'Performa Campaign'}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Campaign</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Impressions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Clicks (CTR)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Conversions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Spend</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10">
              {campaignPerformance.map((campaign, idx) => (
                <tr key={idx} className="hover:bg-surface transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-primary">{campaign.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(campaign.status)}`}>
                      {campaign.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-primary">{campaign.impressions.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-primary">{campaign.clicks.toLocaleString()}</div>
                      <div className="text-xs text-secondary">{campaign.ctr}%</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-semibold text-accent">{campaign.conversions}</div>
                      <div className="text-xs text-secondary">{campaign.conversionRate}%</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-red-600 dark:text-red-400">{formatCurrency(campaign.spend)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">{formatCurrency(campaign.revenue)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-bold text-accent">{campaign.roi}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recall Program & Social Media */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recall Program Performance */}
        <div className="bg-surface-elevated rounded-xl border border-primary/20 overflow-hidden">
          <div className="px-6 py-4 border-b border-primary/20">
            <h3 className="text-lg font-semibold text-primary">
              {t('clinic.reports.marketing.recallProgram') || 'Program Recall'}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">Bulan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">Sent</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">Booked</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">Attended</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">Success %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/10">
                {recallProgram.map((data, idx) => (
                  <tr key={idx} className="hover:bg-surface transition-colors">
                    <td className="px-4 py-3 font-medium text-primary">{data.month}</td>
                    <td className="px-4 py-3 text-primary">{data.sent}</td>
                    <td className="px-4 py-3 text-blue-600">{data.booked}</td>
                    <td className="px-4 py-3 font-semibold text-green-600">{data.attended}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-surface rounded-full h-2 overflow-hidden max-w-[60px]">
                          <div
                            className="bg-green-600 h-full transition-all"
                            style={{ width: `${data.successRate}%` }}
                          />
                        </div>
                        <span className="font-medium text-primary">{data.successRate.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Social Media Metrics */}
        <div className="bg-surface-elevated rounded-xl border border-primary/20 overflow-hidden">
          <div className="px-6 py-4 border-b border-primary/20">
            <h3 className="text-lg font-semibold text-primary">
              {t('clinic.reports.marketing.socialMedia') || 'Social Media Metrics'}
            </h3>
          </div>
          <div className="p-6 space-y-4">
            {socialMediaMetrics.map((social, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      social.platform === 'Instagram' ? 'bg-pink-100 dark:bg-pink-900/20' :
                      social.platform === 'Facebook' ? 'bg-blue-100 dark:bg-blue-900/20' :
                      'bg-gray-100 dark:bg-gray-900/20'
                    }`}>
                      <AppIcon name="Share2" size={18} className={
                        social.platform === 'Instagram' ? 'text-pink-600' :
                        social.platform === 'Facebook' ? 'text-blue-600' :
                        'text-gray-600'
                      } />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-primary">{social.platform}</div>
                      <div className="text-xs text-secondary">{social.followers.toLocaleString()} followers</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-accent">{social.engagement}%</div>
                    <div className="text-xs text-secondary">engagement</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-surface rounded p-2 text-center">
                    <div className="text-secondary">Posts</div>
                    <div className="font-semibold text-primary">{social.posts}</div>
                  </div>
                  <div className="bg-surface rounded p-2 text-center">
                    <div className="text-secondary">Reach</div>
                    <div className="font-semibold text-primary">{social.reach.toLocaleString()}</div>
                  </div>
                  <div className="bg-surface rounded p-2 text-center">
                    <div className="text-secondary">Likes</div>
                    <div className="font-semibold text-primary">{social.likes.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Referral Sources & Content Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Referral Sources */}
        <div className="bg-surface-elevated rounded-xl border border-primary/20 overflow-hidden">
          <div className="px-6 py-4 border-b border-primary/20">
            <h3 className="text-lg font-semibold text-primary">
              {t('clinic.reports.marketing.topReferrers') || 'Top Referrers'}
            </h3>
          </div>
          <div className="divide-y divide-primary/10">
            {referralSources.map((referrer, idx) => (
              <div key={idx} className="px-6 py-4 hover:bg-surface transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-accent">{idx + 1}</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-primary">{referrer.patient}</div>
                      <div className="text-xs text-secondary">Last: {referrer.lastReferral}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-accent">{referrer.referred}</div>
                    <div className="text-xs text-secondary">referrals</div>
                  </div>
                </div>
                <div className="text-xs text-secondary">
                  Total Revenue: <span className="font-semibold text-green-600">{formatCurrency(referrer.totalRevenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Content Performance */}
        <div className="bg-surface-elevated rounded-xl border border-primary/20 overflow-hidden">
          <div className="px-6 py-4 border-b border-primary/20">
            <h3 className="text-lg font-semibold text-primary">
              {t('clinic.reports.marketing.contentPerformance') || 'Performa Konten'}
            </h3>
          </div>
          <div className="divide-y divide-primary/10">
            {contentPerformance.map((content, idx) => (
              <div key={idx} className="px-6 py-4 hover:bg-surface transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-primary mb-1">{content.title}</div>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      content.type === 'Blog' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                      content.type === 'Video' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                      'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
                    }`}>
                      {content.type}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-secondary">Views</div>
                    <div className="font-semibold text-primary">{content.views.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-secondary">Shares</div>
                    <div className="font-semibold text-primary">{content.shares}</div>
                  </div>
                  <div>
                    <div className="text-secondary">Leads</div>
                    <div className="font-semibold text-accent">{content.leads}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketingView;
