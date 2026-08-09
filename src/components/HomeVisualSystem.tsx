import {
  ArrowUpRight,
  BookOpenText,
  FlaskConical,
  Images,
  Layers3,
  WandSparkles,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { archiveProjects } from "../data/living-archive";
import { ImageWithFallback } from "./ImageWithFallback";
import { PrefetchLink } from "./shared/PrefetchLink";

const systemNodes = [
  {
    id: "archive",
    index: "01",
    label: "Living Archive",
    eyebrow: "EXPLORE",
    to: "/archive",
    icon: Images,
    projectIndex: 0,
  },
  {
    id: "create",
    index: "02",
    label: "Create Studio",
    eyebrow: "MAKE",
    to: "/create",
    icon: WandSparkles,
    projectIndex: 7,
  },
  {
    id: "stories",
    index: "03",
    label: "Visual Stories",
    eyebrow: "READ",
    to: "/stories",
    icon: BookOpenText,
    projectIndex: 4,
  },
  {
    id: "practice",
    index: "04",
    label: "Practice Systems",
    eyebrow: "INSPECT",
    to: "/practice",
    icon: FlaskConical,
    projectIndex: 3,
  },
] as const;

const archiveFrameCount = archiveProjects.reduce((total, project) => total + project.media.length, 0);

export function HomeVisualSystem() {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState<(typeof systemNodes)[number]["id"]>("archive");
  const activeNode = systemNodes.find((node) => node.id === activeId) ?? systemNodes[0];
  const image = archiveProjects[activeNode.projectIndex]?.media[0] ?? archiveProjects[0].media[0];

  return (
    <section
      id="visual-system"
      className="home-visual-system"
      aria-labelledby="home-visual-system-title"
    >
      <header className="home-visual-system__heading">
        <span className="platform-index">02 / VISUAL OPERATING SYSTEM</span>
        <div>
          <h2 id="home-visual-system-title">{t("platform.home.system.title")}</h2>
          <p>{t("platform.home.system.intro")}</p>
        </div>
        <span className="home-visual-system__hint">{t("platform.home.system.hint")}</span>
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
          <div className="home-visual-system__preview-copy">
            <span>{activeNode.eyebrow} / {activeNode.index}</span>
            <strong>{activeNode.label}</strong>
            <p>{t(`platform.home.system.nodes.${activeNode.id}` as never)}</p>
            <PrefetchLink to={activeNode.to}>{t("platform.home.system.open")} <ArrowUpRight size={18} aria-hidden="true" /></PrefetchLink>
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
        <span><Layers3 size={16} aria-hidden="true" />{t("platform.home.system.count", { projects: archiveProjects.length, frames: archiveFrameCount })}</span>
        <span>{t("platform.home.system.footer")}</span>
      </footer>
    </section>
  );
}
