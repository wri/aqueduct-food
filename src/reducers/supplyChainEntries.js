import { SET_SUPPLY_CHAIN_ENTRIES, SUPPLY_CHAIN_ENTRIES_LS_KEY } from 'constants/supply-analyzer';
import { fillMissingBusinessUnits } from 'utils/supply-analyzer';

// Supply-chain analyzer entries (the user's added locations). Kept in Redux so
// both the InputPanel (which edits them) and the sticky entries list (which
// displays them) can share a single source of truth. Seeded from localStorage.

const loadInitialEntries = () => {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(SUPPLY_CHAIN_ENTRIES_LS_KEY);
    if (raw) return fillMissingBusinessUnits(JSON.parse(raw));
  } catch (_) { /* ignore corrupt / unavailable storage */ }
  return [];
};

const initialState = loadInitialEntries();

export default function (state = initialState, action) {
  switch (action.type) {
    case SET_SUPPLY_CHAIN_ENTRIES:
      return action.payload;
    default:
      return state;
  }
}
