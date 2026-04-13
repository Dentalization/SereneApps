import React, { useCallback, useMemo, useState } from 'react';
import AppIcon from '../../../../components/AppIcon';

const PANEL_BG = '#0f172a';

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) {
    return value.length ? value.join(' × ') : '—';
  }
  return String(value);
}

function buildSections(metadata) {
  if (!metadata) {
    return [
      {
        title: 'Patient',
        rows: [
          ['Patient Name', null],
          ['Patient ID', null],
          ['Birth Date', null],
          ['Sex', null],
        ],
      },
      {
        title: 'Study',
        rows: [
          ['Study Date', null],
          ['Description', null],
          ['Institution', null],
        ],
      },
      {
        title: 'Acquisition',
        rows: [
          ['Manufacturer', null],
          ['Model', null],
          ['Software', null],
          ['KVP', null],
          ['Exposure', null],
          ['Exposure Time', null],
          ['Focal Spots', null],
          ['Field of View', null],
        ],
      },
      {
        title: 'Volume',
        rows: [
          ['Slices', null],
          ['Dimensions', null],
          ['Pixel Spacing', null],
          ['Slice Thickness', null],
          ['Voxel Size', null],
          ['Window Center', null],
          ['Window Width', null],
        ],
      },
    ];
  }

  return [
    {
      title: 'Patient',
      rows: [
        ['Patient Name', metadata.PatientName],
        ['Patient ID', metadata.PatientID],
        ['Birth Date', metadata.PatientBirthDate],
        ['Sex', metadata.PatientSex],
      ],
    },
    {
      title: 'Study',
      rows: [
        ['Study Date', metadata.StudyDate],
        ['Description', metadata.StudyDescription],
        ['Institution', metadata.InstitutionName],
      ],
    },
    {
      title: 'Acquisition',
      rows: [
        ['Manufacturer', metadata.Manufacturer],
        ['Model', metadata.ManufacturerModelName],
        ['Software', metadata.SoftwareVersions],
        ['KVP', metadata.KVP],
        ['Exposure', metadata.Exposure],
        ['Exposure Time', metadata.ExposureTime],
        ['Focal Spots', metadata.FocalSpots],
        ['Field of View', metadata.FieldOfViewDimensions],
      ],
    },
    {
      title: 'Volume',
      rows: [
        ['Slices', metadata.num_slices],
        ['Dimensions', metadata.dimensions],
        ['Pixel Spacing', metadata.pixel_spacing != null ? `${metadata.pixel_spacing} mm` : null],
        ['Slice Thickness', metadata.slice_thickness != null ? `${metadata.slice_thickness} mm` : null],
        ['Voxel Size', metadata.voxel_size != null ? `${formatValue(metadata.voxel_size)} mm` : null],
        ['Window Center', metadata.window_center],
        ['Window Width', metadata.window_width],
      ],
    },
  ];
}

function buildCopyText(sections) {
  return sections
    .map((section) => {
      const body = section.rows
        .map(([label, value]) => `${label}: ${formatValue(value)}`)
        .join('\n');
      return `${section.title}\n${body}`;
    })
    .join('\n\n');
}

const MetadataPanel = ({ visible, onClose, metadata, loading, error, title = 'DICOM Info' }) => {
  const [copied, setCopied] = useState(false);

  const sections = useMemo(() => buildSections(metadata), [metadata]);
  const copyText = useMemo(() => buildCopyText(sections), [sections]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('[MetadataPanel] Copy failed:', err);
    }
  }, [copyText]);

  if (!visible) return null;

  return (
    <div
      className="absolute right-0 top-0 bottom-0 z-30 flex w-[280px] flex-col border-l border-slate-700/50 shadow-2xl"
      style={{ backgroundColor: PANEL_BG }}
    >
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <AppIcon name="Info" size={16} className="text-cyan-400" />
          <span className="text-sm font-semibold uppercase tracking-wider text-white">{title}</span>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
        >
          <AppIcon name="X" size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading && (
          <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs text-slate-400">
            <AppIcon name="Loader2" size={14} className="animate-spin text-cyan-400" />
            Loading metadata...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-500/20 bg-red-950/40 px-3 py-3 text-xs text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-5">
            {sections.map((section) => (
              <section key={section.title}>
                <div className="mb-2 flex items-center gap-2">
                  <div className="h-px flex-1 bg-slate-800" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">
                    {section.title}
                  </span>
                  <div className="h-px flex-1 bg-slate-800" />
                </div>
                <div className="space-y-2">
                  {section.rows.map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-slate-800/80 bg-slate-900/50 px-3 py-2">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
                      <div className="mt-1 font-mono text-[13px] text-white">{formatValue(value)}</div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-slate-800 px-4 py-3">
        <button
          onClick={handleCopy}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-white transition hover:bg-slate-700"
        >
          <AppIcon name={copied ? 'Check' : 'Copy'} size={14} className={copied ? 'text-cyan-400' : ''} />
          <span>{copied ? 'Copied' : 'Copy Metadata'}</span>
        </button>
      </div>
    </div>
  );
};

export default MetadataPanel;
