import React from 'react';
import PropTypes from 'prop-types';
import { CustomSelect } from 'aqueduct-components';

import { fetchSupplyChainStates } from 'services/analysis';

// State / province selector for the country-based manual entry form. Fetches
// the GADM level-1 units for the selected country and lets the user pick one
// from a searchable dropdown. Falls back to a free-text input when no country
// is selected yet or when the lookup fails, so entry is never blocked.
class StateSelect extends React.Component {
  constructor(props) {
    super(props);
    this.state = { options: [], loading: false, error: false };
    this.handleChange = this.handleChange.bind(this);
  }

  componentDidMount() {
    const { isoCode, country } = this.props;
    if (isoCode || country) this.loadStates();
  }

  componentDidUpdate(prevProps) {
    const { isoCode, country, value, onChange } = this.props;
    if (prevProps.isoCode !== isoCode || prevProps.country !== country) {
      // The country changed — the previously selected state no longer applies.
      if (value) onChange('');
      this.loadStates();
    }
  }

  loadStates() {
    const { isoCode, country } = this.props;
    if (!isoCode && !country) {
      this.setState({ options: [], loading: false, error: false });
      return;
    }
    this.setState({ loading: true, error: false });
    fetchSupplyChainStates({ isoCode, country })
      .then((states) => {
        this.setState({
          options: (states || []).map(s => ({ value: s.state, label: s.state, gid1: s.gid_1 })),
          loading: false,
        });
      })
      .catch(() => this.setState({ options: [], loading: false, error: true }));
  }

  handleChange(selected) {
    const { onChange } = this.props;
    onChange(selected ? selected.value : '');
  }

  render() {
    const {
      isoCode, country, value, className, onChange,
    } = this.props;
    const { options, loading, error } = this.state;
    const hasCountry = !!(isoCode || country);

    // No country picked yet, or the lookup failed: keep a usable text input.
    if (!hasCountry || error) {
      return (
        <input
          type="text"
          className="field-input"
          placeholder={hasCountry ? 'Type a state / province' : 'Select a country first'}
          value={value || ''}
          disabled={!hasCountry}
          onChange={e => onChange(e.target.value)}
        />
      );
    }

    // Keep the current value selectable even if it isn't in the fetched list
    // (e.g. legacy typed values or values from an uploaded file).
    const selectOptions = value && !options.some(o => o.value === value)
      ? [{ value, label: value }, ...options]
      : options;

    return (
      <CustomSelect
        search
        className={className}
        options={selectOptions}
        value={value || null}
        placeholder={loading ? 'Loading states…' : 'Select a state / province'}
        onValueChange={this.handleChange}
      />
    );
  }
}

StateSelect.propTypes = {
  isoCode: PropTypes.string,
  country: PropTypes.string,
  value: PropTypes.string,
  className: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};

StateSelect.defaultProps = {
  isoCode: null,
  country: null,
  value: '',
  className: undefined,
};

export default StateSelect;
