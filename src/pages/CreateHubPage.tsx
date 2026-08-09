import "../styles/platform-v3.css";
import "../styles/platform-v4.css";
import { Aperture, ArrowRight, BookOpenText, Boxes, BrainCircuit, Clapperboard, Columns2, FlaskConical, Layers3, LockKeyhole, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CompositionStudio } from "../components/studio/CompositionStudio";
import { PageTransition } from "../components/shared/PageTransition";
import { PrefetchLink } from "../components/shared/PrefetchLink";
import { useSEO } from "../hooks/useSEO";

const creatorTools = [
  { id: "director", to: "/compose", icon: Clapperboard, label: "Scene Composer", detail: "场景、图层与时间轴" },
  { id: "curator", to: "/curate", icon: BrainCircuit, label: "Creative Curator", detail: "可解释的智能选片与排序" },
  { id: "layout", to: "/create", icon: Layers3, label: "Layout Studio", detail: "排版与联系表" },
  { id: "story", to: "/create/story", icon: BookOpenText, label: "Story", detail: "滚动视觉叙事" },
  { id: "vault", to: "/vault", icon: Boxes, label: "Asset Vault", detail: "本地原始素材库" },
  { id: "develop", to: "/editor", icon: Aperture, label: "Develop", detail: "本地人像暗房" },
  { id: "compare", to: "/compare", icon: Columns2, label: "Compare", detail: "前后版本比较" },
  { id: "experiments", to: "/practice", icon: FlaskConical, label: "Experiments", detail: "全部练习模块" },
];

export function CreateHubPage() {
  const { t } = useTranslation();
  useSEO({ title: t("nav.create"), descKey: "platform.routes.create", path: "/create" });

  return (
    <PageTransition className="create-hub-page">
      <header className="create-hub-hero">
        <div>
          <span className="platform-index">NHB / LOCAL CREATIVE SYSTEM / V8</span>
          <h1>{t("nav.create")}</h1>
          <p>把档案里的光、颜色和图像重新编排成属于你的视觉页面。所有图片默认留在当前浏览器。</p>
        </div>
        <div className="create-hub-hero__proof">
          <span><LockKeyhole size={17} aria-hidden="true" />LOCAL FIRST</span>
          <span><Sparkles size={17} aria-hidden="true" />AUTO SAVE</span>
          <span><Layers3 size={17} aria-hidden="true" />EXPORT READY</span>
        </div>
      </header>

      <nav className="create-toolrail" aria-label="Creative tools">
        {creatorTools.map(({ id, to, icon: Icon, label, detail }) => (
          <PrefetchLink key={id} to={to} className={id === "layout" ? "is-active" : ""} aria-current={id === "layout" ? "page" : undefined}>
            <Icon size={20} aria-hidden="true" />
            <span><strong>{label}</strong><small>{detail}</small></span>
            <ArrowRight size={17} aria-hidden="true" />
          </PrefetchLink>
        ))}
      </nav>

      <section className="create-workbench" aria-labelledby="create-workbench-title">
        <header>
          <span className="platform-index">01 / COMPOSITION</span>
          <div><h2 id="create-workbench-title">Visual Composer</h2><p>导入图片、选择版式、保存项目，再导出可以直接分享的画面。</p></div>
        </header>
        <CompositionStudio embedded />
      </section>

      <section className="create-next-tools" aria-labelledby="create-next-title">
        <header><span className="platform-index">02 / KEEP MAKING</span><h2 id="create-next-title">在同一个创作系统里继续</h2></header>
        <div>
          {creatorTools.filter(({ id }) => id !== "layout").map(({ id, to, icon: Icon, label, detail }) => (
            <PrefetchLink to={to} key={id}>
              <Icon size={25} aria-hidden="true" />
              <span><strong>{label}</strong><small>{detail}</small></span>
              <ArrowRight size={18} aria-hidden="true" />
            </PrefetchLink>
          ))}
        </div>
      </section>
    </PageTransition>
  );
}
