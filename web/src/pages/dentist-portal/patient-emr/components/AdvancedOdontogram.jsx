import React, { useEffect, useMemo, useRef } from 'react';
import Icon from '../../../../components/AppIcon';
import jqInstance, {
  ODONTOGRAM_MODE_DEFAULT,
  ODONTOGRAM_MODE_HAPUS,
  ODONTOGRAM_MODE_AMF,
  ODONTOGRAM_MODE_COF,
  ODONTOGRAM_MODE_FIS,
  ODONTOGRAM_MODE_NVT,
  ODONTOGRAM_MODE_RCT,
  ODONTOGRAM_MODE_NON,
  ODONTOGRAM_MODE_UNE,
  ODONTOGRAM_MODE_PRE,
  ODONTOGRAM_MODE_ANO,
  ODONTOGRAM_MODE_CARIES,
  ODONTOGRAM_MODE_CFR,
  ODONTOGRAM_MODE_FMC,
  ODONTOGRAM_MODE_POC,
  ODONTOGRAM_MODE_RRX,
  ODONTOGRAM_MODE_MIS,
  ODONTOGRAM_MODE_IPX,
  ODONTOGRAM_MODE_FRM_ACR,
  ODONTOGRAM_MODE_BRIDGE,
  ODONTOGRAM_MODE_ARROW_TOP_LEFT,
  ODONTOGRAM_MODE_ARROW_TOP_RIGHT,
  ODONTOGRAM_MODE_ARROW_TOP_TURN_LEFT,
  ODONTOGRAM_MODE_ARROW_TOP_TURN_RIGHT,
  ODONTOGRAM_MODE_ARROW_BOTTOM_LEFT,
  ODONTOGRAM_MODE_ARROW_BOTTOM_RIGHT,
  ODONTOGRAM_MODE_ARROW_BOTTOM_TURN_LEFT,
  ODONTOGRAM_MODE_ARROW_BOTTOM_TURN_RIGHT,
  ensureOdontogramReady,
} from '../jquery.odontogram'; // Sesuaikan path import ini

const MODE_BUTTONS = [
  { label: 'Select', value: ODONTOGRAM_MODE_DEFAULT, code: 'DEFAULT' },
  { label: 'Erase', value: ODONTOGRAM_MODE_HAPUS, code: 'HAPUS' },
  { label: 'Amalgam (AMF)', value: ODONTOGRAM_MODE_AMF, code: 'AMF' },
  { label: 'Composite (COF)', value: ODONTOGRAM_MODE_COF, code: 'COF' },
  { label: 'Sealant (FIS)', value: ODONTOGRAM_MODE_FIS, code: 'FIS' },
  { label: 'Caries (CAR)', value: ODONTOGRAM_MODE_CARIES, code: 'CARIES' },
  { label: 'Non Vital (NVT)', value: ODONTOGRAM_MODE_NVT, code: 'NVT' },
  { label: 'Root Canal (RCT)', value: ODONTOGRAM_MODE_RCT, code: 'RCT' },
  { label: 'Missing (MIS)', value: ODONTOGRAM_MODE_MIS, code: 'MIS' },
  { label: 'Non-exist (NON)', value: ODONTOGRAM_MODE_NON, code: 'NON' },
  { label: 'Un-erupted (UNE)', value: ODONTOGRAM_MODE_UNE, code: 'UNE' },
  { label: 'Partial (PRE)', value: ODONTOGRAM_MODE_PRE, code: 'PRE' },
  { label: 'Anomaly (ANO)', value: ODONTOGRAM_MODE_ANO, code: 'ANO' },
  { label: 'Fracture (CFR)', value: ODONTOGRAM_MODE_CFR, code: 'CFR' },
  { label: 'Metal Crown (FMC)', value: ODONTOGRAM_MODE_FMC, code: 'FMC' },
  { label: 'Porcelain (POC)', value: ODONTOGRAM_MODE_POC, code: 'POC' },
  { label: 'Retained Root (RRX)', value: ODONTOGRAM_MODE_RRX, code: 'RRX' },
  { label: 'Implant (IPX)', value: ODONTOGRAM_MODE_IPX, code: 'IPX' },
  { label: 'Denture (FRM)', value: ODONTOGRAM_MODE_FRM_ACR, code: 'FRM_ACR' },
  { label: 'Bridge', value: ODONTOGRAM_MODE_BRIDGE, code: 'BRIDGE' },
  { label: 'Arrow ↥↖', value: ODONTOGRAM_MODE_ARROW_TOP_LEFT, code: 'ATL' },
  { label: 'Arrow ↥↗', value: ODONTOGRAM_MODE_ARROW_TOP_RIGHT, code: 'ATR' },
  { label: 'Arrow ↥⤴', value: ODONTOGRAM_MODE_ARROW_TOP_TURN_LEFT, code: 'ATTL' },
  { label: 'Arrow ↥⤵', value: ODONTOGRAM_MODE_ARROW_TOP_TURN_RIGHT, code: 'ATTR' },
  { label: 'Arrow ↧↙', value: ODONTOGRAM_MODE_ARROW_BOTTOM_LEFT, code: 'ABL' },
  { label: 'Arrow ↧↘', value: ODONTOGRAM_MODE_ARROW_BOTTOM_RIGHT, code: 'ABR' },
  { label: 'Arrow ↧⤵', value: ODONTOGRAM_MODE_ARROW_BOTTOM_TURN_LEFT, code: 'ABTL' },
  { label: 'Arrow ↧⤴', value: ODONTOGRAM_MODE_ARROW_BOTTOM_TURN_RIGHT, code: 'ABTR' },
];

