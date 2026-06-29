import React from 'react';
import AppIcon from '../../../../components/AppIcon';

const num = value => new Intl.NumberFormat('id-ID').format(Number(value) || 0);
const money = value => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0
}).format(Number(value) || 0);
const pct = value => (value == null ? '—' : `${Number(value).toFixed(1)}%`);

const MetricCard = ({ label, value, detail, icon, iconClass = 'text-accent' }) => (
  <div className="space-y-3 rounded-2xl border border-primary/15 bg-surface-elevated p-5">
    <div className="flex items-start justify-between">
      <p className="text-xs uppercase tracking-wider text-secondary">{label}</p>
      <AppIcon name={icon} size={18} className={iconClass} />
    </div>
    <p className="text-2xl font-bold text-primary">{value}</p>
    {detail && <p className="text-xs text-secondary">{detail}</p>}
  </div>
);

const SourceNotice = ({ availability }) => {
  const missingSources = availability?.missingSources || [];
  const notes = availability?.notes || [];
  if (!missingSources.length && !notes.length) return null;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
      <AppIcon name="Info" size={17} className="mt-0.5 flex-shrink-0 text-amber-600" />
      <div>
        <p className="text-sm font-medium text-amber-700">Sebagian sumber data marketing belum tersedia</p>
        {missingSources.length > 0 && (
          <p className="mt-0.5 text-xs text-amber-700/80">Belum aktif: {missingSources.join(', ')}</p>
        )}
        {notes.slice(0, 2).map(note => (
          <p key={note} className="mt-0.5 text-xs text-secondary">{note}</p>
        ))}
      </div>
    </div>
  );
};

const ReferralBar = ({ source, count, percentage, maxPct }) => {
  const barWidth = maxPct > 0 ? Math.min(Math.max((Number(percentage) || 0) / maxPct * 100, 0), 100) : 0;
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="w-32 flex-shrink-0 truncate text-sm text-primary">{source || '—'}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
        <div
          className="h-full rounded-full bg-accent/70 transition-all duration-500"
          style={{ width: `${barWidth}%` }}
        />
      </div>
      <span className="w-10 flex-shrink-0 text-right text-xs font-medium text-primary">{num(count)}</span>
      <span className="w-12 flex-shrink-0 text-right text-xs text-secondary">{pct(percentage ?? 0)}</span>
    </div>
  );
};

const StarRow = ({ stars, count, maxCount }) => {
  const barWidth = maxCount > 0 ? Math.min(Math.max((Number(count) || 0) / maxCount * 100, 0), 100) : 0;
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="w-4 flex-shrink-0 text-right text-xs text-secondary">{stars}</span>
      <AppIcon name="Star" size={11} className="flex-shrink-0 text-amber-400" />
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
        <div
          className="h-full rounded-full bg-amber-400 transition-all duration-500"
          style={{ width: `${barWidth}%` }}
        />
      </div>
      <span className="w-6 flex-shrink-0 text-right text-xs text-secondary">{num(count)}</span>
    </div>
  );
};

