import { type FormEvent, useEffect, useRef, useState } from "react";
import { ImagePlus, LockKeyhole, LogOut, Pencil, Trash2, Upload } from "lucide-react";
import { galleryItems } from "../data/gallery";
import { styleLabels } from "../data/site";
import type { PhotoItem } from "../types/photo";
import { ConfirmDialog } from "./ConfirmDialog";

type ToastType = "success" | "error" | "info";

export default function AdminDashboard() {
  const [remotePhotos, setRemotePhotos] = useState<PhotoItem[]>([]);
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [loginMessage, setLoginMessage] = useState("");
  const [toast, setToast] = useState<{ text: string; type: ToastType } | null>(null);
  const [deletingPhoto, setDeletingPhoto] = useState<PhotoItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<PhotoItem | null>(null);
  const [editForm, setEditForm] = useState({ title: "", style: "", location: "", featured: false });
  const [saving, setSaving] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/session", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setAuthenticated(!!d.authenticated))
      .catch(() => setAuthenticated(false))
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    fetch("/api/admin/photos")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.photos) setRemotePhotos(d.photos); })
      .catch(() => {});
  }, [authenticated]);

  async function loadPhotos() {
    try {
      const r = await fetch("/api/admin/photos");
      if (!r.ok) return;
      const d = (await r.json()) as { photos?: PhotoItem[] };
      if (d.photos) setRemotePhotos(d.photos);
    } catch {}
  }

  function showToast(text: string, type: ToastType) {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoginMessage("正在登录...");
    const r = await fetch("/api/admin/login", {
      method: "POST", credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!r.ok) { setLoginMessage("密码不正确"); return; }
    setAuthenticated(true);
    setPassword("");
    setLoginMessage("");
  }

  async function handleLogout() {
    await fetch("/api/admin/session", { method: "DELETE", credentials: "include" });
    setAuthenticated(false);
  }

  function handleFileChange() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setPreviewFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    showToast("上传中...", "info");
    const fd = new FormData(e.currentTarget);
    const r = await fetch("/api/admin/photos", {
      method: "POST", credentials: "include", body: fd,
    });
    const d = (await r.json().catch(() => ({}))) as { error?: string };
    if (!r.ok) { showToast(d.error ?? "上传失败", "error"); return; }
    e.currentTarget.reset();
    setPreviewFile(null);
    setPreviewUrl(null);
    showToast("上传成功", "success");
    void loadPhotos();
  }

  async function handleDelete() {
    if (!deletingPhoto) return;
    setDeleting(true);
    try {
      const r = await fetch(`/api/admin/photos/${deletingPhoto.id}`, {
        method: "DELETE", credentials: "include",
      });
      if (!r.ok) {
        const d = (await r.json().catch(() => ({}))) as { error?: string };
        showToast(d.error ?? "删除失败", "error"); return;
      }
      setRemotePhotos((p) => p.filter((x) => x.id !== deletingPhoto.id));
      showToast("已删除", "success");
    } catch { showToast("删除失败", "error"); }
    finally { setDeleting(false); setDeletingPhoto(null); }
  }

  function openEdit(photo: PhotoItem) {
    setEditingPhoto(photo);
    setEditForm({ title: photo.title, style: photo.style, location: photo.location, featured: photo.featured });
  }

  async function handleSaveEdit() {
    if (!editingPhoto) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/admin/photos/${editingPhoto.id}`, {
        method: "PATCH", credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!r.ok) { showToast("保存失败", "error"); return; }
      setRemotePhotos((prev) => prev.map((p) => p.id === editingPhoto.id
        ? { ...p, title: editForm.title, style: editForm.style as PhotoItem["style"], location: editForm.location, featured: editForm.featured }
        : p));
      showToast("已保存", "success");
      setEditingPhoto(null);
    } catch { showToast("保存失败", "error"); }
    finally { setSaving(false); }
  }

  if (checking) {
    return <div className="adm-root"><div className="adm-loading">检查登录状态...</div></div>;
  }

  if (!authenticated) {
    return (
      <div className="adm-root">
        <div className="adm-login-box">
          <LockKeyhole size={22} />
          <h1>作品管理</h1>
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
                <select value={editForm.style} onChange={(e) => setEditForm({ ...editForm, style: e.target.value })}>
                  {Object.entries(styleLabels).filter(([k]) => k !== "all").map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label>地点 <input value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} /></label>
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
        <div className="adm-bar-brand">奶黄包摄影 · 作品管理</div>
        <div className="adm-bar-actions">
          <span className="adm-stat">{remotePhotos.length} 张作品</span>
          <button onClick={handleLogout}><LogOut size={14} /> 退出</button>
          <a href="/">← 官网</a>
        </div>
      </header>

      {toast && <div className={`adm-toast adm-toast-${toast.type}`}>{toast.text}</div>}

      <div className="adm-body">
        <div className="adm-side">
          <div className="adm-card">
            <h2><ImagePlus size={18} /> 上传作品</h2>
            <form onSubmit={handleUpload}>
              {previewUrl ? (
                <div className="adm-upload-preview">
                  <img src={previewUrl} alt="预览" />
                  <button type="button" className="adm-upload-clear" onClick={() => { setPreviewFile(null); setPreviewUrl(null); if (fileRef.current) fileRef.current.value = ""; }}>×</button>
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
                <div key={p.id} className={`adm-photo${p.featured ? " is-featured" : ""}`}>
                  <img src={p.imageUrl} alt={p.alt} loading="lazy" />
                  {p.featured && <span className="adm-badge">精选</span>}
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
    </div>
  );
}
