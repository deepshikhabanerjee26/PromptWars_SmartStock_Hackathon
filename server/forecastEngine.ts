import type {
  CategoryForecastSummary,
  ForecastHorizon,
  ForecastResponse,
  ForecastTimelinePoint,
  InventoryCategory,
  Product,
  ProductForecast,
  StockStatus,
} from '../shared/types.ts';
import { INVENTORY_CATEGORIES } from '../shared/types.ts';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function getRecentMonthLabels(count = 12, now = new Date()): string[] {
  const labels: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(`${MONTH_NAMES[d.getMonth()]} '${String(d.getFullYear()).slice(-2)}`);
  }
  return labels;
}

export function getFutureMonthLabels(count = 3, now = new Date()): string[] {
  const labels: string[] = [];
  for (let i = 1; i <= count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    labels.push(`${MONTH_NAMES[d.getMonth()]} '${String(d.getFullYear()).slice(-2)}`);
  }
  return labels;
}

// Standard Normal CDF approximation (Abramowitz & Stegun)
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const prob =
    d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - prob : prob;
}

export function classifyStockStatus(
  quantity: number,
  reorderPoint: number,
  safetyStock: number,
  maxStockLevel: number,
  daysOfSupply: number,
  leadTimeDays: number
): StockStatus {
  if (quantity <= 0 || quantity <= Math.max(2, safetyStock * 0.65) || daysOfSupply < Math.max(2, leadTimeDays * 0.6)) {
    return 'critical';
  }
  if (quantity <= reorderPoint * 0.85 || daysOfSupply <= leadTimeDays + 2) {
    return 'low';
  }
  if (quantity <= reorderPoint) {
    return 'reorder';
  }
  if (quantity > maxStockLevel * 1.1 && daysOfSupply > 75) {
    return 'overstock';
  }
  return 'normal';
}

