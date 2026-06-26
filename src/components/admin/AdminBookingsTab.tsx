import { CalendarCheck, CheckCircle, Clock, MessageCircle, WalletCards, XCircle } from "lucide-react";
import { Button } from "animal-island-ui";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { adminMutationHeaders, type ToastType } from "../../lib/admin-helpers";
import { isAbortError } from "../../lib/errors";

type PaymentFilter = "all" | BookingItem["payment_status"];

type BookingItem = {
  id: string;
  package_name: string;
  preferred_date: string;
  preferred_time: string;
  name: string;
  contact: string;
  notes: string;
  status: "pending" | "contacted" | "done";
  created_at: string;
  payment_intent_id: string | null;
  payment_status: "not_started" | "pending" | "processing" | "succeeded" | "failed" | "cancelled" | "refunded";
  payment_provider: string | null;
  payment_amount_cents: number | null;
  payment_currency: string | null;
};

const statusLabels: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  pending: { label: "待联系", icon: Clock, className: "badge-pending" },
  contacted: { label: "已联系", icon: CheckCircle, className: "badge-contacted" },
  confirmed: { label: "已确认", icon: CheckCircle, className: "badge-contacted" },
  cancelled: { label: "已取消", icon: XCircle, className: "badge-done" },
  done: { label: "已完成", icon: XCircle, className: "badge-done" },
};

