import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw, X } from "lucide-react";

export function PwaUpdateBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return undefined;

    let refreshing = false;

    navigator.serviceWorker.ready.then((reg) => {
      registrationRef.current = reg;

      if (reg.waiting) {
        setVisible(true);
      }

      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            setVisible(true);
          }
        });
      });
    });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    return () => {
      if (registrationRef.current) {
        registrationRef.current = null;
      }
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="pwa-update-banner" role="alert" aria-label={t("pwaUpdate.label", "App update available")}>
      <RefreshCw size={16} className="pwa-update-icon" />
      <p>{t("pwaUpdate.text", "A new version is available")}</p>
      <button
        type="button"
        className="pwa-update-btn"
        onClick={() => {
          registrationRef.current?.waiting?.postMessage("skipWaiting");
          setVisible(false);
        }}
      >
        {t("pwaUpdate.refresh", "Refresh")}
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
