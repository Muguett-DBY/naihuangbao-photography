import { ImagePlus, Pencil, Trash2, Upload } from "lucide-react";
import { type FormEvent, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "animal-island-ui";
import { getStyleLabels } from "../../data/site";
import type { PhotoItem, PhotoStyle, PhotoVisibility } from "../../types/photo";
import { adminMutationHeaders, type ToastType } from "../../lib/admin-helpers";

const maxPhotoUploadSize = 10 * 1024 * 1024;
const allowedPhotoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
export function AdminPhotosTab({ showToast }: { showToast: (text: string, type: ToastType) => void }) {
  const { t } = useTranslation();
  const styleLabels = getStyleLabels(t);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [deletingPhoto, setDeletingPhoto] = useState<PhotoItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<PhotoItem | null>(null);
  const [editForm, setEditForm] = useState<{
    title: string; style: PhotoStyle; location: string; featured: boolean; visibility: PhotoVisibility;
  }>({
    title: "", style: "jiangnan", location: "", featured: false, visibility: "public",
  });
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewObjectUrlRef = useRef<string | null>(null);

  const loadPhotos = (signal?: AbortSignal) => {
    fetch("/api/admin/photos", { credentials: "include", signal })
      .then((r) => r.json())
      .then((d: { photos?: PhotoItem[] }) => {
        if (!signal?.aborted && d.photos) setPhotos(d.photos);
      })
      .catch(() => showToast("加载照片失败", "error"));
  };

  const revokePreview = () => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
  };

  const handleUpload = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const photo = fileRef.current?.files?.[0];
    if (!photo) {
      showToast("请选择照片文件", "error");
      return;
    }
    if (!allowedPhotoTypes.has(photo.type)) {
      showToast("只支持 JPEG、PNG 或 WebP 图片", "error");
      return;
    }
    if (photo.size > maxPhotoUploadSize) {
      showToast("图片过大，请上传小于 10MB 的文件", "error");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData(form);
      const r = await fetch("/api/admin/photos", { method: "POST", credentials: "include", headers: adminMutationHeaders, body: fd });
      if (!r.ok) { showToast("上传失败", "error"); return; }
      showToast("上传成功", "success");
      form.reset();
      revokePreview();
      setPreviewUrl(null);
      loadPhotos();
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingPhoto) return;
    setDeleting(true);
    try {
      const r = await fetch(`/api/admin/photos/${deletingPhoto.id}`, { method: "DELETE", credentials: "include", headers: adminMutationHeaders });
      if (!r.ok) { showToast("删除失败", "error"); return; }
      showToast("删除成功", "success");
      setPhotos((p) => p.filter((x) => x.id !== deletingPhoto.id));
    } finally {
      setDeleting(false);
      setDeletingPhoto(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingPhoto) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/admin/photos/${editingPhoto.id}`, {
        method: "PATCH", credentials: "include",
        headers: { "content-type": "application/json", ...adminMutationHeaders },
        body: JSON.stringify(editForm),
      });
      if (!r.ok) { showToast("保存失败", "error"); return; }
      showToast("保存成功", "success");
      setPhotos((prev) => prev.map((p) => p.id === editingPhoto.id ? { ...p, ...editForm } : p));
      setEditingPhoto(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="adm-body">
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
              <Button type="default" size="small" className="adm-btn-cancel" onClick={() => setEditingPhoto(null)}>取消</Button>
              <Button type="primary" size="small" className="adm-btn-confirm" onClick={handleSaveEdit} disabled={saving}>{saving ? "保存中..." : "保存"}</Button>
            </div>
          </div>
        </div>
      )}

      <div className="adm-side">
        <div className="adm-card">
          <h2><ImagePlus size={18} /> 上传作品</h2>
          <form onSubmit={handleUpload}>
            {previewUrl ? (
              <div className="adm-upload-preview">
                <img src={previewUrl} alt="预览" />
                <button type="button" className="adm-upload-clear" onClick={() => { revokePreview(); setPreviewUrl(null); }}>×</button>
              </div>
            ) : (
              <label className="adm-upload-zone">
                <Upload size={28} />
                <span>点击选择照片</span>
                <input ref={fileRef} name="photo" type="file" accept="image/jpeg,image/png,image/webp" required onChange={() => {
                  const input = fileRef.current;
                  const file = input?.files?.[0];
                  if (!file) return;
                  if (!allowedPhotoTypes.has(file.type) || file.size > maxPhotoUploadSize) {
                    showToast(file.size > maxPhotoUploadSize ? "图片过大，请上传小于 10MB 的文件" : "只支持 JPEG、PNG 或 WebP 图片", "error");
                    input.value = "";
                    revokePreview();
                    setPreviewUrl(null);
                    return;
                  }
                  revokePreview(); const url = URL.createObjectURL(file); previewObjectUrlRef.current = url; setPreviewUrl(url);
                }} hidden />
              </label>
            )}
            <label>标题 <input name="title" placeholder="例如：绿色旗袍与烟雨江南" required /></label>
            <label>风格 <select name="style" defaultValue="jiangnan">{Object.entries(styleLabels).filter(([k]) => k !== "all").map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label>地点 <input name="location" placeholder="南京" required /></label>
            <label className="adm-check"><input name="clientAuthorized" type="checkbox" value="true" required /> 客人已授权</label>
            <label className="adm-check"><input name="featured" type="checkbox" value="true" /> 设为精选</label>
            <Button type="primary" htmlType="submit" className="adm-submit" disabled={uploading}>{uploading ? "上传中..." : "上传"}</Button>
          </form>
          <p className="adm-hint">JPEG/PNG/WebP · 最大 10MB</p>
        </div>
      </div>

      <div className="adm-main">
        <h2>作品集 ({photos.length})</h2>
        <div className="adm-grid">
          {photos.length === 0 ? (
            <div className="adm-empty"><ImagePlus size={36} /><p>上传你的第一张作品</p></div>
          ) : (
            photos.map((p) => (
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
                  <Button type="text" size="small" className="adm-edit" onClick={() => { setEditingPhoto(p); setEditForm({ title: p.title, style: p.style, location: p.location, featured: p.featured, visibility: p.visibility }); }} title="编辑"><Pencil size={13} /></Button>
                  <Button type="text" size="small" className="adm-del" onClick={() => setDeletingPhoto(p)} title="删除"><Trash2 size={13} /></Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {deletingPhoto && (
        <div className="adm-overlay" role="dialog" aria-modal="true" aria-label="确认删除" onClick={() => setDeletingPhoto(null)}>
          <div className="adm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>确认删除</h3>
            <p>确定删除「{deletingPhoto.title}」？删除后不可恢复。</p>
            <div className="adm-actions">
              <Button type="default" size="small" className="adm-btn-cancel" onClick={() => setDeletingPhoto(null)}>取消</Button>
              <Button type="primary" size="small" className="adm-btn-confirm" onClick={handleDelete} disabled={deleting}>{deleting ? "删除中..." : "确认删除"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
