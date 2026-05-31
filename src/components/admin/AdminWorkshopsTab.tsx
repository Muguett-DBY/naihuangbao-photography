import { useEffect, useState } from "react";
import { Button, Input, Loading, Table } from "animal-island-ui";
import type { TableColumn } from "animal-island-ui";
import type { Workshop } from "../../types/content";
import { adminMutationHeaders, type ToastType } from "../../lib/admin-helpers";

interface Props {
  showToast: (text: string, type: ToastType) => void;
}

export function AdminWorkshopsTab({ showToast }: Props) {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Workshop | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/workshops", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setWorkshops(d.workshops || []))
      .catch(() => showToast("加载失败", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const method = editing.id ? "PATCH" : "POST";
      const url = editing.id ? `/api/admin/workshops/${editing.id}` : "/api/admin/workshops";
      const r = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json", ...adminMutationHeaders },
        body: JSON.stringify(editing),
      });
      if (r.ok) { showToast("保存成功", "success"); setEditing(null); load(); }
      else showToast("保存失败", "error");
    } catch { showToast("保存失败", "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确认删除此活动？")) return;
    try {
      const r = await fetch(`/api/admin/workshops/${id}`, { method: "DELETE", credentials: "include", headers: adminMutationHeaders });
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
          <h2>{editing.id ? "编辑活动" : "新建活动"}</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <Button type="text" onClick={() => setEditing(null)}>取消</Button>
            <Button type="primary" onClick={handleSave} disabled={saving}>{saving ? "保存中..." : "保存"}</Button>
          </div>
        </div>
        <div className="adm-form-grid">
          <label>标题 <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></label>
          <label>描述 <Input value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></label>
          <label>活动日期 <Input type="date" value={editing.event_date} onChange={(e) => setEditing({ ...editing, event_date: e.target.value })} /></label>
          <label>活动时间 <Input value={editing.event_time || ""} onChange={(e) => setEditing({ ...editing, event_time: e.target.value })} /></label>
          <label>地点 <Input value={editing.location || ""} onChange={(e) => setEditing({ ...editing, location: e.target.value })} /></label>
          <label>名额 <Input type="number" value={String(editing.max_participants || 0)} onChange={(e) => setEditing({ ...editing, max_participants: Number(e.target.value) })} /></label>
          <label>价格 <Input value={editing.price_display || ""} onChange={(e) => setEditing({ ...editing, price_display: e.target.value })} /></label>
          <label>状态
            <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as Workshop["status"] })}>
              <option value="upcoming">即将开始</option>
              <option value="ongoing">进行中</option>
              <option value="completed">已结束</option>
              <option value="cancelled">已取消</option>
            </select>
          </label>
        </div>
      </div>
    );
  }

  const columns: TableColumn[] = [
    { title: "标题", dataIndex: "title", width: "25%" },
    { title: "日期", dataIndex: "event_date", width: "15%" },
    { title: "地点", dataIndex: "location", width: "15%" },
    { title: "名额", dataIndex: "current_participants", width: "10%", render: (v: unknown, row: unknown) => { const w = row as Workshop; return `${w.current_participants}/${w.max_participants}`; } },
    { title: "状态", dataIndex: "status", width: "10%" },
    { title: "操作", dataIndex: "id", width: "18%", render: (id: unknown) => (
      <div style={{ display: "flex", gap: 6 }}>
        <Button type="text" onClick={() => setEditing(workshops.find((w) => w.id === id) || null)}>编辑</Button>
        <Button type="text" onClick={() => handleDelete(id as string)}>删除</Button>
      </div>
    )},
  ];

  return (
    <div className="adm-content-panel">
      <div className="adm-panel-head">
        <h2>活动管理</h2>
        <Button type="primary" onClick={() => setEditing({ id: "", title: "", event_date: "", status: "upcoming", current_participants: 0, created_at: "", updated_at: "" })}>新建活动</Button>
      </div>
      <Table columns={columns} dataSource={workshops.map((w) => ({ ...w, key: w.id }))} rowKey="key" striped={false} />
    </div>
  );
}
