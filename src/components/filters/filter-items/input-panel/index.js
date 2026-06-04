import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { CustomSelect, RadioGroup } from 'aqueduct-components';
import CountrySelect from 'components/country-select';
import {
  PANEL_MODES,
  ENTRY_MODES,
  INITIAL_LATLONG_FORM,
  INITIAL_COUNTRY_FORM,
  SORTED_CROP_OPTIONS,
  FILTERED_IRRIGATION_OPTIONS,
} from 'constants/supply-analyzer';
import {
  downloadTemplate,
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
import {
  ANALYSIS_INDICATORS,
  INDICATOR_COLUMN_KEYS,
  describeIndicatorValue,
  computeRiskScore,
} from 'constants/analysis-indicators';

const LS_KEY = 'inputPanel_entries';

// Display order + labels for the food-supply-chain analysis response.
// Any keys returned by the API that aren't in this list are appended at the
// end, using the raw key as the header (so new fields show up automatically).
const RESULT_COLUMN_LABELS = {
  unique_id: 'Unique ID',
  business_unit: 'Business Unit',
  pfaf_id: 'Basin (PFAF)',
  iso_code: 'ISO',
  country: 'Country',
  state: 'State',
  commodity_code: 'Crop',
  irrigation: 'Irrigation',
  total_volume: 'Total Volume (MT)',
  bws_raw: 'BWS Raw',
  bws_score: 'BWS Score',
  bws_cat: 'BWS Cat',
  bws_label: 'BWS Label',
  sbtn_quant_max: 'SBTN Quant',
  sbtn_qual_max: 'SBTN Qual',
  basin_production: 'Basin Production',
  summed_production: 'Summed Production',
  production_sourced_from_basin: 'Sourced From Basin',
};
const RESULT_COLUMN_ORDER = Object.keys(RESULT_COLUMN_LABELS);

// Always-hidden columns in the on-screen results table (exported in CSV).
const HIDDEN_RESULT_COLUMNS = new Set(['unique_id']);

// Picks every column key present across the result rows, then drops:
//   - the always-hidden columns (unique_id),
//   - indicator-scoped columns (BWS / SBTN) that don't belong to the
//     currently selected indicator.
// Returns the intersection ordered by RESULT_COLUMN_ORDER, with unknown
// API keys appended last so the table is forward-compatible.
function getResultColumns(rows, activeIndicatorKey) {
  if (!rows || !rows.length) return [];
  const seen = new Set();
  rows.forEach(row => Object.keys(row).forEach(k => seen.add(k)));

  const indicator = ANALYSIS_INDICATORS.find(i => i.key === activeIndicatorKey);
  const allowedIndicatorCols = new Set(indicator ? indicator.columns : []);

  const isAllowed = (key) => {
    if (HIDDEN_RESULT_COLUMNS.has(key)) return false;
    if (INDICATOR_COLUMN_KEYS.has(key)) return allowedIndicatorCols.has(key);
    return true;
  };

  const ordered = RESULT_COLUMN_ORDER.filter(k => seen.has(k) && isAllowed(k));
  const extras = [...seen].filter(k => !RESULT_COLUMN_ORDER.includes(k) && isAllowed(k));
  return [...ordered, ...extras];
}

// Renders a value for a results-table cell. Numbers get a sensible decimal
// truncation; nullish values get an em-dash placeholder.
function formatResultCell(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return String(value);
    if (Number.isInteger(value)) return value.toLocaleString();
    return value.toFixed(Math.abs(value) >= 100 ? 2 : 4);
  }
  return String(value);
}

// ─── Shared field-set renderers (module-level, no `this`) ────────────────────

