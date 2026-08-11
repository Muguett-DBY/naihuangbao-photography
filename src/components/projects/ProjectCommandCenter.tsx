import { Archive, Boxes, BrainCircuit, CircleGauge, Cloud, History, Layers3, Play, Sparkles } from "lucide-react";
import type { CSSProperties } from "react";
import { PrefetchLink } from "../shared/PrefetchLink";
import type { WorkspaceProject, WorkspaceProjectEvent, WorkspaceSurface } from "../../types/workspace-project";
import { useWorkspaceCopy, type WorkspaceCopyKey } from "../../i18n/workspace-copy";

const surfaceRoutes: Record<WorkspaceSurface, string> = {
  archive: "/archive",
  vault: "/vault",
  composer: "/compose",
  studio: "/studio",
  story: "/create/story",
  publish: "/projects#publish",
};

function relativeTime(timestamp: number, text: (key: WorkspaceCopyKey, values?: Record<string, string | number>) => string) {
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return text("now");
  if (minutes < 60) return text("minutesAgo", { count: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return text("hoursAgo", { count: hours });
  return text("daysAgo", { count: Math.round(hours / 24) });
}

export function ProjectCommandCenter({ project, events }: { project: WorkspaceProject; events: WorkspaceProjectEvent[] }) {
  const { text } = useWorkspaceCopy();
  const outputs = project.creativeDocumentIds.length + project.compositionIds.length + project.storyIds.length;
  const momentum = Math.min(100, 12 + project.assets.length * 4 + outputs * 12 + Math.min(events.length, 8) * 3);
  const recentEvents = events.slice(0, 5);

  return (
    <section className="project-command" aria-labelledby="project-command-title">
      <header className="project-command__header">
        <div>
          <span>NHB / PROJECT COMMAND / V8</span>
          <h2 id="project-command-title">{text("commandTitleStart")}<br />{text("commandTitleEnd")}</h2>
        </div>
        <PrefetchLink className="project-command__resume" to={surfaceRoutes[project.activeSurface]}>
          <Play size={18} aria-hidden="true" />
          <span><small>{text("continueSurface", { surface: project.activeSurface.toUpperCase() })}</small><strong>{project.name}</strong></span>
        </PrefetchLink>
      </header>

      <div className="project-command__grid">
        <article className="project-command__momentum">
          <div className="project-command__dial" style={{ "--project-momentum": `${momentum}%` } as CSSProperties}>
            <CircleGauge size={25} aria-hidden="true" />
            <strong>{momentum}</strong>
          </div>
          <div><span>{text("projectMomentum")}</span><p>{text("momentumSummary", { frames: project.assets.length, outputs })}</p></div>
        </article>

        <nav className="project-command__surfaces" aria-label={text("projectWorkspaces")}>
          <PrefetchLink to="/archive"><Archive size={18} aria-hidden="true" /><span>{text("archiveName")}<small>{text("archiveHint")}</small></span></PrefetchLink>
          <PrefetchLink to="/vault"><Boxes size={18} aria-hidden="true" /><span>{text("vaultName")}<small>{text("vaultHint")}</small></span></PrefetchLink>
          <PrefetchLink to="/compose"><Sparkles size={18} aria-hidden="true" /><span>{text("composerName")}<small>{text("composerHint")}</small></span></PrefetchLink>
          <PrefetchLink to="/curate"><BrainCircuit size={18} aria-hidden="true" /><span>{text("curatorName")}<small>{text("curatorHint")}</small></span></PrefetchLink>
          <PrefetchLink to="/studio"><Layers3 size={18} aria-hidden="true" /><span>{text("studioName")}<small>{text("studioHint")}</small></span></PrefetchLink>
        </nav>

        <article className="project-command__activity">
          <header><span><History size={16} aria-hidden="true" />{text("activity")}</span><small>{text("localJournal")}</small></header>
          {recentEvents.length ? recentEvents.map((event) => (
            <div key={event.id}><span>{event.surface.toUpperCase()}</span><strong>{event.summary}</strong><small>{relativeTime(event.createdAt, text)}</small></div>
          )) : <p>{text("activityEmpty")}</p>}
        </article>

        <article className="project-command__cloud">
          <Cloud size={20} aria-hidden="true" />
          <span>{text("cloudContinuity")}</span>
          <p>{text("cloudContinuityHint")}</p>
          <small>{text("syncEngineActive")}</small>
        </article>
      </div>
    </section>
  );
}
