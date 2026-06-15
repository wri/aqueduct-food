import { connect } from 'react-redux';

import {
  setSupplyChainEntries,
  removeSupplyChainEntry,
  clearSupplyChainEntries,
  clearOutsideLandId,
} from 'actions/supplyChainEntries';

import SupplyChainEntriesList from './component';

export default connect(
  state => ({
    entries: state.supplyChainEntries,
    outsideLandIds: state.supplyChainOutsideLand,
    phase: state.supplyChainAnalysis.phase,
  }),
  {
    setEntries: setSupplyChainEntries,
    onRemoveEntry: removeSupplyChainEntry,
    onClearAll: clearSupplyChainEntries,
    clearOutsideLandId,
  },
)(SupplyChainEntriesList);
