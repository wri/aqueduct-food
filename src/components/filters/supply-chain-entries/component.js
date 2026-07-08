import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import ValidationSummaryBar from 'components/analyzer/ValidationSummaryBar';
import ReviewEntryList from 'components/analyzer/ReviewEntryList';
import {
  validateLatlongFields,
  validateCountryFields,
  fillMissingBusinessUnits,
  classifyEntries,
} from 'utils/supply-analyzer';

// The list of added supply-chain locations, with validation status, inline
// edit, quick-fixes and remove. Lives in the sidebar sticky section (.c-sticky)
// so it stays visible while the panel scrolls. Entries + the land-boundary
// check come from Redux; the inline-edit UI state is local.
class SupplyChainEntriesList extends PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      editingId: null,
      editDraft: null,
      editDraftErrors: {},
    };

    this.startEdit = this.startEdit.bind(this);
    this.cancelEdit = this.cancelEdit.bind(this);
    this.setDraftField = this.setDraftField.bind(this);
    this.saveEdit = this.saveEdit.bind(this);
    this.applyQuickFix = this.applyQuickFix.bind(this);
  }

  componentDidMount() {
    const { entries, validationChecked, spatialCheckLoading, onOpenReview } = this.props;
    if (entries.length && !validationChecked && !spatialCheckLoading) {
      onOpenReview();
    }
  }

  setDraftField(field, value) {
    this.setState(({ editDraft }) => ({
      editDraft: { ...editDraft, [field]: value },
      editDraftErrors: {},
    }));
  }

  startEdit(entry) {
    this.setState({ editingId: entry.id, editDraft: { ...entry }, editDraftErrors: {} });
  }

  cancelEdit() {
    this.setState({ editingId: null, editDraft: null, editDraftErrors: {} });
  }

  saveEdit() {
    const { editDraft, editingId } = this.state;
    const { entries, setEntries, clearOutsideLandId } = this.props;

    const formErrors = editDraft.type === 'latlong'
      ? validateLatlongFields(editDraft)
      : validateCountryFields(editDraft);

    if (Object.keys(formErrors).length > 0) {
      this.setState({ editDraftErrors: formErrors });
      return;
    }

    // Coordinates may have changed — drop it from the land-boundary set so the
    // next spatial check re-evaluates it.
    if (editDraft.type === 'latlong') clearOutsideLandId(editingId);

    const updated = entries.map((e) => {
      if (e.id !== editingId) return e;
      // Country entries' auto-slugs depend on country/state, so clear the slug
      // on edit and let fillMissingBusinessUnits recompute it.
      const next = { ...editDraft, id: editingId };
      if (next.type === 'country') next.businessUnit = '';
      return next;
    });

    setEntries(fillMissingBusinessUnits(updated));
    this.setState({ editingId: null, editDraft: null, editDraftErrors: {} });
  }

  applyQuickFix(id, fix, fixValue) {
    const { entries, setEntries, clearOutsideLandId } = this.props;

    if (fix === 'swap') clearOutsideLandId(id);

    setEntries(entries.map((entry) => {
      if (entry.id !== id) return entry;
      if (fix === 'swap') {
        return { ...entry, latitude: entry.longitude, longitude: entry.latitude };
      }
      if (fix === 'crop') {
        return { ...entry, crop: fixValue };
      }
      return entry;
    }));
  }

  render() {
    const {
      entries,
      outsideLandIds,
      phase,
      validationChecked,
      spatialCheckLoading,
      spatialCheckError,
      analysisError,
      onRemoveEntry,
      onClearAll,
      onOpenReview,
      onRunAnalysis,
    } = this.props;
    const { editingId, editDraft, editDraftErrors } = this.state;

    // Hidden while the analysis is running / showing results — the results
    // section takes over the space below the input header.
    if (!entries.length || phase === 'analyzing' || phase === 'results') return null;

    const { errors, validCount } = classifyEntries(entries, outsideLandIds);
    const hasErrors = errors.length > 0;
    const canProceed = !spatialCheckLoading && !hasErrors;

    return (
      <div className="c-supply-chain-entries">
        <div className="entries-list-header">
          <span className="entries-count">
            {entries.length} location{entries.length !== 1 ? 's' : ''}
          </span>
          <button type="button" className="clear-all-btn" onClick={onClearAll}>
            Clear all
          </button>
        </div>

        <ValidationSummaryBar
          entries={entries}
          outsideLandIds={outsideLandIds}
          spatialCheckLoading={spatialCheckLoading}
          spatialCheckError={spatialCheckError}
          analysisError={analysisError}
        />

        <ReviewEntryList
          entries={entries}
          outsideLandIds={outsideLandIds}
          editingId={editingId}
          editDraft={editDraft}
          editDraftErrors={editDraftErrors}
          onStartEdit={this.startEdit}
          onCancelEdit={this.cancelEdit}
          onSaveEdit={this.saveEdit}
          onSetDraftField={this.setDraftField}
          onRemoveEntry={onRemoveEntry}
          onApplyQuickFix={this.applyQuickFix}
        />

        <div className="entries-list-footer">
          {spatialCheckError && (
            <button
              type="button"
              className="review-btn"
              disabled={spatialCheckLoading}
              onClick={onOpenReview}
            >
              Retry land-boundary check
            </button>
          )}

          {canProceed && (
            <div className="review-footer-actions">
              <button
                type="button"
                className="submit-btn -primary"
                disabled={validCount === 0}
                onClick={onRunAnalysis}
              >
                Run Analysis ({validCount})
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
}

SupplyChainEntriesList.propTypes = {
  entries: PropTypes.array,
  outsideLandIds: PropTypes.array,
  phase: PropTypes.string,
  validationChecked: PropTypes.bool,
  spatialCheckLoading: PropTypes.bool,
  spatialCheckError: PropTypes.bool,
  analysisError: PropTypes.string,
  setEntries: PropTypes.func.isRequired,
  onRemoveEntry: PropTypes.func.isRequired,
  onClearAll: PropTypes.func.isRequired,
  onOpenReview: PropTypes.func.isRequired,
  onRunAnalysis: PropTypes.func.isRequired,
  clearOutsideLandId: PropTypes.func.isRequired,
};

SupplyChainEntriesList.defaultProps = {
  entries: [],
  outsideLandIds: [],
  phase: 'idle',
  validationChecked: false,
  spatialCheckLoading: false,
  spatialCheckError: false,
  analysisError: null,
};

export default SupplyChainEntriesList;
