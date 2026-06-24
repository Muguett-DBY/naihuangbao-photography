import { useState, useCallback, useEffect } from "react";

type PushNotificationState = {
  permission: NotificationPermission;
  supported: boolean;
};

export function usePushNotification() {
  const [state, setState] = useState<PushNotificationState>({
    permission: "default",
    supported: false,
  });

  useEffect(() => {
    if ("Notification" in window) {
      setState({
        permission: Notification.permission,
        supported: true,
      });
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!("Notification" in window)) return false;

    try {
      const permission = await Notification.requestPermission();
      setState((prev) => ({ ...prev, permission }));
      return permission === "granted";
    } catch {
      return false;
    }
  }, []);

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    try {
      new Notification(title, {
        icon: "/icons/pwa-icon-192.png",
        badge: "/icons/pwa-icon-192.png",
        ...options,
      });
    } catch {
      // Notification API might not be available in some contexts
    }
  }, []);

  return {
    ...state,
    requestPermission,
    showNotification,
  };
}
