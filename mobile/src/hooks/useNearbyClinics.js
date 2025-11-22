import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { getNearbyClinics } from '../services/clinicService';
import { NEARBY_CLINICS } from '../features/dashboard/data/clinics';

const DEFAULT_COORDS = {
  latitude: -6.2088,   // Jakarta, Indonesia
  longitude: 106.8456,
};

// Force use Jakarta coordinates for development (all clinics are in Jakarta)
const USE_MOCK_LOCATION = true;

const normalizeClinic = (clinic) => ({
  ...clinic,
  id: clinic?.id?.toString?.() || clinic?.branchId?.toString?.() || clinic?.clinicId?.toString?.(),
  distanceKm:
    typeof clinic?.distanceKm === 'number'
      ? clinic.distanceKm
      : Number(clinic?.distanceKm) || clinic?.distance_km || 0,
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
      : clinic?.reviewCount || 0,
});

export const useNearbyClinics = ({ radius = 10, limit = 6, autoFetch = true } = {}) => {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState('undetermined');
  const [coords, setCoords] = useState(null);
  const [usedMockData, setUsedMockData] = useState(false);
  const [usedDefaultLocation, setUsedDefaultLocation] = useState(false);

  const applyFallbackData = useCallback(() => {
    setClinics(
      NEARBY_CLINICS.slice(0, limit).map((clinic) => normalizeClinic(clinic))
    );
    setUsedMockData(true);
  }, [limit]);

  const fetchWithCoords = useCallback(
    async (currentCoords) => {
      if (!currentCoords) return;
      console.log('🏥 [useNearbyClinics] Fetching with coords:', currentCoords);
      const response = await getNearbyClinics({
        latitude: currentCoords.latitude,
        longitude: currentCoords.longitude,
        radius,
        limit,
      });

      console.log('🏥 [useNearbyClinics] Response:', response);
      console.log('🏥 [useNearbyClinics] Response.clinics:', response?.clinics);
      console.log('🏥 [useNearbyClinics] Clinics count:', response?.clinics?.length);

      // Service already unwraps response.data.data, so response = { clinics, pagination, search }
      const items = response?.clinics || [];
      console.log('🏥 [useNearbyClinics] Items to set:', items.length);
      setClinics(items.map((clinic) => normalizeClinic(clinic)));
      setUsedMockData(false);
    },
    [limit, radius]
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
        console.log('📍 [useNearbyClinics] Getting current position...');
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        coordinates = position.coords;
        console.log('📍 [useNearbyClinics] Got coordinates:', coordinates);
        setUsedDefaultLocation(false);
      } else {
        console.log('📍 [useNearbyClinics] Using default coordinates');
        coordinates = DEFAULT_COORDS;
        setUsedDefaultLocation(true);
      }

      setCoords(coordinates);
      await fetchWithCoords(coordinates);
    } catch (err) {
      console.error('❌ [useNearbyClinics] Failed to load nearby clinics:', err);
      console.error('❌ [useNearbyClinics] Error details:', err.message, err.stack);
      setError('Tidak dapat memuat klinik terdekat.');
      applyFallbackData();
    } finally {
      setLoading(false);
    }
  }, [applyFallbackData, fetchWithCoords]);

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
      console.error('Failed to refresh clinics:', err);
      setError('Tidak dapat menyegarkan daftar klinik.');
      applyFallbackData();
    } finally {
      setLoading(false);
    }
  }, [applyFallbackData, coords, fetchWithCoords, requestLocationAndFetch]);

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
