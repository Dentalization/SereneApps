import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AppIcon from '../../../../components/AppIcon';
import { buildImagingUrl, buildStudyAssetParams } from '../utils/imagingUrl';

const PANEL_BG = '#0f172a';
const GROUP_LABELS = {
  '0002': 'File Meta',
  '0008': 'Study / Series',
  '0010': 'Patient',
  '0018': 'Acquisition',
  '0020': 'Image Geometry',
  '0028': 'Image Presentation',
  '0032': 'Study Management',
  '0040': 'Procedure / Report',
  '0054': 'Nuclear Medicine',
  '0062': 'Segmentation',
  '0070': 'Graphic Annotation',
  '300A': 'Radiotherapy Plan',
};

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

function parseTagGroup(tag) {
  const match = String(tag || '').match(/^\(([0-9A-Fa-f]{4}),\s*([0-9A-Fa-f]{4})\)$/);
  return match ? match[1].toUpperCase() : 'UNKN';
}

function isPrivateTag(tag) {
  const group = parseTagGroup(tag);
  if (group === 'UNKN') return false;
  return Number.parseInt(group, 16) % 2 === 1;
}

function groupLabel(group) {
  if (group === 'UNKN') return 'Unknown Group';
  return `${group} — ${GROUP_LABELS[group] || (Number.parseInt(group, 16) % 2 === 1 ? 'Private Group' : 'DICOM Group')}`;
}

function buildRawTagsCopyText(tags) {
  return tags
    .map((item) => `${item.tag} [${item.vr || '—'}] ${item.keyword || '(no keyword)'}: ${formatValue(item.value)}`)
    .join('\n');
}

