export const INVENTORY_CATEGORIES = [
  'Rice and Grains',
  'Flour and Baking Products',
  'Pulses and Lentils',
  'Oils and Ghee',
  'Spices and Masalas',
  'Salt and Sweeteners',
  'Dairy Products',
  'Snacks and Packaged Foods',
  'Beverages',
  'Personal Care Products',
  'Household Cleaning Products',
  'Vegetables',
  'Fruits',
] as const;

export type InventoryCategory = (typeof INVENTORY_CATEGORIES)[number];

export const PRODUCT_UNITS = [
  'kg',
  'g',
  'L',
  'ml',
  'pcs',
  'pkt',
  'bag',
  'box',
  'jar',
  'bottle',
  'dozen',
  'bunch',
] as const;

export type ProductUnit = (typeof PRODUCT_UNITS)[number];

export type StockStatus = 'critical' | 'low' | 'reorder' | 'normal' | 'overstock';

export type ForecastHorizon = 30 | 60 | 90;

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: InventoryCategory;
  quantity: number;
  unit: ProductUnit;
  purchasePrice: number;
  sellingPrice: number;
  reorderLevel: number;
  maxStockLevel: number;
  leadTimeDays: number;
  supplier: string;
  seasonalityTag: string;
  imageUrl: string;
  monthlySales: number[]; // 12 months historical outbound units (oldest -> most recent)
  monthlyRestocks: number[]; // 12 months historical inbound units
  updatedAt: string;
}

export interface ActivityItem {
  id: string;
  type: 'restock' | 'sale' | 'adjustment' | 'created' | 'updated' | 'deleted';
  productId: string;
  productName: string;
  sku: string;
  quantityDelta: number;
  unit: string;
  note: string;
  timestamp: string;
}

export interface ProductForecast {
  productId: string;
  sku: string;
  name: string;
  category: InventoryCategory;
  unit: ProductUnit;
  currentStock: number;
  purchasePrice: number;
  sellingPrice: number;
  leadTimeDays: number;
  reorderLevel: number;
  status: StockStatus;
  avgDailyDemand: number;
  demandStdDev: number;
  predictedDemand: number; // for selected horizon
  lowerBound: number; // 90% PI lower
  upperBound: number; // 90% PI upper
  safetyStock: number;
  reorderPoint: number;
  recommendedOrderQty: number;
  estimatedOrderCost: number;
  daysOfSupply: number;
  stockoutProbability: number; // 0..100
  seasonalPeakMonth: string;
  trendPct: number; // month-over-month % trend
}

export interface ForecastTimelinePoint {
  label: string;
  kind: 'actual' | 'forecast';
  actualUnits: number | null;
  predictedUnits: number | null;
  lowerBound: number | null;
  upperBound: number | null;
  inboundUnits: number | null;
}

export interface CategoryForecastSummary {
  category: InventoryCategory;
  skuCount: number;
  totalUnits: number;
  stockValue: number;
  predictedDemand: number;
  criticalCount: number;
  lowCount: number;
  reorderCount: number;
  normalCount: number;
  overstockCount: number;
  recommendedOrderCost: number;
}

export interface ForecastResponse {
  horizonDays: ForecastHorizon;
  selectedCategory: string;
  monthLabels: string[];
  summary: {
    totalStockValue: number;
    totalRetailValue: number;
    totalSkus: number;
    totalUnits: number;
    predictedDemandUnits: number;
    recommendedPurchaseUnits: number;
    recommendedPurchaseCost: number;
    safetyStockUnits: number;
    avgStockoutRisk: number;
    criticalCount: number;
    lowCount: number;
    reorderCount: number;
    normalCount: number;
    overstockCount: number;
  };
  timeline: ForecastTimelinePoint[];
  categoryBreakdown: CategoryForecastSummary[];
  productForecasts: ProductForecast[];
}

export interface ScenarioInput {
  presetId: string;
  scenarioName: string;
  demandMultiplierPct: number; // e.g., +35 means +35% demand
  leadTimeShockDays: number; // e.g., +5 extra days lead time
  priceInflationPct: number; // e.g., +8% supplier price inflation
  focusCategory: string; // 'All' or specific InventoryCategory
  customNotes: string;
}

export interface AIRecommendedAction {
  sku: string;
  productName: string;
  urgency: 'immediate' | 'this_week' | 'monitor';
  recommendedQty: number;
  unit: string;
  estimatedCostInr: number;
  rationale: string;
}

export interface AIAnalysisResult {
  generatedAt: string;
  model: string;
  scenarioTitle: string;
  executiveSummary: string;
  uncertaintyReasoning: string;
  projectedRevenueImpact: string;
  cashRequiredInr: number;
  riskMitigationSteps: string[];
  recommendedPurchases: AIRecommendedAction[];
}
