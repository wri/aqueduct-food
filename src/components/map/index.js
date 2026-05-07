import { connect } from 'react-redux';

// actions
import { toggleModal } from 'aqueduct-components';
import { setMapLocation, setLayerParametrization } from 'actions/map';
import { parseMetadataLayer } from './utils';

// selectors
import {
  parseMapState,
  getBasemap,
  getActiveLayers,
  getFoodLayers,
  getCountryBounds,
  getLayerGroup,
  getSupplyChainLocations
} from './selectors';

// component
import Map from './component';

export default connect(
  state => ({
    mapState: parseMapState(state),
    basemap: getBasemap(state),
    bounds: getCountryBounds(state),
    layers: getActiveLayers(state),
    layerGroup: getLayerGroup(state),
    foodLayers: getFoodLayers(state),
    countries: state.countries.list,
    filters: state.filters,
    analysis: state.analysis,
    parametrization: state.map.parametrization,
    supplyChainLocations: getSupplyChainLocations(state)
  }),
  dispatch => ({
    setMapLocation: (props) => { dispatch(setMapLocation(props)); },
    toggleModal: (bool, { childrenProps, children }) => {
      dispatch(toggleModal(bool, { children, childrenProps: parseMetadataLayer(childrenProps) }));
    },
    setLayerParametrization: (props) => { dispatch(setLayerParametrization(props)); }
  })
)(Map);
