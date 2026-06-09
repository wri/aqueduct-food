import WRISerializer from 'wri-json-api-serializer';

// utils
import { WRIAPI } from 'utils/axios';
import { toGeoJsonCollection } from 'utils/geojson';

/**
 * Fetches an existing geostore by ID.
 *
 * @param {string} id - Geostore ID to retrieve
 * @returns {Promise<Object>} Serialized geostore object
 */
export const fetchGeostore = id => WRIAPI.get(`/v1/geostore/${id}`)
  .then(({ status, statusText, data }) => {
    if (status >= 400) throw new Error(statusText);
    return WRISerializer(data);
  });

/**
 * Creates a new geostore from an array of InputPanel entries.
 *
 * Each entry is converted to a GeoJSON Feature via `entryToFeature`:
 * - `latlong` entries without a radius → Point geometry
 * - `latlong` entries with a radius    → Polygon (circle approximation)
 * - `country` entries                  → null geometry; boundaries resolved
 *                                        server-side from the ISO code
 *
 * @param {Object[]} entries        - Array of InputPanel entry objects
 * @param {Object}  [properties={}] - Optional metadata to attach to the
 *                                    FeatureCollection (e.g. { name, crop })
 * @returns {Promise<Object>} Serialized geostore object, including the
 *                            `id` needed to reference the stored geometry
 */
export const saveGeostore = (entries, properties = {}) => WRIAPI.post('/v1/geostore', toGeoJsonCollection(entries, properties))
  .then(({ status, statusText, data }) => {
    if (status >= 400) throw new Error(statusText);
    return WRISerializer(data);
  });

export default { fetchGeostore, saveGeostore };
