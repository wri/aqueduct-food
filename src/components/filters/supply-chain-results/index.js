import { connect } from 'react-redux';

import {
  setSupplyChainAnalysisView,
  resetSupplyChainAnalysis,
} from 'actions/supplyChainAnalysis';

import SupplyChainResults from './component';

export default connect(
  state => ({
    phase: state.supplyChainAnalysis.phase,
    results: state.supplyChainAnalysis.results,
    entries: state.supplyChainAnalysis.entries,
    view: state.supplyChainAnalysis.view,
  }),
  {
    onViewChange: setSupplyChainAnalysisView,
    onBack: resetSupplyChainAnalysis,
  },
)(SupplyChainResults);
