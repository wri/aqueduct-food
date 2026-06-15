import React from 'react';
import PropTypes from 'prop-types';

import { summariseEntry, entryStatus, classifyEntries } from 'utils/supply-analyzer';
import { renderLatlongFields, renderCountryFields } from 'components/analyzer/ManualEntry';

const STATUS_ICON = { valid: '✓', warning: '!', error: '✕' };

// Per-location list with validation status, inline edit, quick-fixes and
// remove. Presentational: the owning component supplies the edit state and the
// handlers (which mutate the shared entries). Used inside the locations card.
const ReviewEntryList = ({
  entries,
  outsideLandIds,
  editingId,
  editDraft,
  editDraftErrors,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onSetDraftField,
  onRemoveEntry,
  onApplyQuickFix,
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

  const { errors, warnings, valid } = classifyEntries(entries, outsideLandIds);

  return (
    <div className="review-body">
      {errors.length > 0 && (
        <div className="review-section">
          <p className="review-section-title">Errors — must fix before applying</p>
          {errors.map(({ entry, issues }) => renderReviewEntry(entry, issues))}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="review-section">
          <p className="review-section-title">Warnings — review recommended</p>
          {warnings.map(({ entry, issues }) => renderReviewEntry(entry, issues))}
        </div>
      )}

      {valid.length > 0 && (
        <div className="review-section">
          <p className="review-section-title">Valid</p>
          {valid.map(({ entry, issues }) => renderReviewEntry(entry, issues))}
        </div>
      )}
    </div>
  );
};

ReviewEntryList.propTypes = {
  entries: PropTypes.array.isRequired,
  outsideLandIds: PropTypes.array,
  editingId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  editDraft: PropTypes.object,
  editDraftErrors: PropTypes.object,
  onStartEdit: PropTypes.func.isRequired,
  onCancelEdit: PropTypes.func.isRequired,
  onSaveEdit: PropTypes.func.isRequired,
  onSetDraftField: PropTypes.func.isRequired,
  onRemoveEntry: PropTypes.func.isRequired,
  onApplyQuickFix: PropTypes.func.isRequired,
};

ReviewEntryList.defaultProps = {
  outsideLandIds: [],
  editingId: null,
  editDraft: null,
  editDraftErrors: {},
};

export default ReviewEntryList;
