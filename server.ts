import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import {
  INVENTORY_CATEGORIES,
  PRODUCT_UNITS,
  type AIAnalysisResult,
  type ForecastHorizon,
  type InventoryCategory,
  type Product,
  type ProductUnit,
  type ScenarioInput,
} from './shared/types.ts';
import { buildForecastReport, computeProductForecast, getRecentMonthLabels } from './server/forecastEngine.ts';
import { CATEGORY_IMAGES } from './server/seedData.ts';
import { addActivity, loadStore, persistStore } from './server/store.ts';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '4mb' }));

// Security headers for production hardening
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

function isValidCategory(val: unknown): val is InventoryCategory {
  return typeof val === 'string' && (INVENTORY_CATEGORIES as readonly string[]).includes(val);
}

function isValidUnit(val: unknown): val is ProductUnit {
  return typeof val === 'string' && (PRODUCT_UNITS as readonly string[]).includes(val);
}

function sanitizeImageUrl(raw: unknown, category: InventoryCategory): string {
  if (typeof raw !== 'string' || !raw.trim()) {
    return CATEGORY_IMAGES[category];
  }
  const trimmed = raw.trim();
  if (trimmed.startsWith('/src/assets/images/')) {
    return trimmed;
  }
  if (/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/.test(trimmed)) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
  } catch {
    // Fallback to category image if malformed URL
  }
  return CATEGORY_IMAGES[category];
}

function generateSku(category: InventoryCategory, existingCount: number): string {
  const prefix = category
    .split(' ')[0]
    .replace(/[^A-Za-z]/g, '')
    .slice(0, 3)
    .toUpperCase();
  const num = 100 + existingCount + Math.floor(Math.random() * 800);
  return `${prefix}-${num}`;
}

// Health check endpoint (useful for Render zero-downtime checks)
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'SmartStock', timestamp: new Date().toISOString() });
});

// Get full inventory catalog, live forecast classifications, and recent activities
app.get('/api/products', (_req, res) => {
  try {
    const store = loadStore();
    const monthLabels = getRecentMonthLabels(12);
    const enriched = store.products.map((product) => ({
      ...product,
      forecast: computeProductForecast(product, 30, monthLabels),
    }));
    res.json({
      products: enriched,
      activities: store.activities,
      categories: INVENTORY_CATEGORIES,
      units: PRODUCT_UNITS,
    });
  } catch (err) {
    console.error('GET /api/products failed:', err);
    res.status(500).json({ error: 'Unable to load inventory data.' });
  }
});

