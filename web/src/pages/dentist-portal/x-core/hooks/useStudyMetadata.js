import { useCallback, useEffect, useMemo, useState } from 'react';
import { PY_API_BASE } from '../../../../config/api';

const EMPTY_RESULT = {
  metadata: null,
  loading: false,
  error: null,
  refresh: () => {},
};

export default function useStudyMetadata(study, options = {}) {
  const { enabled = true } = options;
  const studyKey = useMemo(() => study?.folderName || study?.id || '', [study]);
  const seriesUid = useMemo(() => study?.selectedSeriesUid || '', [study]);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const refresh = useCallback(() => {
    setRefreshToken((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!enabled || !studyKey) {
      setMetadata(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    const fetchMetadata = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (seriesUid) params.set('series_uid', seriesUid);

        const response = await fetch(
          `${PY_API_BASE}/metadata/${studyKey}${params.toString() ? `?${params.toString()}` : ''}`
        );

        if (!response.ok) {
          throw new Error(`Metadata request failed (${response.status})`);
        }

        const data = await response.json();
        if (!cancelled) {
          setMetadata(data);
        }
      } catch (err) {
        if (!cancelled) {
          setMetadata(null);
          setError(err.message || String(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchMetadata();

    return () => {
      cancelled = true;
    };
  }, [enabled, refreshToken, seriesUid, studyKey]);

  if (!enabled) {
    return EMPTY_RESULT;
  }

  return { metadata, loading, error, refresh };
}
