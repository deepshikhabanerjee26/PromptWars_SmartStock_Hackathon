import { useMemo, useState } from 'react';
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
import { simulateScenarioImpact } from '../../lib/forecasting';
import { formatINR, formatNumber } from '../../lib/formatters';
import { escapeDisplayText } from '../../lib/validation';
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
  onAnnounce?: (message: string) => void;
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
  onAnnounce,
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

  // Live deterministic scenario impact (Best, Expected, Worst-case demand & budget)
  const deterministicScenario = useMemo(
    () =>
      simulateScenarioImpact(forecast.productForecasts, {
        scenarioName,
        demandMultiplierPct: demandPct,
        leadTimeShockDays: leadDelay,
        priceInflationPct: inflationPct,
      }),
    [forecast.productForecasts, scenarioName, demandPct, leadDelay, inflationPct]
  );

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
      onAnnounce?.(`AI scenario analysis completed for ${result.scenarioTitle}.`);
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
      <section aria-labelledby="forecast-heading" className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 id="forecast-heading" className="text-2xl font-bold text-[#292F2C] tracking-tight">
            Demand Forecasting, Scenario Analysis & Uncertainty
          </h1>
          <p className="text-sm text-[#525A54] mt-1">
            Seasonal trend projections with Best, Expected, and Worst-Case bounds plus AI reasoning under uncertainty.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div>
            <label htmlFor="forecast-category-select" className="sr-only">
              Filter forecast by category
            </label>
            <select
              id="forecast-category-select"
              value={selectedCategory}
              onChange={(e) => onChangeCategory(e.target.value)}
              className="h-10 px-3 rounded-lg border border-[#E4DFD4] bg-[#FFFEFA] text-sm text-[#292F2C]"
            >
              <option value="All">All Categories</option>
              {INVENTORY_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div
            className="inline-flex items-center p-1 rounded-lg bg-[#EEEAE0] border border-[#E4DFD4]"
            role="group"
            aria-label="Forecast horizon"
          >
            {([30, 60, 90] as ForecastHorizon[]).map((h) => (
              <button
                key={h}
                type="button"
                aria-pressed={horizon === h}
                onClick={() => onChangeHorizon(h)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  horizon === h
                    ? 'bg-[#145A43] text-white shadow-xs'
                    : 'text-[#525A54] hover:text-[#292F2C]'
                }`}
              >
                {h} Days
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Forecast Summary Cards */}
      <section aria-labelledby="forecast-summary-heading">
        <h2 id="forecast-summary-heading" className="sr-only">
          Forecast Summary Metrics
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-[#FFFEFA] border border-[#E4DFD4] rounded-xl p-5">
            <div className="flex items-center justify-between text-xs font-medium text-[#525A54]">
              <span>{horizon}-Day Expected Demand</span>
              <TrendingUp className="w-4 h-4 text-[#145A43]" aria-hidden="true" />
            </div>
            <div className="font-mono-num text-2xl font-bold text-[#292F2C] mt-2">
              {loadingForecast ? '...' : `${formatNumber(summary.predictedDemandUnits)} units`}
            </div>
            <div className="text-xs text-[#525A54] mt-1">
              Scope: {selectedCategory === 'All' ? 'Entire Store' : selectedCategory}
            </div>
          </div>

          <div className="bg-[#FFFEFA] border border-[#E4DFD4] rounded-xl p-5">
            <div className="flex items-center justify-between text-xs font-medium text-[#525A54]">
              <span>Recommended Purchasing Decisions</span>
              <Activity className="w-4 h-4 text-[#7A4E08]" aria-hidden="true" />
            </div>
            <div className="font-mono-num text-2xl font-bold text-[#292F2C] mt-2">
              {formatINR(summary.recommendedPurchaseCost)}
            </div>
            <div className="text-xs text-[#525A54] mt-1 font-mono-num">
              {formatNumber(summary.recommendedPurchaseUnits)} total units EOQ
            </div>
          </div>

          <div className="bg-[#FFFEFA] border border-[#E4DFD4] rounded-xl p-5">
            <div className="flex items-center justify-between text-xs font-medium text-[#525A54]">
              <span>Safety Stock Buffer</span>
              <ShieldAlert className="w-4 h-4 text-[#2E4E68]" aria-hidden="true" />
            </div>
            <div className="font-mono-num text-2xl font-bold text-[#292F2C] mt-2">
              {formatNumber(summary.safetyStockUnits)} units
            </div>
            <div className="text-xs text-[#525A54] mt-1">
              95% service-level buffer
            </div>
          </div>

          <div className="bg-[#FFFEFA] border border-[#E4DFD4] rounded-xl p-5">
            <div className="flex items-center justify-between text-xs font-medium text-[#525A54]">
              <span>Avg. Stockout Risk</span>
              <Sparkles className="w-4 h-4 text-[#8C2D2D]" aria-hidden="true" />
            </div>
            <div className="font-mono-num text-2xl font-bold text-[#292F2C] mt-2">
              {summary.avgStockoutRisk}%
            </div>
            <div className="text-xs text-[#525A54] mt-1 font-mono-num">
              {summary.criticalCount} critical · {summary.lowCount} low stock
            </div>
          </div>
        </div>
      </section>

      {/* Main Forecast Chart */}
      <section aria-label="Demand projection chart">
        <DemandForecastChart
          timeline={forecast.timeline}
          height={300}
          title={`${horizon}-Day Seasonal Demand Projection (${selectedCategory})`}
          subtitle="Solid Forest Emerald shows historical sales; dashed amber indicates expected demand with 90% Worst–Best uncertainty band"
        />
      </section>

      {/* AI Scenario Analysis & Reasoning Under Uncertainty */}
      <section
        aria-labelledby="scenario-heading"
        className="bg-[#FFFEFA] border border-[#E4DFD4] rounded-xl p-5 sm:p-6 space-y-5"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E4DFD4] pb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#145A43] text-[#E6A23C] flex items-center justify-center shrink-0">
              <BrainCircuit className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="scenario-heading" className="text-lg font-semibold text-[#292F2C]">
                Scenario Analysis & Reasoning Under Uncertainty
              </h2>
              <p className="text-xs text-[#525A54] mt-0.5">
                Simulate demand shocks, supplier lead-time delays, and wholesale inflation with real-time Best/Expected/Worst bounds and Gemini AI guidance.
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
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                Analyzing Uncertainty...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-[#E6A23C]" aria-hidden="true" />
                Run AI Scenario Analysis
              </>
            )}
          </button>
        </div>

        {/* Instant Deterministic Scenario Outcome Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 p-4 rounded-xl bg-[#F5F1E8] border border-[#E4DFD4] text-xs">
          <div>
            <div className="text-[#525A54] font-medium">Worst-Case Demand</div>
            <div className="font-mono-num text-base font-bold text-[#292F2C] mt-0.5">
              {formatNumber(deterministicScenario.worstCaseDemandUnits)} units
            </div>
          </div>
          <div>
            <div className="text-[#525A54] font-medium">Expected Scenario</div>
            <div className="font-mono-num text-base font-bold text-[#145A43] mt-0.5">
              {formatNumber(deterministicScenario.expectedDemandUnits)} units
            </div>
          </div>
          <div>
            <div className="text-[#525A54] font-medium">Best-Case Demand</div>
            <div className="font-mono-num text-base font-bold text-[#7A4E08] mt-0.5">
              {formatNumber(deterministicScenario.bestCaseDemandUnits)} units
            </div>
          </div>
          <div>
            <div className="text-[#525A54] font-medium">Adjusted Safety Buffer</div>
            <div className="font-mono-num text-base font-bold text-[#292F2C] mt-0.5">
              {formatNumber(deterministicScenario.adjustedSafetyBufferUnits)} units
            </div>
          </div>
          <div>
            <div className="text-[#525A54] font-medium">
              At-Risk SKUs ({deterministicScenario.atRiskSkuCount})
            </div>
            <div className="font-mono-num text-base font-bold text-[#8C2D2D] mt-0.5">
              {formatINR(deterministicScenario.estimatedOrderBudgetInr)} PO
            </div>
          </div>
        </div>

        {/* Scenario Presets & Parameter Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#525A54]">
              Scenario Presets
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
              {SCENARIO_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={presetId === preset.id}
                  onClick={() => applyPreset(preset.id)}
                  className={`text-left px-3.5 py-2.5 rounded-lg border text-sm transition-colors ${
                    presetId === preset.id
                      ? 'bg-[#145A43]/8 border-[#145A43] text-[#104735] font-semibold'
                      : 'bg-[#F5F1E8]/60 border-[#E4DFD4] text-[#292F2C] hover:bg-[#EEEAE0]'
                  }`}
                >
                  <div>{preset.label}</div>
                  <div className="text-[11px] font-mono-num text-[#525A54] mt-0.5">
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
                <label
                  htmlFor="slider-demand-shock"
                  className="flex justify-between text-xs font-medium text-[#292F2C] mb-2"
                >
                  <span>Demand Shock</span>
                  <span className="font-mono-num font-bold text-[#145A43]">
                    {demandPct >= 0 ? '+' : ''}
                    {demandPct}%
                  </span>
                </label>
                <input
                  id="slider-demand-shock"
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
                <label
                  htmlFor="slider-lead-delay"
                  className="flex justify-between text-xs font-medium text-[#292F2C] mb-2"
                >
                  <span>Lead-Time Delay</span>
                  <span className="font-mono-num font-bold text-[#7A4E08]">
                    +{leadDelay} days
                  </span>
                </label>
                <input
                  id="slider-lead-delay"
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
                <label
                  htmlFor="slider-price-inflation"
                  className="flex justify-between text-xs font-medium text-[#292F2C] mb-2"
                >
                  <span>Supplier Inflation</span>
                  <span className="font-mono-num font-bold text-[#8C2D2D]">
                    {inflationPct >= 0 ? '+' : ''}
                    {inflationPct}%
                  </span>
                </label>
                <input
                  id="slider-price-inflation"
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
                <label htmlFor="scenario-title-input" className="block text-xs font-medium text-[#292F2C] mb-1">
                  Scenario Title
                </label>
                <input
                  id="scenario-title-input"
                  type="text"
                  maxLength={80}
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[#E4DFD4] bg-[#FFFEFA] text-sm text-[#292F2C]"
                />
              </div>
              <div>
                <label htmlFor="scenario-notes-input" className="block text-xs font-medium text-[#292F2C] mb-1">
                  Operational Notes / Assumptions
                </label>
                <input
                  id="scenario-notes-input"
                  type="text"
                  maxLength={300}
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Optional local market context..."
                  className="w-full h-10 px-3 rounded-lg border border-[#E4DFD4] bg-[#FFFEFA] text-sm text-[#292F2C]"
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

        {/* AI Structured Result (Escaped text rendering, zero dangerouslySetInnerHTML) */}
        {aiResult && (
          <div className="border-t border-[#E4DFD4] pt-5 space-y-5 animate-fade-slide">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 p-4 rounded-xl bg-[#F5F1E8] border border-[#E4DFD4] space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#145A43]">
                  Executive Assessment · {escapeDisplayText(aiResult.scenarioTitle)}
                </h3>
                <p className="text-sm text-[#292F2C] leading-relaxed">
                  {escapeDisplayText(aiResult.executiveSummary)}
                </p>
                <div className="pt-2 border-t border-[#E4DFD4]">
                  <div className="text-xs font-semibold text-[#292F2C] mb-1">
                    Reasoning Under Uncertainty
                  </div>
                  <p className="text-xs text-[#525A54] leading-relaxed">
                    {escapeDisplayText(aiResult.uncertaintyReasoning)}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#FAF7F0] border border-[#E4DFD4] flex flex-col justify-between gap-3">
                <div>
                  <div className="text-xs font-medium text-[#525A54]">
                    Estimated Cash Required
                  </div>
                  <div className="font-mono-num text-2xl font-bold text-[#145A43] mt-1">
                    {formatINR(aiResult.cashRequiredInr)}
                  </div>
                  <div className="text-xs text-[#525A54] mt-2 leading-relaxed">
                    {escapeDisplayText(aiResult.projectedRevenueImpact)}
                  </div>
                </div>
                {aiResult.riskMitigationSteps.length > 0 && (
                  <div className="pt-2 border-t border-[#E4DFD4]">
                    <div className="text-xs font-semibold text-[#292F2C] mb-1.5">
                      Risk Mitigation Checklist
                    </div>
                    <ul className="space-y-1 text-xs text-[#525A54] list-disc pl-4">
                      {aiResult.riskMitigationSteps.map((step, i) => (
                        <li key={i}>{escapeDisplayText(step)}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {aiResult.recommendedPurchases.length > 0 && (
              <div className="overflow-x-auto border border-[#E4DFD4] rounded-xl">
                <table className="w-full text-left border-collapse min-w-[720px]">
                  <caption className="sr-only">AI scenario recommended purchases</caption>
                  <thead>
                    <tr className="bg-[#FAF7F0] border-b border-[#E4DFD4] text-[11px] font-semibold uppercase tracking-wider text-[#525A54]">
                      <th scope="col" className="py-2.5 pl-4 pr-3">Product</th>
                      <th scope="col" className="py-2.5 px-3">Urgency</th>
                      <th scope="col" className="py-2.5 px-3 text-right">Scenario PO Qty</th>
                      <th scope="col" className="py-2.5 px-3 text-right">Est. Cost</th>
                      <th scope="col" className="py-2.5 px-3">AI Rationale</th>
                      <th scope="col" className="py-2.5 pl-3 pr-4 text-right">Execute</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4DFD4] text-sm">
                    {aiResult.recommendedPurchases.map((rec, idx) => {
                      const matched = productBySku.get(rec.sku);
                      return (
                        <tr key={`${rec.sku}-${idx}`} className="hover:bg-[#F5F1E8]/60">
                          <th scope="row" className="py-2.5 pl-4 pr-3 font-normal text-left">
                            <div className="font-semibold text-[#292F2C]">
                              {escapeDisplayText(rec.productName)}
                            </div>
                            <div className="font-mono-num text-xs text-[#525A54]">
                              {escapeDisplayText(rec.sku)}
                            </div>
                          </th>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs font-semibold border ${
                                rec.urgency === 'immediate'
                                  ? 'bg-[#C65353]/12 text-[#8C2D2D] border-[#C65353]/30'
                                  : rec.urgency === 'this_week'
                                    ? 'bg-[#E6A23C]/16 text-[#7A4E08] border-[#E6A23C]/40'
                                    : 'bg-[#527A9B]/12 text-[#2A4A63] border-[#527A9B]/30'
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
                            {formatNumber(rec.recommendedQty)} {escapeDisplayText(rec.unit)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono-num text-[#292F2C]">
                            {formatINR(rec.estimatedCostInr)}
                          </td>
                          <td className="py-2.5 px-3 text-xs text-[#525A54] max-w-xs">
                            {escapeDisplayText(rec.rationale)}
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
                              <span className="text-xs text-[#58605A]">—</span>
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
      <section aria-label="Product-wise forecast breakdown" className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-5">
          <CategoryDistributionChart
            categories={forecast.categoryBreakdown}
            onSelectCategory={(cat) => onChangeCategory(cat)}
          />
        </div>

        <div className="xl:col-span-7 bg-[#FFFEFA] border border-[#E4DFD4] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E4DFD4]">
            <h2 className="text-base font-semibold text-[#292F2C]">
              Product-Wise Forecast & EOQ Plan
            </h2>
            <p className="text-xs text-[#525A54] mt-0.5">
              Expected demand with [Worst–Best] 90% confidence bounds for the next {horizon} days
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[680px]">
              <caption className="sr-only">Product-wise demand forecast and reorder quantities</caption>
              <thead>
                <tr className="bg-[#FAF7F0] border-b border-[#E4DFD4] text-[11px] font-semibold uppercase tracking-wider text-[#525A54]">
                  <th scope="col" className="py-2.5 pl-5 pr-3">Product</th>
                  <th scope="col" className="py-2.5 px-3 text-right">On Hand</th>
                  <th scope="col" className="py-2.5 px-3 text-right">Expected [Worst–Best]</th>
                  <th scope="col" className="py-2.5 px-3 text-right">Safety / ROP</th>
                  <th scope="col" className="py-2.5 px-3 text-right">Risk</th>
                  <th scope="col" className="py-2.5 px-3">Status</th>
                  <th scope="col" className="py-2.5 pl-3 pr-5 text-right">Suggested PO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4DFD4] text-sm">
                {forecast.productForecasts.slice(0, 15).map((item) => {
                  const fullProd = productById.get(item.productId);
                  return (
                    <tr key={item.productId} className="hover:bg-[#F5F1E8]/60">
                      <th scope="row" className="py-2.5 pl-5 pr-3 font-normal text-left">
                        <div className="font-semibold text-[#292F2C] truncate max-w-[180px]">
                          {item.name}
                        </div>
                        <div className="text-xs text-[#525A54] font-mono-num">
                          {item.sku} · {item.avgDailyDemand}/day
                        </div>
                      </th>
                      <td className="py-2.5 px-3 text-right font-mono-num font-semibold text-[#292F2C]">
                        {item.currentStock} {item.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-num">
                        <div className="font-semibold text-[#292F2C]">
                          {item.predictedDemand} {item.unit}
                        </div>
                        <div className="text-[11px] text-[#58605A]">
                          [{item.lowerBound}–{item.upperBound}]
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-num text-xs text-[#525A54]">
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
                          <span className="text-xs text-[#58605A]">Optimal</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