// Create a new inventory product
app.post('/api/products', (req, res) => {
  try {
    const body = req.body ?? {};
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const supplier = typeof body.supplier === 'string' ? body.supplier.trim() : 'Local Wholesale Supplier';
    const seasonalityTag =
      typeof body.seasonalityTag === 'string' && body.seasonalityTag.trim()
        ? body.seasonalityTag.trim()
        : 'Steady Year-Round';

    if (!name || name.length < 2 || name.length > 100) {
      res.status(400).json({ error: 'Product name must be between 2 and 100 characters.' });
      return;
    }
    if (!isValidCategory(body.category)) {
      res.status(400).json({ error: 'Please select a valid inventory category.' });
      return;
    }
    if (!isValidUnit(body.unit)) {
      res.status(400).json({ error: 'Please select a valid unit of measurement.' });
      return;
    }

    const quantity = Number(body.quantity);
    const purchasePrice = Number(body.purchasePrice);
    const sellingPrice = Number(body.sellingPrice);
    const reorderLevel = Number(body.reorderLevel);
    const maxStockLevel = Number(body.maxStockLevel ?? Math.max(50, reorderLevel * 3));
    const leadTimeDays = Number(body.leadTimeDays ?? 3);

    if (!Number.isFinite(quantity) || quantity < 0) {
      res.status(400).json({ error: 'Quantity must be a non-negative number.' });
      return;
    }
    if (!Number.isFinite(purchasePrice) || purchasePrice <= 0 || !Number.isFinite(sellingPrice) || sellingPrice <= 0) {
      res.status(400).json({ error: 'Purchase price and selling price must be greater than zero.' });
      return;
    }
    if (!Number.isFinite(reorderLevel) || reorderLevel < 0 || !Number.isFinite(leadTimeDays) || leadTimeDays < 1) {
      res.status(400).json({ error: 'Reorder level must be >= 0 and lead time >= 1 day.' });
      return;
    }

    const store = loadStore();
    const rawSku = typeof body.sku === 'string' ? body.sku.trim().toUpperCase() : '';
    const sku = rawSku || generateSku(body.category, store.products.length + 1);

    if (store.products.some((p) => p.sku.toLowerCase() === sku.toLowerCase())) {
      res.status(409).json({ error: `SKU "${sku}" already exists in inventory.` });
      return;
    }

    const baselineMonthly = Math.max(12, Math.round(reorderLevel * 2.2));
    const monthlySales = Array.from({ length: 12 }, (_, idx) =>
      Math.max(4, Math.round(baselineMonthly * (0.9 + ((idx % 4) * 0.06))))
    );
    const monthlyRestocks = monthlySales.map((s) => Math.max(4, Math.round(s * 1.02)));

    const newProduct: Product = {
      id: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sku,
      name,
      category: body.category,
      quantity: Math.round(quantity),
      unit: body.unit,
      purchasePrice: Number(purchasePrice.toFixed(2)),
      sellingPrice: Number(sellingPrice.toFixed(2)),
      reorderLevel: Math.round(reorderLevel),
      maxStockLevel: Math.max(Math.round(reorderLevel) + 10, Math.round(maxStockLevel)),
      leadTimeDays: Math.min(60, Math.max(1, Math.round(leadTimeDays))),
      supplier: supplier.slice(0, 80),
      seasonalityTag: seasonalityTag.slice(0, 60),
      imageUrl: sanitizeImageUrl(body.imageUrl, body.category),
      monthlySales,
      monthlyRestocks,
      updatedAt: new Date().toISOString(),
    };

    store.products.unshift(newProduct);
    addActivity(store, {
      type: 'created',
      productId: newProduct.id,
      productName: newProduct.name,
      sku: newProduct.sku,
      quantityDelta: newProduct.quantity,
      unit: newProduct.unit,
      note: `Added new product (${newProduct.category})`,
    });
    persistStore(store);

    const monthLabels = getRecentMonthLabels(12);
    res.status(201).json({
      product: {
        ...newProduct,
        forecast: computeProductForecast(newProduct, 30, monthLabels),
      },
    });
  } catch (err) {
    console.error('POST /api/products failed:', err);
    res.status(500).json({ error: 'Failed to create product.' });
  }
});

// Update an existing product
app.put('/api/products/:id', (req, res) => {
  try {
    const store = loadStore();
    const idx = store.products.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    const existing = store.products[idx];
    const body = req.body ?? {};

    const name = typeof body.name === 'string' ? body.name.trim() : existing.name;
    if (!name || name.length < 2 || name.length > 100) {
      res.status(400).json({ error: 'Product name must be between 2 and 100 characters.' });
      return;
    }

    const category = body.category !== undefined ? body.category : existing.category;
    if (!isValidCategory(category)) {
      res.status(400).json({ error: 'Invalid inventory category.' });
      return;
    }

    const unit = body.unit !== undefined ? body.unit : existing.unit;
    if (!isValidUnit(unit)) {
      res.status(400).json({ error: 'Invalid unit of measurement.' });
      return;
    }

    const quantity = body.quantity !== undefined ? Number(body.quantity) : existing.quantity;
    const purchasePrice = body.purchasePrice !== undefined ? Number(body.purchasePrice) : existing.purchasePrice;
    const sellingPrice = body.sellingPrice !== undefined ? Number(body.sellingPrice) : existing.sellingPrice;
    const reorderLevel = body.reorderLevel !== undefined ? Number(body.reorderLevel) : existing.reorderLevel;
    const maxStockLevel = body.maxStockLevel !== undefined ? Number(body.maxStockLevel) : existing.maxStockLevel;
    const leadTimeDays = body.leadTimeDays !== undefined ? Number(body.leadTimeDays) : existing.leadTimeDays;

    if (!Number.isFinite(quantity) || quantity < 0) {
      res.status(400).json({ error: 'Quantity must be a non-negative number.' });
      return;
    }
    if (!Number.isFinite(purchasePrice) || purchasePrice <= 0 || !Number.isFinite(sellingPrice) || sellingPrice <= 0) {
      res.status(400).json({ error: 'Prices must be greater than zero.' });
      return;
    }

    const sku =
      typeof body.sku === 'string' && body.sku.trim()
        ? body.sku.trim().toUpperCase()
        : existing.sku;

    if (store.products.some((p, i) => i !== idx && p.sku.toLowerCase() === sku.toLowerCase())) {
      res.status(409).json({ error: `SKU "${sku}" is already used by another product.` });
      return;
    }

    const updated: Product = {
      ...existing,
      sku,
      name,
      category,
      unit,
      quantity: Math.round(quantity),
      purchasePrice: Number(purchasePrice.toFixed(2)),
      sellingPrice: Number(sellingPrice.toFixed(2)),
      reorderLevel: Math.max(0, Math.round(reorderLevel)),
      maxStockLevel: Math.max(Math.round(reorderLevel) + 10, Math.round(maxStockLevel)),
      leadTimeDays: Math.min(60, Math.max(1, Math.round(leadTimeDays))),
      supplier:
        typeof body.supplier === 'string' && body.supplier.trim()
          ? body.supplier.trim().slice(0, 80)
          : existing.supplier,
      seasonalityTag:
        typeof body.seasonalityTag === 'string' && body.seasonalityTag.trim()
          ? body.seasonalityTag.trim().slice(0, 60)
          : existing.seasonalityTag,
      imageUrl:
        body.imageUrl !== undefined
          ? sanitizeImageUrl(body.imageUrl, category)
          : category !== existing.category && existing.imageUrl === CATEGORY_IMAGES[existing.category]
            ? CATEGORY_IMAGES[category]
            : existing.imageUrl,
      updatedAt: new Date().toISOString(),
    };

    store.products[idx] = updated;
    addActivity(store, {
      type: 'updated',
      productId: updated.id,
      productName: updated.name,
      sku: updated.sku,
      quantityDelta: updated.quantity - existing.quantity,
      unit: updated.unit,
      note: 'Updated product details & stock thresholds',
    });
    persistStore(store);

    const monthLabels = getRecentMonthLabels(12);
    res.json({
      product: {
        ...updated,
        forecast: computeProductForecast(updated, 30, monthLabels),
      },
    });
  } catch (err) {
    console.error('PUT /api/products/:id failed:', err);
    res.status(500).json({ error: 'Failed to update product.' });
  }
});