function formatPaymentAmount(amountCents: number | null, currency: string | null, locale: string, fallback: string): string {
  if (amountCents == null || !currency) return fallback;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amountCents / (currency.toLowerCase() === "jpy" ? 1 : 100));
  } catch {
    return `${(amountCents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

export function AdminBookingsTab({ showToast, newBookingIds }: { showToast: (text: string, type: ToastType) => void; newBookingIds?: Set<string> }) {
  const { t, i18n } = useTranslation();
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/admin/bookings", { credentials: "include", signal: ctrl.signal })
      .then((r) => r.json())
      .then((d: { bookings?: BookingItem[] }) => {
        if (d.bookings && !ctrl.signal.aborted) setBookings(d.bookings);
      })
      .catch((error) => {
        if (!isAbortError(error)) {
          console.warn("[admin bookings] failed to load", error);
          showToast("预约请求加载失败", "error");
        }
      })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, []);

  async function updateStatus(id: string, status: string) {
    try {
      const r = await fetch("/api/admin/bookings", {
        method: "PATCH", credentials: "include",
        headers: { "content-type": "application/json", ...adminMutationHeaders },
        body: JSON.stringify({ id, status }),
      });
      if (!r.ok) { showToast("更新失败", "error"); return; }
      setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: status as BookingItem["status"] } : b));
      showToast("状态已更新", "success");
    } catch {
      showToast("更新失败", "error");
    }
  }

  if (loading) {
    return <div className="adm-content-panel"><div className="adm-loading">加载中...</div></div>;
  }

  const paymentStatusCounts = bookings.reduce<Record<BookingItem["payment_status"], number>>((counts, booking) => {
    const status = booking.payment_status || "not_started";
    counts[status] += 1;
    return counts;
  }, {
    not_started: 0,
    pending: 0,
    processing: 0,
    succeeded: 0,
    failed: 0,
    cancelled: 0,
    refunded: 0,
  });
  const followUpCount = paymentStatusCounts.pending + paymentStatusCounts.processing;
  const paymentFilters: Array<{ key: PaymentFilter; label: string; count: number }> = [
    { key: "all", label: t("admin.bookings.paymentFilterAll", "All deposits"), count: bookings.length },
    { key: "pending", label: t("dashboard.paymentStatus.pending"), count: paymentStatusCounts.pending },
    { key: "processing", label: t("dashboard.paymentStatus.processing"), count: paymentStatusCounts.processing },
    { key: "succeeded", label: t("dashboard.paymentStatus.succeeded"), count: paymentStatusCounts.succeeded },
    { key: "failed", label: t("dashboard.paymentStatus.failed"), count: paymentStatusCounts.failed },
    { key: "cancelled", label: t("dashboard.paymentStatus.cancelled"), count: paymentStatusCounts.cancelled },
    { key: "refunded", label: t("dashboard.paymentStatus.refunded"), count: paymentStatusCounts.refunded },
    { key: "not_started", label: t("dashboard.paymentStatus.not_started"), count: paymentStatusCounts.not_started },
  ];
  const filteredBookings = paymentFilter === "all"
    ? bookings
    : bookings.filter((booking) => (booking.payment_status || "not_started") === paymentFilter);
  const paymentReadinessItems = [
    t("admin.bookings.paymentReadinessStripeKeys", "Set live Stripe keys before enabling Payment Element."),
    t("admin.bookings.paymentReadinessWebhook", "Verify webhook secret and status matrix before accepting live deposits."),
    t("admin.bookings.paymentReadinessRefunds", "Keep refunds and failed payments in manual follow-up until the runbook is complete."),
  ];

  return (
    <div className="adm-content-panel">
      <h2>预约请求 ({bookings.length})</h2>
      {bookings.length === 0 ? (
        <div className="adm-empty" style={{ marginTop: 40 }}>
          <CalendarCheck size={36} />
          <p>暂无预约请求</p>
        </div>
      ) : (
        <>
        <div className="adm-booking-payment-summary" aria-live="polite">
          <div>
            <span>{t("admin.bookings.paymentFollowUpQueue", "Payment follow-up queue")}</span>
            <strong>{followUpCount}</strong>
          </div>
          <div className="adm-booking-payment-filters" role="group" aria-label={t("admin.bookings.paymentFilterLabel", "Filter deposits by payment status")}>
            {paymentFilters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                className={`adm-booking-payment-filter${paymentFilter === filter.key ? " is-active" : ""}`}
                onClick={() => setPaymentFilter(filter.key)}
                aria-pressed={paymentFilter === filter.key}
              >
                <span>{filter.label}</span>
                <strong>{filter.count}</strong>
              </button>
            ))}
          </div>
          <div className="adm-payment-readiness">
            <strong>{t("admin.bookings.paymentReadinessTitle", "Live payment readiness")}</strong>
            <ul>
              {paymentReadinessItems.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </div>
        <div className="adm-booking-list">
          {filteredBookings.map((b) => {
            const st = statusLabels[b.status] || statusLabels.pending;
            const paymentStatus = b.payment_status || "not_started";
            const Icon = st.icon;
            return (
              <div key={b.id} className={`adm-booking-card ${b.status}${newBookingIds?.has(b.id) ? " is-new" : ""}`}>
                <div className="adm-booking-head">
                  <strong>{b.name}</strong>
                  <span className={`adm-booking-badge ${st.className}`}>
                    <Icon size={12} /> {st.label}
                  </span>
                </div>
                <div className="adm-booking-meta">
                  <span><MessageCircle size={13} /> {b.contact}</span>
                  {b.package_name ? <span>套餐：{b.package_name}</span> : null}
                  {b.preferred_date ? <span>日期：{b.preferred_date} {b.preferred_time}</span> : null}
                  <span className="adm-booking-time">提交于：{new Date(b.created_at).toLocaleString("zh-CN")}</span>
                </div>
                <div className={`adm-booking-payment adm-booking-payment--${paymentStatus}`}>
                  <WalletCards size={15} />
                  <span>{t("dashboard.bookingDeposit")}: {t(`dashboard.paymentStatus.${paymentStatus}`)}</span>
                  <strong>{formatPaymentAmount(b.payment_amount_cents, b.payment_currency, i18n.language, t("admin.bookings.amountPending", "Amount pending"))}</strong>
                  <small>
                    {b.payment_provider
                      ? `${t("admin.bookings.paymentProvider", "Provider")}: ${b.payment_provider}`
                      : t("admin.bookings.waitingForPaymentConfirmation", "Waiting for customer confirmation")}
                  </small>
                </div>
                {b.notes ? <p className="adm-booking-notes">{b.notes}</p> : null}
                <div className="adm-booking-actions">
                  {b.status === "pending" && (
                    <Button type="primary" size="small" className="adm-btn-contact" onClick={() => updateStatus(b.id, "contacted")}>
                      <CheckCircle size={13} /> 标记已联系
                    </Button>
                  )}
                  {b.status === "contacted" && (
                    <Button type="primary" size="small" className="adm-btn-done" onClick={() => updateStatus(b.id, "done")}>
                      <XCircle size={13} /> 标记已完成
                    </Button>
                  )}
                  {b.status === "done" ? null : (
                    <Button type="text" size="small" className="adm-btn-skip" onClick={() => updateStatus(b.id, "done")}>
                      忽略
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        </>
      )}
    </div>
  );
}
