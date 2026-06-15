import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import ManualEntry from 'components/analyzer/ManualEntry';
import BulkUpload from 'components/analyzer/BulkUpload';
import Review from 'components/analyzer/Review';
import Results from 'components/analyzer/Results';
import {
  PANEL_MODES,
  INITIAL_LATLONG_FORM,
  INITIAL_COUNTRY_FORM,
} from 'constants/supply-analyzer';
import {
  parseCSVText,
  summariseEntry,
  validateEntry,
  entryStatus,
  validateLatlongFields,
  validateCountryFields,
  findDuplicateCoordIssues,
  fillMissingBusinessUnits,
} from 'utils/supply-analyzer';
import { checkPointsOutsideLand, runFoodSupplyChainAnalysis } from 'services/analysis';
import { downloadCSV } from 'utils/data';
import { ANALYSIS_INDICATORS } from 'constants/analysis-indicators';

const LS_KEY = 'inputPanel_entries';

// ─── Component ────────────────────────────────────────────────────────────────

class InputPanel extends PureComponent {
  constructor(props) {
    super(props);

    let savedEntries = [];
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) savedEntries = fillMissingBusinessUnits(JSON.parse(raw));
    } catch (_) { /* ignore corrupt data */ }

    this.state = {
      // Input phase
      panelMode: 'manual',
      entryMode: 'latlong',
      latlongForm: { ...INITIAL_LATLONG_FORM },
      countryForm: { ...INITIAL_COUNTRY_FORM },
      entries: savedEntries,
      uploadFile: null,
      isDragging: false,
      errors: {},
      bulkResult: null,
      // Review phase
      screen: 'input', // 'input' | 'review' | 'analyzing' | 'results'
      editingId: null,
      editDraft: null,
      editDraftErrors: {},
      outsideLandIds: new Set(),
      spatialCheckLoading: false,
      spatialCheckError: false,
      // Analysis phase
      analysisResults: null, // { results, errors, skipped }
      analysisError: null,
      analysisEntries: [], // snapshot of entries that produced analysisResults
      // Results-screen view state
      activeIndicator: ANALYSIS_INDICATORS[0].key,
      resultFilters: { watershed: '', crop: '', businessUnit: '' },
      resultSort: 'default', // 'default' | 'production_desc' | 'risk_desc'
      resultGrouping: 'none', // 'none' | 'watershed' | 'crop' | 'business_unit'
    };

    this.fileInputRef = React.createRef();

    this.addEntry = this.addEntry.bind(this);
    this.removeEntry = this.removeEntry.bind(this);
    this.setLatlongField = this.setLatlongField.bind(this);
    this.setCountryField = this.setCountryField.bind(this);
    this.handleDrop = this.handleDrop.bind(this);
    this.handleFileChange = this.handleFileChange.bind(this);
    this.processUpload = this.processUpload.bind(this);
    this.openReview = this.openReview.bind(this);
    this.startEdit = this.startEdit.bind(this);
    this.cancelEdit = this.cancelEdit.bind(this);
    this.saveEdit = this.saveEdit.bind(this);
    this.applyValidEntries = this.applyValidEntries.bind(this);
    this.runAnalysis = this.runAnalysis.bind(this);
    this.downloadAnalysisResults = this.downloadAnalysisResults.bind(this);
  }

  componentDidUpdate(_, prevState) {
    const { entries } = this.state;
    if (prevState.entries !== entries) {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(entries));
      } catch (_err) { /* storage quota exceeded or private mode */ }
    }
  }

  // ── Manual-entry field setters ─────────────────────────────────────────────

  setLatlongField(field, value, clearError = true) {
    this.setState(({ latlongForm: form, errors: errs }) => ({
      latlongForm: { ...form, [field]: value },
      errors: clearError ? { ...errs, [field]: undefined } : errs,
    }));
  }

  setCountryField(field, value, clearError = true) {
    this.setState(({ countryForm: form, errors: errs }) => ({
      countryForm: { ...form, [field]: value },
      errors: clearError ? { ...errs, [field]: undefined } : errs,
    }));
  }

  // ── Form submission ──────────────────────────────────────────────────────

  addEntry() {
    const { entryMode } = this.state;
    const { latlongForm: llForm, countryForm: coForm } = this.state;
    const formErrors = entryMode === 'latlong'
      ? validateLatlongFields(llForm)
      : validateCountryFields(coForm);

    if (Object.keys(formErrors).length > 0) {
      this.setState({ errors: formErrors });
      return;
    }

    const entry = entryMode === 'latlong'
      ? { type: 'latlong', ...llForm }
      : { type: 'country', ...coForm };

    this.setState(({ entries, latlongForm, countryForm }) => ({
      entries: fillMissingBusinessUnits([...entries, { ...entry, id: Date.now() }]),
      latlongForm: entryMode === 'latlong' ? { ...INITIAL_LATLONG_FORM } : latlongForm,
      countryForm: entryMode === 'country' ? { ...INITIAL_COUNTRY_FORM } : countryForm,
      errors: {},
    }));
  }

  removeEntry(id) {
    this.setState(({ entries }) => ({ entries: entries.filter(e => e.id !== id) }));
  }

  // ── Bulk upload ──────────────────────────────────────────────────────────

  handleFileChange(file) {
    if (file) this.setState({ uploadFile: file, bulkResult: null });
  }

  handleDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    this.setState({ isDragging: false });
    this.handleFileChange(file);
  }

  processUpload() {
    const { uploadFile } = this.state;
    if (!uploadFile) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const { parsed, skipped } = parseCSVText(e.target.result);
      this.setState(({ entries }) => ({
        entries: fillMissingBusinessUnits([...entries, ...parsed]),
        uploadFile: null,
        bulkResult: { added: parsed.length, skipped },
      }));
    };
    reader.onerror = () => {
      this.setState({ bulkResult: { added: 0, skipped: [], readError: true } });
    };
    reader.readAsText(uploadFile);
  }

  // ── Review screen ────────────────────────────────────────────────────────

  openReview() {
    const { entries } = this.state;
    const latlngEntries = entries.filter(e => e.type === 'latlong');

    const openWithIds = (outsideLandIds, spatialCheckError = false) => {
      this.setState({
        screen: 'review',
        editingId: null,
        editDraft: null,
        editDraftErrors: {},
        outsideLandIds,
        spatialCheckLoading: false,
        spatialCheckError,
      });
    };

    if (!latlngEntries.length) {
      openWithIds(new Set());
      return;
    }

    this.setState({ spatialCheckLoading: true, spatialCheckError: false });

    checkPointsOutsideLand(latlngEntries)
      .then(outsideLandIds => openWithIds(outsideLandIds))
      .catch(() => openWithIds(new Set(), true));
  }

  startEdit(entry) {
    this.setState({ editingId: entry.id, editDraft: { ...entry }, editDraftErrors: {} });
  }

  cancelEdit() {
    this.setState({ editingId: null, editDraft: null, editDraftErrors: {} });
  }

  saveEdit() {
    const { editDraft, editingId, outsideLandIds } = this.state;
    const formErrors = editDraft.type === 'latlong'
      ? validateLatlongFields(editDraft)
      : validateCountryFields(editDraft);

    if (Object.keys(formErrors).length > 0) {
      this.setState({ editDraftErrors: formErrors });
      return;
    }

    // Coordinates may have changed — remove from outsideLandIds so the
    // next review run will re-check against the API.
    const newOutsideLandIds = new Set(outsideLandIds);
    if (editDraft.type === 'latlong') newOutsideLandIds.delete(editingId);

    this.setState(({ entries }) => {
      const updated = entries.map((e) => {
        if (e.id !== editingId) return e;
        // Country entries' auto-slugs (`argentina`, `colombia-santander`, …)
        // depend on country/state, so clear the slug on edit and let
        // fillMissingBusinessUnits recompute it. Latlong entries use a
        // location-independent `pointN` slug, so leave those alone.
        const next = { ...editDraft, id: editingId };
        if (next.type === 'country') next.businessUnit = '';
        return next;
      });
      return {
        entries: fillMissingBusinessUnits(updated),
        editingId: null,
        editDraft: null,
        editDraftErrors: {},
        outsideLandIds: newOutsideLandIds,
      };
    });
  }

  applyQuickFix(id, fix, fixValue) {
    this.setState(({ entries, outsideLandIds }) => {
      // Swapping coordinates changes the position — invalidate the spatial check for this entry.
      const newOutsideLandIds = new Set(outsideLandIds);
      if (fix === 'swap') newOutsideLandIds.delete(id);

      return {
        entries: entries.map((entry) => {
          if (entry.id !== id) return entry;
          if (fix === 'swap') {
            return { ...entry, latitude: entry.longitude, longitude: entry.latitude };
          }
          if (fix === 'crop') {
            return { ...entry, crop: fixValue };
          }
          return entry;
        }),
        outsideLandIds: newOutsideLandIds,
      };
    });
  }

  // Computes the subset of entries with no blocking errors. Shared by the
  // "Apply" path (pushes locations to the map) and the "Run Analysis" path.
  validEntries() {
    const { entries, outsideLandIds } = this.state;
    const duplicateIssues = findDuplicateCoordIssues(entries);
    return entries.filter((e) => {
      const issues = [
        ...validateEntry(e),
        ...(outsideLandIds.has(e.id)
          ? [{ field: 'coordinates', severity: 'error' }]
          : []),
        ...(duplicateIssues.has(e.id) ? [duplicateIssues.get(e.id)] : []),
      ];
      return entryStatus(issues) !== 'error';
    });
  }

  applyValidEntries() {
    const { onSubmit } = this.props;
    onSubmit(this.validEntries());
  }

  // ── Analysis ─────────────────────────────────────────────────────────────

  runAnalysis() {
    const { onSubmit, onBasinsResolved } = this.props;
    const valid = this.validEntries();
    if (!valid.length) return;

    // Push the same set to the map so the visual context matches the table.
    onSubmit(valid);
    // Clear any basins from a previous run while the new one is in flight.
    onBasinsResolved(null);

    this.setState({
      screen: 'analyzing',
      analysisError: null,
      analysisResults: null,
      analysisEntries: valid,
      activeIndicator: ANALYSIS_INDICATORS[0].key,
      resultFilters: { watershed: '', crop: '', businessUnit: '' },
      resultSort: 'default',
      resultGrouping: 'none',
    });

    // Request basin geometry too so the map can outline the matched basins.
    // `simplify` keeps the GeoJSON payload small while preserving shape.
    runFoodSupplyChainAnalysis(valid, { geometry: true, simplify: 0.01 })
      .then((data) => {
        onBasinsResolved(data.geojson || null);
        this.setState({ screen: 'results', analysisResults: data, analysisError: null });
      })
      .catch((err) => {
        const detail = err?.response?.data?.errors?.[0]?.detail;
        const message = detail || err?.message || 'Analysis request failed';
        this.setState({ screen: 'review', analysisError: message });
      });
  }

  downloadAnalysisResults() {
    const { analysisResults } = this.state;
    if (!analysisResults || !analysisResults.results.length) return;
    downloadCSV({
      data: analysisResults.results,
      showLabels: true,
      filename: 'Aqueduct Food Supply Chain Analysis',
      headers: Object.keys(analysisResults.results[0]),
    });
  }

  // ── Review screen ────────────────────────────────────────────────────────

  renderReviewScreen() {
    const {
      entries,
      outsideLandIds,
      spatialCheckError,
      analysisError,
      editingId,
      editDraft,
      editDraftErrors,
    } = this.state;
    const { onSubmit } = this.props;

    return (
      <Review
        entries={entries}
        outsideLandIds={outsideLandIds}
        spatialCheckError={spatialCheckError}
        analysisError={analysisError}
        editingId={editingId}
        editDraft={editDraft}
        editDraftErrors={editDraftErrors}
        onBack={() => this.setState({ screen: 'input', editingId: null, editDraft: null })}
        onStartEdit={this.startEdit}
        onCancelEdit={this.cancelEdit}
        onSaveEdit={this.saveEdit}
        onSetDraftField={(field, value) => this.setState(({ editDraft: draft }) => ({
          editDraft: { ...draft, [field]: value },
          editDraftErrors: {},
        }))}
        onRemoveEntry={this.removeEntry}
        onApplyQuickFix={(id, fix, fixValue) => this.applyQuickFix(id, fix, fixValue)}
        onRunAnalysis={this.runAnalysis}
        onApplyValidEntries={this.applyValidEntries}
        onApplyAll={() => onSubmit(entries)}
      />
    );
  }

  // ── Analysis screens ─────────────────────────────────────────────────────

  renderAnalyzingScreen() {
    const count = this.validEntries().length;
    return (
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
    );
  }

  renderResultsScreen() {
    const {
      analysisResults,
      analysisEntries,
      activeIndicator,
      resultFilters,
      resultSort,
      resultGrouping,
    } = this.state;

    return (
      <Results
        analysisResults={analysisResults}
        analysisEntries={analysisEntries}
        activeIndicator={activeIndicator}
        resultFilters={resultFilters}
        resultSort={resultSort}
        resultGrouping={resultGrouping}
        onActiveIndicatorChange={value => this.setState({ activeIndicator: value })}
        onResultFilterChange={(field, value) => this.setState(({ resultFilters: filters }) => ({
          resultFilters: { ...filters, [field]: value },
        }))}
        onResultSortChange={value => this.setState({ resultSort: value })}
        onResultGroupingChange={value => this.setState({ resultGrouping: value })}
        onBack={() => this.setState({ screen: 'review' })}
        onDownloadCSV={this.downloadAnalysisResults}
      />
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────

  render() {
    const {
      screen,
      panelMode,
      entryMode,
      latlongForm,
      countryForm,
      errors,
      entries,
      uploadFile,
      isDragging,
      bulkResult,
      spatialCheckLoading,
    } = this.state;

    if (screen === 'review') {
      return (
        <div className="c-input-panel">
          {this.renderReviewScreen()}
        </div>
      );
    }

    if (screen === 'analyzing') {
      return (
        <div className="c-input-panel">
          {this.renderAnalyzingScreen()}
        </div>
      );
    }

    if (screen === 'results') {
      return (
        <div className="c-input-panel -results">
          {this.renderResultsScreen()}
        </div>
      );
    }

    // Compute live validation for the entries list status dots
    const validatedEntries = entries.map(e => ({
      entry: e,
      status: entryStatus(validateEntry(e)),
    }));
    const errorCount = validatedEntries.filter(v => v.status === 'error').length;

    let reviewBtnLabel = 'Review & Validate';
    if (spatialCheckLoading) {
      reviewBtnLabel = 'Checking locations\u2026';
    } else if (errorCount > 0) {
      reviewBtnLabel = `Review & Fix (${errorCount} error${errorCount !== 1 ? 's' : ''})`;
    }

    return (
      <div className="c-input-panel">
        {/* Mode tabs */}
        <div className="input-panel-tabs">
          {PANEL_MODES.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`panel-tab${panelMode === opt.value ? ' -active' : ''}`}
              onClick={() => this.setState({ panelMode: opt.value, errors: {} })}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Manual Entry */}
        {panelMode === 'manual' && (
          <ManualEntry
            entryMode={entryMode}
            latlongForm={latlongForm}
            countryForm={countryForm}
            errors={errors}
            onEntryModeChange={value => this.setState({ entryMode: value, errors: {} })}
            setLatlongField={this.setLatlongField}
            setCountryField={this.setCountryField}
            onAddEntry={this.addEntry}
          />
        )}

        {/* Bulk Upload */}
        {panelMode === 'bulk' && (
          <BulkUpload
            uploadFile={uploadFile}
            isDragging={isDragging}
            bulkResult={bulkResult}
            fileInputRef={this.fileInputRef}
            onDragOver={(e) => { e.preventDefault(); this.setState({ isDragging: true }); }}
            onDragLeave={() => this.setState({ isDragging: false })}
            onDrop={this.handleDrop}
            onFileChange={this.handleFileChange}
            onProcessUpload={this.processUpload}
            onClear={() => this.setState({ uploadFile: null, bulkResult: null })}
          />
        )}

        {/* Entries list with live validation status */}
        {entries.length > 0 && (
          <div className="entries-list">
            <div className="entries-list-header">
              <span className="entries-count">
                {entries.length} location{entries.length !== 1 ? 's' : ''}
              </span>
              <button
                type="button"
                className="clear-all-btn"
                onClick={() => this.setState({ entries: [] })}
              >
                Clear all
              </button>
            </div>

            <ul className="entries-ul">
              {validatedEntries.map(({ entry, status }) => (
                <li key={entry.id} className="entry-item">
                  <span className={`entry-status-dot -${status}`} aria-label={status} />
                  <span className={`entry-type-badge -${entry.type}`}>
                    {entry.type === 'latlong' ? 'LL' : 'CO'}
                  </span>
                  <span className="entry-summary">{summariseEntry(entry)}</span>
                  <button
                    type="button"
                    className="remove-entry-btn"
                    aria-label="Remove entry"
                    onClick={() => this.removeEntry(entry.id)}
                  >
                    &times;
                  </button>
                </li>
              ))}
            </ul>

            <div className="panel-footer -submit">
              <button
                type="button"
                className={`review-btn${spatialCheckLoading ? ' -loading' : ''}`}
                disabled={spatialCheckLoading}
                onClick={this.openReview}
              >
                {reviewBtnLabel}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
}

InputPanel.propTypes = {
  onSubmit: PropTypes.func,
  onBasinsResolved: PropTypes.func,
};

InputPanel.defaultProps = {
  onSubmit: () => {},
  onBasinsResolved: () => {},
};

export default InputPanel;