// Record stock movement (restock purchase, sale outbound, or physical count adjustment)
app.post('/api/products/:id/movement', (req, res) => {
  try {
    const store = loadStore();
    const idx = store.products.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    const body = req.body ?? {};
    const type = body.type;
    const amount = Number(body.quantity);
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 140) : '';

    if (type !== 'restock' && type !== 'sale' && type !== 'adjustment') {
      res.status(400).json({ error: 'Movement type must be restock, sale, or adjustment.' });
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({ error: 'Movement quantity must be greater than zero.' });
      return;
    }

    const product = store.products[idx];
    const rounded = Math.round(amount);
    let nextQuantity = product.quantity;
    let delta = 0;

    if (type === 'restock') {
      nextQuantity = product.quantity + rounded;
      delta = rounded;
      const lastIdx = product.monthlyRestocks.length - 1;
      if (lastIdx >= 0) {
        product.monthlyRestocks[lastIdx] += rounded;
      }
    } else if (type === 'sale') {
      if (rounded > product.quantity) {
        res.status(400).json({
          error: `Insufficient stock: only ${product.quantity} ${product.unit} available to sell.`,
        });
        return;
      }
      nextQuantity = product.quantity - rounded;
      delta = -rounded;
      const lastIdx = product.monthlySales.length - 1;
      if (lastIdx >= 0) {
        product.monthlySales[lastIdx] += rounded;
      }
    } else {
      delta = rounded - product.quantity;
      nextQuantity = rounded;
    }

    const updated: Product = {
      ...product,
      quantity: nextQuantity,
      updatedAt: new Date().toISOString(),
    };
    store.products[idx] = updated;

    addActivity(store, {
      type,
      productId: updated.id,
      productName: updated.name,
      sku: updated.sku,
      quantityDelta: delta,
      unit: updated.unit,
      note:
        note ||
        (type === 'restock'
          ? `Purchase order received (+${rounded} ${updated.unit})`
          : type === 'sale'
            ? `Retail/B2B sale recorded (-${rounded} ${updated.unit})`
            : `Stock audit set to ${rounded} ${updated.unit}`),
    });
    persistStore(store);

    const monthLabels = getRecentMonthLabels(12);
    res.json({
      product: {
        ...updated,
        forecast: computeProductForecast(updated, 30, monthLabels),
      },
      activities: store.activities,
    });
  } catch (err) {
    console.error('POST /api/products/:id/movement failed:', err);
    res.status(500).json({ error: 'Failed to record stock movement.' });
  }
});

