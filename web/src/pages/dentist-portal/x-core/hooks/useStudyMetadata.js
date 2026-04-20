import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildImagingUrl, buildStudyAssetParams } from '../utils/imagingUrl';

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
        const response = await fetch(
          buildImagingUrl(
            `/metadata/${studyKey}`,
            buildStudyAssetParams(study, seriesUid ? { series_uid: seriesUid } : {})
          )
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
  }, [enabled, refreshToken, seriesUid, study?.shareToken, studyKey]);

  if (!enabled) {
    return EMPTY_RESULT;
  }

  return { metadata, loading, error, refresh };
}
