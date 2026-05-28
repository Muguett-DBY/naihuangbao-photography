import { useEffect, useState } from "react";
import { Button, Input, Loading, Table, Tabs } from "animal-island-ui";
import type { TableColumn } from "animal-island-ui";
import type { Course } from "../../types/content";
import type { ToastType } from "../../lib/admin-helpers";

interface Props {
  showToast: (text: string, type: ToastType) => void;
}

export function AdminCoursesTab({ showToast }: Props) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Course | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/courses", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setCourses(d.courses || []))
      .catch(() => showToast("加载失败", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const method = editing.id ? "PATCH" : "POST";
      const url = editing.id ? `/api/admin/courses/${editing.id}` : "/api/admin/courses";
      const r = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
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
    if (!confirm("确认删除此课程？")) return;
    try {
      const r = await fetch(`/api/admin/courses/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (r.ok) {
        showToast("删除成功", "success");
        load();
      }
    } catch {
      showToast("删除失败", "error");
    }
  };

  if (loading) {
    return <div className="adm-content-panel" style={{ position: "relative", minHeight: 250 }}><Loading active /></div>;
  }

  if (editing) {
    return (
      <div className="adm-content-panel">
        <div className="adm-panel-head">
          <h2>{editing.id ? "编辑课程" : "新建课程"}</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <Button type="text" onClick={() => setEditing(null)}>取消</Button>
            <Button type="primary" onClick={handleSave} disabled={saving}>{saving ? "保存中..." : "保存"}</Button>
          </div>
        </div>
        <div className="adm-form-grid">
          <label>标题 <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></label>
          <label>英文标题 <Input value={editing.title_en || ""} onChange={(e) => setEditing({ ...editing, title_en: e.target.value })} /></label>
          <label>描述 <Input value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></label>
          <label>分类
            <select value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
              <option value="beginner">入门</option>
              <option value="advanced">进阶</option>
              <option value="post-processing">后期</option>
              <option value="posing">摆姿</option>
            </select>
          </label>
          <label>难度
            <select value={editing.difficulty} onChange={(e) => setEditing({ ...editing, difficulty: e.target.value })}>
              <option value="beginner">入门</option>
              <option value="intermediate">中级</option>
              <option value="advanced">高级</option>
            </select>
          </label>
          <label>封面图 URL <Input value={editing.cover_image_url || ""} onChange={(e) => setEditing({ ...editing, cover_image_url: e.target.value })} /></label>
          <label>视频 URL <Input value={editing.video_url || ""} onChange={(e) => setEditing({ ...editing, video_url: e.target.value })} /></label>
          <label>排序 <Input type="number" value={String(editing.sort_order)} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></label>
          <label>发布
            <select value={editing.published ? "1" : "0"} onChange={(e) => setEditing({ ...editing, published: Number(e.target.value) })}>
              <option value="1">已发布</option>
              <option value="0">草稿</option>
            </select>
          </label>
        </div>
      </div>
    );
  }

  const columns: TableColumn[] = [
    { title: "标题", dataIndex: "title", width: "25%" },
    { title: "分类", dataIndex: "category", width: "15%" },
    { title: "难度", dataIndex: "difficulty", width: "12%" },
    { title: "状态", dataIndex: "published", width: "10%", render: (v: unknown) => v ? "已发布" : "草稿" },
    { title: "操作", dataIndex: "id", width: "18%", render: (id: unknown) => (
      <div style={{ display: "flex", gap: 6 }}>
        <Button type="text" onClick={() => setEditing(courses.find((c) => c.id === id) || null)}>编辑</Button>
        <Button type="text" onClick={() => handleDelete(id as string)}>删除</Button>
      </div>
    )},
  ];

  return (
    <div className="adm-content-panel">
      <div className="adm-panel-head">
        <h2>课程管理</h2>
        <Button type="primary" onClick={() => setEditing({ id: "", title: "", category: "beginner", difficulty: "beginner", sort_order: 0, published: 0, created_at: "", updated_at: "" })}>新建课程</Button>
      </div>
      <Table columns={columns} dataSource={courses.map((c) => ({ ...c, key: c.id }))} rowKey="key" striped={false} />
    </div>
  );
}
