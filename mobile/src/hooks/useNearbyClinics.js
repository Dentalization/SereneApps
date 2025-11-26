import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { getNearbyClinics } from '../services/clinicService';
import resolveMediaUrl from '../utils/media';

const DEFAULT_COORDS = { latitude: -6.2088, longitude: 106.8456 };
const DEFAULT_SEARCH_META = {
  locationSource: 'unknown',
  coordsUsed: null,
  radiusRequested: null,
  backendSearch: null,
  timestamp: null,
  fallbackUsed: false,
  resultCount: 0,
};
const DEFAULT_CLINIC_IMAGES = [
  'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=800&auto=format&fit=crop',
];

const toAbsoluteImage = (url) => {
  const resolved = resolveMediaUrl(url);
  if (resolved) return resolved;
  if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
    return url;
  }
  return null;
};

const isValidImageUrl = (url) =>
  typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'));

const getValidImageUrl = (url, fallbackIndex = 0) =>
  isValidImageUrl(url) ? url : DEFAULT_CLINIC_IMAGES[fallbackIndex % DEFAULT_CLINIC_IMAGES.length];

const toNumber = (value) => {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isFinite(parsed) ? parsed : null;
};

const pickNested = (obj = {}, path = '') => {
  if (!path) return undefined;
  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
};

const pickCoord = (raw = {}, paths = []) => {
  for (const path of paths) {
    const value = pickNested(raw, path);
    const parsed = toNumber(value);
    if (parsed !== null) return parsed;
  }
  return null;
};

const haversineDistance = (lat1, lon1, lat2, lon2) => {
  if (
    [lat1, lon1, lat2, lon2].some(
      (coord) => coord === null || coord === undefined || !Number.isFinite(coord)
    )
  ) {
    return null;
  }
  const R = 6371;
  const toRad = (deg) => deg * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
};

const attachDistanceDiagnostics = (items, originCoords, backendSearch) => {
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    const latitude = pickCoord(item, [
      'branch_latitude',
      'latitude',
      'location.latitude',
      'clinic_latitude',
    ]);
    const longitude = pickCoord(item, [
      'branch_longitude',
      'longitude',
      'location.longitude',
      'clinic_longitude',
    ]);

    const localDistance =
      originCoords && typeof originCoords.latitude === 'number'
        ? haversineDistance(originCoords.latitude, originCoords.longitude, latitude, longitude)
        : null;
    const backendDistance =
      typeof item.distanceKm === 'number'
        ? item.distanceKm
        : toNumber(item.distance ?? item.distance_km);

    const delta =
      localDistance !== null && backendDistance !== null
        ? Math.abs(localDistance - backendDistance)
        : null;

    return {
      ...item,
      distanceKm: backendDistance ?? localDistance,
      distanceDiagnostics: {
        backendDistance,
        localDistance,
        delta,
        backendCenter: backendSearch
          ? {
              latitude: toNumber(backendSearch.latitude),
              longitude: toNumber(backendSearch.longitude),
              radius: backendSearch.radius,
            }
          : null,
      },
    };
  });
};

const formatAddress = (clinic) => {
  const address = clinic?.address;
  if (typeof address === 'string') return address;
  if (address && typeof address === 'object') {
    return [
      address.fullAddress || address.streetAddress || address.line1,
      address.district || address.subdistrict,
      address.city,
      address.province,
    ]
      .filter(Boolean)
      .join(', ');
  }

  return [clinic.streetAddress, clinic.district || clinic.area, clinic.city, clinic.province]
    .filter(Boolean)
    .join(', ');
};

