"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "./cn";

export type ToastTone = "success" | "error" | "info";

export interface ToastOptions {
  tone?: ToastTone;
  /** Custom icon overriding the default for the selected tone. */
  icon?: ReactNode;
  /** Display duration, defaulting to three seconds. */
  durationMs?: number;
}

interface ToastItem extends Required<Pick<ToastOptions, "tone">> {
  id: number;
  message: ReactNode;
  icon?: ReactNode;
}

type ShowToast = (message: ReactNode, options?: ToastOptions) => void;

const ToastContext = createContext<ShowToast | null>(null);

/** Default to three seconds. Use long for notifications that take longer to read. */
export const TOAST_DURATION = { short: 3000, long: 4000 } as const;
const DEFAULT_DURATION_MS = TOAST_DURATION.short;

const toneStyles: Record<ToastTone, { box: string; icon: ReactNode }> = {
  success: { box: "bg-primary-soft text-primary", icon: <CheckCircle2 className="h-5 w-5" /> },
  error: { box: "bg-red-50 text-danger", icon: <AlertCircle className="h-5 w-5" /> },
  info: { box: "bg-primary-soft text-primary", icon: <Info className="h-5 w-5" /> },
};

/** Provide useToast throughout the app. Show toasts at bottom right above the mobile navigation and all modals. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
  }, []);

  const show = useCallback<ShowToast>(
    (message, options = {}) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, message, tone: options.tone ?? "success", icon: options.icon }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), options.durationMs ?? DEFAULT_DURATION_MS),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        className="pointer-events-none fixed bottom-20 right-4 z-[320] md:bottom-6 md:right-6 flex flex-col items-end gap-2"
        role="status"
        aria-live="polite"
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-primary-line bg-white p-4 shadow-2xl backdrop-blur-md"
            >
              <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", toneStyles[toast.tone].box)}>
                {toast.icon ?? toneStyles[toast.tone].icon}
              </div>
              <p className="text-sm font-bold text-ink-strong">{toast.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export interface ToastApi {
  show: ShowToast;
  success: (message: ReactNode, options?: Omit<ToastOptions, "tone">) => void;
  error: (message: ReactNode, options?: Omit<ToastOptions, "tone">) => void;
  info: (message: ReactNode, options?: Omit<ToastOptions, "tone">) => void;
}

/** Example: toast.success("Saved!") or toast.error(message) after calling useToast(). */
export function useToast(): ToastApi {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast must be used inside <ToastProvider>");
  return useMemo(
    () => ({
      show,
      success: (message, options) => show(message, { ...options, tone: "success" }),
      error: (message, options) => show(message, { ...options, tone: "error" }),
      info: (message, options) => show(message, { ...options, tone: "info" }),
    }),
    [show],
  );
}
