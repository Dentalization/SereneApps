import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { geoMercator, geoPath } from 'd3';
import AppIcon from './AppIcon';
import indonesiaProvinces from '../data/indonesia-provinces.json';
import sampleClinics from '../data/sampleClinics';

const DEFAULT_CENTER = [120, -2];

const statusColors = {
  verified: '#16a34a',
  pending: '#f59e0b',
  rejected: '#ef4444'
};

const statusLabels = {
  all: 'All Clinics',
  verified: 'Verified',
  pending: 'Pending Review',
  rejected: 'Rejected'
};

const statusFilters = [
  { key: 'all', label: 'All Clinics', icon: 'Globe', color: '#2563eb' },
  { key: 'verified', label: 'Verified', icon: 'ShieldCheck', color: statusColors.verified },
  { key: 'pending', label: 'Pending', icon: 'Clock', color: statusColors.pending },
  { key: 'rejected', label: 'Rejected', icon: 'AlertTriangle', color: statusColors.rejected }
];

const formatNumber = (value = 0) => new Intl.NumberFormat('id-ID').format(value);

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const ClinicMap = ({ clinics = [], height = 520, onClinicSelect }) => {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 960, height });
  const [zoom, setZoom] = useState(1.05);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [hoveredClinic, setHoveredClinic] = useState(null);
  const [hoveredProvince, setHoveredProvince] = useState(null);
  const [activeStatus, setActiveStatus] = useState('all');

  const dataSource = clinics.length > 0 ? clinics : sampleClinics;

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    if (typeof window !== 'undefined' && 'ResizeObserver' in window) {
      const observer = new window.ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          setDimensions({
            width: entry.contentRect.width,
            height
          });
        }
      });

      observer.observe(element);
      return () => observer.disconnect();
    }

    setDimensions((prev) => ({
      ...prev,
      width: element.offsetWidth || prev.width,
      height
    }));
  }, [height]);

  const filteredClinics = useMemo(() => {
    if (activeStatus === 'all') {
      return dataSource;
    }
    return dataSource.filter((clinic) => clinic.status === activeStatus);
  }, [activeStatus, dataSource]);

  const breakdown = useMemo(() => {
    return dataSource.reduce(
      (acc, clinic) => {
        if (clinic.status && acc[clinic.status] !== undefined) {
          acc[clinic.status] += 1;
        }
        return acc;
      },
      { verified: 0, pending: 0, rejected: 0 }
    );
  }, [dataSource]);

  const visibleTopCities = useMemo(() => {
    const grouping = filteredClinics.reduce((acc, clinic) => {
      const key = clinic.city || clinic.province || clinic.name;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(grouping)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [filteredClinics]);

  const coverageProvinces = useMemo(() => {
    const provinces = new Set();
    dataSource.forEach((clinic) => {
      if (clinic.province) {
        provinces.add(clinic.province);
      }
    });
    return provinces.size;
  }, [dataSource]);

  const width = Math.max(dimensions.width, 640);
  const svgHeight = height;

  const projection = useMemo(
    () =>
      geoMercator()
        .center(mapCenter)
        .scale((width * 1.15) * zoom)
        .translate([width / 2, svgHeight / 2.3]),
    [width, svgHeight, zoom, mapCenter]
  );

  const pathGenerator = useMemo(() => geoPath(projection), [projection]);

  const mapFeatures = useMemo(() => indonesiaProvinces?.features || [], []);

  const projectPoint = useCallback(
    (clinic) => {
      if (typeof clinic.lng !== 'number' || typeof clinic.lat !== 'number') {
        return null;
      }
      return projection([clinic.lng, clinic.lat]);
    },
    [projection]
  );

  const handleSelectClinic = (clinic) => {
    setSelectedClinic(clinic);
    onClinicSelect?.(clinic);
  };

  const handleZoomChange = (delta) => {
    setZoom((current) => {
      const next = current + delta;
      return Math.min(2.4, Math.max(0.7, next));
    });
  };

  const handleFocusOnSelected = () => {
    if (!selectedClinic || typeof selectedClinic.lng !== 'number' || typeof selectedClinic.lat !== 'number') {
      return;
    }
    setMapCenter([selectedClinic.lng, selectedClinic.lat]);
    setZoom((value) => (value < 1.4 ? 1.4 : value));
  };

  const handleResetView = () => {
    setMapCenter(DEFAULT_CENTER);
    setZoom(1.05);
  };

  const visibleClinicCount = filteredClinics.length;

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: `${height}px` }}>
      <div className="relative h-full w-full overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-slate-900/5 via-blue-900/5 to-cyan-900/10 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
        <svg width={width} height={svgHeight} viewBox={`0 0 ${width} ${svgHeight}`} className="absolute inset-0 h-full w-full">
          <defs>
            <radialGradient id="map-glow" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="rgba(59,130,246,0.35)" />
              <stop offset="100%" stopColor="rgba(15,23,42,0)" />
            </radialGradient>
            <linearGradient id="province-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(148,163,184,0.25)" />
              <stop offset="100%" stopColor="rgba(148,163,184,0.05)" />
            </linearGradient>
          </defs>

          <rect width={width} height={svgHeight} fill="url(#map-glow)" />

          <g>
            {mapFeatures.map((feature) => {
              const provinceName = feature.properties?.Propinsi;
              const isActive = hoveredProvince?.properties?.Propinsi === provinceName;

              return (
                <path
                  key={provinceName || feature.properties?.ID}
                  d={pathGenerator(feature)}
                  fill={isActive ? 'rgba(59,130,246,0.25)' : 'url(#province-fill)'}
                  stroke={isActive ? 'rgba(59,130,246,0.9)' : 'rgba(148,163,184,0.3)'}
                  strokeWidth={isActive ? 1.5 : 0.5}
                  onMouseEnter={() => setHoveredProvince(feature)}
                  onMouseLeave={() => setHoveredProvince(null)}
                />
              );
            })}
          </g>

          {filteredClinics.map((clinic) => {
            const coords = projectPoint(clinic);
            if (!coords) {
              return null;
            }
            const [x, y] = coords;
            const isSelected = selectedClinic?.id === clinic.id;
            const isHovered = hoveredClinic?.id === clinic.id;
            const color = statusColors[clinic.status] || '#0ea5e9';

            return (
              <g
                key={clinic.id}
                transform={`translate(${x}, ${y})`}
                className="cursor-pointer transition duration-200"
                onMouseEnter={() => setHoveredClinic(clinic)}
                onMouseLeave={() => setHoveredClinic(null)}
                onClick={() => handleSelectClinic(clinic)}
              >
                {isSelected && <circle r={14} fill={color} opacity="0.18" className="animate-ping" />}
                <circle
                  r={isHovered || isSelected ? 6 : 4}
                  fill={color}
                  stroke="white"
                  strokeWidth={1.5}
                  className="drop-shadow-[0_0_6px_rgba(15,23,42,0.45)]"
                />
                {(isHovered || isSelected) && (
                  <text
                    y={-12}
                    textAnchor="middle"
                    className="text-[10px] font-medium fill-white drop-shadow"
                  >
                    {clinic.city || clinic.name}
                  </text>
                )}
                <title>{`${clinic.name} — ${statusLabels[clinic.status] || clinic.status}`}</title>
              </g>
            );
          })}
        </svg>

        {visibleClinicCount === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-xl border border-dashed border-border/40 bg-white/70 px-4 py-2 text-sm text-muted-foreground dark:bg-slate-900/60">
              No clinics match the current filter.
            </div>
          </div>
        )}

        <div className="absolute top-4 left-4 w-full max-w-xl space-y-3 rounded-2xl border border-border/50 bg-surface/90 p-4 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Filter by status</p>
              <p className="text-sm font-semibold text-primary">
                {statusLabels[activeStatus] || 'All Clinics'}
              </p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p>Visible: {formatNumber(visibleClinicCount)}</p>
              <p>Total: {formatNumber(dataSource.length)}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {statusFilters.map((filter) => {
              const isActive = activeStatus === filter.key;
              const count =
                filter.key === 'all'
                  ? dataSource.length
                  : (breakdown[filter.key] ?? 0);

              return (
                <button
                  key={filter.key}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                    isActive
                      ? 'border-transparent bg-white text-primary shadow-lg shadow-blue-500/10'
                      : 'border-border/50 bg-transparent text-muted-foreground hover:text-primary'
                  }`}
                  onClick={() => {
                    setActiveStatus(filter.key);
                    setSelectedClinic(null);
                  }}
                >
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                    style={{ backgroundColor: filter.color }}
                  >
                    {count}
                  </span>
                  <AppIcon name={filter.icon} size={14} />
                  <span>{filter.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="absolute top-4 right-4 w-64 rounded-2xl border border-border/40 bg-surface/95 p-4 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Coverage</span>
            <span>{coverageProvinces} provinces</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {Object.entries(statusColors).map(([status, color]) => (
              <div key={status} className="text-center">
                <p className="text-lg font-semibold" style={{ color }}>
                  {formatNumber(breakdown[status] || 0)}
                </p>
                <p className="text-[10px] text-muted-foreground">{statusLabels[status]}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <AppIcon name="Map" size={14} />
            {hoveredProvince?.properties?.Propinsi ? (
              <span>Exploring {hoveredProvince.properties.Propinsi}</span>
            ) : (
              <span>Hover map to explore provinces</span>
            )}
          </div>
        </div>

        <div className="absolute bottom-4 left-4 w-72 rounded-2xl border border-border/40 bg-surface/90 p-4 backdrop-blur">
          <p className="text-xs font-semibold text-primary">Top cities (visible)</p>
          <div className="mt-3 space-y-2">
            {visibleTopCities.length === 0 && (
              <p className="text-xs text-muted-foreground">Select a different filter to view coverage.</p>
            )}
            {visibleTopCities.map((city, index) => {
              const baseWidth = visibleTopCities[0]?.count || 1;
              return (
                <div key={city.city} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{index + 1}.</span>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-primary">{city.city}</p>
                    <div className="mt-1 h-1.5 rounded-full bg-muted/60">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                        style={{ width: `${(city.count / baseWidth) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-primary">{city.count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="absolute bottom-4 right-4 flex flex-col gap-2 rounded-xl border border-border/40 bg-surface/90 p-2 backdrop-blur">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white transition hover:bg-primary/90"
            onClick={() => handleZoomChange(0.15)}
          >
            <AppIcon name="Plus" size={16} />
          </button>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface/60 text-primary transition hover:bg-muted/60"
            onClick={() => handleZoomChange(-0.15)}
          >
            <AppIcon name="Minus" size={16} />
          </button>
          <button
            className="text-[11px] font-medium text-primary underline-offset-2 hover:underline"
            onClick={handleResetView}
          >
            Reset
          </button>
        </div>

        {selectedClinic && (
          <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-3xl rounded-t-3xl border border-border/60 bg-surface/95 p-5 shadow-2xl backdrop-blur">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h4 className="text-lg font-semibold text-primary">{selectedClinic.name}</h4>
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-medium capitalize"
                    style={{
                      backgroundColor: `${(statusColors[selectedClinic.status] || '#475569')}20`,
                      color: statusColors[selectedClinic.status] || '#475569'
                    }}
                  >
                    {statusLabels[selectedClinic.status] || selectedClinic.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedClinic.address}
                </p>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <AppIcon name="Building2" size={14} />
                    {selectedClinic.city}, {selectedClinic.province}
                  </span>
                  <span className="flex items-center gap-1">
                    <AppIcon name="Users" size={14} />
                    {selectedClinic.dentists} dentists
                  </span>
                  <span className="flex items-center gap-1">
                    <AppIcon name="Activity" size={14} />
                    {selectedClinic.patients ? `${formatNumber(selectedClinic.patients)} patients` : 'No patient data'}
                  </span>
                  <span className="flex items-center gap-1">
                    <AppIcon name="Clock" size={14} />
                    Synced {formatDate(selectedClinic.lastSynced)}
                  </span>
                </div>
                {selectedClinic.specialties && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedClinic.specialties.map((item) => (
                      <span key={item} className="rounded-full border border-border/40 px-2 py-0.5 text-[11px] text-muted-foreground">
                        {item}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-stretch gap-2 md:w-48">
                <button className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:bg-primary/90">
                  <AppIcon name="ExternalLink" size={16} />
                  View Profile
                </button>
                <button
                  className={`flex items-center justify-center gap-2 rounded-xl border border-border/50 px-4 py-2 text-sm font-semibold transition ${
                    typeof selectedClinic.lng === 'number' && typeof selectedClinic.lat === 'number'
                      ? 'text-primary hover:bg-muted/60'
                      : 'cursor-not-allowed text-muted-foreground opacity-60'
                  }`}
                  onClick={handleFocusOnSelected}
                  disabled={typeof selectedClinic.lng !== 'number' || typeof selectedClinic.lat !== 'number'}
                >
                  <AppIcon name="Navigation" size={16} />
                  Focus on map
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClinicMap;
