import {
  ANALYSIS_INDICATORS,
  INDICATOR_COLUMN_KEYS,
  computeRiskScore,
} from 'constants/analysis-indicators';

// Shared helpers for the analysis results screen, used by both the controls
// (header) and the data table/charts (section below).

// Display order + labels for the food-supply-chain analysis response. Any keys
// returned by the API that aren't in this list are appended at the end, using
// the raw key as the header (so new fields show up automatically).
export const RESULT_COLUMN_LABELS = {
  unique_id: 'Unique ID',
  business_unit: 'Business Unit',
  pfaf_id: 'Basin (PFAF)',
  iso_code: 'ISO',
  country: 'Country',
  state: 'State',
  commodity: 'Crop',
  irrigation: 'Irrigation',
  total_volume: 'Total Volume (MT)',
  bws_raw: 'BWS Raw',
  bws_score: 'BWS Score',
  bws_cat: 'BWS Cat',
  bws_label: 'BWS Label',
  sbtn_quant_max: 'SBTN Quant',
  sbtn_qual_max: 'SBTN Qual',
  basin_production: 'Basin Production',
  summed_production: 'Summed Production',
  production_sourced_from_basin: 'Sourced From Basin (MT)',
};
const RESULT_COLUMN_ORDER = Object.keys(RESULT_COLUMN_LABELS);

// Always-hidden columns in the on-screen results table (still present in CSV /
// API payloads where applicable).
const HIDDEN_RESULT_COLUMNS = new Set([
  'unique_id',
  'country',
  'basin_production',
  'summed_production',
  'gid_1',
]);

export const GROUP_KEY = {
  watershed: 'pfaf_id',
  crop: 'commodity',
  business_unit: 'business_unit',
};

export const GROUP_LABEL = {
  watershed: 'Watershed',
  crop: 'Crop',
  business_unit: 'Business Unit',
};

// Picks every column key present across the result rows, then drops the
// always-hidden columns and the indicator-scoped columns that don't belong to
// the active indicator. Ordered by RESULT_COLUMN_ORDER with unknown API keys
// appended last so the table is forward-compatible.
export function getResultColumns(rows, activeIndicatorKey) {
  if (!rows || !rows.length) return [];
  const seen = new Set();
  rows.forEach(row => Object.keys(row).forEach(k => seen.add(k)));

  const indicator = ANALYSIS_INDICATORS.find(i => i.key === activeIndicatorKey);
  const allowedIndicatorCols = new Set(indicator ? indicator.columns : []);

  const isAllowed = (key) => {
    if (HIDDEN_RESULT_COLUMNS.has(key)) return false;
    if (INDICATOR_COLUMN_KEYS.has(key)) return allowedIndicatorCols.has(key);
    return true;
  };

  const ordered = RESULT_COLUMN_ORDER.filter(k => seen.has(k) && isAllowed(k));
  const extras = [...seen].filter(k => !RESULT_COLUMN_ORDER.includes(k) && isAllowed(k));
  return [...ordered, ...extras];
}

// Renders a value for a results-table cell. Numbers get a sensible decimal
// truncation; nullish values get an em-dash placeholder.
export function formatResultCell(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return String(value);
    if (Number.isInteger(value)) return value.toLocaleString();
    return value.toFixed(Math.abs(value) >= 100 ? 2 : 4);
  }
  return String(value);
}

function entryByIdMap(analysisEntries) {
  const byId = {};
  analysisEntries.forEach((e) => { byId[String(e.id)] = e; });
  return byId;
}

// Resolves business_unit for a result/error row, preferring the API value and
// falling back to the source entry's businessUnit.
export function businessUnitForUniqueId(uniqueId, analysisEntries, apiValue) {
  const entry = entryByIdMap(analysisEntries)[String(uniqueId)];
  return apiValue || (entry && entry.businessUnit) || '';
}

// Crop display name from an API result row. Accepts the new `commodity`
// field and falls back to legacy `commodity_code` during transition.
export function resultCommodity(row) {
  return row.commodity || row.commodity_code || '';
}

// Joins each API result row with its source entry (by unique_id) so we can
// surface business_unit + any other input metadata the API doesn't echo back.
export function augmentResults(rows, analysisEntries) {
  return rows.map((row) => {
    const { commodity_code, ...rest } = row;
    return {
      ...rest,
      commodity: row.commodity || commodity_code || '',
      business_unit: businessUnitForUniqueId(row.unique_id, analysisEntries, row.business_unit),
    };
  });
}

export function applyResultFilters(rows, resultFilters) {
  return rows.filter((row) => {
    if (resultFilters.watershed && String(row.pfaf_id) !== resultFilters.watershed) return false;
    if (resultFilters.crop && resultCommodity(row) !== resultFilters.crop) return false;
    if (resultFilters.businessUnit && (row.business_unit || '') !== resultFilters.businessUnit) return false;
    return true;
  });
}

export function applyResultSort(rows, resultSort) {
  if (resultSort === 'default') return rows;
  const sorted = [...rows];
  if (resultSort === 'production_desc') {
    sorted.sort((a, b) => (
      (b.production_sourced_from_basin || b.basin_production || 0)
      - (a.production_sourced_from_basin || a.basin_production || 0)
    ));
  } else if (resultSort === 'risk_desc') {
    sorted.sort((a, b) => computeRiskScore(b) - computeRiskScore(a));
  }
  return sorted;
}
