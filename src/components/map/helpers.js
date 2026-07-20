import template from 'lodash/template';
import { concatenation } from 'layer-manager/dist/layer-manager';
import axios from 'axios';
import capitalize from 'lodash/capitalize';
import { toastr } from 'react-redux-toastr';

// services
import { fetchQuery } from 'services/query';

// utils
import { reduceParams, reduceSqlParams } from 'utils/layers/params-parser';
import { getMarkerLayer } from 'utils/layers/markers/bubble-layer';
import { validateEntry, entryStatus } from 'utils/supply-analyzer';
import { bwsCatColor, AQUEDUCT_NO_DATA_COLOR } from 'utils/analysis-widgets';

// constants
import { CROP_OPTIONS } from 'constants/crops';
import { ZOOM_DISPLAYS_TOP } from './constants';

export const getBuckets = (layer = {}, filters = {}) => {
  const { layerConfig, legendConfig } = layer;
  const { sql_query: sqlQuery, sql_config: sqlConfig } = legendConfig;
  const { account } = layerConfig;
  const sqlParams = reduceSqlParams(sqlConfig, filters);
  const url = `https://${account}.carto.com/api/v2/sql`;
  const query = concatenation(sqlQuery, sqlParams);

  return fetchQuery(url, { q: query });
};

export const generateCartoCSS = (cartocss, params) => {
  const cartoCssTemplate = template(cartocss, { interpolate: /{{([\s\S]+?)}}/g });
  const { bucket, color } = params;

  return cartoCssTemplate({ bucket, color });
};

export const updateCartoCSS = async (layer = {}, options = {}) => {
  const { layerConfig } = layer;
  const data = await getBuckets(layer, options);
  const { bucket } = ((data || [])[0] || {});
  const cartocssTemplate = layerConfig.body.layers[0].options.cartocss;
  const { color } = CROP_OPTIONS.find(c => c.value === options.crop);

  if (!bucket) return ({ ...layer });

  const cartocss = generateCartoCSS(cartocssTemplate, { bucket, color });

  return ({
    ...layer,
    layerConfig: {
      ...layer.layerConfig,
      body: {
        ...layer.layerConfig.body,
        layers: [{
          ...layer.layerConfig.body.layers[0],
          options: {
            ...layer.layerConfig.body.layers[0].options,
            cartocss
          }
        }]
      }
    }
  });
};

export const getMarkersByZoom = (layer, _markers = [], zoom) => {
  let markers = _markers;
  const { options } = layer;
  const { sort, topSize, dataManipulator } = options || {};
  if (!markers.length) return [];

  const defaultSortFunction = (a, b) => {
    const valueA = Math.abs(+a.properties.value);
    const valueB = Math.abs(+b.properties.value);

    if (valueA < valueB) return sort === 'desc' ? 1 : -1;
    if (valueA > valueB) return sort === 'desc' ? -1 : 1;
    return 0;
  };

  if (ZOOM_DISPLAYS_TOP.includes(zoom)) {
    if (dataManipulator) return dataManipulator(markers);

    const sortedMarkers = markers.sort(defaultSortFunction);
    if (topSize && markers.length >= topSize) markers = sortedMarkers.slice(0, topSize);
  }

  return markers;
};


export const prepareMarkerLayer = async (_layer = {}, _params = {}, _zoom) => {
  const { layerConfig } = _layer;
  const {
    params_config: paramsConfig,
    sql_config: sqlConfig
  } = layerConfig;

  let params = _params;

  // changes baseline for 2020
  if (_params.year === 'baseline') {
    params = {
      ..._params,
      year: 2020
    };
  }

  params = {
    ...params,
    ...(params.crop !== 'all') && { commodity: capitalize(params.crop) }
  };

  const layer = {
    ..._layer,
    ...paramsConfig && { params: reduceParams(paramsConfig, params) },
    ...sqlConfig && { sqlParams: reduceSqlParams(sqlConfig, params) }
  };
  const { sqlParams } = layer;

  const layerUrl = concatenation(layerConfig.body.url, sqlParams);

  const geojson = await axios.get(layerUrl, {
    transformResponse: [].concat(
      axios.defaults.transformResponse,
      (data => ((data.rows || [])[0] || {}).data)
    )
  })
    .then((response) => {
      const { status, statusText, data } = response;
      if (status >= 300) throw new Error(statusText);

      return data;
    })
    .catch((error) => { console.error(error.message); });

  if (!geojson.features || !geojson.features.length) toastr.warning('No data available', 'No data available to display from food security parameters with the current combination of filters.');

  const markers = getMarkersByZoom(layer, geojson.features || [], _zoom);

  if (params.country) {
    const countryMaker = markers.filter(_marker => _marker.properties.iso === params.country);

    return getMarkerLayer(countryMaker, _layer);
  }

  return getMarkerLayer(markers, _layer);
};

