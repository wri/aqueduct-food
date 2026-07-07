import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { setSupplyChainEntries } from 'actions/supplyChainEntries';
import { setSupplyChainAnalysis, closeSupplyChainReview } from 'actions/supplyChainAnalysis';
import ManualEntry from 'components/analyzer/ManualEntry';
import BulkUpload from 'components/analyzer/BulkUpload';
import Review from 'components/analyzer/Review';
import SupplyChainResultsControls from 'components/filters/supply-chain-results-controls';
import {
  PANEL_MODES,
  INITIAL_LATLONG_FORM,
  INITIAL_COUNTRY_FORM,
} from 'constants/supply-analyzer';
import { DEFAULT_ANALYSIS_VIEW } from 'constants/analysis-indicators';
import {
  parseCSVText,
  validateLatlongFields,
  validateCountryFields,
  classifyEntries,
  fillMissingBusinessUnits,
} from 'utils/supply-analyzer';
import { runFoodSupplyChainAnalysis } from 'services/analysis';

// ─── Component ────────────────────────────────────────────────────────────────

class InputPanel extends PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      // Input phase
      panelMode: 'manual',
      entryMode: 'latlong',
      latlongForm: { ...INITIAL_LATLONG_FORM },
      countryForm: { ...INITIAL_COUNTRY_FORM },
      uploadFile: null,
      isDragging: false,
      errors: {},
      bulkResult: null,
    };

    this.fileInputRef = React.createRef();

    this.addEntry = this.addEntry.bind(this);
    this.removeEntry = this.removeEntry.bind(this);
    this.setLatlongField = this.setLatlongField.bind(this);
    this.setCountryField = this.setCountryField.bind(this);
    this.handleDrop = this.handleDrop.bind(this);
    this.handleFileChange = this.handleFileChange.bind(this);
    this.processUpload = this.processUpload.bind(this);
    this.applyValidEntries = this.applyValidEntries.bind(this);
    this.runAnalysis = this.runAnalysis.bind(this);
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

    const { entries, setEntries } = this.props;
    setEntries(fillMissingBusinessUnits([...entries, { ...entry, id: Date.now() }]));
    this.setState(({ latlongForm, countryForm }) => ({
      latlongForm: entryMode === 'latlong' ? { ...INITIAL_LATLONG_FORM } : latlongForm,
      countryForm: entryMode === 'country' ? { ...INITIAL_COUNTRY_FORM } : countryForm,
      errors: {},
    }));
  }

  removeEntry(id) {
    const { entries, setEntries } = this.props;
    setEntries(entries.filter(e => e.id !== id));
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
      const { entries, setEntries } = this.props;
      setEntries(fillMissingBusinessUnits([...entries, ...parsed]));
      this.setState({
        uploadFile: null,
        bulkResult: { added: parsed.length, skipped },
      });
    };
    reader.onerror = () => {
      this.setState({ bulkResult: { added: 0, skipped: [], readError: true } });
    };
    reader.readAsText(uploadFile);
  }

  // Computes the subset of entries with no blocking errors. Shared by the
  // "Apply" path (pushes locations to the map) and the "Run Analysis" path.
  validEntries() {
    const { entries, outsideLandIds } = this.props;
    const { validated } = classifyEntries(entries, outsideLandIds);
    return validated
      .filter(({ issues }) => entryStatus(issues) !== 'error')
      .map(({ entry }) => entry);
  }

  applyValidEntries() {
    const { onSubmit } = this.props;
    onSubmit(this.validEntries());
  }

  // ── Analysis ─────────────────────────────────────────────────────────────

  runAnalysis() {
    const { onSubmit, onBasinsResolved, setAnalysis } = this.props;
    const valid = this.validEntries();
    if (!valid.length) return;

    // Push the same set to the map so the visual context matches the table.
    onSubmit(valid);
    // Clear any basins from a previous run while the new one is in flight.
    onBasinsResolved(null);

    // The results now render in the section below the input header, driven by
    // the shared analysis phase.
    setAnalysis({
      phase: 'analyzing',
      results: null,
      entries: valid,
      error: null,
      view: { ...DEFAULT_ANALYSIS_VIEW },
    });

    // Request basin geometry too so the map can outline the matched basins.
    // `simplify` keeps the GeoJSON payload small while preserving shape.
    runFoodSupplyChainAnalysis(valid, { geometry: true, simplify: 0.01 })
      .then((data) => {
        onBasinsResolved(data.geojson || null);
        setAnalysis({ phase: 'results', results: data, error: null });
      })
      .catch((err) => {
        const detail = err?.response?.data?.errors?.[0]?.detail;
        const message = detail || err?.message || 'Analysis request failed';
        setAnalysis({ phase: 'idle', error: message });
      });
  }

  // ── Review screen ────────────────────────────────────────────────────────

  renderReviewScreen() {
    const {
      spatialCheckError,
      closeReview,
      onSubmit,
      entries,
      outsideLandIds,
      analysisError,
    } = this.props;

    return (
      <Review
        entries={entries}
        outsideLandIds={outsideLandIds}
        spatialCheckError={spatialCheckError}
        analysisError={analysisError}
        onBack={closeReview}
        onRunAnalysis={this.runAnalysis}
        onApplyValidEntries={this.applyValidEntries}
        onApplyAll={() => onSubmit(entries)}
      />
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────

  render() {
    const {
      panelMode,
      entryMode,
      latlongForm,
      countryForm,
      errors,
      uploadFile,
      isDragging,
      bulkResult,
    } = this.state;
    const { screen, phase } = this.props;

    // While the analysis is showing results, the header holds the results
    // controls (the data table/charts render in the section below).
    if (phase === 'results') {
      return (
        <div className="c-input-panel">
          <SupplyChainResultsControls />
        </div>
      );
    }

    if (screen === 'review') {
      return (
        <div className="c-input-panel">
          {this.renderReviewScreen()}
        </div>
      );
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
      </div>
    );
  }
}

InputPanel.propTypes = {
  entries: PropTypes.array,
  outsideLandIds: PropTypes.array,
  analysisError: PropTypes.string,
  phase: PropTypes.string,
  screen: PropTypes.string,
  spatialCheckError: PropTypes.bool,
  setEntries: PropTypes.func.isRequired,
  setAnalysis: PropTypes.func.isRequired,
  closeReview: PropTypes.func.isRequired,
  onSubmit: PropTypes.func,
  onBasinsResolved: PropTypes.func,
};

InputPanel.defaultProps = {
  entries: [],
  outsideLandIds: [],
  analysisError: null,
  phase: 'idle',
  screen: 'input',
  spatialCheckError: false,
  onSubmit: () => {},
  onBasinsResolved: () => {},
};

export default connect(
  state => ({
    entries: state.supplyChainEntries,
    outsideLandIds: state.supplyChainOutsideLand,
    analysisError: state.supplyChainAnalysis.error,
    phase: state.supplyChainAnalysis.phase,
    screen: state.supplyChainAnalysis.screen,
    spatialCheckError: state.supplyChainAnalysis.spatialCheckError,
  }),
  {
    setEntries: setSupplyChainEntries,
    setAnalysis: setSupplyChainAnalysis,
    closeReview: closeSupplyChainReview,
  },
)(InputPanel);
