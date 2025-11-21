/**
 * Geolocation Utilities
 * Calculate distances using Haversine formula
 */

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

/**
 * Convert degrees to radians
 * @param {number} degrees 
 * @returns {number} Radians
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate bounding box for efficient database queries
 * @param {number} lat - Center latitude
 * @param {number} lon - Center longitude
 * @param {number} radiusKm - Radius in kilometers
 * @returns {object} Bounding box {minLat, maxLat, minLon, maxLon}
 */
function getBoundingBox(lat, lon, radiusKm) {
  const latDelta = radiusKm / 111.32; // 1 degree latitude ≈ 111.32 km
  const lonDelta = radiusKm / (111.32 * Math.cos(toRadians(lat))); // Adjust for longitude

  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLon: lon - lonDelta,
    maxLon: lon + lonDelta
  };
}

/**
 * Validate GPS coordinates
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {boolean} True if valid
 */
function isValidCoordinates(lat, lon) {
  return (
    lat !== null && 
    lon !== null &&
    lat >= -90 && 
    lat <= 90 && 
    lon >= -180 && 
    lon <= 180
  );
}

module.exports = {
  calculateDistance,
  getBoundingBox,
  isValidCoordinates,
  toRadians
};