const geometryObjectToPosArray = (geometry) => {
  const result = [];
  if (!geometry) return result;
  Object.keys(geometry).forEach((key) => {
    const items = geometry[key];
    if (Array.isArray(items)) {
      items.forEach((item) => {
        // Pastikan item valid sebelum di-push
        if (item && item.name && item.pos) {
          result.push({ code: item.name, pos: item.pos });
        }
      });
    }
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
  const suppressRef = useRef(false); // Mencegah loop update

  // Ensure value is always array
  const resolvedValue = useMemo(() => Array.isArray(value) ? value : [], [value]);
  
  // Serialize untuk mendeteksi perubahan data prop dari parent
  const serializedValue = useMemo(() => JSON.stringify(resolvedValue), [resolvedValue]);

  // 1. Inisialisasi Plugin (Hanya sekali saat mount)
  useEffect(() => {
    if (typeof window === 'undefined' || !canvasRef.current) return;

    // Setup jQuery global
    const readyJQ = ensureOdontogramReady();
    window.jQuery = window.jQuery || readyJQ || jqInstance;

    if (!window.jQuery?.fn?.odontogram) {
        console.error("Odontogram plugin not loaded properly");
        return;
    }

    const $canvas = window.jQuery(canvasRef.current);

    // Init Plugin
    try {
        $canvas.odontogram('init', {
            width: `${width}px`,
            height: `${height}px`,
        });
        jqueryRef.current = $canvas;
    } catch (e) {
        console.warn("Odontogram already initialized or error:", e);
        // Jika error re-init, kita ambil instance yang ada
        jqueryRef.current = $canvas; 
    }

    // Event Listener untuk perubahan data (user klik gigi)
    const handleChange = (_, geometry) => {
      if (readOnly || !onChange) return;
      
      // Set flag supaya useEffect update data di bawah tidak jalan (karena data berasal dari dalam)
      suppressRef.current = true; 
      
      const posArray = geometryObjectToPosArray(geometry);
      onChange(posArray);
    };

    $canvas.on('change', handleChange);

    return () => {
      $canvas.off('change', handleChange);
      // Jangan removeData('odontogram') di sini agar tidak flicker saat re-render parent
    };
  }, [width, height, readOnly]); // Dependencies minim agar tidak sering re-init

  // 2. Update Data Visual (Saat props 'value' berubah dari luar, misal load dari DB)
  useEffect(() => {
    if (!jqueryRef.current) return;

    // Jika perubahan datang dari internal (klik user), jangan update balik ke canvas
    if (suppressRef.current) {
      suppressRef.current = false;
      return;
    }

    const parsed = JSON.parse(serializedValue);
    
    try {
        if (!parsed.length) {
            // Reset jika kosong
            jqueryRef.current.odontogram('setGeometry', {});
        } else {
            // Update visual
            jqueryRef.current.odontogram('setGeometryByPos', parsed);
        }
    } catch (error) {
        console.error("Error updating odontogram geometry:", error);
    }
    
  }, [serializedValue]); // Hanya jalan jika string JSON berubah

  const handleMode = (modeValue) => {
    if (readOnly || !jqueryRef.current) return;
    jqueryRef.current.odontogram('setMode', modeValue);
  };

  const handleClear = () => {
    if (!jqueryRef.current || readOnly) return;
    jqueryRef.current.odontogram('setGeometry', {}); // Hapus visual
    jqueryRef.current.trigger('change', [{}]); // Trigger event change agar state parent kosong
  };

  const handleDownload = () => {
    if (!jqueryRef.current) return;
    const url = jqueryRef.current.odontogram('getDataURL');
    const link = document.createElement('a');
    link.download = `odontogram-${new Date().getTime()}.png`;
    link.href = url;
    link.click();
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      {showToolbar && !readOnly && (
        <div className="flex flex-col gap-4 rounded-2xl border border-border/40 bg-background/60 p-4">
          <div className="flex items-center justify-between">
            <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Tools</p>
                <h4 className="text-sm font-semibold text-primary">Select Condition</h4>
            </div>
            <div className="flex gap-2">
                <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                >
                <Icon name="RotateCcw" size={12} />
                Reset All
                </button>
                <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-secondary hover:bg-surface"
                >
                <Icon name="Download" size={12} />
                Save Image
                </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {MODE_BUTTONS.map((btn) => (
              <button
                type="button"
                key={btn.code}
                onClick={() => handleMode(btn.value)}
                className="group relative flex items-center gap-2 rounded-lg border border-border/50 bg-surface p-2 text-left transition-all hover:border-primary/50 hover:shadow-sm focus:ring-2 focus:ring-primary/20"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/5 text-xs font-bold text-primary group-hover:bg-primary group-hover:text-white">
                  {btn.code.substring(0, 2)}
                </div>
                <span className="truncate text-xs font-medium text-secondary group-hover:text-primary">
                  {btn.label.split('(')[0]}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Canvas Area */}
      <div className="relative w-full overflow-hidden rounded-3xl border border-border/40 bg-white shadow-sm">
        <div className="overflow-x-auto p-4 flex justify-center bg-white">
            <canvas
            ref={canvasRef}
            // Style width/height handled by plugin init, but defaults here help layout
            style={{ cursor: readOnly ? 'default' : 'crosshair' }} 
            />
        </div>
        {readOnly && (
            <div className="absolute inset-0 z-10 bg-transparent" /> // Overlay agar tidak bisa diklik di mode readonly
        )}
      </div>
      
      <p className="text-center text-xs text-secondary/60">
        {readOnly ? 'View Only Mode' : 'Click on teeth segments to apply selected condition.'}
      </p>
    </div>
  );
};

export default AdvancedOdontogram;
