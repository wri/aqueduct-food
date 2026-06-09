/* eslint-disable max-len */
// Data-only module: map tile URLs (with access tokens) and indicator description
// strings are inherently long and cannot be meaningfully wrapped.
export const MAP_OPTIONS = {
  detectRetina: true,
  scrollWheelZoom: true,
  zoom: 3,
  minZoom: 2,
  maxZoom: 9,
  center: {
    lat: 30,
    lng: -15
  }
};

export const BASEMAP_LAYER_CONFIG = {
  url: 'https://api.mapbox.com/styles/v1/resourcewatch/cjtr6fhr3060g1fok829tfwm7/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoicmVzb3VyY2V3YXRjaCIsImEiOiJjbHNueDl0NmgwOGg3MmttcjloYjBkZjRsIn0.VDkI_f2sQELKtwGa4FScYA',
  options: { attribution: '&copy; <a href="http://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>' }
};

export const BASEMAPS = {
  // Open Street Maps
  osm: {
    id: 'osm',
    value: 'https://api.mapbox.com/styles/v1/mapbox/light-v11/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoicmVzb3VyY2V3YXRjaCIsImEiOiJjbHNueDl0NmgwOGg3MmttcjloYjBkZjRsIn0.VDkI_f2sQELKtwGa4FScYA',
    label: 'Light',
    options: { attribution: '<a href="https://www.mapbox.com/about/maps/" target="_blank" rel="noopener noreferrer">© Mapbox</a>' }
  },
  satellite: {
    id: 'satellite',
    value: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    label: 'Satellite',
    options: { attribution: '&copy; <a href="https://www.google.com/maps/@15,-2.970703,3z?hl=es" target="_blank">Google</a>' }
  },
  terrain: {
    id: 'terrain',
    value: 'https://api.mapbox.com/styles/v1/resourcewatch/cjhqi456h02pg2rp6w2mwp61c/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoicmVzb3VyY2V3YXRjaCIsImEiOiJjbHNueDl0NmgwOGg3MmttcjloYjBkZjRsIn0.VDkI_f2sQELKtwGa4FScYA',
    label: 'Terrain',
    options: { attribution: '<a href="https://www.mapbox.com/about/maps/" target="_blank">© Mapbox</a> <a href="http://www.openstreetmap.org/about/" target="_blank">© OpenStreetMap</a>' }
  },
  hydro: {
    id: 'hydro',
    value: 'https://api.mapbox.com/styles/v1/resourcewatch/cjtr6fhr3060g1fok829tfwm7/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoicmVzb3VyY2V3YXRjaCIsImEiOiJjbHNueDl0NmgwOGg3MmttcjloYjBkZjRsIn0.VDkI_f2sQELKtwGa4FScYA',
    label: 'Hydrography',
    options: { attribution: '<a href="https://www.mapbox.com/about/maps/" target="_blank">© Mapbox</a> <a href="http://www.openstreetmap.org/about/" target="_blank">© OpenStreetMap</a>' }
  }
};

export const LABEL_LAYER_CONFIG = {
  url: 'https://api.mapbox.com/styles/v1/resourcewatch/ckae642b911g51ip324e0c4pr/tiles/256/%7Bz%7D/%7Bx%7D/%7By%7D@2x?access_token=pk.eyJ1IjoicmVzb3VyY2V3YXRjaCIsImEiOiJjbHNueDl0NmgwOGg3MmttcjloYjBkZjRsIn0.VDkI_f2sQELKtwGa4FScYA',
  options: { attribution: '&copy; <a href="http://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>' }
};

export const ZOOM_DISPLAYS_TOP = [2, 3];

export const MARKER_LAYER = {
  id: 'marker-layer',
  provider: 'leaflet',
  layerConfig: {
    body: [],
    parse: false,
    type: 'featureGroup'
  },
  legendConfig: {}
};

