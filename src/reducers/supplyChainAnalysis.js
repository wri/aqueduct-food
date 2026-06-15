import {
  SET_SUPPLY_CHAIN_ANALYSIS,
  SET_SUPPLY_CHAIN_ANALYSIS_VIEW,
  RESET_SUPPLY_CHAIN_ANALYSIS,
} from 'constants/supply-analyzer';
import { DEFAULT_ANALYSIS_VIEW } from 'constants/analysis-indicators';

// Drives where/whether the analysis results render. The controls live in the
// input header and the data (metrics + table/charts) in the section below, so
// the phase, results and the shared view state all live here in Redux.
//
//   phase: 'idle' | 'analyzing' | 'results'
const initialState = {
  phase: 'idle',
  results: null, // { results, errors, skipped, geojson }
  entries: [], // snapshot of the entries that produced the results
  error: null,
  view: { ...DEFAULT_ANALYSIS_VIEW },
};

export default function (state = initialState, action) {
  switch (action.type) {
    case SET_SUPPLY_CHAIN_ANALYSIS:
      return { ...state, ...action.payload };
    case SET_SUPPLY_CHAIN_ANALYSIS_VIEW:
      return { ...state, view: { ...state.view, ...action.payload } };
    case RESET_SUPPLY_CHAIN_ANALYSIS:
      return { ...initialState, view: { ...DEFAULT_ANALYSIS_VIEW } };
    default:
      return state;
  }
}
