import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, LoaderCircle } from "lucide-react";

const STORAGE_KEY = "nhb-pwa-install-dismissed-until";
const INSTALLED_KEY = "nhb-pwa-installed";
const VISIT_KEY = "nhb-visit-count";
const SHOW_DELAY_MS = 3_000;
const MIN_VISITS = 2;
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

type InstallChoice = {
  outcome: "accepted" | "dismissed";
  platform: string;
};

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
}

function readStoredNumber(key: string): number {
  try {
    const value = Number.parseInt(window.localStorage.getItem(key) ?? "0", 10);
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function writeStoredValue(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

function recordVisit(): number {
  const visits = readStoredNumber(VISIT_KEY) + 1;
  writeStoredValue(VISIT_KEY, String(visits));
  return visits;
}

function isStandalone() {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
}

function canOfferInstall(visits: number) {
  if (isStandalone()) return false;
  try {
    if (window.localStorage.getItem(INSTALLED_KEY) === "true") return false;
  } catch {
    // Keep the install path available if storage reads are blocked.
  }
  return visits >= MIN_VISITS && readStoredNumber(STORAGE_KEY) <= Date.now();
}

export function PwaInstallBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const showTimerRef = useRef<number | null>(null);
  const visitsRef = useRef(0);

  const clearShowTimer = () => {
    if (showTimerRef.current === null) return;
    window.clearTimeout(showTimerRef.current);
    showTimerRef.current = null;
  };

  const dismissUntilLater = () => {
    clearShowTimer();
    setVisible(false);
    setInstalling(false);
    setInstallError(false);
    deferredPromptRef.current = null;
    writeStoredValue(STORAGE_KEY, String(Date.now() + DISMISS_COOLDOWN_MS));
  };

  useEffect(() => {
    visitsRef.current = recordVisit();

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      if (!canOfferInstall(visitsRef.current)) return;

      deferredPromptRef.current = event as BeforeInstallPromptEvent;
      clearShowTimer();
      showTimerRef.current = window.setTimeout(() => {
        showTimerRef.current = null;
        setVisible(true);
      }, SHOW_DELAY_MS);
    };

    const onAppInstalled = () => {
      clearShowTimer();
      deferredPromptRef.current = null;
      writeStoredValue(INSTALLED_KEY, "true");
      setInstalling(false);
      setInstallError(false);
      setVisible(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      clearShowTimer();
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onAppInstalled);
      deferredPromptRef.current = null;
    };
  }, []);

  const install = async () => {
    const promptEvent = deferredPromptRef.current;
    if (!promptEvent || installing) return;

    setInstalling(true);
    setInstallError(false);
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      deferredPromptRef.current = null;
      if (choice.outcome === "accepted") {
        writeStoredValue(INSTALLED_KEY, "true");
        setInstalling(false);
        setVisible(false);
        return;
      }
      dismissUntilLater();
    } catch {
      setInstalling(false);
      setInstallError(true);
    }
  };

  if (!visible) return null;

  return (
    <aside
      className="pwa-install-banner"
      role="dialog"
      aria-modal="false"
      aria-labelledby="pwa-install-title"
      aria-describedby="pwa-install-description"
    >
      <span className="pwa-install-icon" aria-hidden="true">
        <Download size={20} />
      </span>
      <div className="pwa-install-copy">
        <strong id="pwa-install-title">{t("pwaInstall.title", "Install Naihuangbao Photography")}</strong>
        <p id="pwa-install-description">{t("pwaInstall.text", "Open bookings, photos, and editing tools like an app")}</p>
        <span className="pwa-install-benefit">{t("pwaInstall.benefit", "Faster return visits with offline-ready pages")}</span>
        {installing ? (
          <span className="pwa-install-status" role="status" aria-live="polite">
            <LoaderCircle size={14} aria-hidden="true" />
            {t("pwaInstall.installing", "Waiting for browser confirmation")}
          </span>
        ) : null}
        {installError ? (
          <span className="pwa-install-status is-error" role="alert">
            {t("pwaInstall.error", "The install prompt could not open. Please try again later.")}
          </span>
        ) : null}
      </div>
      <div className="pwa-install-actions">
        <button
          type="button"
          className="pwa-install-btn"
          disabled={installing}
          onClick={() => void install()}
        >
          {installing ? t("pwaInstall.installing", "Installing") : t("pwaInstall.install", "Install app")}
        </button>
        <button
          type="button"
          className="pwa-install-later"
          disabled={installing}
          onClick={dismissUntilLater}
          aria-label={t("pwaInstall.dismiss", "Dismiss install prompt")}
        >
          {t("pwaInstall.later", "Later")}
        </button>
      </div>
    </aside>
  );
}
