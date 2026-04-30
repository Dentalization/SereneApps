export function createMeasurementLabelPositionStore() {
  let positions = new Map();
  const listenersById = new Map();

  const notifyId = (id) => {
    const listeners = listenersById.get(id);
    if (!listeners || listeners.size === 0) return;
    listeners.forEach((listener) => {
      try {
        listener();
      } catch (_) { }
    });
  };

  return {
    getPosition(id) {
      return positions.get(id) || null;
    },
    subscribe(id, listener) {
      if (!listenersById.has(id)) {
        listenersById.set(id, new Set());
      }
      listenersById.get(id).add(listener);
      return () => {
        const listeners = listenersById.get(id);
        if (!listeners) return;
        listeners.delete(listener);
        if (listeners.size === 0) {
          listenersById.delete(id);
        }
      };
    },
    setPositions(nextPositions) {
      const next = nextPositions instanceof Map ? nextPositions : new Map();
      const changedIds = new Set();

      positions.forEach((value, id) => {
        const nextValue = next.get(id);
        if (!nextValue || nextValue.x !== value.x || nextValue.y !== value.y) {
          changedIds.add(id);
        }
      });

      next.forEach((value, id) => {
        const prevValue = positions.get(id);
        if (!prevValue || prevValue.x !== value.x || prevValue.y !== value.y) {
          changedIds.add(id);
        }
      });

      positions = next;
      changedIds.forEach(notifyId);
    },
    reset() {
      const changedIds = [...positions.keys()];
      positions = new Map();
      changedIds.forEach(notifyId);
    },
  };
}
