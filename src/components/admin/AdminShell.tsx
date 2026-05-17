import { type FormEvent, useEffect, useRef, useState } from "react";
import {
  FileText,
  HelpCircle,
  ImagePlus,
  Layers,
  LockKeyhole,
  LogOut,
  Pencil,
  Plus,
  Save,
  Settings,
  Trash2,
  Upload,
} from "lucide-react";
import { defaultSiteContent, mergeSiteContent } from "../../data/content";
import { styleLabels } from "../../data/site";
import type {
  ContentKey,
  FaqItem,
  PackageItem,
  ServicePolicy,
  SiteContent,
  WhyCard,
  WhyCardIcon,
} from "../../types/content";
import type { PhotoItem, PhotoStyle, PhotoVisibility } from "../../types/photo";
import { ConfirmDialog } from "../ConfirmDialog";

type ToastType = "success" | "error" | "info";
type AdminTab = "photos" | "packages" | "services" | "faq" | "copy";

type EditForm = {
  title: string;
  style: PhotoStyle;
  location: string;
  featured: boolean;
  visibility: PhotoVisibility;
};

const tabs: Array<{ id: AdminTab; label: string; icon: typeof ImagePlus }> = [
  { id: "photos", label: "照片", icon: ImagePlus },
  { id: "packages", label: "套餐价格", icon: Layers },
  { id: "services", label: "服务规则", icon: Settings },
  { id: "faq", label: "FAQ/流程", icon: HelpCircle },
  { id: "copy", label: "主页文案", icon: FileText },
];

const whyIconOptions: Array<{ value: WhyCardIcon; label: string }> = [
  { value: "heart", label: "爱心" },
  { value: "camera", label: "相机" },
  { value: "message", label: "沟通" },
  { value: "shield", label: "保护" },
];

const emptyPackage: PackageItem = {
  name: "新套餐",
  price: "0/h",
  duration: "2小时起拍",
  summary: "填写套餐说明",
  includes: ["前期沟通", "拍摄引导"],
};

const emptyPolicy: ServicePolicy = {
  title: "新规则",
  detail: "填写规则说明",
};

const emptyFaq: FaqItem = {
  question: "新问题",
  answer: "填写回答",
};

const emptyWhyCard: WhyCard = {
  icon: "heart",
  title: "新亮点",
  detail: "填写说明",
};

