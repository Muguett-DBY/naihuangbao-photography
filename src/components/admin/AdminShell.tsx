import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  CalendarCheck,
  FileText,
  HelpCircle,
  ImagePlus,
  Layers,
  LockKeyhole,
  LogOut,
  MapPin,
  Package,
  Settings,
  ShoppingBag,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button, Input, Loading, Table, Tabs } from "animal-island-ui";
import type { TabItem } from "animal-island-ui";
import type { TableColumn } from "animal-island-ui";
import { useSiteContent } from "../../hooks/useSiteContent";
import { isAbortError, type AdminTab, type ToastType } from "../../lib/admin-helpers";
import { AdminBookingsTab } from "./AdminBookingsTab";
import { AdminCopyTab } from "./AdminCopyTab";
import { AdminFaqTab } from "./AdminFaqTab";
import { AdminPackagesTab } from "./AdminPackagesTab";
import { AdminPhotosTab } from "./AdminPhotosTab";
import { AdminServicesTab } from "./AdminServicesTab";
import { AdminCoursesTab } from "./AdminCoursesTab";
import { AdminPresetsTab } from "./AdminPresetsTab";
import { AdminWorkshopsTab } from "./AdminWorkshopsTab";
import { AdminMerchandiseTab } from "./AdminMerchandiseTab";

export function AdminShell() {
  const { t } = useTranslation();
  const { siteConfig } = useSiteContent();
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>("photos");
  const [password, setPassword] = useState("");
  const [loginMessage, setLoginMessage] = useState("");
  const [toast, setToast] = useState<{ text: string; type: ToastType } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const adminTabItems: TabItem[] = useMemo(() => [
    { key: "bookings", label: t("admin.tabs.bookings"), children: null },
    { key: "photos", label: t("admin.tabs.photos"), children: null },
    { key: "stats", label: t("admin.tabs.stats"), children: null },
    { key: "courses", label: t("admin.tabs.courses"), children: null },
    { key: "presets", label: t("admin.tabs.presets"), children: null },
    { key: "workshops", label: t("admin.tabs.workshops"), children: null },
    { key: "merchandise", label: t("admin.tabs.merchandise"), children: null },
    { key: "packages", label: t("admin.tabs.packages"), children: null },
    { key: "services", label: t("admin.tabs.services"), children: null },
    { key: "faq", label: t("admin.tabs.faq"), children: null },
    { key: "copy", label: t("admin.tabs.copy"), children: null },
  ], [t]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/session", { credentials: "include", signal: controller.signal })
      .then((r) => r.json())
      .then((d) => setAuthenticated(!!d.authenticated))
      .catch((error) => { if (!isAbortError(error)) setAuthenticated(false); })
      .finally(() => { if (!controller.signal.aborted) setChecking(false); });
    return () => controller.abort();
  }, []);

  function showToast(text: string, type: ToastType) {
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    setToast({ text, type });
    toastTimerRef.current = window.setTimeout(() => { setToast(null); toastTimerRef.current = null; }, 3000);
  }

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoginMessage(t("admin.login.loggingIn"));
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST", credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!r.ok) { setLoginMessage(t("admin.login.wrongPassword")); return; }
      setAuthenticated(true); setPassword(""); setLoginMessage("");
    } catch { setLoginMessage(t("admin.login.error")); }
  }

  async function handleLogout() {
    try { await fetch("/api/admin/session", { method: "DELETE", credentials: "include" });
    } catch { showToast(t("admin.logout.error"), "info"); }
    finally { setAuthenticated(false); }
  }

  if (checking) {
    return <div className="adm-root"><div className="adm-loading">{t("admin.loading")}</div></div>;
  }

  if (!authenticated) {
    return (
      <div className="adm-root">
        <div className="adm-login-box">
          <LockKeyhole size={22} />
          <h1>{t("admin.login.title")}</h1>
          <p>{t("admin.login.subtitle")}</p>
          <form onSubmit={handleLogin}>
            <Input value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder={t("admin.login.placeholder")} autoComplete="current-password" required />
            <Button type="primary" htmlType="submit">{loginMessage || t("admin.login.submit")}</Button>
          </form>
          {loginMessage ? <p className="adm-msg">{loginMessage}</p> : null}
          <a href="/">{t("admin.login.backToSite")}</a>
        </div>
      </div>
    );
  }

  return (
    <div className="adm-root">
      <header className="adm-bar">
        <div className="adm-bar-brand">{t("admin.header.brand", { name: siteConfig.brandName })}</div>
        <div className="adm-bar-actions">
          <Button type="text" onClick={handleLogout}>
            <LogOut size={14} /> {t("admin.header.logout")}
          </Button>
          <a href="/">{t("admin.header.backToSite")}</a>
        </div>
      </header>

      {toast && <div className={`adm-toast adm-toast-${toast.type}`}>{toast.text}</div>}

      <div className="adm-shell">
        <Tabs
          items={adminTabItems}
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as AdminTab)}
          leafAnimation={false}
          shadow={false}
        />

        {activeTab === "bookings" && <AdminBookingsTab showToast={showToast} />}
        {activeTab === "photos" && <AdminPhotosTab showToast={showToast} />}
        {activeTab === "packages" && <AdminPackagesTab showToast={showToast} />}
        {activeTab === "services" && <AdminServicesTab showToast={showToast} />}
        {activeTab === "faq" && <AdminFaqTab showToast={showToast} />}
        {activeTab === "copy" && <AdminCopyTab showToast={showToast} />}
        {activeTab === "stats" && <AdminStats />}
        {activeTab === "courses" && <AdminCoursesTab showToast={showToast} />}
        {activeTab === "presets" && <AdminPresetsTab showToast={showToast} />}
        {activeTab === "workshops" && <AdminWorkshopsTab showToast={showToast} />}
        {activeTab === "merchandise" && <AdminMerchandiseTab showToast={showToast} />}
      </div>
    </div>
  );
}

type StatsData = {
  photos: { total: number; public: number; hidden: number };
  bookings: { pending: number; total: number };
};

function AdminStats() {
  const { t } = useTranslation();
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/admin/stats", { credentials: "include", signal: ctrl.signal })
      .then((r) => r.json())
      .then((d: StatsData) => { if (!ctrl.signal.aborted) setData(d); })
      .catch((error) => {
        if (!isAbortError(error)) console.warn("[admin stats] failed to load", error);
      })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, []);

  if (loading) {
    return (
      <div className="adm-content-panel" style={{ position: "relative", minHeight: 250 }}>
        <Loading active />
      </div>
    );
  }

  if (!data) {
    return <div className="adm-content-panel" style={{textAlign:'center',padding:'40px 20px'}}><p>{t("admin.stats.noData")}</p></div>;
  }

  const columns: TableColumn[] = [
    { title: t("admin.stats.metric"), dataIndex: "metric", width: "30%" },
    { title: t("admin.stats.value"), dataIndex: "value", width: "20%", align: "center" },
    { title: t("admin.stats.detail"), dataIndex: "detail" },
  ];

  const dataSource = [
    { key: "photos", metric: t("admin.stats.photosTotal"), value: data.photos.total, detail: `${data.photos.public} ${t("admin.stats.public")} · ${data.photos.hidden} ${t("admin.stats.hidden")}` },
    { key: "bookings", metric: t("admin.stats.bookingsTotal"), value: data.bookings.total, detail: `${data.bookings.pending} ${t("admin.stats.pending")}` },
  ];

  return (
    <div className="adm-content-panel">
      <h2>{t("admin.stats.title")}</h2>
      <Table columns={columns} dataSource={dataSource} rowKey="key" striped={false} />
    </div>
  );
}
