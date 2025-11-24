import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { getNearbyClinics } from '../services/clinicService';
import resolveMediaUrl from '../utils/media';

const DEFAULT_COORDS = {
  latitude: -6.2088,   // Jakarta, Indonesia
  longitude: 106.8456,
};

// Use real location when available, fallback to Jakarta if permission denied
const USE_MOCK_LOCATION = false;

// Default fallback images for clinics
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

const isValidImageUrl = (url) => typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'));

const getValidImageUrl = (url, fallbackIndex = 0) =>
  isValidImageUrl(url) ? url : DEFAULT_CLINIC_IMAGES[fallbackIndex % DEFAULT_CLINIC_IMAGES.length];

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

  return [
    clinic.streetAddress,
    clinic.district || clinic.area,
    clinic.city,
    clinic.province,
  ]
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

export const useNearbyClinics = ({ radius = 10, limit = 6, autoFetch = true } = {}) => {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState('undetermined');
  const [coords, setCoords] = useState(null);
  const [usedMockData, setUsedMockData] = useState(false);
  const [usedDefaultLocation, setUsedDefaultLocation] = useState(false);

  const fetchWithCoords = useCallback(
    async (currentCoords, options = {}) => {
      const { attempt = 1, radiusMultiplier = 1, isDefaultAttempt = false } = options;

      if (!currentCoords) {
        throw new Error('Koordinat tidak tersedia');
      }

      const effectiveRadius = radius * radiusMultiplier;
      console.log(
        '🏥 [useNearbyClinics] Fetching with coords:',
        JSON.stringify(currentCoords),
        'radius:',
        effectiveRadius,
        'attempt:',
        attempt,
        'defaultFallback:',
        isDefaultAttempt,
      );

      const response = await getNearbyClinics({
        latitude: currentCoords.latitude,
        longitude: currentCoords.longitude,
        radius: effectiveRadius,
        limit,
      });

      console.log('🏥 [useNearbyClinics] Clinics count:', response?.clinics?.length);

      const items = response?.clinics || [];

      if (!items || items.length === 0) {
        if (radiusMultiplier < 2.5) {
          console.log('ℹ️ [useNearbyClinics] Expanding radius for more results');
          await fetchWithCoords(currentCoords, {
            attempt: attempt + 1,
            radiusMultiplier: radiusMultiplier * 1.5,
            isDefaultAttempt,
          });
          return;
        }

        if (!isDefaultAttempt) {
          console.log('ℹ️ [useNearbyClinics] No clinics found, retrying with Jakarta default coordinates');
          setUsedDefaultLocation(true);
          setCoords(DEFAULT_COORDS);
          await fetchWithCoords(DEFAULT_COORDS, { attempt: attempt + 1, isDefaultAttempt: true });
          return;
        }

        console.log('⚠️ [useNearbyClinics] No clinics found after fallback attempts');
        setClinics([]);
        setUsedMockData(false);
        setError('Tidak ada klinik di sekitar lokasi ini.');
        return;
      }

      const normalized = items.map((clinic, index) => normalizeClinic(clinic, index));
      console.log('🏥 [useNearbyClinics] Setting clinics:', normalized.length);
      setClinics(normalized);
      setUsedMockData(false);
      setError(null);
    },
    [limit, radius],
  );

  const requestLocationAndFetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('📍 [useNearbyClinics] Requesting location permission...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);
      console.log('📍 [useNearbyClinics] Permission status:', status);

      let coordinates = null;

      // Use mock Jakarta location for development since all clinics are in Jakarta
      if (USE_MOCK_LOCATION) {
        console.log('📍 [useNearbyClinics] Using mock Jakarta coordinates for development');
        coordinates = DEFAULT_COORDS;
        setUsedDefaultLocation(true);
      } else if (status === 'granted') {
        try {
          console.log('📍 [useNearbyClinics] Getting current position...');
          const position = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          
          // Check if coordinates are valid (not simulator default or outside Indonesia)
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          
          // Indonesia roughly: latitude -11 to 6, longitude 95 to 141
          const isValidIndonesia = lat >= -11 && lat <= 6 && lon >= 95 && lon <= 141;
          
          if (isValidIndonesia) {
            coordinates = position.coords;
            console.log('✅ [useNearbyClinics] Got valid Indonesia coordinates');
            setUsedDefaultLocation(false);
          } else {
            console.log('ℹ️ [useNearbyClinics] GPS location is outside Indonesia (simulator detected)');
            console.log('ℹ️ [useNearbyClinics] Received GPS: lat=' + lat + ', lon=' + lon);
            console.log('📍 [useNearbyClinics] Using Jakarta default for better results');
            coordinates = DEFAULT_COORDS;
            setUsedDefaultLocation(true);
          }
        } catch (positionError) {
          console.log('🔍 [useNearbyClinics] Failed to get position:', positionError.message);
          console.log('📍 [useNearbyClinics] Falling back to Jakarta coordinates');
          coordinates = DEFAULT_COORDS;
          setUsedDefaultLocation(true);
        }
      } else {
        console.log('📍 [useNearbyClinics] Permission denied, using default coordinates');
        coordinates = DEFAULT_COORDS;
        setUsedDefaultLocation(true);
      }

      setCoords(coordinates);
      await fetchWithCoords(coordinates);
    } catch (err) {
      console.log('🔍 [useNearbyClinics] Failed to load nearby clinics:', err.message);
      const errorMessage = err.message || 'Tidak dapat memuat klinik terdekat.';
      setError(errorMessage);
      setClinics([]);
      setUsedMockData(false);
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
      console.log('🔍 [useNearbyClinics] Failed to refresh clinics:', err.message);
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
  };
};

export default useNearbyClinics;
