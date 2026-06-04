import { IRRIGATION_OPTIONS } from 'aqueduct-components';
import { CROP_OPTIONS } from 'constants/crops';

export const PANEL_MODES = [
  { value: 'manual', label: 'Manual Entry' },
  { value: 'bulk', label: 'Bulk Upload' },
];

export const ENTRY_MODES = [
  { value: 'latlong', label: 'Lat / Long' },
  { value: 'country', label: 'Country + State' },
];

export const INITIAL_LATLONG_FORM = {
  latitude: '',
  longitude: '',
  radius: '',
  crop: null,
  irrigation: null,
  volume: '',
};

export const INITIAL_COUNTRY_FORM = {
  country: null,
  countryName: '',
  state: '',
  crop: null,
  irrigation: null,
  volume: '',
};

export const SORTED_CROP_OPTIONS = CROP_OPTIONS
  .filter(c => c.value !== 'all')
  .sort((a, b) => (a.label > b.label ? 1 : -1));

export const FILTERED_IRRIGATION_OPTIONS = IRRIGATION_OPTIONS.filter(i => i.value !== 'all');
export const VALID_IRRIGATION_VALUES = new Set(IRRIGATION_OPTIONS.map(i => i.value));
export const VALID_CROP_VALUES = new Set(CROP_OPTIONS.map(c => c.value));

// ─── Analysis API field mappings ─────────────────────────────────────────────

// Maps the lowercase crop slug used in the UI to the SPAM 4-letter
// commodity_code expected by the food-supply-chain analysis endpoint.
export const CROP_COMMODITY_CODES = {
  'arabic coffee': 'ACOF',
  banana: 'BANA',
  barley: 'BARL',
  bean: 'BEAN',
  cassava: 'CASS',
  chickpea: 'CHIC',
  citrus: 'CITR',
  cocoa: 'COCO',
  coconut: 'CNUT',
  cotton: 'COTT',
  cowpea: 'COWP',
  groundnut: 'GROU',
  lentil: 'LENT',
  maize: 'MAIZ',
  oilpalm: 'OILP',
  onion: 'ONIO',
  'other cereals': 'OCER',
  'other fibre crops': 'OFIB',
  'other oil crops': 'OOIL',
  'other pulses': 'OPUL',
  'other roots': 'ORTS',
  'other tropical fruit': 'TROF',
  'other vegetables': 'VEGE',
  'pearl millet': 'PMIL',
  'pigeon pea': 'PIGE',
  plantain: 'PLNT',
  potato: 'POTA',
  rapeseed: 'RAPE',
  'rest of crops': 'REST',
  rice: 'RICE',
  'robusta coffee': 'RCOF',
  rubber: 'RUBB',
  'sesame seed': 'SESA',
  'small millet': 'SMIL',
  sorghum: 'SORG',
  soybean: 'SOYB',
  sugarbeet: 'SUGB',
  sugarcane: 'SUGC',
  sunflower: 'SUNF',
  'sweet potato': 'SWPO',
  tea: 'TEAS',
  'temperate fruit': 'TEMF',
  tobacco: 'TOBA',
  tomato: 'TOMA',
  wheat: 'WHEA',
  yams: 'YAMS',
};

// Maps the lowercase irrigation slug used in the UI to the case the
// analysis endpoint expects ("All", "Irrigated", "Rainfed").
export const IRRIGATION_API_VALUES = {
  all: 'All',
  irrigated: 'Irrigated',
  rainfed: 'Rainfed',
};

// Default radius (km) sent to the analysis endpoint when a lat/long entry
// has no radius. The endpoint requires a positive buffer around point inputs.
export const DEFAULT_RADIUS_KM = 50;
