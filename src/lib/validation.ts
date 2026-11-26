import {
  INVENTORY_CATEGORIES,
  PRODUCT_UNITS,
  type InventoryCategory,
  type ProductUnit,
  type ScenarioInput,
} from '../../shared/types.ts';

/**
 * Strips HTML tags and ASCII control characters from plain text inputs
 * and limits string length cleanly.
 */
export function sanitizePlainText(raw: unknown, maxLength = 120): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/**
 * Escapes HTML special characters and removes unsafe URI schemes from AI-generated text
 * before displaying it in the UI.
 */
export function escapeDisplayText(raw: unknown): string {
  const cleaned = sanitizePlainText(raw, 1200);
  return cleaned
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function isValidCategory(val: unknown): val is InventoryCategory {
  return typeof val === 'string' && (INVENTORY_CATEGORIES as readonly string[]).includes(val);
}

export function isValidUnit(val: unknown): val is ProductUnit {
  return typeof val === 'string' && (PRODUCT_UNITS as readonly string[]).includes(val);
}

export interface ValidatedProductFields {
  name: string;
  sku?: string;
  category: InventoryCategory;
  unit: ProductUnit;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  reorderLevel: number;
  maxStockLevel: number;
  leadTimeDays: number;
  supplier: string;
  seasonalityTag: string;
  imageUrl?: string;
}

export function validateProductInput(
  raw: Record<string, unknown>
): { ok: true; data: ValidatedProductFields } | { ok: false; error: string } {
  const name = sanitizePlainText(raw.name, 100);
  if (name.length < 2) {
    return { ok: false, error: 'Product name must be between 2 and 100 characters.' };
  }

  if (!isValidCategory(raw.category)) {
    return { ok: false, error: 'Please select a valid inventory category.' };
  }
  if (!isValidUnit(raw.unit)) {
    return { ok: false, error: 'Please select a valid unit of measurement.' };
  }

  const quantity = Number(raw.quantity);
  const purchasePrice = Number(raw.purchasePrice);
  const sellingPrice = Number(raw.sellingPrice);
  const reorderLevel = Number(raw.reorderLevel ?? 0);
  const maxStockLevel = Number(raw.maxStockLevel ?? Math.max(50, reorderLevel * 3));
  const leadTimeDays = Number(raw.leadTimeDays ?? 3);

  if (!Number.isFinite(quantity) || quantity < 0 || quantity > 1_000_000) {
    return { ok: false, error: 'Quantity must be between 0 and 1,000,000.' };
  }
  if (
    !Number.isFinite(purchasePrice) ||
    purchasePrice <= 0 ||
    purchasePrice > 1_000_000 ||
    !Number.isFinite(sellingPrice) ||
    sellingPrice <= 0 ||
    sellingPrice > 1_000_000
  ) {
    return { ok: false, error: 'Purchase and selling prices must be between 1 and 1,000,000.' };
  }
  if (sellingPrice < purchasePrice) {
    return { ok: false, error: 'Selling price must be greater than or equal to purchase price.' };
  }
  if (!Number.isFinite(reorderLevel) || reorderLevel < 0 || reorderLevel > 500_000) {
    return { ok: false, error: 'Reorder level must be 0 or greater.' };
  }
  if (!Number.isFinite(leadTimeDays) || leadTimeDays < 1 || leadTimeDays > 60) {
    return { ok: false, error: 'Supplier lead time must be between 1 and 60 days.' };
  }
  if (!Number.isFinite(maxStockLevel) || maxStockLevel < 1 || maxStockLevel > 1_000_000) {
    return { ok: false, error: 'Maximum stock level must be at least 1.' };
  }

  const skuRaw = sanitizePlainText(raw.sku, 24).toUpperCase().replace(/[^A-Z0-9-]/g, '');
  const supplier = sanitizePlainText(raw.supplier, 80) || 'Regional Wholesale Partner';
  const seasonalityTag = sanitizePlainText(raw.seasonalityTag, 60) || 'Steady Year-Round';

  return {
    ok: true,
    data: {
      name,
      sku: skuRaw || undefined,
      category: raw.category,
      unit: raw.unit,
      quantity: Math.round(quantity),
      purchasePrice: Number(purchasePrice.toFixed(2)),
      sellingPrice: Number(sellingPrice.toFixed(2)),
      reorderLevel: Math.round(reorderLevel),
      maxStockLevel: Math.max(Math.round(reorderLevel) + 10, Math.round(maxStockLevel)),
      leadTimeDays: Math.round(leadTimeDays),
      supplier,
      seasonalityTag,
      imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl.trim() : undefined,
    },
  };
}

export function validateMovementInput(
  raw: Record<string, unknown>,
  availableStock: number
):
  | { ok: true; data: { type: 'restock' | 'sale' | 'adjustment'; quantity: number; note: string } }
  | { ok: false; error: string } {
  const type = raw.type;
  if (type !== 'restock' && type !== 'sale' && type !== 'adjustment') {
    return { ok: false, error: 'Movement type must be restock, sale, or adjustment.' };
  }

  const qty = Number(raw.quantity);
  if (!Number.isFinite(qty) || qty <= 0 || qty > 1_000_000) {
    return { ok: false, error: 'Movement quantity must be greater than zero.' };
  }

  const rounded = Math.round(qty);
  if (type === 'sale' && rounded > availableStock) {
    return {
      ok: false,
      error: `Insufficient stock: only ${availableStock} units available to sell.`,
    };
  }

  const note = sanitizePlainText(raw.note, 140);
  return { ok: true, data: { type, quantity: rounded, note } };
}

export function validateScenarioInput(raw: Record<string, unknown>): ScenarioInput {
  const scenarioName =
    sanitizePlainText(raw.scenarioName, 80) || 'Festive & Seasonal Demand Evaluation';
  const presetId = sanitizePlainText(raw.presetId, 24) || 'custom';
  const rawDemand = Number(raw.demandMultiplierPct);
  const rawLead = Number(raw.leadTimeShockDays);
  const rawInflation = Number(raw.priceInflationPct);

  const demandMultiplierPct = Number.isFinite(rawDemand)
    ? Math.max(-50, Math.min(150, Math.round(rawDemand)))
    : 25;
  const leadTimeShockDays = Number.isFinite(rawLead)
    ? Math.max(0, Math.min(30, Math.round(rawLead)))
    : 3;
  const priceInflationPct = Number.isFinite(rawInflation)
    ? Math.max(-20, Math.min(60, Math.round(rawInflation)))
    : 5;

  const focusCategory =
    raw.focusCategory === 'All' || isValidCategory(raw.focusCategory)
      ? String(raw.focusCategory)
      : 'All';
  const customNotes = sanitizePlainText(raw.customNotes, 300);

  return {
    presetId,
    scenarioName,
    demandMultiplierPct,
    leadTimeShockDays,
    priceInflationPct,
    focusCategory,
    customNotes,
  };
}
