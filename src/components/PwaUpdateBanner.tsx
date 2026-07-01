import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw, X } from "lucide-react";
import { logAndIgnore } from "../lib/errors";

const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;

export function PwaUpdateBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const reloadFallbackRef = useRef<number | null>(null);
  const refreshButtonRef = useRef<HTMLButtonElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return undefined;

    let reloading = false;
    let disposed = false;
    let updateRegistration: ServiceWorkerRegistration | null = null;
    let updateTimer: number | null = null;

    const checkForUpdate = () => {
      const registration = registrationRef.current;
      if (!registration?.installing && !registration?.waiting && !registration?.active) return;
      void registration.update().catch((error) => {
        logAndIgnore("Service worker update check failed", error);
      });
    };

    const handleUpdateFound = () => {
      const newWorker = registrationRef.current?.installing;
      if (!newWorker) return;
      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          setVisible(true);
        }
      });
    };

    const handleControllerChange = () => {
      if (reloading) return;
      reloading = true;
      setRefreshing(true);
      if (reloadFallbackRef.current) window.clearTimeout(reloadFallbackRef.current);
      window.setTimeout(() => window.location.reload(), 120);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkForUpdate();
      }
    };

    const attachRegistration = (reg: ServiceWorkerRegistration | undefined) => {
      if (disposed) return;
      if (!reg) return;
      registrationRef.current = reg;

      if (reg.waiting) {
        setVisible(true);
      }

      if (updateRegistration === reg) {
        checkForUpdate();
        return;
      }

      updateRegistration?.removeEventListener("updatefound", handleUpdateFound);
      updateRegistration = reg;
      reg.addEventListener("updatefound", handleUpdateFound);
      checkForUpdate();
    };

    navigator.serviceWorker.getRegistration().then(attachRegistration).catch((error) => {
      logAndIgnore("Service worker registration lookup failed", error);
    });
    navigator.serviceWorker.ready.then((reg) => {
      attachRegistration(reg);
    }).catch((error) => {
      logAndIgnore("Service worker readiness wait failed", error);
    });

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", checkForUpdate);
    window.addEventListener("online", checkForUpdate);
    updateTimer = window.setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);

    return () => {
      disposed = true;
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", checkForUpdate);
      window.removeEventListener("online", checkForUpdate);
      updateRegistration?.removeEventListener("updatefound", handleUpdateFound);
      if (updateTimer !== null) {
        window.clearInterval(updateTimer);
        updateTimer = null;
      }
      if (reloadFallbackRef.current) {
        window.clearTimeout(reloadFallbackRef.current);
        reloadFallbackRef.current = null;
      }
      registrationRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    const node = containerRef.current;
    if (!node) return undefined;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    refreshButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !refreshing) {
        event.preventDefault();
        setVisible(false);
        previouslyFocused?.focus?.();
      }
    };

    node.addEventListener("keydown", handleKeyDown);
    return () => {
      node.removeEventListener("keydown", handleKeyDown);
    };
  }, [visible, refreshing]);

  if (!visible) return null;

  return (
    <div
      ref={containerRef}
      className="pwa-update-banner"
      role="alertdialog"
      aria-live="polite"
      aria-label={t("pwaUpdate.label", "App update available")}
      aria-describedby="pwa-update-text"
    >
      <RefreshCw size={16} className="pwa-update-icon" />
      <p id="pwa-update-text">{refreshing ? t("pwaUpdate.refreshing", "Refreshing to the latest version") : t("pwaUpdate.text", "A new version is available")}</p>
      <button
        ref={refreshButtonRef}
        type="button"
        className="pwa-update-btn"
        disabled={refreshing}
        onClick={() => {
          setRefreshing(true);
          const waitingWorker = registrationRef.current?.waiting;
          if (waitingWorker) {
            waitingWorker.postMessage({ type: "SKIP_WAITING" });
            reloadFallbackRef.current = window.setTimeout(() => window.location.reload(), 4000);
            return;
          }
          registrationRef.current?.update();
          reloadFallbackRef.current = window.setTimeout(() => window.location.reload(), 600);
        }}
      >
        {refreshing ? t("pwaUpdate.refreshingAction", "Refreshing") : t("pwaUpdate.refresh", "Refresh")}
      </button>
      <button
        type="button"
        className="pwa-update-dismiss"
        onClick={() => setVisible(false)}
        aria-label={t("pwaUpdate.dismiss", "Dismiss")}
      >
        <X size={14} />
      </button>
    </div>
  );
}