const SUPPLY_CHAIN_LAYER_STYLE = {
  color: '#e84040',
  fillColor: '#e84040',
  weight: 1.5,
  opacity: 0.9,
  fillOpacity: 0.35,
};

const escapeHTML = value => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const formatBasinValue = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return String(value);
    if (Number.isInteger(value)) return value.toLocaleString();
    return value.toFixed(Math.abs(value) >= 100 ? 2 : 4);
  }
  return escapeHTML(value);
};

const buildLocationPopup = (properties = {}) => {
  const title = properties.businessUnit || 'Location';
  const cropLabel = CROP_OPTIONS.find(c => c.value === properties.crop)?.label
    || properties.crop;
  const irrigation = properties.irrigation
    ? capitalize(properties.irrigation)
    : null;

  const rows = [
    cropLabel && { label: 'Crop', value: cropLabel },
    irrigation && { label: 'Irrigation', value: irrigation },
    properties.radiusKm != null && { label: 'Radius', value: `${properties.radiusKm} km` },
    properties.volume && { label: 'Volume', value: properties.volume },
    properties.latitude != null && properties.longitude != null && {
      label: 'Coordinates',
      value: `${parseFloat(properties.latitude).toFixed(4)}, ${parseFloat(properties.longitude).toFixed(4)}`,
    },
  ].filter(Boolean);

  const body = rows.map(({ label, value }) => (
    `<div class="dc"><span class="dt">${escapeHTML(label)}</span><span class="dd">${formatBasinValue(value)}</span></div>`
  )).join('');

  return `<div class="c-infowindow">
    <h3>${escapeHTML(title)}</h3>
    ${body ? `<div class="dl">${body}</div>` : ''}
  </div>`;
};

const bindLocationPopup = (feature, layer) => {
  if (feature && feature.properties) {
    layer.bindPopup(buildLocationPopup(feature.properties), {
      closeButton: true,
      className: 'basin-popup',
      maxHeight: 240,
    });
  }
};

/**
 * Converts valid (non-erroring) lat/long supply-chain entries into a
 * Leaflet geoJSON layer spec ready for LayerManager.
 *
 * Uses `window.L` (consistent with how PluginLeaflet itself accesses Leaflet)
 * inside `pointToLayer` so that L.circle / L.circleMarker are always the
 * runtime instances, not a module-scoped import that could differ.
 *
 * A timestamp is appended to the id on every call so that LayerManager always
 * mounts a fresh <Layer> when entries change (same pattern as getMarkerLayer).
 *
 * @param {Object[]} entries - InputPanel entry objects
 * @returns {Object|null} layer spec or null when there are no valid entries
 */
export const getSupplyChainLocationsLayer = (entries = []) => {
  const valid = entries.filter(
    e => e.type === 'latlong' && entryStatus(validateEntry(e)) !== 'error'
  );

  if (!valid.length) return null;

  const features = valid.map(entry => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [parseFloat(entry.longitude), parseFloat(entry.latitude)],
    },
    properties: {
      businessUnit: entry.businessUnit,
      latitude: entry.latitude,
      longitude: entry.longitude,
      radiusM: entry.radius ? parseFloat(entry.radius) * 1000 : null,
      radiusKm: entry.radius ? parseFloat(entry.radius) : null,
      crop: entry.crop,
      irrigation: entry.irrigation,
      volume: entry.volume,
    },
  }));

  return {
    id: `supply-chain-locations-${Date.now()}`,
    provider: 'leaflet',
    isSupplyChainLayer: true,
    layerConfig: {
      type: 'geoJSON',
      parse: false,
      body: { type: 'FeatureCollection', features },
      options: {
        // pointToLayer is kept as a live function so it is NOT JSON-serialised.
        // window.L mirrors what PluginLeaflet uses internally.
        pointToLayer: (feature, latlng) => {
          const { L } = window;
          const { radiusM } = feature.properties;
          if (radiusM) {
            return L.circle(latlng, { ...SUPPLY_CHAIN_LAYER_STYLE, radius: radiusM });
          }
          return L.circleMarker(latlng, {
            ...SUPPLY_CHAIN_LAYER_STYLE,
            radius: 7,
            fillOpacity: 0.85,
          });
        },
        onEachFeature: bindLocationPopup,
      },
    },
    legendConfig: {},
  };
};

// Basins returned by the food-supply-chain analysis are filled with the
// official Aqueduct Baseline Water Stress ramp so their colour matches the
// rest of the tool. The fill is driven by the basin's BWS category and is kept
// constant regardless of the active results indicator (e.g. SBTN).
const SUPPLY_CHAIN_BASIN_STYLE = {
  color: '#334155',
  weight: 1.25,
  opacity: 0.9,
  fill: true,
  fillOpacity: 0.65,
};

