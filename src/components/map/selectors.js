import { createSelector } from 'reselect';

// utils
import layerSpec, { FOOD_LAYERS, WATER_SPECS } from 'utils/layers/layers';
import { reduceParams, reduceSqlParams } from 'utils/layers/params-parser';
import { getBounds } from 'utils/map';

// constants
import { BASELINE_WATER_INDICATORS_IDS, SUPPLY_CHAIN_LAYER_ID, ALLOWED_WATER_INDICATOR_KEYS_BY_SCOPE, ID_LOOKUP, WATER_INDICATORS } from 'constants/water-indicators';
import { CROP_OPTIONS } from 'constants/crops';
import capitalize from 'lodash/capitalize';
import { MAP_OPTIONS, BASEMAPS } from './constants';

// helpers
import { getWaterLayerName } from './legend/legend-item/selectors';

const getMapState = state => state.map;
const getBasemapId = state => state.map.basemap;
const getLayerParametrization = state => state.map.parametrization;
const getDatasets = state => state.datasets.list;
const getFilters = state => state.filters;
const getCountries = state => state.countries.list;
const getSidebarWidth = state => state.sidebar.width;

export const getCountryBounds = createSelector(
  [getFilters, getCountries, getSidebarWidth],
  (_filters = {}, _countries = [], _sidebarWidth) => {
    const { scope, country } = _filters;

    if (!_countries.length) return ({ bbox: null });

    if (scope === 'country' && country) {
      const countryData = _countries.find(_country => _country.id === country);

      if (countryData) {
        return ({
          bbox: getBounds(countryData),
          options: { paddingTopLeft: [_sidebarWidth, 0] }
        });
      }
    }

    return ({
      bbox: null,
      options: { paddingTopLeft: [_sidebarWidth, 0] }
    });
  }
);

export const parseMapState = createSelector(
  [getMapState],
  (_mapState = {}) => ({
    ...MAP_OPTIONS,
    zoom: _mapState.zoom,
    center: _mapState.center
  })
);

export const getBasemap = createSelector(
  [getBasemapId],
  (basemapId) => {
    const currentBasemap = BASEMAPS[basemapId] || {};
    const { value, options } = currentBasemap;

    return ({
      url: value,
      options
    });
  }
);

