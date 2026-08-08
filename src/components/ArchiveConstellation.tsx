import { ArrowUpRight, CircleDotDashed } from "lucide-react";
import { useMemo, useState, type CSSProperties } from "react";
import { archiveProjects } from "../data/living-archive";
import { PrefetchLink } from "./shared/PrefetchLink";

export function ArchiveConstellation() {
  const [activeId, setActiveId] = useState(archiveProjects[0]?.id ?? "");
  const activeProject = useMemo(
    () => archiveProjects.find((project) => project.id === activeId) ?? archiveProjects[0],
    [activeId],
  );
  const relatedProjects = useMemo(
    () => activeProject?.related
      .map((id) => archiveProjects.find((project) => project.id === id))
      .filter((project): project is NonNullable<typeof project> => Boolean(project)) ?? [],
    [activeProject],
  );

  if (!activeProject) return null;

  return (
    <section className="archive-constellation" aria-labelledby="archive-constellation-title">
      <header>
        <span className="platform-index">01 / VISUAL CONSTELLATION</span>
        <div>
          <h2 id="archive-constellation-title">视觉关系图</h2>
          <p>沿着颜色、材质与天气，在项目之间移动。</p>
        </div>
      </header>

      <div className="archive-constellation__stage">
        <div className="archive-constellation__nodes" role="list" aria-label="概念项目">
          {archiveProjects.map((project, index) => (
            <button
              type="button"
              role="listitem"
              key={project.id}
              className={project.id === activeProject.id ? "is-active" : ""}
              onClick={() => setActiveId(project.id)}
              aria-pressed={project.id === activeProject.id}
              style={{ "--archive-node-index": index } as CSSProperties}
            >
              <span>{project.chapter}</span>
              <strong>{project.title}</strong>
              <small>{project.palette.slice(0, 2).join(" / ")}</small>
            </button>
          ))}
        </div>

        <article className="archive-constellation__focus" aria-live="polite">
          <CircleDotDashed size={24} aria-hidden="true" />
          <span>{activeProject.place} / {activeProject.season}</span>
          <h3>{activeProject.title}</h3>
          <p>{activeProject.statement}</p>
          <div className="archive-constellation__relations">
            <small>CONNECTED TO</small>
            {relatedProjects.map((project) => (
              <button type="button" key={project.id} onClick={() => setActiveId(project.id)}>
                {project.title}
              </button>
            ))}
          </div>
          <PrefetchLink to={`/archive/${activeProject.id}`}>
            打开研究 <ArrowUpRight size={17} aria-hidden="true" />
          </PrefetchLink>
        </article>
      </div>
    </section>
  );
}