// Delete a product
app.delete('/api/products/:id', (req, res) => {
  try {
    const store = loadStore();
    const idx = store.products.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    const [removed] = store.products.splice(idx, 1);
    addActivity(store, {
      type: 'deleted',
      productId: removed.id,
      productName: removed.name,
      sku: removed.sku,
      quantityDelta: -removed.quantity,
      unit: removed.unit,
      note: `Removed SKU from active catalog`,
    });
    persistStore(store);

    res.json({ deletedId: removed.id });
  } catch (err) {
    console.error('DELETE /api/products/:id failed:', err);
    res.status(500).json({ error: 'Failed to delete product.' });
  }
});

// Deterministic demand forecasting & inventory optimization endpoint
app.get('/api/forecast', (req, res) => {
  try {
    const rawHorizon = Number(req.query.horizon);
    const horizon: ForecastHorizon =
      rawHorizon === 60 ? 60 : rawHorizon === 90 ? 90 : 30;
    const rawCategory = typeof req.query.category === 'string' ? req.query.category : 'All';
    const selectedCategory =
      rawCategory === 'All' || isValidCategory(rawCategory) ? rawCategory : 'All';

    const store = loadStore();
    const report = buildForecastReport(store.products, horizon, selectedCategory);
    res.json(report);
  } catch (err) {
    console.error('GET /api/forecast failed:', err);
    res.status(500).json({ error: 'Failed to compute demand forecast.' });
  }
});

