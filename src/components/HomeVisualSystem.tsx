import {
  ArrowUpRight,
  BookOpenText,
  FlaskConical,
  Images,
  Layers3,
  MousePointer2,
  WandSparkles,
} from "lucide-react";
import { useMemo, useRef, useState, type PointerEvent } from "react";
import { archiveProjects } from "../data/living-archive";
import { ImageWithFallback } from "./ImageWithFallback";
import { PrefetchLink } from "./shared/PrefetchLink";

const systemNodes = [
  {
    id: "archive",
    index: "01",
    label: "Living Archive",
    eyebrow: "EXPLORE",
    detail: "沿着颜色、天气、材质和制作方法进入持续生长的视觉档案。",
    to: "/archive",
    icon: Images,
    projectIndex: 0,
  },
  {
    id: "create",
    index: "02",
    label: "Create Studio",
    eyebrow: "MAKE",
    detail: "在浏览器里编排、调色、保存版本并导出，不上传你的原始图片。",
    to: "/create",
    icon: WandSparkles,
    projectIndex: 7,
  },
  {
    id: "stories",
    index: "03",
    label: "Visual Stories",
    eyebrow: "READ",
    detail: "把一组画面、注释与过程组织成可滚动阅读的视觉叙事。",
    to: "/stories",
    icon: BookOpenText,
    projectIndex: 4,
  },
  {
    id: "practice",
    index: "04",
    label: "Practice Systems",
    eyebrow: "INSPECT",
    detail: "查看旧产品流程、交互实验与工程练习，它们与主档案保持清晰隔离。",
    to: "/practice",
    icon: FlaskConical,
    projectIndex: 3,
  },
] as const;

export function HomeVisualSystem() {
  const [activeId, setActiveId] = useState<(typeof systemNodes)[number]["id"]>("archive");
  const rootRef = useRef<HTMLElement>(null);
  const frameRef = useRef<number | null>(null);
  const activeNode = systemNodes.find((node) => node.id === activeId) ?? systemNodes[0];
  const image = useMemo(
    () => archiveProjects[activeNode.projectIndex]?.media[0] ?? archiveProjects[0].media[0],
    [activeNode.projectIndex],
  );
  const frameCount = useMemo(
    () => archiveProjects.reduce((total, project) => total + project.media.length, 0),
    [],
  );

  const updatePointer = (event: PointerEvent<HTMLElement>) => {
    const root = rootRef.current;
    if (!root || event.pointerType === "touch") return;
    const x = event.clientX;
    const y = event.clientY;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      const bounds = root.getBoundingClientRect();
      root.style.setProperty("--system-x", `${Math.max(0, Math.min(1, (x - bounds.left) / bounds.width))}`);
      root.style.setProperty("--system-y", `${Math.max(0, Math.min(1, (y - bounds.top) / bounds.height))}`);
      frameRef.current = null;
    });
  };

  return (
    <section
      ref={rootRef}
      id="visual-system"
      className="home-visual-system"
      aria-labelledby="home-visual-system-title"
      onPointerMove={updatePointer}
      onPointerLeave={() => {
        rootRef.current?.style.removeProperty("--system-x");
        rootRef.current?.style.removeProperty("--system-y");
      }}
    >
      <header className="home-visual-system__heading">
        <span className="platform-index">02 / VISUAL OPERATING SYSTEM</span>
        <div>
          <h2 id="home-visual-system-title">一张画面，不止一个终点</h2>
          <p>档案、创作、故事和练习共享同一套素材语言，也保持各自清晰的工作边界。</p>
        </div>
        <span className="home-visual-system__hint"><MousePointer2 size={15} aria-hidden="true" />移动并选择一个入口</span>
      </header>

      <div className="home-visual-system__stage">
        <div className="home-visual-system__preview" aria-live="polite">
          <ImageWithFallback
            key={image.src}
            src={image.src}
            alt=""
            title={activeNode.label}
            sizes="(max-width: 860px) 100vw, 58vw"
            tone="sage"
          />
          <div className="home-visual-system__reticle" aria-hidden="true"><span /><span /></div>
          <div className="home-visual-system__preview-copy">
            <span>{activeNode.eyebrow} / {activeNode.index}</span>
            <strong>{activeNode.label}</strong>
            <p>{activeNode.detail}</p>
            <PrefetchLink to={activeNode.to}>进入此区域 <ArrowUpRight size={18} aria-hidden="true" /></PrefetchLink>
          </div>
        </div>

        <div className="home-visual-system__nodes" role="group" aria-label="NHB system areas">
          {systemNodes.map(({ id, index, label, eyebrow, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={id === activeId ? "is-active" : ""}
              aria-pressed={id === activeId}
              onClick={() => setActiveId(id)}
              onFocus={() => setActiveId(id)}
              onPointerEnter={() => setActiveId(id)}
            >
              <span>{index}</span>
              <Icon size={20} aria-hidden="true" />
              <span><small>{eyebrow}</small><strong>{label}</strong></span>
              <ArrowUpRight size={17} aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>

      <footer className="home-visual-system__footer">
        <span><Layers3 size={16} aria-hidden="true" />{archiveProjects.length} PROJECTS / {frameCount} FRAMES</span>
        <span>LOCAL FIRST / ACCESSIBLE MOTION / ONE WEBGL CONTEXT</span>
      </footer>
    </section>
  );
}
