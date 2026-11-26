import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Boxes,
  IndianRupee,
  Plus,
  TrendingUp,
} from 'lucide-react';
import type {
  ActivityItem,
  ForecastResponse,
  InventoryCategory,
} from '../../../shared/types';
import type { EnrichedProduct } from '../../lib/api';
import { formatINR, formatNumber, formatRelativeTime } from '../../lib/formatters';
import {
  EXACT_PROBLEM_STATEMENT,
  PROBLEM_REQUIREMENTS_MAP,
} from '../../lib/problemStatement';
import { CategoryDistributionChart } from '../charts/CategoryDistributionChart';
import { DemandForecastChart } from '../charts/DemandForecastChart';
import { StockMovementChart } from '../charts/StockMovementChart';
import type { NavRoute } from '../layout/Sidebar';
import { ProductThumbnail } from '../ui/ProductThumbnail';
import { StatusBadge } from '../ui/StatusBadge';

interface DashboardPageProps {
  products: EnrichedProduct[];
  activities: ActivityItem[];
  forecast: ForecastResponse;
  onNavigate: (route: NavRoute) => void;
  onSelectCategoryForInventory: (category: InventoryCategory) => void;
  onOpenAddProduct: () => void;
  onOpenMovement: (product: EnrichedProduct, mode: 'restock' | 'sale') => void;
}

