import { IRRIGATION_OPTIONS } from 'aqueduct-components';
import { CROP_OPTIONS } from 'constants/crops';

export const PANEL_MODES = [
  { value: 'manual', label: 'Manual Entry' },
  { value: 'bulk', label: 'Bulk Upload' },
];

// Redux action type + localStorage key for the supply-chain entries list,
// which is shared between the InputPanel and the sticky entries list.
export const SET_SUPPLY_CHAIN_ENTRIES = 'SET_SUPPLY_CHAIN_ENTRIES';
export const SUPPLY_CHAIN_ENTRIES_LS_KEY = 'inputPanel_entries';

// Ids of lat/long entries flagged as outside land boundaries by the spatial
// check. Shared (via Redux) between the InputPanel review summary/actions and
// the locations card so both validate consistently.
export const SET_SUPPLY_CHAIN_OUTSIDE_LAND = 'SET_SUPPLY_CHAIN_OUTSIDE_LAND';

// Analysis phase + results, shared so the results render in the section below
// the input header (alongside the locations card) instead of inside it.
export const SET_SUPPLY_CHAIN_ANALYSIS = 'SET_SUPPLY_CHAIN_ANALYSIS';
export const SET_SUPPLY_CHAIN_ANALYSIS_VIEW = 'SET_SUPPLY_CHAIN_ANALYSIS_VIEW';
export const RESET_SUPPLY_CHAIN_ANALYSIS = 'RESET_SUPPLY_CHAIN_ANALYSIS';
export const SET_SUPPLY_CHAIN_REVIEW = 'SET_SUPPLY_CHAIN_REVIEW';

export const ENTRY_MODES = [
  { value: 'latlong', label: 'Lat / Long' },
  { value: 'country', label: 'Country + State' },
];

export const INITIAL_LATLONG_FORM = {
  latitude: '',
  longitude: '',
  radius: '',
  crop: null,
  irrigation: 'all',
  volume: '',
};

export const INITIAL_COUNTRY_FORM = {
  country: null,
  countryName: '',
  state: '',
  crop: null,
  irrigation: 'all',
  volume: '',
};

export const SORTED_CROP_OPTIONS = CROP_OPTIONS
  .filter(c => c.value !== 'all')
  .sort((a, b) => (a.label > b.label ? 1 : -1));

export const VALID_IRRIGATION_VALUES = new Set(IRRIGATION_OPTIONS.map(i => i.value));
export const VALID_CROP_VALUES = new Set(CROP_OPTIONS.map(c => c.value));

// ─── Analysis API field mappings ─────────────────────────────────────────────

// Maps the lowercase crop slug used in the UI to the display name expected by
// the food-supply-chain analysis endpoint (e.g. banana → "Banana").
export const CROP_COMMODITY_NAMES = Object.fromEntries(
  CROP_OPTIONS
    .filter(c => c.value !== 'all')
    .map(c => [c.value, c.label]),
);

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
