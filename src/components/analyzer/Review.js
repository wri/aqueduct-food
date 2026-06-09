import React from 'react';
import PropTypes from 'prop-types';
import {
  summariseEntry,
  validateEntry,
  entryStatus,
  findDuplicateCoordIssues,
} from 'utils/supply-analyzer';
import { renderLatlongFields, renderCountryFields } from 'components/analyzer/ManualEntry';

const STATUS_ICON = { valid: '✓', warning: '!', error: '✕' };

// ─── Review & Validate screen ────────────────────────────────────────────────

const Review = ({
  entries,
  outsideLandIds,
  spatialCheckError,
  analysisError,
  editingId,
  editDraft,
  editDraftErrors,
  onBack,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onSetDraftField,
  onRemoveEntry,
  onApplyQuickFix,
  onRunAnalysis,
  onApplyValidEntries,
  onApplyAll,
}) => {
  const renderInlineEditForm = () => {
    if (!editDraft) return null;

    return (
      <div className="inline-edit-form">
        {editDraft.type === 'latlong'
          ? renderLatlongFields(editDraft, onSetDraftField, editDraftErrors)
          : renderCountryFields(editDraft, onSetDraftField, editDraftErrors)}
        <div className="inline-form-actions">
          <button type="button" className="cancel-edit-btn" onClick={onCancelEdit}>
            Cancel
          </button>
          <button type="button" className="save-edit-btn" onClick={onSaveEdit}>
            Save changes
          </button>
        </div>
      </div>
    );
  };

  const renderReviewEntry = (entry, issues) => {
    const status = entryStatus(issues);
    const isEditing = editingId === entry.id;

    return (
      <div key={entry.id} className={`review-entry -${status}`}>
        <div className="review-entry-header">
          <span className={`review-status-icon -${status}`} aria-hidden="true">
            {STATUS_ICON[status]}
          </span>
          <span className={`entry-type-badge -${entry.type}`}>
            {entry.type === 'latlong' ? 'LL' : 'CO'}
          </span>
          <span className="review-entry-summary">{summariseEntry(entry)}</span>
          <div className="entry-actions">
            <button
              type="button"
              className="edit-entry-btn"
              onClick={() => (isEditing ? onCancelEdit() : onStartEdit(entry))}
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
            <button
              type="button"
              className="remove-review-btn"
              aria-label="Remove entry"
              onClick={() => onRemoveEntry(entry.id)}
            >
              &times;
            </button>
          </div>
        </div>

        {/* Issues list (only when not editing) */}
        {!isEditing && issues.length > 0 && (
          <ul className="issues-list">
            {issues.map((issue, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <li key={i} className={`issue-item -${issue.severity}`}>
                <span className={`issue-tag -${issue.severity}`}>
                  {issue.severity === 'error' ? 'Error' : 'Warning'}
                </span>
                <span className="issue-message">{issue.message}</span>
                {issue.fix === 'swap' && (
                  <button
                    type="button"
                    className={`fix-btn -${issue.severity}`}
                    onClick={() => onApplyQuickFix(entry.id, 'swap')}
                  >
                    Swap ↔
                  </button>
                )}
                {issue.fix === 'crop' && issue.suggestion && (
                  <button
                    type="button"
                    className={`fix-btn -${issue.severity}`}
                    onClick={() => onApplyQuickFix(entry.id, 'crop', issue.suggestion.value)}
                  >
                    Use &ldquo;{issue.suggestion.label}&rdquo;
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {isEditing && renderInlineEditForm()}
      </div>
    );
  };

  const duplicateIssues = findDuplicateCoordIssues(entries);

  const getIssues = (entry) => {
    const issues = validateEntry(entry);
    if (entry.type === 'latlong' && outsideLandIds.has(entry.id)) {
      issues.push({
        field: 'coordinates',
        severity: 'error',
        message: 'Coordinates are outside land boundaries',
      });
    }
    const dupIssue = duplicateIssues.get(entry.id);
    if (dupIssue) issues.push(dupIssue);
    return issues;
  };

  const validated = entries.map(e => ({ entry: e, issues: getIssues(e) }));
  const errors = validated.filter(({ issues }) => entryStatus(issues) === 'error');
  const warnings = validated.filter(({ issues }) => entryStatus(issues) === 'warning');
  const valid = validated.filter(({ issues }) => entryStatus(issues) === 'valid');
  const validCount = validated.filter(({ issues }) => entryStatus(issues) !== 'error').length;

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

      <div className="review-body">
        {/* Errors */}
        {errors.length > 0 && (
          <div className="review-section">
            <p className="review-section-title">Errors — must fix before applying</p>
            {errors.map(({ entry, issues }) => renderReviewEntry(entry, issues))}
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="review-section">
            <p className="review-section-title">Warnings — review recommended</p>
            {warnings.map(({ entry, issues }) => renderReviewEntry(entry, issues))}
          </div>
        )}

        {/* Valid */}
        {valid.length > 0 && (
          <div className="review-section">
            <p className="review-section-title">Valid</p>
            {valid.map(({ entry, issues }) => renderReviewEntry(entry, issues))}
          </div>
        )}
      </div>

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
  outsideLandIds: PropTypes.object.isRequired,
  spatialCheckError: PropTypes.bool,
  analysisError: PropTypes.string,
  editingId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  editDraft: PropTypes.object,
  editDraftErrors: PropTypes.object,
  onBack: PropTypes.func.isRequired,
  onStartEdit: PropTypes.func.isRequired,
  onCancelEdit: PropTypes.func.isRequired,
  onSaveEdit: PropTypes.func.isRequired,
  onSetDraftField: PropTypes.func.isRequired,
  onRemoveEntry: PropTypes.func.isRequired,
  onApplyQuickFix: PropTypes.func.isRequired,
  onRunAnalysis: PropTypes.func.isRequired,
  onApplyValidEntries: PropTypes.func.isRequired,
  onApplyAll: PropTypes.func.isRequired,
};

Review.defaultProps = {
  spatialCheckError: false,
  analysisError: null,
  editingId: null,
  editDraft: null,
  editDraftErrors: {},
};

export default Review;
