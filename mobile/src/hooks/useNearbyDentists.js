import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { getNearbyDentists } from '../services/dentistService';
import { API_BASE_URL } from '../services/api';

const DEFAULT_COORDS = { latitude: -6.2088, longitude: 106.8456 };
const DICEBEAR_BG = encodeURIComponent('8B5CF6,A78BFA,C4B5FD,DDD6FE');
const API_BASE = API_BASE_URL.replace(/\/$/, '');
const DEFAULT_SEARCH_META = {
  locationSource: 'unknown',
  coordsUsed: null,
  radiusRequested: null,
  backendSearch: null,
  timestamp: null,
  fallbackUsed: false,
  resultCount: 0,
};

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
    const raw = item?.raw || {};
    const latitude = pickCoord(raw, [
      'latitude',
      'lat',
      'clinic_latitude',
      'branch_latitude',
      'location.latitude',
    ]);
    const longitude = pickCoord(raw, [
      'longitude',
      'lon',
      'lng',
      'clinic_longitude',
      'branch_longitude',
      'location.longitude',
    ]);

    const localDistance =
      originCoords && typeof originCoords.latitude === 'number'
        ? haversineDistance(originCoords.latitude, originCoords.longitude, latitude, longitude)
        : null;
    const backendDistance =
      typeof item.distanceKm === 'number'
        ? item.distanceKm
        : toNumber(raw.distance ?? raw.distance_km ?? raw.distanceKm);

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
              specialization: backendSearch.specialization || null,
              type: backendSearch.type || null,
            }
          : null,
      },
    };
  });
};

const normalizeDicebear = (url = '', seed = 'dentist') => {
  if (!url || !url.includes('dicebear.com')) {
    return url || `https://api.dicebear.com/7.x/avataaars/png?seed=${seed}&backgroundColor=${DICEBEAR_BG}&size=256`;
  }
  return url.replace('/svg', '/png').replace('format=svg', 'format=png');
};

const resolveAvatar = (path, seed = 'dentist') => {
  if (!path) {
    return `https://api.dicebear.com/7.x/avataaars/png?seed=${seed}&backgroundColor=${DICEBEAR_BG}&size=256`;
  }
  if (/^https?:\/\//i.test(path)) {
    return normalizeDicebear(path, seed);
  }
  const normalized = path.startsWith('/') ? path.slice(1) : path;
  return `${API_BASE}/${normalized}`;
};

const pickAvatarPath = (source) => {
  if (!source) return null;
  if (typeof source === 'string') return source;
  return (
    source?.avatarUrl ||
    source?.avatar_url ||
    source?.avatar ||
    source?.image ||
    source?.imageUrl ||
    source?.photo ||
    source?.photo_url ||
    source?.profilePicture ||
    source?.profile_picture ||
    null
  );
};

const extractClinicContext = (dentist) => {
  const profileId =
    dentist?.clinicProfileId ||
    dentist?.clinic_profile_id ||
    dentist?.clinicId ||
    dentist?.clinic_id ||
    dentist?.primaryClinicId;
  const branchId =
    dentist?.assigned_branch_id ||
    dentist?.clinicBranchId ||
    dentist?.clinic_branch_id ||
    dentist?.branchId;

  if (!profileId && !branchId) return null;

  const clinicName = dentist?.clinicName || dentist?.clinic || dentist?.clinicAddress || dentist?.primaryClinicName;
  const clinicAddress = dentist?.clinicAddress || dentist?.address || dentist?.clinic_location;

  return {
    profileId: profileId?.toString?.() || null,
    branchId: branchId?.toString?.() || null,
    name: clinicName,
    address: clinicAddress,
  };
};

const normalizeDentist = (dentist) => {
  const years = dentist?.yearsOfExperience || 0;
  const fallbackRating = 4 + Math.min(1, years / 15);
  const distance =
    typeof dentist?.distance === 'number'
      ? dentist.distance
      : typeof dentist?.distanceKm === 'number'
      ? dentist.distanceKm
      : null;

  const avatarPath = pickAvatarPath(dentist);
  return {
    id: dentist?.id?.toString?.() || dentist?.userId?.toString?.() || `dentist-${dentist?.name}`,
    name: dentist?.name || dentist?.fullname || 'Dokter Gigi',
    specialty: dentist?.specialization || dentist?.primarySpecialization || 'Dokter Gigi',
    clinic: dentist?.clinicName || dentist?.clinic || dentist?.clinicAddress || 'Klinik gigimu',
    clinicContext: extractClinicContext(dentist),
    rating: Number((dentist?.rating || fallbackRating).toFixed(1)),
    reviews: dentist?.reviewCount || dentist?.reviews || 0,
    price: dentist?.consultationFee || dentist?.price || 0,
    image: resolveAvatar(avatarPath, dentist?.id || dentist?.userId),
    distanceKm: distance,
    distanceText:
      typeof distance === 'number' ? `${distance.toFixed(1)} km` : dentist?.distanceText || '—',
    raw: dentist,
  };
};

