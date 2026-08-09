import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getStyleLabels } from "../../data/site";
import { AdminPhotosWorkspace, type PhotoEditForm } from "../../features/admin/AdminPhotosWorkspace";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { useKeyboardShortcut } from "../../hooks/useKeyboardShortcut";
import { adminMutationHeaders, type ToastType } from "../../lib/admin-helpers";
import type { PhotoItem, PhotoStyle } from "../../types/photo";

const MAX_PHOTO_UPLOAD_SIZE = 10 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

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
  const [editForm, setEditForm] = useState<PhotoEditForm>({ title: "", style: "jiangnan", location: "", featured: false, visibility: "public" });
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMeta, setPreviewMeta] = useState<{ width: number; height: number; size: number; type: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStyle, setFilterStyle] = useState<PhotoStyle | "all">("all");
  const [filterVisibility, setFilterVisibility] = useState<"all" | "public" | "hidden">("all");
  const [filterAlbum, setFilterAlbum] = useState("all");
  const [filterFeatured, setFilterFeatured] = useState<"all" | "featured" | "not-featured">("all");
  const fileRef = useRef<HTMLInputElement>(null);
  const previewObjectUrlRef = useRef<string | null>(null);
  const editDialogRef = useFocusTrap<HTMLDivElement>({ active: Boolean(editingPhoto) });
  const deleteDialogRef = useFocusTrap<HTMLDivElement>({ active: Boolean(deletingPhoto) });

  const styleCounts = useMemo(() => {
    const counts: Record<string, number> = { all: photos.length };
    for (const photo of photos) counts[photo.style] = (counts[photo.style] || 0) + 1;
    return counts;
  }, [photos]);
  const albumCounts = useMemo(() => {
    const counts: Record<string, number> = { all: photos.length };
    for (const photo of photos) {
      const album = photo.album || "未分类";
      counts[album] = (counts[album] || 0) + 1;
    }
    return counts;
  }, [photos]);
  const filteredPhotos = useMemo(() => photos.filter((photo) => {
    if (filterStyle !== "all" && photo.style !== filterStyle) return false;
    if (filterVisibility !== "all" && photo.visibility !== filterVisibility) return false;
    if (filterAlbum !== "all" && (photo.album || "未分类") !== filterAlbum) return false;
    if (filterFeatured !== "all" && (filterFeatured === "featured") !== photo.featured) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!photo.title.toLowerCase().includes(query) && !photo.location.toLowerCase().includes(query) && !photo.album?.toLowerCase().includes(query)) return false;
    }
    return true;
  }), [photos, filterStyle, filterVisibility, filterAlbum, filterFeatured, searchQuery]);

  const revokePreview = useCallback(() => {
    if (!previewObjectUrlRef.current) return;
    URL.revokeObjectURL(previewObjectUrlRef.current);
    previewObjectUrlRef.current = null;
  }, []);

  const clearPreview = useCallback(() => {
    revokePreview();
    setPreviewUrl(null);
    setPreviewMeta(null);
    if (fileRef.current) fileRef.current.value = "";
  }, [revokePreview]);

  const loadPhotos = useCallback((signal?: AbortSignal) => {
    setLoading(true);
    fetch("/api/admin/photos", { credentials: "include", signal })
      .then((response) => response.json())
      .then((data: { photos?: PhotoItem[] }) => {
        if (!signal?.aborted && data.photos) setPhotos(data.photos);
      })
      .catch(() => {
        if (!signal?.aborted) showToast("加载照片失败", "error");
      })
      .finally(() => {
        if (!signal?.aborted) setLoading(false);
      });
  }, [showToast]);

  useEffect(() => {
    const controller = new AbortController();
    loadPhotos(controller.signal);
    return () => {
      controller.abort();
      revokePreview();
    };
  }, [loadPhotos, revokePreview]);

  useEffect(() => {
    if (!editingPhoto && !deletingPhoto) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setEditingPhoto(null);
      setDeletingPhoto(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [editingPhoto, deletingPhoto]);

  const toggleSelect = (id: string) => setSelectedIds((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleSelectAll = useCallback(() => setSelectedIds((current) => {
    const next = new Set(current);
    const allVisibleSelected = filteredPhotos.length > 0 && filteredPhotos.every((photo) => next.has(photo.id));
    for (const photo of filteredPhotos) {
      if (allVisibleSelected) next.delete(photo.id); else next.add(photo.id);
    }
    return next;
  }), [filteredPhotos]);

  useKeyboardShortcut({ key: "?", onMatch: () => setShowShortcuts((value) => !value) });
  useKeyboardShortcut({ key: "n", enabled: !showShortcuts && !editingPhoto && !deletingPhoto, onMatch: () => fileRef.current?.click() });
  useKeyboardShortcut({ key: "/", enabled: !showShortcuts && !editingPhoto && !deletingPhoto, onMatch: () => document.querySelector<HTMLInputElement>(".adm-search-input")?.focus() });
  useKeyboardShortcut({ key: "Escape", enabled: showShortcuts, onMatch: () => setShowShortcuts(false) });
  useKeyboardShortcut({ key: "a", enabled: !showShortcuts && !editingPhoto && !deletingPhoto, onMatch: toggleSelectAll });
  useKeyboardShortcut({ key: "Delete", enabled: !showShortcuts && !editingPhoto && !deletingPhoto && selectedIds.size > 0, onMatch: () => void handleBatchDelete() });

  const runBatchUpdate = async (action: string, value?: unknown, mode?: string, ids = Array.from(selectedIds)) => {
    if (ids.length === 0) return false;
    try {
      const response = await fetch("/api/admin/photos/batch", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json", ...adminMutationHeaders },
        body: JSON.stringify({ ids, action, value, mode }),
      });
      if (!response.ok) throw new Error("batch_failed");
      return true;
    } catch {
      showToast("操作失败", "error");
      return false;
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0 || !confirm(`确定删除选中的 ${selectedIds.size} 张照片？删除后不可恢复。`)) return;
    setDeletingBatch(true);
    const ids = Array.from(selectedIds);
    try {
      const response = await fetch("/api/admin/photos/batch", { method: "POST", credentials: "include", headers: { "content-type": "application/json", ...adminMutationHeaders }, body: JSON.stringify({ ids, action: "delete" }) });
      const result = await response.json().catch(() => ({})) as { deleted?: number; ids?: string[] };
      if (!response.ok || !Array.isArray(result.ids) || result.ids.length !== ids.length) throw new Error("batch_delete_failed");
      const deleted = new Set(result.ids);
      setPhotos((current) => current.filter((photo) => !deleted.has(photo.id)));
      setSelectedIds((current) => new Set(Array.from(current).filter((id) => !deleted.has(id))));
      showToast(`成功删除 ${result.deleted ?? deleted.size} 张照片`, "success");
    } catch {
      showToast("批量删除失败，请刷新后重试", "error");
    } finally {
      setDeletingBatch(false);
    }
  };

  const handleBatchVisibility = async (visibility: "public" | "hidden") => {
    if (!await runBatchUpdate("visibility", visibility)) return;
    setPhotos((current) => current.map((photo) => selectedIds.has(photo.id) ? { ...photo, visibility } : photo));
    showToast(`已将 ${selectedIds.size} 张照片设为${visibility === "public" ? "公开" : "隐藏"}`, "success");
    setSelectedIds(new Set());
  };
  const handleBatchFeatured = async (featured: boolean) => {
    if (!await runBatchUpdate("featured", featured)) return;
    setPhotos((current) => current.map((photo) => selectedIds.has(photo.id) ? { ...photo, featured } : photo));
    showToast(`已将 ${selectedIds.size} 张照片${featured ? "设为精选" : "取消精选"}`, "success");
    setSelectedIds(new Set());
  };
  const handleBatchAlbum = async (album: string) => {
    if (!await runBatchUpdate("album", album)) return;
    setPhotos((current) => current.map((photo) => selectedIds.has(photo.id) ? { ...photo, album: album || undefined } : photo));
    showToast(`已将 ${selectedIds.size} 张照片相册设为「${album || "无"}」`, "success");
    setSelectedIds(new Set());
  };
  const handleBatchTags = async (tags: string, mode: "add" | "remove" | "set") => {
    const tagList = tags.split(",").map((tag) => tag.trim()).filter(Boolean);
    if (tagList.length === 0 || !await runBatchUpdate("tags", tagList, mode)) return;
    setPhotos((current) => current.map((photo) => {
      if (!selectedIds.has(photo.id)) return photo;
      const currentTags = photo.tags || [];
      const nextTags = mode === "set" ? tagList : mode === "add" ? [...new Set([...currentTags, ...tagList])] : currentTags.filter((tag) => !tagList.includes(tag));
      return { ...photo, tags: nextTags };
    }));
    showToast(`已${mode === "add" ? "添加" : mode === "remove" ? "移除" : "设置"} ${selectedIds.size} 张照片的标签`, "success");
    setSelectedIds(new Set());
  };

  const handleQuickVisibility = async (photo: PhotoItem) => {
    const visibility = photo.visibility === "public" ? "hidden" : "public";
    const success = await runBatchUpdate("visibility", visibility, undefined, [photo.id]);
    if (!success) return;
    setPhotos((current) => current.map((item) => item.id === photo.id ? { ...item, visibility } : item));
    showToast(`已将「${photo.title}」设为${visibility === "public" ? "公开" : "隐藏"}`, "success");
  };

  const getExportPhotos = useCallback(() => selectedIds.size > 0 ? photos.filter((photo) => selectedIds.has(photo.id)) : filteredPhotos, [photos, filteredPhotos, selectedIds]);
  const downloadExport = useCallback((content: string, type: string, extension: string, count: number) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `photos-export-${new Date().toISOString().slice(0, 10)}.${extension}`;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast(`已导出 ${count} 张照片 (${extension.toUpperCase()})`, "success");
  }, [showToast]);
  const handleExportJSON = useCallback(() => {
    const data = getExportPhotos().map(({ id, title, style, location, album, featured, visibility, imageUrl, alt, createdAt }) => ({ id, title, style, location, album: album ?? "", featured, visibility, imageUrl, alt, createdAt: createdAt ?? "" }));
    downloadExport(JSON.stringify(data, null, 2), "application/json", "json", data.length);
  }, [downloadExport, getExportPhotos]);
  const handleExportCSV = useCallback(() => {
    const rows = getExportPhotos().map((photo) => [photo.id, photo.title, photo.style, photo.location, photo.album ?? "", String(photo.featured), photo.visibility, photo.alt, photo.createdAt ?? ""]);
    const csv = ["id,title,style,location,album,featured,visibility,alt,createdAt", ...rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))].join("\n");
    downloadExport(`\uFEFF${csv}`, "text/csv;charset=utf-8", "csv", rows.length);
  }, [downloadExport, getExportPhotos]);

  const handleDelete = async () => {
    if (!deletingPhoto) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/photos/${deletingPhoto.id}`, { method: "DELETE", credentials: "include", headers: adminMutationHeaders });
      if (!response.ok) throw new Error("delete_failed");
      setPhotos((current) => current.filter((photo) => photo.id !== deletingPhoto.id));
      showToast("删除成功", "success");
    } catch {
      showToast("删除失败", "error");
    } finally {
      setDeleting(false);
      setDeletingPhoto(null);
    }
  };
  const handleSaveEdit = async () => {
    if (!editingPhoto) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/photos/${editingPhoto.id}`, { method: "PATCH", credentials: "include", headers: { "content-type": "application/json", ...adminMutationHeaders }, body: JSON.stringify(editForm) });
      if (!response.ok) throw new Error("save_failed");
      setPhotos((current) => current.map((photo) => photo.id === editingPhoto.id ? { ...photo, ...editForm } : photo));
      setEditingPhoto(null);
      showToast("保存成功", "success");
    } catch {
      showToast("保存失败", "error");
    } finally {
      setSaving(false);
    }
  };
  const handleFileSelect = () => {
    const input = fileRef.current;
    const file = input?.files?.[0];
    if (!input || !file) return;
    if (!ALLOWED_PHOTO_TYPES.has(file.type) || file.size > MAX_PHOTO_UPLOAD_SIZE) {
      showToast(file.size > MAX_PHOTO_UPLOAD_SIZE ? "图片过大，请上传小于 10MB 的文件" : "只支持 JPEG、PNG 或 WebP 图片", "error");
      clearPreview();
      return;
    }
    revokePreview();
    const url = URL.createObjectURL(file);
    previewObjectUrlRef.current = url;
    setPreviewUrl(url);
  };
  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const photo = fileRef.current?.files?.[0];
    if (!photo) { showToast("请选择照片文件", "error"); return; }
    if (!ALLOWED_PHOTO_TYPES.has(photo.type) || photo.size > MAX_PHOTO_UPLOAD_SIZE) { showToast(photo.size > MAX_PHOTO_UPLOAD_SIZE ? "图片过大，请上传小于 10MB 的文件" : "只支持 JPEG、PNG 或 WebP 图片", "error"); return; }
    setUploading(true);
    try {
      const response = await fetch("/api/admin/photos", { method: "POST", body: new FormData(form), credentials: "include", headers: adminMutationHeaders });
      if (!response.ok) throw new Error("upload_failed");
      const data = await response.json() as { photo: PhotoItem };
      setPhotos((current) => [data.photo, ...current]);
      clearPreview();
      form.reset();
      showToast("上传成功", "success");
    } catch {
      showToast("上传失败", "error");
    } finally {
      setUploading(false);
    }
  };

  return <AdminPhotosWorkspace
    photos={photos} filteredPhotos={filteredPhotos} loading={loading} uploading={uploading} deleting={deleting} deletingBatch={deletingBatch} saving={saving}
    selectedIds={selectedIds} editingPhoto={editingPhoto} deletingPhoto={deletingPhoto} editForm={editForm} showShortcuts={showShortcuts}
    previewUrl={previewUrl} previewMeta={previewMeta} searchQuery={searchQuery} filterStyle={filterStyle} filterVisibility={filterVisibility} filterAlbum={filterAlbum} filterFeatured={filterFeatured}
    styleLabels={styleLabels} styleCounts={styleCounts} albumCounts={albumCounts} fileRef={fileRef} editDialogRef={editDialogRef} deleteDialogRef={deleteDialogRef}
    onUpload={handleUpload} onFileSelect={handleFileSelect} onPreviewLoad={(image) => setPreviewMeta({ width: image.naturalWidth, height: image.naturalHeight, size: fileRef.current?.files?.[0]?.size ?? 0, type: fileRef.current?.files?.[0]?.type ?? "" })} onClearPreview={clearPreview}
    onSearchChange={setSearchQuery} onFilterStyleChange={setFilterStyle} onFilterVisibilityChange={setFilterVisibility} onFilterAlbumChange={setFilterAlbum} onFilterFeaturedChange={setFilterFeatured}
    onToggleSelect={toggleSelect} onToggleSelectAll={toggleSelectAll} onBatchVisibility={handleBatchVisibility} onBatchFeatured={handleBatchFeatured} onBatchDelete={handleBatchDelete} onBatchAlbum={handleBatchAlbum} onBatchTags={handleBatchTags}
    onExportJson={handleExportJSON} onExportCsv={handleExportCSV} onQuickVisibility={handleQuickVisibility}
    onStartEdit={(photo) => { setEditingPhoto(photo); setEditForm({ title: photo.title, style: photo.style, location: photo.location, featured: photo.featured, visibility: photo.visibility }); }} onEditFormChange={setEditForm} onCloseEdit={() => setEditingPhoto(null)} onSaveEdit={handleSaveEdit}
    onStartDelete={setDeletingPhoto} onCloseDelete={() => setDeletingPhoto(null)} onDelete={handleDelete} onCloseShortcuts={() => setShowShortcuts(false)}
  />;
}
