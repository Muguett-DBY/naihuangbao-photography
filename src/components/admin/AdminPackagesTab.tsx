import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "animal-island-ui";
import { defaultSiteContent } from "../../data/content";
import type { PackageItem, SiteContent } from "../../types/content";
import { linesFromText, PanelHeader, type ToastType } from "../../lib/admin-helpers";
import { isAbortError } from "../../lib/errors";

const emptyPkg: PackageItem = {
  name: "新套餐", price: "0/h", duration: "2小时起拍",
  summary: "填写套餐说明", includes: ["前期沟通", "拍摄引导"],
};

export function AdminPackagesTab({ showToast }: { showToast: (text: string, type: ToastType) => void }) {
  const [content, setContent] = useState(() => defaultSiteContent);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/admin/content", { credentials: "include", signal: ctrl.signal })
      .then((r) => r.json())
      .then((d: { content?: SiteContent }) => { if (d.content && !ctrl.signal.aborted) setContent(d.content); })
      .catch((err) => { if (!isAbortError(err)) showToast("无法加载内容数据", "error"); });
    return () => ctrl.abort();
  }, []);
  const [saving, setSaving] = useState<string | null>(null);

  const updateContent = <K extends keyof SiteContent>(key: K, value: SiteContent[K]) =>
    setContent((prev) => ({ ...prev, [key]: value }));

  const saveSection = async (label: string, keys: (keyof SiteContent)[]) => {
    setSaving(label);
    try {
      for (const key of keys) {
        const r = await fetch("/api/admin/content", {
          method: "PATCH", credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ key, value: content[key] }),
        });
        if (!r.ok) { showToast(`${label} 保存失败`, "error"); return; }
      }
      showToast(`${label} 已保存`, "success");
    } finally {
      setSaving(null);
    }
  };

  const updatePkg = (index: number, patch: Partial<PackageItem>) =>
    updateContent("packages", content.packages.map((p, i) => i === index ? { ...p, ...patch } : p));

  return (
    <div className="adm-content-panel">
      <PanelHeader title="套餐价格" onSave={() => saveSection("套餐价格", ["packages"])} saving={saving === "套餐价格"} />
      <div className="adm-cms-list">
        {content.packages.map((item, index) => (
          <div className="adm-cms-item" key={`${item.name}-${index}`}>
            <div className="adm-cms-item-head">
              <strong>套餐 {index + 1}</strong>
              <Button type="text" size="small" onClick={() => updateContent("packages", content.packages.filter((_, i) => i !== index))} disabled={content.packages.length <= 1}>删除</Button>
            </div>
            <div className="adm-form-grid">
              <label>套餐名 <input value={item.name} onChange={(e) => updatePkg(index, { name: e.target.value })} /></label>
              <label>价格 <input value={item.price} onChange={(e) => updatePkg(index, { price: e.target.value })} /></label>
              <label>时长 <input value={item.duration} onChange={(e) => updatePkg(index, { duration: e.target.value })} /></label>
              <label className="adm-span-2">说明 <textarea value={item.summary} onChange={(e) => updatePkg(index, { summary: e.target.value })} /></label>
              <label className="adm-span-2">包含内容（一行一个） <textarea value={item.includes.join("\n")} onChange={(e) => updatePkg(index, { includes: linesFromText(e.target.value) })} /></label>
            </div>
          </div>
        ))}
      </div>
      <Button type="primary" className="adm-add" onClick={() => updateContent("packages", [...content.packages, emptyPkg])}>
        <Plus size={14} /> 添加套餐
      </Button>
    </div>
  );
}
