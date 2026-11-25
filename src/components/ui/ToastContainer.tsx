import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] sm:w-auto"
    >
      {toasts.map((toast) => {
        const isError = toast.type === 'error';
        const isSuccess = toast.type === 'success';
        const Icon = isError ? AlertCircle : isSuccess ? CheckCircle2 : Info;
        const borderClass = isError
          ? 'border-[#C65353]/40 bg-[#FFFEFA] text-[#A33B3B]'
          : isSuccess
            ? 'border-[#38865B]/40 bg-[#FFFEFA] text-[#145A43]'
            : 'border-[#527A9B]/40 bg-[#FFFEFA] text-[#395D7A]';

        return (
          <div
            key={toast.id}
            className={`flex items-start gap-2.5 px-4 py-3 rounded-lg border shadow-lg animate-fade-slide ${borderClass}`}
          >
            <Icon className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm font-medium text-[#292F2C] flex-1 leading-snug">
              {toast.message}
            </p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="text-[#929A94] hover:text-[#292F2C] p-0.5 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
