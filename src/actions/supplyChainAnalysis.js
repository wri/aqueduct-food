import {
  SET_SUPPLY_CHAIN_ANALYSIS,
  SET_SUPPLY_CHAIN_ANALYSIS_VIEW,
  RESET_SUPPLY_CHAIN_ANALYSIS,
  SET_SUPPLY_CHAIN_REVIEW,
} from 'constants/supply-analyzer';
import { setOutsideLandIds } from 'actions/supplyChainEntries';
import { checkPointsOutsideLand } from 'services/analysis';

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

    const openWithIds = (outsideLandIds, spatialCheckError = false) => {
      dispatch(setOutsideLandIds(Array.from(outsideLandIds)));
      dispatch(setSupplyChainReview({
        screen: 'review',
        spatialCheckLoading: false,
        spatialCheckError,
      }));
    };

    if (!latlngEntries.length) {
      openWithIds([]);
      return;
    }

    dispatch(setSupplyChainReview({ spatialCheckLoading: true, spatialCheckError: false }));

    checkPointsOutsideLand(latlngEntries)
      .then(outsideLandIds => openWithIds(outsideLandIds))
      .catch(() => openWithIds([], true));
  };
}

export function closeSupplyChainReview() {
  return dispatch => dispatch(setSupplyChainReview({ screen: 'input' }));
}

export default {
  setSupplyChainAnalysis,
  setSupplyChainAnalysisView,
  setSupplyChainReview,
  resetSupplyChainAnalysis,
  openSupplyChainReview,
  closeSupplyChainReview,
};
