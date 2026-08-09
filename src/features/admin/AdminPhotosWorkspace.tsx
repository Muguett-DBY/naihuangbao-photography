import { type FormEventHandler, type RefObject, type SetStateAction, type Dispatch, useState } from "react";
import { Download, Eye, EyeOff, FolderOpen, HelpCircle, ImagePlus, Pencil, Star, Tag, Trash2, Upload } from "lucide-react";
import { Button } from "animal-island-ui";
import type { PhotoItem, PhotoStyle, PhotoVisibility } from "../../types/photo";
import { HighlightText } from "../../components/shared/HighlightText";
import { SkeletonGrid } from "../../components/SkeletonGrid";

export type PhotoEditForm = {
  title: string;
  style: PhotoStyle;
  location: string;
  featured: boolean;
  visibility: PhotoVisibility;
};

type AdminPhotosWorkspaceProps = {
  photos: PhotoItem[];
  filteredPhotos: PhotoItem[];
  loading: boolean;
  uploading: boolean;
  deleting: boolean;
  deletingBatch: boolean;
  saving: boolean;
  selectedIds: Set<string>;
  editingPhoto: PhotoItem | null;
  deletingPhoto: PhotoItem | null;
  editForm: PhotoEditForm;
  showShortcuts: boolean;
  previewUrl: string | null;
  previewMeta: { width: number; height: number; size: number; type: string } | null;
  searchQuery: string;
  filterStyle: PhotoStyle | "all";
  filterVisibility: "all" | "public" | "hidden";
  filterAlbum: string;
  filterFeatured: "all" | "featured" | "not-featured";
  styleLabels: Record<string, string>;
  styleCounts: Record<string, number>;
  albumCounts: Record<string, number>;
  fileRef: RefObject<HTMLInputElement | null>;
  editDialogRef: RefObject<HTMLDivElement | null>;
  deleteDialogRef: RefObject<HTMLDivElement | null>;
  onUpload: FormEventHandler<HTMLFormElement>;
  onFileSelect: () => void;
  onPreviewLoad: (image: HTMLImageElement) => void;
  onClearPreview: () => void;
  onSearchChange: (value: string) => void;
  onFilterStyleChange: (value: PhotoStyle | "all") => void;
  onFilterVisibilityChange: (value: "all" | "public" | "hidden") => void;
  onFilterAlbumChange: (value: string) => void;
  onFilterFeaturedChange: (value: "all" | "featured" | "not-featured") => void;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onBatchVisibility: (value: "public" | "hidden") => void;
  onBatchFeatured: (value: boolean) => void;
  onBatchDelete: () => void;
  onBatchAlbum: (value: string) => void;
  onBatchTags: (tags: string, mode: "add" | "remove" | "set") => void;
  onExportJson: () => void;
  onExportCsv: () => void;
  onQuickVisibility: (photo: PhotoItem) => void;
  onStartEdit: (photo: PhotoItem) => void;
  onEditFormChange: Dispatch<SetStateAction<PhotoEditForm>>;
  onCloseEdit: () => void;
  onSaveEdit: () => void;
  onStartDelete: (photo: PhotoItem) => void;
  onCloseDelete: () => void;
  onDelete: () => void;
  onCloseShortcuts: () => void;
};