function renderLatlongFields(form, setField, errs) {
  return (
    <div className="entry-form">
      <div className="form-row -two-col">
        <div className={`form-field${errs.latitude ? ' -invalid' : ''}`}>
          <span className="field-label">
            Latitude <span className="required-mark">*</span>
          </span>
          <input
            type="number"
            className="field-input"
            placeholder="-90 to 90"
            min="-90"
            max="90"
            step="any"
            value={form.latitude}
            onChange={e => setField('latitude', e.target.value)}
          />
          {errs.latitude && <span className="field-error">{errs.latitude}</span>}
        </div>
        <div className={`form-field${errs.longitude ? ' -invalid' : ''}`}>
          <span className="field-label">
            Longitude <span className="required-mark">*</span>
          </span>
          <input
            type="number"
            className="field-input"
            placeholder="-180 to 180"
            min="-180"
            max="180"
            step="any"
            value={form.longitude}
            onChange={e => setField('longitude', e.target.value)}
          />
          {errs.longitude && <span className="field-error">{errs.longitude}</span>}
        </div>
      </div>

      <div className="form-row">
        <div className="form-field">
          <span className="field-label">
            Radius <span className="optional-mark">(km — optional)</span>
          </span>
          <input
            type="number"
            className="field-input"
            placeholder="e.g. 50"
            min="0"
            step="any"
            value={form.radius}
            onChange={e => setField('radius', e.target.value, false)}
          />
        </div>
      </div>

      <div className={`form-row${errs.crop ? ' -invalid' : ''}`}>
        <div className="form-field">
          <span className="field-label">
            Crop <span className="required-mark">*</span>
          </span>
          <CustomSelect
            search
            options={SORTED_CROP_OPTIONS}
            value={form.crop}
            onValueChange={selected => setField('crop', selected ? selected.value : null)}
          />
          {errs.crop && <span className="field-error">{errs.crop}</span>}
        </div>
      </div>

      <div className={`form-row${errs.irrigation ? ' -invalid' : ''}`}>
        <div className="form-field">
          <span className="field-label">
            Irrigation <span className="required-mark">*</span>
          </span>
          <RadioGroup
            name={`irrigation-${form.latitude || 'new'}`}
            items={FILTERED_IRRIGATION_OPTIONS}
            selected={form.irrigation}
            onChange={({ value }) => setField('irrigation', value)}
            className="-inline"
          />
          {errs.irrigation && <span className="field-error">{errs.irrigation}</span>}
        </div>
      </div>

      <div className="form-row">
        <div className="form-field">
          <span className="field-label">
            Volume <span className="optional-mark">(optional)</span>
          </span>
          <input
            type="number"
            className="field-input"
            placeholder="e.g. 1000"
            min="0"
            step="any"
            value={form.volume}
            onChange={e => setField('volume', e.target.value, false)}
          />
        </div>
      </div>
    </div>
  );
}

