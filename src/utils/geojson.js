/**
 * GeoJSON utilities.
 *
 * Converts InputPanel entries (latlong or country) into valid GeoJSON
 * structures that can be posted to the WRI Geostore API.
 */

const KM_PER_DEG_LAT = 111.32;

/**
 * Builds a closed GeoJSON Polygon that approximates a circle.
 *
 * Accounts for latitude-dependent longitude scaling so the circle
 * appears round on the ground rather than stretched near the poles.
 *
 * @param {number} lat       - Centre latitude  (degrees)
 * @param {number} lng       - Centre longitude (degrees)
 * @param {number} radiusKm  - Radius in kilometres
 * @param {number} numPoints - Number of vertices (default 64)
 * @returns {Object} GeoJSON Polygon geometry
 */
export function circlePolygon(lat, lng, radiusKm, numPoints = 64) {
  const latRad = (lat * Math.PI) / 180;
  const kmPerDegLng = KM_PER_DEG_LAT * Math.cos(latRad);
  const coords = [];

  for (let i = 0; i <= numPoints; i++) {
    const angle = (i / numPoints) * 2 * Math.PI;
    const dLat = (radiusKm * Math.sin(angle)) / KM_PER_DEG_LAT;
    const dLng = (radiusKm * Math.cos(angle)) / kmPerDegLng;
    coords.push([lng + dLng, lat + dLat]);
  }

  return { type: 'Polygon', coordinates: [coords] };
}

/**
 * Converts a single InputPanel entry to a GeoJSON Feature.
 *
 * - `latlong` entries with a radius become a Polygon (circle approximation).
 * - `latlong` entries without a radius become a Point.
 * - `country` entries carry a null geometry; country boundaries are
 *   resolved server-side by the Geostore API using the ISO code.
 *
 * @param {Object} entry - InputPanel entry object
 * @returns {Object|null} GeoJSON Feature or null if the entry is invalid
 */
export function entryToFeature(entry) {
  if (entry.type === 'latlong') {
    const lat = parseFloat(entry.latitude);
    const lng = parseFloat(entry.longitude);
    const radius = entry.radius ? parseFloat(entry.radius) : null;

    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

    const geometry = radius && radius > 0
      ? circlePolygon(lat, lng, radius)
      : { type: 'Point', coordinates: [lng, lat] };

    return {
      type: 'Feature',
      geometry,
      properties: {
        type: 'latlong',
        crop: entry.crop || null,
        irrigation: entry.irrigation || null,
        volume: entry.volume ? parseFloat(entry.volume) : null,
        radius: radius || null,
      },
    };
  }

  if (entry.type === 'country') {
    return {
      type: 'Feature',
      // Boundaries are resolved by the Geostore API from the ISO code
      geometry: null,
      properties: {
        type: 'country',
        iso: entry.country || null,
        state: entry.state || null,
        irrigation: entry.irrigation || null,
        volume: entry.volume ? parseFloat(entry.volume) : null,
      },
    };
  }

  return null;
}

/**
 * Converts an array of InputPanel entries to a GeoJSON FeatureCollection.
 *
 * @param {Object[]} entries    - Array of InputPanel entry objects
 * @param {Object}  [properties={}] - Optional top-level properties to attach
 * @returns {Object} GeoJSON FeatureCollection
 */
export function toGeoJsonCollection(entries = [], properties = {}) {
  return {
    type: 'FeatureCollection',
    features: entries.map(entryToFeature).filter(Boolean),
    ...(Object.keys(properties).length > 0 && { properties }),
  };
}

export default { circlePolygon, entryToFeature, toGeoJsonCollection };
