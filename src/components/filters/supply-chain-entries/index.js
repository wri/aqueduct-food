import { connect } from 'react-redux';

import {
  setSupplyChainEntries,
  removeSupplyChainEntry,
  clearSupplyChainEntries,
  clearOutsideLandId,
} from 'actions/supplyChainEntries';
import {
  openSupplyChainReview,
  runSupplyChainAnalysis,
  applyValidEntriesToMap,
} from 'actions/supplyChainAnalysis';

import SupplyChainEntriesList from './component';

export default connect(
  state => ({
    entries: state.supplyChainEntries,
    outsideLandIds: state.supplyChainOutsideLand,
    phase: state.supplyChainAnalysis.phase,
    validationChecked: state.supplyChainAnalysis.validationChecked,
    spatialCheckLoading: state.supplyChainAnalysis.spatialCheckLoading,
    spatialCheckError: state.supplyChainAnalysis.spatialCheckError,
    analysisError: state.supplyChainAnalysis.error,
  }),
  {
    setEntries: setSupplyChainEntries,
    onRemoveEntry: removeSupplyChainEntry,
    onClearAll: clearSupplyChainEntries,
    onOpenReview: openSupplyChainReview,
    onRunAnalysis: runSupplyChainAnalysis,
    onApplyValidEntries: applyValidEntriesToMap,
    clearOutsideLandId,
  },
)(SupplyChainEntriesList);