function renderCountryFields(form, setField, errs) {
  return (
    <div className="entry-form">
      <div className={`form-row${errs.country ? ' -invalid' : ''}`}>
        <div className="form-field">
          <span className="field-label">
            Country <span className="required-mark">*</span>
          </span>
          <CountrySelect
            value={form.country !== null ? form.country : undefined}
            onValueChange={(selected) => {
              setField('country', selected ? selected.value : null);
              setField('countryName', selected ? selected.label : '');
            }}
          />
          {errs.country && <span className="field-error">{errs.country}</span>}
        </div>
      </div>

      <div className="form-row">
        <div className="form-field">
          <span className="field-label">
            State <span className="optional-mark">(optional)</span>
          </span>
          <input
            type="text"
            className="field-input"
            placeholder="e.g. Nairobi County"
            value={form.state}
            onChange={e => setField('state', e.target.value, false)}
          />
        </div>
      </div>

      <div className={`form-row${errs.crop ? ' -invalid' : ''}`}>
        <div className="form-field">
          <span className="field-label">
            Crop <span className="required-mark">*</span>
          </span>
          <CustomSelect
            search
            options={SORTED_CROP_OPTIONS}
            value={form.crop}
            onValueChange={selected => setField('crop', selected ? selected.value : null)}
          />
          {errs.crop && <span className="field-error">{errs.crop}</span>}
        </div>
      </div>

      <div className={`form-row${errs.irrigation ? ' -invalid' : ''}`}>
        <div className="form-field">
          <span className="field-label">
            Irrigation <span className="required-mark">*</span>
          </span>
          <RadioGroup
            name={`country-irrigation-${form.country || 'new'}`}
            items={FILTERED_IRRIGATION_OPTIONS}
            selected={form.irrigation}
            onChange={({ value }) => setField('irrigation', value)}
            className="-inline"
          />
          {errs.irrigation && <span className="field-error">{errs.irrigation}</span>}
        </div>
      </div>

      <div className="form-row">
        <div className="form-field">
          <span className="field-label">
            Volume <span className="optional-mark">(optional)</span>
          </span>
          <input
            type="number"
            className="field-input"
            placeholder="e.g. 1000"
            min="0"
            step="any"
            value={form.volume}
            onChange={e => setField('volume', e.target.value, false)}
          />
        </div>
      </div>
    </div>
  );
}

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
    const { onSubmit } = this.props;
    const valid = this.validEntries();
    if (!valid.length) return;

    // Push the same set to the map so the visual context matches the table.
    onSubmit(valid);

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

    runFoodSupplyChainAnalysis(valid)
      .then((data) => {
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

  // ── Form renderers ───────────────────────────────────────────────────────

  renderLatlongForm() {
    const { latlongForm, errors } = this.state;
    const setField = (field, value, clearError = true) => {
      this.setState(({ latlongForm: form, errors: errs }) => ({
        latlongForm: { ...form, [field]: value },
        errors: clearError ? { ...errs, [field]: undefined } : errs,
      }));
    };
    return renderLatlongFields(latlongForm, setField, errors);
  }

  renderCountryForm() {
    const { countryForm, errors } = this.state;
    const setField = (field, value, clearError = true) => {
      this.setState(({ countryForm: form, errors: errs }) => ({
        countryForm: { ...form, [field]: value },
        errors: clearError ? { ...errs, [field]: undefined } : errs,
      }));
    };
    return renderCountryFields(countryForm, setField, errors);
  }

  // ── Bulk result banner ───────────────────────────────────────────────────

  renderBulkResult() {
    const { bulkResult } = this.state;
    if (!bulkResult) return null;

    if (bulkResult.readError) {
      return (
        <div className="bulk-result -error">
          Could not read the file. Please check it is a valid CSV.
        </div>
      );
    }

    return (
      <div className={`bulk-result${bulkResult.added === 0 ? ' -error' : ' -success'}`}>
        <span>
          {bulkResult.added > 0
            ? `${bulkResult.added} location${bulkResult.added !== 1 ? 's' : ''} added`
            : 'No valid locations found'}
          {bulkResult.skipped.length > 0 && ` · ${bulkResult.skipped.length} row${bulkResult.skipped.length !== 1 ? 's' : ''} skipped`}
        </span>
        {bulkResult.skipped.length > 0 && (
          <ul className="skipped-rows">
            {bulkResult.skipped.map(s => (
              <li key={s.row}>Row {s.row}: invalid {s.reasons.join(', ')}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // ── Review screen ────────────────────────────────────────────────────────

  renderInlineEditForm() {
    const { editDraft, editDraftErrors } = this.state;
    if (!editDraft) return null;

    const setDraft = (field, value) => {
      this.setState(({ editDraft: draft }) => ({
        editDraft: { ...draft, [field]: value },
        editDraftErrors: {},
      }));
    };

    return (
      <div className="inline-edit-form">
        {editDraft.type === 'latlong'
          ? renderLatlongFields(editDraft, setDraft, editDraftErrors)
          : renderCountryFields(editDraft, setDraft, editDraftErrors)}
        <div className="inline-form-actions">
          <button type="button" className="cancel-edit-btn" onClick={this.cancelEdit}>
            Cancel
          </button>
          <button type="button" className="save-edit-btn" onClick={this.saveEdit}>
            Save changes
          </button>
        </div>
      </div>
    );
  }

  renderReviewEntry(entry, issues) {
    const { editingId } = this.state;
    const status = entryStatus(issues);
    const isEditing = editingId === entry.id;

    const ICON = { valid: '✓', warning: '!', error: '✕' };

    return (
      <div key={entry.id} className={`review-entry -${status}`}>
        <div className="review-entry-header">
          <span className={`review-status-icon -${status}`} aria-hidden="true">
            {ICON[status]}
          </span>
          <span className={`entry-type-badge -${entry.type}`}>
            {entry.type === 'latlong' ? 'LL' : 'CO'}
          </span>
          <span className="review-entry-summary">{summariseEntry(entry)}</span>
          <div className="entry-actions">
            <button
              type="button"
              className="edit-entry-btn"
              onClick={() => (isEditing ? this.cancelEdit() : this.startEdit(entry))}
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
            <button
              type="button"
              className="remove-review-btn"
              aria-label="Remove entry"
              onClick={() => this.removeEntry(entry.id)}
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
                    onClick={() => this.applyQuickFix(entry.id, 'swap')}
                  >
                    Swap ↔
                  </button>
                )}
                {issue.fix === 'crop' && issue.suggestion && (
                  <button
                    type="button"
                    className={`fix-btn -${issue.severity}`}
                    onClick={() => this.applyQuickFix(entry.id, 'crop', issue.suggestion.value)}
                  >
                    Use &ldquo;{issue.suggestion.label}&rdquo;
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {isEditing && this.renderInlineEditForm()}
      </div>
    );
  }

  renderReviewScreen() {
    const { entries, outsideLandIds, spatialCheckError, analysisError } = this.state;
    const { onSubmit } = this.props;

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
            onClick={() => this.setState({ screen: 'input', editingId: null, editDraft: null })}
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
              {errors.map(({ entry, issues }) => this.renderReviewEntry(entry, issues))}
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="review-section">
              <p className="review-section-title">Warnings — review recommended</p>
              {warnings.map(({ entry, issues }) => this.renderReviewEntry(entry, issues))}
            </div>
          )}

          {/* Valid */}
          {valid.length > 0 && (
            <div className="review-section">
              <p className="review-section-title">Valid</p>
              {valid.map(({ entry, issues }) => this.renderReviewEntry(entry, issues))}
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
              onClick={this.runAnalysis}
            >
              Run Analysis ({validCount})
            </button>
            <button
              type="button"
              className="submit-btn"
              disabled={validCount === 0}
              onClick={this.applyValidEntries}
            >
              Apply {validCount} to map
            </button>
            {validCount === entries.length && validCount > 0 && (
              <button
                type="button"
                className="submit-btn -all"
                onClick={() => onSubmit(entries)}
              >
                Apply all
              </button>
            )}
          </div>
        </div>
      </div>
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

  // ── Results-screen helpers ───────────────────────────────────────────────

  setResultFilter(field, value) {
    this.setState(({ resultFilters }) => ({
      resultFilters: { ...resultFilters, [field]: value },
    }));
  }

  // Joins each API result row with its source entry (by unique_id) so we
  // can surface business_unit + any other input metadata that the API
  // doesn't echo back in the response payload.
  augmentResults(rows) {
    const { analysisEntries } = this.state;
    const byId = {};
    analysisEntries.forEach((e) => { byId[String(e.id)] = e; });
    return rows.map((row) => {
      const entry = byId[String(row.unique_id)];
      return {
        ...row,
        business_unit: row.business_unit || entry?.businessUnit || '',
      };
    });
  }

  applyResultFilters(rows) {
    const { resultFilters } = this.state;
    return rows.filter((row) => {
      if (resultFilters.watershed && String(row.pfaf_id) !== resultFilters.watershed) return false;
      if (resultFilters.crop && row.commodity_code !== resultFilters.crop) return false;
      if (resultFilters.businessUnit && (row.business_unit || '') !== resultFilters.businessUnit) return false;
      return true;
    });
  }

  applyResultSort(rows) {
    const { resultSort } = this.state;
    if (resultSort === 'default') return rows;
    const sorted = [...rows];
    if (resultSort === 'production_desc') {
      sorted.sort((a, b) => (
        (b.production_sourced_from_basin || b.basin_production || 0)
        - (a.production_sourced_from_basin || a.basin_production || 0)
      ));
    } else if (resultSort === 'risk_desc') {
      sorted.sort((a, b) => computeRiskScore(b) - computeRiskScore(a));
    }
    return sorted;
  }

  renderResultsScreen() {
    const {
      analysisResults,
      activeIndicator,
      resultFilters,
      resultSort,
      resultGrouping,
    } = this.state;
    if (!analysisResults) return null;
    const { results, errors, skipped } = analysisResults;
    const errorCount = (errors?.length || 0) + (skipped?.length || 0);

    const augmented = this.augmentResults(results);
    const visibleRows = this.applyResultSort(this.applyResultFilters(augmented));

    // Distinct values for the filter selects (built from the full result set
    // so users don't lose options after applying an earlier filter).
    const watershedOptions = [...new Set(augmented.map(r => r.pfaf_id).filter(v => v != null))].sort((a, b) => a - b);
    const cropOptions = [...new Set(augmented.map(r => r.commodity_code).filter(Boolean))].sort();
    const businessUnitOptions = [...new Set(augmented.map(r => r.business_unit).filter(Boolean))].sort();

    const GROUP_KEY = {
      watershed: 'pfaf_id',
      crop: 'commodity_code',
      business_unit: 'business_unit',
    };
    const GROUP_LABEL = {
      watershed: 'Watershed',
      crop: 'Crop',
      business_unit: 'Business Unit',
    };
    const groupKey = GROUP_KEY[resultGrouping];

    // Build [label, rows[]] pairs in the order the rows appear after sort.
    let groupedSections = null;
    if (groupKey) {
      const grouped = new Map();
      visibleRows.forEach((row) => {
        const value = row[groupKey];
        const label = value === null || value === undefined || value === ''
          ? '(no value)'
          : String(value);
        if (!grouped.has(label)) grouped.set(label, []);
        grouped.get(label).push(row);
      });
      groupedSections = [...grouped.entries()];
    }

    return (
      <div className="review-screen">
        <div className="review-header">
          <button
            type="button"
            className="review-back-btn"
            onClick={() => this.setState({ screen: 'review' })}
          >
            &#8592; Back
          </button>
          <span className="review-title">Analysis Results</span>
        </div>

        {/* Indicator selector ---------------------------------------------- */}
        {(() => {
          const selected = ANALYSIS_INDICATORS.find(i => i.key === activeIndicator);
          return (
            <div className="results-indicator-bar">
              <label className="results-control -indicator">
                <span>Analysis</span>
                <select
                  value={activeIndicator}
                  onChange={e => this.setState({ activeIndicator: e.target.value })}
                >
                  {ANALYSIS_INDICATORS.map(ind => (
                    <option key={ind.key} value={ind.key}>{ind.label}</option>
                  ))}
                </select>
              </label>
              {selected && (
                <p className="results-indicator-description">{selected.description}</p>
              )}
            </div>
          );
        })()}

        {/* Group-by radio --------------------------------------------------- */}
        <div className="results-grouping">
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
            onChange={({ value }) => this.setState({ resultGrouping: value })}
          />
        </div>

        {/* Filters + sort ---------------------------------------------------- */}
        <div className="results-controls">
          <label className="results-control">
            <span>Watershed</span>
            <select
              value={resultFilters.watershed}
              onChange={e => this.setResultFilter('watershed', e.target.value)}
            >
              <option value="">All ({watershedOptions.length})</option>
              {watershedOptions.map(w => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </label>

          <label className="results-control">
            <span>Crop</span>
            <select
              value={resultFilters.crop}
              onChange={e => this.setResultFilter('crop', e.target.value)}
            >
              <option value="">All ({cropOptions.length})</option>
              {cropOptions.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>

          <label className="results-control">
            <span>Business Unit</span>
            <select
              value={resultFilters.businessUnit}
              onChange={e => this.setResultFilter('businessUnit', e.target.value)}
              disabled={businessUnitOptions.length === 0}
            >
              <option value="">All ({businessUnitOptions.length})</option>
              {businessUnitOptions.map(bu => (
                <option key={bu} value={bu}>{bu}</option>
              ))}
            </select>
          </label>

          <label className="results-control">
            <span>Sort by</span>
            <select
              value={resultSort}
              onChange={e => this.setState({ resultSort: e.target.value })}
            >
              <option value="default">Input order</option>
              <option value="production_desc">Highest production</option>
              <option value="risk_desc">Highest risk</option>
            </select>
          </label>
        </div>

        <div className="review-summary-bar">
          <span className="summary-stat -valid">
            <span className="stat-count">{visibleRows.length}</span>
            {visibleRows.length !== augmented.length
              ? ` of ${augmented.length} `
              : ' '}
            row{visibleRows.length !== 1 ? 's' : ''}
          </span>
          <span className="summary-divider" />
          <span className="summary-stat -error">
            <span className="stat-count">{errorCount}</span> failed
          </span>
        </div>

        {visibleRows.length > 0 ? (() => {
          const columns = getResultColumns(visibleRows, activeIndicator);

          const renderRow = (row, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <tr key={`${row.unique_id}-${row.pfaf_id}-${i}`}>
              {columns.map((key) => {
                const tooltip = describeIndicatorValue(key, row);
                const numericTitle = typeof row[key] === 'number' ? String(row[key]) : undefined;
                return (
                  <td key={key} title={!tooltip ? numericTitle : undefined}>
                    <span className="cell-value">{formatResultCell(row[key])}</span>
                    {tooltip && (
                      <span
                        className="cell-info"
                        role="img"
                        aria-label={tooltip}
                        tabIndex={0}
                        data-info={tooltip}
                      >
                        i
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          );

          return (
            <div className="analysis-results-table">
              <table>
                <thead>
                  <tr>
                    {columns.map(key => (
                      <th key={key} title={key}>
                        {RESULT_COLUMN_LABELS[key] || key}
                      </th>
                    ))}
                  </tr>
                </thead>
                {groupedSections ? (
                  groupedSections.map(([label, rows]) => (
                    <tbody key={`group-${label}`} className="result-group">
                      <tr className="group-header">
                        <td colSpan={columns.length}>
                          <span className="group-header-tag">{GROUP_LABEL[resultGrouping]}</span>
                          <span className="group-header-value">{label}</span>
                          <span className="group-header-count">
                            {rows.length} row{rows.length !== 1 ? 's' : ''}
                          </span>
                        </td>
                      </tr>
                      {rows.map(renderRow)}
                    </tbody>
                  ))
                ) : (
                  <tbody>{visibleRows.map(renderRow)}</tbody>
                )}
              </table>
            </div>
          );
        })() : (
          <div className="analysis-empty-results">
            {augmented.length === 0
              ? 'No basin matches were returned for the locations you submitted.'
              : 'No results match the current filters.'}
          </div>
        )}

        {errorCount > 0 && (
          <div className="analysis-errors">
            <p className="review-section-title">Locations that did not match a basin</p>
            <ul>
              {(errors || []).map(e => (
                <li key={`api-${e.unique_id}`}>
                  <strong>{e.unique_id}</strong> — {e.reason || 'no basin matched'}
                </li>
              ))}
              {(skipped || []).map(s => (
                <li key={`skip-${s.unique_id}`}>
                  <strong>{s.unique_id}</strong> — {s.reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="review-footer">
          <div className="review-footer-actions">
            <button
              type="button"
              className="submit-btn -primary"
              disabled={!results.length}
              onClick={this.downloadAnalysisResults}
            >
              Download CSV
            </button>
            <button
              type="button"
              className="submit-btn"
              onClick={() => this.setState({ screen: 'review' })}
            >
              Back to review
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────

  render() {
    const {
      screen,
      panelMode,
      entryMode,
      entries,
      uploadFile,
      isDragging,
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
          <div className="input-panel-body">
            <div className="entry-mode-tabs">
              {ENTRY_MODES.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`entry-tab${entryMode === opt.value ? ' -active' : ''}`}
                  onClick={() => this.setState({ entryMode: opt.value, errors: {} })}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {entryMode === 'latlong' ? this.renderLatlongForm() : this.renderCountryForm()}

            <div className="panel-footer">
              <button
                type="button"
                className="add-location-btn"
                onClick={this.addEntry}
              >
                + Add Location
              </button>
            </div>
          </div>
        )}

        {/* Bulk Upload */}
        {panelMode === 'bulk' && (
          <div className="input-panel-body">
            <p className="bulk-description">
              Download the CSV template, fill in your data, then upload the completed file.
              Valid rows will be appended to the current locations list.
            </p>

            <button type="button" className="template-btn" onClick={downloadTemplate}>
              <span className="template-btn-icon">&#8595;</span> Download Template
            </button>

            <div
              role="button"
              tabIndex={0}
              className={`file-dropzone${isDragging ? ' -dragging' : ''}${uploadFile ? ' -has-file' : ''}`}
              onDragOver={(e) => { e.preventDefault(); this.setState({ isDragging: true }); }}
              onDragLeave={() => this.setState({ isDragging: false })}
              onDrop={this.handleDrop}
              onClick={() => this.fileInputRef.current && this.fileInputRef.current.click()}
              onKeyDown={e => e.key === 'Enter' && this.fileInputRef.current && this.fileInputRef.current.click()}
            >
              <input
                type="file"
                accept=".csv"
                ref={this.fileInputRef}
                style={{ display: 'none' }}
                onChange={e => this.handleFileChange(e.target.files[0])}
              />
              {uploadFile
                ? (
                  <span className="file-name">
                    <span role="img" aria-label="file" className="file-icon">&#128196;</span>
                    {' '}{uploadFile.name}
                  </span>
                )
                : (
                  <span className="dropzone-hint">
                    Drop CSV here or <strong>click to browse</strong>
                  </span>
                )
              }
            </div>

            {uploadFile && (
              <div className="panel-footer">
                <button type="button" className="upload-btn" onClick={this.processUpload}>
                  Process Upload
                </button>
                <button
                  type="button"
                  className="clear-file-btn"
                  onClick={() => this.setState({ uploadFile: null, bulkResult: null })}
                >
                  Clear
                </button>
              </div>
            )}

            {this.renderBulkResult()}
          </div>
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
                {spatialCheckLoading
                  ? 'Checking locations\u2026'
                  : errorCount > 0
                    ? `Review & Fix (${errorCount} error${errorCount !== 1 ? 's' : ''})`
                    : 'Review & Validate'}
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
};

InputPanel.defaultProps = {
  onSubmit: () => {},
};

export default InputPanel;
