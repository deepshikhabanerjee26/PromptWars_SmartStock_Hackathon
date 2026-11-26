import type {
  CategoryForecastSummary,
  ForecastHorizon,
  ForecastResponse,
  ForecastTimelinePoint,
  InventoryCategory,
  Product,
  ProductForecast,
  ScenarioInput,
  StockStatus,
} from '../../shared/types.ts';
import { INVENTORY_CATEGORIES } from '../../shared/types.ts';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function getRecentMonthLabels(count = 12, now = new Date()): string[] {
  const safeCount = Math.max(1, Math.min(36, Math.floor(count)));
  const labels: string[] = [];
  for (let i = safeCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(`${MONTH_NAMES[d.getMonth()]} '${String(d.getFullYear()).slice(-2)}`);
  }
  return labels;
}

export function getFutureMonthLabels(count = 3, now = new Date()): string[] {
  const safeCount = Math.max(1, Math.min(12, Math.floor(count)));
  const labels: string[] = [];
  for (let i = 1; i <= safeCount; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    labels.push(`${MONTH_NAMES[d.getMonth()]} '${String(d.getFullYear()).slice(-2)}`);
  }
  return labels;
}

/**
 * Normalizes a raw sales array by dropping non-numeric values,
 * clamping negative entries to 0, and filling missing/empty series safely.
 */
export function sanitizeSalesSeries(rawSales: unknown): number[] {
  if (!Array.isArray(rawSales) || rawSales.length === 0) {
    return [0];
  }
  const cleaned = rawSales.map((entry) => {
    const num = typeof entry === 'number' ? entry : Number(entry);
    if (!Number.isFinite(num) || num < 0) return 0;
    return Math.min(1_000_000, Math.round(num));
  });
  return cleaned.length > 0 ? cleaned : [0];
}

// Standard Normal CDF approximation (Abramowitz & Stegun) for stockout risk under uncertainty.
function normalCdf(z: number): number {
  if (!Number.isFinite(z)) return 0.5;
  const clamped = Math.max(-8, Math.min(8, z));
  const t = 1 / (1 + 0.2316419 * Math.abs(clamped));
  const d = 0.3989423 * Math.exp((-clamped * clamped) / 2);
  const prob =
    d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return clamped > 0 ? 1 - prob : prob;
}

/**
 * Computes seasonal trend metrics (exponentially smoothed level, recent momentum %,
 * seasonal indices, mean, and standard deviation) handling missing seasons and zero sales.
 */
export function computeSeasonalTrend(rawSales: unknown): {
  sales: number[];
  smoothedLevel: number;
  meanMonthly: number;
  stdMonthly: number;
  trendPct: number;
  seasonalIndices: number[];
  peakMonthIndex: number;
} {
  const sales = sanitizeSalesSeries(rawSales);
  const n = sales.length;

  // Exponentially weighted moving average (alpha = 0.32)
  const alpha = 0.32;
  let smoothedLevel = sales[0];
  for (let i = 1; i < n; i++) {
    smoothedLevel = alpha * sales[i] + (1 - alpha) * smoothedLevel;
  }

  // Momentum compares most recent window against prior window (works even with < 6 months)
  const windowSize = Math.min(3, Math.max(1, Math.floor(n / 2)));
  const recentSlice = sales.slice(-windowSize);
  const prevSlice = n > windowSize ? sales.slice(-(windowSize * 2), -windowSize) : recentSlice;
  const recentAvg = recentSlice.reduce((a, b) => a + b, 0) / recentSlice.length;
  const prevAvg = prevSlice.length > 0 ? prevSlice.reduce((a, b) => a + b, 0) / prevSlice.length : 0;

  let trendPct = 0;
  if (prevAvg > 0) {
    trendPct = ((recentAvg - prevAvg) / prevAvg) * 100;
  } else if (recentAvg > 0) {
    trendPct = 100;
  }

  const meanMonthly = sales.reduce((a, b) => a + b, 0) / n;
  const varianceMonthly =
    n > 1
      ? sales.reduce((acc, val) => acc + Math.pow(val - meanMonthly, 2), 0) / (n - 1)
      : 0;
  const stdMonthly = Math.sqrt(Math.max(0, varianceMonthly));

  // If fewer than 12 months exist, missing seasons default smoothly to neutral 1.0 index
  const seasonalIndices = Array.from({ length: 12 }, (_, idx) => {
    if (idx < n && meanMonthly > 0) {
      return Number((sales[idx] / meanMonthly).toFixed(3));
    }
    return 1;
  });

  let peakMonthIndex = 0;
  for (let i = 1; i < n; i++) {
    if (sales[i] > sales[peakMonthIndex]) peakMonthIndex = i;
  }

  return {
    sales,
    smoothedLevel,
    meanMonthly,
    stdMonthly,
    trendPct: Number(Math.max(-99, Math.min(300, trendPct)).toFixed(1)),
    seasonalIndices,
    peakMonthIndex,
  };
}

