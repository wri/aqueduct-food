import React from 'react';
import PropTypes from 'prop-types';

import Results from 'components/analyzer/Results';
import { downloadCSV } from 'utils/data';

// Analysis output (metrics + Table / Charts) for the supply-chain analyzer.
// Rendered in the sidebar section below the input header; the controls that
// drive it live in the header (SupplyChainResultsControls). Driven by the
// shared `supplyChainAnalysis` phase: while it shows, the locations card hides.
const SupplyChainResults = ({
  phase, results, entries, view, onViewChange, onBack,
}) => {
  if (phase === 'analyzing') {
    const count = entries.length;
    return (
      <div className="c-input-panel -results c-supply-chain-results">
        <div className="review-screen">
          <div className="review-header">
            <span className="review-title">Running Analysis…</span>
          </div>
          <div className="analysis-loading">
            <div className="progress-bar indeterminate">
              <div className="value indeterminate" />
            </div>
            <p className="progress-text">
              Sending {count} location{count !== 1 ? 's' : ''} to the
              Aqueduct food-supply-chain analyzer…
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'results') {
    const downloadResults = () => {
      if (!results || !results.results.length) return;
      downloadCSV({
        data: results.results,
        showLabels: true,
        filename: 'Aqueduct Food Supply Chain Analysis',
        headers: Object.keys(results.results[0]),
      });
    };

    return (
      <div className="c-input-panel -results c-supply-chain-results">
        <Results
          analysisResults={results}
          analysisEntries={entries}
          activeIndicator={view.activeIndicator}
          resultFilters={view.resultFilters}
          resultSort={view.resultSort}
          resultGrouping={view.resultGrouping}
          resultView={view.resultView}
          onResultViewChange={value => onViewChange({ resultView: value })}
          onBack={onBack}
          onDownloadCSV={downloadResults}
        />
      </div>
    );
  }

  return null;
};

SupplyChainResults.propTypes = {
  phase: PropTypes.string,
  results: PropTypes.object,
  entries: PropTypes.array,
  view: PropTypes.object.isRequired,
  onViewChange: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
};

SupplyChainResults.defaultProps = {
  phase: 'idle',
  results: null,
  entries: [],
};

export default SupplyChainResults;
