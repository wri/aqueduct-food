import React from 'react';
import PropTypes from 'prop-types';
import { RadioGroup } from 'aqueduct-components';

import { ANALYSIS_INDICATORS } from 'constants/analysis-indicators';
import { augmentResults, resultCommodity } from './results-helpers';

// Results controls (header): Back + title, the analysis indicator selector,
// group-by, the watershed / crop / business-unit filters and the sort select.
// Lives in the input header; the data (metrics + table/charts) renders below.
const ResultsControls = ({
  analysisResults,
  analysisEntries,
  activeIndicator,
  resultFilters,
  resultSort,
  resultGrouping,
  resultView,
  onActiveIndicatorChange,
  onResultFilterChange,
  onResultSortChange,
  onResultGroupingChange,
  onBack,
}) => {
  if (!analysisResults) return null;

  const augmented = augmentResults(analysisResults.results, analysisEntries);
  const watershedOptions = [...new Set(augmented.map(r => r.pfaf_id).filter(v => v != null))].sort((a, b) => a - b);
  const cropOptions = [...new Set(augmented.map(r => resultCommodity(r)).filter(Boolean))].sort();
  const businessUnitOptions = [...new Set(augmented.map(r => r.business_unit).filter(Boolean))].sort();

  const selectedIndicator = ANALYSIS_INDICATORS.find(i => i.key === activeIndicator);
  // Group-by only applies to the table view; grey it out while Charts is active.
  const groupingDisabled = resultView === 'charts';

  return (
    <div className="review-screen">
      <div className="review-header">
        <button type="button" className="review-back-btn" onClick={onBack}>
          &#8592; Back
        </button>
        <span className="review-title">Analysis Results</span>
      </div>

      {/* Indicator selector */}
      <div className="results-indicator-bar">
        <label className="results-control -indicator" htmlFor="results-analysis-select">
          <span>Analysis</span>
          <select
            id="results-analysis-select"
            value={activeIndicator}
            onChange={e => onActiveIndicatorChange(e.target.value)}
          >
            {ANALYSIS_INDICATORS.map(ind => (
              <option key={ind.key} value={ind.key}>{ind.label}</option>
            ))}
          </select>
        </label>
        {selectedIndicator && (
          <p className="results-indicator-description">{selectedIndicator.description}</p>
        )}
      </div>

      {/* Group-by radio */}
      <div className={`results-grouping${groupingDisabled ? ' -disabled' : ''}`}>
        <span className="results-grouping-label">Group by</span>
        <RadioGroup
          name="result-grouping"
          className="-inline"
          items={[
            { value: 'none', label: 'None' },
            { value: 'watershed', label: 'Watershed' },
            { value: 'crop', label: 'Crop' },
            { value: 'business_unit', label: 'Business Unit' },
          ]}
          selected={resultGrouping}
          onChange={({ value }) => {
            if (!groupingDisabled) onResultGroupingChange(value);
          }}
        />
      </div>

      {/* Filters + sort */}
      <div className="results-controls">
        <label className="results-control" htmlFor="results-watershed-select">
          <span>Watershed</span>
          <select
            id="results-watershed-select"
            value={resultFilters.watershed}
            onChange={e => onResultFilterChange('watershed', e.target.value)}
          >
            <option value="">All ({watershedOptions.length})</option>
            {watershedOptions.map(w => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </label>

        <label className="results-control" htmlFor="results-crop-select">
          <span>Crop</span>
          <select
            id="results-crop-select"
            value={resultFilters.crop}
            onChange={e => onResultFilterChange('crop', e.target.value)}
          >
            <option value="">All ({cropOptions.length})</option>
            {cropOptions.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        <label className="results-control" htmlFor="results-business-unit-select">
          <span>Business Unit</span>
          <select
            id="results-business-unit-select"
            value={resultFilters.businessUnit}
            onChange={e => onResultFilterChange('businessUnit', e.target.value)}
            disabled={businessUnitOptions.length === 0}
          >
            <option value="">All ({businessUnitOptions.length})</option>
            {businessUnitOptions.map(bu => (
              <option key={bu} value={bu}>{bu}</option>
            ))}
          </select>
        </label>

        <label className="results-control" htmlFor="results-sort-select">
          <span>Sort by</span>
          <select
            id="results-sort-select"
            value={resultSort}
            onChange={e => onResultSortChange(e.target.value)}
          >
            <option value="default">Input order</option>
            <option value="production_desc">Highest production</option>
            <option value="risk_desc">Highest risk</option>
          </select>
        </label>
      </div>
    </div>
  );
};

ResultsControls.propTypes = {
  analysisResults: PropTypes.object,
  analysisEntries: PropTypes.array,
  activeIndicator: PropTypes.string.isRequired,
  resultFilters: PropTypes.object.isRequired,
  resultSort: PropTypes.string.isRequired,
  resultGrouping: PropTypes.string.isRequired,
  resultView: PropTypes.string,
  onActiveIndicatorChange: PropTypes.func.isRequired,
  onResultFilterChange: PropTypes.func.isRequired,
  onResultSortChange: PropTypes.func.isRequired,
  onResultGroupingChange: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
};

ResultsControls.defaultProps = {
  analysisResults: null,
  analysisEntries: [],
  resultView: 'table',
};

export default ResultsControls;
