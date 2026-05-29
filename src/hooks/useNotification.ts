import { useState, useCallback } from "react";

type NotificationType = "booking_confirmation" | "workshop_registration" | "payment_receipt";

type NotificationData = {
  to: string;
  data: Record<string, unknown>;
};

type NotificationState = {
  sending: boolean;
  error: string | null;
  success: boolean;
};

export function useNotification() {
  const [state, setState] = useState<NotificationState>({
    sending: false,
    error: null,
    success: false,
  });

  const sendNotification = useCallback(async (type: NotificationType, notificationData: NotificationData) => {
    setState({ sending: true, error: null, success: false });

    try {
      const response = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          to: notificationData.to,
          data: notificationData.data,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || "Failed to send notification");
      }

      setState({ sending: false, error: null, success: true });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send notification";
      setState({ sending: false, error: message, success: false });
      return false;
    }
  }, []);

  const sendBookingConfirmation = useCallback((email: string, bookingData: Record<string, unknown>) => {
    return sendNotification("booking_confirmation", { to: email, data: bookingData });
  }, [sendNotification]);

  const sendWorkshopRegistration = useCallback((email: string, workshopData: Record<string, unknown>) => {
    return sendNotification("workshop_registration", { to: email, data: workshopData });
  }, [sendNotification]);

  const sendPaymentReceipt = useCallback((email: string, paymentData: Record<string, unknown>) => {
    return sendNotification("payment_receipt", { to: email, data: paymentData });
  }, [sendNotification]);

  const reset = useCallback(() => {
    setState({ sending: false, error: null, success: false });
  }, []);

  return {
    ...state,
    sendNotification,
    sendBookingConfirmation,
    sendWorkshopRegistration,
    sendPaymentReceipt,
    reset,
  };
}
