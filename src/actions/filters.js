import * as Cookies from 'js-cookie';
import { toastr } from 'react-redux-toastr';

// constants
import { SET_FILTERS, RESET_FILTERS } from 'constants/filters';
import { SET_SUPPLY_CHAIN_ANALYSIS_VIEW } from 'constants/supply-analyzer';
import { DEFAULT_ANALYSIS_VIEW } from 'constants/analysis-indicators';
import MESSAGES from 'constants/messages';
import {
  BASELINE_WATER_INDICATORS,
  PROJECTED_WATER_INDICATORS_ABSOLUTE,
  PROJECTED_WATER_INDICATORS_CHANGE
} from 'constants/water-indicators';

export function setFilters(filters) {
  return (dispatch, getState) => {
    const { filters: { year, type } } = getState();

    let waterIndicators = [];

    if (year === 'baseline') waterIndicators = BASELINE_WATER_INDICATORS;

    if (year !== 'baseline') {
      if (type === 'absolute') waterIndicators = PROJECTED_WATER_INDICATORS_ABSOLUTE;

      waterIndicators = PROJECTED_WATER_INDICATORS_CHANGE;
    }

    // TO-DO: move away. WARNING
    const newFilters = Object.assign({}, getState().filters, filters);
    const nextWaterIndicator = waterIndicators.find(w => w.value === newFilters.indicator);
    const { warning } = nextWaterIndicator || {};

    if (warning) {
      if (!Cookies.get(`${newFilters.indicator}-${warning}`) && newFilters.irrigation === 'rainfed') {
        toastr.warning(MESSAGES[warning]);
        Cookies.set(`${newFilters.indicator}-${warning}`, true);
      }
    }

    dispatch({
      type: SET_FILTERS,
      payload: filters
    });
  };
}

export function resetFilters() {
  return (dispatch, getState) => {
    const { filters: { scope } } = getState();

    dispatch({ type: RESET_FILTERS });

    // In the supply-chain analyzer the meaningful filters are the results
    // filters (watershed / crop / business unit) which live in the analysis
    // view, so clear those back to their defaults too. Dispatched as a raw
    // action to avoid an actions <-> actions import cycle.
    if (scope === 'supply_chain') {
      dispatch({
        type: SET_SUPPLY_CHAIN_ANALYSIS_VIEW,
        payload: {
          resultFilters: { ...DEFAULT_ANALYSIS_VIEW.resultFilters },
          resultSort: DEFAULT_ANALYSIS_VIEW.resultSort,
          resultGrouping: DEFAULT_ANALYSIS_VIEW.resultGrouping,
        },
      });
    }
  };
}

export default { setFilters };
