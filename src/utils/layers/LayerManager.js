import template from 'lodash/template';


// AQ components
import { get, getObjectConversion } from 'aqueduct-components';

// Layers
import BubbleClusterLayer from 'utils/layers/markers/BubbleClusterLayer';

// constants
import { CROP_OPTIONS } from 'constants/crops';
import { store } from '../../store';

const ZOOM_DISPLAYS_TOP = [2, 3];

export default class LayerManager {
  // Constructor
  constructor(map, options = {}) {
    this.map = map;
    this.mapLayers = {};
    this.markerLayers = {};
    this.mapRequests = {};
    this.mapLayersLoading = {};
    this.rejectLayersLoading = false;
    this.onLayerAddedSuccessCallback = options.onLayerAddedSuccess;
    this.onLayerAddedErrorCallback = options.onLayerAddedError;
  }

  /*
    LAYERS
    - addLayer
    - removeLayer
    - removeLayers
  */
  addLayer(layer, opts = {}) {
    const method = {
      cartodb: this.addCartoLayer
    }[layer.provider];

    if (method) method.call(this, layer, opts);
  }

  removeLayer(layerId) {
    if (this.mapLayers[layerId]) {
      this.map.removeLayer(this.mapLayers[layerId]);
      delete this.mapLayers[layerId];
    }
  }

  removeLayers() {
    Object.keys(this.mapLayers).forEach((id) => {
      if (this.mapLayers[id]) {
        this.map.removeLayer(this.mapLayers[id]);
        delete this.mapLayers[id];
      }
    });
    this.mapLayersLoading = {};
  }

  /*
    MARKERS
    - addMarkers
    - setMarkers
    - getMarkerConfig
  */
  addMarkers(geojson, layerConfig, markerConfig) {
    this.removeLayer(layerConfig.id);
    this.mapLayers[layerConfig.id] = new BubbleClusterLayer(
      geojson, layerConfig, markerConfig
    ).addTo(this.map);
  }

  static getMarkerConfig(markers) {
    const markerValues = markers.map(marker => Math.abs(marker.properties.value));

    return {
      minValue: Math.min(...markerValues),
      maxValue: Math.max(...markerValues)
    };
  }

  setMarkers(layer, zoomLevels) {
    const { id } = layer || {};
    const { prevZoom, nextZoom } = zoomLevels || {};
    const { filters } = store.getState();
    const { scope } = filters;

    let markers = [];
    let markerConfig = {};

    // prevents set markers if zoom is still in same range
    if ((!!prevZoom
      && !ZOOM_DISPLAYS_TOP.includes(prevZoom) && !ZOOM_DISPLAYS_TOP.includes(nextZoom))
      || (ZOOM_DISPLAYS_TOP.includes(prevZoom) && ZOOM_DISPLAYS_TOP.includes(nextZoom))) return;

    if (!this.markerLayers[id]) return;

    markerConfig = LayerManager.getMarkerConfig(this.markerLayers[id]);

    markers = this.getMarkersByZoom(layer, nextZoom);

    if (scope === 'country' && layer.country) {
      markers = this.markerLayers[id].filter(marker => marker.properties.iso === layer.country);
    }

    this.addMarkers(markers, layer, markerConfig);
  }

  getMarkersByZoom(layer, zoom) {
    const { id, options } = layer;
    const { sort, topSize } = options || {};
    let newMarkers = this.markerLayers[id];
    if (!newMarkers) return [];

    const sortFunction = (a, b) => {
      const valueA = Math.abs(+a.properties.value);
      const valueB = Math.abs(+b.properties.value);

      if (valueA < valueB) return sort === 'desc' ? 1 : -1;
      if (valueA > valueB) return sort === 'desc' ? -1 : 1;
      return 0;
    };

    if (ZOOM_DISPLAYS_TOP.includes(zoom)) {
      if (sort) newMarkers.sort(sortFunction);
      if (topSize && newMarkers.length >= topSize) newMarkers = newMarkers.slice(0, topSize);
    }

    return newMarkers;
  }

