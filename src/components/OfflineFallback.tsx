import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";

type OfflineFallbackProps = {
  isOffline: boolean;
};

export function OfflineFallback({ isOffline }: OfflineFallbackProps) {
  const { t } = useTranslation();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (isOffline) {
      setShowBanner(true);
    } else {
      // Hide banner after coming back online
      const timer = setTimeout(() => setShowBanner(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOffline]);

  if (!showBanner) return null;

  return (
    <div className={`offline-banner offline-banner--${isOffline ? "offline" : "online"}`} role="alert" aria-live="polite">
      <div className="offline-banner-content">
        <span className="offline-icon" aria-hidden="true">
          {isOffline ? <WifiOff size={18} /> : <Wifi size={18} />}
        </span>
        <span className="offline-text">
          {isOffline
            ? t("offlineStatus.offline", "You're offline. Saved bookings stay on this device.")
            : t("offlineStatus.online", "You're back online. Checking saved bookings.")}
        </span>
      </div>
    </div>
  );
}
