import { useEffect, useState } from "react";
import { Button, Input, Loading, Table } from "animal-island-ui";
import type { TableColumn } from "animal-island-ui";
import type { Preset } from "../../types/content";
import { adminMutationHeaders, type ToastType } from "../../lib/admin-helpers";

interface Props {
  showToast: (text: string, type: ToastType) => void;
}

export function AdminPresetsTab({ showToast }: Props) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Preset | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/presets", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setPresets(d.presets || []))
      .catch(() => showToast("加载失败", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const method = editing.id ? "PATCH" : "POST";
      const url = editing.id ? `/api/admin/presets/${editing.id}` : "/api/admin/presets";
      const r = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json", ...adminMutationHeaders },
        body: JSON.stringify(editing),
      });
      if (r.ok) {
        showToast("保存成功", "success");
        setEditing(null);
        load();
      } else {
        showToast("保存失败", "error");
      }
    } catch {
      showToast("保存失败", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确认删除此预设？")) return;
    try {
      const r = await fetch(`/api/admin/presets/${id}`, { method: "DELETE", credentials: "include", headers: adminMutationHeaders });
      if (r.ok) { showToast("删除成功", "success"); load(); }
    } catch { showToast("删除失败", "error"); }
  };

  if (loading) {
    return <div className="adm-content-panel" style={{ position: "relative", minHeight: 250 }}><Loading active /></div>;
  }

  if (editing) {
    return (
      <div className="adm-content-panel">
        <div className="adm-panel-head">
          <h2>{editing.id ? "编辑预设" : "新建预设"}</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <Button type="text" onClick={() => setEditing(null)}>取消</Button>
            <Button type="primary" onClick={handleSave} disabled={saving}>{saving ? "保存中..." : "保存"}</Button>
          </div>
        </div>
        <div className="adm-form-grid">
          <label>名称 <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></label>
          <label>描述 <Input value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></label>
          <label>分类
            <select value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
              <option value="lightroom">Lightroom</option>
              <option value="photoshop">Photoshop</option>
              <option value="capture-one">Capture One</option>
              <option value="luts">LUT</option>
            </select>
          </label>
          <label>价格展示 <Input value={editing.price_display || ""} onChange={(e) => setEditing({ ...editing, price_display: e.target.value })} /></label>
          <label>下载链接 <Input value={editing.download_url || ""} onChange={(e) => setEditing({ ...editing, download_url: e.target.value })} /></label>
          <label>推荐
            <select value={editing.featured ? "1" : "0"} onChange={(e) => setEditing({ ...editing, featured: Number(e.target.value) })}>
              <option value="1">是</option>
              <option value="0">否</option>
            </select>
          </label>
        </div>
      </div>
    );
  }

  const columns: TableColumn[] = [
    { title: "名称", dataIndex: "name", width: "25%" },
    { title: "分类", dataIndex: "category", width: "15%" },
    { title: "价格", dataIndex: "price_display", width: "12%" },
    { title: "下载数", dataIndex: "download_count", width: "10%" },
    { title: "操作", dataIndex: "id", width: "18%", render: (id: unknown) => (
      <div style={{ display: "flex", gap: 6 }}>
        <Button type="text" onClick={() => setEditing(presets.find((p) => p.id === id) || null)}>编辑</Button>
        <Button type="text" onClick={() => handleDelete(id as string)}>删除</Button>
      </div>
    )},
  ];

  return (
    <div className="adm-content-panel">
      <div className="adm-panel-head">
        <h2>预设管理</h2>
        <Button type="primary" onClick={() => setEditing({ id: "", name: "", category: "lightroom", preview_images: [], featured: 0, download_count: 0, created_at: "", updated_at: "" })}>新建预设</Button>
      </div>
      <Table columns={columns} dataSource={presets.map((p) => ({ ...p, key: p.id }))} rowKey="key" striped={false} />
    </div>
  );
}
