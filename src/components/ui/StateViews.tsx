import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6 bg-[#FFFEFA] border border-[#E4DFD4] rounded-xl">
      <div className="w-11 h-11 rounded-lg bg-[#EEEAE0] text-[#145A43] flex items-center justify-center mb-3">
        <Inbox className="w-5 h-5" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-[#292F2C]">{title}</h3>
      <p className="text-sm text-[#6B746E] max-w-md mt-1">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Unable to load data',
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-[#C65353]/8 border border-[#C65353]/30 rounded-xl"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-[#C65353] shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <h3 className="text-sm font-semibold text-[#292F2C]">{title}</h3>
          <p className="text-sm text-[#6B746E] mt-0.5">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#FFFEFA] border border-[#E4DFD4] text-[#292F2C] hover:bg-[#EEEAE0] transition-colors shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      )}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-28 bg-[#FFFEFA] border border-[#E4DFD4] rounded-xl p-5"
          >
            <div className="h-3 w-24 bg-[#EEEAE0] rounded mb-4" />
            <div className="h-7 w-32 bg-[#EEEAE0] rounded mb-2" />
            <div className="h-3 w-20 bg-[#EEEAE0] rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-80 bg-[#FFFEFA] border border-[#E4DFD4] rounded-xl" />
        <div className="h-80 bg-[#FFFEFA] border border-[#E4DFD4] rounded-xl" />
      </div>
      <div className="h-64 bg-[#FFFEFA] border border-[#E4DFD4] rounded-xl" />
    </div>
  );
}