export default function MarketingView({ report }) {
  const marketing = report?.marketing || {};
  const availability = report?.dataAvailability?.marketing || {};
  const reviewSummary = marketing.reviewSummary || {};
  const referralSources = Array.isArray(marketing.referralSources) ? marketing.referralSources : [];
  const reviewBreakdown = Array.isArray(reviewSummary.breakdown) ? reviewSummary.breakdown : [];
  const campaignPerformance = Array.isArray(marketing.campaignPerformance) ? marketing.campaignPerformance : [];

  const maxReferralPct = Math.max(...referralSources.map(source => Number(source.percentage) || 0), 1);
  const maxReviewCount = Math.max(...reviewBreakdown.map(row => Number(row.count) || 0), 1);
  const retentionRate = Number(marketing.retentionRate ?? 0) || 0;
  const retentionColor = retentionRate >= 80 ? 'text-emerald-600'
    : retentionRate >= 60 ? 'text-amber-600'
      : 'text-red-500';

  const campaignsWithCpl = campaignPerformance.map(campaign => {
    const reach = Number(campaign.reach) || 0;
    const conversions = Number(campaign.conversions) || 0;
    const cost = Number(campaign.cost) || 0;
    return {
      ...campaign,
      reach,
      conversions,
      cost,
      cpl: conversions > 0 ? Math.round(cost / conversions) : null,
      conversionRate: reach > 0 ? ((conversions / reach) * 100).toFixed(2) : '0.00',
    };
  });

  return (
    <div className="space-y-6">
      <SourceNotice availability={availability} />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Pasien baru"
          value={num(marketing.newPatients ?? 0)}
          detail={`${num(marketing.returningPatients ?? 0)} pasien kembali dalam periode ini`}
          icon="UserPlus"
          iconClass="text-accent"
        />
        <MetricCard
          label="Retensi pasien"
          value={<span className={retentionColor}>{pct(marketing.retentionRate ?? 0)}</span>}
          detail="Pasien lama yang kembali berobat"
          icon="Repeat2"
          iconClass={retentionColor}
        />
        <MetricCard
          label="Total ulasan"
          value={num(reviewSummary.totalReviews ?? 0)}
          detail={`Rating rata-rata ${reviewSummary.averageRating ?? '—'} / 5`}
          icon="Star"
          iconClass="text-amber-500"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-primary/15 bg-surface-elevated">
          <div className="border-b border-primary/10 p-5">
            <h2 className="font-semibold text-primary">Sumber Referral</h2>
            <p className="mt-0.5 text-sm text-secondary">Dari mana pasien baru mengetahui klinik.</p>
          </div>
          <div className="p-5">
            {referralSources.length > 0 ? (
              <div className="space-y-1">
                <div className="mb-2 flex items-center gap-3 border-b border-primary/10 pb-1">
                  <span className="w-32 flex-shrink-0 text-xs uppercase tracking-wider text-secondary">Sumber</span>
                  <span className="flex-1" />
                  <span className="w-10 flex-shrink-0 text-right text-xs uppercase tracking-wider text-secondary">Pasien</span>
                  <span className="w-12 flex-shrink-0 text-right text-xs uppercase tracking-wider text-secondary">Share</span>
                </div>
                {referralSources.map(source => (
                  <ReferralBar
                    key={source.source || `${source.count}-${source.percentage}`}
                    source={source.source}
                    count={source.count}
                    percentage={source.percentage}
                    maxPct={maxReferralPct}
                  />
                ))}
              </div>
            ) : (
              <div className="py-10 text-center">
                <AppIcon name="Link2Off" size={28} className="mx-auto text-secondary/40" />
                <p className="mt-2 text-sm text-secondary">Belum ada data referral.</p>
              </div>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-primary/15 bg-surface-elevated">
          <div className="border-b border-primary/10 p-5">
            <h2 className="font-semibold text-primary">Ulasan & Reputasi</h2>
            <p className="mt-0.5 text-sm text-secondary">Distribusi rating dari semua platform.</p>
          </div>
          <div className="space-y-4 p-5">
            <div className="flex items-end gap-3">
              <span className="text-5xl font-bold leading-none text-primary">
                {reviewSummary.averageRating ?? '—'}
              </span>
              <div className="pb-1">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(star => (
                    <AppIcon
                      key={star}
                      name="Star"
                      size={16}
                      className={star <= Math.round(Number(reviewSummary.averageRating) || 0)
                        ? 'text-amber-400'
                        : 'text-secondary/30'}
                    />
                  ))}
                </div>
                <p className="mt-1 text-xs text-secondary">{num(reviewSummary.totalReviews ?? 0)} ulasan</p>
              </div>
            </div>
            <div className="space-y-1">
              {[...reviewBreakdown].reverse().map(row => (
                <StarRow
                  key={row.stars}
                  stars={row.stars}
                  count={row.count}
                  maxCount={maxReviewCount}
                />
              ))}
            </div>
            {reviewBreakdown.length === 0 && (
              <p className="py-4 text-center text-sm text-secondary">Belum ada ulasan.</p>
            )}
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-primary/15 bg-surface-elevated">
        <div className="border-b border-primary/10 p-5">
          <h2 className="font-semibold text-primary">Performa Campaign</h2>
          <p className="mt-0.5 text-sm text-secondary">
            Reach, konversi, dan biaya per lead untuk campaign aktif dalam periode terpilih.
          </p>
        </div>
        {campaignsWithCpl.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface text-xs uppercase text-secondary">
                <tr>
                  {['Campaign', 'Reach', 'Konversi', 'Conv. Rate', 'Biaya', 'Cost/Lead'].map(heading => (
                    <th key={heading} className="whitespace-nowrap px-5 py-3 text-left">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/10">
                {campaignsWithCpl.map(campaign => (
                  <tr key={campaign.name || `${campaign.reach}-${campaign.cost}`} className="transition-colors hover:bg-surface/50">
                    <td className="px-5 py-4 font-medium text-primary">{campaign.name || 'Campaign tanpa nama'}</td>
                    <td className="px-5 py-4 text-secondary">{num(campaign.reach)}</td>
                    <td className="px-5 py-4">
                      <span className="font-medium text-primary">{num(campaign.conversions)}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        Number(campaign.conversionRate) >= 0.5
                          ? 'bg-emerald-500/10 text-emerald-700'
                          : 'bg-amber-500/10 text-amber-700'
                      }`}>
                        {campaign.conversionRate}%
                      </span>
                    </td>
                    <td className="px-5 py-4 text-secondary">{money(campaign.cost)}</td>
                    <td className="px-5 py-4 font-medium text-primary">
                      {campaign.cpl != null ? money(campaign.cpl) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 p-12 text-center">
            <AppIcon name="Megaphone" size={28} className="text-secondary/40" />
            <p className="text-sm text-secondary">Belum ada data campaign dalam periode ini.</p>
          </div>
        )}
      </section>
    </div>
  );
}
