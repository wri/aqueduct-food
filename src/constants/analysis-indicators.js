// Threshold reference data + helpers for the food-supply-chain analysis
// results table. Drives the indicator chips, the columns shown per indicator,
// the per-cell info tooltips, and the "Highest Risk" sort order.

// ─── Indicators ──────────────────────────────────────────────────────────────

export const ANALYSIS_INDICATORS = [
  {
    key: 'water_stress',
    label: 'Water Stress',
    shortLabel: 'BWS',
    description: 'Aqueduct Baseline Water Stress (BWS) — share of available water withdrawn by all users in a basin.',
    columns: ['bws_label', 'bws_score', 'bws_cat', 'bws_raw'],
  },
  {
    key: 'sbtn_quantity',
    label: 'SBTN Quantity',
    shortLabel: 'SBTN Q',
    description: 'Science-Based Targets Network — basin-level water-quantity pressure (1 Very Low … 5 Very High).',
    columns: ['sbtn_quant_max', 'total_volume', 'summed_production', 'production_sourced_from_basin', 'basin_production'],
  },
  {
    key: 'sbtn_quality',
    label: 'SBTN Quality',
    shortLabel: 'SBTN Qual',
    description: 'Science-Based Targets Network — basin-level water-quality pressure (1 Very Low … 5 Very High).',
    columns: ['sbtn_qual_max', 'total_volume', 'summed_production', 'production_sourced_from_basin', 'basin_production'],
  },
];

export const INDICATOR_COLUMN_KEYS = new Set(
  ANALYSIS_INDICATORS.flatMap(i => i.columns),
);

export const INDICATOR_FOR_COLUMN = ANALYSIS_INDICATORS.reduce((acc, ind) => {
  ind.columns.forEach((col) => { acc[col] = ind; });
  return acc;
}, {});

// ─── BWS thresholds (Aqueduct) ───────────────────────────────────────────────

const BWS_BANDS = [
  { min: -Infinity, max: 1, score: 0, cat: 0, label: 'Low (<10%)', detail: 'Less than 10% of available supply withdrawn — low competition for water.' },
  { min: 1, max: 2, score: 1, cat: 1, label: 'Low - Medium (10-20%)', detail: '10-20% of available supply withdrawn.' },
  { min: 2, max: 3, score: 2, cat: 2, label: 'Medium - High (20-40%)', detail: '20-40% of available supply withdrawn — meaningful water competition.' },
  { min: 3, max: 4, score: 3, cat: 3, label: 'High (40-80%)', detail: '40-80% of available supply withdrawn — basin is under significant stress.' },
  { min: 4, max: Infinity, score: 4, cat: 4, label: 'Extremely High (>80%)', detail: 'More than 80% of available supply withdrawn — basin is heavily over-allocated.' },
];

function findBwsBand(score) {
  if (typeof score !== 'number' || !Number.isFinite(score)) return null;
  return BWS_BANDS.find(b => score >= b.min && score < b.max) || BWS_BANDS[BWS_BANDS.length - 1];
}

// ─── SBTN thresholds ─────────────────────────────────────────────────────────

const SBTN_LEVELS = {
  1: { label: 'Very Low', detail: 'Pressure is negligible relative to ecosystem capacity.' },
  2: { label: 'Low', detail: 'Pressure is below targets but should be monitored.' },
  3: { label: 'Medium', detail: 'Pressure approaches the SBTN action threshold — consider mitigation.' },
  4: { label: 'High', detail: 'Pressure exceeds the SBTN action threshold — action recommended.' },
  5: { label: 'Very High', detail: 'Severe pressure on the basin — immediate action required.' },
};

function describeSbtn(value, kind) {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (!Number.isFinite(num)) return null;
  const bucket = SBTN_LEVELS[Math.round(num)];
  if (!bucket) return null;
  const prefix = kind === 'quantity' ? 'SBTN Quantity pressure' : 'SBTN Quality pressure';
  return `${prefix}: ${bucket.label} (${num}). ${bucket.detail}`;
}

// ─── Tooltip dispatcher ──────────────────────────────────────────────────────

/**
 * Returns a human-readable threshold description for a single result-row cell,
 * or null if no threshold context is available for the given column.
 */
export function describeIndicatorValue(columnKey, row) {
  if (!row) return null;
  const value = row[columnKey];
  if (value === null || value === undefined || value === '') return null;

  switch (columnKey) {
    case 'bws_score':
    case 'bws_raw': {
      const toNumber = v => (typeof v === 'number' ? v : parseFloat(v));
      const score = columnKey === 'bws_score' ? toNumber(value) : toNumber(row.bws_score);
      const band = findBwsBand(score);
      if (!band) return null;
      return `BWS ${columnKey === 'bws_raw' ? 'raw withdrawal ratio' : `score ${score.toFixed(2)}`} → ${band.label}. ${band.detail}`;
    }
    case 'bws_cat': {
      const cat = typeof value === 'number' ? value : parseFloat(value);
      const band = BWS_BANDS.find(b => b.cat === Math.round(cat));
      if (!band) return null;
      return `BWS category ${Math.round(cat)} → ${band.label}. ${band.detail}`;
    }
    case 'bws_label': {
      const band = BWS_BANDS.find(b => b.label.toLowerCase() === String(value).toLowerCase());
      if (!band) return `Aqueduct BWS category: ${value}.`;
      return `${band.label} — ${band.detail}`;
    }
    case 'sbtn_quant_max':
      return describeSbtn(value, 'quantity');
    case 'sbtn_qual_max':
      return describeSbtn(value, 'quality');
    default:
      return null;
  }
}

// ─── Risk score (for "Sort by Highest Risk") ────────────────────────────────

/**
 * Normalises BWS, SBTN quantity, and SBTN quality onto a 0..1 scale and
 * returns the worst-of-the-three. Used to sort the result table so locations
 * with the highest combined risk surface first.
 */
export function computeRiskScore(row) {
  const candidates = [
    typeof row.bws_score === 'number' ? row.bws_score / 4 : null,
    typeof row.sbtn_quant_max === 'number' ? row.sbtn_quant_max / 5 : null,
    typeof row.sbtn_qual_max === 'number' ? row.sbtn_qual_max / 5 : null,
  ].filter(v => typeof v === 'number' && Number.isFinite(v));
  if (!candidates.length) return -Infinity;
  return Math.max(...candidates);
}
