import { useState } from 'react';
import { Table2 } from 'lucide-react';
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
  const [showTable, setShowTable] = useState(false);
  const sorted = [...categories].sort((a, b) => b.stockValue - a.stockValue);
  const maxVal = Math.max(1, ...sorted.map((c) => c.stockValue));
  const topCat = sorted[0];

  return (
    <div className="bg-[#FFFEFA] border border-[#E4DFD4] rounded-xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-base font-semibold text-[#292F2C]">
            Category-Wise Inventory Distribution
          </h3>
          <p className="text-xs text-[#525A54] mt-0.5">
            Valuation, unit volume, and SKU stock health across all active Indian retail categories
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#525A54]">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-[#38865B]" aria-hidden="true" /> Optimal
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-[#E6A23C]" aria-hidden="true" /> Reorder/Low
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-[#C65353]" aria-hidden="true" /> Critical
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-[#527A9B]" aria-hidden="true" /> Excess
          </span>
          <button
            type="button"
            onClick={() => setShowTable((prev) => !prev)}
            aria-expanded={showTable}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[#E4DFD4] bg-[#F5F1E8] hover:bg-[#EEEAE0] text-xs font-semibold text-[#292F2C]"
          >
            <Table2 className="w-3.5 h-3.5 text-[#145A43]" aria-hidden="true" />
            {showTable ? 'Visual Bars' : 'Data Table'}
          </button>
        </div>
      </div>

      {topCat && (
        <p className="sr-only">
          Category distribution summary across {sorted.length} categories. Highest valuation is{' '}
          {topCat.category} at {formatINR(topCat.stockValue)} across {topCat.skuCount} SKUs.
        </p>
      )}

      {!showTable ? (
        <div className="space-y-2.5">
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
                aria-label={`Filter ${cat.category}: ${cat.skuCount} SKUs, ${formatINR(cat.stockValue)}, ${cat.criticalCount + cat.lowCount} alerts`}
                className="w-full text-left group rounded-lg px-2.5 py-2 -mx-2.5 hover:bg-[#F5F1E8]/80 transition-colors"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-[#292F2C] group-hover:text-[#145A43] transition-colors truncate">
                      {cat.category}
                    </span>
                    <span className="text-[#58605A] font-mono-num shrink-0">
                      {cat.skuCount} SKUs · {formatNumber(cat.totalUnits)} units
                    </span>
                  </div>
                  <div className="flex items-center gap-3 font-mono-num shrink-0">
                    {cat.criticalCount + cat.lowCount > 0 && (
                      <span className="text-[#8C2D2D] font-semibold">
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
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[440px]">
            <caption className="sr-only">Category inventory valuation and alert summary</caption>
            <thead>
              <tr className="border-b border-[#E4DFD4] text-[#525A54] font-semibold">
                <th scope="col" className="py-2 pr-3">Category</th>
                <th scope="col" className="py-2 px-3 text-right">SKUs</th>
                <th scope="col" className="py-2 px-3 text-right">Units</th>
                <th scope="col" className="py-2 px-3 text-right">Alerts</th>
                <th scope="col" className="py-2 pl-3 text-right">Stock Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4DFD4] font-mono-num">
              {sorted.map((cat) => (
                <tr key={cat.category} className="hover:bg-[#F5F1E8]/60">
                  <th scope="row" className="py-1.5 pr-3 font-sans font-medium text-[#292F2C]">
                    <button
                      type="button"
                      onClick={() => onSelectCategory?.(cat.category)}
                      className="text-left hover:text-[#145A43] hover:underline"
                    >
                      {cat.category}
                    </button>
                  </th>
                  <td className="py-1.5 px-3 text-right">{cat.skuCount}</td>
                  <td className="py-1.5 px-3 text-right">{formatNumber(cat.totalUnits)}</td>
                  <td className="py-1.5 px-3 text-right text-[#8C2D2D]">
                    {cat.criticalCount + cat.lowCount}
                  </td>
                  <td className="py-1.5 pl-3 text-right font-semibold">
                    {formatINR(cat.stockValue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
