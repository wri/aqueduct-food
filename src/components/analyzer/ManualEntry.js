import React from 'react';
import PropTypes from 'prop-types';
import { CustomSelect, RadioGroup, IRRIGATION_OPTIONS } from 'aqueduct-components';
import CountrySelect from 'components/country-select';
import {
  ENTRY_MODES,
  SORTED_CROP_OPTIONS,
} from 'constants/supply-analyzer';

// ─── Shared field-set renderers (no `this`) ──────────────────────────────────
// Exported so the review screen's inline edit form can reuse the same fields.

export function renderLatlongFields(form, setField, errs, { lightSurface = false } = {}) {
  const entryFormClass = lightSurface ? 'entry-form -light-surface' : 'entry-form';
  const selectClass = lightSurface ? '-gray' : undefined;
  const radioClass = lightSurface ? '-inline -secondary' : '-inline';

  return (
    <div className={entryFormClass}>
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
            className={selectClass}
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
            items={IRRIGATION_OPTIONS}
            selected={form.irrigation}
            onChange={({ value }) => setField('irrigation', value)}
            className={radioClass}
          />
          {errs.irrigation && <span className="field-error">{errs.irrigation}</span>}
        </div>
      </div>

      <div className={`form-row${errs.volume ? ' -invalid' : ''}`}>
        <div className="form-field">
          <span className="field-label">
            Volume <span className="required-mark">*</span>
          </span>
          <input
            type="number"
            className="field-input"
            placeholder="e.g. 1000"
            min="1"
            step="any"
            value={form.volume}
            onChange={e => setField('volume', e.target.value)}
          />
          {errs.volume && <span className="field-error">{errs.volume}</span>}
        </div>
      </div>
    </div>
  );
}

export function renderCountryFields(form, setField, errs, { lightSurface = false } = {}) {
  const entryFormClass = lightSurface ? 'entry-form -light-surface' : 'entry-form';
  const selectClass = lightSurface ? '-gray' : undefined;
  const radioClass = lightSurface ? '-inline -secondary' : '-inline';

  return (
    <div className={entryFormClass}>
      <div className={`form-row${errs.country ? ' -invalid' : ''}`}>
        <div className="form-field">
          <span className="field-label">
            Country <span className="required-mark">*</span>
          </span>
          <CountrySelect
            className={selectClass}
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
            className={selectClass}
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
            items={IRRIGATION_OPTIONS}
            selected={form.irrigation}
            onChange={({ value }) => setField('irrigation', value)}
            className={radioClass}
          />
          {errs.irrigation && <span className="field-error">{errs.irrigation}</span>}
        </div>
      </div>

      <div className={`form-row${errs.volume ? ' -invalid' : ''}`}>
        <div className="form-field">
          <span className="field-label">
            Volume <span className="required-mark">*</span>
          </span>
          <input
            type="number"
            className="field-input"
            placeholder="e.g. 1000"
            min="1"
            step="any"
            value={form.volume}
            onChange={e => setField('volume', e.target.value)}
          />
          {errs.volume && <span className="field-error">{errs.volume}</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Manual Entry tab ────────────────────────────────────────────────────────

const ManualEntry = ({
  entryMode,
  latlongForm,
  countryForm,
  errors,
  onEntryModeChange,
  setLatlongField,
  setCountryField,
  onAddEntry,
}) => (
  <div className="input-panel-body">
    <div className="entry-mode-tabs">
      {ENTRY_MODES.map(opt => (
        <button
          key={opt.value}
          type="button"
          className={`entry-tab${entryMode === opt.value ? ' -active' : ''}`}
          onClick={() => onEntryModeChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>

    {entryMode === 'latlong'
      ? renderLatlongFields(latlongForm, setLatlongField, errors)
      : renderCountryFields(countryForm, setCountryField, errors)}

    <div className="panel-footer">
      <button
        type="button"
        className="add-location-btn"
        onClick={onAddEntry}
      >
        + Add Location
      </button>
    </div>
  </div>
);

ManualEntry.propTypes = {
  entryMode: PropTypes.string.isRequired,
  latlongForm: PropTypes.object.isRequired,
  countryForm: PropTypes.object.isRequired,
  errors: PropTypes.object,
  onEntryModeChange: PropTypes.func.isRequired,
  setLatlongField: PropTypes.func.isRequired,
  setCountryField: PropTypes.func.isRequired,
  onAddEntry: PropTypes.func.isRequired,
};

ManualEntry.defaultProps = {
  errors: {},
};

export default ManualEntry;
