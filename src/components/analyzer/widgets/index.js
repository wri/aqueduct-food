import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { toggleModal, InfoModal, Icon } from 'aqueduct-components';

import { ANALYSIS_INDICATORS } from 'constants/analysis-indicators';
import { APP_DEFINITIONS } from 'constants/definitions';
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
} from 'utils/analysis-widgets';

import {
  ChartCard,
  RiskLegend,
  HotspotList,
  HorizontalBarChart,
  StackedBarChart,
  ScatterPlot,
  AQUEDUCT_BLUE,
} from './Charts';

// ─── Summary metrics ──────────────────────────────────────────────────────────

const HIGH_RISK_INFO_SLUG = 'production-high-risk';

const SummaryMetricsComponent = ({ rows, indicator, toggleModal: openModal }) => {
  const { totalVolume, pctHighRisk, locations } = computeSummary(rows, indicator);

  // Opens the same InfoModal used by the Timeframe / Water Risk help buttons.
  const showHighRiskInfo = () => {
    const { props, ...info } = APP_DEFINITIONS[HIGH_RISK_INFO_SLUG] || {};
    openModal(true, {
      children: InfoModal,
      childrenProps: { info, ...props },
    });
  };

  const metrics = [
    { key: 'production', label: 'Total Volume', value: formatMT(totalVolume), unit: 'MT' },
    {
      key: 'risk',
      label: 'Production Under High Risk',
      value: formatPct(pctHighRisk),
      unit: '',
      onInfo: showHighRiskInfo,
    },
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
          <span className="aw-metric-label">
            {metric.label}
            {metric.onInfo && (
              <button
                type="button"
                className="aw-metric-info"
                onClick={metric.onInfo}
                aria-label={`About ${metric.label}`}
              >
                <Icon name="icon-question" className="aw-metric-info-icon" />
              </button>
            )}
          </span>
        </div>
      ))}
    </div>
  );
};

SummaryMetricsComponent.propTypes = {
  rows: PropTypes.array.isRequired,
  indicator: PropTypes.string.isRequired,
  toggleModal: PropTypes.func.isRequired,
};

export const SummaryMetrics = connect(null, { toggleModal })(SummaryMetricsComponent);

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

  // Caption for the hotspots chart depends on the active indicator: Water
  // Stress vs. the SBTN targets analyses.
  const isWaterStress = indicator === 'water_stress';
  const hotspotSubtitle = isWaterStress
    ? 'Volume sourced by each business unit exposed to high-to-extremely high water stress'
    : 'Volume sourced of each business unit above SBTN Quantity targets';

  const hotspots = getHotspots(rows, indicator);
  const byCrop = productionByCrop(rows);
  const byCropRisk = productionByCropAndRisk(rows, indicator);
  const byIrrigationRisk = productionByIrrigationAndRisk(rows, indicator);
  const scatter = getScatterData(rows, indicator);

  return (
    <div className="aw-charts">
      <ChartCard
        title="High-Risk Hotspots"
        subtitle={hotspotSubtitle}
        isEmpty={!hotspots.length}
        emptyLabel="No high-risk locations in the current selection."
      >
        <HotspotList
          data={hotspots}
          formatValue={formatMTLong}
          formatShare={formatPct}
          barColor={AQUEDUCT_BLUE}
        />
      </ChartCard>

      <ChartCard
        title="Total Volume of Crop Sourced"
        subtitle="Volume of crop sourced as a share of total volume sourced for the business unit"
        isEmpty={!byCrop.length}
      >
        <HorizontalBarChart
          data={byCrop}
          formatValue={(value, datum) => `${formatMT(value)} (${formatPct(datum.pct)})`}
          barColor={AQUEDUCT_BLUE}
        />
      </ChartCard>

      <ChartCard
        title="Production by Crop & Risk Distribution"
        subtitle="Risk distribution for total volume of crop sourced, separated by crop"
        isEmpty={!byCropRisk.length}
      >
        <RiskLegend />
        <StackedBarChart data={byCropRisk} formatValue={formatMT} />
      </ChartCard>

      <ChartCard
        title="Irrigation vs Risk"
        subtitle="Risk distribution for total volume of crop sourced, separated by irrigation type"
        isEmpty={!byIrrigationRisk.length}
      >
        <RiskLegend />
        <StackedBarChart data={byIrrigationRisk} formatValue={formatMT} />
      </ChartCard>

      <ChartCard
        title="Basin Comparison of Production and Risk"
        subtitle="Volume of crop source vs. risk score per basin"
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
