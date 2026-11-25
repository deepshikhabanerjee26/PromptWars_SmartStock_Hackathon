import { AlertOctagon, AlertTriangle, ArrowUpCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import type { StockStatus } from '../../../shared/types';
import { STATUS_META } from '../../lib/formatters';

interface StatusBadgeProps {
  status: StockStatus;
  compact?: boolean;
}

export function StatusBadge({ status, compact = false }: StatusBadgeProps) {
  const meta = STATUS_META[status];

  const Icon =
    status === 'critical'
      ? AlertOctagon
      : status === 'low'
        ? AlertTriangle
        : status === 'reorder'
          ? RefreshCw
          : status === 'overstock'
            ? ArrowUpCircle
            : CheckCircle2;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap shrink-0 ${meta.bg} ${meta.text} ${meta.border}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{compact ? meta.shortLabel : meta.label}</span>
    </span>
  );
}
