import { connect } from 'react-redux';

import {
  setSupplyChainEntries,
  removeSupplyChainEntry,
  clearSupplyChainEntries,
  clearOutsideLandId,
} from 'actions/supplyChainEntries';
import { openSupplyChainReview } from 'actions/supplyChainAnalysis';

import SupplyChainEntriesList from './component';

export default connect(
  state => ({
    entries: state.supplyChainEntries,
    outsideLandIds: state.supplyChainOutsideLand,
    phase: state.supplyChainAnalysis.phase,
    screen: state.supplyChainAnalysis.screen,
    spatialCheckLoading: state.supplyChainAnalysis.spatialCheckLoading,
  }),
  {
    setEntries: setSupplyChainEntries,
    onRemoveEntry: removeSupplyChainEntry,
    onClearAll: clearSupplyChainEntries,
    onOpenReview: openSupplyChainReview,
    clearOutsideLandId,
  },
)(SupplyChainEntriesList);
