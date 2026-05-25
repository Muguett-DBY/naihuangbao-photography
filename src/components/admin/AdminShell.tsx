import { type FormEvent, useEffect, useRef, useState } from "react";
import {
  BarChart3,
  CalendarCheck,
  FileText,
  HelpCircle,
  ImagePlus,
  Layers,
  LockKeyhole,
  LogOut,
  Settings,
} from "lucide-react";
import { Button, Input, Tabs } from "animal-island-ui";
import type { TabItem } from "animal-island-ui";
import { useSiteContent } from "../../hooks/useSiteContent";
import { isAbortError, type AdminTab, type ToastType } from "../../lib/admin-helpers";
import { AdminBookingsTab } from "./AdminBookingsTab";
import { AdminCopyTab } from "./AdminCopyTab";
import { AdminFaqTab } from "./AdminFaqTab";
import { AdminPackagesTab } from "./AdminPackagesTab";
import { AdminPhotosTab } from "./AdminPhotosTab";
import { AdminServicesTab } from "./AdminServicesTab";

const adminTabItems: TabItem[] = [
  { key: "bookings", label: "预约", children: null },
  { key: "photos", label: "照片", children: null },
  { key: "stats", label: "数据", children: null },
  { key: "packages", label: "套餐价格", children: null },
  { key: "services", label: "服务规则", children: null },
  { key: "faq", label: "FAQ/流程", children: null },
  { key: "copy", label: "主页文案", children: null },
];

export function AdminShell() {
  const { siteConfig } = useSiteContent();
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>("photos");
  const [password, setPassword] = useState("");
  const [loginMessage, setLoginMessage] = useState("");
  const [toast, setToast] = useState<{ text: string; type: ToastType } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

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
    setLoginMessage("正在登录...");
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST", credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!r.ok) { setLoginMessage("密码不正确"); return; }
      setAuthenticated(true); setPassword(""); setLoginMessage("");
    } catch { setLoginMessage("登录失败，请稍后重试"); }
  }

  async function handleLogout() {
    try { await fetch("/api/admin/session", { method: "DELETE", credentials: "include" });
    } catch { showToast("退出请求失败，本地登录状态已清除。", "info"); }
    finally { setAuthenticated(false); }
  }

  if (checking) {
    return <div className="adm-root"><div className="adm-loading">检查登录状态...</div></div>;
  }

  if (!authenticated) {
    return (
      <div className="adm-root">
        <div className="adm-login-box">
          <LockKeyhole size={22} />
          <h1>作品与内容管理</h1>
          <p>输入后台密码登录</p>
          <form onSubmit={handleLogin}>
            <Input value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="输入密码" autoComplete="current-password" required />
            <Button type="primary" htmlType="submit">{loginMessage || "登录"}</Button>
          </form>
          {loginMessage ? <p className="adm-msg">{loginMessage}</p> : null}
          <a href="/">← 返回官网</a>
        </div>
      </div>
    );
  }

  return (
    <div className="adm-root">
      <header className="adm-bar">
        <div className="adm-bar-brand">{siteConfig.brandName} · 后台管理</div>
        <div className="adm-bar-actions">
          <Button type="text" onClick={handleLogout}>
            <LogOut size={14} /> 退出
          </Button>
          <a href="/">← 官网</a>
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
      </div>
    </div>
  );
}

type StatsData = {
  photos: { total: number; public: number; hidden: number };
  bookings: { pending: number; total: number };
};

function AdminStats() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/admin/stats", { credentials: "include", signal: ctrl.signal })
      .then((r) => r.json())
      .then((d: StatsData) => { if (!ctrl.signal.aborted) setData(d); })
      .catch(() => {})
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, []);

  if (loading) {
    return <div className="adm-content-panel" style={{textAlign:'center',padding:'40px 20px'}}><p>加载中...</p></div>;
  }

  if (!data) {
    return <div className="adm-content-panel" style={{textAlign:'center',padding:'40px 20px'}}><p>暂时无法加载数据</p></div>;
  }

  return (
    <div className="adm-content-panel">
      <h2>数据概览</h2>
      <div className="adm-stats-grid">
        <div className="adm-stat-card">
          <span className="adm-stat-number">{data.photos.total}</span>
          <span className="adm-stat-label">照片总数</span>
          <div className="adm-stat-bar">
            <div className="adm-stat-bar-fill" style={{width: `${data.photos.total ? (data.photos.public / data.photos.total) * 100 : 0}%`}} />
          </div>
          <span className="adm-stat-sub">{data.photos.public} 公开 · {data.photos.hidden} 隐藏</span>
        </div>
        <div className="adm-stat-card">
          <span className="adm-stat-number">{data.bookings.total}</span>
          <span className="adm-stat-label">预约总数</span>
          <span className="adm-stat-sub">{data.bookings.pending} 个待处理</span>
        </div>
      </div>
    </div>
  );
}