  /**
   * PRIVATE METHODS
   * - addLoader
   * - deleteLoader
  */
  addLoader(id) {
    this.mapLayersLoading[id] = true;
  }

  deleteLoader(id) {
    delete this.mapLayersLoading[id];
    // Check if all the layers are loaded
    if (!Object.keys(this.mapLayersLoading).length) {
      if (this.onLayerAddedSuccessCallback) this.onLayerAddedSuccessCallback();
    }
  }

  static generateCartoCSS(layerConfig, params) {
    const { bucket, crop } = params;
    const cartoCss = layerConfig.body.layers[0].options.cartocss;
    const cartoCssTemplate = template(cartoCss, { interpolate: /{{([\s\S]+?)}}/g });
    const { color } = CROP_OPTIONS.find(c => c.value === crop);

    return cartoCssTemplate({ bucket, color });
  }

  getLegendValues(layerConfig, legendConfig, options) {
    const layerConfigConverted = getObjectConversion(layerConfig, options, 'water', layerConfig.paramsConfig, layerConfig.sqlConfig);
    const legendConfigConverted = getObjectConversion(legendConfig, options, 'water', legendConfig.paramsConfig, legendConfig.sqlConfig);

    // Save loader
    this.addLoader(layerConfig.id);

    // Save request && send
    this.mapRequests[layerConfig.category] = get({
      url: `https://${layerConfig.account}.carto.com/api/v2/sql?q=${legendConfigConverted.sqlQuery}`,
      onSuccess: (data) => {
        const { bucket } = data.rows[0];
        if (bucket === null || !bucket) {
          console.error('No buckets available');
          this.deleteLoader(layerConfig.id);
          return;
        }

        const layerConfigParsed = {
          ...layerConfigConverted,
          ...{ body: LayerManager.getLayerConfigParsed(layerConfigConverted) }
        };

        layerConfigParsed.body.layers[0].options.cartocss = LayerManager.generateCartoCSS(layerConfig, { bucket, crop: options.crop });

        const layerTpl = {
          version: '1.3.0',
          stat_tag: 'API',
          layers: layerConfigParsed.body.layers
        };

        // Save request && send
        this.mapRequests[layerConfig.category] = get({
          url: `https://${layerConfigParsed.account}.carto.com/api/v1/map?stat_tag=API&config=${encodeURIComponent(JSON.stringify(layerTpl))}`,
          onSuccess: (layerData) => {
            const tileUrl = `https://${layerConfigParsed.account}.carto.com/api/v1/map/${layerData.layergroupid}/{z}/{x}/{y}.png`;

            this.mapLayers[layerConfigParsed.id] = L.tileLayer(tileUrl).addTo(this.map).setZIndex(999);

            this.mapLayers[layerConfigParsed.id].on('load', () => {
              this.deleteLoader(layerConfigParsed.id);
            });

            this.mapLayers[layerConfigParsed.id].on('tileerror', () => {
              this.deleteLoader(layerConfigParsed.id);
            });
          },
          onError: (layerData) => {
            console.error(layerData);
            this.deleteLoader(layerConfig.id);
          }
        });
      },
      onError: (data) => {
        console.error(data);
        this.deleteLoader(layerConfig.id);
      }
    });
  }

  static getLayerConfigParsed(layerConfig) {
    return {
      layers: layerConfig.body.layers.map((l) => {
        const newOptions = {
          user_name: layerConfig.account,
          cartocss_version: l.options.cartocssVersion,
          geom_column: l.options.geomColumn,
          geom_type: l.options.geomType,
          raster_band: l.options.rasterBand,
        };
        const options = { ...l.options, ...newOptions };
        return { ...l, options };
      })
    };
  }