export function computeProductForecast(
  product: Product,
  horizonDays: ForecastHorizon,
  monthLabels: string[]
): ProductForecast {
  const sales = product.monthlySales.length >= 3 ? product.monthlySales : [10, 10, 10];
  const n = sales.length;

  // Exponentially weighted moving average (alpha = 0.32) for level
  const alpha = 0.32;
  let smoothed = sales[0];
  for (let i = 1; i < n; i++) {
    smoothed = alpha * sales[i] + (1 - alpha) * smoothed;
  }

  // Recent 3-month vs prior 3-month linear momentum
  const recentSlice = sales.slice(-3);
  const prevSlice = sales.slice(-6, -3);
  const recentAvg = recentSlice.reduce((a, b) => a + b, 0) / recentSlice.length;
  const prevAvg = prevSlice.length > 0 ? prevSlice.reduce((a, b) => a + b, 0) / prevSlice.length : recentAvg;
  const trendPct = prevAvg > 0 ? ((recentAvg - prevAvg) / prevAvg) * 100 : 0;

  // Dampened monthly trend factor to avoid runaway extrapolation
  const dampenedMonthlyFactor = 1 + Math.max(-0.18, Math.min(0.22, (trendPct / 100) * 0.35));

  // Monthly variance and daily demand metrics
  const meanMonthly = sales.reduce((a, b) => a + b, 0) / n;
  const varianceMonthly =
    sales.reduce((acc, val) => acc + Math.pow(val - meanMonthly, 2), 0) / Math.max(1, n - 1);
  const stdMonthly = Math.sqrt(varianceMonthly);

  // Seasonal multiplier based on upcoming months matching same index 12 months prior
  const horizonMonths = horizonDays / 30;
  let seasonalSum = 0;
  for (let m = 0; m < horizonMonths; m++) {
    const idx = m % n;
    const seasonalIdx = meanMonthly > 0 ? sales[idx] / meanMonthly : 1;
    // Blend 60% smoothed level with 40% historical seasonality
    const blendedMonth = smoothed * dampenedMonthlyFactor * (0.6 + 0.4 * seasonalIdx);
    seasonalSum += blendedMonth;
  }

  const predictedDemand = Math.max(1, Math.round(seasonalSum));
  const avgDailyDemand = Math.max(0.1, Number((predictedDemand / horizonDays).toFixed(2)));
  const dailyStdDev = Math.max(0.15, Number((stdMonthly / Math.sqrt(30) / 1.8).toFixed(2)));

  // 90% prediction interval (Z = 1.645) scaled by sqrt(horizonMonths)
  const horizonUncertainty = 1.645 * stdMonthly * Math.sqrt(horizonMonths) * 0.58;
  const lowerBound = Math.max(0, Math.round(predictedDemand - horizonUncertainty));
  const upperBound = Math.round(predictedDemand + horizonUncertainty);

  // Safety stock for 95% service level (Z = 1.65)
  const leadTime = Math.max(1, product.leadTimeDays);
  const safetyStock = Math.max(
    2,
    Math.ceil(1.65 * dailyStdDev * Math.sqrt(leadTime))
  );

  // Reorder point combines dynamic ROP and user's configured floor
  const dynamicRop = Math.ceil(avgDailyDemand * leadTime + safetyStock);
  const reorderPoint = Math.max(product.reorderLevel, dynamicRop);

  // Economic Order Quantity (EOQ) with ₹180 order cost and 18% annual holding cost
  const annualDemand = avgDailyDemand * 365;
  const holdingCostPerUnit = Math.max(1, product.purchasePrice * 0.18);
  const rawEoq = Math.sqrt((2 * annualDemand * 180) / holdingCostPerUnit);
  const targetCycleStock = Math.max(Math.round(rawEoq), Math.ceil(avgDailyDemand * 21));

  const daysOfSupply = Math.min(999, Math.floor(product.quantity / avgDailyDemand));

  // Lead-time demand distribution for stockout probability
  const leadTimeDemandMean = avgDailyDemand * leadTime;
  const leadTimeDemandStd = Math.max(0.5, dailyStdDev * Math.sqrt(leadTime));
  const zScore = (product.quantity - leadTimeDemandMean) / leadTimeDemandStd;
  const stockoutProbability = Math.round(Math.min(99, Math.max(1, (1 - normalCdf(zScore)) * 100)));

  const status = classifyStockStatus(
    product.quantity,
    reorderPoint,
    safetyStock,
    product.maxStockLevel,
    daysOfSupply,
    leadTime
  );

  let recommendedOrderQty = 0;
  if (status === 'critical' || status === 'low' || status === 'reorder') {
    const targetLevel = Math.max(reorderPoint + targetCycleStock, Math.ceil(avgDailyDemand * (leadTime + 25)));
    recommendedOrderQty = Math.max(1, Math.min(product.maxStockLevel * 1.25 - product.quantity, targetLevel - product.quantity));
    recommendedOrderQty = Math.max(1, Math.round(recommendedOrderQty));
  }

  // Peak historical month
  let peakIdx = 0;
  for (let i = 1; i < sales.length; i++) {
    if (sales[i] > sales[peakIdx]) peakIdx = i;
  }
  const seasonalPeakMonth = monthLabels[peakIdx] ?? 'Oct';

  return {
    productId: product.id,
    sku: product.sku,
    name: product.name,
    category: product.category,
    unit: product.unit,
    currentStock: product.quantity,
    purchasePrice: product.purchasePrice,
    sellingPrice: product.sellingPrice,
    leadTimeDays: leadTime,
    reorderLevel: product.reorderLevel,
    status,
    avgDailyDemand,
    demandStdDev: dailyStdDev,
    predictedDemand,
    lowerBound,
    upperBound,
    safetyStock,
    reorderPoint,
    recommendedOrderQty,
    estimatedOrderCost: Math.round(recommendedOrderQty * product.purchasePrice),
    daysOfSupply,
    stockoutProbability,
    seasonalPeakMonth,
    trendPct: Number(trendPct.toFixed(1)),
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

  // Build 12 historical months + future horizon months timeline
  const futureCount = horizonDays / 30;
  const futureLabels = getFutureMonthLabels(futureCount);
  const timeline: ForecastTimelinePoint[] = [];

  for (let i = 0; i < 12; i++) {
    const actualUnits = filteredProducts.reduce((sum, p) => sum + (p.monthlySales[i] ?? 0), 0);
    const inboundUnits = filteredProducts.reduce((sum, p) => sum + (p.monthlyRestocks[i] ?? 0), 0);
    timeline.push({
      label: monthLabels[i],
      kind: 'actual',
      actualUnits,
      predictedUnits: i === 11 ? actualUnits : null, // seamless bridge at last actual point
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
    // Slight realistic seasonal wave across multi-month horizon
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

  // Category breakdown (always computed over all products so category comparison stays grounded)
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
    entry.totalUnits += p.quantity;
    entry.stockValue += p.quantity * p.purchasePrice;
    entry.predictedDemand += f.predictedDemand;
    entry.recommendedOrderCost += f.estimatedOrderCost;
    if (f.status === 'critical') entry.criticalCount += 1;
    else if (f.status === 'low') entry.lowCount += 1;
    else if (f.status === 'reorder') entry.reorderCount += 1;
    else if (f.status === 'overstock') entry.overstockCount += 1;
    else entry.normalCount += 1;
  });

  const categoryBreakdown = Array.from(categoryMap.values()).filter((c) => c.skuCount > 0);

  // Summary metrics over filtered scope
  const totalStockValue = filteredProducts.reduce((s, p) => s + p.quantity * p.purchasePrice, 0);
  const totalRetailValue = filteredProducts.reduce((s, p) => s + p.quantity * p.sellingPrice, 0);
  const totalUnits = filteredProducts.reduce((s, p) => s + p.quantity, 0);
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

  // Sort product forecasts by urgency (critical -> low -> reorder -> normal -> overstock), then stockoutProbability desc
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