export const getActiveLayers = createSelector(
  [getDatasets, getFilters, getWaterLayerName, getLayerParametrization],
  (_datasets, _filters = {}, _waterLayerName, _layerParametrization) => {
    const layerList = [];
    const isWater = (_filters.indicator !== 'none') && (ALLOWED_WATER_INDICATOR_KEYS_BY_SCOPE[_filters.scope] || []).includes(ID_LOOKUP[_filters.indicator]);
    let isMask;
    let isCrop;
    let isOneCrop;
    let currentLayer;

    _datasets.forEach((dataset) => {
      if (dataset.layer && dataset.layer.length) {
        // isFood = (dataset.id === _filters.food);
        isMask = (_filters.scope === 'country' && _filters.country && dataset.id === 'ea9dacf1-c11e-4e6a-ad63-8804111a75ba');
        isCrop = (!isWater && dataset.id === '86d9f802-fabf-46e7-83ed-7c5505140208');
        isOneCrop = (!isWater && _filters.crop !== 'all' && dataset.id === '86d9f802-fabf-46e7-83ed-7c5505140208');

        if (isWater) {
          const indicatorKey = ID_LOOKUP[_filters.indicator];

          if (!(ALLOWED_WATER_INDICATOR_KEYS_BY_SCOPE[_filters.scope] || []).includes(indicatorKey)) return;

          let family;
          if (_filters.scope === 'supply_chain') {
            family = 'baseline-threshold';
          } else {
            family = _filters.year === 'baseline' ? 'baseline' : 'projected';
          }

          if (dataset.id !== WATER_SPECS[family]) return;
          const currentWaterSpec = layerSpec.find(_layer => _layer.family === family);

          if (!currentWaterSpec) return;

          if (dataset.id === currentWaterSpec.id) {
            currentLayer = dataset.layer.find((_layer) => {
              if (_filters.scope === 'supply_chain') return _layer.id === SUPPLY_CHAIN_LAYER_ID;
              return _layer.id === _filters.indicator;
            });
          }

          // Override the legend based on indicator, since this layer doesn't imply a specific indicator
          if (currentLayer && indicatorKey && WATER_INDICATORS[indicatorKey]) currentLayer.legendConfig = WATER_INDICATORS[indicatorKey];
        }

        if (isCrop) currentLayer = dataset.layer.find(_layer => (_filters.crop !== 'all' ? _layer.legendConfig.sqlQuery : _layer.default));
        if (isOneCrop) currentLayer = dataset.layer.find(_layer => _layer.id === '383f2ae6-6925-49e8-9e56-e5a84b38fd4a');
        if (isMask) currentLayer = dataset.layer.find(_layer => _layer.default);

        if (currentLayer && (isWater || isMask || isCrop || isOneCrop)) {
          const metadata = (dataset.metadata && dataset.metadata.length)
            ? dataset.metadata[0] : null;
          const layerSpecAttrs = layerSpec.find(l => l.id === dataset.id) || {};
          const { layerConfig } = currentLayer;
          const {
            params_config: paramsConfig,
            sql_config: sqlConfig
          } = layerConfig;

          let filters = _filters;
          // for case irigiation 'all' we won't send anything
          if (_filters.irrigation === 'all') {
            const { irrigation, ...restFilters } = _filters;
            filters = restFilters;
          }

          if (_filters.crop === 'all') {
            const { crop, ...restFilters } = filters;
            filters = restFilters;
          }

          if (isWater && BASELINE_WATER_INDICATORS_IDS.includes(currentLayer.id) && _filters.crop === 'all') {
            filters = {
              ...filters,
              rank: '1'
            };
          }

          const sqlParams = reduceSqlParams(sqlConfig, filters);

          const getLayerName = (sqlP) => {
            if (isWater) {
              if (sqlP.where.crop) {
                return `${_waterLayerName} ${capitalize(sqlP.where.crop)}`;
              }
              return _waterLayerName;
            }
            if (isOneCrop) {
              const crop = CROP_OPTIONS.find(_crop => _crop.value === filters.crop) || {};
              return crop.label;
            }
            if (isCrop) return layerSpecAttrs.name;

            return layerSpecAttrs.name;
          };

          const layer = {
            ...currentLayer,
            id: currentLayer.id,
            name: getLayerName(sqlParams),
            country: _filters.country,
            category: layerSpecAttrs.category,
            options: layerSpecAttrs.layerOptions,
            metadata,
            ...paramsConfig && { params: reduceParams(paramsConfig, filters) },
            ...sqlConfig && { sqlParams },
            ...{ opacity: currentLayer.opacity || _layerParametrization.opacity }
          };

          layerList.push(layer);
        }
      }
    });

    // puts country mask always in the last place
    layerList.sort((current, next) => {
      const maskLayerId = 'ea9dacf1-c11e-4e6a-ad63-8804111a75ba';

      if (current.id === maskLayerId && next.id !== maskLayerId) return 1;
      if (current.id !== maskLayerId && next.id === maskLayerId) return -1;

      return 0;
    });

    return layerList;
  }
);

export const getFoodLayers = createSelector(
  [getDatasets, getFilters],
  (_datasets, _filters) => {
    const layers = [];
    if (!_filters.food || _filters.food === 'none') return [];

    const currentLayerSpec = layerSpec.find(_layerSpec => _layerSpec.id === _filters.food);
    const datasetFound = _datasets.find(_dataset => _dataset.id === _filters.food);

    if (!datasetFound) return layers;
    const { metadata } = datasetFound;

    const layerFound = datasetFound.layer.find(_layer => FOOD_LAYERS.includes(_layer.id));
    if (layerFound) {
      layers.push({
        ...layerFound,
        name: currentLayerSpec.name,
        disableOpacity: true,
        ...currentLayerSpec && { options: currentLayerSpec.layerOptions },
        ...(metadata && metadata[0]) && { metadata: metadata[0] }
      });
    }

    return layers;
  }
);

export const getLayerGroup = createSelector(
  [getActiveLayers, getFoodLayers],
  (_layers, _foodLayers) => [..._layers, ..._foodLayers].filter(_layer => !_layer.isMarkerLayer && _layer.category !== 'mask')
    .map((_layer, index) => ({
      dataset: `random_id-${index}`,
      visibility: true,
      ..._layer.disableOpacity && { disableOpacity: true },
      layers: [({
        ..._layer,
        active: true
      })]
    }))
);

export const getSupplyChainLocations = state => (state.filters.supplyChainLocations || []);

export default {
  getMapState,
  getActiveLayers,
  getFoodLayers,
  getLayerGroup
};
