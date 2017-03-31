import React from 'react';
import orderBy from 'lodash/orderBy';
import LegendItem from 'components/legend/LegendItem';
import DynamicHeader from 'components/map/DynamicHeader';
import { Icon, OnlyOn } from 'aqueduct-components';

export default class Legend extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      selectedLayer: null,
      expanded: props.expanded
    };
  }

  toggleExpand() {
    this.setState({
      expanded: !this.state.expanded
    });
  }

  render() {
    const layers = orderBy(this.props.layers, ['category'], ['desc']);
    return (
      <div className={`c-legend ${this.props.className} ${this.state.expanded ? '-expanded' : ''}`}>
        <OnlyOn device="desktop">
          <div>
            {this.props.countries.list.length &&
              <DynamicHeader
                countries={this.props.countries.list}
                filters={this.props.filters}
              />}
            <div className="legend-header" onClick={() => this.toggleExpand()}>
              <span className="legend-header-title">{this.state.expanded ? 'Legend' : 'View Legend'}</span>
              <button className="legend-btn">
                <Icon name="icon-arrow-up-2" className="legend-open-icon" />
                <Icon name="icon-arrow-down-2" className="legend-close-icon" />
              </button>
            </div>
          </div>
        </OnlyOn>
        <div className="legend-content">
          <ul>
            {layers.map((layer, index) =>
              layer.category !== 'mask' &&
              <LegendItem filters={this.props.filters} toggleModal={this.props.toggleModal} layer={layer} key={index} />
            )}
          </ul>
        </div>
      </div>
    );
  }
}

Legend.defaultProps = {
  expanded: false
};

Legend.propTypes = {
  layers: React.PropTypes.array,
  className: React.PropTypes.string,
  countries: React.PropTypes.object,
  filters: React.PropTypes.object,
  expanded: React.PropTypes.bool,
  toggleModal: React.PropTypes.func
};
