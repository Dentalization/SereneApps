import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { getNearbyClinics } from '../services/clinicService';

const DEFAULT_COORDS = {
  latitude: -6.2088,   // Jakarta, Indonesia
  longitude: 106.8456,
};

// Use real location when available, fallback to Jakarta if permission denied
const USE_MOCK_LOCATION = false;

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

  const fetchWithCoords = useCallback(
    async (currentCoords) => {
      if (!currentCoords) {
        throw new Error('Koordinat tidak tersedia');
      }
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
      
      if (!items || items.length === 0) {
        console.warn('⚠️ [useNearbyClinics] No clinics found in response');
        setClinics([]);
        setUsedMockData(false);
        return;
      }
      
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
            console.log('✅ [useNearbyClinics] Got valid Indonesia coordinates:', coordinates);
            setUsedDefaultLocation(false);
          } else {
            console.log('ℹ️ [useNearbyClinics] GPS location is outside Indonesia (simulator detected)');
            console.log('ℹ️ [useNearbyClinics] Received GPS:', { lat, lon });
            console.log('📍 [useNearbyClinics] Using Jakarta default for better results');
            coordinates = DEFAULT_COORDS;
            setUsedDefaultLocation(true);
          }
        } catch (positionError) {
          console.error('❌ [useNearbyClinics] Failed to get position:', positionError);
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
      console.error('❌ [useNearbyClinics] Failed to load nearby clinics:', err);
      console.error('❌ [useNearbyClinics] Error details:', err.message, err.stack);
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
      console.error('❌ [useNearbyClinics] Failed to refresh clinics:', err);
      console.error('❌ [useNearbyClinics] Error details:', err.message, err.stack);
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