export const WATER_INDICATORS_METADATA = {
  'Water-Stress': {
    description: 'Baseline water stress measures the ratio of total water demand to available renewable surface and groundwater supplies. Water demand include domestic, industrial, irrigation, and livestock uses. Available renewable water supplies include the impact of upstream consumptive water users and large dams on downstream water availability. Higher values indicate more competition among users.',
    sources: [
      {
        'source-url': 'https://doi.org/10.46830/writn.23.00061',
        'source-name': 'Aqueduct 4.0'
      }
    ]
  },
  'Water-Depletion': {
    description: 'Baseline water depletion measures the ratio of total water consumption to available renewable water supplies. Total water consumption includes domestic, industrial, irrigation, and livestock consumptive uses. Available renewable water supplies include the impact of upstream consumptive water users and large dams on downstream water availability. Higher values indicate larger impact on the local water supply and decreased water availability for downstream users. Baseline water depletion is similar to baseline water stress; however, instead of looking at total water demand (consumptive plus nonconsumptive), baseline water depletion is calculated using consumptive withdrawal only.',
    sources: [
      {
        'source-url': 'https://doi.org/10.46830/writn.23.00061',
        'source-name': 'Aqueduct 4.0'
      }
    ]
  },
  'Interannual-Variability': {
    description: 'Interannual variability measures the average betweenyear variability of available water supply, including both renewable surface and groundwater supplies. Higher values indicate wider variations in available supply from year to year.',
    sources: [
      {
        'source-url': 'https://doi.org/10.46830/writn.23.00061',
        'source-name': 'Aqueduct 4.0'
      }
    ]
  },
  'Seasonal-Variability': {
    description: 'Seasonal variability measures the average within-year variability of available water supply, including both renewable surface and groundwater supplies. Higher values indicate wider variations of available supply within a year.',
    sources: [
      {
        'source-url': 'https://doi.org/10.46830/writn.23.00061',
        'source-name': 'Aqueduct 4.0'
      }
    ]
  },
  'Groundwater-Table-Decline': {
    description: 'Groundwater table decline measures the average decline of the groundwater table as the average change for the period of study (1990–2014). The result is expressed in centimeters per year (cm/yr). Higher values indicate higher levels of unsustainable groundwater withdrawals.',
    sources: [
      {
        'source-url': 'https://doi.org/10.46830/writn.23.00061',
        'source-name': 'Aqueduct 4.0'
      }
    ]
  },
  'Drought-Risk': {
    description: 'Drought risk measures where droughts are likely to occur, the population and assets exposed, and the vulnerability of the population and assets to adverse effects. Higher values indicate higher risk of drought.',
    sources: [
      {
        'source-url': 'https://doi.org/10.46830/writn.23.00061',
        'source-name': 'Aqueduct 4.0'
      }
    ]
  },
  'Coastal-Eutrophication-Potential': {
    description: 'Coastal eutrophication potential (CEP) measures the potential for riverine loadings of nitrogen (N), phosphorus (P), and silica (Si) to stimulate harmful algal blooms in coastal waters. The CEP indicator is a useful metric to map where anthropogenic activities produce enough point-source and nonpoint-source pollution to potentially degrade the environment. When N and P are discharged in excess over Si with respect to diatoms, a major type of algae, undesirable algal species often develop. The stimulation of algae leading to large blooms may in turn result in eutrophication and hypoxia (excessive biological growth and decomposition that reduces oxygen available to other organisms). It is therefore possible to assess the potential for coastal eutrophication from a river’s N, P, and Si loading. Higher values indicate higher levels of excess nutrients with respect to silica, creating more favorable conditions for harmful algal growth and eutrophication in coastal waters downstream.',
    sources: [
      {
        'source-url': 'https://doi.org/10.46830/writn.23.00061',
        'source-name': 'Aqueduct 4.0'
      }
    ]
  },
  'Unimprovedno-drinking-water': {
    description: 'Unimproved/no drinking water reflects the percentage of the population collecting drinking water from an unprotected dug well or spring, or directly from a river, dam, lake, pond, stream, canal, or irrigation canal (WHO and UNICEF 2017). Specifically, the indicator aligns with the unimproved and surface water categories of the Joint Monitoring Programme (JMP)—the lowest tiers of drinking water services. Higher values indicate areas where people have less access to safe drinking water supplies.',
    sources: [
      {
        'source-url': 'https://doi.org/10.46830/writn.23.00061',
        'source-name': 'Aqueduct 4.0'
      }
    ]
  },
  'Unimprovedno-sanitation': {
    description: 'Unimproved/no sanitation reflects the percentage of the population using pit latrines without a slab or platform, hanging/bucket latrines, or directly disposing human waste in fields, forests, bushes, open bodies of water, beaches, other open spaces, or with solid waste (WHO and UNICEF 2017). Specifically, the indicator aligns with JMP’s unimproved and open defecation categories— the lowest tier of sanitation services. Higher values indicate areas where people have less access to improved sanitation services.',
    sources: [
      {
        'source-url': 'https://doi.org/10.46830/writn.23.00061',
        'source-name': 'Aqueduct 4.0'
      }
    ]
  },
  // Future projections
  'Projected-Water-Stress': {
    description: 'Water stress is an indicator of competition for water resources and is defined informally as the ratio of demand for water by human society divided by available water.',
    sources: [
      {
        'source-url': 'https://doi.org/10.46830/writn.23.00061',
        'source-name': 'Aqueduct 4.0'
      }
    ]
  },
  'Projected-Seasonal-Variability': {
    description: 'Water stress measures the ratio of total water withdrawals to available renewable surface and groundwater supplies. Water withdrawals include domestic, industrial, irrigation, and livestock consumptive and nonconsumptive uses. Available renewable water supplies include the impact of upstream consumptive water users and large dams on downstream water availability. Higher values indicate more competition among users.',
    sources: [
      {
        'source-url': 'https://doi.org/10.46830/writn.23.00061',
        'source-name': 'Aqueduct 4.0'
      }
    ]
  }
};

export default {
  MAP_OPTIONS,
  BASEMAPS,
  BASEMAP_LAYER_CONFIG,
  LABEL_LAYER_CONFIG,
  ZOOM_DISPLAYS_TOP,
  MARKER_LAYER,
  WATER_INDICATORS_METADATA
};
