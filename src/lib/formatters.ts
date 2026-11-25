import type { InventoryCategory, StockStatus } from '../../shared/types';

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(val: number): string {
  return new Intl.NumberFormat('en-IN').format(val);
}

export function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.max(1, Math.floor(diffMs / 60_000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export const STATUS_META: Record<
  StockStatus,
  {
    label: string;
    shortLabel: string;
    bg: string;
    text: string;
    border: string;
    dot: string;
  }
> = {
  critical: {
    label: 'Critical Stock',
    shortLabel: 'Critical',
    bg: 'bg-[#C65353]/10',
    text: 'text-[#A33B3B]',
    border: 'border-[#C65353]/25',
    dot: 'bg-[#C65353]',
  },
  low: {
    label: 'Low Stock',
    shortLabel: 'Low Stock',
    bg: 'bg-[#D99A32]/12',
    text: 'text-[#9A6712]',
    border: 'border-[#D99A32]/30',
    dot: 'bg-[#D99A32]',
  },
  reorder: {
    label: 'Reorder Soon',
    shortLabel: 'Reorder',
    bg: 'bg-[#E6A23C]/12',
    text: 'text-[#8F5B0B]',
    border: 'border-[#E6A23C]/35',
    dot: 'bg-[#E6A23C]',
  },
  normal: {
    label: 'Optimal Stock',
    shortLabel: 'Normal',
    bg: 'bg-[#38865B]/10',
    text: 'text-[#246642]',
    border: 'border-[#38865B]/25',
    dot: 'bg-[#38865B]',
  },
  overstock: {
    label: 'Excess Stock',
    shortLabel: 'Overstock',
    bg: 'bg-[#527A9B]/10',
    text: 'text-[#395D7A]',
    border: 'border-[#527A9B]/25',
    dot: 'bg-[#527A9B]',
  },
};

export const CATEGORY_FALLBACK_IMAGE: Record<InventoryCategory, string> = {
  'Rice and Grains': '/src/assets/images/cat_rice_grains_1795627652510.jpg',
  'Flour and Baking Products': '/src/assets/images/cat_rice_grains_1795627652510.jpg',
  'Pulses and Lentils': '/src/assets/images/cat_pulses_spices_1795627653354.jpg',
  'Oils and Ghee': '/src/assets/images/cat_oils_dairy_1795627652861.jpg',
  'Spices and Masalas': '/src/assets/images/cat_pulses_spices_1795627653354.jpg',
  'Salt and Sweeteners': '/src/assets/images/cat_pulses_spices_1795627653354.jpg',
  'Dairy Products': '/src/assets/images/cat_oils_dairy_1795627652861.jpg',
  'Snacks and Packaged Foods': '/src/assets/images/cat_snacks_beverages_1795627653873.jpg',
  'Beverages': '/src/assets/images/cat_snacks_beverages_1795627653873.jpg',
  'Personal Care Products': '/src/assets/images/cat_personal_household_1795627653819.jpg',
  'Household Cleaning Products': '/src/assets/images/cat_personal_household_1795627653819.jpg',
  'Vegetables': '/src/assets/images/cat_fresh_produce_1795627654127.jpg',
  'Fruits': '/src/assets/images/cat_fresh_produce_1795627654127.jpg',
};
