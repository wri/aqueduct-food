import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Sticky } from 'aqueduct-components';

// components
import Map from 'components/map';
import Sidebar from 'components/sidebar';
import Filters from 'components/filters';
import StickyFilters from 'components/filters/sticky';
import SupplyChainEntriesList from 'components/filters/supply-chain-entries';
import SupplyChainResults from 'components/filters/supply-chain-results';
import WidgetList from 'components/widgets/widget-list';
import Analyzer from 'components/analyzer';
import Summary from 'components/summary';
// import NewUpdates from '../../../new-updates';
// import DownloadMapControl from 'components/map/map-controls/download-map';

class MapPageDesktop extends PureComponent {
  constructor(props) {
    super(props);

    this.state = { showStickyFilters: false };
  }

  componentDidMount() {
    this.setStickyFilterPosition();
  }

  componentDidUpdate() {
    this.setStickyFilterPosition();
  }

  onSticky(isSticky) {
    this.setState({ showStickyFilters: isSticky });
  }

  setStickyFilterPosition() {
    const { stickyFilterTopPosition } = this.state;
    const newStickyFilterTopPosition = this.filtersElem.getBoundingClientRect().height;

    if (stickyFilterTopPosition === newStickyFilterTopPosition) return;

    this.setState({ stickyFilterTopPosition: newStickyFilterTopPosition });
  }

  render() {
    const { filters } = this.props;
    const { stickyFilterTopPosition, showStickyFilters } = this.state;

    return (
      <div className="l-map -fullscreen">
        {/* Sidebar */}
        <Sidebar>
          {/* Filters */}
          <div
            className="l-filters"
            ref={(elem) => { this.filtersElem = elem; }}
          >
            <Filters
              className="-sidebar"
              withScope
              {...this.props}
            />
          </div>

          {/* Sticky Filters */}
          <Sticky
            topLimit={stickyFilterTopPosition}
            onStick={(isSticky) => { this.onSticky(isSticky); }}
            ScrollElem=".l-sidebar-content"
          >
            {showStickyFilters && filters.scope !== 'supply_chain' && (
              <StickyFilters
                className="-country"
                withScope
              />
            )}
            {filters.scope === 'supply_chain' && (
              <SupplyChainEntriesList />
            )}
          </Sticky>

          {/* Analysis results render in the normal sidebar scroll flow (not
              inside the Sticky). When the Sticky switches to position: fixed it
              is pinned to the viewport, which would clip the long charts/table
              below the fold; keeping the results in flow lets them scroll. */}
          {filters.scope === 'supply_chain' && (
            <SupplyChainResults />
          )}

          {/* Widget List */}
          {filters.scope !== 'supply_chain' ? (
            <div className="l-sidebar-content">
              {filters.scope === 'country' && filters.country && (
                <Summary />
              )}
              <WidgetList />
            </div>
          ) : (
            <Analyzer />
          )}
        </Sidebar>

        {/* Map */}
        <div className="c-map-container">
          <Map />
        </div>
      </div>
    );
  }
}

MapPageDesktop.propTypes = {
  filters: PropTypes.object.isRequired,
  countries: PropTypes.array.isRequired
};

export default MapPageDesktop;
