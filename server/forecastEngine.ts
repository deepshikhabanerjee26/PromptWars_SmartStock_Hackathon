// Re-export pure forecasting, seasonal trend, and stock classification helpers
// from the shared client/server library so logic stays single-sourced and unit-tested.
export {
  buildForecastReport,
  classifyStockStatus,
  computeProductForecast,
  computeSeasonalTrend,
  getFutureMonthLabels,
  getRecentMonthLabels,
  sanitizeSalesSeries,
  simulateScenarioImpact,
} from '../src/lib/forecasting.ts';
