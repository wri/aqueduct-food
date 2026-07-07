import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { setSupplyChainEntries } from 'actions/supplyChainEntries';
import ManualEntry from 'components/analyzer/ManualEntry';
import BulkUpload from 'components/analyzer/BulkUpload';
import SupplyChainResultsControls from 'components/filters/supply-chain-results-controls';
import {
  PANEL_MODES,
  INITIAL_LATLONG_FORM,
  INITIAL_COUNTRY_FORM,
} from 'constants/supply-analyzer';
import {
  parseCSVText,
  validateLatlongFields,
  validateCountryFields,
  fillMissingBusinessUnits,
} from 'utils/supply-analyzer';

// ─── Component ────────────────────────────────────────────────────────────────

class InputPanel extends PureComponent {
  constructor(props) {
    super(props);

    this.state = {
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
    this.setLatlongField = this.setLatlongField.bind(this);
    this.setCountryField = this.setCountryField.bind(this);
    this.handleDrop = this.handleDrop.bind(this);
    this.handleFileChange = this.handleFileChange.bind(this);
    this.processUpload = this.processUpload.bind(this);
  }

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
    const { phase, analysisEntries } = this.props;

    if (phase === 'results') {
      return (
        <div className="c-input-panel">
          <SupplyChainResultsControls />
        </div>
      );
    }

    if (phase === 'analyzing') {
      const count = analysisEntries.length;
      return (
        <div className="c-input-panel">
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
        </div>
      );
    }

    return (
      <div className="c-input-panel">
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
  phase: PropTypes.string,
  analysisEntries: PropTypes.array,
  setEntries: PropTypes.func.isRequired,
};

InputPanel.defaultProps = {
  entries: [],
  phase: 'idle',
  analysisEntries: [],
};

export default connect(
  state => ({
    entries: state.supplyChainEntries,
    phase: state.supplyChainAnalysis.phase,
    analysisEntries: state.supplyChainAnalysis.entries,
  }),
  {
    setEntries: setSupplyChainEntries,
  },
)(InputPanel);