const MetadataPanel = ({
  visible,
  onClose,
  metadata,
  loading,
  error,
  title = 'DICOM Info',
  study = null,
  studyKey: explicitStudyKey = '',
  seriesUid: explicitSeriesUid = '',
}) => {
  const [copiedAction, setCopiedAction] = useState(null);
  const [activeTab, setActiveTab] = useState('clinical');
  const [rawSearch, setRawSearch] = useState('');
  const [rawTags, setRawTags] = useState([]);
  const [rawTagsTotal, setRawTagsTotal] = useState(null);
  const [rawTagsLoading, setRawTagsLoading] = useState(false);
  const [rawTagsError, setRawTagsError] = useState(null);
  const [rawTagsLoaded, setRawTagsLoaded] = useState(false);

  const sections = useMemo(() => buildSections(metadata), [metadata]);
  const copyText = useMemo(() => buildCopyText(sections), [sections]);
  const studyKey = explicitStudyKey || study?.folderName || study?.id || '';
  const seriesUid = explicitSeriesUid || study?.selectedSeriesUid || '';
  const rawTagsCacheKey = `${studyKey}__${seriesUid}`;

  useEffect(() => {
    setRawTags([]);
    setRawTagsTotal(null);
    setRawTagsLoading(false);
    setRawTagsError(null);
    setRawTagsLoaded(false);
    setRawSearch('');
  }, [rawTagsCacheKey]);

  useEffect(() => {
    if (!visible || activeTab !== 'raw' || rawTagsLoaded || rawTagsLoading || !studyKey) return undefined;

    let cancelled = false;
    const fetchRawTags = async () => {
      setRawTagsLoading(true);
      setRawTagsError(null);

      try {
        const url = buildImagingUrl(
          `/tags/${studyKey}`,
          buildStudyAssetParams(study, { series_uid: seriesUid || undefined })
        );
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to load raw tags (${response.status})`);
        }
        const payload = await response.json();
        if (cancelled) return;
        setRawTags(Array.isArray(payload.tags) ? payload.tags : []);
        setRawTagsTotal(Number.isFinite(payload.total_tags) ? payload.total_tags : (payload.tags?.length || 0));
        setRawTagsLoaded(true);
      } catch (fetchError) {
        if (!cancelled) {
          setRawTagsError(fetchError.message || String(fetchError));
        }
      } finally {
        if (!cancelled) {
          setRawTagsLoading(false);
        }
      }
    };

    fetchRawTags();
    return () => {
      cancelled = true;
    };
  }, [activeTab, rawTagsLoaded, rawTagsLoading, seriesUid, study, studyKey, visible]);

  const filteredRawTags = useMemo(() => {
    const query = rawSearch.trim().toLowerCase();
    if (!query) return rawTags;

    return rawTags.filter((item) => (
      String(item.tag || '').toLowerCase().includes(query)
      || String(item.keyword || '').toLowerCase().includes(query)
    ));
  }, [rawSearch, rawTags]);

  const groupedRawRows = useMemo(() => {
    const rows = [];
    let currentGroup = null;

    filteredRawTags.forEach((item) => {
      const group = parseTagGroup(item.tag);
      if (group !== currentGroup) {
        currentGroup = group;
        rows.push({ type: 'group', id: group, label: groupLabel(group) });
      }
      rows.push({ type: 'tag', id: `${item.tag}-${item.keyword}-${rows.length}`, item });
    });

    return rows;
  }, [filteredRawTags]);

  const rawCopyText = useMemo(() => buildRawTagsCopyText(rawTags), [rawTags]);

  const handleCopy = useCallback(async (kind) => {
    const text = kind === 'raw' ? rawCopyText : copyText;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAction(kind);
      window.setTimeout(() => setCopiedAction(null), 1500);
    } catch (err) {
      console.error('[MetadataPanel] Copy failed:', err);
    }
  }, [copyText, rawCopyText]);

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

      <div className="flex border-b border-slate-800 px-3 py-2">
        <button
          onClick={() => setActiveTab('clinical')}
          className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
            activeTab === 'clinical'
              ? 'bg-cyan-500/15 text-cyan-300'
              : 'text-slate-500 hover:bg-slate-800/70 hover:text-slate-300'
          }`}
        >
          Clinical
        </button>
        <button
          onClick={() => setActiveTab('raw')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
            activeTab === 'raw'
              ? 'bg-cyan-500/15 text-cyan-300'
              : 'text-slate-500 hover:bg-slate-800/70 hover:text-slate-300'
          }`}
        >
          <span>Raw Tags</span>
          <span className="rounded-full bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
            {rawTagsLoading ? '...' : (rawTagsTotal ?? '—')}
          </span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {activeTab === 'clinical' && loading && (
          <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs text-slate-400">
            <AppIcon name="Loader2" size={14} className="animate-spin text-cyan-400" />
            Loading metadata...
          </div>
        )}

        {activeTab === 'clinical' && !loading && error && (
          <div className="rounded-xl border border-red-500/20 bg-red-950/40 px-3 py-3 text-xs text-red-300">
            {error}
          </div>
        )}

        {activeTab === 'clinical' && !loading && !error && (
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

        {activeTab === 'raw' && (
          <div className="space-y-3">
            <div className="relative">
              <AppIcon name="Search" size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={rawSearch}
                onChange={(event) => setRawSearch(event.target.value)}
                placeholder="Search tag or keyword"
                className="w-full rounded-xl border border-slate-800 bg-slate-950/70 py-2 pl-9 pr-3 font-mono text-xs text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500/50"
              />
            </div>

            {rawTagsLoading && (
              <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs text-slate-400">
                <AppIcon name="Loader2" size={14} className="animate-spin text-cyan-400" />
                Loading raw tags...
              </div>
            )}

            {!rawTagsLoading && rawTagsError && (
              <div className="rounded-xl border border-red-500/20 bg-red-950/40 px-3 py-3 text-xs text-red-300">
                {rawTagsError}
              </div>
            )}

            {!rawTagsLoading && !rawTagsError && rawTagsLoaded && filteredRawTags.length === 0 && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-3 text-xs text-slate-500">
                No tags match this search.
              </div>
            )}

            {!rawTagsLoading && !rawTagsError && (
              <div className="space-y-2">
                {groupedRawRows.map((row) => {
                  if (row.type === 'group') {
                    return (
                      <div key={`group-${row.id}`} className="sticky top-0 z-10 border-y border-slate-800 bg-slate-950/95 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                        {row.label}
                      </div>
                    );
                  }

                  const item = row.item;
                  const privateTag = isPrivateTag(item.tag);
                  return (
                    <div
                      key={row.id}
                      className={`rounded-lg border border-slate-800/80 bg-slate-900/50 px-3 py-2 text-xs ${privateTag ? 'border-l-2 border-l-amber-400/70' : 'border-l-2 border-l-slate-800'}`}
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <span className="font-mono text-[11px] text-cyan-300">{item.tag}</span>
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                          {item.vr || '—'}
                        </span>
                      </div>
                      <div className="font-semibold text-white">{item.keyword || '(private/no keyword)'}</div>
                      <div className="mt-1 break-words font-mono text-[11px] leading-relaxed text-slate-400">
                        {formatValue(item.value)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-slate-800 px-4 py-3">
        <button
          onClick={() => handleCopy(activeTab === 'raw' ? 'raw' : 'clinical')}
          disabled={activeTab === 'raw' && (rawTagsLoading || rawTags.length === 0)}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-white transition hover:bg-slate-700"
        >
          <AppIcon
            name={copiedAction === (activeTab === 'raw' ? 'raw' : 'clinical') ? 'Check' : 'Copy'}
            size={14}
            className={copiedAction === (activeTab === 'raw' ? 'raw' : 'clinical') ? 'text-cyan-400' : ''}
          />
          <span>
            {copiedAction === (activeTab === 'raw' ? 'raw' : 'clinical')
              ? 'Copied'
              : activeTab === 'raw' ? 'Copy All Tags' : 'Copy Metadata'}
          </span>
        </button>
      </div>
    </div>
  );
};

export default MetadataPanel;
