import { createSelector } from 'reselect';

// constants
import {
  BASELINE_WATER_INDICATORS,
  PROJECTED_WATER_INDICATORS_ABSOLUTE,
  PROJECTED_WATER_INDICATORS_CHANGE
} from 'constants/water-indicators';

// states
const getIndicator = state => state.filters.indicator;

export const getWaterLayerName = createSelector(
  [getIndicator],
  (indicator) => {
    if (!indicator) return null;

    const allWaterIndicators = [
      ...BASELINE_WATER_INDICATORS,
      ...PROJECTED_WATER_INDICATORS_ABSOLUTE,
      ...PROJECTED_WATER_INDICATORS_CHANGE
    ].reduce((acc, { name, value }) => ({
      ...acc,
      [value]: name
    }), {});


    return allWaterIndicators[indicator] || null;
  }
);

export default { getWaterLayerName };
