import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { CustomSelect, RadioGroup, IRRIGATION_OPTIONS } from 'aqueduct-components';
import { CROP_OPTIONS } from 'constants/crops';
import CountrySelect from 'components/country-select';

const PANEL_MODES = [
  { value: 'manual', label: 'Manual Entry' },
  { value: 'bulk', label: 'Bulk Upload' },
];

const ENTRY_MODES = [
  { value: 'latlong', label: 'Lat / Long' },
  { value: 'country', label: 'Country + State' },
];

const INITIAL_LATLONG_FORM = {
  latitude: '',
  longitude: '',
  radius: '',
  crop: null,
  irrigation: null,
  volume: '',
};

const INITIAL_COUNTRY_FORM = {
  country: null,
  countryName: '',
  state: '',
  irrigation: null,
  volume: '',
};

const SORTED_CROP_OPTIONS = CROP_OPTIONS
  .filter(c => c.value !== 'all')
  .sort((a, b) => (a.label > b.label ? 1 : -1));

const FILTERED_IRRIGATION_OPTIONS = IRRIGATION_OPTIONS.filter(i => i.value !== 'all');

const VALID_IRRIGATION_VALUES = new Set(IRRIGATION_OPTIONS.map(i => i.value));
const VALID_CROP_VALUES = new Set(CROP_OPTIONS.map(c => c.value));

function generateTemplateCSV() {
  const rows = [
    ['type', 'latitude', 'longitude', 'radius_km', 'country_iso', 'state', 'crop', 'irrigation', 'volume'],
    ['latlong', '-1.2921', '36.8219', '50', '', '', 'wheat', 'irrigated', '1000'],
    ['country', '', '', '', 'KEN', 'Nairobi', '', 'rainfed', ''],
  ];
  return rows.map(r => r.join(',')).join('\n');
}

function downloadTemplate() {
  const csv = generateTemplateCSV();
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'location-input-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function parseCSVText(text) {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return { parsed: [], skipped: [] };

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const idx = col => headers.indexOf(col);
  const parsed = [];
  const skipped = [];
  const base = Date.now();

  lines.slice(1).forEach((line, i) => {
    const cols = line.split(',').map(c => c.trim());
    const get = col => (idx(col) >= 0 ? cols[idx(col)] || '' : '');
    const rowNum = i + 2;
    const type = get('type').toLowerCase();

    if (type === 'latlong') {
      const lat = parseFloat(get('latitude'));
      const lng = parseFloat(get('longitude'));
      const crop = get('crop');
      const irrigation = get('irrigation');

      const latOk = !Number.isNaN(lat) && lat >= -90 && lat <= 90;
      const lngOk = !Number.isNaN(lng) && lng >= -180 && lng <= 180;
      const cropOk = VALID_CROP_VALUES.has(crop);
      const irrigOk = VALID_IRRIGATION_VALUES.has(irrigation);

      if (!latOk || !lngOk || !cropOk || !irrigOk) {
        const reasons = [];
        if (!latOk) reasons.push('latitude');
        if (!lngOk) reasons.push('longitude');
        if (!cropOk) reasons.push('crop');
        if (!irrigOk) reasons.push('irrigation');
        skipped.push({ row: rowNum, reasons });
        return;
      }

      parsed.push({
        id: base + i,
        type: 'latlong',
        latitude: String(lat),
        longitude: String(lng),
        radius: get('radius_km'),
        crop,
        irrigation,
        volume: get('volume'),
      });
    } else if (type === 'country') {
      const country = get('country_iso');
      const irrigation = get('irrigation');

      const countryOk = !!country;
      const irrigOk = VALID_IRRIGATION_VALUES.has(irrigation);

      if (!countryOk || !irrigOk) {
        const reasons = [];
        if (!countryOk) reasons.push('country_iso');
        if (!irrigOk) reasons.push('irrigation');
        skipped.push({ row: rowNum, reasons });
        return;
      }

      parsed.push({
        id: base + i,
        type: 'country',
        country,
        countryName: country,
        state: get('state'),
        irrigation,
        volume: get('volume'),
      });
    } else {
      skipped.push({ row: rowNum, reasons: ['unknown type'] });
    }
  });

  return { parsed, skipped };
}

