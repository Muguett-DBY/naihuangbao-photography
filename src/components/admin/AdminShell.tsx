import { type FormEvent, useEffect, useRef, useState } from "react";
import {
  BarChart3,
  FileText,
  HelpCircle,
  ImagePlus,
  Layers,
  LockKeyhole,
  LogOut,
  Settings,
} from "lucide-react";
import { useSiteContent } from "../../hooks/useSiteContent";
import { isAbortError, type AdminTab, type ToastType } from "../../lib/admin-helpers";
import { AdminCopyTab } from "./AdminCopyTab";
import { AdminFaqTab } from "./AdminFaqTab";
import { AdminPackagesTab } from "./AdminPackagesTab";
import { AdminPhotosTab } from "./AdminPhotosTab";
import { AdminServicesTab } from "./AdminServicesTab";

const tabs: Array<{ id: AdminTab; label: string; icon: typeof ImagePlus }> = [
  { id: "photos", label: "照片", icon: ImagePlus },
  { id: "stats", label: "数据", icon: BarChart3 },
  { id: "packages", label: "套餐价格", icon: Layers },
  { id: "services", label: "服务规则", icon: Settings },
  { id: "faq", label: "FAQ/流程", icon: HelpCircle },
  { id: "copy", label: "主页文案", icon: FileText },
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
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="输入密码" autoComplete="current-password" required />
            <button type="submit">{loginMessage || "登录"}</button>
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
          <button onClick={handleLogout}><LogOut size={14} /> 退出</button>
          <a href="/">← 官网</a>
        </div>
      </header>

      {toast && <div className={`adm-toast adm-toast-${toast.type}`}>{toast.text}</div>}

      <div className="adm-shell">
        <nav className="adm-tabs" aria-label="后台功能">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} className={activeTab === tab.id ? "is-active" : ""}
                onClick={() => setActiveTab(tab.id)} type="button">
                <Icon size={15} /> {tab.label}
              </button>
            );
          })}
        </nav>

        {activeTab === "photos" && <AdminPhotosTab showToast={showToast} />}
        {activeTab === "packages" && <AdminPackagesTab showToast={showToast} />}
        {activeTab === "services" && <AdminServicesTab showToast={showToast} />}
        {activeTab === "faq" && <AdminFaqTab showToast={showToast} />}
        {activeTab === "copy" && <AdminCopyTab showToast={showToast} />}
        {activeTab === "stats" && <div className="adm-content-panel" style={{textAlign:'center',padding:'40px 20px'}}>
          <p style={{fontSize:'18px',margin:'0 0 8px',color:'#5d4e49'}}>📊</p>
          <p style={{fontSize:'13px',margin:0,color:'#8f7d77'}}>统计功能开发中</p>
        </div>}
      </div>
    </div>
  );
}
