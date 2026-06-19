import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Download } from "lucide-react";

const STORAGE_KEY = "nhb-pwa-install-dismissed";
const SHOW_DELAY_MS = 3_000;
const MIN_VISITS = 2;
const VISIT_KEY = "nhb-visit-count";

function getVisitCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    return parseInt(window.sessionStorage.getItem(VISIT_KEY) ?? "0", 10);
  } catch {
    return 0;
  }
}

function incrementVisitCount() {
  if (typeof window === "undefined") return;
  try {
    const current = getVisitCount();
    window.sessionStorage.setItem(VISIT_KEY, String(current + 1));
  } catch {
    // ignore
  }
}

export function PwaInstallBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const deferredPromptRef = useRef<any>(null);

  useEffect(() => {
    incrementVisitCount();
    if (getVisitCount() < MIN_VISITS) return undefined;

    const dismissed = window.localStorage.getItem(STORAGE_KEY);
    if (dismissed === "true") return undefined;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      deferredPromptRef.current = event;
      const timer = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
      return () => window.clearTimeout(timer);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (!visible) return null;

  return (
    <div className="pwa-install-banner" role="alert" aria-label={t("pwaInstall.label", "Install app")}>
      <div className="pwa-install-content">
        <Download size={18} />
        <p>{t("pwaInstall.text", "Add to your home screen for the best experience")}</p>
      </div>
      <div className="pwa-install-actions">
        <button
          type="button"
          className="pwa-install-btn"
          onClick={async () => {
            deferredPromptRef.current?.prompt();
            setVisible(false);
            window.localStorage.setItem(STORAGE_KEY, "true");
          }}
        >
          {t("pwaInstall.install", "Install")}
        </button>
        <button
          type="button"
          className="pwa-install-dismiss"
          onClick={() => {
            setVisible(false);
            window.localStorage.setItem(STORAGE_KEY, "true");
          }}
          aria-label={t("pwaInstall.dismiss", "Dismiss")}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
