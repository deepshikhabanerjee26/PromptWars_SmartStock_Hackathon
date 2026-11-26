import { useEffect, useState, type FormEvent } from 'react';
import { ArrowDownLeft, ArrowUpRight, SlidersHorizontal } from 'lucide-react';
import type { EnrichedProduct } from '../../lib/api';
import { formatINR } from '../../lib/formatters';
import { validateMovementInput } from '../../lib/validation';
import { Modal } from '../ui/Modal';

interface StockMovementModalProps {
  open: boolean;
  product: EnrichedProduct | null;
  initialMode?: 'restock' | 'sale' | 'adjustment';
  onClose: () => void;
  onSubmit: (
    productId: string,
    payload: { type: 'restock' | 'sale' | 'adjustment'; quantity: number; note?: string }
  ) => Promise<void>;
}

export function StockMovementModal({
  open,
  product,
  initialMode = 'restock',
  onClose,
  onSubmit,
}: StockMovementModalProps) {
  const [mode, setMode] = useState<'restock' | 'sale' | 'adjustment'>(initialMode);
  const [quantity, setQuantity] = useState('10');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !product) return;
    setMode(initialMode);
    if (initialMode === 'restock' && product.forecast.recommendedOrderQty > 0) {
      setQuantity(String(product.forecast.recommendedOrderQty));
    } else if (initialMode === 'adjustment') {
      setQuantity(String(product.quantity));
    } else {
      setQuantity('10');
    }
    setNote('');
    setError(null);
    setSubmitting(false);
  }, [open, product, initialMode]);

  if (!product) return null;

  const qtyNum = Number(quantity);
  const validQty = Number.isFinite(qtyNum) && qtyNum > 0;
  const resultingQty = !validQty
    ? product.quantity
    : mode === 'restock'
      ? product.quantity + Math.round(qtyNum)
      : mode === 'sale'
        ? product.quantity - Math.round(qtyNum)
        : Math.round(qtyNum);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const validated = validateMovementInput(
      { type: mode, quantity: qtyNum, note },
      product.quantity
    );
    if (!validated.ok) {
      setError(validated.error);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(product.id, {
        type: validated.data.type,
        quantity: validated.data.quantity,
        note: validated.data.note || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to record movement.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record Stock Movement"
      subtitle={`${product.name} · SKU ${product.sku}`}
      maxWidthClass="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div
            role="alert"
            className="px-3.5 py-2.5 rounded-lg bg-[#C65353]/12 border border-[#C65353]/35 text-sm text-[#8C2D2D]"
          >
            {error}
          </div>
        )}

        <div
          role="group"
          aria-label="Movement type"
          className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-[#EEEAE0] border border-[#E4DFD4]"
        >
          <button
            type="button"
            aria-pressed={mode === 'restock'}
            onClick={() => {
              setMode('restock');
              if (product.forecast.recommendedOrderQty > 0) {
                setQuantity(String(product.forecast.recommendedOrderQty));
              }
            }}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-semibold transition-colors ${
              mode === 'restock'
                ? 'bg-[#145A43] text-white shadow-xs'
                : 'text-[#525A54] hover:text-[#292F2C]'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" aria-hidden="true" />
            Restock
          </button>
          <button
            type="button"
            aria-pressed={mode === 'sale'}
            onClick={() => {
              setMode('sale');
              setQuantity(String(Math.min(10, Math.max(1, product.quantity))));
            }}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-semibold transition-colors ${
              mode === 'sale'
                ? 'bg-[#E6A23C] text-[#104735] shadow-xs'
                : 'text-[#525A54] hover:text-[#292F2C]'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
            Record Sale
          </button>
          <button
            type="button"
            aria-pressed={mode === 'adjustment'}
            onClick={() => {
              setMode('adjustment');
              setQuantity(String(product.quantity));
            }}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-semibold transition-colors ${
              mode === 'adjustment'
                ? 'bg-[#FFFEFA] text-[#292F2C] shadow-xs'
                : 'text-[#525A54] hover:text-[#292F2C]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
            Audit Count
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 p-3.5 rounded-lg bg-[#F5F1E8] border border-[#E4DFD4] text-xs">
          <div>
            <div className="text-[#525A54]">Current Stock</div>
            <div className="font-mono-num text-sm font-semibold text-[#292F2C] mt-0.5">
              {product.quantity} {product.unit}
            </div>
          </div>
          <div>
            <div className="text-[#525A54]">
              {mode === 'restock' ? 'Recommended PO' : mode === 'sale' ? 'Unit Price' : 'Reorder Point'}
            </div>
            <div className="font-mono-num text-sm font-semibold text-[#145A43] mt-0.5">
              {mode === 'restock'
                ? product.forecast.recommendedOrderQty > 0
                  ? `${product.forecast.recommendedOrderQty} ${product.unit}`
                  : 'Sufficient'
                : mode === 'sale'
                  ? formatINR(product.sellingPrice)
                  : `${product.forecast.reorderPoint} ${product.unit}`}
            </div>
          </div>
          <div>
            <div className="text-[#525A54]">Resulting Stock</div>
            <div
              className={`font-mono-num text-sm font-semibold mt-0.5 ${
                resultingQty < 0 ? 'text-[#8C2D2D]' : 'text-[#292F2C]'
              }`}
            >
              {Math.max(0, resultingQty)} {product.unit}
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="movement-qty" className="text-xs font-medium text-[#292F2C]">
              {mode === 'adjustment'
                ? `Verified Physical Count (${product.unit})`
                : `Quantity (${product.unit})`}
            </label>
            {mode === 'restock' && product.forecast.recommendedOrderQty > 0 && (
              <button
                type="button"
                onClick={() => setQuantity(String(product.forecast.recommendedOrderQty))}
                className="text-xs font-semibold text-[#145A43] hover:underline"
              >
                Use AI EOQ ({product.forecast.recommendedOrderQty} {product.unit})
              </button>
            )}
          </div>
          <input
            id="movement-qty"
            type="number"
            min="1"
            step="1"
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-[#E4DFD4] bg-[#FFFEFA] text-sm font-mono-num text-[#292F2C]"
          />
          {mode === 'restock' && validQty && (
            <p className="text-xs text-[#525A54] mt-1.5 font-mono-num">
              Estimated PO cost: {formatINR(Math.round(qtyNum * product.purchasePrice))}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="movement-note" className="block text-xs font-medium text-[#292F2C] mb-1">
            Reference Note (Optional)
          </label>
          <input
            id="movement-note"
            type="text"
            maxLength={140}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              mode === 'restock'
                ? `PO received from ${product.supplier}`
                : mode === 'sale'
                  ? 'POS daily checkout batch'
                  : 'Weekly shelf verification'
            }
            className="w-full h-10 px-3 rounded-lg border border-[#E4DFD4] bg-[#FFFEFA] text-sm text-[#292F2C]"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E4DFD4]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-[#E4DFD4] bg-[#FFFEFA] text-sm font-medium text-[#292F2C] hover:bg-[#EEEAE0]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || resultingQty < 0}
            className="px-5 py-2 rounded-lg bg-[#145A43] hover:bg-[#104735] disabled:opacity-60 text-sm font-semibold text-white transition-colors"
          >
            {submitting
              ? 'Recording...'
              : mode === 'restock'
                ? 'Confirm Restock'
                : mode === 'sale'
                  ? 'Record Sale'
                  : 'Save Audit Count'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
