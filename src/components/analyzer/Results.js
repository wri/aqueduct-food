import React from 'react';
import PropTypes from 'prop-types';
import { RadioGroup } from 'aqueduct-components';
import {
  ANALYSIS_INDICATORS,
  INDICATOR_COLUMN_KEYS,
  describeIndicatorValue,
  computeRiskScore,
} from 'constants/analysis-indicators';

// Display order + labels for the food-supply-chain analysis response.
// Any keys returned by the API that aren't in this list are appended at the
// end, using the raw key as the header (so new fields show up automatically).
const RESULT_COLUMN_LABELS = {
  unique_id: 'Unique ID',
  business_unit: 'Business Unit',
  pfaf_id: 'Basin (PFAF)',
  iso_code: 'ISO',
  country: 'Country',
  state: 'State',
  commodity_code: 'Crop',
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
  production_sourced_from_basin: 'Sourced From Basin',
};
const RESULT_COLUMN_ORDER = Object.keys(RESULT_COLUMN_LABELS);

// Always-hidden columns in the on-screen results table (exported in CSV).
const HIDDEN_RESULT_COLUMNS = new Set(['unique_id']);

// Picks every column key present across the result rows, then drops:
//   - the always-hidden columns (unique_id),
//   - indicator-scoped columns (BWS / SBTN) that don't belong to the
//     currently selected indicator.
// Returns the intersection ordered by RESULT_COLUMN_ORDER, with unknown
// API keys appended last so the table is forward-compatible.
function getResultColumns(rows, activeIndicatorKey) {
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
function formatResultCell(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return String(value);
    if (Number.isInteger(value)) return value.toLocaleString();
    return value.toFixed(Math.abs(value) >= 100 ? 2 : 4);
  }
  return String(value);
}

// Joins each API result row with its source entry (by unique_id) so we
// can surface business_unit + any other input metadata that the API
// doesn't echo back in the response payload.
function augmentResults(rows, analysisEntries) {
  const byId = {};
  analysisEntries.forEach((e) => { byId[String(e.id)] = e; });
  return rows.map((row) => {
    const entry = byId[String(row.unique_id)];
    return {
      ...row,
      business_unit: row.business_unit || entry?.businessUnit || '',
    };
  });
}

function applyResultFilters(rows, resultFilters) {
  return rows.filter((row) => {
    if (resultFilters.watershed && String(row.pfaf_id) !== resultFilters.watershed) return false;
    if (resultFilters.crop && row.commodity_code !== resultFilters.crop) return false;
    if (resultFilters.businessUnit && (row.business_unit || '') !== resultFilters.businessUnit) return false;
    return true;
  });
}

