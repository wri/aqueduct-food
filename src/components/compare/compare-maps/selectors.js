import { createSelector } from 'reselect';
import isEmpty from 'lodash/isEmpty';

// constants
import { MAP_OPTIONS, BASEMAPS } from 'components/map/constants';

// utils
import { getBounds } from 'utils/map';

import { updateCartoCSS } from 'components/map/helpers';

// states
const getCompareCountries = state => state.compare.countries;
const getCountries = state => state.countries.list;
const getFilters = state => state.filters;
const getBasemap = state => state.map.basemap;
const getDatasets = state => state.datasets.list;

const isSingleCropLayer = '383f2ae6-6925-49e8-9e56-e5a84b38fd4a';
const isAllCropsLayer = 'dcffe68a-2c51-4847-aa08-0f9e471a8ceb';

export const getCompareConfig = createSelector(
  [getCompareCountries, getCountries, getFilters, getBasemap, getDatasets],
  (_compareCountries, _countries, _filters, basemapId, _datasets) => {
    if (isEmpty(_compareCountries) || !_countries.length) return [{}, {}];

    return _compareCountries.map((_compareCountry) => {
      const countryData = _countries.find(_country => _country.id === _compareCountry) || {};
      const { irrigation, crop, ...restFilters } = _filters;
      const updatedFilters = {
        ...restFilters,
        ...irrigation !== 'all' && { irrigation },
        ...crop !== 'all' && { crop },
        iso: _compareCountry,
        country: _compareCountry,
        countryName: countryData.name
      };

      const layers = [];

      _datasets.forEach((ds) => {
        ds.layer.forEach((lyr) => {
          // All crops only aka. noIndicatorSelected
          if (_filters.indicator === 'none') {
            if (crop === 'all' && lyr.id === isAllCropsLayer) {
              layers.push({
                ...lyr,
                sqlParams: { and: { iso: _compareCountry } }
              });
            }
            // one crop
            if (crop !== 'all' && lyr.id === isSingleCropLayer) {
              const paramLayer = {
                ...lyr,
                sqlParams: { where: { iso: _compareCountry, crop } },
                name: 'Banana',
                category: 'crop',
                opacity: 1,
                params: {},
                country: _filters.country
              };
              updateCartoCSS(paramLayer, _filters).then((data) => {
                layers.push(data);
              });
            }
          } else {
            // All crops and IndicatorSelected
            if (crop === 'all' && lyr.id === _filters.indicator) {
              layers.push({
                ...lyr,
                sqlParams: { where: { iso: _compareCountry } }
              });
            }
            // one crop and indicator
            if (crop !== 'all' && lyr.id === _filters.indicator) {
              const paramLayer = {
                ...lyr,
                sqlParams: {
                  and: { year: _filters.year, scenario: 'business_as_usual' },
                  where: { iso: _compareCountry, crop }
                },
                name: crop,
                category: 'water',
                country: _filters.countryName
              };
              layers.push(paramLayer);
            }
          }
        });
      });

      return ({
        country: _compareCountry,
        mapConfig: {
          ...MAP_OPTIONS,
          basemap: {
            url: BASEMAPS[basemapId].value,
            options: BASEMAPS[basemapId].options
          }
        },
        bounds: { bbox: getBounds(countryData) },
        filters: updatedFilters,
        layers
      });
    });
  }
);

export default { getCompareConfig };
