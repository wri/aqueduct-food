import {
  SET_SUPPLY_CHAIN_ANALYSIS,
  SET_SUPPLY_CHAIN_ANALYSIS_VIEW,
  RESET_SUPPLY_CHAIN_ANALYSIS,
  SET_SUPPLY_CHAIN_REVIEW,
} from 'constants/supply-analyzer';
import { DEFAULT_ANALYSIS_VIEW } from 'constants/analysis-indicators';
import { setOutsideLandIds } from 'actions/supplyChainEntries';
import { setFilters } from 'actions/filters';
import { classifyEntries, entryStatus } from 'utils/supply-analyzer';
import { checkPointsOutsideLand, runFoodSupplyChainAnalysis } from 'services/analysis';

function getValidEntries(state) {
  const entries = state.supplyChainEntries || [];
  const outsideLandIds = state.supplyChainOutsideLand || [];
  const { validated } = classifyEntries(entries, outsideLandIds);
  return validated
    .filter(({ issues }) => entryStatus(issues) !== 'error')
    .map(({ entry }) => entry);
}

export function setSupplyChainAnalysis(payload) {
  return { type: SET_SUPPLY_CHAIN_ANALYSIS, payload };
}

export function setSupplyChainAnalysisView(payload) {
  return { type: SET_SUPPLY_CHAIN_ANALYSIS_VIEW, payload };
}

export function setSupplyChainReview(payload) {
  return { type: SET_SUPPLY_CHAIN_REVIEW, payload };
}

export function resetSupplyChainAnalysis() {
  return { type: RESET_SUPPLY_CHAIN_ANALYSIS };
}

export function openSupplyChainReview() {
  return (dispatch, getState) => {
    const entries = getState().supplyChainEntries || [];
    const latlngEntries = entries.filter(e => e.type === 'latlong');

    const finishValidation = (outsideLandIds, spatialCheckError = false) => {
      dispatch(setOutsideLandIds(Array.from(outsideLandIds)));
      dispatch(setSupplyChainReview({
        validationChecked: true,
        spatialCheckLoading: false,
        spatialCheckError,
      }));
    };

    if (!latlngEntries.length) {
      finishValidation([]);
      return;
    }

    dispatch(setSupplyChainReview({ spatialCheckLoading: true, spatialCheckError: false }));

    checkPointsOutsideLand(latlngEntries)
      .then(outsideLandIds => finishValidation(outsideLandIds))
      .catch(() => finishValidation([], true));
  };
}

export function applyValidEntriesToMap() {
  return (dispatch, getState) => {
    const valid = getValidEntries(getState());
    if (!valid.length) return;
    dispatch(setFilters({ supplyChainLocations: valid }));
  };
}

export function runSupplyChainAnalysis() {
  return (dispatch, getState) => {
    const valid = getValidEntries(getState());
    if (!valid.length) return;

    dispatch(setFilters({ supplyChainLocations: valid, supplyChainBasins: null }));
    dispatch(setSupplyChainAnalysis({
      phase: 'analyzing',
      results: null,
      entries: valid,
      error: null,
      view: { ...DEFAULT_ANALYSIS_VIEW },
    }));

    runFoodSupplyChainAnalysis(valid, { geometry: true, simplify: 0.01 })
      .then((data) => {
        dispatch(setFilters({ supplyChainBasins: data.geojson || null }));
        dispatch(setSupplyChainAnalysis({ phase: 'results', results: data, error: null }));
      })
      .catch((err) => {
        const detail = err?.response?.data?.errors?.[0]?.detail;
        const message = detail || err?.message || 'Analysis request failed';
        dispatch(setSupplyChainAnalysis({ phase: 'idle', error: message }));
      });
  };
}

export default {
  setSupplyChainAnalysis,
  setSupplyChainAnalysisView,
  setSupplyChainReview,
  resetSupplyChainAnalysis,
  openSupplyChainReview,
  applyValidEntriesToMap,
  runSupplyChainAnalysis,
};
