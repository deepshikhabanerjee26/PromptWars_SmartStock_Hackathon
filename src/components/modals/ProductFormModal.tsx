import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Upload } from 'lucide-react';
import {
  INVENTORY_CATEGORIES,
  PRODUCT_UNITS,
  type InventoryCategory,
  type Product,
  type ProductUnit,
} from '../../../shared/types';
import type { ProductUpsertPayload } from '../../lib/api';
import { CATEGORY_FALLBACK_IMAGE } from '../../lib/formatters';
import { Modal } from '../ui/Modal';
import { ProductThumbnail } from '../ui/ProductThumbnail';

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  initialProduct?: Product | null;
  onSubmit: (payload: ProductUpsertPayload, existingId?: string) => Promise<void>;
}

export function ProductFormModal({
  open,
  onClose,
  initialProduct,
  onSubmit,
}: ProductFormModalProps) {
  const isEdit = Boolean(initialProduct);

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState<InventoryCategory>('Rice and Grains');
  const [unit, setUnit] = useState<ProductUnit>('kg');
  const [quantity, setQuantity] = useState('40');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [reorderLevel, setReorderLevel] = useState('25');
  const [maxStockLevel, setMaxStockLevel] = useState('120');
  const [leadTimeDays, setLeadTimeDays] = useState('4');
  const [supplier, setSupplier] = useState('');
  const [seasonalityTag, setSeasonalityTag] = useState('Steady Year-Round');
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initialProduct) {
      setName(initialProduct.name);
      setSku(initialProduct.sku);
      setCategory(initialProduct.category);
      setUnit(initialProduct.unit);
      setQuantity(String(initialProduct.quantity));
      setPurchasePrice(String(initialProduct.purchasePrice));
      setSellingPrice(String(initialProduct.sellingPrice));
      setReorderLevel(String(initialProduct.reorderLevel));
      setMaxStockLevel(String(initialProduct.maxStockLevel));
      setLeadTimeDays(String(initialProduct.leadTimeDays));
      setSupplier(initialProduct.supplier);
      setSeasonalityTag(initialProduct.seasonalityTag);
      setImageUrl(initialProduct.imageUrl);
    } else {
      setName('');
      setSku('');
      setCategory('Rice and Grains');
      setUnit('kg');
      setQuantity('40');
      setPurchasePrice('');
      setSellingPrice('');
      setReorderLevel('25');
      setMaxStockLevel('120');
      setLeadTimeDays('4');
      setSupplier('');
      setSeasonalityTag('Steady Year-Round');
      setImageUrl(CATEGORY_FALLBACK_IMAGE['Rice and Grains']);
    }
    setError(null);
    setSubmitting(false);
  }, [open, initialProduct]);

  const handleCategoryChange = (nextCategory: InventoryCategory) => {
    const prevDefault = CATEGORY_FALLBACK_IMAGE[category];
    setCategory(nextCategory);
    if (!imageUrl || imageUrl === prevDefault) {
      setImageUrl(CATEGORY_FALLBACK_IMAGE[nextCategory]);
    }
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Please upload a JPG, PNG, or WebP image file.');
      return;
    }
    if (file.size > 1.5 * 1024 * 1024) {
      setError('Image must be smaller than 1.5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageUrl(reader.result);
        setError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError('Please enter a valid product name (at least 2 characters).');
      return;
    }
    const qtyNum = Number(quantity);
    const purNum = Number(purchasePrice);
    const sellNum = Number(sellingPrice);
    const reorderNum = Number(reorderLevel);
    const maxNum = Number(maxStockLevel);
    const leadNum = Number(leadTimeDays);

    if (!Number.isFinite(qtyNum) || qtyNum < 0) {
      setError('Quantity must be 0 or higher.');
      return;
    }
    if (!Number.isFinite(purNum) || purNum <= 0 || !Number.isFinite(sellNum) || sellNum <= 0) {
      setError('Purchase and selling prices must be positive INR values.');
      return;
    }
    if (sellNum < purNum) {
      setError('Selling price should be greater than or equal to purchase cost.');
      return;
    }
    if (!Number.isFinite(reorderNum) || reorderNum < 0 || !Number.isFinite(leadNum) || leadNum < 1) {
      setError('Reorder level must be >= 0 and supplier lead time >= 1 day.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(
        {
          name: name.trim(),
          sku: sku.trim() || undefined,
          category,
          unit,
          quantity: Math.round(qtyNum),
          purchasePrice: purNum,
          sellingPrice: sellNum,
          reorderLevel: Math.round(reorderNum),
          maxStockLevel: Math.max(Math.round(reorderNum) + 10, Math.round(maxNum)),
          leadTimeDays: Math.round(leadNum),
          supplier: supplier.trim() || 'Regional Wholesale Partner',
          seasonalityTag: seasonalityTag.trim() || 'Steady Year-Round',
          imageUrl: imageUrl.trim() || CATEGORY_FALLBACK_IMAGE[category],
        },
        initialProduct?.id
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save product.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit ${initialProduct?.name}` : 'Add New Product'}
      subtitle={
        isEdit
          ? 'Update pricing, stock thresholds, supplier lead time, or thumbnail'
          : 'Add an item to your SmartStock catalog with reorder & demand parameters'
      }
      maxWidthClass="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div
            role="alert"
            className="px-3.5 py-2.5 rounded-lg bg-[#C65353]/10 border border-[#C65353]/30 text-sm text-[#A33B3B]"
          >
            {error}
          </div>
        )}

        {/* Section 1: Identity & Category */}
        <div className="space-y-3.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B746E] border-b border-[#E4DFD4] pb-1.5">
            Product Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#292F2C] mb-1">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Aged Basmati Rice"
                className="w-full h-10 px-3 rounded-lg border border-[#E4DFD4] bg-[#FFFEFA] text-sm text-[#292F2C] focus:outline-none focus:ring-2 focus:ring-[#145A43]/25 focus:border-[#145A43]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#292F2C] mb-1">
                SKU Code
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                placeholder="Auto-generated"
                className="w-full h-10 px-3 rounded-lg border border-[#E4DFD4] bg-[#FFFEFA] text-sm font-mono-num text-[#292F2C] focus:outline-none focus:ring-2 focus:ring-[#145A43]/25 focus:border-[#145A43]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-[#292F2C] mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value as InventoryCategory)}
                className="w-full h-10 px-3 rounded-lg border border-[#E4DFD4] bg-[#FFFEFA] text-sm text-[#292F2C] focus:outline-none focus:ring-2 focus:ring-[#145A43]/25 focus:border-[#145A43]"
              >
                {INVENTORY_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#292F2C] mb-1">
                Unit of Measure *
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as ProductUnit)}
                className="w-full h-10 px-3 rounded-lg border border-[#E4DFD4] bg-[#FFFEFA] text-sm text-[#292F2C] focus:outline-none focus:ring-2 focus:ring-[#145A43]/25 focus:border-[#145A43]"
              >
                {PRODUCT_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Pricing & Inventory Levels */}
        <div className="space-y-3.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B746E] border-b border-[#E4DFD4] pb-1.5">
            Pricing & Stock Thresholds
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-[#292F2C] mb-1">
                Available Qty ({unit}) *
              </label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#E4DFD4] bg-[#FFFEFA] text-sm font-mono-num text-[#292F2C] focus:outline-none focus:ring-2 focus:ring-[#145A43]/25 focus:border-[#145A43]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#292F2C] mb-1">
                Purchase Price (₹) *
              </label>
              <input
                type="number"
                min="1"
                step="0.5"
                required
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="110"
                className="w-full h-10 px-3 rounded-lg border border-[#E4DFD4] bg-[#FFFEFA] text-sm font-mono-num text-[#292F2C] focus:outline-none focus:ring-2 focus:ring-[#145A43]/25 focus:border-[#145A43]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#292F2C] mb-1">
                Selling Price (₹) *
              </label>
              <input
                type="number"
                min="1"
                step="0.5"
                required
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="145"
                className="w-full h-10 px-3 rounded-lg border border-[#E4DFD4] bg-[#FFFEFA] text-sm font-mono-num text-[#292F2C] focus:outline-none focus:ring-2 focus:ring-[#145A43]/25 focus:border-[#145A43]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-[#292F2C] mb-1">
                Reorder Alert Level
              </label>
              <input
                type="number"
                min="0"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#E4DFD4] bg-[#FFFEFA] text-sm font-mono-num text-[#292F2C] focus:outline-none focus:ring-2 focus:ring-[#145A43]/25 focus:border-[#145A43]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#292F2C] mb-1">
                Max Target Stock
              </label>
              <input
                type="number"
                min="10"
                value={maxStockLevel}
                onChange={(e) => setMaxStockLevel(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#E4DFD4] bg-[#FFFEFA] text-sm font-mono-num text-[#292F2C] focus:outline-none focus:ring-2 focus:ring-[#145A43]/25 focus:border-[#145A43]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#292F2C] mb-1">
                Supplier Lead Time (Days)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#E4DFD4] bg-[#FFFEFA] text-sm font-mono-num text-[#292F2C] focus:outline-none focus:ring-2 focus:ring-[#145A43]/25 focus:border-[#145A43]"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Supplier & Product Photo */}
        <div className="space-y-3.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B746E] border-b border-[#E4DFD4] pb-1.5">
            Supplier & Product Image
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-[#292F2C] mb-1">
                Primary Supplier
              </label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="e.g., Karnal Agro Mills"
                className="w-full h-10 px-3 rounded-lg border border-[#E4DFD4] bg-[#FFFEFA] text-sm text-[#292F2C] focus:outline-none focus:ring-2 focus:ring-[#145A43]/25 focus:border-[#145A43]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#292F2C] mb-1">
                Seasonal Profile
              </label>
              <input
                type="text"
                value={seasonalityTag}
                onChange={(e) => setSeasonalityTag(e.target.value)}
                placeholder="e.g., Diwali & Wedding Peak"
                className="w-full h-10 px-3 rounded-lg border border-[#E4DFD4] bg-[#FFFEFA] text-sm text-[#292F2C] focus:outline-none focus:ring-2 focus:ring-[#145A43]/25 focus:border-[#145A43]"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <ProductThumbnail
              src={imageUrl}
              alt={name || category}
              category={category}
              className="w-16 h-16 rounded-lg"
            />
            <div className="flex-1 min-w-[200px]">
              <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#E4DFD4] bg-[#F5F1E8] hover:bg-[#EEEAE0] text-xs font-semibold text-[#292F2C] cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5 text-[#145A43]" />
                Upload Product Photo
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
              <p className="text-[11px] text-[#6B746E] mt-1.5">
                Optional JPG/PNG/WebP under 1.5 MB. Defaults to category studio photo.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E4DFD4]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-[#E4DFD4] bg-[#FFFEFA] text-sm font-medium text-[#292F2C] hover:bg-[#EEEAE0] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 rounded-lg bg-[#145A43] hover:bg-[#104735] disabled:opacity-60 text-sm font-semibold text-[#FFFEFA] transition-colors"
          >
            {submitting
              ? 'Saving...'
              : isEdit
                ? 'Save Changes'
                : 'Add Product'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
