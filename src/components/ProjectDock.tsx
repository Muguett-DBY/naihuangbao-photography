import "../styles/workspace-v7.css";
import { FolderOpen, Images, Layers3, Plus, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";
import { isProjectDockRoute } from "../data/product-navigation";
import { useWorkspaceProjects } from "../hooks/useWorkspaceProjects";
import { PrefetchLink } from "./shared/PrefetchLink";

export function ProjectDock() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const workspace = useWorkspaceProjects();
  const [open, setOpen] = useState(false);
  const visible = isProjectDockRoute(pathname);

  if (!visible || !workspace.ready || !workspace.activeProject) return null;
  const project = workspace.activeProject;

  return (
    <aside className={`project-dock${open ? " is-open" : ""}`} aria-label={t("platform.projectDock.ariaLabel")}>
      <button className="project-dock__trigger" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="project-dock-panel">
        <span className="project-dock__pulse" aria-hidden="true" />
        <span><small>{t("platform.projectDock.activeProject")}</small><strong>{project.name}</strong></span>
        <span className="project-dock__count"><Images size={14} aria-hidden="true" />{project.assets.length}</span>
      </button>

      {open ? (
        <div className="project-dock__panel" id="project-dock-panel">
          <header>
            <div><small>{t("platform.projectDock.dockLabel")}</small><h2>{project.name}</h2></div>
            <button type="button" onClick={() => setOpen(false)} aria-label={t("platform.projectDock.close")}><X size={18} aria-hidden="true" /></button>
          </header>

          <label>
            <span>{t("platform.projectDock.workspace")}</span>
            <select value={project.id} onChange={(event) => workspace.setActiveProjectId(event.target.value)}>
              {workspace.projects.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
            </select>
          </label>

          <div className="project-dock__assets">
            {project.assets.length ? project.assets.slice(-8).map((asset) => (
              <button type="button" key={asset.assetId} onClick={() => workspace.removeAsset(asset.assetId)} title={t("platform.projectDock.removeAsset", { title: asset.title })}>
                <img src={asset.src} alt="" width="72" height="72" loading="lazy" />
              </button>
            )) : <p>{t("platform.projectDock.empty")}</p>}
          </div>

          <div className="project-dock__actions">
            <PrefetchLink to="/projects" onClick={() => setOpen(false)}><FolderOpen size={16} aria-hidden="true" />{t("platform.projectDock.openProject")}</PrefetchLink>
            <PrefetchLink to="/create" onClick={() => setOpen(false)}><Layers3 size={16} aria-hidden="true" />{t("platform.projectDock.compose")}</PrefetchLink>
            <button type="button" onClick={() => workspace.createProject(t("platform.projectDock.newProject", { count: workspace.projects.length + 1 }))}><Plus size={16} aria-hidden="true" />{t("platform.projectDock.new")}</button>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
