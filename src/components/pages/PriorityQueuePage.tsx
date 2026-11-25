import { useMemo, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  RefreshCw,
  Search,
} from 'lucide-react';
import {
  INVENTORY_CATEGORIES,
  type ForecastResponse,
  type StockStatus,
} from '../../../shared/types';
import type { EnrichedProduct } from '../../lib/api';
import { formatINR, formatNumber } from '../../lib/formatters';
import { ProductThumbnail } from '../ui/ProductThumbnail';
import { EmptyState } from '../ui/StateViews';
import { StatusBadge } from '../ui/StatusBadge';

interface PriorityQueuePageProps {
  forecast: ForecastResponse;
  products: EnrichedProduct[];
  onOpenMovement: (product: EnrichedProduct, mode: 'restock' | 'sale') => void;
}

export function PriorityQueuePage({
  forecast,
  products,
  onOpenMovement,
}: PriorityQueuePageProps) {
  const [statusGroup, setStatusGroup] = useState<'attention' | 'all' | StockStatus>('attention');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [search, setSearch] = useState('');

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const { summary } = forecast;

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return forecast.productForecasts.filter((item) => {
      if (statusGroup === 'attention') {
        if (!['critical', 'low', 'reorder'].includes(item.status)) return false;
      } else if (statusGroup !== 'all') {
        if (item.status !== statusGroup) return false;
      }
      if (categoryFilter !== 'All' && item.category !== categoryFilter) return false;
      if (q) {
        if (!item.name.toLowerCase().includes(q) && !item.sku.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [forecast.productForecasts, statusGroup, categoryFilter, search]);

  const queueCostTotal = useMemo(
    () => filteredItems.reduce((sum, item) => sum + item.estimatedOrderCost, 0),
    [filteredItems]
  );

  return (
    <div className="space-y-6 animate-fade-slide">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#292F2C] tracking-tight">
            Purchasing Priority Queue
          </h1>
          <p className="text-sm text-[#6B746E] mt-1">
            Actionable replenishment queue ranked by stockout probability, lead time exposure, and EOQ batch size.
          </p>
        </div>
        <div className="bg-[#FFFEFA] border border-[#E4DFD4] rounded-xl px-4 py-2.5 text-right shrink-0">
          <div className="text-[11px] font-medium text-[#6B746E]">
            Queue Restock Budget
          </div>
          <div className="font-mono-num text-lg font-bold text-[#145A43]">
            {formatINR(queueCostTotal)}
          </div>
        </div>
      </div>

      {/* Urgency Tier Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <button
          type="button"
          onClick={() => setStatusGroup('critical')}
          className={`text-left p-4 rounded-xl border transition-colors ${
            statusGroup === 'critical'
              ? 'bg-[#C65353]/10 border-[#C65353]'
              : 'bg-[#FFFEFA] border-[#E4DFD4] hover:border-[#C65353]/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-[#A33B3B]">
            <span>Critical Stock</span>
            <AlertOctagon className="w-4 h-4" />
          </div>
          <div className="font-mono-num text-2xl font-bold text-[#292F2C] mt-1.5">
            {summary.criticalCount}
          </div>
          <div className="text-[11px] text-[#6B746E] mt-0.5">Below safety buffer</div>
        </button>

        <button
          type="button"
          onClick={() => setStatusGroup('low')}
          className={`text-left p-4 rounded-xl border transition-colors ${
            statusGroup === 'low'
              ? 'bg-[#D99A32]/14 border-[#D99A32]'
              : 'bg-[#FFFEFA] border-[#E4DFD4] hover:border-[#D99A32]/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-[#9A6712]">
            <span>Low Stock</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="font-mono-num text-2xl font-bold text-[#292F2C] mt-1.5">
            {summary.lowCount}
          </div>
          <div className="text-[11px] text-[#6B746E] mt-0.5">Within lead-time window</div>
        </button>

        <button
          type="button"
          onClick={() => setStatusGroup('reorder')}
          className={`text-left p-4 rounded-xl border transition-colors ${
            statusGroup === 'reorder'
              ? 'bg-[#E6A23C]/14 border-[#E6A23C]'
              : 'bg-[#FFFEFA] border-[#E4DFD4] hover:border-[#E6A23C]/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-[#8F5B0B]">
            <span>Reorder Soon</span>
            <RefreshCw className="w-4 h-4" />
          </div>
          <div className="font-mono-num text-2xl font-bold text-[#292F2C] mt-1.5">
            {summary.reorderCount}
          </div>
          <div className="text-[11px] text-[#6B746E] mt-0.5">At reorder point</div>
        </button>

        <button
          type="button"
          onClick={() => setStatusGroup('normal')}
          className={`text-left p-4 rounded-xl border transition-colors ${
            statusGroup === 'normal'
              ? 'bg-[#38865B]/12 border-[#38865B]'
              : 'bg-[#FFFEFA] border-[#E4DFD4] hover:border-[#38865B]/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-[#246642]">
            <span>Normal Stock</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="font-mono-num text-2xl font-bold text-[#292F2C] mt-1.5">
            {summary.normalCount}
          </div>
          <div className="text-[11px] text-[#6B746E] mt-0.5">Healthy coverage</div>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#FFFEFA] border border-[#E4DFD4] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'attention', label: 'Action Required' },
            { id: 'all', label: 'All SKUs' },
            { id: 'critical', label: 'Critical' },
            { id: 'low', label: 'Low Stock' },
            { id: 'reorder', label: 'Reorder' },
            { id: 'normal', label: 'Normal' },
            { id: 'overstock', label: 'Excess' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusGroup(tab.id as typeof statusGroup)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusGroup === tab.id
                  ? 'bg-[#145A43] text-white'
                  : 'bg-[#F5F1E8] text-[#6B746E] hover:bg-[#EEEAE0]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 text-[#929A94] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter SKU or name..."
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-[#E4DFD4] bg-[#F5F1E8]/60 text-sm text-[#292F2C] focus:outline-none focus:ring-2 focus:ring-[#145A43]/25 focus:border-[#145A43]"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter priority queue by category"
            className="h-9 px-3 rounded-lg border border-[#E4DFD4] bg-[#FFFEFA] text-sm text-[#292F2C] focus:outline-none focus:ring-2 focus:ring-[#145A43]/25"
          >
            <option value="All">All Categories</option>
            {INVENTORY_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Queue List */}
      {filteredItems.length === 0 ? (
        <EmptyState
          title="No items in this priority tier"
          description="Great news—no products currently match this risk tier and filter combination."
          action={
            <button
              type="button"
              onClick={() => {
                setStatusGroup('all');
                setCategoryFilter('All');
                setSearch('');
              }}
              className="px-4 py-2 rounded-lg bg-[#145A43] hover:bg-[#104735] text-sm font-semibold text-white"
            >
              View All SKUs
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const fullProd = productMap.get(item.productId);
            return (
              <div
                key={item.productId}
                className="bg-[#FFFEFA] border border-[#E4DFD4] rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-[#145A43]/40 transition-colors"
              >
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  {fullProd && (
                    <ProductThumbnail
                      src={fullProd.imageUrl}
                      alt={item.name}
                      category={item.category}
                      className="w-14 h-14 rounded-lg"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-[#292F2C]">
                        {item.name}
                      </h3>
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="text-xs text-[#6B746E] mt-1">
                      {item.category} · <span className="font-mono-num">{item.sku}</span>
                      {fullProd ? ` · ${fullProd.supplier}` : ''} · Lead time{' '}
                      <span className="font-mono-num">{item.leadTimeDays}d</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 lg:gap-6 items-center border-t lg:border-t-0 pt-3 lg:pt-0 border-[#E4DFD4] shrink-0">
                  <div>
                    <div className="text-[11px] text-[#929A94]">On Hand / ROP</div>
                    <div className="font-mono-num text-sm font-semibold text-[#292F2C]">
                      {formatNumber(item.currentStock)} / {formatNumber(item.reorderPoint)}{' '}
                      <span className="text-xs font-normal text-[#6B746E]">{item.unit}</span>
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] text-[#929A94]">Coverage & Risk</div>
                    <div className="font-mono-num text-sm font-semibold text-[#292F2C]">
                      {item.daysOfSupply}d ·{' '}
                      <span
                        className={
                          item.stockoutProbability >= 60
                            ? 'text-[#A33B3B]'
                            : item.stockoutProbability >= 30
                              ? 'text-[#9A6712]'
                              : 'text-[#246642]'
                        }
                      >
                        {item.stockoutProbability}% risk
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] text-[#929A94]">Recommended PO</div>
                    <div className="font-mono-num text-sm font-semibold text-[#145A43]">
                      {item.recommendedOrderQty > 0
                        ? `+${formatNumber(item.recommendedOrderQty)} ${item.unit} (${formatINR(item.estimatedOrderCost)})`
                        : 'No order needed'}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    {fullProd && (
                      <>
                        <button
                          type="button"
                          onClick={() => onOpenMovement(fullProd, 'restock')}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#145A43] hover:bg-[#104735] text-xs font-semibold text-white transition-colors whitespace-nowrap"
                        >
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                          Restock
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenMovement(fullProd, 'sale')}
                          className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg border border-[#E4DFD4] bg-[#F5F1E8] hover:bg-[#EEEAE0] text-xs font-semibold text-[#292F2C] transition-colors whitespace-nowrap"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          Sale
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
