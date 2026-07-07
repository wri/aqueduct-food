import React from 'react';
import PropTypes from 'prop-types';

import { classifyEntries } from 'utils/supply-analyzer';

const ValidationSummaryBar = ({
  entries,
  outsideLandIds,
  spatialCheckError,
  analysisError,
}) => {
  const { errors, warnings, valid } = classifyEntries(entries, outsideLandIds);

  return (
    <div className="validation-summary">
      {spatialCheckError && (
        <div className="spatial-check-notice">
          Land-boundary check unavailable — spatial errors may not be shown.
        </div>
      )}

      {analysisError && (
        <div className="analysis-error-notice">
          Analysis failed: {analysisError}
        </div>
      )}

      <div className="review-summary-bar">
        <span className="summary-stat -valid">
          <span className="stat-count">{valid.length}</span> valid
        </span>
        <span className="summary-divider" />
        <span className="summary-stat -warning">
          <span className="stat-count">{warnings.length}</span> warning{warnings.length !== 1 ? 's' : ''}
        </span>
        <span className="summary-divider" />
        <span className="summary-stat -error">
          <span className="stat-count">{errors.length}</span> error{errors.length !== 1 ? 's' : ''}
        </span>
      </div>

      {errors.length > 0 && (
        <p className="review-fix-hint">
          Fix the errors below before running analysis.
        </p>
      )}
    </div>
  );
};

ValidationSummaryBar.propTypes = {
  entries: PropTypes.array.isRequired,
  outsideLandIds: PropTypes.array,
  spatialCheckError: PropTypes.bool,
  analysisError: PropTypes.string,
};

ValidationSummaryBar.defaultProps = {
  outsideLandIds: [],
  spatialCheckError: false,
  analysisError: null,
};

export default ValidationSummaryBar;
