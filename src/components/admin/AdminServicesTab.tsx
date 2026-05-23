import { useState } from "react";
import { Plus } from "lucide-react";
import { defaultSiteContent } from "../../data/content";
import type { ServicePolicy, SiteContent } from "../../types/content";
import { linesFromText, PanelHeader } from "../../lib/admin-helpers";

const emptyPolicy: ServicePolicy = { title: "新规则", detail: "填写规则说明" };

export function AdminServicesTab() {
  const [content, setContent] = useState(() => defaultSiteContent);
  const [saving, setSaving] = useState<string | null>(null);

  const updateContent = <K extends keyof SiteContent>(key: K, value: SiteContent[K]) =>
    setContent((prev) => ({ ...prev, [key]: value }));

  const saveSection = async (label: string, keys: (keyof SiteContent)[]) => {
    setSaving(label);
    try {
      for (const key of keys) {
        await fetch("/api/admin/content", {
          method: "PATCH", credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ key, value: content[key] }),
        });
      }
    } finally {
      setSaving(null);
    }
  };

  const updatePol = (index: number, patch: Partial<ServicePolicy>) =>
    updateContent("servicePolicies", content.servicePolicies.map((p, i) => i === index ? { ...p, ...patch } : p));

  return (
    <div className="adm-content-panel">
      <PanelHeader title="服务规则" onSave={() => saveSection("服务规则", ["serviceAddOns", "servicePolicies"])} saving={saving === "服务规则"} />

      <div className="adm-cms-item">
        <h3>设备与拍立得</h3>
        <div className="adm-form-grid">
          <label className="adm-span-2">拍摄设备（一行一个）
            <textarea value={content.serviceAddOns.equipment.join("\n")}
              onChange={(e) => updateContent("serviceAddOns", { ...content.serviceAddOns, equipment: linesFromText(e.target.value) })} />
          </label>
          <label>拍立得型号
            <input value={content.serviceAddOns.instantCamera.camera}
              onChange={(e) => updateContent("serviceAddOns", { ...content.serviceAddOns, instantCamera: { ...content.serviceAddOns.instantCamera, camera: e.target.value } })} />
          </label>
          <label>拍立得价格
            <input value={content.serviceAddOns.instantCamera.price}
              onChange={(e) => updateContent("serviceAddOns", { ...content.serviceAddOns, instantCamera: { ...content.serviceAddOns.instantCamera, price: e.target.value } })} />
          </label>
        </div>
      </div>

      <div className="adm-cms-list">
        {content.servicePolicies.map((item, index) => (
          <div className="adm-cms-item" key={`${item.title}-${index}`}>
            <div className="adm-cms-item-head">
              <strong>预约规则 {index + 1}</strong>
              <button type="button" onClick={() => updateContent("servicePolicies", content.servicePolicies.filter((_, i) => i !== index))}>删除</button>
            </div>
            <div className="adm-form-grid">
              <label>标题 <input value={item.title} onChange={(e) => updatePol(index, { title: e.target.value })} /></label>
              <label className="adm-span-2">说明 <textarea value={item.detail} onChange={(e) => updatePol(index, { detail: e.target.value })} /></label>
            </div>
          </div>
        ))}
      </div>
      <button className="adm-add" type="button" onClick={() => updateContent("servicePolicies", [...content.servicePolicies, emptyPolicy])}>
        <Plus size={14} /> 添加规则
      </button>
    </div>
  );
}