export function classifyStockStatus(
  quantity: number,
  reorderPoint: number,
  safetyStock: number,
  maxStockLevel: number,
  daysOfSupply: number,
  leadTimeDays: number
): StockStatus {
  const safeQty = Number.isFinite(quantity) ? Math.max(0, quantity) : 0;
  const safeLead = Number.isFinite(leadTimeDays) ? Math.max(1, leadTimeDays) : 1;
  const safeMax = Number.isFinite(maxStockLevel) ? Math.max(10, maxStockLevel) : 100;
  const safeSafety = Number.isFinite(safetyStock) ? Math.max(0, safetyStock) : 0;
  const safeRop = Number.isFinite(reorderPoint) ? Math.max(0, reorderPoint) : 0;

  if (
    safeQty <= 0 ||
    safeQty <= Math.max(2, safeSafety * 0.65) ||
    daysOfSupply < Math.max(2, safeLead * 0.6)
  ) {
    return 'critical';
  }
  if (safeQty <= safeRop * 0.85 || daysOfSupply <= safeLead + 2) {
    return 'low';
  }
  if (safeQty <= safeRop) {
    return 'reorder';
  }
  if (safeQty > safeMax * 1.1 && daysOfSupply > 75) {
    return 'overstock';
  }
  return 'normal';
}

