import { useEffect, useState } from "react";
import { Button, Input, Loading, Table } from "animal-island-ui";
import type { TableColumn } from "animal-island-ui";
import type { Merchandise } from "../../types/content";
import type { ToastType } from "../../lib/admin-helpers";

interface Props {
  showToast: (text: string, type: ToastType) => void;
}

export function AdminMerchandiseTab({ showToast }: Props) {
  const [items, setItems] = useState<Merchandise[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Merchandise | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/merchandise", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setItems(d.merchandise || []))
      .catch(() => showToast("加载失败", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const method = editing.id ? "PATCH" : "POST";
      const url = editing.id ? `/api/admin/merchandise/${editing.id}` : "/api/admin/merchandise";
      const r = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      if (r.ok) { showToast("保存成功", "success"); setEditing(null); load(); }
      else showToast("保存失败", "error");
    } catch { showToast("保存失败", "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确认删除此产品？")) return;
    try {
      const r = await fetch(`/api/admin/merchandise/${id}`, { method: "DELETE", credentials: "include" });
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
          <h2>{editing.id ? "编辑产品" : "新建产品"}</h2>
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
              <option value="album">定制相册</option>
              <option value="postcard">明信片</option>
              <option value="frame">相框</option>
              <option value="print">冲印</option>
              <option value="other">其他</option>
            </select>
          </label>
          <label>价格 <Input value={editing.price_display || ""} onChange={(e) => setEditing({ ...editing, price_display: e.target.value })} /></label>
          <label>上架
            <select value={editing.available ? "1" : "0"} onChange={(e) => setEditing({ ...editing, available: Number(e.target.value) })}>
              <option value="1">上架</option>
              <option value="0">下架</option>
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
    { title: "状态", dataIndex: "available", width: "10%", render: (v: unknown) => v ? "上架" : "下架" },
    { title: "操作", dataIndex: "id", width: "18%", render: (id: unknown) => (
      <div style={{ display: "flex", gap: 6 }}>
        <Button type="text" onClick={() => setEditing(items.find((i) => i.id === id) || null)}>编辑</Button>
        <Button type="text" onClick={() => handleDelete(id as string)}>删除</Button>
      </div>
    )},
  ];

  return (
    <div className="adm-content-panel">
      <div className="adm-panel-head">
        <h2>产品管理</h2>
        <Button type="primary" onClick={() => setEditing({ id: "", name: "", category: "other", images: [], available: 1, created_at: "", updated_at: "" })}>新建产品</Button>
      </div>
      <Table columns={columns} dataSource={items.map((i) => ({ ...i, key: i.id }))} rowKey="key" striped={false} />
    </div>
  );
}
