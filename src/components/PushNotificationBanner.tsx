import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell, X } from "lucide-react";
import { usePushNotification } from "../hooks/usePushNotification";

export function PushNotificationBanner() {
  const { t } = useTranslation();
  const { permission, supported, requestPermission } = usePushNotification();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem("nhb-push-dismissed") === "true";
    } catch {
      return false;
    }
  });

  if (!supported || permission === "granted" || permission === "denied" || dismissed) {
    return null;
  }

  const handleAllow = async () => {
    const granted = await requestPermission();
    if (granted) {
      setDismissed(true);
      try {
        localStorage.setItem("nhb-push-dismissed", "true");
      } catch {}
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem("nhb-push-dismissed", "true");
    } catch {}
  };

  return (
    <div className="push-notification-banner" role="alert">
      <div className="push-notification-content">
        <Bell size={18} className="push-notification-icon" />
        <div className="push-notification-text">
          <strong>{t("pushNotification.title", "Enable Notifications")}</strong>
          <span>{t("pushNotification.description", "Get alerts about bookings, new photos, and updates")}</span>
        </div>
        <div className="push-notification-actions">
          <button type="button" className="push-notification-allow" onClick={handleAllow}>
            {t("pushNotification.allow", "Allow")}
          </button>
          <button type="button" className="push-notification-dismiss" onClick={handleDismiss} aria-label={t("pushNotification.dismiss", "Dismiss")}>
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
