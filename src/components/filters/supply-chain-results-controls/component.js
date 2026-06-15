import React from 'react';
import PropTypes from 'prop-types';

import ResultsControls from 'components/analyzer/ResultsControls';

// Header half of the analysis results: Back + title, indicator selector,
// group-by, filters and sort. Rendered inside the input header; the data
// (metrics + Table / Charts) renders in the section below. Both share the
// view state via Redux so the controls drive the table/charts below.
const SupplyChainResultsControls = ({
  phase, results, entries, view, onViewChange, onBack,
}) => {
  if (phase !== 'results') return null;

  return (
    <ResultsControls
      analysisResults={results}
      analysisEntries={entries}
      activeIndicator={view.activeIndicator}
      resultFilters={view.resultFilters}
      resultSort={view.resultSort}
      resultGrouping={view.resultGrouping}
      onActiveIndicatorChange={value => onViewChange({ activeIndicator: value })}
      onResultFilterChange={(field, value) => onViewChange({
        resultFilters: { ...view.resultFilters, [field]: value },
      })}
      onResultSortChange={value => onViewChange({ resultSort: value })}
      onResultGroupingChange={value => onViewChange({ resultGrouping: value })}
      onBack={onBack}
    />
  );
};

SupplyChainResultsControls.propTypes = {
  phase: PropTypes.string,
  results: PropTypes.object,
  entries: PropTypes.array,
  view: PropTypes.object.isRequired,
  onViewChange: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
};

SupplyChainResultsControls.defaultProps = {
  phase: 'idle',
  results: null,
  entries: [],
};

export default SupplyChainResultsControls;
