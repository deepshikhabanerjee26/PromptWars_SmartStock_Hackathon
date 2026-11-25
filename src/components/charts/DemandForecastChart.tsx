import { useMemo, useState } from 'react';
import type { ForecastTimelinePoint } from '../../../shared/types';
import { formatNumber } from '../../lib/formatters';

interface DemandForecastChartProps {
  timeline: ForecastTimelinePoint[];
  height?: number;
  title?: string;
  subtitle?: string;
}

export function DemandForecastChart({
  timeline,
  height = 280,
  title = 'Historical vs. Predicted Demand',
  subtitle = 'Actual monthly sales units contrasted with seasonal forecast and 90% uncertainty interval',
}: DemandForecastChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const chart = useMemo(() => {
    const width = 760;
    const padLeft = 52;
    const padRight = 24;
    const padTop = 20;
    const padBottom = 38;
    const innerW = width - padLeft - padRight;
    const innerH = height - padTop - padBottom;

    const allVals: number[] = [];
    for (const pt of timeline) {
      if (pt.actualUnits !== null) allVals.push(pt.actualUnits);
      if (pt.predictedUnits !== null) allVals.push(pt.predictedUnits);
      if (pt.upperBound !== null) allVals.push(pt.upperBound);
      if (pt.lowerBound !== null) allVals.push(pt.lowerBound);
    }

    const rawMax = Math.max(10, ...allVals);
    const maxY = Math.ceil((rawMax * 1.12) / 10) * 10;
    const minY = 0;

    const xFor = (i: number) =>
      timeline.length <= 1
        ? padLeft + innerW / 2
        : padLeft + (i / (timeline.length - 1)) * innerW;
    const yFor = (val: number) =>
      padTop + innerH - ((val - minY) / Math.max(1, maxY - minY)) * innerH;

    // Actual polyline & area
    const actualPoints: Array<{ x: number; y: number; i: number }> = [];
    const forecastPoints: Array<{ x: number; y: number; i: number }> = [];
    const upperPoints: Array<{ x: number; y: number }> = [];
    const lowerPoints: Array<{ x: number; y: number }> = [];

    timeline.forEach((pt, i) => {
      const x = xFor(i);
      if (pt.actualUnits !== null) {
        actualPoints.push({ x, y: yFor(pt.actualUnits), i });
      }
      if (pt.predictedUnits !== null) {
        forecastPoints.push({ x, y: yFor(pt.predictedUnits), i });
      }
      if (pt.upperBound !== null && pt.lowerBound !== null) {
        upperPoints.push({ x, y: yFor(pt.upperBound) });
        lowerPoints.push({ x, y: yFor(pt.lowerBound) });
      }
    });

    const actualLinePath = actualPoints
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');

    const actualAreaPath =
      actualPoints.length > 1
        ? `${actualLinePath} L ${actualPoints[actualPoints.length - 1].x.toFixed(1)} ${(padTop + innerH).toFixed(1)} L ${actualPoints[0].x.toFixed(1)} ${(padTop + innerH).toFixed(1)} Z`
        : '';

    const forecastLinePath = forecastPoints
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');

    const bandPath =
      upperPoints.length > 1 && lowerPoints.length === upperPoints.length
        ? [
            ...upperPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`),
            ...[...lowerPoints]
              .reverse()
              .map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`),
            'Z',
          ].join(' ')
        : '';

    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
      value: Math.round(minY + (maxY - minY) * t),
      y: yFor(minY + (maxY - minY) * t),
    }));

    return {
      width,
      height,
      padLeft,
      padRight,
      padTop,
      padBottom,
      innerH,
      xFor,
      yFor,
      actualPoints,
      forecastPoints,
      actualLinePath,
      actualAreaPath,
      forecastLinePath,
      bandPath,
      yTicks,
    };
  }, [timeline, height]);

  const activePoint = hoverIdx !== null ? timeline[hoverIdx] : null;
  const activeX = hoverIdx !== null ? chart.xFor(hoverIdx) : 0;

  return (
    <div className="bg-[#FFFEFA] border border-[#E4DFD4] rounded-xl p-5 flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-semibold text-[#292F2C]">{title}</h3>
          <p className="text-xs text-[#6B746E] mt-0.5">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-[#6B746E] shrink-0">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#145A43] inline-block rounded" />
            Actual Sales
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t-2 border-dashed border-[#E6A23C] inline-block" />
            AI Forecast
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-2.5 bg-[#E6A23C]/20 border border-[#E6A23C]/40 inline-block rounded-xs" />
            90% Uncertainty Band
          </span>
        </div>
      </div>

      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${chart.width} ${chart.height}`}
          className="w-full h-auto overflow-visible select-none"
          role="img"
          aria-label={title}
        >
          <defs>
            <linearGradient id="emeraldAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#145A43" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#145A43" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Horizontal Gridlines & Y Labels */}
          {chart.yTicks.map((tick) => (
            <g key={tick.value}>
              <line
                x1={chart.padLeft}
                y1={tick.y}
                x2={chart.width - chart.padRight}
                y2={tick.y}
                stroke="#E4DFD4"
                strokeWidth="1"
              />
              <text
                x={chart.padLeft - 8}
                y={tick.y + 4}
                textAnchor="end"
                className="fill-[#929A94] text-[10px] font-mono-num"
              >
                {tick.value >= 1000 ? `${(tick.value / 1000).toFixed(1)}k` : tick.value}
              </text>
            </g>
          ))}

          {/* Forecast Split Vertical Marker */}
          {chart.actualPoints.length > 0 && (
            <line
              x1={chart.actualPoints[chart.actualPoints.length - 1].x}
              y1={chart.padTop}
              x2={chart.actualPoints[chart.actualPoints.length - 1].x}
              y2={chart.padTop + chart.innerH}
              stroke="#D99A32"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.55"
            />
          )}

          {/* Uncertainty Confidence Band */}
          {chart.bandPath && (
            <path d={chart.bandPath} fill="#E6A23C" fillOpacity="0.16" />
          )}

          {/* Actual Area & Line */}
          {chart.actualAreaPath && (
            <path d={chart.actualAreaPath} fill="url(#emeraldAreaGrad)" />
          )}
          {chart.actualLinePath && (
            <path
              d={chart.actualLinePath}
              fill="none"
              stroke="#145A43"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Forecast Dashed Line */}
          {chart.forecastLinePath && (
            <path
              d={chart.forecastLinePath}
              fill="none"
              stroke="#E6A23C"
              strokeWidth="2.5"
              strokeDasharray="6 4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data Nodes */}
          {chart.actualPoints.map((pt) => (
            <circle
              key={`a-${pt.i}`}
              cx={pt.x}
              cy={pt.y}
              r={hoverIdx === pt.i ? 4.5 : 2.5}
              fill="#145A43"
              stroke="#FFFEFA"
              strokeWidth="1.5"
            />
          ))}

          {chart.forecastPoints.slice(1).map((pt) => (
            <circle
              key={`f-${pt.i}`}
              cx={pt.x}
              cy={pt.y}
              r={hoverIdx === pt.i ? 4.5 : 3}
              fill="#E6A23C"
              stroke="#FFFEFA"
              strokeWidth="1.5"
            />
          ))}

          {/* X-axis Labels */}
          {timeline.map((pt, i) => {
            const showLabel = timeline.length <= 10 || i % 2 === 0 || i === timeline.length - 1;
            if (!showLabel) return null;
            return (
              <text
                key={pt.label}
                x={chart.xFor(i)}
                y={chart.padTop + chart.innerH + 20}
                textAnchor="middle"
                className={`text-[10px] ${
                  pt.kind === 'forecast' ? 'fill-[#9A6712] font-semibold' : 'fill-[#6B746E]'
                }`}
              >
                {pt.label}
              </text>
            );
          })}

          {/* Hover Vertical Crosshair */}
          {hoverIdx !== null && (
            <line
              x1={activeX}
              y1={chart.padTop}
              x2={activeX}
              y2={chart.padTop + chart.innerH}
              stroke="#292F2C"
              strokeWidth="1"
              opacity="0.25"
            />
          )}

          {/* Interactive Hit Regions */}
          {timeline.map((pt, i) => {
            const x = chart.xFor(i);
            const colW =
              timeline.length > 1
                ? (chart.width - chart.padLeft - chart.padRight) / (timeline.length - 1)
                : 40;
            return (
              <rect
                key={`hit-${pt.label}`}
                x={x - colW / 2}
                y={chart.padTop}
                width={colW}
                height={chart.innerH + 24}
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
              />
            );
          })}
        </svg>

        {/* Interactive Tooltip */}
        {activePoint && hoverIdx !== null && (
          <div
            className="pointer-events-none absolute top-2 z-10 rounded-lg border border-[#E4DFD4] bg-[#FFFEFA]/95 px-3 py-2 shadow-md text-xs"
            style={{
              left: `${Math.min(72, Math.max(8, (activeX / chart.width) * 100))}%`,
            }}
          >
            <div className="font-semibold text-[#292F2C] mb-1">
              {activePoint.label}{' '}
              <span className="text-[11px] font-normal text-[#6B746E]">
                ({activePoint.kind === 'forecast' ? 'Predicted' : 'Historical'})
              </span>
            </div>
            {activePoint.actualUnits !== null && (
              <div className="flex items-center justify-between gap-4 text-[#145A43] font-mono-num">
                <span>Actual Sales:</span>
                <span className="font-semibold">{formatNumber(activePoint.actualUnits)} units</span>
              </div>
            )}
            {activePoint.predictedUnits !== null && activePoint.kind === 'forecast' && (
              <>
                <div className="flex items-center justify-between gap-4 text-[#9A6712] font-mono-num">
                  <span>Predicted:</span>
                  <span className="font-semibold">{formatNumber(activePoint.predictedUnits)} units</span>
                </div>
                {activePoint.lowerBound !== null && activePoint.upperBound !== null && (
                  <div className="flex items-center justify-between gap-4 text-[#6B746E] font-mono-num mt-0.5">
                    <span>90% Range:</span>
                    <span>
                      {formatNumber(activePoint.lowerBound)} – {formatNumber(activePoint.upperBound)}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
