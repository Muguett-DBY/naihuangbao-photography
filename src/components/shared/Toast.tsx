import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type ToastType = "success" | "error" | "info";

type ToastItem = {
  id: number;
  text: string;
  type: ToastType;
};

type ToastContextValue = {
  showToast: (text: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<number, number>>(new Map());

  const removeToast = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (text: string, type: ToastType = "info") => {
      const id = ++toastId;
      setToasts((prev) => [...prev.slice(-2), { id, text, type }]);

      const timer = window.setTimeout(() => {
        removeToast(id);
      }, 3500);
      timersRef.current.set(id, timer);
    },
    [removeToast],
  );

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="nhb-toast-container" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`nhb-toast nhb-toast-${t.type}`}
            onClick={() => removeToast(t.id)}
            role="status"
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback: no provider mounted, use console
    return {
      showToast: (text, type) => {
        if (type === "error") console.warn("[Toast]", text);
      },
    };
  }
  return ctx;
}