export function AdminPhotosWorkspace(props: AdminPhotosWorkspaceProps) {
  return (
    <div className="adm-body">
      {props.editingPhoto && (
        <div className="adm-overlay" role="dialog" aria-modal="true" aria-label="编辑作品" onClick={props.onCloseEdit}>
          <div className="adm-dialog" ref={props.editDialogRef} onClick={(event) => event.stopPropagation()}>
            <h3>编辑作品</h3>
            <div className="adm-edit-grid">
              <label>标题 <input value={props.editForm.title} onChange={(event) => props.onEditFormChange((current) => ({ ...current, title: event.target.value }))} /></label>
              <label>风格<select value={props.editForm.style} onChange={(event) => props.onEditFormChange((current) => ({ ...current, style: event.target.value as PhotoStyle }))}>{Object.entries(props.styleLabels).filter(([key]) => key !== "all").map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label>
              <label>地点 <input value={props.editForm.location} onChange={(event) => props.onEditFormChange((current) => ({ ...current, location: event.target.value }))} /></label>
              <label>展示状态<select value={props.editForm.visibility} onChange={(event) => props.onEditFormChange((current) => ({ ...current, visibility: event.target.value as PhotoVisibility }))}><option value="public">公开展示</option><option value="hidden">隐藏</option></select></label>
              <label className="adm-check"><input type="checkbox" checked={props.editForm.featured} onChange={(event) => props.onEditFormChange((current) => ({ ...current, featured: event.target.checked }))} /> 精选作品</label>
            </div>
            <div className="adm-actions"><Button type="default" size="small" className="adm-btn-cancel" onClick={props.onCloseEdit}>取消</Button><Button type="primary" size="small" className="adm-btn-confirm" onClick={props.onSaveEdit} disabled={props.saving}>{props.saving ? "保存中..." : "保存"}</Button></div>
          </div>
        </div>
      )}

      <div className="adm-side">
        <div className="adm-card">
          <h2><ImagePlus size={18} /> 上传作品</h2>
          <form onSubmit={props.onUpload}>
            {props.previewUrl ? (
              <div className="adm-upload-preview">
                <img src={props.previewUrl} alt="预览" onLoad={(event) => props.onPreviewLoad(event.currentTarget)} />
                {props.previewMeta && <div className="adm-upload-meta">{props.previewMeta.width}×{props.previewMeta.height} · {(props.previewMeta.size / 1024).toFixed(0)} KB · {props.previewMeta.type.split("/").pop()?.toUpperCase()}</div>}
                <button type="button" className="adm-upload-clear" onClick={props.onClearPreview}>×</button>
              </div>
            ) : (
              <label className="adm-upload-zone"><Upload size={28} /><span>点击选择照片</span><input ref={props.fileRef} name="photo" type="file" accept="image/jpeg,image/png,image/webp" required onChange={props.onFileSelect} hidden /></label>
            )}
            <label>标题 <input name="title" placeholder="例如：绿色旗袍与烟雨江南" required /></label>
            <label>风格 <select name="style" defaultValue="jiangnan">{Object.entries(props.styleLabels).filter(([key]) => key !== "all").map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label>
            <label>地点 <input name="location" placeholder="南京" required /></label>
            <label className="adm-check"><input name="clientAuthorized" type="checkbox" value="true" required /> 客人已授权</label>
            <label className="adm-check"><input name="featured" type="checkbox" value="true" /> 设为精选</label>
            <Button type="primary" htmlType="submit" className="adm-submit" disabled={props.uploading}>{props.uploading ? "上传中..." : "上传"}</Button>
          </form>
          <p className="adm-hint">JPEG/PNG/WebP · 最大 10MB</p>
        </div>
      </div>

      <div className="adm-main">
        <div className="adm-stats-bar">
          <span>全部 <strong>{props.photos.length}</strong></span>
          <span className="adm-stats-public">公开 <strong>{props.photos.filter((photo) => photo.visibility === "public").length}</strong></span>
          <span className="adm-stats-hidden">隐藏 <strong>{props.photos.filter((photo) => photo.visibility === "hidden").length}</strong></span>
          <span className="adm-stats-featured">精选 <strong>{props.photos.filter((photo) => photo.featured).length}</strong></span>
        </div>
        <div className="adm-list-header">
          <h2>作品集 ({props.photos.length})</h2>
          <div className="adm-filter-bar">
            <input type="text" className="adm-search-input" placeholder="搜索标题、地点..." value={props.searchQuery} onChange={(event) => props.onSearchChange(event.target.value)} />
            <select className="adm-filter-select" value={props.filterStyle} onChange={(event) => props.onFilterStyleChange(event.target.value as PhotoStyle | "all")}><option value="all">全部风格 ({props.styleCounts.all})</option>{Object.entries(props.styleLabels).filter(([key]) => key !== "all").map(([key, value]) => <option key={key} value={key}>{value} ({props.styleCounts[key] || 0})</option>)}</select>
            <select className="adm-filter-select" value={props.filterVisibility} onChange={(event) => props.onFilterVisibilityChange(event.target.value as AdminPhotosWorkspaceProps["filterVisibility"])}><option value="all">全部状态</option><option value="public">公开</option><option value="hidden">隐藏</option></select>
            <select className="adm-filter-select" value={props.filterAlbum} onChange={(event) => props.onFilterAlbumChange(event.target.value)}><option value="all">全部相册 ({props.albumCounts.all})</option>{Object.entries(props.albumCounts).filter(([key]) => key !== "all").sort(([, left], [, right]) => right - left).map(([key, value]) => <option key={key} value={key}>{key} ({value})</option>)}</select>
            <select className="adm-filter-select" value={props.filterFeatured} onChange={(event) => props.onFilterFeaturedChange(event.target.value as AdminPhotosWorkspaceProps["filterFeatured"])}><option value="all">全部精选</option><option value="featured">精选</option><option value="not-featured">非精选</option></select>
          </div>
          <PhotoBulkActions {...props} />
        </div>
        <div className="adm-grid">
          {props.loading ? <SkeletonGrid count={6} columns={3} ariaLabel="Loading photos" /> : props.filteredPhotos.length === 0 ? (
            <div className="adm-empty"><ImagePlus size={36} /><p>{props.photos.length === 0 ? "上传你的第一张作品" : "没有匹配的照片"}</p></div>
          ) : props.filteredPhotos.map((photo) => (
            <div key={photo.id} className={`adm-photo${photo.featured ? " is-featured" : ""}${photo.visibility === "hidden" ? " is-hidden" : ""}${props.selectedIds.has(photo.id) ? " is-selected" : ""}`} aria-label={`${photo.title} - ${props.styleLabels[photo.style]} - ${photo.visibility === "public" ? "公开" : "隐藏"}${photo.featured ? " - 精选" : ""}`}>
              <div className="adm-photo-check" onClick={() => props.onToggleSelect(photo.id)}><input type="checkbox" checked={props.selectedIds.has(photo.id)} readOnly /></div>
              <img src={photo.imageUrl} alt={photo.alt} loading="lazy" />
              <div className="adm-badge-row">{photo.featured && <span className="adm-badge">精选</span>}{photo.visibility === "hidden" && <span className="adm-badge adm-badge-muted">隐藏</span>}</div>
              <div className="adm-photo-info"><strong>{props.searchQuery ? <HighlightText text={photo.title} query={props.searchQuery} className="adm-highlight" /> : photo.title}</strong><span>{props.styleLabels[photo.style]} · {photo.location}</span></div>
              <div className="adm-photo-actions">
                <Button type="text" size="small" className="adm-vis-toggle" onClick={() => props.onQuickVisibility(photo)} title={photo.visibility === "public" ? "设为隐藏" : "设为公开"} aria-label={photo.visibility === "public" ? "隐藏这张照片" : "公开这张照片"}>{photo.visibility === "public" ? <EyeOff size={13} /> : <Eye size={13} />}</Button>
                <Button type="text" size="small" className="adm-edit" onClick={() => props.onStartEdit(photo)} title="编辑"><Pencil size={13} /></Button>
                <Button type="text" size="small" className="adm-del" onClick={() => props.onStartDelete(photo)} title="删除"><Trash2 size={13} /></Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {props.deletingPhoto && <div className="adm-overlay" role="dialog" aria-modal="true" aria-label="确认删除" onClick={props.onCloseDelete}><div className="adm-dialog" ref={props.deleteDialogRef} onClick={(event) => event.stopPropagation()}><h3>确认删除</h3><p>确定删除「{props.deletingPhoto.title}」？删除后不可恢复。</p><div className="adm-actions"><Button type="default" size="small" className="adm-btn-cancel" onClick={props.onCloseDelete}>取消</Button><Button type="primary" size="small" className="adm-btn-confirm" onClick={props.onDelete} disabled={props.deleting}>{props.deleting ? "删除中..." : "确认删除"}</Button></div></div></div>}
      {props.showShortcuts && <div className="adm-overlay" role="dialog" aria-modal="true" aria-label="键盘快捷键" onClick={props.onCloseShortcuts}><div className="adm-dialog adm-shortcuts-dialog" onClick={(event) => event.stopPropagation()}><h3><HelpCircle size={18} /> 键盘快捷键</h3><ul className="adm-shortcuts-list"><li><kbd>/</kbd> 聚焦搜索框</li><li><kbd>N</kbd> 上传新照片</li><li><kbd>A</kbd> 全选/取消全选</li><li><kbd>Del</kbd> 删除选中照片</li><li><kbd>?</kbd> 显示/隐藏快捷键</li><li><kbd>Esc</kbd> 关闭弹窗</li></ul><div className="adm-actions"><Button type="default" size="small" onClick={props.onCloseShortcuts}>关闭</Button></div></div></div>}
    </div>
  );
}

function PhotoBulkActions(props: AdminPhotosWorkspaceProps) {
  return (
    <div className="adm-list-actions">
      {props.selectedIds.size > 0 ? <><span className="adm-selected-count">已选 {props.selectedIds.size} 张</span><Button type="primary" size="small" onClick={() => props.onBatchVisibility("public")}><Eye size={13} /> 设为公开</Button><Button type="primary" size="small" onClick={() => props.onBatchVisibility("hidden")}><EyeOff size={13} /> 设为隐藏</Button><Button type="primary" size="small" onClick={() => props.onBatchFeatured(true)}><Star size={13} /> 设为精选</Button><Button type="primary" size="small" onClick={() => props.onBatchFeatured(false)}>取消精选</Button><ExportButtons onJson={props.onExportJson} onCsv={props.onExportCsv} /><Button type="primary" size="small" className="adm-btn-danger" onClick={props.onBatchDelete} disabled={props.deletingBatch}><Trash2 size={13} /> {props.deletingBatch ? "删除中..." : "删除选中"}</Button><BulkAlbumInput onApply={props.onBatchAlbum} /><BulkTagsInput onApply={props.onBatchTags} /></> : <ExportButtons onJson={props.onExportJson} onCsv={props.onExportCsv} />}
      <label className="adm-select-all"><input type="checkbox" checked={props.filteredPhotos.length > 0 && props.filteredPhotos.every((photo) => props.selectedIds.has(photo.id))} onChange={props.onToggleSelectAll} /> 全选 ({props.filteredPhotos.length})</label>
    </div>
  );
}

function ExportButtons({ onJson, onCsv }: { onJson: () => void; onCsv: () => void }) {
  return <><Button type="primary" size="small" onClick={onJson}><Download size={13} /> 导出 JSON</Button><Button type="primary" size="small" onClick={onCsv}><Download size={13} /> 导出 CSV</Button></>;
}

function BulkAlbumInput({ onApply }: { onApply: (album: string) => void }) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const close = () => { setOpen(false); setValue(""); };
  return open ? <span className="adm-bulk-album-row"><input type="text" className="adm-bulk-album-input" placeholder="相册名" value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { onApply(value); close(); } if (event.key === "Escape") close(); }} autoFocus /><Button type="primary" size="small" onClick={() => { onApply(value); close(); }}>设为</Button><Button type="default" size="small" onClick={close}>取消</Button></span> : <Button type="primary" size="small" onClick={() => setOpen(true)}><FolderOpen size={13} /> 修改相册</Button>;
}

function BulkTagsInput({ onApply }: { onApply: (tags: string, mode: "add" | "remove" | "set") => void }) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "remove" | "set">("add");
  const close = () => { setOpen(false); setValue(""); };
  return open ? <span className="adm-bulk-album-row"><select className="adm-filter-select" value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}><option value="add">添加标签</option><option value="remove">移除标签</option><option value="set">覆盖标签</option></select><input type="text" className="adm-bulk-album-input" placeholder="标签（逗号分隔）" value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { onApply(value, mode); close(); } if (event.key === "Escape") close(); }} autoFocus /><Button type="primary" size="small" onClick={() => { onApply(value, mode); close(); }}>应用</Button><Button type="default" size="small" onClick={close}>取消</Button></span> : <Button type="primary" size="small" onClick={() => setOpen(true)}><Tag size={13} /> 管理标签</Button>;
}
