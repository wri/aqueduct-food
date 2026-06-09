import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { RadioGroup } from 'aqueduct-components';
import CustomTable from 'components/ui/Table/Table';
import {
  ID_LOOKUP,
  WATER_INDICATORS,
  ALLOWED_WATER_INDICATOR_KEYS_BY_SCOPE
} from 'constants/water-indicators';
import {
  LOCATION_RESULT_HEADERS,
  getHeadersForIndicator,
  transformLocations,
} from 'constants/analyzer';
import BtnMenu from 'components/ui/BtnMenu';
import { downloadCSV } from 'utils/data';
import { DownloadableTable } from 'components/ui/analyzer';
import AnalyzerUploadModal from './upload-modal';
import AnalyzerOverlay from './overlay';

// components

const Analyzer = ({ filters, analysis, toggleModal, setAnalysis }) => {
  const { locations, mapView = 'all' } = analysis;
  const setLocations = vals => setAnalysis({ locations: vals });
  const setMapView = val => setAnalysis({ mapView: val });
  const indicatorKey = filters.indicator ? ID_LOOKUP[filters.indicator] : undefined;
  const [currentIndicatorKey, setCurrentIndicatorKey] = useState(indicatorKey);
  const [currentThreshold, setCurrentThreshold] = useState(filters.threshold);

  const indicatorKeyChanged = useMemo(() => currentIndicatorKey !== indicatorKey, [currentIndicatorKey, indicatorKey]);
  const thresholdChanged = useMemo(() => parseFloat(currentThreshold) !== parseFloat(filters.threshold), [currentThreshold, filters.threshold]);
  const hasChanged = useMemo(() => indicatorKeyChanged || thresholdChanged, [indicatorKeyChanged, thresholdChanged]);

  if (!ALLOWED_WATER_INDICATOR_KEYS_BY_SCOPE.supply_chain.includes(indicatorKey)) return null;

  const indicatorSpec = WATER_INDICATORS[indicatorKey];
  const tableHeaders = getHeadersForIndicator(LOCATION_RESULT_HEADERS, indicatorKey);

  const downloadLocationsCSV = (event) => {
    if (event) event.preventDefault();
    downloadCSV({
      data: transformLocations(locations, indicatorKey),
      showLabels: true,
      filename: `Prioritize Basins Analyzer - ${indicatorSpec ? indicatorSpec.name : indicatorKey}`,
      headers: tableHeaders.map(c => c.label)
    });
  };

  const openUploadModal = () => {
    toggleModal(true, {
      children: AnalyzerUploadModal,
      size: 'analyzer', // Actually just using this to inject a classname. I don't love it.
      childrenProps: {
        filters,
        onDone: (loc) => {
          toggleModal(false);
          setCurrentIndicatorKey(indicatorKey);
          setCurrentThreshold(filters.threshold);
          setLocations(loc);
          setAnalysis({ locations: loc });
        }
      }
    });
  };

  return (
    <div className="analyzer">
      {locations ? (
        <AnalyzerOverlay
          show={hasChanged}
          onUploadNew={openUploadModal}
          content="Analyzer parameters have changed. Reupload the file to update the results"
        >
          <h4 className="title">Select Map View</h4>
          <div className="my-1">
            <RadioGroup
              name="map-view"
              items={[
                { value: 'all', label: 'Display all watersheds' },
                { value: 'priority', label: 'Display priority watersheds' },
              ]}
              onChange={selected => setMapView(selected.value)}
              selected={mapView}
              className="-inline"
            />
          </div>
          <h4 className="title">Supply Chain Analyzer Results</h4>
          <p className="subtitle">
            <strong>{indicatorSpec.name}</strong> with desired condition set to <strong>&lt;{filters.threshold}{indicatorSpec.unit}</strong>
          </p>
          <div className="downloadable-table">
            <DownloadableTable
              onExpandTable={() => {}}
              hideInstructions
              noExpand // Should probably expand eventually
              downloadOptions={[
                { name: 'CSV', action: () => downloadLocationsCSV() }
              ]}
            >
              <CustomTable
                columns={tableHeaders}
                data={transformLocations(locations, indicatorKey)}
                pagination={{
                  enabled: true,
                  pageSize: 10,
                  page: 0
                }}
              />
            </DownloadableTable>
          </div>
          <div>
            <button className="action-button" onClick={openUploadModal}>
              Upload a new file
            </button>
          </div>
        </AnalyzerOverlay>
      ) : (
        <React.Fragment>
          <p>
            Import File to find priority watersheds in your supply chain.
          </p>
          <div className="my-1">
            <BtnMenu
              className="-theme-white"
              items={[
                {
                  label: 'Import File',
                  cb: openUploadModal,
                }
              ]}
            />
          </div>
        </React.Fragment>
      )}
    </div>
  );
};

Analyzer.propTypes = {
  filters: PropTypes.object.isRequired,
  analysis: PropTypes.object.isRequired,
  toggleModal: PropTypes.func.isRequired,
  setAnalysis: PropTypes.func.isRequired,
};

export default Analyzer;