// Server-side Gemini AI scenario analysis & reasoning under uncertainty
app.post('/api/ai/analyze', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    res.status(503).json({
      error:
        'AI Scenario Advisor requires GEMINI_API_KEY in server environment secrets. Statistical forecasting and EOQ optimization remain active.',
    });
    return;
  }

  try {
    const body = (req.body ?? {}) as Partial<ScenarioInput>;
    const scenarioName =
      typeof body.scenarioName === 'string' && body.scenarioName.trim()
        ? body.scenarioName.trim().slice(0, 80)
        : 'Festive & Seasonal Demand Evaluation';
    const demandMultiplierPct = Math.max(-50, Math.min(150, Number(body.demandMultiplierPct ?? 25)));
    const leadTimeShockDays = Math.max(0, Math.min(30, Number(body.leadTimeShockDays ?? 3)));
    const priceInflationPct = Math.max(-20, Math.min(60, Number(body.priceInflationPct ?? 5)));
    const focusCategory =
      typeof body.focusCategory === 'string' &&
      (body.focusCategory === 'All' || isValidCategory(body.focusCategory))
        ? body.focusCategory
        : 'All';
    const customNotes =
      typeof body.customNotes === 'string' ? body.customNotes.trim().slice(0, 300) : '';

    const store = loadStore();
    const report = buildForecastReport(store.products, 30, focusCategory);

    // Select top 18 highest-risk / highest-demand items for compact grounded context
    const priorityItems = report.productForecasts.slice(0, 18).map((item) => ({
      sku: item.sku,
      name: item.name,
      category: item.category,
      unit: item.unit,
      currentStock: item.currentStock,
      avgDailyDemand: item.avgDailyDemand,
      demandStdDev: item.demandStdDev,
      predicted30dDemand: item.predictedDemand,
      predictionInterval90: [item.lowerBound, item.upperBound],
      leadTimeDays: item.leadTimeDays,
      safetyStock: item.safetyStock,
      reorderPoint: item.reorderPoint,
      recommendedOrderQty: item.recommendedOrderQty,
      purchasePriceInr: item.purchasePrice,
      daysOfSupply: item.daysOfSupply,
      stockoutProbabilityPct: item.stockoutProbability,
      status: item.status,
    }));

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const prompt = [
      `You are a senior supply-chain & retail inventory strategist for an Indian grocery and consumer staples business using SmartStock.`,
      `Analyze the live inventory and statistical forecast data below under the requested stress scenario, reasoning explicitly under demand and supply uncertainty.`,
      ``,
      `SCENARIO PARAMETERS:`,
      `- Scenario Name: ${scenarioName}`,
      `- Category Scope: ${focusCategory}`,
      `- Demand Shock: ${demandMultiplierPct >= 0 ? '+' : ''}${demandMultiplierPct}%`,
      `- Supplier Lead-Time Delay: +${leadTimeShockDays} days`,
      `- Supplier Cost Inflation: ${priceInflationPct >= 0 ? '+' : ''}${priceInflationPct}%`,
      customNotes ? `- Manager Context: ${customNotes}` : '',
      ``,
      `AGGREGATE STORE SNAPSHOT (${focusCategory}):`,
      JSON.stringify(report.summary),
      ``,
      `HIGHEST-PRIORITY SKUs (with 90% prediction intervals & stockout risk):`,
      JSON.stringify(priorityItems),
      ``,
      `INSTRUCTIONS:`,
      `1. Ground every SKU, unit, quantity, and INR cost strictly in the provided inventory snapshot.`,
      `2. Explain how the demand variance (90% prediction interval) and +${leadTimeShockDays} day lead-time delay compound stockout probability.`,
      `3. Provide 5 to 7 concrete purchasing actions prioritized by urgency ('immediate', 'this_week', 'monitor'), adjusting order quantities for the scenario shock.`,
      `4. Include realistic cash requirement in INR and concise operational risk mitigation steps.`,
    ]
      .filter(Boolean)
      .join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction:
          'Return crisp, quantitative Indian retail supply chain recommendations in valid JSON matching the schema. Never invent SKUs outside the provided dataset.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scenarioTitle: { type: Type.STRING },
            executiveSummary: { type: Type.STRING },
            uncertaintyReasoning: { type: Type.STRING },
            projectedRevenueImpact: { type: Type.STRING },
            cashRequiredInr: { type: Type.NUMBER },
            riskMitigationSteps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            recommendedPurchases: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  sku: { type: Type.STRING },
                  productName: { type: Type.STRING },
                  urgency: { type: Type.STRING },
                  recommendedQty: { type: Type.NUMBER },
                  unit: { type: Type.STRING },
                  estimatedCostInr: { type: Type.NUMBER },
                  rationale: { type: Type.STRING },
                },
                required: [
                  'sku',
                  'productName',
                  'urgency',
                  'recommendedQty',
                  'unit',
                  'estimatedCostInr',
                  'rationale',
                ],
              },
            },
          },
          required: [
            'scenarioTitle',
            'executiveSummary',
            'uncertaintyReasoning',
            'projectedRevenueImpact',
            'cashRequiredInr',
            'riskMitigationSteps',
            'recommendedPurchases',
          ],
        },
      },
    });

    const rawText = (response.text ?? '').trim();
    if (!rawText) {
      res.status(502).json({ error: 'Gemini returned an empty response. Please try again.' });
      return;
    }

    const parsed = JSON.parse(rawText) as Omit<AIAnalysisResult, 'generatedAt' | 'model'>;
    const validUrgencies = new Set(['immediate', 'this_week', 'monitor']);

    const sanitizedResult: AIAnalysisResult = {
      generatedAt: new Date().toISOString(),
      model: 'gemini-4-hydrogen',
      scenarioTitle: parsed.scenarioTitle || scenarioName,
      executiveSummary: parsed.executiveSummary || '',
      uncertaintyReasoning: parsed.uncertaintyReasoning || '',
      projectedRevenueImpact: parsed.projectedRevenueImpact || '',
      cashRequiredInr: Math.max(0, Math.round(Number(parsed.cashRequiredInr) || 0)),
      riskMitigationSteps: Array.isArray(parsed.riskMitigationSteps)
        ? parsed.riskMitigationSteps.slice(0, 6).map(String)
        : [],
      recommendedPurchases: Array.isArray(parsed.recommendedPurchases)
        ? parsed.recommendedPurchases.slice(0, 8).map((item) => ({
            sku: String(item.sku || ''),
            productName: String(item.productName || ''),
            urgency: validUrgencies.has(item.urgency) ? item.urgency : 'this_week',
            recommendedQty: Math.max(1, Math.round(Number(item.recommendedQty) || 1)),
            unit: String(item.unit || 'units'),
            estimatedCostInr: Math.max(0, Math.round(Number(item.estimatedCostInr) || 0)),
            rationale: String(item.rationale || ''),
          }))
        : [],
    };

    res.json(sanitizedResult);
  } catch (err: unknown) {
    console.error('POST /api/ai/analyze failed:', err);
    const message =
      err instanceof Error ? err.message : 'Unable to reach Gemini AI service.';
    res.status(502).json({
      error: `AI scenario analysis failed: ${message}`,
    });
  }
});

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        next();
        return;
      }
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Production build not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SmartStock server running on http://0.0.0.0:${PORT} (${isProduction ? 'production' : 'development'})`);
  });
}

startServer();
