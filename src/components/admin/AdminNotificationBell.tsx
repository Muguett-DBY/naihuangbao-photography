import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell, CalendarCheck, X } from "lucide-react";

type Notification = {
  id: string;
  type: "booking" | "system";
  title: string;
  message: string;
  time: string;
  read: boolean;
};

type Props = {
  newBookingCount: number;
  onDismiss: () => void;
};

export function AdminNotificationBell({ newBookingCount, onDismiss }: Props) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications] = useState<Notification[]>(() => {
    const items: Notification[] = [];
    if (newBookingCount > 0) {
      items.push({
        id: "booking-notif",
        type: "booking",
        title: t("admin.notifications.newBooking", "New Booking"),
        message: t("admin.notifications.newBookingMsg", "You have {{count}} new booking(s).", { count: newBookingCount }),
        time: new Date().toISOString(),
        read: false,
      });
    }
    return items;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="adm-notif-wrapper">
      <button
        type="button"
        className="adm-notif-bell"
        onClick={() => { setIsOpen(!isOpen); if (isOpen) onDismiss(); }}
        aria-label={t("admin.notifications.title", "Notifications")}
      >
        <Bell size={16} />
        {unreadCount > 0 && <span className="adm-notif-badge">{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="adm-notif-dropdown">
          <div className="adm-notif-header">
            <strong>{t("admin.notifications.title", "Notifications")}</strong>
            <button type="button" onClick={() => setIsOpen(false)}><X size={14} /></button>
          </div>
          {notifications.length === 0 ? (
            <div className="adm-notif-empty">{t("admin.notifications.empty", "No notifications")}</div>
          ) : (
            <div className="adm-notif-list">
              {notifications.map((n) => (
                <div key={n.id} className={`adm-notif-item${n.read ? " is-read" : ""}`}>
                  <span className="adm-notif-icon">{n.type === "booking" ? <CalendarCheck size={14} /> : <Bell size={14} />}</span>
                  <div className="adm-notif-content">
                    <strong>{n.title}</strong>
                    <p>{n.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