export function computeProductForecast(
  product: Product,
  horizonDays: ForecastHorizon,
  monthLabels: string[]
): ProductForecast {
  const safeHorizon: ForecastHorizon = horizonDays === 60 ? 60 : horizonDays === 90 ? 90 : 30;
  const currentStock = Number.isFinite(product.quantity) ? Math.max(0, Math.round(product.quantity)) : 0;
  const purchasePrice = Number.isFinite(product.purchasePrice) ? Math.max(1, product.purchasePrice) : 1;
  const sellingPrice = Number.isFinite(product.sellingPrice) ? Math.max(purchasePrice, product.sellingPrice) : purchasePrice;
  const leadTime = Number.isFinite(product.leadTimeDays) ? Math.min(60, Math.max(1, Math.round(product.leadTimeDays))) : 3;
  const configuredReorder = Number.isFinite(product.reorderLevel) ? Math.max(0, Math.round(product.reorderLevel)) : 0;
  const maxStockLevel = Number.isFinite(product.maxStockLevel)
    ? Math.max(configuredReorder + 10, Math.round(product.maxStockLevel))
    : Math.max(50, configuredReorder * 3);

  const { sales, smoothedLevel, stdMonthly, trendPct, seasonalIndices, peakMonthIndex } =
    computeSeasonalTrend(product.monthlySales);

  const totalHistoricalSales = sales.reduce((a, b) => a + b, 0);
  const horizonMonths = safeHorizon / 30;
  const dampenedMonthlyFactor = 1 + Math.max(-0.18, Math.min(0.22, (trendPct / 100) * 0.35));

  // If product has zero historical sales, forecast stays 0 expected demand with conservative minimal buffer
  let predictedDemand = 0;
  if (totalHistoricalSales > 0) {
    let seasonalSum = 0;
    for (let m = 0; m < horizonMonths; m++) {
      const seasonalIdx = seasonalIndices[m % 12] ?? 1;
      const blendedMonth = smoothedLevel * dampenedMonthlyFactor * (0.6 + 0.4 * seasonalIdx);
      seasonalSum += blendedMonth;
    }
    predictedDemand = Math.max(1, Math.round(seasonalSum));
  }

  const avgDailyDemand =
    predictedDemand > 0 ? Math.max(0.05, Number((predictedDemand / safeHorizon).toFixed(2))) : 0;
  const dailyStdDev =
    totalHistoricalSales > 0
      ? Math.max(0.15, Number((stdMonthly / Math.sqrt(30) / 1.8).toFixed(2)))
      : 0;

  // 90% prediction interval (Worst-case lower vs. Best-case upper demand bounds)
  const horizonUncertainty =
    totalHistoricalSales > 0
      ? Math.max(1, 1.645 * stdMonthly * Math.sqrt(horizonMonths) * 0.58)
      : 0;
  const lowerBound = Math.max(0, Math.round(predictedDemand - horizonUncertainty));
  const upperBound = Math.round(predictedDemand + horizonUncertainty);

  // Safety stock for 95% service level (Z = 1.65)
  const safetyStock =
    avgDailyDemand > 0
      ? Math.max(2, Math.ceil(1.65 * dailyStdDev * Math.sqrt(leadTime)))
      : Math.max(0, Math.min(configuredReorder, 2));

  const dynamicRop = Math.ceil(avgDailyDemand * leadTime + safetyStock);
  const reorderPoint = Math.max(configuredReorder, dynamicRop);

  // Economic Order Quantity (EOQ) with INR 180 order cost & 18% holding rate
  const annualDemand = avgDailyDemand * 365;
  const holdingCostPerUnit = Math.max(1, purchasePrice * 0.18);
  const rawEoq = annualDemand > 0 ? Math.sqrt((2 * annualDemand * 180) / holdingCostPerUnit) : 0;
  const targetCycleStock = Math.max(Math.round(rawEoq), Math.ceil(avgDailyDemand * 21));

  const daysOfSupply =
    avgDailyDemand > 0 ? Math.min(999, Math.floor(currentStock / avgDailyDemand)) : currentStock > 0 ? 999 : 0;

  // Stockout probability over supplier lead time under demand variance
  let stockoutProbability = 1;
  if (currentStock <= 0) {
    stockoutProbability = 99;
  } else if (avgDailyDemand > 0) {
    const leadTimeDemandMean = avgDailyDemand * leadTime;
    const leadTimeDemandStd = Math.max(0.5, dailyStdDev * Math.sqrt(leadTime));
    const zScore = (currentStock - leadTimeDemandMean) / leadTimeDemandStd;
    stockoutProbability = Math.round(Math.min(99, Math.max(1, (1 - normalCdf(zScore)) * 100)));
  }

  const status = classifyStockStatus(
    currentStock,
    reorderPoint,
    safetyStock,
    maxStockLevel,
    daysOfSupply,
    leadTime
  );

  let recommendedOrderQty = 0;
  if (status === 'critical' || status === 'low' || status === 'reorder') {
    const targetLevel = Math.max(
      reorderPoint + targetCycleStock,
      Math.ceil(avgDailyDemand * (leadTime + 25))
    );
    const maxAllowedOrder = Math.max(1, Math.round(maxStockLevel * 1.25 - currentStock));
    recommendedOrderQty = Math.max(1, Math.min(maxAllowedOrder, targetLevel - currentStock));
    recommendedOrderQty = Math.max(1, Math.round(recommendedOrderQty));
  }

  const seasonalPeakMonth =
    totalHistoricalSales > 0 ? (monthLabels[peakMonthIndex] ?? 'Oct') : 'No sales history';

  return {
    productId: product.id,
    sku: product.sku,
    name: product.name,
    category: product.category,
    unit: product.unit,
    currentStock,
    purchasePrice,
    sellingPrice,
    leadTimeDays: leadTime,
    reorderLevel: configuredReorder,
    status,
    avgDailyDemand,
    demandStdDev: dailyStdDev,
    predictedDemand,
    lowerBound,
    upperBound,
    safetyStock,
    reorderPoint,
    recommendedOrderQty,
    estimatedOrderCost: Math.round(recommendedOrderQty * purchasePrice),
    daysOfSupply,
    stockoutProbability,
    seasonalPeakMonth,
    trendPct,
  };
}

export interface DeterministicScenarioOutcome {
  scenarioName: string;
  baselineExpectedUnits: number;
  worstCaseDemandUnits: number;
  expectedDemandUnits: number;
  bestCaseDemandUnits: number;
  adjustedSafetyBufferUnits: number;
  estimatedOrderBudgetInr: number;
  atRiskSkuCount: number;
}

/**
 * Pure scenario-modeling helper computing deterministic Best, Expected, and Worst-case
 * demand and purchasing requirements under demand shocks, lead-time delays, and inflation.
 */
