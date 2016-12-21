import React from 'react';
import WidgetList from 'components/widgets/WidgetList';
import Map from 'components/map/Map';
import Icon from 'components/ui/Icon';

export default class CompareItem extends React.Component {

  render() {
    const emptyPlaceholder = (
      <div className="country-placeholder">
        <div>
          <Icon className="-huge country-placeholder-icon" name="icon-country_illustration" />
          <p className="country-placeholder-text">Choose a country first</p>
        </div>
      </div>
    );

    let countrySelected = null;
    const mapConfig = {
      zoom: 3,
      latLng: {
        lat: 0,
        lng: 0
      }
    };
    if (this.props.country) {
      countrySelected = this.props.countryList.find(c => c.id === this.props.country);
      mapConfig.bounds = countrySelected;
    }
    return (
      <div className="c-compareitem">
        <section className="compareitem-map">
          {this.props.country ? <Map filters={this.props.filters} mapConfig={mapConfig} layersActive={this.props.layersActive} /> : emptyPlaceholder}
        </section>
        {this.props.country &&
          <section className="compareitem-widgets">
            <WidgetList filters={this.props.filters} loading={this.props.loading} widgetsActive={this.props.widgetsActive} />
          </section>
        }
      </div>
    );
  }
}

CompareItem.propTypes = {
  countryList: React.PropTypes.array,
  country: React.PropTypes.string,
  loading: React.PropTypes.bool,
  widgetsActive: React.PropTypes.array,
  filters: React.PropTypes.object,
  layersActive: React.PropTypes.array
};