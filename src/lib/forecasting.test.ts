import { describe, expect, it } from 'vitest';
import type { Product } from '../../shared/types';
import {
  buildForecastReport,
  classifyStockStatus,
  computeProductForecast,
  computeSeasonalTrend,
  getRecentMonthLabels,
  sanitizeSalesSeries,
  simulateScenarioImpact,
} from './forecasting';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'test-1',
    sku: 'TST-101',
    name: 'Test Basmati Rice',
    category: 'Rice and Grains',
    quantity: 45,
    unit: 'kg',
    purchasePrice: 100,
    sellingPrice: 135,
    reorderLevel: 30,
    maxStockLevel: 200,
    leadTimeDays: 4,
    supplier: 'Karnal Mills',
    seasonalityTag: 'Festive Peak',
    imageUrl: '/src/assets/images/cat_rice_grains_1795627652510.jpg',
    monthlySales: [90, 95, 100, 92, 88, 96, 104, 110, 118, 140, 136, 115],
    monthlyRestocks: [90, 100, 100, 90, 90, 100, 105, 110, 120, 140, 135, 110],
    updatedAt: '2026-11-26T00:00:00.000Z',
    ...overrides,
  };
}

describe('Forecasting, Seasonal Trends & Uncertainty Engine', () => {
  const labels = getRecentMonthLabels(12);

  it('computes expected, worst-case (lower), and best-case (upper) demand in proper order', () => {
    const forecast = computeProductForecast(makeProduct(), 30, labels);
    expect(forecast.predictedDemand).toBeGreaterThan(0);
    expect(forecast.lowerBound).toBeLessThanOrEqual(forecast.predictedDemand);
    expect(forecast.upperBound).toBeGreaterThanOrEqual(forecast.predictedDemand);
    expect(forecast.safetyStock).toBeGreaterThanOrEqual(2);
    expect(forecast.reorderPoint).toBeGreaterThanOrEqual(forecast.safetyStock);
  });

  it('scales predicted demand and uncertainty bounds across 30, 60, and 90-day horizons', () => {
    const product = makeProduct();
    const f30 = computeProductForecast(product, 30, labels);
    const f60 = computeProductForecast(product, 60, labels);
    const f90 = computeProductForecast(product, 90, labels);

    expect(f60.predictedDemand).toBeGreaterThan(f30.predictedDemand);
    expect(f90.predictedDemand).toBeGreaterThan(f60.predictedDemand);
    expect(f90.upperBound - f90.lowerBound).toBeGreaterThan(f30.upperBound - f30.lowerBound);
  });

  it('handles zero sales history gracefully without NaN or infinite values', () => {
    const zeroProduct = makeProduct({
      quantity: 20,
      reorderLevel: 5,
      monthlySales: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    });
    const forecast = computeProductForecast(zeroProduct, 30, labels);

    expect(forecast.predictedDemand).toBe(0);
    expect(forecast.lowerBound).toBe(0);
    expect(forecast.upperBound).toBe(0);
    expect(forecast.avgDailyDemand).toBe(0);
    expect(Number.isFinite(forecast.stockoutProbability)).toBe(true);
    expect(forecast.seasonalPeakMonth).toBe('No sales history');
  });

  it('handles completely empty sales array without crashing', () => {
    const emptyProduct = makeProduct({
      quantity: 12,
      monthlySales: [],
    });
    const forecast = computeProductForecast(emptyProduct, 30, labels);

    expect(forecast.predictedDemand).toBe(0);
    expect(Number.isNaN(forecast.safetyStock)).toBe(false);
    expect(Number.isNaN(forecast.daysOfSupply)).toBe(false);
  });

  it('sanitizes negative and non-numeric inputs in sales arrays', () => {
    const dirtySeries = [-25, Number.NaN, Infinity, 'abc', undefined, null, 60, 80] as unknown[];
    const cleaned = sanitizeSalesSeries(dirtySeries);

    expect(cleaned).toEqual([0, 0, 0, 0, 0, 0, 60, 80]);

    const dirtyProduct = makeProduct({
      quantity: -10,
      leadTimeDays: -3,
      monthlySales: cleaned,
    });
    const forecast = computeProductForecast(dirtyProduct, 30, labels);
    expect(forecast.currentStock).toBe(0);
    expect(forecast.leadTimeDays).toBe(1);
    expect(forecast.status).toBe('critical');
    expect(forecast.stockoutProbability).toBe(99);
  });

  it('handles very high demand spikes while staying finite and recommending replenishment', () => {
    const highDemandProduct = makeProduct({
      quantity: 500,
      reorderLevel: 1000,
      maxStockLevel: 250000,
      monthlySales: Array(12).fill(120_000),
    });
    const forecast = computeProductForecast(highDemandProduct, 30, labels);

    expect(forecast.predictedDemand).toBeGreaterThan(100_000);
    expect(Number.isFinite(forecast.recommendedOrderQty)).toBe(true);
    expect(forecast.recommendedOrderQty).toBeGreaterThan(0);
    expect(forecast.status).toBe('critical');
  });

  it('fills missing seasons neutrally when fewer than 12 months of history exist', () => {
    const partialTrend = computeSeasonalTrend([40, 50, 60]);
    expect(partialTrend.seasonalIndices).toHaveLength(12);
    // Months 3..11 are missing and default to neutral 1.0 index
    expect(partialTrend.seasonalIndices.slice(3).every((v) => v === 1)).toBe(true);
    expect(partialTrend.trendPct).toBeGreaterThan(0);
  });

  it('classifies stock levels into critical, low, reorder, normal, and overstock accurately', () => {
    expect(classifyStockStatus(0, 30, 10, 100, 0, 4)).toBe('critical');
    expect(classifyStockStatus(20, 30, 10, 100, 5, 4)).toBe('low');
    expect(classifyStockStatus(29, 30, 10, 100, 9, 4)).toBe('reorder');
    expect(classifyStockStatus(75, 30, 10, 100, 25, 4)).toBe('normal');
    expect(classifyStockStatus(150, 30, 10, 100, 95, 4)).toBe('overstock');
  });

  it('computes deterministic Best, Expected, and Worst scenario impacts under demand & lead-time shocks', () => {
    const baseForecast = computeProductForecast(makeProduct({ quantity: 40 }), 30, labels);
    const baseline = simulateScenarioImpact([baseForecast], {
      scenarioName: 'Baseline',
      demandMultiplierPct: 0,
      leadTimeShockDays: 0,
      priceInflationPct: 0,
    });
    const festiveSurge = simulateScenarioImpact([baseForecast], {
      scenarioName: 'Diwali Surge',
      demandMultiplierPct: 40,
      leadTimeShockDays: 5,
      priceInflationPct: 10,
    });

    expect(festiveSurge.expectedDemandUnits).toBeGreaterThan(baseline.expectedDemandUnits);
    expect(festiveSurge.worstCaseDemandUnits).toBeLessThanOrEqual(festiveSurge.expectedDemandUnits);
    expect(festiveSurge.bestCaseDemandUnits).toBeGreaterThanOrEqual(festiveSurge.expectedDemandUnits);
    expect(festiveSurge.adjustedSafetyBufferUnits).toBeGreaterThan(baseline.adjustedSafetyBufferUnits);
    expect(festiveSurge.estimatedOrderBudgetInr).toBeGreaterThan(0);
  });

  it('builds category-filtered forecast reports with timeline bridge points', () => {
    const p1 = makeProduct({ id: '1', category: 'Rice and Grains' });
    const p2 = makeProduct({ id: '2', sku: 'DRY-1', name: 'Milk', category: 'Dairy Products' });

    const report = buildForecastReport([p1, p2], 60, 'Dairy Products');
    expect(report.summary.totalSkus).toBe(1);
    expect(report.productForecasts).toHaveLength(1);
    expect(report.timeline).toHaveLength(14); // 12 historical + 2 forecast months
  });
});
