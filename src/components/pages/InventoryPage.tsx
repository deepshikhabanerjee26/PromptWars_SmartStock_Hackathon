import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Pencil,
  Plus,
  Search,
  Table2,
  Trash2,
} from 'lucide-react';
import {
  INVENTORY_CATEGORIES,
  type InventoryCategory,
  type StockStatus,
} from '../../../shared/types';
import type { EnrichedProduct } from '../../lib/api';
import { formatINR, formatNumber } from '../../lib/formatters';
import { ProductThumbnail } from '../ui/ProductThumbnail';
import { EmptyState } from '../ui/StateViews';
import { StatusBadge } from '../ui/StatusBadge';

interface InventoryPageProps {
  products: EnrichedProduct[];
  initialCategory?: string;
  onClearInitialCategory?: () => void;
  onAddProduct: () => void;
  onEditProduct: (product: EnrichedProduct) => void;
  onDeleteProduct: (product: EnrichedProduct) => void;
  onOpenMovement: (product: EnrichedProduct, mode: 'restock' | 'sale' | 'adjustment') => void;
}

type SortKey = 'priority' | 'name' | 'qty_asc' | 'qty_desc' | 'value_desc';

const PAGE_SIZE = 12;

const STATUS_TABS: Array<{ id: 'all' | StockStatus; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'critical', label: 'Critical' },
  { id: 'low', label: 'Low Stock' },
  { id: 'reorder', label: 'Reorder' },
  { id: 'normal', label: 'Normal' },
  { id: 'overstock', label: 'Excess' },
];

