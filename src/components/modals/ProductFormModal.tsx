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
import { validateProductInput } from '../../lib/validation';
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

    const validated = validateProductInput({
      name,
      sku,
      category,
      unit,
      quantity: Number(quantity),
      purchasePrice: Number(purchasePrice),
      sellingPrice: Number(sellingPrice),
      reorderLevel: Number(reorderLevel),
      maxStockLevel: Number(maxStockLevel),
      leadTimeDays: Number(leadTimeDays),
      supplier,
      seasonalityTag,
      imageUrl: imageUrl.trim() || CATEGORY_FALLBACK_IMAGE[category],
    });

    if (!validated.ok) {
      setError(validated.error);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(validated.data, initialProduct?.id);
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
            className="px-3.5 py-2.5 rounded-lg bg-[#C65353]/12 border border-[#C65353]/35 text-sm text-[#8C2D2D]"
          >
            {error}
          </div>
        )}

        <div className="space-y-3.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#525A54] border-b border-[#E4DFD4] pb-1.5">
            Product Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="sm:col-span-2">
              <label htmlFor="prod-name" className="block text-xs font-medium text-[#292F2C] mb-1">
                Product Name *
              </label>
              <input
                id="prod-name"
                type="text"
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Aged Basmati Rice"
                className="w-full h-10 px-3 rounded-lg border border-[#E4DFD4] bg-[#FFFEFA] text-sm text-[#292F2C]"
              />
            </div>
            <div>
              <label htmlFor="prod-sku" className="block text-xs font-medium text-[#292F2C] mb-1">
                SKU Code
              </label>
              <input
                id="prod-sku"
                type="text"
                maxLength={24}
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                placeholder="Auto-generated"
                className="w-full h-10 px-3 rounded-lg border border-[#E4DFD4] bg-[#FFFEFA] text-sm font-mono-num text-[#292F2C]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="prod-category" className="block text-xs font-medium text-[#292F2C] mb-1">
                Category *
              </label>
              <select
                id="prod-category"
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value as InventoryCategory)}
                className="w-full h-10 px-3 rounded-lg border border-[#E4DFD4] bg-[#FFFEFA] text-sm text-[#292F2C]"
              >
                {INVENTORY_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="prod-unit" className="block text-xs font-medium text-[#292F2C] mb-1">
                Unit of Measure *
              </label>
              <select
                id="prod-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value as ProductUnit)}
                className="w-full h-10 px-3 rounded-lg border border-[#E4DFD4] bg-[#FFFEFA] text-sm text-[#292F2C]"
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

        <div className="space-y-3.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#525A54] border-b border-[#E4DFD4] pb-1.5">
            Pricing & Stock Thresholds
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label htmlFor="prod-qty" className="block text-xs font-medium text-[#292F2C] mb-1">
                Available Qty ({unit}) *
              </label>
              <input
                id="prod-qty"
                type="number"
                min="0"
                step="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#E4DFD4] bg-[#FFFEFA] text-sm font-mono-num text-[#292F2C]"
              />
            </div>
            <div>
              <label htmlFor="prod-purchase-price" className="block text-xs font-medium text-[#292F2C] mb-1">
                Purchase Price (₹) *
              </label>
              <input
                id="prod-purchase-price"
                type="number"
                min="1"
                step="0.5"
                required
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="110"
                className="w-full h-10 px-3 rounded-lg border border-[#E4DFD4] bg-[#FFFEFA] text-sm font-mono-num text-[#292F2C]"
              />
            </div>
            <div>
              <label htmlFor="prod-selling-price" className="block text-xs font-medium text-[#292F2C] mb-1">
                Selling Price (₹) *
              </label>
              <input
                id="prod-selling-price"
                type="number"
                min="1"
                step="0.5"
                required
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="145"
                className="w-full h-10 px-3 rounded-lg border border-[#E4DFD4] bg-[#FFFEFA] text-sm font-mono-num text-[#292F2C]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label htmlFor="prod-reorder" className="block text-xs font-medium text-[#292F2C] mb-1">
                Reorder Alert Level
              </label>
              <input
                id="prod-reorder"
                type="number"
                min="0"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#E4DFD4] bg-[#FFFEFA] text-sm font-mono-num text-[#292F2C]"
              />
            </div>
            <div>
              <label htmlFor="prod-max-stock" className="block text-xs font-medium text-[#292F2C] mb-1">
                Max Target Stock
              </label>
              <input
                id="prod-max-stock"
                type="number"
                min="10"
                value={maxStockLevel}
                onChange={(e) => setMaxStockLevel(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#E4DFD4] bg-[#FFFEFA] text-sm font-mono-num text-[#292F2C]"
              />
            </div>
            <div>
              <label htmlFor="prod-lead-time" className="block text-xs font-medium text-[#292F2C] mb-1">
                Supplier Lead Time (Days)
              </label>
              <input
                id="prod-lead-time"
                type="number"
                min="1"
                max="60"
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#E4DFD4] bg-[#FFFEFA] text-sm font-mono-num text-[#292F2C]"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#525A54] border-b border-[#E4DFD4] pb-1.5">
            Supplier & Product Image
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="prod-supplier" className="block text-xs font-medium text-[#292F2C] mb-1">
                Primary Supplier
              </label>
              <input
                id="prod-supplier"
                type="text"
                maxLength={80}
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="e.g., Karnal Agro Mills"
                className="w-full h-10 px-3 rounded-lg border border-[#E4DFD4] bg-[#FFFEFA] text-sm text-[#292F2C]"
              />
            </div>
            <div>
              <label htmlFor="prod-seasonality" className="block text-xs font-medium text-[#292F2C] mb-1">
                Seasonal Profile
              </label>
              <input
                id="prod-seasonality"
                type="text"
                maxLength={60}
                value={seasonalityTag}
                onChange={(e) => setSeasonalityTag(e.target.value)}
                placeholder="e.g., Diwali & Wedding Peak"
                className="w-full h-10 px-3 rounded-lg border border-[#E4DFD4] bg-[#FFFEFA] text-sm text-[#292F2C]"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <ProductThumbnail
              src={imageUrl}
              alt={`${name || category} preview`}
              category={category}
              className="w-16 h-16 rounded-lg"
            />
            <div className="flex-1 min-w-[200px]">
              <label
                htmlFor="prod-image-upload"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#E4DFD4] bg-[#F5F1E8] hover:bg-[#EEEAE0] text-xs font-semibold text-[#292F2C] cursor-pointer transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-[#145A43]" aria-hidden="true" />
                Upload Product Photo
                <input
                  id="prod-image-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleImageUpload}
                  className="sr-only"
                />
              </label>
              <p className="text-[11px] text-[#525A54] mt-1.5">
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
            {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Product'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
