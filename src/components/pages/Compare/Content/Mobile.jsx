import React from 'react';
import PropTypes from 'prop-types';
import ShareModal from 'components/modal/share';

// Components
import { Link } from 'react-router';
import { SegmentedUi, toggleModal } from 'aqueduct-components';
import CompareListMobile from 'components/compare/CompareListMobile';
import MobileFilters from 'components/filters/mobile';
import CountrySelect from 'components/country-select';
import { dispatch } from '../../../../store';

export default class ComparePageMobile extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      items: 2,
      active: 0
    };

    // bindings
    this.onChangeTab = this.onChangeTab.bind(this);
  }

  componentWillMount() {
    const { updateCompareUrl } = this.props;
    updateCompareUrl();
  }

  componentWillUnmount() {
    const { emptyCompareCountries } = this.props;
    emptyCompareCountries();
  }

  onChangeTab(item) {
    this.setState({ active: +item.value });
  }

  getCountrySelects() {
    const items = [{
      title: 'Select country',
      placeholder: 'Select country'
    }, {
      title: 'Compare with...',
      placeholder: 'Compare with...'
    }];
    const { compare, setCompareCountry } = this.props;

    return (
      <div className="c-filters">
        <div className="filters-section -highlighted">
          {items.map((item, i) => {
            const props = {
              value: compare.countries[i] || null,
              placeholder: items.placeholder,
              onValueChange: (selected) => {
                if (selected) setCompareCountry({ index: i, iso: selected.value });
              }
            };
            return (
              <div key={i} className="c-filters-item">
                {/* Country */}
                <div className="filter-item-header">
                  <span className="title">{item.title}</span>
                </div>
                <CountrySelect {...props} />
              </div>
            );
          })}

          <div className="c-filters-item">
            <Link className="c-btn -primary -dark -fluid" to="/">Back</Link>
          </div>
        </div>
      </div>
    );
  }

  getCountries() {
    const { compare, countries } = this.props;
    return compare.countries.map((item, index) => {
      const country = countries.list.find(c => c.id === item);
      return { label: country ? country.name : '', value: String(index) };
    });
  }

  static toggleShareModal() {
    dispatch(toggleModal(true, {
      children: ShareModal
    }));
  }

  render() {
    const { active, items } = this.state;
    const {
      filters, setFilters, countries, compare, loading, widgetsActive, layersActive
    } = this.props;
    const headingContent = (
      <div>
        {this.getCountrySelects()}
      </div>
    );
    return (
      <div className="l-comparepage -mobile-fullscreen">
        <div className="compare-filters">
          <MobileFilters
            className="-compare"
            filters={filters}
            setFilters={setFilters}
            headingContent={headingContent}
          >
            <SegmentedUi
              className="-stacked-tabs"
              selected="0"
              items={this.getCountries()}
              onChange={this.onChangeTab}
            />
          </MobileFilters>
        </div>
        <CompareListMobile
          active={active}
          filters={filters}
          countryList={countries.list}
          countries={compare.countries}
          loading={loading}
          widgetsActive={widgetsActive}
          layersActive={layersActive}
          items={items}
        />
      </div>
    );
  }
}

ComparePageMobile.propTypes = {
  compare: PropTypes.object,
  loading: PropTypes.bool,
  countries: PropTypes.object,
  filters: PropTypes.object,
  setFilters: PropTypes.func,
  updateCompareUrl: PropTypes.func,
  setCompareCountry: PropTypes.func,
  emptyCompareCountries: PropTypes.func,
  widgetsActive: PropTypes.array,
  layersActive: PropTypes.array
};

ComparePageMobile.defaultProps = {
  compare: {},
  loading: false,
  countries: {},
  filters: {},
  setFilters: () => {},
  updateCompareUrl: () => {},
  setCompareCountry: () => {},
  emptyCompareCountries: () => {},
  widgetsActive: [],
  layersActive: []
};
