import React from 'react';
import PropTypes from 'prop-types';

import { classifyEntries } from 'utils/supply-analyzer';

// ─── Review & Validate header ────────────────────────────────────────────────
// Shows the validation summary + the run / apply actions. The per-location
// list (with inline edit + quick-fixes) lives in the locations card below
// (ReviewEntryList), so the data isn't duplicated.

const Review = ({
  entries,
  outsideLandIds,
  spatialCheckError,
  analysisError,
  onBack,
  onRunAnalysis,
  onApplyValidEntries,
  onApplyAll,
}) => {
  const {
    errors, warnings, valid, validCount,
  } = classifyEntries(entries, outsideLandIds);

  return (
    <div className="review-screen">
      {/* Header */}
      <div className="review-header">
        <button
          type="button"
          className="review-back-btn"
          onClick={onBack}
        >
          &#8592; Back
        </button>
        <span className="review-title">Review &amp; Validate</span>
      </div>

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

      {/* Summary bar */}
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

      <p className="review-list-hint">
        Review and fix your locations in the list below.
      </p>

      {/* Footer */}
      <div className="review-footer">
        {errors.length > 0 && (
          <p className="review-footer-note">
            {errors.length} location{errors.length !== 1 ? 's' : ''} with errors will be excluded.
          </p>
        )}
        <div className="review-footer-actions">
          <button
            type="button"
            className="submit-btn -primary"
            disabled={validCount === 0}
            onClick={onRunAnalysis}
          >
            Run Analysis ({validCount})
          </button>
          <button
            type="button"
            className="submit-btn"
            disabled={validCount === 0}
            onClick={onApplyValidEntries}
          >
            Apply {validCount} to map
          </button>
          {validCount === entries.length && validCount > 0 && (
            <button
              type="button"
              className="submit-btn -all"
              onClick={onApplyAll}
            >
              Apply all
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

Review.propTypes = {
  entries: PropTypes.array.isRequired,
  outsideLandIds: PropTypes.array,
  spatialCheckError: PropTypes.bool,
  analysisError: PropTypes.string,
  onBack: PropTypes.func.isRequired,
  onRunAnalysis: PropTypes.func.isRequired,
  onApplyValidEntries: PropTypes.func.isRequired,
  onApplyAll: PropTypes.func.isRequired,
};

Review.defaultProps = {
  outsideLandIds: [],
  spatialCheckError: false,
  analysisError: null,
};

export default Review;
