import { useState, useEffect, useCallback, useRef } from 'react';
import { getAccessToken } from '../../../../utils/auth/tokenStorage';

/**
 * useToothInstances
 * Phase 12 — Fetch and manage tooth segmentation instances for a 3D scan study.
 *
 * Behaviour:
 *   1. On mount (or studyId change): fetch GET /v1/x-core/3d-scans/:id/tooth-instances
 *   2. If 404 with no cache → auto-trigger segmentation via POST .../segment → poll
 *   3. Exposes { toothInstances, loading, error, segmentationStatus, refetch, triggerSegmentation }
 */
export default function useToothInstances(studyId, { enabled = true } = {}) {
  const [toothInstances, setToothInstances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [segmentationStatus, setSegmentationStatus] = useState('idle');
  // idle | fetching | not_computed | triggering | polling | ready | failed

  const pollTimerRef = useRef(null);
  const isMountedRef = useRef(true);
  const triggeredRef = useRef(false);

  const clearPoll = () => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const fetchInstances = useCallback(async () => {
    if (!studyId || !enabled) return;

    setLoading(true);
    setError(null);
    setSegmentationStatus('fetching');

    try {
      const token = getAccessToken();
      const res = await fetch(`/v1/x-core/3d-scans/${studyId}/tooth-instances`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (isMountedRef.current) {
          const instances = data.instances || [];
          setToothInstances(instances);
          setSegmentationStatus('ready');
          setLoading(false);
        }
        return;
      }

      if (res.status === 404 && !triggeredRef.current) {
        // Auto-trigger segmentation on first 404
        triggeredRef.current = true;
        if (isMountedRef.current) setSegmentationStatus('not_computed');
        setLoading(false);
        return;
      }

      throw new Error(`Tooth instances fetch failed (${res.status})`);
    } catch (err) {
      if (isMountedRef.current) {
        setError(err.message);
        setSegmentationStatus('failed');
        setLoading(false);
      }
    }
  }, [studyId, enabled]);

  const triggerSegmentation = useCallback(async () => {
    if (!studyId) return;
    setSegmentationStatus('triggering');
    setError(null);

    try {
      const token = getAccessToken();
      const res = await fetch(`/v1/x-core/3d-scans/${studyId}/tooth-instances/segment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });

      if (res.ok || res.status === 202) {
        // Poll for result
        setSegmentationStatus('polling');
        let attempts = 0;
        const poll = async () => {
          if (!isMountedRef.current) return;
          attempts += 1;
          try {
            const token2 = getAccessToken();
            const pollRes = await fetch(`/v1/x-core/3d-scans/${studyId}/tooth-instances`, {
              headers: { Authorization: `Bearer ${token2}` },
            });
            if (pollRes.ok) {
              const data = await pollRes.json();
              if (isMountedRef.current) {
                setToothInstances(data.instances || []);
                setSegmentationStatus('ready');
                setLoading(false);
              }
              return;
            }
          } catch (_) {}

          // Retry up to 12 times (max ~24s)
          if (attempts < 12 && isMountedRef.current) {
            pollTimerRef.current = setTimeout(poll, 2000);
          } else if (isMountedRef.current) {
            setSegmentationStatus('failed');
            setError('Segmentation timed out. Try refreshing.');
          }
        };
        pollTimerRef.current = setTimeout(poll, 1500);
      } else {
        throw new Error(`Segmentation trigger failed (${res.status})`);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err.message);
        setSegmentationStatus('failed');
      }
    }
  }, [studyId]);

  useEffect(() => {
    isMountedRef.current = true;
    triggeredRef.current = false;
    if (enabled && studyId) {
      fetchInstances();
    }
    return () => {
      isMountedRef.current = false;
      clearPoll();
    };
  }, [studyId, enabled, fetchInstances]);

  return {
    toothInstances,
    loading,
    error,
    segmentationStatus,
    refetch: fetchInstances,
    triggerSegmentation,
  };
}
