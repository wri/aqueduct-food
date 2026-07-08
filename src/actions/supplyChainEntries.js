import {
  SET_SUPPLY_CHAIN_ENTRIES,
  SET_SUPPLY_CHAIN_OUTSIDE_LAND,
  SET_SUPPLY_CHAIN_REVIEW,
  SUPPLY_CHAIN_ENTRIES_LS_KEY,
} from 'constants/supply-analyzer';
import { validateSupplyChainEntries, applyValidEntriesToMap } from 'actions/supplyChainAnalysis';

// Persists the entries to localStorage (mirroring the previous InputPanel
// behaviour) and updates the store.
export function setSupplyChainEntries(entries) {
  return (dispatch) => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SUPPLY_CHAIN_ENTRIES_LS_KEY, JSON.stringify(entries));
      }
    } catch (_) { /* storage quota exceeded or private mode */ }

    dispatch({ type: SET_SUPPLY_CHAIN_ENTRIES, payload: entries });

    if (!entries.length) {
      dispatch({
        type: SET_SUPPLY_CHAIN_REVIEW,
        payload: { validationChecked: false, spatialCheckLoading: false, spatialCheckError: false },
      });
      dispatch({ type: SET_SUPPLY_CHAIN_OUTSIDE_LAND, payload: [] });
      dispatch(applyValidEntriesToMap());
      return;
    }

    dispatch(validateSupplyChainEntries());
  };
}

export function removeSupplyChainEntry(id) {
  return (dispatch, getState) => {
    const entries = getState().supplyChainEntries || [];
    dispatch(setSupplyChainEntries(entries.filter(entry => entry.id !== id)));
  };
}

export function clearSupplyChainEntries() {
  return dispatch => dispatch(setSupplyChainEntries([]));
}

export function setOutsideLandIds(ids) {
  return { type: SET_SUPPLY_CHAIN_OUTSIDE_LAND, payload: ids };
}

// Drops a single id from the outside-land set (e.g. after its coordinates are
// edited or swapped, so the next spatial check re-evaluates it).
export function clearOutsideLandId(id) {
  return (dispatch, getState) => {
    const ids = getState().supplyChainOutsideLand || [];
    if (!ids.includes(id)) return;
    dispatch(setOutsideLandIds(ids.filter(existing => existing !== id)));
  };
}

export default {
  setSupplyChainEntries,
  removeSupplyChainEntry,
  clearSupplyChainEntries,
  setOutsideLandIds,
  clearOutsideLandId,
};