export function InventoryPage({
  products,
  initialCategory = 'All',
  onClearInitialCategory,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onOpenMovement,
}: InventoryPageProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>(initialCategory);
  const [statusFilter, setStatusFilter] = useState<'all' | StockStatus>('all');
  const [sortBy, setSortBy] = useState<SortKey>('priority');
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (initialCategory && initialCategory !== 'All') {
      setCategoryFilter(initialCategory);
      setPage(1);
    }
  }, [initialCategory]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = products.filter((p) => {
      if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && p.forecast.status !== statusFilter) return false;
      if (q) {
        const matches =
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.supplier.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });

    const rank: Record<StockStatus, number> = {
      critical: 0,
      low: 1,
      reorder: 2,
      normal: 3,
      overstock: 4,
    };

    return [...list].sort((a, b) => {
      if (sortBy === 'priority') {
        const diff = rank[a.forecast.status] - rank[b.forecast.status];
        return diff !== 0 ? diff : b.forecast.stockoutProbability - a.forecast.stockoutProbability;
      }
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'qty_asc') return a.quantity - b.quantity;
      if (sortBy === 'qty_desc') return b.quantity - a.quantity;
      return b.quantity * b.purchasePrice - a.quantity * a.purchasePrice;
    });
  }, [products, search, categoryFilter, statusFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage]
  );

  const resetFilters = () => {
    setSearch('');
    setCategoryFilter('All');
    setStatusFilter('all');
    setSortBy('priority');
    setPage(1);
    onClearInitialCategory?.();
  };

  return (
    <div className="space-y-5 animate-fade-slide">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#292F2C] tracking-tight">
            Inventory Catalog
          </h1>
          <p className="text-sm text-[#6B746E] mt-1">
            Manage SKUs, stock quantities, INR margins, and real-time reorder thresholds.{' '}
            <span className="font-mono-num font-semibold text-[#292F2C]">
              Showing {filtered.length} of {products.length} products
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={onAddProduct}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#145A43] hover:bg-[#104735] text-sm font-semibold text-white transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* Filter & View Bar */}
      <div className="bg-[#FFFEFA] border border-[#E4DFD4] rounded-xl p-4 space-y-3.5">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 text-[#929A94] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by product name, SKU, or supplier..."
              aria-label="Search inventory products"
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#E4DFD4] bg-[#F5F1E8]/55 text-sm text-[#292F2C] placeholder:text-[#929A94] focus:outline-none focus:ring-2 focus:ring-[#145A43]/25 focus:border-[#145A43]"
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
                if (e.target.value === 'All') onClearInitialCategory?.();
              }}
              aria-label="Filter by category"
              className="h-10 px-3 rounded-lg border border-[#E4DFD4] bg-[#FFFEFA] text-sm text-[#292F2C] focus:outline-none focus:ring-2 focus:ring-[#145A43]/25 focus:border-[#145A43] flex-1 sm:w-56"
            >
              <option value="All">All Categories ({INVENTORY_CATEGORIES.length})</option>
              {INVENTORY_CATEGORIES.map((cat: InventoryCategory) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Sort Selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              aria-label="Sort products"
              className="h-10 px-3 rounded-lg border border-[#E4DFD4] bg-[#FFFEFA] text-sm text-[#292F2C] focus:outline-none focus:ring-2 focus:ring-[#145A43]/25 focus:border-[#145A43] sm:w-44"
            >
              <option value="priority">Sort: Priority Risk</option>
              <option value="name">Sort: Name (A–Z)</option>
              <option value="qty_asc">Sort: Qty (Low–High)</option>
              <option value="qty_desc">Sort: Qty (High–Low)</option>
              <option value="value_desc">Sort: Value (High–Low)</option>
            </select>

            {/* View Mode Toggle */}
            <div
              className="inline-flex items-center p-1 rounded-lg bg-[#EEEAE0] border border-[#E4DFD4] shrink-0"
              role="group"
              aria-label="Switch inventory view"
            >
              <button
                type="button"
                onClick={() => setViewMode('table')}
                aria-label="Table view"
                aria-pressed={viewMode === 'table'}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  viewMode === 'table'
                    ? 'bg-[#FFFEFA] text-[#145A43] shadow-xs'
                    : 'text-[#6B746E] hover:text-[#292F2C]'
                }`}
              >
                <Table2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('card')}
                aria-label="Card view"
                aria-pressed={viewMode === 'card'}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  viewMode === 'card'
                    ? 'bg-[#FFFEFA] text-[#145A43] shadow-xs'
                    : 'text-[#6B746E] hover:text-[#292F2C]'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cards</span>
              </button>
            </div>
          </div>
        </div>

        {/* Status Segmented Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#E4DFD4]">
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_TABS.map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setStatusFilter(tab.id);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[#145A43] text-white'
                      : 'bg-[#F5F1E8] text-[#6B746E] hover:bg-[#EEEAE0] hover:text-[#292F2C]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {(search || categoryFilter !== 'All' || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-semibold text-[#145A43] hover:underline"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No matching inventory products"
          description="Try clearing your search term or adjusting category and stock status filters."
          action={
            <button
              type="button"
              onClick={resetFilters}
              className="px-4 py-2 rounded-lg bg-[#145A43] hover:bg-[#104735] text-sm font-semibold text-white transition-colors"
            >
              Show All Products
            </button>
          }
        />
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-[#FFFEFA] border border-[#E4DFD4] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[860px]">
              <thead>
                <tr className="border-b border-[#E4DFD4] bg-[#FAF7F0] text-[11px] font-semibold uppercase tracking-wider text-[#6B746E]">
                  <th className="py-3 pl-5 pr-3">Product</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">SKU</th>
                  <th className="py-3 px-3 text-right">Qty</th>
                  <th className="py-3 px-3">Unit</th>
                  <th className="py-3 px-3 text-right">Purchase</th>
                  <th className="py-3 px-3 text-right">Selling</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 pl-3 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4DFD4] text-sm">
                {paginated.map((prod) => (
                  <tr
                    key={prod.id}
                    className="hover:bg-[#F5F1E8]/60 transition-colors"
                  >
                    <td className="py-3 pl-5 pr-3">
                      <div className="flex items-center gap-3">
                        <ProductThumbnail
                          src={prod.imageUrl}
                          alt={prod.name}
                          category={prod.category}
                          className="w-10 h-10 rounded-lg"
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-[#292F2C] truncate max-w-[220px]">
                            {prod.name}
                          </div>
                          <div className="text-xs text-[#6B746E] truncate max-w-[220px]">
                            {prod.supplier}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs text-[#6B746E] whitespace-nowrap">
                      {prod.category}
                    </td>
                    <td className="py-3 px-3 font-mono-num text-xs text-[#292F2C] whitespace-nowrap">
                      {prod.sku}
                    </td>
                    <td className="py-3 px-3 text-right font-mono-num font-semibold text-[#292F2C]">
                      {formatNumber(prod.quantity)}
                    </td>
                    <td className="py-3 px-3 text-xs text-[#6B746E]">{prod.unit}</td>
                    <td className="py-3 px-3 text-right font-mono-num text-[#6B746E]">
                      {formatINR(prod.purchasePrice)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono-num font-medium text-[#292F2C]">
                      {formatINR(prod.sellingPrice)}
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={prod.forecast.status} compact />
                    </td>
                    <td className="py-3 pl-3 pr-5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onOpenMovement(prod, 'restock')}
                          title="Restock product"
                          aria-label={`Restock ${prod.name}`}
                          className="p-1.5 rounded-lg text-[#145A43] hover:bg-[#145A43]/10 transition-colors"
                        >
                          <ArrowDownLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenMovement(prod, 'sale')}
                          title="Record sale"
                          aria-label={`Record sale for ${prod.name}`}
                          className="p-1.5 rounded-lg text-[#9A6712] hover:bg-[#E6A23C]/15 transition-colors"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditProduct(prod)}
                          title="Edit product"
                          aria-label={`Edit ${prod.name}`}
                          className="p-1.5 rounded-lg text-[#6B746E] hover:text-[#292F2C] hover:bg-[#EEEAE0] transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteProduct(prod)}
                          title="Delete product"
                          aria-label={`Delete ${prod.name}`}
                          className="p-1.5 rounded-lg text-[#6B746E] hover:text-[#C65353] hover:bg-[#C65353]/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CARD VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
          {paginated.map((prod) => (
            <div
              key={prod.id}
              className="bg-[#FFFEFA] border border-[#E4DFD4] rounded-xl overflow-hidden flex flex-col hover:border-[#145A43]/40 transition-colors"
            >
              <div className="relative aspect-[4/3] bg-[#EEEAE0] overflow-hidden">
                <ProductThumbnail
                  src={prod.imageUrl}
                  alt={prod.name}
                  category={prod.category}
                  className="w-full h-full rounded-none border-0"
                />
                <div className="absolute top-2.5 right-2.5">
                  <StatusBadge status={prod.forecast.status} compact />
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col">
                <div className="text-xs text-[#6B746E] truncate">
                  {prod.category} · <span className="font-mono-num">{prod.sku}</span>
                </div>
                <h3 className="text-base font-semibold text-[#292F2C] mt-1 line-clamp-1">
                  {prod.name}
                </h3>

                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[#E4DFD4] text-xs">
                  <div>
                    <div className="text-[#929A94]">Available</div>
                    <div className="font-mono-num text-sm font-bold text-[#292F2C] mt-0.5">
                      {formatNumber(prod.quantity)} {prod.unit}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[#929A94]">Buy / Sell</div>
                    <div className="font-mono-num text-sm font-semibold text-[#292F2C] mt-0.5">
                      {formatINR(prod.purchasePrice)} / {formatINR(prod.sellingPrice)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-[#E4DFD4]">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onOpenMovement(prod, 'restock')}
                      className="px-2.5 py-1.5 rounded-lg bg-[#145A43] hover:bg-[#104735] text-xs font-semibold text-white transition-colors"
                    >
                      Restock
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenMovement(prod, 'sale')}
                      className="px-2.5 py-1.5 rounded-lg border border-[#E4DFD4] bg-[#F5F1E8] hover:bg-[#EEEAE0] text-xs font-semibold text-[#292F2C] transition-colors"
                    >
                      Sell
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEditProduct(prod)}
                      aria-label={`Edit ${prod.name}`}
                      className="p-1.5 rounded-lg text-[#6B746E] hover:text-[#292F2C] hover:bg-[#EEEAE0]"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteProduct(prod)}
                      aria-label={`Delete ${prod.name}`}
                      className="p-1.5 rounded-lg text-[#6B746E] hover:text-[#C65353] hover:bg-[#C65353]/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="text-xs text-[#6B746E] font-mono-num">
            Page {safePage} of {totalPages} · Showing {(safePage - 1) * PAGE_SIZE + 1}–
            {Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E4DFD4] bg-[#FFFEFA] text-xs font-semibold text-[#292F2C] disabled:opacity-45 hover:bg-[#EEEAE0] transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E4DFD4] bg-[#FFFEFA] text-xs font-semibold text-[#292F2C] disabled:opacity-45 hover:bg-[#EEEAE0] transition-colors"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
