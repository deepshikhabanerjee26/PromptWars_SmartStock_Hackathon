# SmartStock — AI Inventory & Demand Predictor

## Problem Statement
Small businesses frequently face inventory shortages or excess stock because they cannot accurately predict customer demand. Develop an AI system that analyzes historical sales, seasonal trends, and inventory data to recommend purchasing decisions. Advanced prompt challenge: Demand forecasting, scenario analysis, inventory optimization, and reasoning under uncertainty.

## How SmartStock Solves It
- **Analyze historical sales & seasonal trends** → Time-series exponential smoothing and 12-month seasonal index decomposition on the **Dashboard** and **Demand Forecast** pages (`src/lib/forecasting.ts`).
- **Analyze inventory data to prevent shortages or excess stock** → Live stock-health classification (`Critical`, `Low Stock`, `Reorder`, `Normal`, `Excess`) across 13 Indian retail categories in **Inventory Catalog** and **Priority Queue**.
- **Recommend purchasing decisions (Inventory Optimization)** → Automated 95% service-level Safety Stock, dynamic Reorder Points (ROP), Economic Order Quantity (EOQ), and INR purchase order cost estimates with one-click restocking.
- **Demand forecasting & reasoning under uncertainty** → Explicit **Worst-Case (Lower 90%)**, **Expected**, and **Best-Case (Upper 90%)** demand projections paired with lead-time stockout probability percentages.
- **Scenario analysis for purchasing under risk** → Interactive **Scenario Simulator & AI Advisor** stress-testing demand surges, supplier lead-time delays, and wholesale cost inflation using deterministic bounds plus server-side Gemini AI reasoning.

## Features
- **Operations Dashboard**: Valuation (`₹`), active SKU/unit telemetry, shortage & reorder alerts, Best/Expected/Worst demand cards, historical vs. forecast curves, 6-month stock movement bars, clickable category distribution, recent activity feed, and a dedicated **About / How It Works** panel.
- **Indian Retail Inventory Catalog**: 68 seeded products spanning 13 Indian categories (*Rice and Grains, Flour and Baking Products, Pulses and Lentils, Oils and Ghee, Spices and Masalas, Salt and Sweeteners, Dairy Products, Snacks and Packaged Foods, Beverages, Personal Care Products, Household Cleaning Products, Vegetables, Fruits*) with studio product thumbnails, Table/Card view toggle, live search, filters, sorting, pagination, Add/Edit/Delete CRUD, custom photo upload, and Restock/Sale/Audit stock movements.
- **Demand Forecasting & AI Scenario Studio**: 30/60/90-day horizon projections, product-wise EOQ tables, instant deterministic scenario modeling, and server-side Gemini AI recommendations (`POST /api/ai/analyze`).
- **Purchasing Priority Queue**: Urgency-tiered action queue ranked by stockout probability and days of supply.

## Tech Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, custom responsive SVG charts with accessible data table alternatives
- **Backend**: Node.js (v22+), Express, `@google/genai` (`gemini-4-hydrogen`)
- **Testing**: Vitest (`vitest run`)
- **Persistence**: Atomic server-side JSON store (`data/smartstock-db.json`)

## Setup and Run Instructions
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables by copying `.env.example` to `.env`:
   - `GEMINI_API_KEY` — Required for AI Scenario Analysis (`POST /api/ai/analyze`)
   - `PORT` — Optional server port (defaults to `3000`)
   - `APP_URL` — Optional public URL for CORS origin verification in production
3. Run in development mode:
   ```bash
   npm run dev
   ```
4. Build and run in production mode (Render Web Service: build `npm install && npm run build`, start `npm start`):
   ```bash
   npm run build
   npm start
   ```

## How to Run Tests
Run the pure forecasting, seasonal-trend, stock-classification, scenario-modeling, and input-validation test suite with:
```bash
npm test
```
To run TypeScript type-checking and verify production bundling:
```bash
npm run lint
npm run build
```

## Security Notes
- **Server-Only API Keys**: `GEMINI_API_KEY` is read strictly from `process.env` in `server.ts` and is never exposed to client bundles. `.env` is ignored via `.gitignore`, and `.env.example` contains placeholders only.
- **Input Validation & Sanitization**: Both client forms and Express API endpoints validate types, ranges, categories, units, and string lengths using shared logic in `src/lib/validation.ts`, stripping HTML tags and unsafe URI schemes (`javascript:`, `data:text/html`).
- **AI Output Escaping**: All AI-generated strings are sanitized via `escapeDisplayText` on the server and before rendering in React; `dangerouslySetInnerHTML` and `eval` are never used.
- **Headers, CORS & Rate Limiting**: `server.ts` sets strict security headers (CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, HSTS in production), restricts CORS to the app's own origin / `APP_URL`, applies sliding-window rate limiting on `/api/*` (and stricter limits on `/api/ai/analyze`), and returns friendly error messages without stack traces.

## Accessibility Notes
- **Landmarks & Headings**: Uses semantic `<header>`, `<nav>`, `<main>`, `<section>`, and `<footer>` landmarks, one `<h1>` per view, and sequential `<h2>` / `<h3>` headings.
- **Keyboard & Screen Readers**: Includes a focus-visible `"Skip to main content"` link, high-contrast `:focus-visible` outlines, an `aria-live="polite"` announcement region for dynamic updates, `<html lang="en">`, explicit `<label htmlFor>` associations on form inputs, `aria-label` on icon buttons, and descriptive `alt` text on images.
- **Charts & Contrast**: Every chart includes a text summary and a toggleable accessible HTML `<table>` alternative. Text colors meet WCAG AA (`>= 4.5:1`), status indicators pair color with icons and text labels, and animations respect `@media (prefers-reduced-motion: reduce)`.

## Assumptions
- **Demand Uncertainty Model**: Monthly historical demand variance ($\sigma$) is scaled across the chosen forecast horizon to compute a 90% prediction interval (`Worst-Case` lower bound and `Best-Case` upper bound around the `Expected` forecast), while Safety Stock uses a 95% service level ($Z = 1.65$) adjusted for supplier lead time ($\sqrt{L}$).
- **Missing or Zero History**: Newly added products with empty, zero, negative, or partial (< 12 months) sales histories default smoothly to neutral (`1.0`) seasonal indices for unobserved months so forecasts never produce `NaN` or division-by-zero errors.
- **Persistence**: Inventory data persists to `data/smartstock-db.json` on the server; on ephemeral container hosts without a persistent disk, state resets to the 68-item Indian retail seed catalog upon redeploy.
