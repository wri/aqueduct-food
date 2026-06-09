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
      radiusM: entry.radius ? parseFloat(entry.radius) * 1000 : null,
      crop: entry.crop,
      irrigation: entry.irrigation,
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
      },
    },
    legendConfig: {},
  };
};

export default {
  updateCartoCSS,
  prepareMarkerLayer,
  getSupplyChainLocationsLayer
};
