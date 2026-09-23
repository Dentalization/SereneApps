/**
 * scan3DMeasurements.mjs
 * Pure-JS measurement state machine for Scan3DMeshViewer.
 * No React dependencies — state is managed externally via useState/useReducer.
 *
 * Tool modes: 'none' | 'distance' | 'point' | 'text'
 * Schema is compatible with usePersistentAnnotations (viewerType='scan3d').
 */

export const TOOLS = Object.freeze({
  NONE: 'none',
  DISTANCE: 'distance',
  POINT: 'point',
  TEXT: 'text',
});

/**
 * Create a fresh measurements state object.
 * @returns {MeasurementsState}
 */
export function createMeasurementsState() {
  return {
    tool: TOOLS.NONE,
    pendingPick: null,     // [x, y, z] world point — first click of a distance pair
    measurements: [],      // committed measurement annotations
    undoStack: [],         // array of snapshots for undo
  };
}

/**
 * Generate a lightweight unique id without external dependencies.
 */
function genId() {
  return `m3d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Compute Euclidean distance in mm between two world-space points.
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}
 */
export function distanceMm3D(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Midpoint between two world-space points.
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number[]}
 */
export function midpoint3D(a, b) {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
}

// ---------------------------------------------------------------------------
// State reducers — return a NEW state object (immutable pattern)
// ---------------------------------------------------------------------------

/**
 * Set the active measurement tool. Clears any pending pick.
 */
export function setTool(state, tool) {
  if (!Object.values(TOOLS).includes(tool)) return state;
  return { ...state, tool, pendingPick: null };
}

/**
 * Handle a world-space pick (left-click on mesh surface).
 * Depending on active tool:
 *   distance — first pick stored as pending; second pick commits measurement
 *   point    — immediately commits a point annotation
 *   text     — immediately commits a text anchor (label edited separately)
 *   none     — no-op
 *
 * @param {object} state
 * @param {number[]} worldPoint — [x, y, z] in mm
 * @param {string}  [textContent] — for text tool
 * @returns {{ state: MeasurementsState, committed: object|null }}
 */
export function handlePick(state, worldPoint, textContent = '') {
  if (!Array.isArray(worldPoint) || worldPoint.length < 3) {
    return { state, committed: null };
  }

  const { tool, measurements, undoStack, pendingPick } = state;

  if (tool === TOOLS.NONE) {
    return { state, committed: null };
  }

  // --- DISTANCE ---
  if (tool === TOOLS.DISTANCE) {
    if (!pendingPick) {
      // First click: store pending
      return {
        state: { ...state, pendingPick: worldPoint },
        committed: null,
      };
    }

    // Second click: commit measurement
    const dist = distanceMm3D(pendingPick, worldPoint);
    const mid = midpoint3D(pendingPick, worldPoint);
    const committed = {
      id: genId(),
      type: 'measurement',
      viewer_type: 'scan3d',
      coordinates: {
        world_start: [...pendingPick],
        world_end: [...worldPoint],
        world_mid: mid,
      },
      metadata: {
        distance_mm: parseFloat(dist.toFixed(3)),
        label: `${dist.toFixed(1)} mm`,
        labelOffset: { x: 0, y: -18 },
      },
      created_at: new Date().toISOString(),
    };

    const nextMeasurements = [...measurements, committed];
    return {
      state: {
        ...state,
        pendingPick: null,
        measurements: nextMeasurements,
        undoStack: [...undoStack, measurements],
      },
      committed,
    };
  }

  // --- POINT ---
  if (tool === TOOLS.POINT) {
    const committed = {
      id: genId(),
      type: 'point',
      viewer_type: 'scan3d',
      coordinates: { world_point: [...worldPoint] },
      metadata: {
        label: `Titik ${measurements.filter(m => m.type === 'point').length + 1}`,
        color: '#38bdf8',
      },
      created_at: new Date().toISOString(),
    };

    return {
      state: {
        ...state,
        measurements: [...measurements, committed],
        undoStack: [...undoStack, measurements],
      },
      committed,
    };
  }

  // --- TEXT ---
  if (tool === TOOLS.TEXT) {
    const text = textContent || 'Catatan';
    const committed = {
      id: genId(),
      type: 'text',
      viewer_type: 'scan3d',
      coordinates: { world_point: [...worldPoint] },
      metadata: {
        text,
        label: text,
        color: '#f59e0b',
        labelOffset: { x: 0, y: -22 },
      },
      created_at: new Date().toISOString(),
    };

    return {
      state: {
        ...state,
        measurements: [...measurements, committed],
        undoStack: [...undoStack, measurements],
      },
      committed,
    };
  }

  return { state, committed: null };
}

/**
 * Undo last committed measurement.
 */
export function undoMeasurement(state) {
  const { undoStack } = state;
  if (undoStack.length === 0) return state;
  const prev = undoStack[undoStack.length - 1];
  return {
    ...state,
    measurements: prev,
    undoStack: undoStack.slice(0, -1),
    pendingPick: null,
  };
}

/**
 * Delete a measurement by id.
 */
export function deleteMeasurement(state, id) {
  const next = state.measurements.filter(m => m.id !== id);
  if (next.length === state.measurements.length) return state;
  return {
    ...state,
    measurements: next,
    undoStack: [...state.undoStack, state.measurements],
  };
}

/**
 * Clear all measurements.
 */
export function clearAllMeasurements(state) {
  if (state.measurements.length === 0) return state;
  return {
    ...state,
    measurements: [],
    pendingPick: null,
    undoStack: [...state.undoStack, state.measurements],
  };
}

/**
 * Hydrate measurements from persisted annotations (API load).
 * Filters to scan3d viewer_type only.
 */
export function hydrateMeasurements(state, annotations) {
  const scan3d = (Array.isArray(annotations) ? annotations : []).filter(
    a => a?.viewer_type === 'scan3d' || a?.viewerType === 'scan3d'
  );
  return { ...state, measurements: scan3d, undoStack: [] };
}

/**
 * Update label text for a measurement by id.
 */
export function renameMeasurement(state, id, label) {
  return {
    ...state,
    measurements: state.measurements.map(m =>
      m.id === id ? { ...m, metadata: { ...m.metadata, label } } : m
    ),
  };
}

/**
 * Update label offset (drag) for a measurement by id.
 */
export function moveMeasurementLabel(state, id, offset) {
  return {
    ...state,
    measurements: state.measurements.map(m =>
      m.id === id
        ? { ...m, metadata: { ...m.metadata, labelOffset: offset } }
        : m
    ),
  };
}
