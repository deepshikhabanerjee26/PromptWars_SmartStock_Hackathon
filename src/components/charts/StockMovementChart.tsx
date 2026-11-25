import { useMemo, useState } from 'react';
import type { ForecastTimelinePoint } from '../../../shared/types';
import { formatNumber } from '../../lib/formatters';

interface StockMovementChartProps {
  timeline: ForecastTimelinePoint[];
}

export function StockMovementChart({ timeline }: StockMovementChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const recentActuals = useMemo(
    () => timeline.filter((t) => t.kind === 'actual').slice(-6),
    [timeline]
  );

  const width = 460;
  const height = 230;
  const padLeft = 44;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 32;
  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;

  const maxVal = useMemo(() => {
    const vals = recentActuals.flatMap((d) => [d.actualUnits ?? 0, d.inboundUnits ?? 0]);
    return Math.max(10, Math.ceil((Math.max(...vals, 10) * 1.15) / 10) * 10);
  }, [recentActuals]);

  const yFor = (val: number) => padTop + innerH - (val / maxVal) * innerH;
  const groupW = recentActuals.length > 0 ? innerW / recentActuals.length : innerW;
  const barW = Math.min(20, groupW * 0.3);

  const yTicks = [0, 0.5, 1].map((t) => ({
    value: Math.round(maxVal * t),
    y: yFor(maxVal * t),
  }));

  const active = hoverIdx !== null ? recentActuals[hoverIdx] : null;

  return (
    <div className="bg-[#FFFEFA] border border-[#E4DFD4] rounded-xl p-5 flex flex-col h-full">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
        <div>
          <h3 className="text-base font-semibold text-[#292F2C]">Stock Movement Overview</h3>
          <p className="text-xs text-[#6B746E] mt-0.5">
            6-month inbound restocks vs. outbound sales
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-[#6B746E]">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#38865B]" />
            Restocked
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#E6A23C]" />
            Sold
          </span>
        </div>
      </div>

      <div className="relative flex-1 flex items-center">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
          role="img"
          aria-label="Stock movement comparison chart"
        >
          {yTicks.map((tick) => (
            <g key={tick.value}>
              <line
                x1={padLeft}
                y1={tick.y}
                x2={width - padRight}
                y2={tick.y}
                stroke="#E4DFD4"
                strokeWidth="1"
              />
              <text
                x={padLeft - 8}
                y={tick.y + 4}
                textAnchor="end"
                className="fill-[#929A94] text-[10px] font-mono-num"
              >
                {tick.value >= 1000 ? `${(tick.value / 1000).toFixed(1)}k` : tick.value}
              </text>
            </g>
          ))}

          {recentActuals.map((item, idx) => {
            const centerX = padLeft + idx * groupW + groupW / 2;
            const inbound = item.inboundUnits ?? 0;
            const sold = item.actualUnits ?? 0;
            const inY = yFor(inbound);
            const soldY = yFor(sold);
            const isHovered = hoverIdx === idx;

            return (
              <g
                key={item.label}
                onMouseEnter={() => setHoverIdx(idx)}
                onMouseLeave={() => setHoverIdx(null)}
                className="cursor-pointer"
              >
                {isHovered && (
                  <rect
                    x={padLeft + idx * groupW + 2}
                    y={padTop}
                    width={groupW - 4}
                    height={innerH}
                    rx="4"
                    fill="#EEEAE0"
                    opacity="0.65"
                  />
                )}
                <rect
                  x={centerX - barW - 2}
                  y={inY}
                  width={barW}
                  height={Math.max(2, padTop + innerH - inY)}
                  rx="3"
                  fill="#38865B"
                />
                <rect
                  x={centerX + 2}
                  y={soldY}
                  width={barW}
                  height={Math.max(2, padTop + innerH - soldY)}
                  rx="3"
                  fill="#E6A23C"
                />
                <text
                  x={centerX}
                  y={padTop + innerH + 18}
                  textAnchor="middle"
                  className="fill-[#6B746E] text-[10px]"
                >
                  {item.label}
                </text>
              </g>
            );
          })}
        </svg>

        {active && hoverIdx !== null && (
          <div className="pointer-events-none absolute top-1 right-2 rounded-lg border border-[#E4DFD4] bg-[#FFFEFA] px-3 py-2 shadow-md text-xs">
            <div className="font-semibold text-[#292F2C] mb-1">{active.label}</div>
            <div className="flex items-center justify-between gap-3 text-[#246642] font-mono-num">
              <span>Inbound:</span>
              <span className="font-semibold">{formatNumber(active.inboundUnits ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[#9A6712] font-mono-num">
              <span>Outbound:</span>
              <span className="font-semibold">{formatNumber(active.actualUnits ?? 0)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
