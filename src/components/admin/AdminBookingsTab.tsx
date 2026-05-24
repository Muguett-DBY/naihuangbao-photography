import { CalendarCheck, CheckCircle, Clock, MessageCircle, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import type { ToastType } from "../../lib/admin-helpers";

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
};

const statusLabels: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  pending: { label: "待联系", icon: Clock, className: "badge-pending" },
  contacted: { label: "已联系", icon: CheckCircle, className: "badge-contacted" },
  done: { label: "已完成", icon: XCircle, className: "badge-done" },
};

export function AdminBookingsTab({ showToast }: { showToast: (text: string, type: ToastType) => void }) {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/admin/bookings", { credentials: "include", signal: ctrl.signal })
      .then((r) => r.json())
      .then((d: { bookings?: BookingItem[] }) => {
        if (d.bookings && !ctrl.signal.aborted) setBookings(d.bookings);
      })
      .catch(() => {})
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, []);

  async function updateStatus(id: string, status: string) {
    try {
      const r = await fetch("/api/admin/bookings", {
        method: "PATCH", credentials: "include",
        headers: { "content-type": "application/json" },
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

  return (
    <div className="adm-content-panel">
      <h2>预约请求 ({bookings.length})</h2>
      {bookings.length === 0 ? (
        <div className="adm-empty" style={{ marginTop: 40 }}>
          <CalendarCheck size={36} />
          <p>暂无预约请求</p>
        </div>
      ) : (
        <div className="adm-booking-list">
          {bookings.map((b) => {
            const st = statusLabels[b.status] || statusLabels.pending;
            const Icon = st.icon;
            return (
              <div key={b.id} className={`adm-booking-card ${b.status}`}>
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
                {b.notes ? <p className="adm-booking-notes">{b.notes}</p> : null}
                <div className="adm-booking-actions">
                  {b.status === "pending" && (
                    <button className="adm-btn-contact" onClick={() => updateStatus(b.id, "contacted")}>
                      <CheckCircle size={13} /> 标记已联系
                    </button>
                  )}
                  {b.status === "contacted" && (
                    <button className="adm-btn-done" onClick={() => updateStatus(b.id, "done")}>
                      <XCircle size={13} /> 标记已完成
                    </button>
                  )}
                  {b.status === "done" ? null : (
                    <button className="adm-btn-skip" onClick={() => updateStatus(b.id, "done")}>
                      忽略
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