  addCartoLayer(layerSpec, opts) {
    const layerConfig = {
      ...layerSpec.layerConfig,
      ...{ id: layerSpec.id, category: layerSpec.category }
    };
    const { legendConfig } = layerSpec;

    const options = opts;

    if (this.mapRequests[layerConfig.category]) {
      if (this.mapRequests[layerConfig.category].readyState !== 4) {
        this.mapRequests[layerConfig.category].abort();
        delete this.mapRequests[layerConfig.category];
        this.deleteLoader(layerConfig.id);
      }
    }

    switch (layerConfig.category) {
      case 'water': {
        // Parse config
        const layerConfigConverted = getObjectConversion(layerConfig, options, 'water', layerConfig.paramsConfig, layerConfig.sqlConfig);
        const layerConfigParsed = {
          ...layerConfigConverted,
          ...{ body: LayerManager.getLayerConfigParsed(layerConfigConverted) }
        };

        const layerTpl = {
          version: '1.3.0',
          stat_tag: 'API',
          layers: layerConfigParsed.body.layers
        };

        // Save loader
        this.addLoader(layerConfig.id);

        // Save request && send
        this.mapRequests[layerConfig.category] = get({
          url: `https://${layerConfig.account}.carto.com/api/v1/map?stat_tag=API&config=${encodeURIComponent(JSON.stringify(layerTpl))}`,
          onSuccess: (data) => {
            const tileUrl = `${data.cdn_url.templates.https.url}/${layerConfig.account}/api/v1/map/${data.layergroupid}/{z}/{x}/{y}.png`;

            this.mapLayers[layerConfig.id] = L.tileLayer(tileUrl).addTo(this.map).setZIndex(998);

            this.mapLayers[layerConfig.id].on('load', () => {
              this.deleteLoader(layerConfig.id);
            });
            this.mapLayers[layerConfig.id].on('tileerror', () => {
              this.deleteLoader(layerConfig.id);
            });
          },
          onError: (data) => {
            console.error(data);
            this.deleteLoader(layerConfig.id);
          }
        });
        break;
      }

      case 'food': {
        // Parse config
        const layerConfigConverted = getObjectConversion(layerConfig, options, 'food', layerConfig.paramsConfig, layerConfig.sqlConfig);

        // Save loader
        this.addLoader(layerConfig.id);

        // Save request && send
        this.mapRequests[layerConfig.category] = get({
          url: layerConfigConverted.body.url,
          onSuccess: (data) => {
            const geojson = data.rows[0].data.features || [];
            const nextZoom = this.map.getZoom();

            this.markerLayers[layerConfig.id] = geojson;

            this.setMarkers(layerSpec, { nextZoom });
            this.deleteLoader(layerConfig.id);
          },
          onError: (data) => {
            console.error(data);
            this.deleteLoader(layerConfig.id);
          }
        });
        break;
      }

      default: {
        if (legendConfig.sqlQuery) {
          this.getLegendValues(layerConfig, legendConfig, options);
          return;
        }
        const layerConfigConverted = getObjectConversion(layerConfig, options, 'water', layerConfig.paramsConfig, layerConfig.sqlConfig);
        const layerConfigParsed = {
          ...layerConfigConverted,
          ...{ body: LayerManager.getLayerConfigParsed(layerConfigConverted) }
        };

        const layerTpl = {
          version: '1.3.0',
          stat_tag: 'API',
          layers: layerConfigParsed.body.layers
        };

        // Save loader
        this.addLoader(layerConfig.id);

        // Save request && send
        this.mapRequests[layerConfig.category] = get({
          url: `https://${layerConfig.account}.carto.com/api/v1/map?stat_tag=API&config=${encodeURIComponent(JSON.stringify(layerTpl))}`,
          onSuccess: (data) => {
            const tileUrl = `${data.cdn_url.templates.https.url}/${layerConfig.account}/api/v1/map/${data.layergroupid}/{z}/{x}/{y}.png`;

            this.mapLayers[layerConfig.id] = L.tileLayer(tileUrl).addTo(this.map).setZIndex(999);

            this.mapLayers[layerConfig.id].on('load', () => {
              this.deleteLoader(layerConfig.id);
            });
            this.mapLayers[layerConfig.id].on('tileerror', () => {
              this.deleteLoader(layerConfig.id);
            });
          },
          onError: (data) => {
            console.error(data);
            this.deleteLoader(layerConfig.id);
          }
        });
        break;
      }
    }
  }
}