const normalizeClinic = (clinic, index = 0) => {
  const heroCandidate = toAbsoluteImage(clinic?.heroImage) || toAbsoluteImage(clinic?.images?.hero);
  const coverCandidate =
    toAbsoluteImage(clinic?.coverImage) ||
    toAbsoluteImage(clinic?.images?.cover) ||
    toAbsoluteImage(clinic?.gallery?.[0]);

  const gallery = Array.isArray(clinic?.gallery)
    ? clinic.gallery
        .map((img, idx) => getValidImageUrl(toAbsoluteImage(img), index + idx))
        .filter(Boolean)
    : [];

  const name =
    clinic?.name ||
    clinic?.branchName ||
    clinic?.clinicName ||
    clinic?.clinicProfile?.name ||
    clinic?.clinic?.name ||
    'Klinik Gigi';

  const city =
    clinic?.city ||
    clinic?.address?.city ||
    clinic?.clinicProfile?.city ||
    clinic?.location?.city ||
    clinic?.province ||
    '';

  return {
    ...clinic,
    id: clinic?.id?.toString?.() || clinic?.branchId?.toString?.() || clinic?.clinicId?.toString?.(),
    name,
    city,
    addressText: formatAddress(clinic),
    heroImage: getValidImageUrl(heroCandidate, index),
    coverImage: getValidImageUrl(coverCandidate || heroCandidate, index),
    gallery,
    distanceKm:
      typeof clinic?.distanceKm === 'number'
        ? clinic.distanceKm
        : Number(clinic?.distanceKm) || Number(clinic?.distance_km) || null,
    rating:
      typeof clinic?.rating === 'number'
        ? clinic.rating
        : clinic?.rating
        ? Number(clinic.rating)
        : null,
    reviews:
      typeof clinic?.reviews === 'number'
        ? clinic.reviews
        : clinic?.reviews
        ? Number(clinic.reviews)
        : clinic?.reviewCount || clinic?.reviewsCount || 0,
    dentistCount:
      typeof clinic?.dentistCount === 'number'
        ? clinic.dentistCount
        : Number(clinic?.dentistCount) || Number(clinic?.dentists) || 0,
  };
};

