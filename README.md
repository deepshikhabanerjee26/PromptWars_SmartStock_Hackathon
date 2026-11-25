# SmartStock — AI Inventory & Demand Predictor

SmartStock is a full-stack inventory management, statistical demand forecasting, and AI scenario-analysis platform tailored for Indian retail and grocery operations.

## Implemented Features
- **Operations Dashboard**: Real-time inventory valuation (`₹`), active SKU & unit counts, priority stock alerts, 30-day predicted demand, historical vs. forecast curves, inbound/outbound stock movement comparison, category-wise distribution, and live activity feed.
- **Indian Retail Inventory Catalog**: Pre-populated across all 13 Indian grocery & household categories (*Rice and Grains, Flour and Baking Products, Pulses and Lentils, Oils and Ghee, Spices and Masalas, Salt and Sweeteners, Dairy Products, Snacks and Packaged Foods, Beverages, Personal Care Products, Household Cleaning Products, Vegetables, Fruits*) with studio product thumbnails, Table/Card view toggle, live search, category/status filters, sorting, pagination, full Add/Edit/Delete CRUD, custom image upload, and Restock/Sale/Audit stock movements.
- **Demand Forecasting & Optimization Engine**: Computes 30/60/90-day seasonal exponential smoothing forecasts, 90% prediction intervals, 95% service-level Safety Stock, Reorder Point (ROP), Economic Order Quantity (EOQ), Days of Supply, and Stockout Probability.
- **AI Scenario Simulator & Reasoning Under Uncertainty**: Server-side Gemini integration (`@google/genai` with `gemini-4-hydrogen`) that evaluates demand surges, supplier lead-time delays, and wholesale price inflation against live store inventory.
- **Priority Reorder Queue**: Urgency-tiered replenishment queue (`Critical Stock`, `Low Stock`, `Reorder Soon`, `Normal Stock`) with one-click PO restocking.

## Technology Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, custom responsive SVG visualizations
- **Backend**: Node.js (v22+), Express, `@google/genai` SDK
- **Persistence**: Atomic server-side JSON store (`data/smartstock-db.json`) initialized from realistic Indian retail seed data

## Project File Structure
```
├── server.ts                  # Express server, API routes, Vite dev middleware & prod static host
├── shared/types.ts            # Shared TypeScript interfaces and category/unit definitions
├── server/
│   ├── forecastEngine.ts      # Seasonal demand forecasting, EOQ, safety stock & risk math
│   ├── seedData.ts            # 13-category Indian retail inventory seed dataset
│   └── store.ts               # Persistent JSON datastore
├── src/
│   ├── App.tsx                # Application shell, routing, modals & state synchronization
│   ├── index.css              # Design tokens (Forest Emerald & Saffron Gold theme)
│   ├── lib/                   # API client & INR/date formatters
│   ├── assets/images/         # Generated studio product & manager imagery
│   └── components/            # Layout, charts, modals, UI primitives & 4 main pages
└── package.json
```

## Local Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables (copy `.env.example` to `.env` and add your key):
   - `GEMINI_API_KEY`: Required for AI Scenario Analysis (`POST /api/ai/analyze`)
   - `PORT`: Optional (defaults to `3000`)
3. Start development server:
   ```bash
   npm run dev
   ```

## Render Deployment Configuration
Deploy as a **Render Web Service** (Node.js runtime):
- **Main Server Entry-Point**: `server.ts`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start` (runs `node server.ts`, listening on `0.0.0.0` and `process.env.PORT`)
- **Required Environment Variables**:
  - `NODE_ENV=production`
  - `GEMINI_API_KEY=<your-gemini-api-key>`
