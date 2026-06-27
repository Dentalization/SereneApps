import React from 'react';
import Icon from '../../../../components/AppIcon';

const PipelineCard = ({
  title = 'Unscheduled Treatment',
  items = [],
}) => {
  return (
    <div className="bg-surface rounded-3xl p-6 border border-primary/20 shadow-theme-lg hover:shadow-theme-xl transition-all duration-300 theme-transition">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 rounded-2xl bg-accent/10">
          <Icon name="ClipboardList" size={20} className="text-accent" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-primary">{title}</h3>
          <p className="text-xs text-muted">Top potensial berdasarkan nilai</p>
        </div>
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-lg border border-primary/10 bg-surface-elevated p-4 text-sm text-secondary">
            Belum ada rencana perawatan aktif.
          </div>
        ) : items.map((it, idx) => (
          <div key={idx} className="flex items-center justify-between bg-surface-elevated border border-primary/10 rounded-2xl p-3">
            <div>
              <div className="font-semibold text-primary">{it.patient}</div>
              <div className="text-xs text-secondary">{it.treatment}</div>
            </div>
            <div className="text-sm font-bold text-primary">Rp {Intl.NumberFormat('id-ID').format(it.value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PipelineCard;
