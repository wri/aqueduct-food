// Data helpers for the food-supply-chain analysis "Widgets" section
// (summary metrics + charts). All aggregations operate on the augmented
// result rows already produced by the Results screen, so they honour the
// active watershed / crop / business-unit filters.

import { sum, rollups } from 'd3-array';
import { format } from 'd3-format';

// ─── Risk bands ────────────────────────────────────────────────────────────
// Aqueduct-style ramp (red → orange → yellow → green), matching the
// supply-chain analyzer redesign.

export const RISK_BANDS = {
  extreme: { key: 'extreme', label: 'Extremely High', color: '#ef4444' },
  high: { key: 'high', label: 'High', color: '#fb923c' },
  medium: { key: 'medium', label: 'Medium', color: '#fde047' },
  low: { key: 'low', label: 'Low', color: '#86efac' },
  none: { key: 'none', label: 'No data', color: '#cbd5e1' },
};

// Stacking / display order (worst first).
export const RISK_BAND_KEYS = ['extreme', 'high', 'medium', 'low', 'none'];

// Bands considered "high risk" for the headline metric + hotspots chart.
export const HIGH_RISK_BANDS = new Set(['extreme', 'high']);

// ─── Value accessors ─────────────────────────────────────────────────────────

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) ? n : null;
};

// Production in MT for a result row (the "Total Volume" the user submitted).
export const getProduction = row => (toNumber(row.total_volume) || 0);

/**
 * Classifies a result row into a risk band for the active indicator, using
 * the Aqueduct 4-band ramp (Low / Medium / High / Extremely High).
 *
 * - water_stress → Aqueduct BWS category/score (0..4).
 * - sbtn_quantity / sbtn_quality → SBTN level (1..5).
 *
 * @returns {{ band: string, value: number|null, normalized: number|null }}
 *   `normalized` is the risk scaled to 0..1 (used for the scatter axis).
 */
export const getRiskInfo = (row, indicatorKey) => {
  if (indicatorKey === 'sbtn_quantity' || indicatorKey === 'sbtn_quality') {
    const key = indicatorKey === 'sbtn_quality' ? 'sbtn_qual_max' : 'sbtn_quant_max';
    const value = toNumber(row[key]);
    if (value === null) return { band: 'none', value: null, normalized: null };
    let band = 'low';
    if (value >= 5) band = 'extreme';
    else if (value >= 4) band = 'high';
    else if (value >= 3) band = 'medium';
    return { band, value, normalized: Math.max(0, Math.min(1, value / 5)) };
  }

  // Default: water stress (BWS). Prefer the category, fall back to the score.
  let cat = toNumber(row.bws_cat);
  if (cat === null) cat = toNumber(row.bws_score);
  if (cat === null) return { band: 'none', value: null, normalized: null };

  let band = 'low';
  if (cat >= 4) band = 'extreme';
  else if (cat >= 3) band = 'high';
  else if (cat >= 2) band = 'medium';
  return { band, value: cat, normalized: Math.max(0, Math.min(1, cat / 4)) };
};

export const isHighRisk = (row, indicatorKey) => HIGH_RISK_BANDS.has(getRiskInfo(row, indicatorKey).band);

// ─── Aggregations ────────────────────────────────────────────────────────────

export const computeSummary = (rows, indicatorKey) => {
  const totalProduction = sum(rows, getProduction);
  const highRiskProduction = sum(
    rows.filter(row => isHighRisk(row, indicatorKey)),
    getProduction,
  );
  const pctHighRisk = totalProduction > 0 ? (highRiskProduction / totalProduction) * 100 : 0;
  const locations = new Set(rows.map(row => row.unique_id)).size;
  return {
    totalProduction, highRiskProduction, pctHighRisk, locations,
  };
};

export const productionByCrop = (rows) => {
  const grouped = rollups(
    rows,
    group => sum(group, getProduction),
    row => row.commodity_code || '—',
  )
    .map(([label, value]) => ({ label, value }))
    .filter(d => d.value > 0);

  const total = sum(grouped, d => d.value);

  return grouped
    .sort((a, b) => b.value - a.value)
    .map(d => ({ ...d, pct: total > 0 ? (d.value / total) * 100 : 0 }));
};

const emptySegments = () => ({
  extreme: 0, high: 0, medium: 0, low: 0, none: 0,
});

const productionByDimensionAndRisk = (rows, indicatorKey, accessor) => rollups(
  rows,
  (group) => {
    const segments = emptySegments();
    group.forEach((row) => {
      segments[getRiskInfo(row, indicatorKey).band] += getProduction(row);
    });
    return segments;
  },
  accessor,
)
  .map(([label, segments]) => ({
    label,
    segments,
    total: segments.extreme + segments.high + segments.medium + segments.low + segments.none,
  }))
  .filter(d => d.total > 0)
  .sort((a, b) => b.total - a.total);

export const productionByCropAndRisk = (rows, indicatorKey) => productionByDimensionAndRisk(
  rows, indicatorKey, row => row.commodity_code || '—',
);

export const productionByIrrigationAndRisk = (rows, indicatorKey) => productionByDimensionAndRisk(
  rows, indicatorKey, row => row.irrigation || '—',
);

// Human-friendly label for a hotspot row. Prefers the business unit (which is
// the readable, user-supplied value, e.g. "Maize — South America — Cereals"),
// then a crop + location composite, and only falls back to the basin id.
export const getHotspotLabel = (row) => {
  if (row.business_unit) return String(row.business_unit);
  const parts = [row.commodity_code, row.state || row.country].filter(Boolean);
  if (parts.length) return parts.join(' — ');
  return row.pfaf_id != null ? `Basin ${row.pfaf_id}` : '—';
};

// High-risk locations ranked by production, grouped by their business unit.
// Each item also carries its share (`pct`) of total high-risk production.
export const getHotspots = (rows, indicatorKey, limit = 8) => {
  const highRiskRows = rows.filter(row => isHighRisk(row, indicatorKey));
  const grouped = rollups(
    highRiskRows,
    group => sum(group, getProduction),
    row => getHotspotLabel(row),
  ).map(([label, value]) => ({ label, value }));

  const total = sum(grouped, d => d.value);

  return grouped
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
    .map(d => ({ ...d, pct: total > 0 ? (d.value / total) * 100 : 0 }));
};

export const getScatterData = (rows, indicatorKey) => rows
  .map((row) => {
    const info = getRiskInfo(row, indicatorKey);
    return {
      x: info.normalized,
      y: getProduction(row),
      band: info.band,
      label: `Basin ${row.pfaf_id != null ? row.pfaf_id : '—'}${row.commodity_code ? ` · ${row.commodity_code}` : ''}`,
    };
  })
  .filter(d => d.x !== null && d.y > 0);

// ─── Formatters ──────────────────────────────────────────────────────────────

const sFormat = format('.3~s');

export const formatMT = (value) => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  if (Math.abs(value) >= 1000) return sFormat(value);
  return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2);
};

export const formatPct = (value) => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${value >= 10 ? Math.round(value) : value.toFixed(1)}%`;
};

// Full grouped number with the MT unit, e.g. "78,000 MT" (used in the
// hotspots list where the long form reads better than the compact "78k").
export const formatMTLong = (value) => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${Math.round(value).toLocaleString()} MT`;
};
