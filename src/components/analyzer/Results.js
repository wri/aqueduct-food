import React from 'react';
import PropTypes from 'prop-types';
import { describeIndicatorValue } from 'constants/analysis-indicators';
import {
  RESULT_COLUMN_LABELS,
  GROUP_LABEL,
  GROUP_KEY,
  getResultColumns,
  formatResultCell,
  augmentResults,
  applyResultFilters,
  applyResultSort,
} from './results-helpers';
import AnalyzerWidgets, { SummaryMetrics } from './widgets';

// ─── Results data ────────────────────────────────────────────────────────────
// The summary, high-level metrics and the Table / Charts view. The controls
// that drive these (indicator, group-by, filters, sort) live in the header
// (ResultsControls); this renders in the section below.

const Results = ({
  analysisResults,
  analysisEntries,
  activeIndicator,
  resultFilters,
  resultSort,
  resultGrouping,
  resultView,
  onResultViewChange,
  onBack,
  onDownloadCSV,
}) => {
  if (!analysisResults) return null;
  const { results, errors, skipped } = analysisResults;
  const errorCount = (errors ? errors.length : 0) + (skipped ? skipped.length : 0);

  const augmented = augmentResults(results, analysisEntries);
  const visibleRows = applyResultSort(applyResultFilters(augmented, resultFilters), resultSort);

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

      {/* Widgets: high-level metrics + Table / Charts toggle ------------------ */}
      <SummaryMetrics rows={visibleRows} indicator={activeIndicator} />

      <div className="results-panel-surface">
        <div className="results-view-toggle">
          {[
            { value: 'table', label: 'Table' },
            { value: 'charts', label: 'Charts' },
          ].map(view => (
            <button
              key={view.value}
              type="button"
              className={`results-view-btn${resultView === view.value ? ' -active' : ''}`}
              onClick={() => onResultViewChange(view.value)}
            >
              {view.label}
            </button>
          ))}
        </div>

        {resultView === 'charts' && (
          <AnalyzerWidgets rows={visibleRows} indicator={activeIndicator} />
        )}

        {resultView === 'table' && (visibleRows.length > 0 ? (() => {
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
        ))}

        <div className="review-footer -in-surface">
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
  resultView: PropTypes.string.isRequired,
  onResultViewChange: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
  onDownloadCSV: PropTypes.func.isRequired,
};

Results.defaultProps = {
  analysisResults: null,
  analysisEntries: [],
};

export default Results;
