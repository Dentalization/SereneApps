import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { getNearbyDentists } from '../services/dentistService';
import { API_BASE_URL } from '../services/api';

const DEFAULT_COORDS = { latitude: -6.2088, longitude: 106.8456 };
const DICEBEAR_BG = encodeURIComponent('8B5CF6,A78BFA,C4B5FD,DDD6FE');
const API_BASE = API_BASE_URL.replace(/\/$/, '');

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

  return {
    id: dentist?.id?.toString?.() || dentist?.userId?.toString?.() || `dentist-${dentist?.name}`,
    name: dentist?.name || dentist?.fullname || 'Dokter Gigi',
    specialty: dentist?.specialization || dentist?.primarySpecialization || 'Dokter Gigi',
    clinic: dentist?.clinicName || dentist?.clinic || dentist?.clinicAddress || 'Klinik gigimu',
    clinicContext: extractClinicContext(dentist),
    rating: Number((dentist?.rating || fallbackRating).toFixed(1)),
    reviews: dentist?.reviewCount || dentist?.reviews || 0,
    price: dentist?.consultationFee || dentist?.price || 0,
    image: resolveAvatar(dentist?.avatarUrl || dentist?.image, dentist?.id),
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

      console.log('🦷 [useNearbyDentists] Got response type:', typeof response);
      console.log('🦷 [useNearbyDentists] Response keys:', response ? Object.keys(response) : 'null');
      console.log('🦷 [useNearbyDentists] Dentists count:', response?.dentists?.length);

      // Service already unwraps response.data.data, so response = { dentists, pagination, search }
      const items = response?.dentists || [];
      console.log('🦷 [useNearbyDentists] Items array length:', items.length);
      
      if (!items || items.length === 0) {
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
        return;
      }

      console.log('✅ [useNearbyDentists] Normalizing', items.length, 'dentists');
      setDentists(items.map((d) => normalizeDentist(d)));
      setUsedMockData(false);
      if (options.isDefaultAttempt) {
        setUsedDefaultLocation(true);
      }
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
          
          // Check if coordinates are valid (not simulator default or outside Indonesia)
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          
          // Indonesia roughly: latitude -11 to 6, longitude 95 to 141
          const isValidIndonesia = lat >= -11 && lat <= 6 && lon >= 95 && lon <= 141;
          
          if (isValidIndonesia) {
            positionCoords = position.coords;
            console.log('✅ [useNearbyDentists] Got valid Indonesia coordinates');
            setUsedDefaultLocation(false);
          } else {
            console.log('ℹ️ [useNearbyDentists] GPS location is outside Indonesia (simulator detected)');
            console.log('ℹ️ [useNearbyDentists] Received GPS: lat=' + lat + ', lon=' + lon);
            console.log('📍 [useNearbyDentists] Using Jakarta default for better results');
            positionCoords = DEFAULT_COORDS;
            setUsedDefaultLocation(true);
          }
        } catch (positionError) {
          console.log('🔍 [useNearbyDentists] Failed to get position:', positionError.message);
          console.log('📍 [useNearbyDentists] Falling back to Jakarta coordinates');
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
  };
};

export default useNearbyDentists;