export function simulateScenarioImpact(
  productForecasts: ProductForecast[],
  scenario: Pick<
    ScenarioInput,
    'scenarioName' | 'demandMultiplierPct' | 'leadTimeShockDays' | 'priceInflationPct'
  >
): DeterministicScenarioOutcome {
  const demandPct = Number.isFinite(scenario.demandMultiplierPct)
    ? Math.max(-50, Math.min(150, scenario.demandMultiplierPct))
    : 0;
  const leadDelay = Number.isFinite(scenario.leadTimeShockDays)
    ? Math.max(0, Math.min(30, scenario.leadTimeShockDays))
    : 0;
  const inflationPct = Number.isFinite(scenario.priceInflationPct)
    ? Math.max(-20, Math.min(60, scenario.priceInflationPct))
    : 0;

  const demandFactor = 1 + demandPct / 100;
  const priceFactor = 1 + inflationPct / 100;

  let baselineExpectedUnits = 0;
  let worstCaseDemandUnits = 0;
  let expectedDemandUnits = 0;
  let bestCaseDemandUnits = 0;
  let adjustedSafetyBufferUnits = 0;
  let estimatedOrderBudgetInr = 0;
  let atRiskSkuCount = 0;

  for (const item of productForecasts) {
    baselineExpectedUnits += item.predictedDemand;

    const adjExpected = Math.round(item.predictedDemand * demandFactor);
    // Lead-time shocks widen uncertainty variance proportionally
    const delaySpread = 1 + leadDelay * 0.03;
    const halfBand = Math.round(((item.upperBound - item.lowerBound) / 2) * demandFactor * delaySpread);

    const adjWorst = Math.max(0, adjExpected - halfBand);
    const adjBest = adjExpected + halfBand;

    expectedDemandUnits += adjExpected;
    worstCaseDemandUnits += adjWorst;
    bestCaseDemandUnits += adjBest;

    const effectiveLead = item.leadTimeDays + leadDelay;
    const adjSafety = Math.ceil(item.safetyStock * Math.sqrt(effectiveLead / Math.max(1, item.leadTimeDays)));
    adjustedSafetyBufferUnits += adjSafety;

    const effectiveDaily = (item.avgDailyDemand || 0) * demandFactor;
    const adjRop = Math.ceil(effectiveDaily * effectiveLead + adjSafety);

    if (item.currentStock <= adjRop) {
      atRiskSkuCount += 1;
      const neededUnits = Math.max(1, Math.round(adjExpected + adjSafety - item.currentStock));
      estimatedOrderBudgetInr += Math.round(neededUnits * item.purchasePrice * priceFactor);
    }
  }

  return {
    scenarioName: scenario.scenarioName || 'Custom Scenario',
    baselineExpectedUnits,
    worstCaseDemandUnits,
    expectedDemandUnits,
    bestCaseDemandUnits,
    adjustedSafetyBufferUnits,
    estimatedOrderBudgetInr,
    atRiskSkuCount,
  };
}