// Resolves the Aqueduct BWS category for a basin feature, preferring the
// explicit category and falling back to the score, then to no-data.
const basinBwsCat = (properties = {}) => {
  const toNum = (v) => {
    if (v === null || v === undefined || v === '') return null;
    const n = typeof v === 'number' ? v : parseFloat(v);
    return Number.isFinite(n) ? n : null;
  };
  const cat = toNum(properties.bws_cat);
  if (cat !== null) return cat;
  return toNum(properties.bws_score);
};

const supplyChainBasinStyle = (feature) => {
  const cat = basinBwsCat(feature && feature.properties);
  const fillColor = cat === null ? AQUEDUCT_NO_DATA_COLOR : bwsCatColor(cat);
  return { ...SUPPLY_CHAIN_BASIN_STYLE, fillColor };
};

// Friendly labels + display order for the basin popup. Mirrors the analysis
// results table; any extra keys the API returns are appended using their raw
// key so the popup stays forward-compatible.
const BASIN_POPUP_LABELS = {
  pfaf_id: 'Basin (PFAF)',
  country: 'Country',
  state: 'State',
  iso_code: 'ISO',
  commodity: 'Crop',
  irrigation: 'Irrigation',
  total_volume: 'Total Volume (MT)',
  bws_label: 'BWS Label',
  bws_cat: 'BWS Category',
  bws_score: 'BWS Score',
  bws_raw: 'BWS Raw',
  sbtn_quant_max: 'SBTN Quantity',
  sbtn_qual_max: 'SBTN Quality',
  basin_production: 'Basin Production',
  summed_production: 'Summed Production',
  production_sourced_from_basin: 'Sourced From Basin',
};

// Keys handled in the popup header (title) so they aren't repeated in the body.
const BASIN_POPUP_HEADER_KEYS = new Set(['unique_id', 'business_unit', 'pfaf_id']);

const buildBasinPopup = (properties = {}) => {
  const commodity = properties.commodity || properties.commodity_code;
  const popupProps = commodity != null && commodity !== ''
    ? { ...properties, commodity }
    : properties;
  const title = popupProps.business_unit || popupProps.country
    || (popupProps.pfaf_id != null ? `Basin ${popupProps.pfaf_id}` : 'Basin');
  const subtitle = popupProps.pfaf_id != null ? `PFAF ${escapeHTML(popupProps.pfaf_id)}` : '';

  const orderedKeys = Object.keys(BASIN_POPUP_LABELS)
    .filter(key => !BASIN_POPUP_HEADER_KEYS.has(key) && key in popupProps);
  const extraKeys = Object.keys(popupProps)
    .filter(key => !(key in BASIN_POPUP_LABELS) && !BASIN_POPUP_HEADER_KEYS.has(key)
      && key !== 'commodity_code');

  const rows = [...orderedKeys, ...extraKeys].map((key) => {
    const label = BASIN_POPUP_LABELS[key] || key;
    return `<div class="dc"><span class="dt">${escapeHTML(label)}</span><span class="dd">${formatBasinValue(popupProps[key])}</span></div>`;
  }).join('');

  return `<div class="c-infowindow">
    <h3>${escapeHTML(title)}</h3>
    ${subtitle ? `<span class="basin-popup-subtitle">${subtitle}</span>` : ''}
    <div class="dl">${rows}</div>
  </div>`;
};

/**
 * Converts the GeoJSON FeatureCollection of matched basins (returned by
 * `runFoodSupplyChainAnalysis` when `geometry: true`) into a Leaflet geoJSON
 * layer spec with blue borders, ready for LayerManager.
 *
 * `style` is kept as a live function (layerConfig.parse === false) so it is
 * passed straight to L.geoJSON instead of being JSON-serialised.
 *
 * @param {Object|null} geojson - GeoJSON FeatureCollection of basins
 * @returns {Object|null} layer spec or null when there is no geometry
 */
export const getSupplyChainBasinsLayer = (geojson) => {
  if (!geojson || !geojson.features || !geojson.features.length) return null;

  return {
    id: `supply-chain-basins-${Date.now()}`,
    provider: 'leaflet',
    isSupplyChainBasinLayer: true,
    layerConfig: {
      type: 'geoJSON',
      parse: false,
      body: geojson,
      options: {
        style: supplyChainBasinStyle,
        // Bind a popup with the basin's analysis row. Kept as a live function
        // (layerConfig.parse === false) so it survives un-serialised.
        onEachFeature: (feature, layer) => {
          if (feature && feature.properties) {
            layer.bindPopup(buildBasinPopup(feature.properties), {
              closeButton: true,
              className: 'basin-popup',
              maxHeight: 320,
            });
          }
        },
      },
    },
    legendConfig: {},
  };
};

export default {
  updateCartoCSS,
  prepareMarkerLayer,
  getSupplyChainLocationsLayer,
  getSupplyChainBasinsLayer
};
