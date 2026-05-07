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
} from 'utils/supply-analyzer';

const LS_KEY = 'inputPanel_entries';

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
      if (raw) savedEntries = JSON.parse(raw);
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
      screen: 'input', // 'input' | 'review'
      editingId: null,
      editDraft: null,
      editDraftErrors: {},
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
      entries: [...entries, { ...entry, id: Date.now() }],
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
        entries: [...entries, ...parsed],
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
    this.setState({ screen: 'review', editingId: null, editDraft: null, editDraftErrors: {} });
  }

  startEdit(entry) {
    this.setState({ editingId: entry.id, editDraft: { ...entry }, editDraftErrors: {} });
  }

  cancelEdit() {
    this.setState({ editingId: null, editDraft: null, editDraftErrors: {} });
  }

  saveEdit() {
    const { editDraft, editingId } = this.state;
    const formErrors = editDraft.type === 'latlong'
      ? validateLatlongFields(editDraft)
      : validateCountryFields(editDraft);

    if (Object.keys(formErrors).length > 0) {
      this.setState({ editDraftErrors: formErrors });
      return;
    }

    this.setState(({ entries }) => ({
      entries: entries.map(e => (e.id === editingId ? { ...editDraft, id: editingId } : e)),
      editingId: null,
      editDraft: null,
      editDraftErrors: {},
    }));
  }

  applyQuickFix(id, fix, fixValue) {
    this.setState(({ entries }) => ({
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
    }));
  }

  applyValidEntries() {
    const { entries } = this.state;
    const { onSubmit } = this.props;
    const valid = entries.filter(e => entryStatus(validateEntry(e)) !== 'error');
    onSubmit(valid);
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
    const { entries } = this.state;
    const { onSubmit } = this.props;

    const validated = entries.map(e => ({ entry: e, issues: validateEntry(e) }));
    const errors = validated.filter(({ issues }) => entryStatus(issues) === 'error');
    const warnings = validated.filter(({ issues }) => entryStatus(issues) === 'warning');
    const valid = validated.filter(({ issues }) => entryStatus(issues) === 'valid');
    const validCount = entries.filter(e => entryStatus(validateEntry(e)) !== 'error').length;

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
              className="submit-btn"
              disabled={validCount === 0}
              onClick={this.applyValidEntries}
            >
              Apply {validCount} valid location{validCount !== 1 ? 's' : ''}
            </button>
            {validCount === entries.length && (
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

  // ── Main render ──────────────────────────────────────────────────────────

  render() {
    const {
      screen,
      panelMode,
      entryMode,
      entries,
      uploadFile,
      isDragging,
    } = this.state;

    if (screen === 'review') {
      return (
        <div className="c-input-panel">
          {this.renderReviewScreen()}
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
                className="review-btn"
                onClick={this.openReview}
              >
                {errorCount > 0
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
