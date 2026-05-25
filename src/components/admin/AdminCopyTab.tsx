import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "animal-island-ui";
import { defaultSiteContent } from "../../data/content";
import type { SiteContent, WhyCard, WhyCardIcon } from "../../types/content";
import { linesFromText, PanelHeader, type ToastType } from "../../lib/admin-helpers";
import { isAbortError } from "../../lib/errors";

const whyIconOptions: Array<{ value: WhyCardIcon; label: string }> = [
  { value: "heart", label: "爱心" },
  { value: "camera", label: "相机" },
  { value: "message", label: "沟通" },
  { value: "shield", label: "保护" },
];

const emptyWhyCard: WhyCard = { icon: "heart", title: "新亮点", detail: "填写说明" };

export function AdminCopyTab({ showToast }: { showToast: (text: string, type: ToastType) => void }) {
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

  const updateWhy = (index: number, patch: Partial<WhyCard>) =>
    updateContent("whyCards", content.whyCards.map((c, i) => i === index ? { ...c, ...patch } : c));

  const sc = content.sectionCopy;
  const updateSection = <K extends keyof typeof sc>(key: K, value: (typeof sc)[K]) =>
    updateContent("sectionCopy", { ...sc, [key]: value });

  return (
    <div className="adm-content-panel">
      <PanelHeader title="主页文案" onSave={() => saveSection("主页文案", ["siteConfig", "whyCards", "sectionCopy"])} saving={saving === "主页文案"} />

      <div className="adm-cms-item">
        <h3>站点与联系方式</h3>
        <div className="adm-form-grid">
          <label>品牌名 <input value={content.siteConfig.brandName} onChange={(e) => updateContent("siteConfig", { ...content.siteConfig, brandName: e.target.value })} /></label>
          <label>城市 <input value={content.siteConfig.city} onChange={(e) => updateContent("siteConfig", { ...content.siteConfig, city: e.target.value })} /></label>
          <label>域名 <input value={content.siteConfig.domain} onChange={(e) => updateContent("siteConfig", { ...content.siteConfig, domain: e.target.value })} /></label>
          <label>联系按钮 <input value={content.siteConfig.contactStatus} onChange={(e) => updateContent("siteConfig", { ...content.siteConfig, contactStatus: e.target.value })} /></label>
          <label className="adm-span-2">小红书链接 <input value={content.siteConfig.xiaohongshuProfile} onChange={(e) => updateContent("siteConfig", { ...content.siteConfig, xiaohongshuProfile: e.target.value })} /></label>
          <label className="adm-span-2">首页简介 <textarea value={content.siteConfig.description} onChange={(e) => updateContent("siteConfig", { ...content.siteConfig, description: e.target.value })} /></label>
          <label className="adm-span-2">预约提示 <textarea value={content.siteConfig.contactHint} onChange={(e) => updateContent("siteConfig", { ...content.siteConfig, contactHint: e.target.value })} /></label>
          <label className="adm-span-2">标语 <input value={content.siteConfig.tagline} onChange={(e) => updateContent("siteConfig", { ...content.siteConfig, tagline: e.target.value })} /></label>
        </div>
      </div>

      <div className="adm-cms-item">
        <h3>首页区域文案</h3>
        <div className="adm-form-grid">
          <label>作品区标题 <input value={sc.gallery.title} onChange={(e) => updateSection("gallery", { ...sc.gallery, title: e.target.value })} /></label>
          <label>套餐区标题 <input value={sc.packages.title} onChange={(e) => updateSection("packages", { ...sc.packages, title: e.target.value })} /></label>
          <label>服务区标题 <input value={sc.details.title} onChange={(e) => updateSection("details", { ...sc.details, title: e.target.value })} /></label>
          <label>须知区标题 <input value={sc.notice.title} onChange={(e) => updateSection("notice", { ...sc.notice, title: e.target.value })} /></label>
          <label>选择理由标题 <input value={sc.why.title} onChange={(e) => updateSection("why", { ...sc.why, title: e.target.value })} /></label>
          <label>关于区标题 <input value={sc.about.title} onChange={(e) => updateSection("about", { ...sc.about, title: e.target.value })} /></label>
          <label className="adm-span-2">关于区正文 <textarea value={sc.about.body} onChange={(e) => updateSection("about", { ...sc.about, body: e.target.value })} /></label>
          <label>预约卡标题 <input value={sc.about.bookingTitle} onChange={(e) => updateSection("about", { ...sc.about, bookingTitle: e.target.value })} /></label>
          <label>小红书链接文字 <input value={sc.about.profileLinkLabel} onChange={(e) => updateSection("about", { ...sc.about, profileLinkLabel: e.target.value })} /></label>
          <label>中部 CTA 标题 <input value={sc.midCta.title} onChange={(e) => updateSection("midCta", { ...sc.midCta, title: e.target.value })} /></label>
          <label>中部 CTA 按钮 <input value={sc.midCta.actionLabel} onChange={(e) => updateSection("midCta", { ...sc.midCta, actionLabel: e.target.value })} /></label>
          <label className="adm-span-2">中部 CTA 说明 <textarea value={sc.midCta.intro} onChange={(e) => updateSection("midCta", { ...sc.midCta, intro: e.target.value })} /></label>
          <label>页脚标语 <input value={sc.footer.tagline} onChange={(e) => updateSection("footer", { ...sc.footer, tagline: e.target.value })} /></label>
          <label>安全说明标题 <input value={sc.safety.title} onChange={(e) => updateSection("safety", { ...sc.safety, title: e.target.value })} /></label>
          <label className="adm-span-2">安全说明段落（一行一个）
            <textarea value={sc.safety.paragraphs.join("\n")} onChange={(e) => updateSection("safety", { ...sc.safety, paragraphs: linesFromText(e.target.value) })} />
          </label>
        </div>
      </div>

      <div className="adm-cms-list">
        {content.whyCards.map((card, index) => (
          <div className="adm-cms-item" key={`${card.title}-${index}`}>
            <div className="adm-cms-item-head">
              <strong>选择理由 {index + 1}</strong>
              <Button type="text" size="small" onClick={() => updateContent("whyCards", content.whyCards.filter((_, i) => i !== index))} disabled={content.whyCards.length <= 1}>删除</Button>
            </div>
            <div className="adm-form-grid">
              <label>图标
                <select value={card.icon} onChange={(e) => updateWhy(index, { icon: e.target.value as WhyCardIcon })}>
                  {whyIconOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </label>
              <label>标题 <input value={card.title} onChange={(e) => updateWhy(index, { title: e.target.value })} /></label>
              <label className="adm-span-2">说明 <textarea value={card.detail} onChange={(e) => updateWhy(index, { detail: e.target.value })} /></label>
            </div>
          </div>
        ))}
      </div>
      <Button type="primary" className="adm-add" onClick={() => updateContent("whyCards", [...content.whyCards, emptyWhyCard])}>
        <Plus size={14} /> 添加选择理由
      </Button>
    </div>
  );
}
