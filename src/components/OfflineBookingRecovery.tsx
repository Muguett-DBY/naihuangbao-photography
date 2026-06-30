import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useBookingModal } from "../hooks/useBookingModal";
import {
  clearSyncedBookings,
  getPendingBookings,
  PENDING_BOOKINGS_CHANGED_EVENT,
  removePendingBooking,
  summarizePendingBookingRecovery,
  syncPendingBookings,
  type PendingBooking,
} from "../utils/offlineBooking";
import { track } from "../utils/track";

type OfflineBookingRecoveryProps = {
  isOnline: boolean;
};

type RecoverableBooking = PendingBooking & { status: "pending" | "failed" };

function isRecoverableBooking(booking: PendingBooking): booking is RecoverableBooking {
  return booking.status === "pending" || booking.status === "failed";
}

export default function OfflineBookingRecovery({ isOnline }: OfflineBookingRecoveryProps) {
  const { t } = useTranslation();
  const { openBookingModal } = useBookingModal();
  const [bookings, setBookings] = useState<PendingBooking[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncedCount, setSyncedCount] = useState(0);
  const syncInFlight = useRef(false);

  const refresh = useCallback(async () => {
    const stored = await getPendingBookings();
    setBookings(stored.filter((booking) => booking.status !== "synced"));
    setLoaded(true);
  }, []);

  const runSync = useCallback(async () => {
    if (!isOnline || syncInFlight.current) return;
    syncInFlight.current = true;
    setSyncing(true);
    try {
      const result = await syncPendingBookings();
      await refresh();
      if (result.synced > 0) {
        setSyncedCount(result.synced);
        track("booking_offline_synced", { count: result.synced });
      }
    } finally {
      syncInFlight.current = false;
      setSyncing(false);
    }
  }, [isOnline, refresh]);

  useEffect(() => {
    void clearSyncedBookings().then(refresh);
  }, [refresh]);

  useEffect(() => {
    const handleChange = () => void refresh();
    window.addEventListener(PENDING_BOOKINGS_CHANGED_EVENT, handleChange);
    return () => window.removeEventListener(PENDING_BOOKINGS_CHANGED_EVENT, handleChange);
  }, [refresh]);

  useEffect(() => {
    if (isOnline) void runSync();
  }, [isOnline, runSync]);

  useEffect(() => {
    if (syncedCount === 0) return;
    const timer = window.setTimeout(() => setSyncedCount(0), 5000);
    return () => window.clearTimeout(timer);
  }, [syncedCount]);

  const recoverableBookings = useMemo(
    () => bookings.filter(isRecoverableBooking),
    [bookings],
  );
  const summary = summarizePendingBookingRecovery(recoverableBookings);
  const firstFailedBooking = recoverableBookings.find((booking) => booking.status === "failed");

  const handleRemove = useCallback(async (id: string) => {
    await removePendingBooking(id);
    await refresh();
  }, [refresh]);

  if (!loaded || (summary.totalCount === 0 && syncedCount === 0)) return null;

  const hasFailed = summary.failedCount > 0;
  const stateClass = syncedCount > 0 && summary.totalCount === 0
    ? "offline-booking-recovery--success"
    : hasFailed
      ? "offline-booking-recovery--failed"
      : "offline-booking-recovery--pending";
  const title = syncedCount > 0 && summary.totalCount === 0
    ? t("offlineBookingRecovery.synced", { count: syncedCount, defaultValue: "{{count}} saved booking sent successfully." })
    : hasFailed
      ? t("offlineBookingRecovery.failed", { count: summary.failedCount, defaultValue: "{{count}} saved booking needs attention." })
      : isOnline
        ? t("offlineBookingRecovery.pendingOnline", { count: summary.pendingCount, defaultValue: "{{count}} saved booking is waiting to sync." })
        : t("offlineBookingRecovery.pendingOffline", { count: summary.pendingCount, defaultValue: "{{count}} booking is safe on this device." });

  return (
    <section
      className={`offline-booking-recovery ${stateClass}`}
      aria-label={t("offlineBookingRecovery.title", "Saved booking recovery")}
      aria-live="polite"
    >
      <div className="offline-booking-recovery-inner">
        <span className="offline-booking-recovery-icon" aria-hidden="true">
          {syncedCount > 0 && summary.totalCount === 0
            ? <CheckCircle2 size={20} />
            : <AlertTriangle size={20} />}
        </span>
        <div className="offline-booking-recovery-copy">
          <strong>{title}</strong>
          {summary.totalCount > 0 ? (
            <p>
              {hasFailed
                ? t("offlineBookingRecovery.failedDetail", "Remove a rejected request or start a fresh booking with corrected details.")
                : t("offlineBookingRecovery.pendingDetail", "This request remains on this device until the studio receives it.")}
            </p>
          ) : null}
          {recoverableBookings.length > 0 ? (
            <ul className="offline-booking-recovery-list">
              {recoverableBookings.map((booking) => (
                <li key={booking.id}>
                  <span className={`offline-booking-recovery-status offline-booking-recovery-status--${booking.status}`}>
                    {t(`offlineBookingRecovery.status.${booking.status}`)}
                  </span>
                  <span className="offline-booking-recovery-booking">
                    <strong>{booking.packageName || t("offlineBookingRecovery.unknownPackage", "Photography session")}</strong>
                    <small>{booking.preferredDate || t("offlineBookingRecovery.noDate", "Date not selected")}</small>
                  </span>
                  <button
                    type="button"
                    className="offline-booking-recovery-remove"
                    onClick={() => void handleRemove(booking.id)}
                    aria-label={t("offlineBookingRecovery.remove", { packageName: booking.packageName, defaultValue: "Remove saved {{packageName}} booking" })}
                    title={t("offlineBookingRecovery.remove", { packageName: booking.packageName, defaultValue: "Remove saved {{packageName}} booking" })}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {summary.totalCount > 0 ? (
          <div className="offline-booking-recovery-actions">
            {summary.pendingCount > 0 && isOnline ? (
              <button type="button" className="offline-booking-recovery-sync" onClick={() => void runSync()} disabled={syncing}>
                <RefreshCw size={16} aria-hidden="true" className={syncing ? "is-spinning" : undefined} />
                {syncing ? t("offlineBookingRecovery.syncing", "Syncing...") : t("offlineBookingRecovery.syncNow", "Sync now")}
              </button>
            ) : null}
            {firstFailedBooking ? (
              <button
                type="button"
                className="offline-booking-recovery-rebook"
                onClick={() => openBookingModal(firstFailedBooking.packageName || undefined)}
              >
                {t("offlineBookingRecovery.bookAgain", "Book again")}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
