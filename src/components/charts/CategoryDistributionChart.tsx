import type { CategoryForecastSummary, InventoryCategory } from '../../../shared/types';
import { formatINR, formatNumber } from '../../lib/formatters';

interface CategoryDistributionChartProps {
  categories: CategoryForecastSummary[];
  onSelectCategory?: (category: InventoryCategory) => void;
}

export function CategoryDistributionChart({
  categories,
  onSelectCategory,
}: CategoryDistributionChartProps) {
  const sorted = [...categories].sort((a, b) => b.stockValue - a.stockValue);
  const maxVal = Math.max(1, ...sorted.map((c) => c.stockValue));

  return (
    <div className="bg-[#FFFEFA] border border-[#E4DFD4] rounded-xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-semibold text-[#292F2C]">
            Category-Wise Inventory Distribution
          </h3>
          <p className="text-xs text-[#6B746E] mt-0.5">
            Valuation, unit volume, and SKU stock health across all active Indian retail categories
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#6B746E]">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-[#38865B]" /> Optimal
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-[#E6A23C]" /> Reorder/Low
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-[#C65353]" /> Critical
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-[#527A9B]" /> Excess
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {sorted.map((cat) => {
          const total = Math.max(1, cat.skuCount);
          const pctVal = Math.max(6, Math.round((cat.stockValue / maxVal) * 100));
          const critW = (cat.criticalCount / total) * 100;
          const warnW = ((cat.lowCount + cat.reorderCount) / total) * 100;
          const okW = (cat.normalCount / total) * 100;
          const overW = (cat.overstockCount / total) * 100;

          return (
            <button
              key={cat.category}
              type="button"
              onClick={() => onSelectCategory?.(cat.category)}
              className="w-full text-left group rounded-lg px-2.5 py-2 -mx-2.5 hover:bg-[#F5F1E8]/70 transition-colors"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold text-[#292F2C] group-hover:text-[#145A43] transition-colors truncate">
                    {cat.category}
                  </span>
                  <span className="text-[#929A94] font-mono-num shrink-0">
                    {cat.skuCount} SKUs · {formatNumber(cat.totalUnits)} units
                  </span>
                </div>
                <div className="flex items-center gap-3 font-mono-num shrink-0">
                  {cat.criticalCount + cat.lowCount > 0 && (
                    <span className="text-[#A33B3B] font-medium">
                      {cat.criticalCount + cat.lowCount} alerts
                    </span>
                  )}
                  <span className="font-semibold text-[#292F2C]">
                    {formatINR(cat.stockValue)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-[#EEEAE0] rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-[#145A43]/85 rounded-full transition-all duration-300"
                    style={{ width: `${pctVal}%` }}
                  />
                </div>
                <div
                  className="w-24 h-2 bg-[#EEEAE0] rounded-full overflow-hidden flex shrink-0"
                  title={`${cat.normalCount} optimal, ${cat.lowCount + cat.reorderCount} low/reorder, ${cat.criticalCount} critical, ${cat.overstockCount} excess`}
                >
                  {okW > 0 && <div className="h-full bg-[#38865B]" style={{ width: `${okW}%` }} />}
                  {warnW > 0 && <div className="h-full bg-[#E6A23C]" style={{ width: `${warnW}%` }} />}
                  {critW > 0 && <div className="h-full bg-[#C65353]" style={{ width: `${critW}%` }} />}
                  {overW > 0 && <div className="h-full bg-[#527A9B]" style={{ width: `${overW}%` }} />}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
