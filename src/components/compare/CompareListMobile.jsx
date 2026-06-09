import React from 'react';
import PropTypes from 'prop-types';

// Components
import CompareItem from 'components/compare/CompareItem';
import { SegmentedUi } from 'aqueduct-components';

export default class CompareList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      context: 'data'
    };
  }

  getItems() {
    const items = [];
    const {
      filters: propFilters, countries, active, countryList, loading, widgetsActive, layersActive
    } = this.props;
    const { context } = this.state;

    const filters = Object.assign({}, propFilters, {
      country: countries[active],
      countryName: ((countryList || []).find(c => c.id === countries[active]) || {}).name
    });

    items.push(
      <div key={active} className="comparelist-item">
        <CompareItem
          context={context}
          filters={filters}
          loading={loading}
          widgetsActive={widgetsActive}
          index={active}
          country={countries[active]}
          countryList={countryList}
          layersActive={layersActive}
        />
      </div>
    );
    return items;
  }

  render() {
    const { context } = this.state;
    const pageContextOptions = [{ label: 'Data', value: 'data' }, { label: 'Map', value: 'map' }];
    return (
      <div className="c-comparelist">
        <div className="comparelist-content">
          <div className="mobile-btns-wrapper">
            <SegmentedUi
              className="-btns"
              items={pageContextOptions}
              selected={context}
              onChange={selected => this.setState({ context: selected.value })}
            />
          </div>
          {this.getItems()}
        </div>
      </div>
    );
  }
}

CompareList.propTypes = {
  countries: PropTypes.array,
  countryList: PropTypes.array,
  loading: PropTypes.bool,
  widgetsActive: PropTypes.array,
  filters: PropTypes.object,
  layersActive: PropTypes.array,
  active: PropTypes.number
};

CompareList.defaultProps = {
  countries: [],
  countryList: [],
  loading: false,
  widgetsActive: [],
  filters: {},
  layersActive: [],
  active: 0
};
