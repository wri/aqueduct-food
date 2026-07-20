import { SET_FILTERS, RESET_FILTERS } from 'constants/filters';

const initialState = {
  page: '',
  crop: 'all',
  scope: 'global',
  subscope: null,
  country: undefined,
  countryName: undefined,
  period: 'year',
  period_value: 'baseline',
  year: 'baseline',
  food: 'none',
  indicator: 'none',
  threshold: undefined,
  irrigation: 'all',
  type: 'absolute',
  scenario: 'business_as_usual',
  iso: null
};

export default function (state = initialState, action) {
  switch (action.type) {
    case SET_FILTERS: {
      const newState = Object.assign({}, state, action.payload);
      return newState;
    }
    case RESET_FILTERS: {
      // Keep the supply-chain analysis map state (input locations + matched
      // basins) so resetting the filters doesn't wipe the user's basins/points
      // off the map — those are cleared by the analyzer flow, not the filters.
      const next = { ...initialState, scope: state.scope };
      if (state.supplyChainLocations) next.supplyChainLocations = state.supplyChainLocations;
      if (state.supplyChainBasins) next.supplyChainBasins = state.supplyChainBasins;
      return next;
    }
    default:
      return state;
  }
}