function summariseEntry(entry) {
  if (entry.type === 'latlong') {
    const lat = parseFloat(entry.latitude).toFixed(4);
    const lng = parseFloat(entry.longitude).toFixed(4);
    const cropLabel = CROP_OPTIONS.find(c => c.value === entry.crop)?.label || entry.crop;
    return [
      `${lat}, ${lng}`,
      entry.radius ? `${entry.radius} km radius` : null,
      cropLabel,
      entry.irrigation,
      entry.volume ? `Vol: ${entry.volume}` : null,
    ].filter(Boolean).join(' · ');
  }
  return [
    entry.countryName,
    entry.state || null,
    entry.irrigation,
    entry.volume ? `Vol: ${entry.volume}` : null,
  ].filter(Boolean).join(' · ');
}

class InputPanel extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      panelMode: 'manual',
      entryMode: 'latlong',
      latlongForm: { ...INITIAL_LATLONG_FORM },
      countryForm: { ...INITIAL_COUNTRY_FORM },
      entries: [],
      uploadFile: null,
      isDragging: false,
      errors: {},
      bulkResult: null,
    };

    this.fileInputRef = React.createRef();
    this.addEntry = this.addEntry.bind(this);
    this.removeEntry = this.removeEntry.bind(this);
    this.handleDrop = this.handleDrop.bind(this);
    this.handleFileChange = this.handleFileChange.bind(this);
    this.processUpload = this.processUpload.bind(this);
  }

  validateLatlongForm() {
    const { latlongForm } = this.state;
    const errors = {};
    const lat = parseFloat(latlongForm.latitude);
    const lng = parseFloat(latlongForm.longitude);

    if (latlongForm.latitude === '' || Number.isNaN(lat)) errors.latitude = 'Required';
    else if (lat < -90 || lat > 90) errors.latitude = 'Must be between -90 and 90';

    if (latlongForm.longitude === '' || Number.isNaN(lng)) errors.longitude = 'Required';
    else if (lng < -180 || lng > 180) errors.longitude = 'Must be between -180 and 180';

    if (!latlongForm.crop) errors.crop = 'Required';
    if (!latlongForm.irrigation) errors.irrigation = 'Required';
    return errors;
  }

  validateCountryForm() {
    const { countryForm } = this.state;
    const errors = {};
    if (!countryForm.country) errors.country = 'Required';
    if (!countryForm.irrigation) errors.irrigation = 'Required';
    return errors;
  }

  addEntry() {
    const { entryMode } = this.state;
    const errors = entryMode === 'latlong'
      ? this.validateLatlongForm()
      : this.validateCountryForm();

    if (Object.keys(errors).length > 0) {
      this.setState({ errors });
      return;
    }

    const { latlongForm: llForm, countryForm: coForm } = this.state;
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
    this.setState(({ entries }) => ({
      entries: entries.filter(e => e.id !== id),
    }));
  }

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

  renderLatlongForm() {
    const { latlongForm, errors } = this.state;

    const setField = (field, value, clearError = true) => {
      this.setState(({ latlongForm: form, errors: errs }) => ({
        latlongForm: { ...form, [field]: value },
        errors: clearError ? { ...errs, [field]: undefined } : errs,
      }));
    };

    return (
      <div className="entry-form">
        <div className="form-row -two-col">
          <div className={`form-field${errors.latitude ? ' -invalid' : ''}`}>
            <span className="field-label">
              Latitude
              <span className="required-mark">*</span>
            </span>
            <input
              id="ip-latitude"
              type="number"
              className="field-input"
              placeholder="-90 to 90"
              min="-90"
              max="90"
              step="any"
              value={latlongForm.latitude}
              onChange={e => setField('latitude', e.target.value)}
            />
            {errors.latitude && <span className="field-error">{errors.latitude}</span>}
          </div>

          <div className={`form-field${errors.longitude ? ' -invalid' : ''}`}>
            <span className="field-label">
              Longitude
              <span className="required-mark">*</span>
            </span>
            <input
              id="ip-longitude"
              type="number"
              className="field-input"
              placeholder="-180 to 180"
              min="-180"
              max="180"
              step="any"
              value={latlongForm.longitude}
              onChange={e => setField('longitude', e.target.value)}
            />
            {errors.longitude && <span className="field-error">{errors.longitude}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <span className="field-label">
              Radius
              <span className="optional-mark">(km &mdash; optional)</span>
            </span>
            <input
              id="ip-radius"
              type="number"
              className="field-input"
              placeholder="e.g. 50"
              min="0"
              step="any"
              value={latlongForm.radius}
              onChange={e => setField('radius', e.target.value, false)}
            />
          </div>
        </div>

        <div className={`form-row${errors.crop ? ' -invalid' : ''}`}>
          <div className="form-field">
            <span className="field-label">
              Crop
              <span className="required-mark">*</span>
            </span>
            <CustomSelect
              search
              options={SORTED_CROP_OPTIONS}
              value={latlongForm.crop}
              onValueChange={selected => setField('crop', selected ? selected.value : null)}
            />
            {errors.crop && <span className="field-error">{errors.crop}</span>}
          </div>
        </div>

        <div className={`form-row${errors.irrigation ? ' -invalid' : ''}`}>
          <div className="form-field">
            <span className="field-label">
              Irrigation
              <span className="required-mark">*</span>
            </span>
            <RadioGroup
              name="latlong-irrigation"
              items={FILTERED_IRRIGATION_OPTIONS}
              selected={latlongForm.irrigation}
              onChange={({ value }) => setField('irrigation', value)}
              className="-inline"
            />
            {errors.irrigation && <span className="field-error">{errors.irrigation}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <span className="field-label">
              Volume
              <span className="optional-mark">(optional)</span>
            </span>
            <input
              id="ip-ll-volume"
              type="number"
              className="field-input"
              placeholder="e.g. 1000"
              min="0"
              step="any"
              value={latlongForm.volume}
              onChange={e => setField('volume', e.target.value, false)}
            />
          </div>
        </div>
      </div>
    );
  }

  renderCountryForm() {
    const { countryForm, errors } = this.state;

    const setField = (field, value, clearError = true) => {
      this.setState(({ countryForm: form, errors: errs }) => ({
        countryForm: { ...form, [field]: value },
        errors: clearError ? { ...errs, [field]: undefined } : errs,
      }));
    };

    return (
      <div className="entry-form">
        <div className={`form-row${errors.country ? ' -invalid' : ''}`}>
          <div className="form-field">
            <span className="field-label">
              Country
              <span className="required-mark">*</span>
            </span>
            <CountrySelect
              value={countryForm.country !== null ? countryForm.country : undefined}
              onValueChange={(selected) => {
                this.setState(({ errors: errs }) => ({
                  countryForm: {
                    country: selected ? selected.value : null,
                    countryName: selected ? selected.label : '',
                    state: countryForm.state,
                    irrigation: countryForm.irrigation,
                    volume: countryForm.volume,
                  },
                  errors: { ...errs, country: undefined },
                }));
              }}
            />
            {errors.country && <span className="field-error">{errors.country}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <span className="field-label">
              State
              <span className="optional-mark">(optional)</span>
            </span>
            <input
              id="ip-state"
              type="text"
              className="field-input"
              placeholder="e.g. Nairobi County"
              value={countryForm.state}
              onChange={e => setField('state', e.target.value, false)}
            />
          </div>
        </div>

        <div className={`form-row${errors.irrigation ? ' -invalid' : ''}`}>
          <div className="form-field">
            <span className="field-label">
              Irrigation
              <span className="required-mark">*</span>
            </span>
            <RadioGroup
              name="country-irrigation"
              items={FILTERED_IRRIGATION_OPTIONS}
              selected={countryForm.irrigation}
              onChange={({ value }) => setField('irrigation', value)}
              className="-inline"
            />
            {errors.irrigation && <span className="field-error">{errors.irrigation}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <span className="field-label">
              Volume
              <span className="optional-mark">(optional)</span>
            </span>
            <input
              id="ip-co-volume"
              type="number"
              className="field-input"
              placeholder="e.g. 1000"
              min="0"
              step="any"
              value={countryForm.volume}
              onChange={e => setField('volume', e.target.value, false)}
            />
          </div>
        </div>
      </div>
    );
  }

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

  render() {
    const {
      panelMode,
      entryMode,
      entries,
      uploadFile,
      isDragging,
    } = this.state;
    const { onSubmit } = this.props;

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

            <button
              type="button"
              className="template-btn"
              onClick={downloadTemplate}
            >
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
                <button
                  type="button"
                  className="upload-btn"
                  onClick={this.processUpload}
                >
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

        {/* Entries list — visible from both tabs */}
        {entries.length > 0 && (
          <div className="entries-list">
            <div className="entries-list-header">
              <span className="entries-count">
                {entries.length} location{entries.length !== 1 ? 's' : ''} added
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
              {entries.map(entry => (
                <li key={entry.id} className="entry-item">
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
                className="submit-btn"
                onClick={() => onSubmit(entries)}
              >
                Apply Locations
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