export const useNearbyClinics = ({
  radius = 10,
  limit = 6,
  autoFetch = true,
  allowRadiusExpansion = true,
  maxRadiusMultiplier = 2.5,
  strictRadius = false,
  fallbackToDefault = true,
} = {}) => {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState('undetermined');
  const [coords, setCoords] = useState(null);
  const [usedMockData, setUsedMockData] = useState(false);
  const [usedDefaultLocation, setUsedDefaultLocation] = useState(false);
  const [searchMeta, setSearchMeta] = useState(DEFAULT_SEARCH_META);

  const fetchWithCoords = useCallback(
    async (currentCoords, options = {}) => {
      const { attempt = 1, radiusMultiplier = 1, isDefaultAttempt = false } = options;

      if (!currentCoords) {
        throw new Error('Koordinat tidak tersedia');
      }

      const effectiveRadius = allowRadiusExpansion ? radius * radiusMultiplier : radius;
      console.log(
        '🏥 [useNearbyClinics] Fetching with coords:',
        JSON.stringify(currentCoords),
        'radius:',
        effectiveRadius,
        'attempt:',
        attempt,
        'defaultFallback:',
        isDefaultAttempt
      );

      const response = await getNearbyClinics({
        latitude: currentCoords.latitude,
        longitude: currentCoords.longitude,
        radius: effectiveRadius,
        limit,
      });

      console.log('🏥 [useNearbyClinics] Clinics count:', response?.clinics?.length);

      const items = response?.clinics || [];
      const normalized = items.map((clinic, index) => normalizeClinic(clinic, index));
      const enhanced = attachDistanceDiagnostics(normalized, currentCoords, response?.search);

      const allowedDistance = strictRadius ? radius : effectiveRadius;
      const acceptableClinics = enhanced.filter((clinic) => {
        if (clinic.distanceKm == null) {
          return !strictRadius;
        }
        return clinic.distanceKm <= allowedDistance;
      });

      if (acceptableClinics.length === 0) {
        const canExpand = allowRadiusExpansion && radiusMultiplier < maxRadiusMultiplier;
        if (canExpand) {
          console.log('ℹ️ [useNearbyClinics] Expanding radius for more results');
          await fetchWithCoords(currentCoords, {
            attempt: attempt + 1,
            radiusMultiplier: radiusMultiplier * 1.5,
            isDefaultAttempt,
          });
          return;
        }

        if (!isDefaultAttempt && fallbackToDefault) {
          console.log('ℹ️ [useNearbyClinics] No clinics found, retrying with Jakarta default coordinates');
          setUsedDefaultLocation(true);
          setCoords(DEFAULT_COORDS);
          await fetchWithCoords(DEFAULT_COORDS, {
            attempt: attempt + 1,
            radiusMultiplier: 1,
            isDefaultAttempt: true,
          });
          return;
        }

        console.log('ℹ️ [useNearbyClinics] Still no clinics found after fallback/default attempts');
        setClinics([]);
        setUsedMockData(false);
        setSearchMeta({
          locationSource: isDefaultAttempt ? 'default' : 'gps',
          coordsUsed: currentCoords,
          radiusRequested: radius,
          backendSearch: response?.search || null,
          timestamp: new Date().toISOString(),
          fallbackUsed: Boolean(isDefaultAttempt),
          resultCount: 0,
        });
        return;
      }

      setClinics(acceptableClinics);
      setUsedMockData(false);
      if (isDefaultAttempt) {
        setUsedDefaultLocation(true);
      }

      setSearchMeta({
        locationSource: isDefaultAttempt ? 'default' : 'gps',
        coordsUsed: currentCoords,
        radiusRequested: effectiveRadius,
        backendSearch: response?.search || null,
        timestamp: new Date().toISOString(),
        fallbackUsed: Boolean(isDefaultAttempt),
        resultCount: acceptableClinics.length,
      });
    },
    [allowRadiusExpansion, fallbackToDefault, limit, maxRadiusMultiplier, radius, strictRadius]
  );

  const requestLocationAndFetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('📍 [useNearbyClinics] Requesting location permission...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);

      let positionCoords = null;
      if (status === 'granted') {
        try {
          const position = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          const isValidIndonesia = lat >= -11 && lat <= 6 && lon >= 95 && lon <= 141;
          if (isValidIndonesia) {
            positionCoords = position.coords;
            setUsedDefaultLocation(false);
          } else {
            positionCoords = DEFAULT_COORDS;
            setUsedDefaultLocation(true);
          }
        } catch (locationError) {
          console.log('📍 [useNearbyClinics] Failed to read GPS:', locationError.message);
          positionCoords = DEFAULT_COORDS;
          setUsedDefaultLocation(true);
        }
      } else {
        positionCoords = DEFAULT_COORDS;
        setUsedDefaultLocation(true);
      }

      setCoords(positionCoords);
      await fetchWithCoords(positionCoords);
    } catch (err) {
      console.log('🏥 [useNearbyClinics] Failed to load nearby clinics:', err.message);
      const errorMessage = err.message || 'Tidak dapat memuat klinik terdekat.';
      setError(errorMessage);
      setClinics([]);
      setUsedMockData(false);
      setSearchMeta(DEFAULT_SEARCH_META);
    } finally {
      setLoading(false);
    }
  }, [fetchWithCoords]);

  const refetch = useCallback(async () => {
    if (!coords) {
      await requestLocationAndFetch();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await fetchWithCoords(coords);
    } catch (err) {
      console.log('🏥 [useNearbyClinics] Failed to refresh:', err.message);
      const errorMessage = err.message || 'Tidak dapat menyegarkan daftar klinik.';
      setError(errorMessage);
      setClinics([]);
      setUsedMockData(false);
    } finally {
      setLoading(false);
    }
  }, [coords, fetchWithCoords, requestLocationAndFetch]);

  useEffect(() => {
    if (autoFetch) {
      requestLocationAndFetch();
    }
  }, [autoFetch, requestLocationAndFetch]);

  return {
    clinics,
    loading,
    error,
    refresh: refetch,
    requestLocation: requestLocationAndFetch,
    permissionStatus,
    location: coords,
    usedMockData,
    usedDefaultLocation,
    searchMeta,
  };
};

export default useNearbyClinics;
