import React from 'react';
import PropTypes from 'prop-types';
import { max as d3max } from 'd3-array';

import { RISK_BANDS, RISK_BAND_KEYS } from 'utils/analysis-widgets';

// Lightweight, dependency-free SVG charts tuned for the narrow (dark) results
// sidebar. Each chart draws into a fixed viewBox and stretches to the
// container width via `width="100%"`, so it stays crisp at any panel size.

// Light / slate palette to match the analyzer redesign.
const ACCENT = RISK_BANDS.high.color; // Aqueduct high (orange-red)
const AXIS = '#e2e8f0'; // slate-200
const LABEL = '#334155'; // slate-700
const MUTED = '#64748b'; // slate-500

const truncate = (text, maxChars) => {
  const str = String(text);
  return str.length > maxChars ? `${str.slice(0, maxChars - 1)}…` : str;
};

// ─── Instant hover tooltip ─────────────────────────────────────────────────────
// SVG <title> tooltips only appear after the browser's ~1s hover delay, which
// felt sluggish. This custom tooltip follows the cursor and shows immediately.

const useChartTooltip = () => {
  const wrapRef = React.useRef(null);
  const [tip, setTip] = React.useState(null);

  const show = (event, content) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const bounds = wrap.getBoundingClientRect();
    setTip({
      content,
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
  };
  const hide = () => setTip(null);

  return { wrapRef, tip, show, hide };
};

const ChartTooltip = ({ tip }) => {
  if (!tip) return null;
  return (
    <div className="aw-tooltip" style={{ left: tip.x, top: tip.y }}>
      {tip.content}
    </div>
  );
};

ChartTooltip.propTypes = {
  tip: PropTypes.shape({
    content: PropTypes.node,
    x: PropTypes.number,
    y: PropTypes.number,
  }),
};

ChartTooltip.defaultProps = {
  tip: null,
};

// ─── ChartCard ───────────────────────────────────────────────────────────────

export const ChartCard = ({
  title, subtitle, isEmpty, emptyLabel, children,
}) => (
  <section className="aw-card">
    <header className="aw-card-header">
      <h4 className="aw-card-title">{title}</h4>
      {subtitle && <p className="aw-card-subtitle">{subtitle}</p>}
    </header>
    {isEmpty
      ? <p className="aw-card-empty">{emptyLabel}</p>
      : <div className="aw-card-body">{children}</div>}
  </section>
);

ChartCard.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  isEmpty: PropTypes.bool,
  emptyLabel: PropTypes.string,
  children: PropTypes.node,
};

ChartCard.defaultProps = {
  subtitle: null,
  isEmpty: false,
  emptyLabel: 'No data for the current selection.',
  children: null,
};

// ─── Risk legend ──────────────────────────────────────────────────────────────

export const RiskLegend = ({ bands }) => (
  <ul className="aw-legend">
    {bands.map(key => (
      <li key={key} className="aw-legend-item">
        <span className="aw-legend-swatch" style={{ backgroundColor: RISK_BANDS[key].color }} />
        {RISK_BANDS[key].label}
      </li>
    ))}
  </ul>
);

RiskLegend.propTypes = {
  bands: PropTypes.arrayOf(PropTypes.string),
};

RiskLegend.defaultProps = {
  bands: ['extreme', 'high', 'medium', 'low'],
};

// ─── Hotspot list (ranked, with magnitude bar + share) ────────────────────────

export const HotspotList = ({
  data, formatValue, formatShare, barColor,
}) => {
  const maxValue = d3max(data, d => d.value) || 1;

  return (
    <ol className="aw-hotspots">
      {data.map((d, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <li key={`${d.label}-${i}`} className="aw-hotspot">
          <div className="aw-hotspot-top">
            <span className="aw-hotspot-rank">{i + 1}</span>
            <span className="aw-hotspot-label">{d.label}</span>
          </div>
          <div className="aw-hotspot-track">
            <span
              className="aw-hotspot-fill"
              style={{ width: `${Math.max((d.value / maxValue) * 100, 2)}%`, backgroundColor: barColor }}
            />
          </div>
          <span className="aw-hotspot-value">
            {formatValue(d.value)}
            {d.pct != null && <span className="aw-hotspot-share"> ({formatShare(d.pct)})</span>}
          </span>
        </li>
      ))}
    </ol>
  );
};

HotspotList.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string,
    value: PropTypes.number,
    pct: PropTypes.number,
  })).isRequired,
  formatValue: PropTypes.func.isRequired,
  formatShare: PropTypes.func.isRequired,
  barColor: PropTypes.string,
};

HotspotList.defaultProps = {
  barColor: RISK_BANDS.extreme.color,
};

// ─── Horizontal bar chart ─────────────────────────────────────────────────────

