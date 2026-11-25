import { useEffect, useState } from 'react';
import { Package } from 'lucide-react';
import type { InventoryCategory } from '../../../shared/types';
import { CATEGORY_FALLBACK_IMAGE } from '../../lib/formatters';

interface ProductThumbnailProps {
  src?: string;
  alt: string;
  category: InventoryCategory;
  className?: string;
}

export function ProductThumbnail({
  src,
  alt,
  category,
  className = 'w-11 h-11 rounded-lg',
}: ProductThumbnailProps) {
  const fallbackSrc = CATEGORY_FALLBACK_IMAGE[category];
  const [currentSrc, setCurrentSrc] = useState<string>(src || fallbackSrc);
  const [failedCompletely, setFailedCompletely] = useState(false);

  useEffect(() => {
    setCurrentSrc(src || fallbackSrc);
    setFailedCompletely(false);
  }, [src, fallbackSrc]);

  if (failedCompletely) {
    return (
      <div
        className={`${className} bg-[#EEEAE0] border border-[#E4DFD4] flex items-center justify-center text-[#145A43] shrink-0`}
        aria-label={alt}
      >
        <Package className="w-4 h-4 opacity-75" aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => {
        if (currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
        } else {
          setFailedCompletely(true);
        }
      }}
      className={`${className} object-cover bg-[#EEEAE0] border border-[#E4DFD4] shrink-0`}
    />
  );
}
