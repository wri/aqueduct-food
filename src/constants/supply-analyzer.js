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
  irrigation: null,
  volume: '',
};

export const SORTED_CROP_OPTIONS = CROP_OPTIONS
  .filter(c => c.value !== 'all')
  .sort((a, b) => (a.label > b.label ? 1 : -1));

export const FILTERED_IRRIGATION_OPTIONS = IRRIGATION_OPTIONS.filter(i => i.value !== 'all');
export const VALID_IRRIGATION_VALUES = new Set(IRRIGATION_OPTIONS.map(i => i.value));
export const VALID_CROP_VALUES = new Set(CROP_OPTIONS.map(c => c.value));
