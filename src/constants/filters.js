export const SET_FILTERS = 'SET_FILTERS';

// Filter ui values
export const scenarioOptions = [
  { value: '24', label: 'Optimistic' },
  { value: '28', label: 'Pesimistic' },
  { value: '38', label: 'Business as usual' }
];
export const foodOptions = [
  { value: 'production', label: 'Production' },
  { value: 'demand', label: 'Demand' },
  { value: 'trade', label: 'Trade' }
];
export const waterOptions = [
  { value: 'ws', label: 'Water riks layer' },
  { value: 'sv', label: 'Ground layer' }
];
export const scopeOptions = [
  { value: 'global', label: 'Global' },
  { value: 'country', label: 'Country' }
];
// Mocks
export const yearOptions = [
  { value: 'bs', label: 'Baseline (current)' },
  { value: '20', label: '2020' },
  { value: '30', label: '2030' },
  { value: '40', label: '2040' }
];
export const cropOptions = [
  { value: 'all', label: 'All crops' },
  { value: 'rice', label: 'Rice' },
  { value: 'corn', label: 'Corn' },
  { value: 'soy', label: 'Soy' },
  { value: 'oat', label: 'Oat' }
];
export const irrigationOptions = [
  { value: 'irrigated', label: 'Irrigated' },
  { value: 'rainfed', label: 'Rainfed' }
];
