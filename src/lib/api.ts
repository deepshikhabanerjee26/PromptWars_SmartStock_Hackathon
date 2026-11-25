import type {
  ActivityItem,
  AIAnalysisResult,
  ForecastHorizon,
  ForecastResponse,
  InventoryCategory,
  Product,
  ProductForecast,
  ProductUnit,
  ScenarioInput,
} from '../../shared/types';

export interface EnrichedProduct extends Product {
  forecast: ProductForecast;
}

export interface ProductsPayload {
  products: EnrichedProduct[];
  activities: ActivityItem[];
  categories: readonly InventoryCategory[];
  units: readonly ProductUnit[];
}

export interface ProductUpsertPayload {
  name: string;
  sku?: string;
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
  imageUrl?: string;
}

async function handleJson<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof (data as { error?: string }).error === 'string'
        ? (data as { error: string }).error
        : `Request failed with status ${res.status}`;
    throw new Error(message);
  }
  return data as T;
}

export async function fetchProducts(): Promise<ProductsPayload> {
  const res = await fetch('/api/products');
  return handleJson<ProductsPayload>(res);
}

export async function createProduct(payload: ProductUpsertPayload): Promise<{ product: EnrichedProduct }> {
  const res = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleJson<{ product: EnrichedProduct }>(res);
}

export async function updateProduct(
  id: string,
  payload: Partial<ProductUpsertPayload>
): Promise<{ product: EnrichedProduct }> {
  const res = await fetch(`/api/products/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleJson<{ product: EnrichedProduct }>(res);
}

export async function deleteProduct(id: string): Promise<{ deletedId: string }> {
  const res = await fetch(`/api/products/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  return handleJson<{ deletedId: string }>(res);
}

export async function recordStockMovement(
  id: string,
  payload: { type: 'restock' | 'sale' | 'adjustment'; quantity: number; note?: string }
): Promise<{ product: EnrichedProduct; activities: ActivityItem[] }> {
  const res = await fetch(`/api/products/${encodeURIComponent(id)}/movement`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleJson<{ product: EnrichedProduct; activities: ActivityItem[] }>(res);
}

export async function fetchForecast(
  horizon: ForecastHorizon = 30,
  category = 'All'
): Promise<ForecastResponse> {
  const params = new URLSearchParams({
    horizon: String(horizon),
    category,
  });
  const res = await fetch(`/api/forecast?${params.toString()}`);
  return handleJson<ForecastResponse>(res);
}

export async function runAIScenarioAnalysis(input: ScenarioInput): Promise<AIAnalysisResult> {
  const res = await fetch('/api/ai/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handleJson<AIAnalysisResult>(res);
}
