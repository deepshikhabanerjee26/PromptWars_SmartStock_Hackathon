import { useState } from 'react';
import {
  Activity,
  BrainCircuit,
  Loader2,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import {
  INVENTORY_CATEGORIES,
  type AIAnalysisResult,
  type ForecastHorizon,
  type ForecastResponse,
  type ScenarioInput,
} from '../../../shared/types';
import { runAIScenarioAnalysis, type EnrichedProduct } from '../../lib/api';
import { formatINR, formatNumber } from '../../lib/formatters';
import { CategoryDistributionChart } from '../charts/CategoryDistributionChart';
import { DemandForecastChart } from '../charts/DemandForecastChart';
import { ErrorState } from '../ui/StateViews';
import { StatusBadge } from '../ui/StatusBadge';

interface ForecastingPageProps {
  forecast: ForecastResponse;
  products: EnrichedProduct[];
  horizon: ForecastHorizon;
  selectedCategory: string;
  loadingForecast: boolean;
  onChangeHorizon: (h: ForecastHorizon) => void;
  onChangeCategory: (c: string) => void;
  onOpenMovement: (product: EnrichedProduct, mode: 'restock' | 'sale') => void;
}

const SCENARIO_PRESETS: Array<{
  id: string;
  label: string;
  demandPct: number;
  leadDelay: number;
  inflationPct: number;
  notes: string;
}> = [
  {
    id: 'festive',
    label: 'Diwali & Festive Demand Surge',
    demandPct: 40,
    leadDelay: 3,
    inflationPct: 6,
    notes: 'Festival gifting & household cooking surge across ghee, basmati rice, sweets, and dry groceries.',
  },
  {
    id: 'monsoon',
    label: 'Monsoon Supply Delay',
    demandPct: 15,
    leadDelay: 6,
    inflationPct: 12,
    notes: 'Highway transport delays affecting fresh produce, dairy cold chain, and mandi arrivals.',
  },
  {
    id: 'inflation',
    label: 'Wholesale Price Inflation',
    demandPct: -10,
    leadDelay: 2,
    inflationPct: 18,
    notes: 'Rising wholesale prices on edible oils, pulses, and spices requiring selective forward buying.',
  },
  {
    id: 'summer',
    label: 'Peak Summer Hydration & Dairy',
    demandPct: 35,
    leadDelay: 2,
    inflationPct: 4,
    notes: 'Heatwave spike in curd, buttermilk, coconut water, juices, and summer fruits.',
  },
];

export function ForecastingPage({
  forecast,
  products,
  horizon,
  selectedCategory,
  loadingForecast,
  onChangeHorizon,
  onChangeCategory,
  onOpenMovement,
}: ForecastingPageProps) {
  const [presetId, setPresetId] = useState('festive');
  const [scenarioName, setScenarioName] = useState(SCENARIO_PRESETS[0].label);
  const [demandPct, setDemandPct] = useState(SCENARIO_PRESETS[0].demandPct);
  const [leadDelay, setLeadDelay] = useState(SCENARIO_PRESETS[0].leadDelay);
  const [inflationPct, setInflationPct] = useState(SCENARIO_PRESETS[0].inflationPct);
  const [customNotes, setCustomNotes] = useState(SCENARIO_PRESETS[0].notes);

  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const productBySku = new Map(products.map((p) => [p.sku, p]));
  const productById = new Map(products.map((p) => [p.id, p]));

  const applyPreset = (id: string) => {
    const found = SCENARIO_PRESETS.find((p) => p.id === id);
    if (!found) return;
    setPresetId(found.id);
    setScenarioName(found.label);
    setDemandPct(found.demandPct);
    setLeadDelay(found.leadDelay);
    setInflationPct(found.inflationPct);
    setCustomNotes(found.notes);
  };

  const handleRunAI = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const payload: ScenarioInput = {
        presetId,
        scenarioName,
        demandMultiplierPct: demandPct,
        leadTimeShockDays: leadDelay,
        priceInflationPct: inflationPct,
        focusCategory: selectedCategory,
        customNotes,
      };
      const result = await runAIScenarioAnalysis(payload);
      setAiResult(result);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Unable to run AI scenario analysis.');
    } finally {
      setAiLoading(false);
    }
  };

  const { summary } = forecast;

  return (
    <div className="space-y-6 animate-fade-slide">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#292F2C] tracking-tight">
            Demand Forecasting & Scenario Analysis
          </h1>
          <p className="text-sm text-[#6B746E] mt-1">
            Time-series seasonal demand projections, safety stock buffers, and AI-powered reasoning under uncertainty.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <select
            value={selectedCategory}
            onChange={(e) => onChangeCategory(e.target.value)}
            aria-label="Forecast category scope"
            className="h-10 px-3 rounded-lg border border-[#E4DFD4] bg-[#FFFEFA] text-sm text-[#292F2C] focus:outline-none focus:ring-2 focus:ring-[#145A43]/25 focus:border-[#145A43]"
          >
            <option value="All">All Categories</option>
            {INVENTORY_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <div
            className="inline-flex items-center p-1 rounded-lg bg-[#EEEAE0] border border-[#E4DFD4]"
            role="group"
            aria-label="Forecast horizon"
          >
            {([30, 60, 90] as ForecastHorizon[]).map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => onChangeHorizon(h)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  horizon === h
                    ? 'bg-[#145A43] text-white shadow-xs'
                    : 'text-[#6B746E] hover:text-[#292F2C]'
                }`}
              >
                {h} Days
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Forecast Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-[#FFFEFA] border border-[#E4DFD4] rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-[#6B746E]">
            <span>{horizon}-Day Predicted Demand</span>
            <TrendingUp className="w-4 h-4 text-[#145A43]" />
          </div>
          <div className="font-mono-num text-2xl font-bold text-[#292F2C] mt-2">
            {loadingForecast ? '...' : `${formatNumber(summary.predictedDemandUnits)} units`}
          </div>
          <div className="text-xs text-[#6B746E] mt-1">
            Scope: {selectedCategory === 'All' ? 'Entire Store' : selectedCategory}
          </div>
        </div>

        <div className="bg-[#FFFEFA] border border-[#E4DFD4] rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-[#6B746E]">
            <span>Recommended Purchase Order</span>
            <Activity className="w-4 h-4 text-[#E6A23C]" />
          </div>
          <div className="font-mono-num text-2xl font-bold text-[#292F2C] mt-2">
            {formatINR(summary.recommendedPurchaseCost)}
          </div>
          <div className="text-xs text-[#6B746E] mt-1 font-mono-num">
            {formatNumber(summary.recommendedPurchaseUnits)} total units EOQ
          </div>
        </div>

        <div className="bg-[#FFFEFA] border border-[#E4DFD4] rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-[#6B746E]">
            <span>Required Safety Stock</span>
            <ShieldAlert className="w-4 h-4 text-[#527A9B]" />
          </div>
          <div className="font-mono-num text-2xl font-bold text-[#292F2C] mt-2">
            {formatNumber(summary.safetyStockUnits)} units
          </div>
          <div className="text-xs text-[#6B746E] mt-1">
            95% service-level buffer
          </div>
        </div>

        <div className="bg-[#FFFEFA] border border-[#E4DFD4] rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-[#6B746E]">
            <span>Avg. Stockout Risk</span>
            <Sparkles className="w-4 h-4 text-[#C65353]" />
          </div>
          <div className="font-mono-num text-2xl font-bold text-[#292F2C] mt-2">
            {summary.avgStockoutRisk}%
          </div>
          <div className="text-xs text-[#6B746E] mt-1 font-mono-num">
            {summary.criticalCount} critical · {summary.lowCount} low stock
          </div>
        </div>
      </div>

      {/* Main Forecast Chart */}
      <DemandForecastChart
        timeline={forecast.timeline}
        height={300}
        title={`${horizon}-Day Seasonal Demand Projection (${selectedCategory})`}
        subtitle="Solid Forest Emerald reflects 12 months of historical demand; dashed Saffron Gold shows predicted volume with 90% confidence bounds"
      />

      {/* AI Scenario Analysis & Reasoning Under Uncertainty */}
      <section className="bg-[#FFFEFA] border border-[#E4DFD4] rounded-xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E4DFD4] pb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#145A43] text-[#E6A23C] flex items-center justify-center shrink-0">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#292F2C]">
                AI Scenario Simulator & Uncertainty Advisor
              </h2>
              <p className="text-xs text-[#6B746E] mt-0.5">
                Simulate demand shocks, supplier delays, and price inflation to evaluate purchasing decisions under uncertainty.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={aiLoading}
            onClick={handleRunAI}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#145A43] hover:bg-[#104735] disabled:opacity-60 text-sm font-semibold text-white transition-colors whitespace-nowrap shrink-0"
          >
            {aiLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing Uncertainty...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-[#E6A23C]" />
                Run AI Scenario Analysis
              </>
            )}
          </button>
        </div>

        {/* Scenario Presets & Parameter Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#6B746E]">
              Scenario Presets
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
              {SCENARIO_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  className={`text-left px-3.5 py-2.5 rounded-lg border text-sm transition-colors ${
                    presetId === preset.id
                      ? 'bg-[#145A43]/8 border-[#145A43] text-[#104735] font-semibold'
                      : 'bg-[#F5F1E8]/60 border-[#E4DFD4] text-[#292F2C] hover:bg-[#EEEAE0]'
                  }`}
                >
                  <div>{preset.label}</div>
                  <div className="text-[11px] font-mono-num text-[#6B746E] mt-0.5">
                    Demand {preset.demandPct >= 0 ? '+' : ''}
                    {preset.demandPct}% · Lead +{preset.leadDelay}d · Cost +{preset.inflationPct}%
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-lg bg-[#F5F1E8]/70 border border-[#E4DFD4]">
                <div className="flex justify-between text-xs font-medium text-[#292F2C] mb-2">
                  <span>Demand Shock</span>
                  <span className="font-mono-num font-bold text-[#145A43]">
                    {demandPct >= 0 ? '+' : ''}
                    {demandPct}%
                  </span>
                </div>
                <input
                  type="range"
                  min="-40"
                  max="100"
                  step="5"
                  value={demandPct}
                  onChange={(e) => {
                    setPresetId('custom');
                    setDemandPct(Number(e.target.value));
                  }}
                  className="w-full accent-[#145A43]"
                />
              </div>

              <div className="p-3.5 rounded-lg bg-[#F5F1E8]/70 border border-[#E4DFD4]">
                <div className="flex justify-between text-xs font-medium text-[#292F2C] mb-2">
                  <span>Lead-Time Delay</span>
                  <span className="font-mono-num font-bold text-[#D99A32]">
                    +{leadDelay} days
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="14"
                  step="1"
                  value={leadDelay}
                  onChange={(e) => {
                    setPresetId('custom');
                    setLeadDelay(Number(e.target.value));
                  }}
                  className="w-full accent-[#D99A32]"
                />
              </div>

              <div className="p-3.5 rounded-lg bg-[#F5F1E8]/70 border border-[#E4DFD4]">
                <div className="flex justify-between text-xs font-medium text-[#292F2C] mb-2">
                  <span>Supplier Inflation</span>
                  <span className="font-mono-num font-bold text-[#C65353]">
                    {inflationPct >= 0 ? '+' : ''}
                    {inflationPct}%
                  </span>
                </div>
                <input
                  type="range"
                  min="-10"
                  max="40"
                  step="2"
                  value={inflationPct}
                  onChange={(e) => {
                    setPresetId('custom');
                    setInflationPct(Number(e.target.value));
                  }}
                  className="w-full accent-[#C65353]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#292F2C] mb-1">
                  Scenario Title
                </label>
                <input
                  type="text"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[#E4DFD4] bg-[#FFFEFA] text-sm text-[#292F2C] focus:outline-none focus:ring-2 focus:ring-[#145A43]/25 focus:border-[#145A43]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#292F2C] mb-1">
                  Operational Notes / Assumptions
                </label>
                <input
                  type="text"
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Optional local market context..."
                  className="w-full h-10 px-3 rounded-lg border border-[#E4DFD4] bg-[#FFFEFA] text-sm text-[#292F2C] focus:outline-none focus:ring-2 focus:ring-[#145A43]/25 focus:border-[#145A43]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* AI Error Banner */}
        {aiError && (
          <ErrorState
            title="AI Scenario Advisor Unavailable"
            message={aiError}
            onRetry={handleRunAI}
          />
        )}

        {/* AI Structured Result */}
        {aiResult && (
          <div className="border-t border-[#E4DFD4] pt-5 space-y-5 animate-fade-slide">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 p-4 rounded-xl bg-[#F5F1E8] border border-[#E4DFD4] space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#145A43]">
                  Executive Assessment · {aiResult.scenarioTitle}
                </div>
                <p className="text-sm text-[#292F2C] leading-relaxed">
                  {aiResult.executiveSummary}
                </p>
                <div className="pt-2 border-t border-[#E4DFD4]">
                  <div className="text-xs font-semibold text-[#292F2C] mb-1">
                    Reasoning Under Uncertainty
                  </div>
                  <p className="text-xs text-[#6B746E] leading-relaxed">
                    {aiResult.uncertaintyReasoning}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#FAF7F0] border border-[#E4DFD4] flex flex-col justify-between gap-3">
                <div>
                  <div className="text-xs font-medium text-[#6B746E]">
                    Estimated Cash Required
                  </div>
                  <div className="font-mono-num text-2xl font-bold text-[#145A43] mt-1">
                    {formatINR(aiResult.cashRequiredInr)}
                  </div>
                  <div className="text-xs text-[#6B746E] mt-2 leading-relaxed">
                    {aiResult.projectedRevenueImpact}
                  </div>
                </div>
                {aiResult.riskMitigationSteps.length > 0 && (
                  <div className="pt-2 border-t border-[#E4DFD4]">
                    <div className="text-xs font-semibold text-[#292F2C] mb-1.5">
                      Risk Mitigation Checklist
                    </div>
                    <ul className="space-y-1 text-xs text-[#6B746E] list-disc pl-4">
                      {aiResult.riskMitigationSteps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {aiResult.recommendedPurchases.length > 0 && (
              <div className="overflow-x-auto border border-[#E4DFD4] rounded-xl">
                <table className="w-full text-left border-collapse min-w-[720px]">
                  <thead>
                    <tr className="bg-[#FAF7F0] border-b border-[#E4DFD4] text-[11px] font-semibold uppercase tracking-wider text-[#6B746E]">
                      <th className="py-2.5 pl-4 pr-3">Product</th>
                      <th className="py-2.5 px-3">Urgency</th>
                      <th className="py-2.5 px-3 text-right">Scenario PO Qty</th>
                      <th className="py-2.5 px-3 text-right">Est. Cost</th>
                      <th className="py-2.5 px-3">AI Rationale</th>
                      <th className="py-2.5 pl-3 pr-4 text-right">Execute</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4DFD4] text-sm">
                    {aiResult.recommendedPurchases.map((rec, idx) => {
                      const matched = productBySku.get(rec.sku);
                      return (
                        <tr key={`${rec.sku}-${idx}`} className="hover:bg-[#F5F1E8]/60">
                          <td className="py-2.5 pl-4 pr-3">
                            <div className="font-semibold text-[#292F2C]">
                              {rec.productName}
                            </div>
                            <div className="font-mono-num text-xs text-[#6B746E]">
                              {rec.sku}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs font-semibold border ${
                                rec.urgency === 'immediate'
                                  ? 'bg-[#C65353]/10 text-[#A33B3B] border-[#C65353]/25'
                                  : rec.urgency === 'this_week'
                                    ? 'bg-[#E6A23C]/14 text-[#8F5B0B] border-[#E6A23C]/35'
                                    : 'bg-[#527A9B]/10 text-[#395D7A] border-[#527A9B]/25'
                              }`}
                            >
                              {rec.urgency === 'immediate'
                                ? 'Immediate'
                                : rec.urgency === 'this_week'
                                  ? 'This Week'
                                  : 'Monitor'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono-num font-semibold text-[#292F2C]">
                            {formatNumber(rec.recommendedQty)} {rec.unit}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono-num text-[#292F2C]">
                            {formatINR(rec.estimatedCostInr)}
                          </td>
                          <td className="py-2.5 px-3 text-xs text-[#6B746E] max-w-xs">
                            {rec.rationale}
                          </td>
                          <td className="py-2.5 pl-3 pr-4 text-right">
                            {matched ? (
                              <button
                                type="button"
                                onClick={() => onOpenMovement(matched, 'restock')}
                                className="px-2.5 py-1.5 rounded-lg bg-[#145A43] hover:bg-[#104735] text-xs font-semibold text-white transition-colors"
                              >
                                Restock
                              </button>
                            ) : (
                              <span className="text-xs text-[#929A94]">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Category Analysis & Product-Wise Forecast Table */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-5">
          <CategoryDistributionChart
            categories={forecast.categoryBreakdown}
            onSelectCategory={(cat) => onChangeCategory(cat)}
          />
        </div>

        <div className="xl:col-span-7 bg-[#FFFEFA] border border-[#E4DFD4] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E4DFD4]">
            <h3 className="text-base font-semibold text-[#292F2C]">
              Product-Wise Forecast & EOQ Plan
            </h3>
            <p className="text-xs text-[#6B746E] mt-0.5">
              Sorted by stockout risk for the next {horizon} days
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[680px]">
              <thead>
                <tr className="bg-[#FAF7F0] border-b border-[#E4DFD4] text-[11px] font-semibold uppercase tracking-wider text-[#6B746E]">
                  <th className="py-2.5 pl-5 pr-3">Product</th>
                  <th className="py-2.5 px-3 text-right">On Hand</th>
                  <th className="py-2.5 px-3 text-right">{horizon}d Forecast</th>
                  <th className="py-2.5 px-3 text-right">Safety / ROP</th>
                  <th className="py-2.5 px-3 text-right">Risk</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 pl-3 pr-5 text-right">Suggested PO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4DFD4] text-sm">
                {forecast.productForecasts.slice(0, 15).map((item) => {
                  const fullProd = productById.get(item.productId);
                  return (
                    <tr key={item.productId} className="hover:bg-[#F5F1E8]/60">
                      <td className="py-2.5 pl-5 pr-3">
                        <div className="font-semibold text-[#292F2C] truncate max-w-[180px]">
                          {item.name}
                        </div>
                        <div className="text-xs text-[#6B746E] font-mono-num">
                          {item.sku} · {item.avgDailyDemand}/day
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-num font-semibold text-[#292F2C]">
                        {item.currentStock} {item.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-num">
                        <div className="font-semibold text-[#292F2C]">
                          {item.predictedDemand} {item.unit}
                        </div>
                        <div className="text-[11px] text-[#929A94]">
                          [{item.lowerBound}–{item.upperBound}]
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-num text-xs text-[#6B746E]">
                        {item.safetyStock} / {item.reorderPoint}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-num font-semibold text-[#292F2C]">
                        {item.stockoutProbability}%
                      </td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={item.status} compact />
                      </td>
                      <td className="py-2.5 pl-3 pr-5 text-right">
                        {item.recommendedOrderQty > 0 && fullProd ? (
                          <button
                            type="button"
                            onClick={() => onOpenMovement(fullProd, 'restock')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#145A43] hover:bg-[#104735] text-xs font-semibold text-white font-mono-num transition-colors"
                          >
                            +{item.recommendedOrderQty} {item.unit}
                          </button>
                        ) : (
                          <span className="text-xs text-[#929A94]">Optimal</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
