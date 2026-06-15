import { SET_SUPPLY_CHAIN_OUTSIDE_LAND } from 'constants/supply-analyzer';

// Array of entry ids flagged outside land boundaries by the latest spatial
// check. Shared between the InputPanel and the locations card.
const initialState = [];

export default function (state = initialState, action) {
  switch (action.type) {
    case SET_SUPPLY_CHAIN_OUTSIDE_LAND:
      return action.payload;
    default:
      return state;
  }
}
