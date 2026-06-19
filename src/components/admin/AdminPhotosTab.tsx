import { ImagePlus, Pencil, Trash2, Upload, CheckSquare, Eye, EyeOff, Star, HelpCircle } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "animal-island-ui";
import { getStyleLabels } from "../../data/site";
import type { PhotoItem, PhotoStyle, PhotoVisibility } from "../../types/photo";
import { adminMutationHeaders, type ToastType } from "../../lib/admin-helpers";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { SkeletonGrid } from "../SkeletonGrid";
import { HighlightText } from "../shared/HighlightText";
import { useKeyboardShortcut } from "../../hooks/useKeyboardShortcut";

const maxPhotoUploadSize = 10 * 1024 * 1024;
const allowedPhotoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
export function AdminPhotosTab({ showToast }: { showToast: (text: string, type: ToastType) => void }) {
  const { t } = useTranslation();
  const styleLabels = getStyleLabels(t);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [deletingPhoto, setDeletingPhoto] = useState<PhotoItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deletingBatch, setDeletingBatch] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingPhoto, setEditingPhoto] = useState<PhotoItem | null>(null);
  const [editForm, setEditForm] = useState<{
    title: string; style: PhotoStyle; location: string; featured: boolean; visibility: PhotoVisibility;
  }>({
    title: "", style: "jiangnan", location: "", featured: false, visibility: "public",
  });
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMeta, setPreviewMeta] = useState<{ width: number; height: number; size: number; type: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStyle, setFilterStyle] = useState<PhotoStyle | "all">("all");
  const [filterVisibility, setFilterVisibility] = useState<"all" | "public" | "hidden">("all");

  const styleCounts = useMemo(() => {
    const counts: Record<string, number> = { all: photos.length };
    for (const p of photos) {
      counts[p.style] = (counts[p.style] || 0) + 1;
    }
    return counts;
  }, [photos]);
  const editDialogRef = useFocusTrap<HTMLDivElement>({ active: !!editingPhoto });
  const deleteDialogRef = useFocusTrap<HTMLDivElement>({ active: !!deletingPhoto });

  useEffect(() => {
    if (!editingPhoto) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setEditingPhoto(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [editingPhoto]);

  useEffect(() => {
    if (!deletingPhoto) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDeletingPhoto(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [deletingPhoto]);

  // Admin keyboard shortcuts
  useKeyboardShortcut({
    key: "?",
    onMatch: () => setShowShortcuts((v) => !v),
  });
  useKeyboardShortcut({
    key: "n",
    enabled: !showShortcuts && !editingPhoto && !deletingPhoto,
    onMatch: () => fileRef.current?.click(),
  });
  useKeyboardShortcut({
    key: "/",
    enabled: !showShortcuts && !editingPhoto && !deletingPhoto,
    onMatch: () => document.querySelector<HTMLInputElement>(".adm-search-input")?.focus(),
  });
  useKeyboardShortcut({
    key: "Escape",
    enabled: showShortcuts,
    onMatch: () => setShowShortcuts(false),
  });

  const fileRef = useRef<HTMLInputElement>(null);
  const previewObjectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    loadPhotos(controller.signal);
    return () => controller.abort();
  }, []);

  const loadPhotos = (signal?: AbortSignal) => {
    setLoading(true);
    fetch("/api/admin/photos", { credentials: "include", signal })
      .then((r) => r.json())
      .then((d: { photos?: PhotoItem[] }) => {
        if (!signal?.aborted && d.photos) setPhotos(d.photos);
      })
      .catch(() => showToast("加载照片失败", "error"))
      .finally(() => { if (!signal?.aborted) setLoading(false); });
  };

  const revokePreview = () => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === photos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(photos.map((p) => p.id)));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`确定删除选中的 ${selectedIds.size} 张照片？删除后不可恢复。`)) return;
    setDeletingBatch(true);
    let success = 0;
    for (const id of selectedIds) {
      try {
        const r = await fetch(`/api/admin/photos/${id}`, { method: "DELETE", credentials: "include", headers: adminMutationHeaders });
        if (r.ok) success++;
      } catch { /* skip failed */ }
    }
    setPhotos((prev) => prev.filter((p) => !selectedIds.has(p.id)));
    setSelectedIds(new Set());
    setDeletingBatch(false);
    showToast(`成功删除 ${success} 张照片`, success > 0 ? "success" : "error");
  };

  const handleBatchVisibility = async (vis: "public" | "hidden") => {
    if (selectedIds.size === 0) return;
    try {
      const r = await fetch("/api/admin/photos/batch", {
        method: "POST", credentials: "include",
        headers: { "content-type": "application/json", ...adminMutationHeaders },
        body: JSON.stringify({ ids: Array.from(selectedIds), action: "visibility", value: vis }),
      });
      if (!r.ok) { showToast("操作失败", "error"); return; }
      setPhotos((prev) => prev.map((p) => selectedIds.has(p.id) ? { ...p, visibility: vis } : p));
      showToast(`已将 ${selectedIds.size} 张照片设为${vis === "public" ? "公开" : "隐藏"}`, "success");
      setSelectedIds(new Set());
    } catch {
      showToast("操作失败", "error");
    }
  };

  const handleBatchFeatured = async (feat: boolean) => {
    if (selectedIds.size === 0) return;
    try {
      const r = await fetch("/api/admin/photos/batch", {
        method: "POST", credentials: "include",
        headers: { "content-type": "application/json", ...adminMutationHeaders },
        body: JSON.stringify({ ids: Array.from(selectedIds), action: "featured", value: feat }),
      });
      if (!r.ok) { showToast("操作失败", "error"); return; }
      setPhotos((prev) => prev.map((p) => selectedIds.has(p.id) ? { ...p, featured: feat } : p));
      showToast(`已将 ${selectedIds.size} 张照片${feat ? "设为精选" : "取消精选"}`, "success");
      setSelectedIds(new Set());
    } catch {
      showToast("操作失败", "error");
    }
  };

  const handleQuickVisibility = async (photo: PhotoItem) => {
    const nextVis = photo.visibility === "public" ? "hidden" : "public";
    try {
      const r = await fetch("/api/admin/photos/batch", {
        method: "POST", credentials: "include",
        headers: { "content-type": "application/json", ...adminMutationHeaders },
        body: JSON.stringify({ ids: [photo.id], action: "visibility", value: nextVis }),
      });
      if (!r.ok) { showToast("操作失败", "error"); return; }
      setPhotos((prev) => prev.map((p) => p.id === photo.id ? { ...p, visibility: nextVis } : p));
      showToast(`已将「${photo.title}」设为${nextVis === "public" ? "公开" : "隐藏"}`, "success");
    } catch {
      showToast("操作失败", "error");
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

  const handleUpload = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const photo = fileRef.current?.files?.[0];
    if (!photo) { showToast("请选择照片文件", "error"); return; }
    if (!allowedPhotoTypes.has(photo.type)) { showToast("只支持 JPEG、PNG 或 WebP 图片", "error"); return; }
    if (photo.size > maxPhotoUploadSize) { showToast("图片过大，请上传小于 10MB 的文件", "error"); return; }
    setUploading(true);
    try {
      const fd = new FormData(form);
      // Reset file input after upload
      const r = await fetch("/api/admin/photos", { method: "POST", body: fd, credentials: "include" });
      if (!r.ok) { showToast("上传失败", "error"); return; }
      const data = await r.json();
      showToast("上传成功", "success");
      setPhotos((prev) => [data.photo, ...prev]);
      revokePreview(); setPreviewUrl(null); form.reset();
    } finally { setUploading(false); }
  };

  // (keep existing handleDelete, handleSaveEdit, initial load unchanged)
  // Paste existing handleDelete and handleSaveEdit functions here

  return (
    <div className="adm-body">
      {editingPhoto && (
        <div className="adm-overlay" role="dialog" aria-modal="true" aria-label="编辑作品" onClick={() => setEditingPhoto(null)}>
          <div className="adm-dialog" ref={editDialogRef} onClick={(e) => e.stopPropagation()}>
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
                <img
                  src={previewUrl}
                  alt="预览"
                  onLoad={(e) => {
                    const img = e.target as HTMLImageElement;
                    setPreviewMeta({
                      width: img.naturalWidth,
                      height: img.naturalHeight,
                      size: fileRef.current?.files?.[0]?.size ?? 0,
                      type: fileRef.current?.files?.[0]?.type ?? "",
                    });
                  }}
                />
                {previewMeta && (
                  <div className="adm-upload-meta">
                    {previewMeta.width}×{previewMeta.height} · {(previewMeta.size / 1024).toFixed(0)} KB · {previewMeta.type.split("/").pop()?.toUpperCase()}
                  </div>
                )}
                <button type="button" className="adm-upload-clear" onClick={() => { revokePreview(); setPreviewUrl(null); setPreviewMeta(null); }}>×</button>
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
                    input.value = ""; revokePreview(); setPreviewUrl(null); setPreviewMeta(null); return;
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
        <div className="adm-stats-bar">
          <span>全部 <strong>{photos.length}</strong></span>
          <span className="adm-stats-public">公开 <strong>{photos.filter((p) => p.visibility === "public").length}</strong></span>
          <span className="adm-stats-hidden">隐藏 <strong>{photos.filter((p) => p.visibility === "hidden").length}</strong></span>
          <span className="adm-stats-featured">精选 <strong>{photos.filter((p) => p.featured).length}</strong></span>
        </div>
        <div className="adm-list-header">
          <h2>作品集 ({photos.length})</h2>
          <div className="adm-filter-bar">
            <input
              type="text"
              className="adm-search-input"
              placeholder="搜索标题、地点..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select className="adm-filter-select" value={filterStyle} onChange={(e) => setFilterStyle(e.target.value as PhotoStyle | "all")}>
              <option value="all">全部风格 ({styleCounts.all})</option>
              {Object.entries(styleLabels).filter(([k]) => k !== "all").map(([k, v]) => (
                <option key={k} value={k}>{v} ({styleCounts[k] || 0})</option>
              ))}
            </select>
            <select className="adm-filter-select" value={filterVisibility} onChange={(e) => setFilterVisibility(e.target.value as "all" | "public" | "hidden")}>
              <option value="all">全部状态</option>
              <option value="public">公开</option>
              <option value="hidden">隐藏</option>
            </select>
          </div>
          <div className="adm-list-actions">
            {selectedIds.size > 0 && (
              <>
                <span className="adm-selected-count">已选 {selectedIds.size} 张</span>
                <Button type="primary" size="small" onClick={() => handleBatchVisibility("public")}>
                  <Eye size={13} /> 设为公开
                </Button>
                <Button type="primary" size="small" onClick={() => handleBatchVisibility("hidden")}>
                  <EyeOff size={13} /> 设为隐藏
                </Button>
                <Button type="primary" size="small" onClick={() => handleBatchFeatured(true)}>
                  <Star size={13} /> 设为精选
                </Button>
                <Button type="primary" size="small" onClick={() => handleBatchFeatured(false)}>
                  取消精选
                </Button>
                <Button type="primary" size="small" className="adm-btn-danger" onClick={handleBatchDelete} disabled={deletingBatch}>
                  <Trash2 size={13} /> {deletingBatch ? "删除中..." : `删除选中`}
                </Button>
              </>
            )}
            <label className="adm-select-all">
              <input type="checkbox" checked={photos.length > 0 && selectedIds.size === photos.length} onChange={toggleSelectAll} /> 全选
            </label>
          </div>
        </div>
        <div className="adm-grid">
          {loading ? (
            <SkeletonGrid count={6} columns={3} ariaLabel="Loading photos" />
          ) : photos.length === 0 ? (
            <div className="adm-empty"><ImagePlus size={36} /><p>上传你的第一张作品</p></div>
          ) : (() => {
            const filtered = photos.filter((p) => {
              if (filterStyle !== "all" && p.style !== filterStyle) return false;
              if (filterVisibility !== "all" && p.visibility !== filterVisibility) return false;
              if (searchQuery) {
                const q = searchQuery.toLowerCase();
                return p.title.toLowerCase().includes(q) || p.location.toLowerCase().includes(q) || p.alt?.toLowerCase().includes(q);
              }
              return true;
            });
            return filtered.length === 0 ? (
              <div className="adm-empty"><ImagePlus size={36} /><p>没有匹配的照片</p></div>
            ) : (
              filtered.map((p) => (
              <div key={p.id} className={`adm-photo${p.featured ? " is-featured" : ""}${p.visibility === "hidden" ? " is-hidden" : ""}${selectedIds.has(p.id) ? " is-selected" : ""}`} aria-label={`${p.title} - ${styleLabels[p.style]} - ${p.visibility === "public" ? "公开" : "隐藏"}${p.featured ? " - 精选" : ""}`}>
                <div className="adm-photo-check" onClick={() => toggleSelect(p.id)}>
                  <input type="checkbox" checked={selectedIds.has(p.id)} readOnly />
                </div>
                <img src={p.imageUrl} alt={p.alt} loading="lazy" />
                <div className="adm-badge-row">
                  {p.featured && <span className="adm-badge">精选</span>}
                  {p.visibility === "hidden" && <span className="adm-badge adm-badge-muted">隐藏</span>}
                </div>
                <div className="adm-photo-info">
                  <strong>{searchQuery ? <HighlightText text={p.title} query={searchQuery} className="adm-highlight" /> : p.title}</strong>
                  <span>{styleLabels[p.style]} · {p.location}</span>
                </div>
                <div className="adm-photo-actions">
                  <Button type="text" size="small" className="adm-vis-toggle" onClick={() => handleQuickVisibility(p)} title={p.visibility === "public" ? "设为隐藏" : "设为公开"} aria-label={p.visibility === "public" ? "隐藏这张照片" : "公开这张照片"}>
                    {p.visibility === "public" ? <EyeOff size={13} /> : <Eye size={13} />}
                  </Button>
                  <Button type="text" size="small" className="adm-edit" onClick={() => { setEditingPhoto(p); setEditForm({ title: p.title, style: p.style, location: p.location, featured: p.featured, visibility: p.visibility }); }} title="编辑"><Pencil size={13} /></Button>
                  <Button type="text" size="small" className="adm-del" onClick={() => setDeletingPhoto(p)} title="删除"><Trash2 size={13} /></Button>
                </div>
              </div>
            ))
          );
          })()}
        </div>
      </div>

      {deletingPhoto && (
        <div className="adm-overlay" role="dialog" aria-modal="true" aria-label="确认删除" onClick={() => setDeletingPhoto(null)}>
          <div className="adm-dialog" ref={deleteDialogRef} onClick={(e) => e.stopPropagation()}>
            <h3>确认删除</h3>
            <p>确定删除「{deletingPhoto.title}」？删除后不可恢复。</p>
            <div className="adm-actions">
              <Button type="default" size="small" className="adm-btn-cancel" onClick={() => setDeletingPhoto(null)}>取消</Button>
              <Button type="primary" size="small" className="adm-btn-confirm" onClick={handleDelete} disabled={deleting}>{deleting ? "删除中..." : "确认删除"}</Button>
            </div>
          </div>
        </div>
      )}

      {showShortcuts && (
        <div className="adm-overlay" role="dialog" aria-modal="true" aria-label="键盘快捷键" onClick={() => setShowShortcuts(false)}>
          <div className="adm-dialog adm-shortcuts-dialog" onClick={(e) => e.stopPropagation()}>
            <h3><HelpCircle size={18} /> 键盘快捷键</h3>
            <ul className="adm-shortcuts-list">
              <li><kbd>/</kbd> 聚焦搜索框</li>
              <li><kbd>N</kbd> 上传新照片</li>
              <li><kbd>?</kbd> 显示/隐藏快捷键</li>
              <li><kbd>Esc</kbd> 关闭弹窗</li>
            </ul>
            <div className="adm-actions">
              <Button type="default" size="small" onClick={() => setShowShortcuts(false)}>关闭</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