export function DashboardPage({
  products,
  activities,
  forecast,
  onNavigate,
  onSelectCategoryForInventory,
  onOpenAddProduct,
  onOpenMovement,
}: DashboardPageProps) {
  const { summary } = forecast;
  const urgentCount = summary.criticalCount + summary.lowCount + summary.reorderCount;
  const productMap = new Map(products.map((p) => [p.id, p]));
  const topPriority = forecast.productForecasts
    .filter((f) => f.status === 'critical' || f.status === 'low' || f.status === 'reorder')
    .slice(0, 5);

  const forecastHorizonPoints = forecast.timeline.filter((t) => t.kind === 'forecast');
  const worstCaseDemand = forecastHorizonPoints.reduce((s, p) => s + (p.lowerBound ?? 0), 0);
  const bestCaseDemand = forecastHorizonPoints.reduce((s, p) => s + (p.upperBound ?? 0), 0);

  return (
    <div className="space-y-7 animate-fade-slide">
      {/* Header Row (Single H1 for page landmark) */}
      <section aria-labelledby="dashboard-heading" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 id="dashboard-heading" className="text-2xl font-bold text-[#292F2C] tracking-tight">
            Demand Forecasting & Inventory Optimization
          </h1>
          <p className="text-sm text-[#525A54] mt-1">
            Analyzing historical sales, seasonal trends, and inventory data across{' '}
            <span className="font-semibold text-[#292F2C]">{forecast.categoryBreakdown.length}</span>{' '}
            categories to guide purchasing decisions under uncertainty.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('forecast')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#E4DFD4] bg-[#FFFEFA] hover:bg-[#EEEAE0] text-sm font-medium text-[#292F2C] transition-colors whitespace-nowrap"
          >
            <TrendingUp className="w-4 h-4 text-[#145A43]" aria-hidden="true" />
            Scenario Analysis
          </button>
          <button
            type="button"
            onClick={onOpenAddProduct}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#145A43] hover:bg-[#104735] text-sm font-semibold text-white transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Add Product
          </button>
        </div>
      </section>

      {/* 4 Summary Metric Cards */}
      <section aria-labelledby="kpi-heading">
        <h2 id="kpi-heading" className="sr-only">
          Key Inventory and Demand Forecasting Metrics
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-[#FFFEFA] border border-[#E4DFD4] rounded-xl p-5">
            <div className="flex items-center justify-between text-xs font-medium text-[#525A54]">
              <span>Inventory Data Value</span>
              <span className="w-8 h-8 rounded-lg bg-[#145A43]/10 text-[#145A43] flex items-center justify-center">
                <IndianRupee className="w-4 h-4" aria-hidden="true" />
              </span>
            </div>
            <div className="font-mono-num text-2xl font-bold text-[#292F2C] mt-2">
              {formatINR(summary.totalStockValue)}
            </div>
            <div className="text-xs text-[#525A54] mt-1 font-mono-num">
              Retail value {formatINR(summary.totalRetailValue)}
            </div>
          </div>

          <div className="bg-[#FFFEFA] border border-[#E4DFD4] rounded-xl p-5">
            <div className="flex items-center justify-between text-xs font-medium text-[#525A54]">
              <span>Active Inventory SKUs</span>
              <span className="w-8 h-8 rounded-lg bg-[#38865B]/12 text-[#1B5736] flex items-center justify-center">
                <Boxes className="w-4 h-4" aria-hidden="true" />
              </span>
            </div>
            <div className="font-mono-num text-2xl font-bold text-[#292F2C] mt-2">
              {formatNumber(summary.totalSkus)} SKUs
            </div>
            <div className="text-xs text-[#525A54] mt-1 font-mono-num">
              {formatNumber(summary.totalUnits)} units · {summary.overstockCount} excess stock
            </div>
          </div>

          <div className="bg-[#FFFEFA] border border-[#E4DFD4] rounded-xl p-5">
            <div className="flex items-center justify-between text-xs font-medium text-[#525A54]">
              <span>Shortage & Reorder Alerts</span>
              <span className="w-8 h-8 rounded-lg bg-[#C65353]/12 text-[#8C2D2D] flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" aria-hidden="true" />
              </span>
            </div>
            <div className="font-mono-num text-2xl font-bold text-[#292F2C] mt-2">
              {urgentCount} Items
            </div>
            <div className="text-xs text-[#525A54] mt-1 font-mono-num">
              <span className="text-[#8C2D2D] font-semibold">{summary.criticalCount} critical</span>
              {' · '}
              <span>{summary.lowCount + summary.reorderCount} low/reorder</span>
            </div>
          </div>

          <div className="bg-[#FFFEFA] border border-[#E4DFD4] rounded-xl p-5">
            <div className="flex items-center justify-between text-xs font-medium text-[#525A54]">
              <span>Expected 30-Day Demand</span>
              <span className="w-8 h-8 rounded-lg bg-[#E6A23C]/18 text-[#7A4E08] flex items-center justify-center">
                <TrendingUp className="w-4 h-4" aria-hidden="true" />
              </span>
            </div>
            <div className="font-mono-num text-2xl font-bold text-[#292F2C] mt-2">
              {formatNumber(summary.predictedDemandUnits)} units
            </div>
            <div className="text-xs text-[#525A54] mt-1 font-mono-num">
              Range {formatNumber(worstCaseDemand)}–{formatNumber(bestCaseDemand)} · PO{' '}
              {formatINR(summary.recommendedPurchaseCost)}
            </div>
          </div>
        </div>
      </section>

      {/* Primary Charts Row: Historical Sales, Seasonal Trends & Reasoning Under Uncertainty */}
      <section aria-labelledby="charts-heading" className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <h2 id="charts-heading" className="text-lg font-semibold text-[#292F2C]">
            Historical Sales, Seasonal Trends & Uncertainty Bounds
          </h2>
          <span className="text-xs text-[#525A54]">
            Best, Expected, and Worst-Case projections at 90% confidence
          </span>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch">
          <div className="xl:col-span-2">
            <DemandForecastChart timeline={forecast.timeline} />
          </div>
          <div>
            <StockMovementChart timeline={forecast.timeline} />
          </div>
        </div>
      </section>

      {/* Operational Split: Category Inventory Data + Purchasing Decisions & Activity */}
      <section aria-labelledby="operations-heading" className="space-y-3">
        <h2 id="operations-heading" className="text-lg font-semibold text-[#292F2C]">
          Inventory Optimization & Purchasing Decisions
        </h2>
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-7">
            <CategoryDistributionChart
              categories={forecast.categoryBreakdown}
              onSelectCategory={(cat) => {
                onSelectCategoryForInventory(cat);
                onNavigate('inventory');
              }}
            />
          </div>

          <div className="xl:col-span-5 space-y-6">
            {/* Purchasing Decisions Queue Preview */}
            <div className="bg-[#FFFEFA] border border-[#E4DFD4] rounded-xl p-5">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-base font-semibold text-[#292F2C]">
                    Recommended Purchasing Decisions
                  </h3>
                  <p className="text-xs text-[#525A54] mt-0.5">
                    Ranked by lead-time stockout risk under demand uncertainty
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('priority')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#145A43] hover:text-[#104735]"
                >
                  View all ({urgentCount})
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>

              {topPriority.length === 0 ? (
                <p className="text-sm text-[#525A54] py-6 text-center">
                  All products are currently above reorder thresholds.
                </p>
              ) : (
                <div className="divide-y divide-[#E4DFD4]">
                  {topPriority.map((item) => {
                    const fullProd = productMap.get(item.productId);
                    return (
                      <div
                        key={item.productId}
                        className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {fullProd && (
                            <ProductThumbnail
                              src={fullProd.imageUrl}
                              alt={`${item.name} product photo`}
                              category={item.category}
                              className="w-10 h-10 rounded-lg"
                            />
                          )}
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-[#292F2C] truncate">
                              {item.name}
                            </div>
                            <div className="text-xs text-[#525A54] font-mono-num truncate">
                              {item.currentStock} {item.unit} left · Order +{item.recommendedOrderQty}{' '}
                              {item.unit} · {item.stockoutProbability}% risk
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <StatusBadge status={item.status} compact />
                          {fullProd && (
                            <button
                              type="button"
                              onClick={() => onOpenMovement(fullProd, 'restock')}
                              className="px-2.5 py-1.5 rounded-lg bg-[#145A43] hover:bg-[#104735] text-xs font-semibold text-white transition-colors"
                            >
                              Restock
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Activity Feed */}
            <div className="bg-[#FFFEFA] border border-[#E4DFD4] rounded-xl p-5">
              <h3 className="text-base font-semibold text-[#292F2C]">Recent Activity</h3>
              <p className="text-xs text-[#525A54] mt-0.5 mb-4">
                Latest stock movements and catalog updates
              </p>

              {activities.length === 0 ? (
                <p className="text-sm text-[#525A54] py-4 text-center">
                  No recent stock activity recorded yet.
                </p>
              ) : (
                <div className="divide-y divide-[#E4DFD4]">
                  {activities.slice(0, 5).map((act) => {
                    const isPositive = act.quantityDelta > 0;
                    return (
                      <div key={act.id} className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                              act.type === 'restock' || act.type === 'created'
                                ? 'bg-[#38865B]/12 text-[#1B5736]'
                                : act.type === 'sale'
                                  ? 'bg-[#E6A23C]/16 text-[#7A4E08]'
                                  : 'bg-[#EEEAE0] text-[#525A54]'
                            }`}
                          >
                            {isPositive ? (
                              <ArrowDownLeft className="w-3.5 h-3.5" aria-hidden="true" />
                            ) : (
                              <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-[#292F2C] truncate">
                              {act.productName}
                            </div>
                            <div className="text-xs text-[#525A54] truncate">{act.note}</div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div
                            className={`font-mono-num text-xs font-semibold ${
                              isPositive ? 'text-[#1B5736]' : 'text-[#7A4E08]'
                            }`}
                          >
                            {isPositive ? '+' : ''}
                            {act.quantityDelta} {act.unit}
                          </div>
                          <div className="text-[11px] text-[#58605A]">
                            {formatRelativeTime(act.timestamp)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Dedicated About / How It Works Section on the Main Dashboard */}
      <section
        aria-labelledby="about-heading"
        className="bg-[#FFFEFA] border border-[#E4DFD4] rounded-xl p-5 sm:p-6 space-y-5"
      >
        <div className="flex items-start gap-3 border-b border-[#E4DFD4] pb-4">
          <div className="w-10 h-10 rounded-lg bg-[#145A43] text-[#E6A23C] flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id="about-heading" className="text-lg font-semibold text-[#292F2C]">
              About SmartStock & How It Works
            </h2>
            <p className="text-sm text-[#525A54] mt-1 leading-relaxed">
              {EXACT_PROBLEM_STATEMENT}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {PROBLEM_REQUIREMENTS_MAP.map((item) => (
            <div
              key={item.requirement}
              className="p-4 rounded-lg bg-[#F5F1E8] border border-[#E4DFD4] flex flex-col justify-between gap-2"
            >
              <div>
                <div className="text-xs font-semibold text-[#145A43]">
                  {item.capability} · {item.screen}
                </div>
                <h3 className="text-sm font-semibold text-[#292F2C] mt-1">
                  {item.requirement}
                </h3>
                <p className="text-xs text-[#525A54] mt-1.5 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
