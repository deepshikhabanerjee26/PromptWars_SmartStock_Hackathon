// Exact problem statement text used consistently across the UI and README.md.
export const EXACT_PROBLEM_STATEMENT =
  'Small businesses frequently face inventory shortages or excess stock because they cannot accurately predict customer demand. Develop an AI system that analyzes historical sales, seasonal trends, and inventory data to recommend purchasing decisions. Advanced prompt challenge: Demand forecasting, scenario analysis, inventory optimization, and reasoning under uncertainty.';

export interface ProblemRequirementMapping {
  requirement: string;
  capability: string;
  screen: string;
  description: string;
}

export const PROBLEM_REQUIREMENTS_MAP: ProblemRequirementMapping[] = [
  {
    requirement: 'Analyze historical sales & seasonal trends',
    capability: 'Time-Series Seasonal Smoothing',
    screen: 'Dashboard & Demand Forecast',
    description:
      'Decomposes up to 12 months of unit sales and seasonal indices (festive, monsoon, summer, harvest) to detect baseline velocity and momentum.',
  },
  {
    requirement: 'Analyze inventory data to prevent shortages or excess stock',
    capability: 'Live Stock Health & Classification',
    screen: 'Inventory Catalog & Priority Queue',
    description:
      'Monitors on-hand stock, supplier lead times, and max thresholds to flag Critical, Low, Reorder, Normal, and Excess stock levels.',
  },
  {
    requirement: 'Recommend purchasing decisions (Inventory Optimization)',
    capability: 'Safety Stock, Reorder Point & EOQ',
    screen: 'Priority Queue & Demand Forecast',
    description:
      'Computes 95% service-level safety stock, dynamic reorder points, Economic Order Quantity (EOQ), and estimated purchase order cost in INR.',
  },
  {
    requirement: 'Demand forecasting & reasoning under uncertainty',
    capability: 'Best, Expected & Worst-Case Bounds',
    screen: 'Dashboard & Demand Forecast',
    description:
      'Quantifies demand variance into Worst-Case (lower 90%), Expected, and Best-Case (upper 90%) forecasts plus lead-time stockout probability.',
  },
  {
    requirement: 'Scenario analysis for purchasing under risk',
    capability: 'Scenario Simulator & AI Advisor',
    screen: 'Demand Forecast (AI Scenario Studio)',
    description:
      'Simulates demand surges, supplier lead-time delays, and cost inflation with deterministic stress-testing and server-side Gemini AI reasoning.',
  },
];