function applyResultSort(rows, resultSort) {
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

// ─── Results screen ──────────────────────────────────────────────────────────

const Results = ({
  analysisResults,
  analysisEntries,
  activeIndicator,
  resultFilters,
  resultSort,
  resultGrouping,
  onActiveIndicatorChange,
  onResultFilterChange,
  onResultSortChange,
  onResultGroupingChange,
  onBack,
  onDownloadCSV,
}) => {
  if (!analysisResults) return null;
  const { results, errors, skipped } = analysisResults;
  const errorCount = (errors?.length || 0) + (skipped?.length || 0);

  const augmented = augmentResults(results, analysisEntries);
  const visibleRows = applyResultSort(applyResultFilters(augmented, resultFilters), resultSort);

  // Distinct values for the filter selects (built from the full result set
  // so users don't lose options after applying an earlier filter).
  const watershedOptions = [...new Set(augmented.map(r => r.pfaf_id).filter(v => v != null))].sort((a, b) => a - b);
  const cropOptions = [...new Set(augmented.map(r => r.commodity_code).filter(Boolean))].sort();
  const businessUnitOptions = [...new Set(augmented.map(r => r.business_unit).filter(Boolean))].sort();

  const GROUP_KEY = {
    watershed: 'pfaf_id',
    crop: 'commodity_code',
    business_unit: 'business_unit',
  };
  const GROUP_LABEL = {
    watershed: 'Watershed',
    crop: 'Crop',
    business_unit: 'Business Unit',
  };
  const groupKey = GROUP_KEY[resultGrouping];

  // Build [label, rows[]] pairs in the order the rows appear after sort.
  let groupedSections = null;
  if (groupKey) {
    const grouped = new Map();
    visibleRows.forEach((row) => {
      const value = row[groupKey];
      const label = value === null || value === undefined || value === ''
        ? '(no value)'
        : String(value);
      if (!grouped.has(label)) grouped.set(label, []);
      grouped.get(label).push(row);
    });
    groupedSections = [...grouped.entries()];
  }

  return (
    <div className="review-screen">
      <div className="review-header">
        <button
          type="button"
          className="review-back-btn"
          onClick={onBack}
        >
          &#8592; Back
        </button>
        <span className="review-title">Analysis Results</span>
      </div>

      {/* Indicator selector ---------------------------------------------- */}
      {(() => {
        const selected = ANALYSIS_INDICATORS.find(i => i.key === activeIndicator);
        return (
          <div className="results-indicator-bar">
            <label className="results-control -indicator">
              <span>Analysis</span>
              <select
                value={activeIndicator}
                onChange={e => onActiveIndicatorChange(e.target.value)}
              >
                {ANALYSIS_INDICATORS.map(ind => (
                  <option key={ind.key} value={ind.key}>{ind.label}</option>
                ))}
              </select>
            </label>
            {selected && (
              <p className="results-indicator-description">{selected.description}</p>
            )}
          </div>
        );
      })()}

      {/* Group-by radio --------------------------------------------------- */}
      <div className="results-grouping">
        <span className="results-grouping-label">Group by</span>
        <RadioGroup
          name="result-grouping"
          className="-inline"
          items={[
            { value: 'none', label: 'None' },
            { value: 'watershed', label: 'Watershed' },
            { value: 'crop', label: 'Crop' },
            { value: 'business_unit', label: 'Business Unit' },
          ]}
          selected={resultGrouping}
          onChange={({ value }) => onResultGroupingChange(value)}
        />
      </div>

      {/* Filters + sort ---------------------------------------------------- */}
      <div className="results-controls">
        <label className="results-control">
          <span>Watershed</span>
          <select
            value={resultFilters.watershed}
            onChange={e => onResultFilterChange('watershed', e.target.value)}
          >
            <option value="">All ({watershedOptions.length})</option>
            {watershedOptions.map(w => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </label>

        <label className="results-control">
          <span>Crop</span>
          <select
            value={resultFilters.crop}
            onChange={e => onResultFilterChange('crop', e.target.value)}
          >
            <option value="">All ({cropOptions.length})</option>
            {cropOptions.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        <label className="results-control">
          <span>Business Unit</span>
          <select
            value={resultFilters.businessUnit}
            onChange={e => onResultFilterChange('businessUnit', e.target.value)}
            disabled={businessUnitOptions.length === 0}
          >
            <option value="">All ({businessUnitOptions.length})</option>
            {businessUnitOptions.map(bu => (
              <option key={bu} value={bu}>{bu}</option>
            ))}
          </select>
        </label>

        <label className="results-control">
          <span>Sort by</span>
          <select
            value={resultSort}
            onChange={e => onResultSortChange(e.target.value)}
          >
            <option value="default">Input order</option>
            <option value="production_desc">Highest production</option>
            <option value="risk_desc">Highest risk</option>
          </select>
        </label>
      </div>

      <div className="review-summary-bar">
        <span className="summary-stat -valid">
          <span className="stat-count">{visibleRows.length}</span>
          {visibleRows.length !== augmented.length
            ? ` of ${augmented.length} `
            : ' '}
          row{visibleRows.length !== 1 ? 's' : ''}
        </span>
        <span className="summary-divider" />
        <span className="summary-stat -error">
          <span className="stat-count">{errorCount}</span> failed
        </span>
      </div>

      {visibleRows.length > 0 ? (() => {
        const columns = getResultColumns(visibleRows, activeIndicator);

        const renderRow = (row, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <tr key={`${row.unique_id}-${row.pfaf_id}-${i}`}>
            {columns.map((key) => {
              const tooltip = describeIndicatorValue(key, row);
              const numericTitle = typeof row[key] === 'number' ? String(row[key]) : undefined;
              return (
                <td key={key} title={!tooltip ? numericTitle : undefined}>
                  <span className="cell-value">{formatResultCell(row[key])}</span>
                  {tooltip && (
                    <span
                      className="cell-info"
                      role="img"
                      aria-label={tooltip}
                      tabIndex={0}
                      data-info={tooltip}
                    >
                      i
                    </span>
                  )}
                </td>
              );
            })}
          </tr>
        );

        return (
          <div className="analysis-results-table">
            <table>
              <thead>
                <tr>
                  {columns.map(key => (
                    <th key={key} title={key}>
                      {RESULT_COLUMN_LABELS[key] || key}
                    </th>
                  ))}
                </tr>
              </thead>
              {groupedSections ? (
                groupedSections.map(([label, rows]) => (
                  <tbody key={`group-${label}`} className="result-group">
                    <tr className="group-header">
                      <td colSpan={columns.length}>
                        <span className="group-header-tag">{GROUP_LABEL[resultGrouping]}</span>
                        <span className="group-header-value">{label}</span>
                        <span className="group-header-count">
                          {rows.length} row{rows.length !== 1 ? 's' : ''}
                        </span>
                      </td>
                    </tr>
                    {rows.map(renderRow)}
                  </tbody>
                ))
              ) : (
                <tbody>{visibleRows.map(renderRow)}</tbody>
              )}
            </table>
          </div>
        );
      })() : (
        <div className="analysis-empty-results">
          {augmented.length === 0
            ? 'No basin matches were returned for the locations you submitted.'
            : 'No results match the current filters.'}
        </div>
      )}

      {errorCount > 0 && (
        <div className="analysis-errors">
          <p className="review-section-title">Locations that did not match a basin</p>
          <ul>
            {(errors || []).map(e => (
              <li key={`api-${e.unique_id}`}>
                <strong>{e.unique_id}</strong> — {e.reason || 'no basin matched'}
              </li>
            ))}
            {(skipped || []).map(s => (
              <li key={`skip-${s.unique_id}`}>
                <strong>{s.unique_id}</strong> — {s.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="review-footer">
        <div className="review-footer-actions">
          <button
            type="button"
            className="submit-btn -primary"
            disabled={!results.length}
            onClick={onDownloadCSV}
          >
            Download CSV
          </button>
          <button
            type="button"
            className="submit-btn"
            onClick={onBack}
          >
            Back to review
          </button>
        </div>
      </div>
    </div>
  );
};

Results.propTypes = {
  analysisResults: PropTypes.object,
  analysisEntries: PropTypes.array,
  activeIndicator: PropTypes.string.isRequired,
  resultFilters: PropTypes.object.isRequired,
  resultSort: PropTypes.string.isRequired,
  resultGrouping: PropTypes.string.isRequired,
  onActiveIndicatorChange: PropTypes.func.isRequired,
  onResultFilterChange: PropTypes.func.isRequired,
  onResultSortChange: PropTypes.func.isRequired,
  onResultGroupingChange: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
  onDownloadCSV: PropTypes.func.isRequired,
};

Results.defaultProps = {
  analysisResults: null,
  analysisEntries: [],
};

export default Results;
