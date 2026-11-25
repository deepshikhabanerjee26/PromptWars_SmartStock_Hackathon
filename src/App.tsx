import { useCallback, useEffect, useState } from 'react';
import { Menu, Plus, RefreshCw } from 'lucide-react';
import type {
  ActivityItem,
  ForecastHorizon,
  ForecastResponse,
  InventoryCategory,
} from '../shared/types';
import {
  createProduct,
  deleteProduct,
  fetchForecast,
  fetchProducts,
  recordStockMovement,
  updateProduct,
  type EnrichedProduct,
  type ProductUpsertPayload,
} from './lib/api';
import { Sidebar, type NavRoute } from './components/layout/Sidebar';
import { DeleteConfirmModal } from './components/modals/DeleteConfirmModal';
import { ProductFormModal } from './components/modals/ProductFormModal';
import { StockMovementModal } from './components/modals/StockMovementModal';
import { DashboardPage } from './components/pages/DashboardPage';
import { ForecastingPage } from './components/pages/ForecastingPage';
import { InventoryPage } from './components/pages/InventoryPage';
import { PriorityQueuePage } from './components/pages/PriorityQueuePage';
import { DashboardSkeleton, ErrorState } from './components/ui/StateViews';
import { ToastContainer, type ToastItem } from './components/ui/ToastContainer';

const ROUTE_TITLES: Record<NavRoute, string> = {
  dashboard: 'Dashboard',
  inventory: 'Inventory Catalog',
  forecast: 'Demand Forecast & AI Scenarios',
  priority: 'Priority Reorder Queue',
};