export function buildForecastReport(
  products: Product[],
  horizonDays: ForecastHorizon = 30,
  selectedCategory = 'All'
): ForecastResponse {
  const monthLabels = getRecentMonthLabels(12);
  const allForecasts = products.map((p) => computeProductForecast(p, horizonDays, monthLabels));

  const filteredProducts =
    selectedCategory === 'All'
      ? products
      : products.filter((p) => p.category === selectedCategory);

  const filteredForecasts =
    selectedCategory === 'All'
      ? allForecasts
      : allForecasts.filter((f) => f.category === selectedCategory);

  const futureCount = horizonDays / 30;
  const futureLabels = getFutureMonthLabels(futureCount);
  const timeline: ForecastTimelinePoint[] = [];

  for (let i = 0; i < 12; i++) {
    const actualUnits = filteredProducts.reduce((sum, p) => {
      const cleaned = sanitizeSalesSeries(p.monthlySales);
      return sum + (cleaned[i] ?? 0);
    }, 0);
    const inboundUnits = filteredProducts.reduce((sum, p) => {
      const cleaned = sanitizeSalesSeries(p.monthlyRestocks);
      return sum + (cleaned[i] ?? 0);
    }, 0);

    timeline.push({
      label: monthLabels[i],
      kind: 'actual',
      actualUnits,
      predictedUnits: i === 11 ? actualUnits : null,
      lowerBound: i === 11 ? actualUnits : null,
      upperBound: i === 11 ? actualUnits : null,
      inboundUnits,
    });
  }

  for (let m = 0; m < futureCount; m++) {
    const monthPred = filteredForecasts.reduce(
      (sum, f) => sum + Math.round(f.predictedDemand / futureCount),
      0
    );
    const monthLow = filteredForecasts.reduce(
      (sum, f) => sum + Math.round(f.lowerBound / futureCount),
      0
    );
    const monthHigh = filteredForecasts.reduce(
      (sum, f) => sum + Math.round(f.upperBound / futureCount),
      0
    );
    const wave = m === 0 ? 1 : m === 1 ? 1.04 : 1.07;

    timeline.push({
      label: futureLabels[m],
      kind: 'forecast',
      actualUnits: null,
      predictedUnits: Math.round(monthPred * wave),
      lowerBound: Math.round(monthLow * wave),
      upperBound: Math.round(monthHigh * wave),
      inboundUnits: null,
    });
  }

  const categoryMap = new Map<InventoryCategory, CategoryForecastSummary>();
  for (const cat of INVENTORY_CATEGORIES) {
    categoryMap.set(cat, {
      category: cat,
      skuCount: 0,
      totalUnits: 0,
      stockValue: 0,
      predictedDemand: 0,
      criticalCount: 0,
      lowCount: 0,
      reorderCount: 0,
      normalCount: 0,
      overstockCount: 0,
      recommendedOrderCost: 0,
    });
  }

  allForecasts.forEach((f, idx) => {
    const p = products[idx];
    const entry = categoryMap.get(f.category);
    if (!entry) return;
    entry.skuCount += 1;
    entry.totalUnits += Math.max(0, p.quantity);
    entry.stockValue += Math.max(0, p.quantity) * p.purchasePrice;
    entry.predictedDemand += f.predictedDemand;
    entry.recommendedOrderCost += f.estimatedOrderCost;
    if (f.status === 'critical') entry.criticalCount += 1;
    else if (f.status === 'low') entry.lowCount += 1;
    else if (f.status === 'reorder') entry.reorderCount += 1;
    else if (f.status === 'overstock') entry.overstockCount += 1;
    else entry.normalCount += 1;
  });

  const categoryBreakdown = Array.from(categoryMap.values()).filter((c) => c.skuCount > 0);

  const totalStockValue = filteredProducts.reduce(
    (s, p) => s + Math.max(0, p.quantity) * p.purchasePrice,
    0
  );
  const totalRetailValue = filteredProducts.reduce(
    (s, p) => s + Math.max(0, p.quantity) * p.sellingPrice,
    0
  );
  const totalUnits = filteredProducts.reduce((s, p) => s + Math.max(0, p.quantity), 0);
  const predictedDemandUnits = filteredForecasts.reduce((s, f) => s + f.predictedDemand, 0);
  const recommendedPurchaseUnits = filteredForecasts.reduce((s, f) => s + f.recommendedOrderQty, 0);
  const recommendedPurchaseCost = filteredForecasts.reduce((s, f) => s + f.estimatedOrderCost, 0);
  const safetyStockUnits = filteredForecasts.reduce((s, f) => s + f.safetyStock, 0);
  const avgStockoutRisk =
    filteredForecasts.length > 0
      ? Math.round(
          filteredForecasts.reduce((s, f) => s + f.stockoutProbability, 0) /
            filteredForecasts.length
        )
      : 0;

  let criticalCount = 0;
  let lowCount = 0;
  let reorderCount = 0;
  let normalCount = 0;
  let overstockCount = 0;

  for (const f of filteredForecasts) {
    if (f.status === 'critical') criticalCount++;
    else if (f.status === 'low') lowCount++;
    else if (f.status === 'reorder') reorderCount++;
    else if (f.status === 'overstock') overstockCount++;
    else normalCount++;
  }

  const priorityRank: Record<StockStatus, number> = {
    critical: 0,
    low: 1,
    reorder: 2,
    normal: 3,
    overstock: 4,
  };

  const sortedForecasts = [...filteredForecasts].sort((a, b) => {
    const rankDiff = priorityRank[a.status] - priorityRank[b.status];
    if (rankDiff !== 0) return rankDiff;
    return b.stockoutProbability - a.stockoutProbability;
  });

  return {
    horizonDays,
    selectedCategory,
    monthLabels,
    summary: {
      totalStockValue: Math.round(totalStockValue),
      totalRetailValue: Math.round(totalRetailValue),
      totalSkus: filteredProducts.length,
      totalUnits,
      predictedDemandUnits,
      recommendedPurchaseUnits,
      recommendedPurchaseCost: Math.round(recommendedPurchaseCost),
      safetyStockUnits,
      avgStockoutRisk,
      criticalCount,
      lowCount,
      reorderCount,
      normalCount,
      overstockCount,
    },
    timeline,
    categoryBreakdown,
    productForecasts: sortedForecasts,
  };
}
