import React from 'react';
import PropTypes from 'prop-types';
import WidgetList from 'components/widgets/widget-list';
import { Map, MapControls, ZoomControl, Icon } from 'aqueduct-components';
import LegendMobile from 'components/legend';
import Summary from 'components/summary';
import LayerManager from 'utils/layers/LayerManager';

export default class CompareItem extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      mapConfig: {
        zoom: 3,
        latLng: {
          lat: 0,
          lng: 0
        },
        bounds: props.countryList.find(c => c.id === props.country)
      }
    };
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.country && nextProps.countryList.length) {
      const bounds = nextProps.countryList.find(c => c.id === nextProps.country);
      const { mapConfig } = this.state;

      this.setState({
        mapConfig: {
          ...mapConfig,
          bounds
        }
      });
    }
  }

  render() {
    const { mapConfig } = this.state;
    const {
      context, country, filters, layersActive, countryList, loading, widgetsActive
    } = this.props;

    const emptyPlaceholder = (
      <div className="country-placeholder">
        <div>
          <Icon className="-huge country-placeholder-icon" name="icon-country" />
          <p className="country-placeholder-text">Choose a country first</p>
        </div>
      </div>
    );

    const showMap = (!context || (context && context === 'map'));
    const showWidgets = country && (!context || (context && context === 'data'));

    const map = (
      <div>
        <Map
          mapConfig={mapConfig}
          filters={filters}
          layersActive={layersActive}
          LayerManager={LayerManager}
          setMapParams={(newMapConfig) => {
            this.setState({
              mapConfig: {
                ...mapConfig,
                ...newMapConfig
              }
            });
          }}
        />
        {/* Map controls */}
        <MapControls className="-left">
          <LegendMobile />
        </MapControls>

        {/* Map controls */}
        <MapControls>
          <ZoomControl
            zoom={mapConfig.zoom}
            onZoomChange={(zoom) => {
              this.setState({
                mapConfig: {
                  ...mapConfig,
                  zoom
                }
              });
            }}
          />
        </MapControls>

      </div>
    );

    return (
      <div className="c-compareitem">
        {showMap
          && (
          <section className="compareitem-map">
            {country ? map : emptyPlaceholder}
          </section>
          )
        }
        {showWidgets
          && (
          <section className="compareitem-widgets">
            <Summary
              filters={filters}
              countries={countryList}
            />
            <WidgetList
              filters={filters}
              loading={loading}
              widgetsActive={widgetsActive}
            />
          </section>
          )
        }
      </div>
    );
  }
}

CompareItem.propTypes = {
  context: PropTypes.string,
  countryList: PropTypes.array,
  country: PropTypes.string,
  loading: PropTypes.bool,
  widgetsActive: PropTypes.array,
  filters: PropTypes.object,
  layersActive: PropTypes.array
};

CompareItem.defaultProps = {
  context: null,
  countryList: [],
  country: null,
  loading: false,
  widgetsActive: [],
  filters: {},
  layersActive: []
};
