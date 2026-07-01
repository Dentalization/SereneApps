import React, { useMemo } from 'react';
import { PERMANENT_TEETH_ROWS } from '../../patient-emr/odontogramConfig';

const RELEVANT_MARKS = new Set(['CARIES', 'NVT', 'RCT', 'CFR', 'RRX', 'MIS']);

const EndoOdontogramPicker = ({ value, onChange, odontogramMarks = [], disabled = false }) => {
  const marksByTooth = useMemo(() => {
    const result = new Map();
    odontogramMarks.forEach((mark) => {
      const tooth = String(mark?.pos || '').split('-')[0];
      if (!tooth || !RELEVANT_MARKS.has(mark?.code)) return;
      if (!result.has(tooth)) result.set(tooth, []);
      result.get(tooth).push(mark);
    });
    return result;
  }, [odontogramMarks]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-primary">Pilih gigi (FDI)</p>
        <span className="text-xs text-muted">Permanent dentition</span>
      </div>
      <div className="space-y-2 rounded-2xl border border-primary/10 bg-surface-elevated p-4">
        {PERMANENT_TEETH_ROWS.map((row, rowIndex) => (
          <div
            key={row.join('-')}
            className={`grid grid-cols-8 gap-1.5 ${rowIndex === 1 ? 'mb-3' : ''}`}
          >
            {row.map((tooth) => {
              const toothValue = String(tooth);
              const marks = marksByTooth.get(toothValue) || [];
              const selected = toothValue === value;
              return (
                <button
                  key={toothValue}
                  type="button"
                  disabled={disabled}
                  aria-pressed={selected}
                  onClick={() => onChange?.({
                    toothNumber: toothValue,
                    odontogramPosition: marks[0]?.pos || null,
                    odontogramCodeAtCreation: marks[0]?.code || null,
                  })}
                  className={`min-h-14 rounded-xl border px-1 py-2 text-center transition ${
                    selected
                      ? 'border-accent bg-accent text-white'
                      : 'border-primary/10 bg-surface text-primary hover:border-accent/40'
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <span className="block text-sm font-bold">{toothValue}</span>
                  {marks.length > 0 && (
                    <span className={`mt-1 block truncate text-[9px] font-semibold ${
                      selected ? 'text-white/80' : 'text-secondary'
                    }`}>
                      {marks.map((mark) => mark.code).join(', ')}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <p className="text-xs text-secondary">
        Snapshot kode odontogram hanya dibaca sebagai konteks. Endo-Core tidak mengubah odontogram EMR.
      </p>
    </div>
  );
};

export default EndoOdontogramPicker;
