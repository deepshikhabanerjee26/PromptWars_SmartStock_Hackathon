import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { EnrichedProduct } from '../../lib/api';
import { Modal } from '../ui/Modal';

interface DeleteConfirmModalProps {
  open: boolean;
  product: EnrichedProduct | null;
  onClose: () => void;
  onConfirm: (productId: string) => Promise<void>;
}

export function DeleteConfirmModal({
  open,
  product,
  onClose,
  onConfirm,
}: DeleteConfirmModalProps) {
  const [deleting, setDeleting] = useState(false);

  if (!product) return null;

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await onConfirm(product.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Remove Product from Catalog"
      maxWidthClass="max-w-md"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3.5 rounded-lg bg-[#C65353]/8 border border-[#C65353]/25">
          <AlertTriangle className="w-5 h-5 text-[#C65353] shrink-0 mt-0.5" />
          <div className="text-sm text-[#292F2C]">
            Are you sure you want to remove{' '}
            <span className="font-semibold">{product.name}</span>{' '}
            <span className="font-mono-num text-xs text-[#6B746E]">({product.sku})</span>?
            This removes {product.quantity} {product.unit} from active stock tracking.
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-[#E4DFD4] bg-[#FFFEFA] text-sm font-medium text-[#292F2C] hover:bg-[#EEEAE0]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={handleConfirm}
            className="px-4 py-2 rounded-lg bg-[#C65353] hover:bg-[#A33B3B] disabled:opacity-60 text-sm font-semibold text-white transition-colors"
          >
            {deleting ? 'Removing...' : 'Delete Product'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
