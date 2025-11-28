import React, { useEffect, useMemo, useRef } from 'react';
import Icon from '../../../../components/AppIcon';
import $ from 'jquery';
import jqInstance from '../jquery.odontogram';

const MODE_BUTTONS = [
  { label: 'Select', constant: 'ODONTOGRAM_MODE_DEFAULT' },
  { label: 'Erase', constant: 'ODONTOGRAM_MODE_HAPUS' },
  { label: 'Amalgam', constant: 'ODONTOGRAM_MODE_AMF' },
  { label: 'Composite', constant: 'ODONTOGRAM_MODE_COF' },
  { label: 'Fissure', constant: 'ODONTOGRAM_MODE_FIS' },
  { label: 'Non Vital', constant: 'ODONTOGRAM_MODE_NVT' },
  { label: 'Root Canal', constant: 'ODONTOGRAM_MODE_RCT' },
  { label: 'Caries', constant: 'ODONTOGRAM_MODE_CARIES' },
  { label: 'Crown', constant: 'ODONTOGRAM_MODE_POC' },
  { label: 'Bridge', constant: 'ODONTOGRAM_MODE_BRIDGE' },
];

const geometryObjectToPosArray = (geometry) => {
  const result = [];
  if (!geometry) return result;
  Object.keys(geometry).forEach((key) => {
    (geometry[key] || []).forEach((item) => {
      if (item?.name && item?.pos) {
        result.push({ code: item.name, pos: item.pos });
      }
    });
  });
  return result;
};

const AdvancedOdontogram = ({
  value = [],
  onChange,
  readOnly = false,
  width = 900,
  height = 420,
  showToolbar = true,
}) => {
  const canvasRef = useRef(null);
  const jqueryRef = useRef(null);
  const suppressRef = useRef(false);

  const resolvedValue = useMemo(() => value || [], [value]);

  useEffect(() => {
    window.jQuery = window.jQuery || jqInstance || $;
    const canvas = canvasRef.current;
    if (!canvas || !window.jQuery?.fn?.odontogram) return;
    const $canvas = window.jQuery(canvas);
    $canvas.odontogram('init', {
      width: `${width}px`,
      height: `${height}px`,
    });
    if (resolvedValue.length) {
      $canvas.odontogram('setGeometryByPos', resolvedValue);
    }
    const handleChange = (_, geometry) => {
      if (!onChange || readOnly) return;
      suppressRef.current = true;
      onChange(geometryObjectToPosArray(geometry));
    };
    if (!readOnly) {
      $canvas.on('change', handleChange);
    }
    jqueryRef.current = $canvas;
    return () => {
      if (!readOnly) $canvas.off('change', handleChange);
      $canvas.removeData('odontogram');
    };
  }, [height, width, readOnly, resolvedValue.length, onChange]);

  useEffect(() => {
    if (!jqueryRef.current || !window.jQuery?.fn?.odontogram) return;
    if (suppressRef.current) {
      suppressRef.current = false;
      return;
    }
    if (!resolvedValue.length) {
      jqueryRef.current.odontogram('setGeometry', {});
      return;
    }
    jqueryRef.current.odontogram('setGeometryByPos', resolvedValue);
  }, [resolvedValue]);

  const handleMode = (constant) => {
    if (readOnly || !jqueryRef.current) return;
    const modeValue = window[constant];
    if (modeValue == null) return;
    jqueryRef.current.odontogram('setMode', modeValue);
  };

  const handleClear = () => {
    if (!jqueryRef.current || readOnly) return;
    jqueryRef.current.odontogram('setGeometry', {});
    if (onChange) onChange([]);
  };

  const handleDownload = () => {
    if (!jqueryRef.current) return;
    const url = jqueryRef.current.odontogram('getDataURL');
    const win = window.open();
    if (win) {
      win.document.write(
        `<iframe src="${url}" frameborder="0" style="border:0;top:0;left:0;bottom:0;right:0;width:100%;height:100%;" allowfullscreen></iframe>`
      );
    }
  };

  return (
    <div className="space-y-4">
      {showToolbar && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">Digital Odontogram</p>
            <h3 className="text-lg font-semibold text-primary">Ministry-compliant chart</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <button
              type="button"
              onClick={handleClear}
              disabled={readOnly}
              className="inline-flex items-center gap-2 rounded-xl border border-border/40 px-3 py-1.5 text-sm text-secondary hover:text-primary disabled:opacity-40"
            >
              <Icon name="RotateCcw" size={14} />
              Reset Chart
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-2 rounded-xl border border-border/40 px-3 py-1.5 text-sm text-secondary hover:text-primary"
            >
              <Icon name="Download" size={14} />
              Download
            </button>
          </div>
        </div>
      )}

      <div className="w-full overflow-auto rounded-3xl border border-border/40 bg-surface p-4">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full"
          style={{ pointerEvents: readOnly ? 'none' : 'auto' }}
        />
      </div>

      {showToolbar && (
        <div className="rounded-2xl border border-border/40 bg-background/60 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-secondary mb-3">Modes</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {MODE_BUTTONS.map((btn) => (
              <button
                type="button"
                key={btn.constant}
                disabled={readOnly}
                onClick={() => handleMode(btn.constant)}
                className="flex items-center gap-3 rounded-xl border border-border/40 px-3 py-2 text-sm text-secondary hover:text-primary disabled:opacity-40"
              >
                <Icon name="PenTool" size={14} />
                <span>{btn.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedOdontogram;
