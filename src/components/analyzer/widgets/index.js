import React from 'react';
import PropTypes from 'prop-types';

import { ANALYSIS_INDICATORS } from 'constants/analysis-indicators';
import {
  computeSummary,
  productionByCrop,
  productionByCropAndRisk,
  productionByIrrigationAndRisk,
  getHotspots,
  getScatterData,
  formatMT,
  formatMTLong,
  formatPct,
  RISK_BANDS,
} from 'utils/analysis-widgets';

import {
  ChartCard,
  RiskLegend,
  HotspotList,
  HorizontalBarChart,
  StackedBarChart,
  ScatterPlot,
} from './Charts';

// ─── Summary metrics ──────────────────────────────────────────────────────────

export const SummaryMetrics = ({ rows, indicator }) => {
  const { totalProduction, pctHighRisk, locations } = computeSummary(rows, indicator);
  const metrics = [
    { key: 'production', label: 'Total Production', value: formatMT(totalProduction), unit: 'MT' },
    { key: 'risk', label: 'Production Under High Risk', value: formatPct(pctHighRisk), unit: '' },
    { key: 'locations', label: 'Locations', value: locations.toLocaleString(), unit: '' },
  ];

  return (
    <div className="aw-metrics">
      {metrics.map(metric => (
        <div key={metric.key} className={`aw-metric -${metric.key}`}>
          <span className="aw-metric-value">
            {metric.value}
            {metric.unit && <span className="aw-metric-unit">{metric.unit}</span>}
          </span>
          <span className="aw-metric-label">{metric.label}</span>
        </div>
      ))}
    </div>
  );
};

SummaryMetrics.propTypes = {
  rows: PropTypes.array.isRequired,
  indicator: PropTypes.string.isRequired,
};

// ─── Charts section ───────────────────────────────────────────────────────────

const AnalyzerWidgets = ({ rows, indicator }) => {
  if (!rows.length) {
    return (
      <div className="aw-empty">
        No results to chart for the current filters.
      </div>
    );
  }

  const indicatorMeta = ANALYSIS_INDICATORS.find(i => i.key === indicator);
  const riskLabel = indicatorMeta ? indicatorMeta.label : 'Water risk';

  const hotspots = getHotspots(rows, indicator);
  const byCrop = productionByCrop(rows);
  const byCropRisk = productionByCropAndRisk(rows, indicator);
  const byIrrigationRisk = productionByIrrigationAndRisk(rows, indicator);
  const scatter = getScatterData(rows, indicator);

  return (
    <div className="aw-charts">
      <ChartCard
        title="High-Risk Hotspots"
        subtitle={`Business units flagged High for ${riskLabel}, ranked by production`}
        isEmpty={!hotspots.length}
        emptyLabel="No high-risk locations in the current selection."
      >
        <HotspotList
          data={hotspots}
          formatValue={formatMTLong}
          formatShare={formatPct}
          barColor={RISK_BANDS.extreme.color}
        />
      </ChartCard>

      <ChartCard
        title="Total Production by Crop"
        subtitle="Production in MT and share of total (filter by region / business unit above)"
        isEmpty={!byCrop.length}
      >
        <HorizontalBarChart
          data={byCrop}
          formatValue={(value, datum) => `${formatMT(value)} (${formatPct(datum.pct)})`}
        />
      </ChartCard>

      <ChartCard
        title="Production by Crop & Risk Distribution"
        subtitle="Production in MT split by risk band"
        isEmpty={!byCropRisk.length}
      >
        <RiskLegend />
        <StackedBarChart data={byCropRisk} formatValue={formatMT} />
      </ChartCard>

      <ChartCard
        title="Irrigation vs Risk"
        subtitle="Production in MT by irrigation type, split by risk band"
        isEmpty={!byIrrigationRisk.length}
      >
        <RiskLegend />
        <StackedBarChart data={byIrrigationRisk} formatValue={formatMT} />
      </ChartCard>

      <ChartCard
        title="Production vs Risk"
        subtitle="Each point is one basin result"
        isEmpty={!scatter.length}
      >
        <RiskLegend />
        <ScatterPlot data={scatter} formatY={formatMT} xLabel={riskLabel} />
      </ChartCard>
    </div>
  );
};

AnalyzerWidgets.propTypes = {
  rows: PropTypes.array.isRequired,
  indicator: PropTypes.string.isRequired,
};

export default AnalyzerWidgets;
