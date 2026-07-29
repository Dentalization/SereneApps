import { useEffect, useRef } from 'react';
import {
  createPortalRefreshCoordinator,
  subscribePortalInvalidations
} from '../collaboration/portalCollaboration.mjs';

/**
 * One refresh path for socket events, same-tab mutations, and cross-tab
 * mutations. Event payloads are never used as data; the authenticated API is
 * always the source of truth.
 */
export function usePortalRealtimeRefresh({
  socket,
  events,
  refresh,
  enabled = true,
  debounceMs = 100,
  minIntervalMs = 350
}) {
  const refreshRef = useRef(refresh);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (!enabled || typeof refreshRef.current !== 'function') return undefined;

    const eventNames = [...new Set(events || [])];
    const coordinator = createPortalRefreshCoordinator({
      debounceMs,
      minIntervalMs,
      refresh: (context) => refreshRef.current(context)
    });
    const socketHandlers = eventNames.map((eventName) => {
      const handler = () => coordinator.schedule(`socket:${eventName}`);
      socket?.on(eventName, handler);
      return [eventName, handler];
    });
    const acceptedEvents = new Set(eventNames);
    const unsubscribeLocal = subscribePortalInvalidations((signal) => {
      if (acceptedEvents.has(signal.eventName)) {
        coordinator.schedule(`local:${signal.eventName}`);
      }
    });

    return () => {
      socketHandlers.forEach(([eventName, handler]) => socket?.off(eventName, handler));
      unsubscribeLocal();
      coordinator.dispose();
    };
  }, [debounceMs, enabled, events, minIntervalMs, socket]);
}

export default usePortalRealtimeRefresh;