export const HorizontalBarChart = ({ data, formatValue, barColor }) => {
  const W = 320;
  const rowH = 26;
  const labelW = 78;
  const valueW = 74;
  const H = data.length * rowH + 4;
  const barMax = W - labelW - valueW;
  const maxValue = d3max(data, d => d.value) || 1;

  return (
    <svg className="aw-svg" viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMinYMin meet">
      {data.map((d, i) => {
        const y = i * rowH;
        const barH = rowH - 12;
        const w = maxValue > 0 ? (d.value / maxValue) * barMax : 0;
        return (
          <g key={d.label}>
            <text x={labelW - 6} y={y + rowH / 2} textAnchor="end" dominantBaseline="central" fontSize="11" fill={LABEL}>
              {truncate(d.label, 11)}
            </text>
            <rect x={labelW} y={y + (rowH - barH) / 2} width={Math.max(w, 1)} height={barH} rx="2" fill={d.color || barColor} />
            <text x={labelW + w + 5} y={y + rowH / 2} dominantBaseline="central" fontSize="10" fill={MUTED}>
              {formatValue(d.value, d)}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

HorizontalBarChart.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string,
    value: PropTypes.number,
    color: PropTypes.string,
  })).isRequired,
  formatValue: PropTypes.func.isRequired,
  barColor: PropTypes.string,
};

HorizontalBarChart.defaultProps = {
  barColor: ACCENT,
};

// ─── Stacked horizontal bar chart (production split by risk band) ──────────────

export const StackedBarChart = ({ data, formatValue, bands }) => {
  const W = 320;
  const rowH = 26;
  const labelW = 78;
  const valueW = 52;
  const H = data.length * rowH + 4;
  const barMax = W - labelW - valueW;
  const maxTotal = d3max(data, d => d.total) || 1;
  const { wrapRef, tip, show, hide } = useChartTooltip();

  return (
    <div className="aw-chart-wrap" ref={wrapRef}>
      <svg className="aw-svg" viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMinYMin meet">
        {data.map((d, i) => {
          const y = i * rowH;
          const barH = rowH - 12;
          const scale = maxTotal > 0 ? barMax / maxTotal : 0;
          let offset = labelW;
          return (
            <g key={d.label}>
              <text x={labelW - 6} y={y + rowH / 2} textAnchor="end" dominantBaseline="central" fontSize="11" fill={LABEL}>
                {truncate(d.label, 11)}
              </text>
              {bands.map((band) => {
                const segValue = d.segments[band] || 0;
                if (segValue <= 0) return null;
                const segW = segValue * scale;
                const x = offset;
                offset += segW;
                return (
                  <rect
                    key={band}
                    x={x}
                    y={y + (rowH - barH) / 2}
                    width={Math.max(segW, 0.5)}
                    height={barH}
                    fill={RISK_BANDS[band].color}
                    stroke="#fff"
                    strokeWidth="0.5"
                    onMouseMove={e => show(e, `${d.label} · ${RISK_BANDS[band].label}: ${formatValue(segValue)}`)}
                    onMouseLeave={hide}
                  />
                );
              })}
              <text x={offset + 5} y={y + rowH / 2} dominantBaseline="central" fontSize="10" fill={MUTED}>
                {formatValue(d.total)}
              </text>
            </g>
          );
        })}
      </svg>
      <ChartTooltip tip={tip} />
    </div>
  );
};

StackedBarChart.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string,
    segments: PropTypes.object,
    total: PropTypes.number,
  })).isRequired,
  formatValue: PropTypes.func.isRequired,
  bands: PropTypes.arrayOf(PropTypes.string),
};

StackedBarChart.defaultProps = {
  bands: RISK_BAND_KEYS,
};

// ─── Scatter plot (production vs risk) ────────────────────────────────────────

export const ScatterPlot = ({
  data, formatY, xLabel,
}) => {
  const W = 320;
  const H = 210;
  const padL = 44;
  const padR = 12;
  const padT = 10;
  const padB = 26;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const maxY = d3max(data, d => d.y) || 1;

  const xScale = x => padL + x * plotW;
  const yScale = y => padT + plotH - (maxY > 0 ? (y / maxY) * plotH : 0);

  const yTicks = [0, 0.5, 1].map(t => t * maxY);
  const xTicks = [
    { value: 0, label: 'Low' },
    { value: 0.5, label: 'Med' },
    { value: 1, label: 'High' },
  ];
  const { wrapRef, tip, show, hide } = useChartTooltip();

  return (
    <div className="aw-chart-wrap" ref={wrapRef}>
      <svg className="aw-svg" viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMinYMin meet">
        {/* Y grid + ticks */}
        {yTicks.map((t) => {
          const y = yScale(t);
          return (
            <g key={`y-${t}`}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke={AXIS} strokeDasharray="2 3" />
              <text x={padL - 5} y={y} textAnchor="end" dominantBaseline="central" fontSize="9" fill={MUTED}>
                {formatY(t)}
              </text>
            </g>
          );
        })}

        {/* X axis */}
        <line x1={padL} y1={padT + plotH} x2={W - padR} y2={padT + plotH} stroke={AXIS} />
        {xTicks.map(t => (
          <text key={t.label} x={xScale(t.value)} y={padT + plotH + 12} textAnchor="middle" fontSize="9" fill={MUTED}>
            {t.label}
          </text>
        ))}
        <text x={padL + plotW / 2} y={H - 1} textAnchor="middle" fontSize="9" fill={MUTED}>
          {xLabel}
        </text>

        {/* Points */}
        {data.map((d, i) => (
          <circle
            // eslint-disable-next-line react/no-array-index-key
            key={`${d.label}-${i}`}
            cx={xScale(d.x)}
            cy={yScale(d.y)}
            r="3.5"
            fill={RISK_BANDS[d.band].color}
            fillOpacity="0.85"
            stroke="#fff"
            strokeWidth="0.75"
            onMouseMove={e => show(e, `${d.label} — ${formatY(d.y)}`)}
            onMouseLeave={hide}
          />
        ))}
      </svg>
      <ChartTooltip tip={tip} />
    </div>
  );
};

ScatterPlot.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({
    x: PropTypes.number,
    y: PropTypes.number,
    band: PropTypes.string,
    label: PropTypes.string,
  })).isRequired,
  formatY: PropTypes.func.isRequired,
  xLabel: PropTypes.string,
};

ScatterPlot.defaultProps = {
  xLabel: 'Water risk',
};
