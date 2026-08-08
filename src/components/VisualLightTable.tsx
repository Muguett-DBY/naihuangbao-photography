import { ArrowRight, Move, Shuffle } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { archiveProjects } from "../data/living-archive";
import { ImageWithFallback } from "./ImageWithFallback";
import { PrefetchLink } from "./shared/PrefetchLink";

export function VisualLightTable() {
  const rootRef = useRef<HTMLElement>(null);
  const frameRef = useRef<number | null>(null);
  const pointerRef = useRef({ x: 0.5, y: 0.5 });
  const [activeIndex, setActiveIndex] = useState(0);
  const frames = useMemo(() => [
    "optical-garden",
    "morning-conservatory",
    "prism-notes",
    "tactile-optics",
    "rain-atlas",
    "weather-print-room",
  ].map((id) => archiveProjects.find((project) => project.id === id))
    .filter((project): project is NonNullable<typeof project> => Boolean(project)), []);
  const activeProject = frames[activeIndex] ?? frames[0];

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const sync = () => {
      frameRef.current = null;
      const rect = root.getBoundingClientRect();
      const travel = Math.max(rect.height + window.innerHeight, 1);
      const progress = Math.min(1, Math.max(0, (window.innerHeight - rect.top) / travel));
      root.style.setProperty("--lighttable-x", pointerRef.current.x.toFixed(4));
      root.style.setProperty("--lighttable-y", pointerRef.current.y.toFixed(4));
      root.style.setProperty("--lighttable-progress", progress.toFixed(4));
    };

    const schedule = () => {
      if (frameRef.current === null) frameRef.current = window.requestAnimationFrame(sync);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (reducedMotion) return;
      const rect = root.getBoundingClientRect();
      pointerRef.current = {
        x: Math.min(1, Math.max(0, (event.clientX - rect.left) / Math.max(rect.width, 1))),
        y: Math.min(1, Math.max(0, (event.clientY - rect.top) / Math.max(rect.height, 1))),
      };
      schedule();
    };

    root.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    schedule();
    return () => {
      root.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  if (!activeProject) return null;

  const selectRelative = (direction: number) => {
    setActiveIndex((index) => (index + direction + frames.length) % frames.length);
  };

  return (
    <section
      ref={rootRef}
      className="visual-light-table"
      id="light-table"
      aria-labelledby="visual-light-table-title"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          event.preventDefault();
          selectRelative(1);
        } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          event.preventDefault();
          selectRelative(-1);
        }
      }}
    >
      <header className="visual-light-table__heading">
        <span className="platform-index">01 / INTERACTIVE LIGHT TABLE</span>
        <div>
          <h2 id="visual-light-table-title">把光放到桌面上</h2>
          <p>移动指针，选择一张底片，再沿着颜色进入完整研究。</p>
        </div>
        <span className="visual-light-table__hint"><Move size={16} aria-hidden="true" /> POINTER / ARROW KEYS</span>
      </header>

      <div className="visual-light-table__stage">
        <div className="visual-light-table__surface" aria-label="Archive frames">
          {frames.map((project, index) => (
            <button
              type="button"
              key={project.id}
              className={index === activeIndex ? "is-active" : ""}
              style={{ "--lighttable-frame": index } as CSSProperties}
              onClick={() => setActiveIndex(index)}
              aria-pressed={index === activeIndex}
              aria-label={`${project.chapter} ${project.title}`}
            >
              <ImageWithFallback
                src={project.media[0].src}
                alt=""
                title={project.title}
                priority={index < 2}
                sizes="(max-width: 760px) 70vw, 34vw"
                tone={index % 2 ? "cream" : "sage"}
              />
              <span><small>{project.chapter}</small><strong>{project.title}</strong></span>
            </button>
          ))}
        </div>

        <aside className="visual-light-table__inspector" aria-live="polite">
          <span>{activeProject.chapter} / {activeProject.place} / {activeProject.season}</span>
          <h3>{activeProject.title}</h3>
          <strong>{activeProject.subtitle}</strong>
          <p>{activeProject.summary}</p>
          <div className="visual-light-table__chips">
            {activeProject.palette.map((item) => <span key={item}>{item}</span>)}
          </div>
          <div className="visual-light-table__actions">
            <button type="button" onClick={() => selectRelative(1)} aria-label="Next archive frame"><Shuffle size={17} aria-hidden="true" /></button>
            <PrefetchLink to={`/archive/${activeProject.id}`}>打开研究 <ArrowRight size={17} aria-hidden="true" /></PrefetchLink>
          </div>
        </aside>
      </div>
    </section>
  );
}
