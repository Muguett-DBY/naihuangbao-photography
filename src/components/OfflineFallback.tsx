import { useEffect, useState } from "react";

type OfflineFallbackProps = {
  isOffline: boolean;
};

export function OfflineFallback({ isOffline }: OfflineFallbackProps) {
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
    <div className="offline-banner" role="alert" aria-live="polite">
      <div className="offline-banner-content">
        <span className="offline-icon">📡</span>
        <span className="offline-text">
          {isOffline
            ? "You're offline. Showing cached content."
            : "You're back online!"}
        </span>
      </div>
    </div>
  );
}
