import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button, Collapse } from "animal-island-ui";
import { defaultSiteContent } from "../../data/content";
import type { FaqItem, SiteContent } from "../../types/content";
import { adminMutationHeaders, linesFromText, PanelHeader, type ToastType } from "../../lib/admin-helpers";
import { isAbortError } from "../../lib/errors";

const emptyFaq: FaqItem = { question: "新问题", answer: "填写回答" };

export function AdminFaqTab({ showToast }: { showToast: (text: string, type: ToastType) => void }) {
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
          headers: { "content-type": "application/json", ...adminMutationHeaders },
          body: JSON.stringify({ key, value: content[key] }),
        });
        if (!r.ok) { showToast(`${label} 保存失败`, "error"); return; }
      }
      showToast(`${label} 已保存`, "success");
    } finally {
      setSaving(null);
    }
  };

  const updateFq = (index: number, patch: Partial<FaqItem>) =>
    updateContent("faqs", content.faqs.map((p, i) => i === index ? { ...p, ...patch } : p));

  return (
    <div className="adm-content-panel">
      <PanelHeader title="FAQ/流程" onSave={() => saveSection("FAQ/流程", ["faqs", "processSteps"])} saving={saving === "FAQ/流程"} />

      <div className="adm-cms-item">
        <h3>预约流程</h3>
        <label>流程步骤（一行一个）
          <textarea value={content.processSteps.join("\n")}
            onChange={(e) => updateContent("processSteps", linesFromText(e.target.value))} />
        </label>
      </div>

      <div className="adm-cms-list">
        {content.faqs.map((item, index) => (
          <div className="adm-cms-item" key={`${item.question}-${index}`}>
            <div className="adm-cms-item-head">
              <strong>问题 {index + 1}</strong>
              <Button type="text" size="small" onClick={() => updateContent("faqs", content.faqs.filter((_, i) => i !== index))}>删除</Button>
            </div>
            <div className="adm-form-grid">
              <label>问题 <input value={item.question} onChange={(e) => updateFq(index, { question: e.target.value })} /></label>
              <label className="adm-span-2">回答 <textarea value={item.answer} onChange={(e) => updateFq(index, { answer: e.target.value })} /></label>
            </div>
          </div>
        ))}
      </div>
      <Button type="primary" className="adm-add" onClick={() => updateContent("faqs", [...content.faqs, emptyFaq])}>
        <Plus size={14} /> 添加问题
      </Button>
    </div>
  );
}
