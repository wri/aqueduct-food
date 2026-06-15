import {
  SET_SUPPLY_CHAIN_ANALYSIS,
  SET_SUPPLY_CHAIN_ANALYSIS_VIEW,
  RESET_SUPPLY_CHAIN_ANALYSIS,
} from 'constants/supply-analyzer';

export function setSupplyChainAnalysis(payload) {
  return { type: SET_SUPPLY_CHAIN_ANALYSIS, payload };
}

export function setSupplyChainAnalysisView(payload) {
  return { type: SET_SUPPLY_CHAIN_ANALYSIS_VIEW, payload };
}

export function resetSupplyChainAnalysis() {
  return { type: RESET_SUPPLY_CHAIN_ANALYSIS };
}

export default {
  setSupplyChainAnalysis,
  setSupplyChainAnalysisView,
  resetSupplyChainAnalysis,
};
