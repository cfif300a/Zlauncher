import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X, ExternalLink, ArrowRight } from 'lucide-react';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
  details?: string[];
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}

interface ToastProps {
  toast: ToastItem | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!toast) return;

    setProgress(100);
    const duration = toast.duration || 4500;
    const intervalTime = 50;
    const step = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <div className="fixed bottom-6 inset-x-0 mx-auto max-w-md z-[100] px-4 pointer-events-none select-none transition-all duration-300">
      <div
        className={`pointer-events-auto relative overflow-hidden rounded-2xl p-4 shadow-2xl backdrop-blur-2xl border transition-all duration-300 transform translate-y-0 ${
          isSuccess
            ? 'bg-slate-950/95 border-emerald-500/40 shadow-[0_15px_35px_rgba(0,0,0,0.7),0_0_30px_rgba(16,185,129,0.25)]'
            : isError
            ? 'bg-slate-950/95 border-rose-500/40 shadow-[0_15px_35px_rgba(0,0,0,0.7),0_0_30px_rgba(244,63,94,0.25)]'
            : 'bg-slate-950/95 border-cyan-500/40 shadow-[0_15px_35px_rgba(0,0,0,0.7),0_0_30px_rgba(6,182,212,0.25)]'
        }`}
      >
        <div className="flex items-start gap-3.5">
          {/* Status Icon */}
          <div
            className={`p-2 rounded-xl flex-shrink-0 border ${
              isSuccess
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : isError
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
            }`}
          >
            {isSuccess && <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />}
            {isError && <AlertCircle className="w-5 h-5 stroke-[2.5]" />}
            {!isSuccess && !isError && <Info className="w-5 h-5 stroke-[2.5]" />}
          </div>

          {/* Message Content */}
          <div className="flex-1 min-w-0 pr-1">
            <h4 className="text-xs font-black tracking-wide text-white flex items-center gap-2">
              <span>{toast.title}</span>
            </h4>

            {toast.message && (
              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed break-words font-medium">
                {toast.message}
              </p>
            )}

            {toast.details && toast.details.length > 0 && (
              <div className="mt-2 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Зависимости ({toast.details.length}):
                </span>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                  {toast.details.map((d, idx) => (
                    <span
                      key={idx}
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.08] text-emerald-300"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {toast.actionLabel && toast.onAction && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => {
                    toast.onAction?.();
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 hover:text-white text-[11px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>{toast.actionLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Progress indicator bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/[0.06]">
          <div
            className={`h-full transition-all duration-75 ease-linear ${
              isSuccess ? 'bg-emerald-500' : isError ? 'bg-rose-500' : 'bg-cyan-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