export function AdminShell() {
  const [remotePhotos, setRemotePhotos] = useState<PhotoItem[]>([]);
  const [content, setContent] = useState<SiteContent>(defaultSiteContent);
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>("photos");
  const [password, setPassword] = useState("");
  const [loginMessage, setLoginMessage] = useState("");
  const [toast, setToast] = useState<{ text: string; type: ToastType } | null>(null);
  const [deletingPhoto, setDeletingPhoto] = useState<PhotoItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<PhotoItem | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    title: "",
    style: "jiangnan",
    location: "",
    featured: false,
    visibility: "public",
  });
  const [saving, setSaving] = useState(false);
  const [savingContent, setSavingContent] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const toastTimerRef = useRef<number | null>(null);
  const previewObjectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/admin/session", { credentials: "include", signal: controller.signal })
      .then((r) => r.json())
      .then((d) => setAuthenticated(!!d.authenticated))
      .catch((error) => {
        if (!isAbortError(error)) {
          setAuthenticated(false);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setChecking(false);
        }
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    const controller = new AbortController();
    void loadPhotos(controller.signal);
    void loadContent(controller.signal);
    return () => controller.abort();
  }, [authenticated]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
      revokePreviewUrl();
    };
  }, []);

  async function loadPhotos(signal?: AbortSignal) {
    try {
      const r = await fetch("/api/admin/photos", { credentials: "include", signal });
      if (!r.ok) return;
      const d = (await r.json()) as { photos?: PhotoItem[] };
      if (!signal?.aborted && d.photos) setRemotePhotos(d.photos);
    } catch (error) {
      if (!isAbortError(error)) {
        showToast("作品加载失败，请稍后重试。", "error");
      }
    }
  }

  async function loadContent(signal?: AbortSignal) {
    try {
      const r = await fetch("/api/admin/content", { credentials: "include", signal });
      if (!r.ok) return;
      const d = (await r.json()) as { content?: Partial<SiteContent>; storageReady?: boolean };
      if (signal?.aborted) return;
      setContent(mergeSiteContent(d.content));
      if (d.storageReady === false) {
        showToast("CMS 数据表还未初始化，保存前请先执行 D1 schema。", "info");
      }
    } catch (error) {
      if (!isAbortError(error)) {
        showToast("文案加载失败，请稍后重试。", "error");
      }
    }
  }

  function showToast(text: string, type: ToastType) {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToast({ text, type });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 3000);
  }

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoginMessage("正在登录...");
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!r.ok) {
        setLoginMessage("密码不正确");
        return;
      }
      setAuthenticated(true);
      setPassword("");
      setLoginMessage("");
    } catch {
      setLoginMessage("登录失败，请稍后重试");
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/admin/session", { method: "DELETE", credentials: "include" });
    } catch {
      showToast("退出请求失败，本地登录状态已清除。", "info");
    } finally {
      setAuthenticated(false);
    }
  }

  function revokePreviewUrl() {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
  }

  function clearPreviewSelection() {
    revokePreviewUrl();
    setPreviewUrl(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleFileChange() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    revokePreviewUrl();
    const objectUrl = URL.createObjectURL(file);
    previewObjectUrlRef.current = objectUrl;
    setPreviewUrl(objectUrl);
  }

  async function handleUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    showToast("上传中...", "info");
    try {
      const fd = new FormData(form);
      const r = await fetch("/api/admin/photos", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const d = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        showToast(d.error ?? "上传失败", "error");
        return;
      }
      form.reset();
      clearPreviewSelection();
      showToast("上传成功", "success");
      void loadPhotos();
    } catch {
      showToast("上传失败，请检查网络后重试。", "error");
    }
  }

  async function handleDelete() {
    if (!deletingPhoto) return;
    setDeleting(true);
    try {
      const r = await fetch(`/api/admin/photos/${deletingPhoto.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!r.ok) {
        const d = (await r.json().catch(() => ({}))) as { error?: string };
        showToast(d.error ?? "删除失败", "error");
        return;
      }
      setRemotePhotos((p) => p.filter((x) => x.id !== deletingPhoto.id));
      showToast("已删除", "success");
    } catch {
      showToast("删除失败", "error");
    } finally {
      setDeleting(false);
      setDeletingPhoto(null);
    }
  }

  function openEdit(photo: PhotoItem) {
    setEditingPhoto(photo);
    setEditForm({
      title: photo.title,
      style: photo.style,
      location: photo.location,
      featured: photo.featured,
      visibility: photo.visibility,
    });
  }

  async function handleSaveEdit() {
    if (!editingPhoto) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/admin/photos/${editingPhoto.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!r.ok) {
        showToast("保存失败", "error");
        return;
      }
      setRemotePhotos((prev) => prev.map((p) => p.id === editingPhoto.id
        ? { ...p, ...editForm }
        : p));
      showToast("已保存", "success");
      setEditingPhoto(null);
    } catch {
      showToast("保存失败", "error");
    } finally {
      setSaving(false);
    }
  }

  async function saveContentSections(label: string, keys: ContentKey[]) {
    setSavingContent(label);
    try {
      for (const key of keys) {
        const r = await fetch("/api/admin/content", {
          method: "PATCH",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ key, value: content[key] }),
        });
        if (!r.ok) {
          const d = (await r.json().catch(() => ({}))) as { error?: string };
          throw new Error(d.error ?? "保存失败");
        }
      }
      showToast(`${label}已保存`, "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "保存失败", "error");
    } finally {
      setSavingContent(null);
    }
  }

  function updateContent<K extends keyof SiteContent>(key: K, value: SiteContent[K]) {
    setContent((prev) => ({ ...prev, [key]: value }));
  }

  function updatePackage(index: number, patch: Partial<PackageItem>) {
    updateContent("packages", content.packages.map((item, i) => i === index ? { ...item, ...patch } : item));
  }

  function updatePolicy(index: number, patch: Partial<ServicePolicy>) {
    updateContent("servicePolicies", content.servicePolicies.map((item, i) => i === index ? { ...item, ...patch } : item));
  }

  function updateFaq(index: number, patch: Partial<FaqItem>) {
    updateContent("faqs", content.faqs.map((item, i) => i === index ? { ...item, ...patch } : item));
  }

  function updateWhyCard(index: number, patch: Partial<WhyCard>) {
    updateContent("whyCards", content.whyCards.map((item, i) => i === index ? { ...item, ...patch } : item));
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
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入密码"
              autoComplete="current-password"
              required
            />
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
      <ConfirmDialog
        isOpen={!!deletingPhoto}
        title="确认删除"
        message={`确定删除「${deletingPhoto?.title ?? ""}」？删除后不可恢复。`}
        confirmLabel={deleting ? "删除中..." : "确认删除"}
        onConfirm={handleDelete}
        onCancel={() => setDeletingPhoto(null)}
      />

      {editingPhoto && (
        <div className="adm-overlay" role="dialog" aria-modal="true" aria-label="编辑作品" onClick={() => setEditingPhoto(null)}>
          <div className="adm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>编辑作品</h3>
            <div className="adm-edit-grid">
              <label>标题 <input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} /></label>
              <label>风格
                <select value={editForm.style} onChange={(e) => setEditForm({ ...editForm, style: e.target.value as PhotoStyle })}>
                  {Object.entries(styleLabels).filter(([k]) => k !== "all").map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label>地点 <input value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} /></label>
              <label>展示状态
                <select value={editForm.visibility} onChange={(e) => setEditForm({ ...editForm, visibility: e.target.value as PhotoVisibility })}>
                  <option value="public">公开展示</option>
                  <option value="hidden">隐藏</option>
                </select>
              </label>
              <label className="adm-check"><input type="checkbox" checked={editForm.featured} onChange={(e) => setEditForm({ ...editForm, featured: e.target.checked })} /> 精选作品</label>
            </div>
            <div className="adm-actions">
              <button className="adm-btn-cancel" onClick={() => setEditingPhoto(null)}>取消</button>
              <button className="adm-btn-confirm" onClick={handleSaveEdit} disabled={saving}>{saving ? "保存中..." : "保存"}</button>
            </div>
          </div>
        </div>
      )}

      <header className="adm-bar">
        <div className="adm-bar-brand">{content.siteConfig.brandName} · 后台管理</div>
        <div className="adm-bar-actions">
          <span className="adm-stat">{remotePhotos.length} 张作品</span>
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
              <button
                key={tab.id}
                className={activeTab === tab.id ? "is-active" : ""}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {activeTab === "photos" && renderPhotosTab()}
        {activeTab === "packages" && renderPackagesTab()}
        {activeTab === "services" && renderServicesTab()}
        {activeTab === "faq" && renderFaqTab()}
        {activeTab === "copy" && renderCopyTab()}
      </div>
    </div>
  );

  function renderPhotosTab() {
    return (
      <div className="adm-body">
        <div className="adm-side">
          <div className="adm-card">
            <h2><ImagePlus size={18} /> 上传作品</h2>
            <form onSubmit={handleUpload}>
              {previewUrl ? (
                <div className="adm-upload-preview">
                  <img src={previewUrl} alt="预览" />
                  <button
                    type="button"
                    className="adm-upload-clear"
                    onClick={clearPreviewSelection}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <label className="adm-upload-zone">
                  <Upload size={28} />
                  <span>点击选择照片</span>
                  <input ref={fileRef} name="photo" type="file" accept="image/jpeg,image/png,image/webp" required onChange={handleFileChange} hidden />
                </label>
              )}
              <label>标题 <input name="title" placeholder="例如：绿色旗袍与烟雨江南" required /></label>
              <label>风格
                <select name="style" defaultValue="jiangnan">
                  {Object.entries(styleLabels).filter(([k]) => k !== "all").map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label>地点 <input name="location" placeholder="南京" required /></label>
              <label className="adm-check"><input name="clientAuthorized" type="checkbox" value="true" required /> 客人已授权</label>
              <label className="adm-check"><input name="featured" type="checkbox" value="true" /> 设为精选</label>
              <button className="adm-submit" type="submit"><Upload size={14} /> 上传</button>
            </form>
            <p className="adm-hint">JPEG/PNG/WebP · 最大 10MB</p>
          </div>
        </div>

        <div className="adm-main">
          <h2>作品集 ({remotePhotos.length})</h2>
          <div className="adm-grid">
            {remotePhotos.length === 0 ? (
              <div className="adm-empty"><ImagePlus size={36} /><p>上传你的第一张作品</p></div>
            ) : (
              remotePhotos.map((p) => (
                <div key={p.id} className={`adm-photo${p.featured ? " is-featured" : ""}${p.visibility === "hidden" ? " is-hidden" : ""}`}>
                  <img src={p.imageUrl} alt={p.alt} loading="lazy" />
                  <div className="adm-badge-row">
                    {p.featured && <span className="adm-badge">精选</span>}
                    {p.visibility === "hidden" && <span className="adm-badge adm-badge-muted">隐藏</span>}
                  </div>
                  <div className="adm-photo-info">
                    <strong>{p.title}</strong>
                    <span>{styleLabels[p.style]} · {p.location}</span>
                  </div>
                  <div className="adm-photo-actions">
                    <button className="adm-edit" onClick={() => openEdit(p)} title="编辑"><Pencil size={13} /></button>
                    <button className="adm-del" onClick={() => setDeletingPhoto(p)} title="删除"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderPackagesTab() {
    return (
      <div className="adm-content-panel">
        <PanelHeader title="套餐价格" onSave={() => saveContentSections("套餐价格", ["packages"])} saving={savingContent === "套餐价格"} />
        <div className="adm-cms-list">
          {content.packages.map((item, index) => (
            <div className="adm-cms-item" key={`${item.name}-${index}`}>
              <div className="adm-cms-item-head">
                <strong>套餐 {index + 1}</strong>
                <button type="button" onClick={() => updateContent("packages", content.packages.filter((_, i) => i !== index))} disabled={content.packages.length <= 1}>删除</button>
              </div>
              <div className="adm-form-grid">
                <label>套餐名 <input value={item.name} onChange={(e) => updatePackage(index, { name: e.target.value })} /></label>
                <label>价格 <input value={item.price} onChange={(e) => updatePackage(index, { price: e.target.value })} /></label>
                <label>时长 <input value={item.duration} onChange={(e) => updatePackage(index, { duration: e.target.value })} /></label>
                <label className="adm-span-2">说明 <textarea value={item.summary} onChange={(e) => updatePackage(index, { summary: e.target.value })} /></label>
                <label className="adm-span-2">包含内容（一行一个） <textarea value={item.includes.join("\n")} onChange={(e) => updatePackage(index, { includes: linesFromText(e.target.value) })} /></label>
              </div>
            </div>
          ))}
        </div>
        <button className="adm-add" type="button" onClick={() => updateContent("packages", [...content.packages, emptyPackage])}><Plus size={14} /> 添加套餐</button>
      </div>
    );
  }

  function renderServicesTab() {
    return (
      <div className="adm-content-panel">
        <PanelHeader title="服务规则" onSave={() => saveContentSections("服务规则", ["serviceAddOns", "servicePolicies"])} saving={savingContent === "服务规则"} />
        <div className="adm-cms-item">
          <h3>设备与拍立得</h3>
          <div className="adm-form-grid">
            <label className="adm-span-2">拍摄设备（一行一个）
              <textarea
                value={content.serviceAddOns.equipment.join("\n")}
                onChange={(e) => updateContent("serviceAddOns", { ...content.serviceAddOns, equipment: linesFromText(e.target.value) })}
              />
            </label>
            <label>拍立得型号
              <input
                value={content.serviceAddOns.instantCamera.camera}
                onChange={(e) => updateContent("serviceAddOns", {
                  ...content.serviceAddOns,
                  instantCamera: { ...content.serviceAddOns.instantCamera, camera: e.target.value },
                })}
              />
            </label>
            <label>拍立得价格
              <input
                value={content.serviceAddOns.instantCamera.price}
                onChange={(e) => updateContent("serviceAddOns", {
                  ...content.serviceAddOns,
                  instantCamera: { ...content.serviceAddOns.instantCamera, price: e.target.value },
                })}
              />
            </label>
          </div>
        </div>

        <div className="adm-cms-list">
          {content.servicePolicies.map((item, index) => (
            <div className="adm-cms-item" key={`${item.title}-${index}`}>
              <div className="adm-cms-item-head">
                <strong>预约规则 {index + 1}</strong>
                <button type="button" onClick={() => updateContent("servicePolicies", content.servicePolicies.filter((_, i) => i !== index))}>删除</button>
              </div>
              <div className="adm-form-grid">
                <label>标题 <input value={item.title} onChange={(e) => updatePolicy(index, { title: e.target.value })} /></label>
                <label className="adm-span-2">说明 <textarea value={item.detail} onChange={(e) => updatePolicy(index, { detail: e.target.value })} /></label>
              </div>
            </div>
          ))}
        </div>
        <button className="adm-add" type="button" onClick={() => updateContent("servicePolicies", [...content.servicePolicies, emptyPolicy])}><Plus size={14} /> 添加规则</button>
      </div>
    );
  }

  function renderFaqTab() {
    return (
      <div className="adm-content-panel">
        <PanelHeader title="FAQ/流程" onSave={() => saveContentSections("FAQ/流程", ["faqs", "processSteps"])} saving={savingContent === "FAQ/流程"} />
        <div className="adm-cms-item">
          <h3>预约流程</h3>
          <label>流程步骤（一行一个）
            <textarea
              value={content.processSteps.join("\n")}
              onChange={(e) => updateContent("processSteps", linesFromText(e.target.value))}
            />
          </label>
        </div>
        <div className="adm-cms-list">
          {content.faqs.map((item, index) => (
            <div className="adm-cms-item" key={`${item.question}-${index}`}>
              <div className="adm-cms-item-head">
                <strong>问题 {index + 1}</strong>
                <button type="button" onClick={() => updateContent("faqs", content.faqs.filter((_, i) => i !== index))}>删除</button>
              </div>
              <div className="adm-form-grid">
                <label>问题 <input value={item.question} onChange={(e) => updateFaq(index, { question: e.target.value })} /></label>
                <label className="adm-span-2">回答 <textarea value={item.answer} onChange={(e) => updateFaq(index, { answer: e.target.value })} /></label>
              </div>
            </div>
          ))}
        </div>
        <button className="adm-add" type="button" onClick={() => updateContent("faqs", [...content.faqs, emptyFaq])}><Plus size={14} /> 添加问题</button>
      </div>
    );
  }

  function renderCopyTab() {
    return (
      <div className="adm-content-panel">
        <PanelHeader title="主页文案" onSave={() => saveContentSections("主页文案", ["siteConfig", "whyCards", "sectionCopy"])} saving={savingContent === "主页文案"} />
        <div className="adm-cms-item">
          <h3>站点与联系方式</h3>
          <div className="adm-form-grid">
            <label>品牌名 <input value={content.siteConfig.brandName} onChange={(e) => updateContent("siteConfig", { ...content.siteConfig, brandName: e.target.value })} /></label>
            <label>城市 <input value={content.siteConfig.city} onChange={(e) => updateContent("siteConfig", { ...content.siteConfig, city: e.target.value })} /></label>
            <label>域名 <input value={content.siteConfig.domain} onChange={(e) => updateContent("siteConfig", { ...content.siteConfig, domain: e.target.value })} /></label>
            <label>联系按钮 <input value={content.siteConfig.contactStatus} onChange={(e) => updateContent("siteConfig", { ...content.siteConfig, contactStatus: e.target.value })} /></label>
            <label className="adm-span-2">小红书链接 <input value={content.siteConfig.xiaohongshuProfile} onChange={(e) => updateContent("siteConfig", { ...content.siteConfig, xiaohongshuProfile: e.target.value })} /></label>
            <label className="adm-span-2">首页简介 <textarea value={content.siteConfig.description} onChange={(e) => updateContent("siteConfig", { ...content.siteConfig, description: e.target.value })} /></label>
            <label className="adm-span-2">预约提示 <textarea value={content.siteConfig.contactHint} onChange={(e) => updateContent("siteConfig", { ...content.siteConfig, contactHint: e.target.value })} /></label>
            <label className="adm-span-2">标语 <input value={content.siteConfig.tagline} onChange={(e) => updateContent("siteConfig", { ...content.siteConfig, tagline: e.target.value })} /></label>
          </div>
        </div>

        <SectionCopyEditor />

        <div className="adm-cms-list">
          {content.whyCards.map((card, index) => (
            <div className="adm-cms-item" key={`${card.title}-${index}`}>
              <div className="adm-cms-item-head">
                <strong>选择理由 {index + 1}</strong>
                <button type="button" onClick={() => updateContent("whyCards", content.whyCards.filter((_, i) => i !== index))} disabled={content.whyCards.length <= 1}>删除</button>
              </div>
              <div className="adm-form-grid">
                <label>图标
                  <select value={card.icon} onChange={(e) => updateWhyCard(index, { icon: e.target.value as WhyCardIcon })}>
                    {whyIconOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>
                <label>标题 <input value={card.title} onChange={(e) => updateWhyCard(index, { title: e.target.value })} /></label>
                <label className="adm-span-2">说明 <textarea value={card.detail} onChange={(e) => updateWhyCard(index, { detail: e.target.value })} /></label>
              </div>
            </div>
          ))}
        </div>
        <button className="adm-add" type="button" onClick={() => updateContent("whyCards", [...content.whyCards, emptyWhyCard])}><Plus size={14} /> 添加选择理由</button>
      </div>
    );
  }

  function SectionCopyEditor() {
    const { sectionCopy } = content;
    const updateSection = <K extends keyof SiteContent["sectionCopy"]>(
      key: K,
      value: SiteContent["sectionCopy"][K],
    ) => {
      updateContent("sectionCopy", { ...sectionCopy, [key]: value });
    };

    return (
      <div className="adm-cms-item">
        <h3>首页区域文案</h3>
        <div className="adm-form-grid">
          <label>作品区标题 <input value={sectionCopy.gallery.title} onChange={(e) => updateSection("gallery", { ...sectionCopy.gallery, title: e.target.value })} /></label>
          <label>套餐区标题 <input value={sectionCopy.packages.title} onChange={(e) => updateSection("packages", { ...sectionCopy.packages, title: e.target.value })} /></label>
          <label>服务区标题 <input value={sectionCopy.details.title} onChange={(e) => updateSection("details", { ...sectionCopy.details, title: e.target.value })} /></label>
          <label>须知区标题 <input value={sectionCopy.notice.title} onChange={(e) => updateSection("notice", { ...sectionCopy.notice, title: e.target.value })} /></label>
          <label>选择理由标题 <input value={sectionCopy.why.title} onChange={(e) => updateSection("why", { ...sectionCopy.why, title: e.target.value })} /></label>
          <label>关于区标题 <input value={sectionCopy.about.title} onChange={(e) => updateSection("about", { ...sectionCopy.about, title: e.target.value })} /></label>
          <label className="adm-span-2">关于区正文 <textarea value={sectionCopy.about.body} onChange={(e) => updateSection("about", { ...sectionCopy.about, body: e.target.value })} /></label>
          <label>预约卡标题 <input value={sectionCopy.about.bookingTitle} onChange={(e) => updateSection("about", { ...sectionCopy.about, bookingTitle: e.target.value })} /></label>
          <label>小红书链接文字 <input value={sectionCopy.about.profileLinkLabel} onChange={(e) => updateSection("about", { ...sectionCopy.about, profileLinkLabel: e.target.value })} /></label>
          <label>中部 CTA 标题 <input value={sectionCopy.midCta.title} onChange={(e) => updateSection("midCta", { ...sectionCopy.midCta, title: e.target.value })} /></label>
          <label>中部 CTA 按钮 <input value={sectionCopy.midCta.actionLabel} onChange={(e) => updateSection("midCta", { ...sectionCopy.midCta, actionLabel: e.target.value })} /></label>
          <label className="adm-span-2">中部 CTA 说明 <textarea value={sectionCopy.midCta.intro} onChange={(e) => updateSection("midCta", { ...sectionCopy.midCta, intro: e.target.value })} /></label>
          <label>页脚标语 <input value={sectionCopy.footer.tagline} onChange={(e) => updateSection("footer", { ...sectionCopy.footer, tagline: e.target.value })} /></label>
          <label>安全说明标题 <input value={sectionCopy.safety.title} onChange={(e) => updateSection("safety", { ...sectionCopy.safety, title: e.target.value })} /></label>
          <label className="adm-span-2">安全说明段落（一行一个）
            <textarea value={sectionCopy.safety.paragraphs.join("\n")} onChange={(e) => updateSection("safety", { ...sectionCopy.safety, paragraphs: linesFromText(e.target.value) })} />
          </label>
        </div>
      </div>
    );
  }
}

function PanelHeader({
  title,
  onSave,
  saving,
}: {
  title: string;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="adm-panel-head">
      <h2>{title}</h2>
      <button className="adm-submit" type="button" onClick={onSave} disabled={saving}>
        <Save size={14} />
        {saving ? "保存中..." : "保存并发布"}
      </button>
    </div>
  );
}

function linesFromText(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}