export default function App() {
  const [activeRoute, setActiveRoute] = useState<NavRoute>('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [products, setProducts] = useState<EnrichedProduct[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);

  const [horizon, setHorizon] = useState<ForecastHorizon>(30);
  const [forecastCategory, setForecastCategory] = useState<string>('All');
  const [inventoryCategoryJump, setInventoryCategoryJump] = useState<string>('All');

  const [loading, setLoading] = useState(true);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<EnrichedProduct | null>(null);
  const [movementProduct, setMovementProduct] = useState<EnrichedProduct | null>(null);
  const [movementMode, setMovementMode] = useState<'restock' | 'sale' | 'adjustment'>('restock');
  const [deletingProduct, setDeletingProduct] = useState<EnrichedProduct | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback((type: ToastItem['type'], message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const loadAllData = useCallback(
    async (targetHorizon: ForecastHorizon, targetCategory: string, showFullLoader = false) => {
      if (showFullLoader) setLoading(true);
      else setLoadingForecast(true);
      setError(null);

      try {
        const [prodData, forecastData] = await Promise.all([
          fetchProducts(),
          fetchForecast(targetHorizon, targetCategory),
        ]);
        setProducts(prodData.products);
        setActivities(prodData.activities);
        setForecast(forecastData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to connect to SmartStock server.');
      } finally {
        setLoading(false);
        setLoadingForecast(false);
      }
    },
    []
  );

  useEffect(() => {
    loadAllData(horizon, forecastCategory, true);
  }, [loadAllData, horizon, forecastCategory]);

  const handleChangeHorizon = (next: ForecastHorizon) => {
    setHorizon(next);
  };

  const handleChangeForecastCategory = (nextCat: string) => {
    setForecastCategory(nextCat);
  };

  const handleSaveProduct = async (payload: ProductUpsertPayload, existingId?: string) => {
    if (existingId) {
      const { product } = await updateProduct(existingId, payload);
      pushToast('success', `Updated ${product.name} (${product.sku}).`);
    } else {
      const { product } = await createProduct(payload);
      pushToast('success', `Added ${product.name} (${product.sku}) to catalog.`);
    }
    await loadAllData(horizon, forecastCategory, false);
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      await deleteProduct(productId);
      pushToast('info', 'Product removed from active inventory.');
      await loadAllData(horizon, forecastCategory, false);
    } catch (err) {
      pushToast('error', err instanceof Error ? err.message : 'Failed to delete product.');
    }
  };

  const handleStockMovement = async (
    productId: string,
    payload: { type: 'restock' | 'sale' | 'adjustment'; quantity: number; note?: string }
  ) => {
    const res = await recordStockMovement(productId, payload);
    const actionLabel =
      payload.type === 'restock'
        ? 'Restocked'
        : payload.type === 'sale'
          ? 'Recorded sale for'
          : 'Adjusted count for';
    pushToast('success', `${actionLabel} ${res.product.name}.`);
    await loadAllData(horizon, forecastCategory, false);
  };

  const priorityAlertCount = forecast
    ? forecast.summary.criticalCount + forecast.summary.lowCount + forecast.summary.reorderCount
    : 0;

  return (
    <div className="min-h-screen flex bg-[#F5F1E8] text-[#292F2C]">
      <Sidebar
        activeRoute={activeRoute}
        onNavigate={setActiveRoute}
        priorityAlertCount={priorityAlertCount}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Clean Contextual Top Bar */}
        <header className="sticky top-0 z-30 h-14 bg-[#FFFEFA]/95 backdrop-blur-xs border-b border-[#E4DFD4] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-2 rounded-lg text-[#292F2C] hover:bg-[#EEEAE0]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm min-w-0">
              <span className="font-semibold text-[#145A43] hidden sm:inline whitespace-nowrap">
                SmartStock
              </span>
              <span className="text-[#929A94] hidden sm:inline">/</span>
              <span className="font-medium text-[#292F2C] truncate">
                {ROUTE_TITLES[activeRoute]}
              </span>
            </nav>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => loadAllData(horizon, forecastCategory, false)}
              disabled={loadingForecast}
              title="Refresh inventory & forecasts"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E4DFD4] bg-[#FFFEFA] hover:bg-[#EEEAE0] text-xs font-medium text-[#292F2C] transition-colors whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingForecast ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingProduct(null);
                setProductModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#145A43] hover:bg-[#104735] text-xs font-semibold text-white transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Product</span>
            </button>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-[1440px] w-full mx-auto">
          {loading ? (
            <DashboardSkeleton />
          ) : error || !forecast ? (
            <ErrorState
              title="Failed to load SmartStock data"
              message={error ?? 'An unexpected error occurred while loading forecast telemetry.'}
              onRetry={() => loadAllData(horizon, forecastCategory, true)}
            />
          ) : (
            <>
              {activeRoute === 'dashboard' && (
                <DashboardPage
                  products={products}
                  activities={activities}
                  forecast={forecast}
                  onNavigate={setActiveRoute}
                  onSelectCategoryForInventory={(cat: InventoryCategory) =>
                    setInventoryCategoryJump(cat)
                  }
                  onOpenAddProduct={() => {
                    setEditingProduct(null);
                    setProductModalOpen(true);
                  }}
                  onOpenMovement={(prod, mode) => {
                    setMovementProduct(prod);
                    setMovementMode(mode);
                  }}
                />
              )}

              {activeRoute === 'inventory' && (
                <InventoryPage
                  products={products}
                  initialCategory={inventoryCategoryJump}
                  onClearInitialCategory={() => setInventoryCategoryJump('All')}
                  onAddProduct={() => {
                    setEditingProduct(null);
                    setProductModalOpen(true);
                  }}
                  onEditProduct={(prod) => {
                    setEditingProduct(prod);
                    setProductModalOpen(true);
                  }}
                  onDeleteProduct={(prod) => setDeletingProduct(prod)}
                  onOpenMovement={(prod, mode) => {
                    setMovementProduct(prod);
                    setMovementMode(mode);
                  }}
                />
              )}

              {activeRoute === 'forecast' && (
                <ForecastingPage
                  forecast={forecast}
                  products={products}
                  horizon={horizon}
                  selectedCategory={forecastCategory}
                  loadingForecast={loadingForecast}
                  onChangeHorizon={handleChangeHorizon}
                  onChangeCategory={handleChangeForecastCategory}
                  onOpenMovement={(prod, mode) => {
                    setMovementProduct(prod);
                    setMovementMode(mode);
                  }}
                />
              )}

              {activeRoute === 'priority' && (
                <PriorityQueuePage
                  forecast={forecast}
                  products={products}
                  onOpenMovement={(prod, mode) => {
                    setMovementProduct(prod);
                    setMovementMode(mode);
                  }}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Modals */}
      <ProductFormModal
        open={productModalOpen}
        onClose={() => {
          setProductModalOpen(false);
          setEditingProduct(null);
        }}
        initialProduct={editingProduct}
        onSubmit={handleSaveProduct}
      />

      <StockMovementModal
        open={Boolean(movementProduct)}
        product={movementProduct}
        initialMode={movementMode}
        onClose={() => setMovementProduct(null)}
        onSubmit={handleStockMovement}
      />

      <DeleteConfirmModal
        open={Boolean(deletingProduct)}
        product={deletingProduct}
        onClose={() => setDeletingProduct(null)}
        onConfirm={handleDeleteProduct}
      />

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
}
