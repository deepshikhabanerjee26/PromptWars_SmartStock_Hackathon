import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
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
} from './shared/types.ts';
import {
  buildForecastReport,
  computeProductForecast,
  getRecentMonthLabels,
} from './server/forecastEngine.ts';
import { CATEGORY_IMAGES } from './server/seedData.ts';
import { addActivity, loadStore, persistStore } from './server/store.ts';
import {
  escapeDisplayText,
  isValidCategory,
  validateMovementInput,
  validateProductInput,
  validateScenarioInput,
} from './src/lib/validation.ts';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Trust reverse proxy headers (Render / Cloud Run) for accurate client IP & protocol checks
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '4mb' }));

// Security headers (helmet-equivalent) applied to every HTTP response
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: https: http:",
      "connect-src 'self' ws: wss:",
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; ')
  );
  if (isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Strict same-origin / APP_URL CORS policy for /api/* routes
function isAllowedOrigin(req: Request, origin: string): boolean {
  try {
    const parsedOrigin = new URL(origin);
    const hostHeader = req.get('x-forwarded-host') || req.get('host');
    if (hostHeader && parsedOrigin.host === hostHeader) {
      return true;
    }
    const configuredAppUrl = process.env.APP_URL?.trim();
    if (configuredAppUrl) {
      const parsedAppUrl = new URL(configuredAppUrl);
      if (parsedOrigin.origin === parsedAppUrl.origin) {
        return true;
      }
    }
  } catch {
    return false;
  }
  return false;
}

app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  const origin = req.get('origin');
  if (origin) {
    if (!isAllowedOrigin(req, origin)) {
      res.status(403).json({ error: 'Cross-origin API access is not permitted.' });
      return;
    }
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

// Sliding-window in-memory rate limiter for API routes
function createRateLimiter(maxRequests: number, windowMs: number) {
  const hits = new Map<string, number[]>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter((ts) => now - ts < windowMs);

    if (recent.length >= maxRequests) {
      res.setHeader('Retry-After', String(Math.ceil(windowMs / 1000)));
      res.status(429).json({
        error: 'Too many requests in a short period. Please wait a moment and try again.',
      });
      return;
    }

    recent.push(now);
    hits.set(key, recent);

    // Opportunistic cleanup so memory stays bounded
    if (hits.size > 2000) {
      for (const [ip, timestamps] of hits.entries()) {
        if (timestamps.every((ts) => now - ts >= windowMs)) {
          hits.delete(ip);
        }
      }
    }
    next();
  };
}

const apiLimiter = createRateLimiter(120, 60_000);
const aiLimiter = createRateLimiter(12, 60_000);
app.use('/api', apiLimiter);

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

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'SmartStock', timestamp: new Date().toISOString() });
});

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
  } catch {
    res.status(500).json({ error: 'Unable to load inventory data right now.' });
  }
});

app.post('/api/products', (req, res) => {
  try {
    const validated = validateProductInput((req.body ?? {}) as Record<string, unknown>);
    if (!validated.ok) {
      res.status(400).json({ error: validated.error });
      return;
    }

    const store = loadStore();
    const sku = validated.data.sku || generateSku(validated.data.category, store.products.length + 1);

    if (store.products.some((p) => p.sku.toLowerCase() === sku.toLowerCase())) {
      res.status(409).json({ error: `SKU "${sku}" already exists in inventory.` });
      return;
    }

    const baselineMonthly = Math.max(12, Math.round(validated.data.reorderLevel * 2.2));
    const monthlySales = Array.from({ length: 12 }, (_, idx) =>
      Math.max(4, Math.round(baselineMonthly * (0.9 + (idx % 4) * 0.06)))
    );
    const monthlyRestocks = monthlySales.map((s) => Math.max(4, Math.round(s * 1.02)));

    const newProduct: Product = {
      id: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sku,
      name: validated.data.name,
      category: validated.data.category,
      quantity: validated.data.quantity,
      unit: validated.data.unit,
      purchasePrice: validated.data.purchasePrice,
      sellingPrice: validated.data.sellingPrice,
      reorderLevel: validated.data.reorderLevel,
      maxStockLevel: validated.data.maxStockLevel,
      leadTimeDays: validated.data.leadTimeDays,
      supplier: validated.data.supplier,
      seasonalityTag: validated.data.seasonalityTag,
      imageUrl: sanitizeImageUrl(validated.data.imageUrl, validated.data.category),
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
  } catch {
    res.status(500).json({ error: 'Unable to save the new product. Please check your entries.' });
  }
});

app.put('/api/products/:id', (req, res) => {
  try {
    const store = loadStore();
    const idx = store.products.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    const existing = store.products[idx];
    const body = (req.body ?? {}) as Record<string, unknown>;
    const merged = {
      name: body.name ?? existing.name,
      sku: body.sku ?? existing.sku,
      category: body.category ?? existing.category,
      unit: body.unit ?? existing.unit,
      quantity: body.quantity ?? existing.quantity,
      purchasePrice: body.purchasePrice ?? existing.purchasePrice,
      sellingPrice: body.sellingPrice ?? existing.sellingPrice,
      reorderLevel: body.reorderLevel ?? existing.reorderLevel,
      maxStockLevel: body.maxStockLevel ?? existing.maxStockLevel,
      leadTimeDays: body.leadTimeDays ?? existing.leadTimeDays,
      supplier: body.supplier ?? existing.supplier,
      seasonalityTag: body.seasonalityTag ?? existing.seasonalityTag,
      imageUrl: body.imageUrl ?? existing.imageUrl,
    };

    const validated = validateProductInput(merged);
    if (!validated.ok) {
      res.status(400).json({ error: validated.error });
      return;
    }

    const sku = validated.data.sku || existing.sku;
    if (store.products.some((p, i) => i !== idx && p.sku.toLowerCase() === sku.toLowerCase())) {
      res.status(409).json({ error: `SKU "${sku}" is already used by another product.` });
      return;
    }

    const updated: Product = {
      ...existing,
      sku,
      name: validated.data.name,
      category: validated.data.category,
      unit: validated.data.unit,
      quantity: validated.data.quantity,
      purchasePrice: validated.data.purchasePrice,
      sellingPrice: validated.data.sellingPrice,
      reorderLevel: validated.data.reorderLevel,
      maxStockLevel: validated.data.maxStockLevel,
      leadTimeDays: validated.data.leadTimeDays,
      supplier: validated.data.supplier,
      seasonalityTag: validated.data.seasonalityTag,
      imageUrl:
        body.imageUrl !== undefined
          ? sanitizeImageUrl(body.imageUrl, validated.data.category)
          : validated.data.category !== existing.category &&
              existing.imageUrl === CATEGORY_IMAGES[existing.category]
            ? CATEGORY_IMAGES[validated.data.category]
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
  } catch {
    res.status(500).json({ error: 'Unable to update product details.' });
  }
});

app.post('/api/products/:id/movement', (req, res) => {
  try {
    const store = loadStore();
    const idx = store.products.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    const product = store.products[idx];
    const validated = validateMovementInput((req.body ?? {}) as Record<string, unknown>, product.quantity);
    if (!validated.ok) {
      res.status(400).json({ error: validated.error });
      return;
    }

    const { type, quantity: rounded, note } = validated.data;
    let nextQuantity = product.quantity;
    let delta = 0;

    if (type === 'restock') {
      nextQuantity = product.quantity + rounded;
      delta = rounded;
      const lastIdx = product.monthlyRestocks.length - 1;
      if (lastIdx >= 0) product.monthlyRestocks[lastIdx] += rounded;
    } else if (type === 'sale') {
      nextQuantity = product.quantity - rounded;
      delta = -rounded;
      const lastIdx = product.monthlySales.length - 1;
      if (lastIdx >= 0) product.monthlySales[lastIdx] += rounded;
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
  } catch {
    res.status(500).json({ error: 'Unable to record stock movement.' });
  }
});

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
      note: 'Removed SKU from active catalog',
    });
    persistStore(store);

    res.json({ deletedId: removed.id });
  } catch {
    res.status(500).json({ error: 'Unable to delete product.' });
  }
});

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
  } catch {
    res.status(500).json({ error: 'Unable to compute demand forecast.' });
  }
});

// Server-side Gemini AI scenario advisor (key read strictly from process.env)
app.post('/api/ai/analyze', aiLimiter, async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    res.status(503).json({
      error:
        'AI Scenario Advisor requires GEMINI_API_KEY in server environment secrets. Statistical forecasting and scenario stress-testing remain active.',
    });
    return;
  }

  try {
    const scenario = validateScenarioInput((req.body ?? {}) as Record<string, unknown>);
    const store = loadStore();
    const report = buildForecastReport(store.products, 30, scenario.focusCategory);

    const priorityItems = report.productForecasts.slice(0, 18).map((item) => ({
      sku: item.sku,
      name: item.name,
      category: item.category,
      unit: item.unit,
      currentStock: item.currentStock,
      avgDailyDemand: item.avgDailyDemand,
      demandStdDev: item.demandStdDev,
      worstCase30d: item.lowerBound,
      expected30d: item.predictedDemand,
      bestCase30d: item.upperBound,
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
      'You are a senior supply-chain & retail inventory strategist for an Indian grocery and consumer staples business using SmartStock.',
      'Analyze the live inventory and statistical forecast data below under the requested stress scenario, reasoning explicitly under demand and supply uncertainty.',
      '',
      'SCENARIO PARAMETERS:',
      `- Scenario Name: ${scenario.scenarioName}`,
      `- Category Scope: ${scenario.focusCategory}`,
      `- Demand Shock: ${scenario.demandMultiplierPct >= 0 ? '+' : ''}${scenario.demandMultiplierPct}%`,
      `- Supplier Lead-Time Delay: +${scenario.leadTimeShockDays} days`,
      `- Supplier Cost Inflation: ${scenario.priceInflationPct >= 0 ? '+' : ''}${scenario.priceInflationPct}%`,
      scenario.customNotes ? `- Manager Context: ${scenario.customNotes}` : '',
      '',
      `AGGREGATE STORE SNAPSHOT (${scenario.focusCategory}):`,
      JSON.stringify(report.summary),
      '',
      'HIGHEST-PRIORITY SKUs (with worst/expected/best 90% prediction intervals):',
      JSON.stringify(priorityItems),
      '',
      'INSTRUCTIONS:',
      '1. Ground every SKU, unit, quantity, and INR cost strictly in the provided inventory snapshot.',
      `2. Explain how the worst-to-best demand spread and +${scenario.leadTimeShockDays} day lead-time delay compound stockout probability.`,
      "3. Provide 5 to 7 concrete purchasing actions prioritized by urgency ('immediate', 'this_week', 'monitor'), adjusting order quantities for the scenario shock.",
      '4. Include realistic cash requirement in INR and concise operational risk mitigation steps.',
    ]
      .filter(Boolean)
      .join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction:
          'Return crisp, quantitative Indian retail supply chain recommendations in valid plain-text JSON matching the schema. Never invent SKUs outside the provided dataset and never include HTML tags.',
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
      res.status(502).json({ error: 'The AI service returned an empty response. Please try again.' });
      return;
    }

    const parsed = JSON.parse(rawText) as Omit<AIAnalysisResult, 'generatedAt' | 'model'>;
    const validUrgencies = new Set(['immediate', 'this_week', 'monitor']);

    // Escape and sanitize all AI-generated fields before returning to the client
    const sanitizedResult: AIAnalysisResult = {
      generatedAt: new Date().toISOString(),
      model: 'gemini-4-hydrogen',
      scenarioTitle: escapeDisplayText(parsed.scenarioTitle) || scenario.scenarioName,
      executiveSummary: escapeDisplayText(parsed.executiveSummary),
      uncertaintyReasoning: escapeDisplayText(parsed.uncertaintyReasoning),
      projectedRevenueImpact: escapeDisplayText(parsed.projectedRevenueImpact),
      cashRequiredInr: Math.max(0, Math.round(Number(parsed.cashRequiredInr) || 0)),
      riskMitigationSteps: Array.isArray(parsed.riskMitigationSteps)
        ? parsed.riskMitigationSteps.slice(0, 6).map((s) => escapeDisplayText(s))
        : [],
      recommendedPurchases: Array.isArray(parsed.recommendedPurchases)
        ? parsed.recommendedPurchases.slice(0, 8).map((item) => ({
            sku: escapeDisplayText(item.sku),
            productName: escapeDisplayText(item.productName),
            urgency: validUrgencies.has(item.urgency) ? item.urgency : 'this_week',
            recommendedQty: Math.max(1, Math.round(Number(item.recommendedQty) || 1)),
            unit: escapeDisplayText(item.unit || 'units'),
            estimatedCostInr: Math.max(0, Math.round(Number(item.estimatedCostInr) || 0)),
            rationale: escapeDisplayText(item.rationale),
          }))
        : [],
    };

    res.json(sanitizedResult);
  } catch {
    res.status(502).json({
      error:
        'Unable to reach the AI scenario service right now. Deterministic scenario estimates remain available above.',
    });
  }
});

// Friendly fallback error handler (never exposes raw stack traces)
app.use((_err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({ error: 'An unexpected server error occurred. Please try again.' });
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
    process.stdout.write(
      `SmartStock server listening on http://0.0.0.0:${PORT} (${isProduction ? 'production' : 'development'})\n`
    );
  });
}

startServer();