export const useNearbyDentists = ({
  radius = 8,
  limit = 6,
  autoFetch = true,
  type = 'clinic',
  specialization,
} = {}) => {
  const [dentists, setDentists] = useState([]);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState('undetermined');
  const [coords, setCoords] = useState(null);
  const [usedMockData, setUsedMockData] = useState(false);
  const [usedDefaultLocation, setUsedDefaultLocation] = useState(false);
  const [searchMeta, setSearchMeta] = useState(DEFAULT_SEARCH_META);

  const fetchWithCoords = useCallback(
    async (currentCoords, options = {}) => {
      if (!currentCoords) {
        throw new Error('Koordinat tidak tersedia');
      }

      console.log('🦷 [useNearbyDentists] Fetching dentists with coords:', JSON.stringify(currentCoords));
      
      const response = await getNearbyDentists({
        latitude: currentCoords.latitude,
        longitude: currentCoords.longitude,
        radius,
        limit,
        ...(type && type !== 'all' ? { type } : {}),
        ...(specialization ? { specialization } : {}),
      });

      console.log('🦷 [useNearbyDentists] Dentists count:', response?.dentists?.length);

      const items = response?.dentists || [];
      if (!items.length) {
        if (!options.isDefaultAttempt) {
          console.log('ℹ️ [useNearbyDentists] No dentists near coords, retrying with default Jakarta location');
          setUsedDefaultLocation(true);
          await fetchWithCoords(DEFAULT_COORDS, { isDefaultAttempt: true });
          return;
        }

        console.log('ℹ️ [useNearbyDentists] No dentists found in database even with default location');
        setDentists([]);
        setUsedMockData(false);
        setUsedDefaultLocation(true);
        setSearchMeta({
          locationSource: 'default',
          coordsUsed: currentCoords,
          radiusRequested: radius,
          backendSearch: response?.search || null,
          timestamp: new Date().toISOString(),
          fallbackUsed: true,
          resultCount: 0,
        });
        return;
      }

      console.log('✅ [useNearbyDentists] Normalizing', items.length, 'dentists');
      const normalized = items.map((d) => normalizeDentist(d));
      const enhanced = attachDistanceDiagnostics(normalized, currentCoords, response?.search);
      setDentists(enhanced);
      setUsedMockData(false);
      if (options.isDefaultAttempt) {
        setUsedDefaultLocation(true);
      }

      setSearchMeta({
        locationSource: options.isDefaultAttempt ? 'default' : 'gps',
        coordsUsed: currentCoords,
        radiusRequested: radius,
        backendSearch: response?.search || null,
        timestamp: new Date().toISOString(),
        fallbackUsed: Boolean(options.isDefaultAttempt),
        resultCount: enhanced.length,
      });
    },
    [limit, radius, specialization, type]
  );

  const requestLocationAndFetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('📍 [useNearbyDentists] Requesting location permission...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);
      console.log('📍 [useNearbyDentists] Permission status:', status);

      let positionCoords = null;
      if (status === 'granted') {
        try {
          console.log('📍 [useNearbyDentists] Getting current position...');
          const position = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          const isValidIndonesia = lat >= -11 && lat <= 6 && lon >= 95 && lon <= 141;
          
          if (isValidIndonesia) {
            positionCoords = position.coords;
            console.log('✅ [useNearbyDentists] Got valid Indonesia coordinates');
            setUsedDefaultLocation(false);
          } else {
            console.log('ℹ️ [useNearbyDentists] GPS outside Indonesia, using default Jakarta coords');
            positionCoords = DEFAULT_COORDS;
            setUsedDefaultLocation(true);
          }
        } catch (positionError) {
          console.log('🔍 [useNearbyDentists] Failed to get position:', positionError.message);
          positionCoords = DEFAULT_COORDS;
          setUsedDefaultLocation(true);
        }
      } else {
        console.log('📍 [useNearbyDentists] Permission denied, using default Jakarta coordinates');
        positionCoords = DEFAULT_COORDS;
        setUsedDefaultLocation(true);
      }

      setCoords(positionCoords);
      await fetchWithCoords(positionCoords);
    } catch (err) {
      console.log('🔍 [useNearbyDentists] Failed to load nearby dentists:', err.message);
      const errorMessage = err.message || 'Tidak dapat memuat dokter terdekat.';
      setError(errorMessage);
      setDentists([]);
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
      console.log('🔍 [useNearbyDentists] Failed to refresh nearby dentists:', err.message);
      const errorMessage = err.message || 'Tidak dapat menyegarkan daftar dokter.';
      setError(errorMessage);
      setDentists([]);
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
    dentists,
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

export default useNearbyDentists;
