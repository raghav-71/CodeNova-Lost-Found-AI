import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastMessage[];
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(({ type, title, message, duration = 4000 }: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-xl transition-all duration-300 animate-slide-in ${
              toast.type === 'success'
                ? 'bg-white border-[#C7EED4] text-[#102018]'
                : toast.type === 'error'
                ? 'bg-white border-[#FFE4E6] text-[#102018]'
                : toast.type === 'warning'
                ? 'bg-white border-[#FDE68A] text-[#102018]'
                : 'bg-white border-[#E3ECE6] text-[#102018]'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-[#35B86B]" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-[#E11D48]" />}
              {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-[#D97706]" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-[#35B86B]" />}
            </div>
            <div className="flex-1 min-w-0">
              {toast.title && <div className="font-bold text-xs text-[#102018] mb-0.5">{toast.title}</div>}
              <div className="text-xs text-[#66756C] leading-relaxed break-words font-medium">{toast.message}</div>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 p-1 hover:bg-[#F7FBF8] rounded-lg text-[#94A39B] hover:text-[#102018] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
